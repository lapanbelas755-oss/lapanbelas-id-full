const express = require('express');
const compression = require('compression');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

function safeFormatDateEN(dateVal) {
  if (!dateVal || dateVal === '-' || dateVal === 'null') return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateVal;
  }
}

function safeFormatDateID(dateVal) {
  if (!dateVal || dateVal === '-' || dateVal === 'null') return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateVal;
  }
}

function parseInvoiceNotes(orderOrNotes) {
  let addonsTotal = 0;
  let customFeesTotal = 0;
  let voucherDiscount = 0;
  let addonsList = [];
  let customFeesList = [];

  const isObject = typeof orderOrNotes === 'object' && orderOrNotes !== null;
  const notesStr = isObject ? (orderOrNotes.notes || orderOrNotes.additional_notes || '') : (orderOrNotes || '');

  // 1. Try to read from JSONB columns first if object is provided
  if (isObject && Array.isArray(orderOrNotes.invoice_addons) && orderOrNotes.invoice_addons.length > 0) {
    addonsList = orderOrNotes.invoice_addons.map(a => ({ name: a.name, amount: Number(a.amount) }));
    addonsTotal = addonsList.reduce((sum, item) => sum + item.amount, 0);
  } else if (notesStr) {
    // 2. Fallback to Regex for Legacy Plain-Text format
    const addonSectionMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/);
    if (addonSectionMatch) {
      const lines = addonSectionMatch[1].split('\n');
      lines.forEach(line => {
        const clean = line.replace(/^-\s*/, '').trim();
        if (clean) {
          const partsMatch = clean.match(/^(.*?)\s*\((?:Rp\s*)?Rp\s*([0-9.,]+)\)/i);
          if (partsMatch) {
            const val = Number(partsMatch[2].replace(/\./g, '').replace(/,/g, ''));
            addonsTotal += val;
            addonsList.push({ name: partsMatch[1].trim(), amount: val });
          }
        }
      });
    }
  }

  if (isObject && Array.isArray(orderOrNotes.custom_fees) && orderOrNotes.custom_fees.length > 0) {
    customFeesList = orderOrNotes.custom_fees.map(c => ({ name: c.name, amount: Number(c.amount) }));
    customFeesTotal = customFeesList.reduce((sum, item) => sum + item.amount, 0);
  } else if (notesStr) {
    const customFeesSectionMatch = notesStr.match(/\[BIAYA LAINNYA\]:\s*\n?((?:- .*\n?)*)/);
    if (customFeesSectionMatch) {
      const lines = customFeesSectionMatch[1].split('\n');
      lines.forEach(line => {
        const clean = line.replace(/^-\s*/, '').trim();
        if (clean) {
          const partsMatch = clean.match(/^(.*?)\s*\((?:Rp\s*)?Rp\s*([0-9.,]+)\)/i);
          if (partsMatch) {
            const val = Number(partsMatch[2].replace(/\./g, '').replace(/,/g, ''));
            customFeesTotal += val;
            customFeesList.push({ name: partsMatch[1].trim(), amount: val });
          }
        }
      });
    }
  }

  // Support both standard (-Rp 200.000) and legacy/buggy (-Rp Rp 200.000)
  if (notesStr) {
    const voucherMatch = notesStr.match(/\[VOUCHER\]:.*?\(-\s*(?:Rp\s*)?Rp\s*([0-9.,]+)\)/i);
    if (voucherMatch) {
      voucherDiscount = Number(voucherMatch[1].replace(/\./g, '').replace(/,/g, ''));
    }
  }

  return { addonsTotal, customFeesTotal, voucherDiscount, addonsList, customFeesList };
}


const PDFDocument = require('pdfkit');

// Load environment variables early
const dotenv = require('dotenv');
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple in-memory cache for Supabase token validation (TTL = 60 seconds)
const tokenCache = new Map();

// Middleware for Authenticating API requests
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  
  const now = Date.now();
  if (tokenCache.has(token)) {
    const cached = tokenCache.get(token);
    if (now - cached.timestamp < 60000) { // 60 seconds cache TTL
      req.user = cached.user;
      return next();
    }
    tokenCache.delete(token);
  }

  // Self-cleaning mechanism to prevent memory growth
  if (tokenCache.size > 1000) {
    for (const [key, value] of tokenCache.entries()) {
      if (now - value.timestamp > 60000) {
        tokenCache.delete(key);
      }
    }
    if (tokenCache.size > 1000) {
      tokenCache.clear();
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  
  tokenCache.set(token, { user, timestamp: now });
  req.user = user;
  next();
};

// Configure Nodemailer Transporter (Dynamic to support Cloud VPS SMTP Port Restrictions)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for 587/STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const transporterStudio = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for 587/STARTTLS
  auth: {
    user: process.env.EMAIL_STUDIO_USER,
    pass: process.env.EMAIL_STUDIO_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Helper untuk mendapatkan transporter & email pengirim yang tepat
function getMailerForOrder(order) {
  if (!order) return { transporter, fromEmail: process.env.EMAIL_USER };

  const pkgCategoryLower = ((order.packages && order.packages.category) || (order.pkg ? order.pkg.category : '')).toLowerCase();
  const pkgNameLower = (order.package_name || (order.pkg ? order.pkg.title : '')).toLowerCase();
  
  if (pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') || 
      ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k))) {
    return {
      transporter: transporterStudio,
      fromEmail: process.env.EMAIL_STUDIO_USER
    };
  }
  return {
    transporter: transporter,
    fromEmail: process.env.EMAIL_USER
  };
}

// Helper to check if email credentials are set
function isEmailConfigured() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || user.trim() === '' || user.includes('yourname@gmail.com') || user.includes('yourname')) {
    return false;
  }
  if (!pass || pass.trim() === '' || pass.includes('xxxx-xxxx-xxxx-xxxx') || pass.includes('xxxx')) {
    return false;
  }
  return true;
}

function isStudioEmailConfigured() {
  const user = process.env.EMAIL_STUDIO_USER;
  const pass = process.env.EMAIL_STUDIO_PASS;
  if (!user || user.trim() === '' || user.includes('yourname@gmail.com') || user.includes('yourname')) {
    return false;
  }
  if (!pass || pass.trim() === '' || pass.includes('xxxx-xxxx-xxxx-xxxx') || pass.includes('xxxx')) {
    return false;
  }
  return true;
}

function applySimulation(transporterObj, isConfiguredFn) {
  const originalSendMail = transporterObj.sendMail.bind(transporterObj);
  transporterObj.sendMail = async function (mailOptions) {
    if (!isConfiguredFn()) {
      console.warn(`[Email Simulation] SMTP credentials are not configured in .env. Simulating email sending.`);
      console.log(`[Email Simulation] From: ${mailOptions.from}`);
      console.log(`[Email Simulation] To: ${mailOptions.to}`);
      console.log(`[Email Simulation] Subject: ${mailOptions.subject}`);
      
      const simDir = path.join(__dirname, 'scratch', 'simulated-emails');
      if (!fs.existsSync(simDir)) {
        fs.mkdirSync(simDir, { recursive: true });
      }
      
      // Save PDF attachments to local scratch/simulated-emails folder
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        mailOptions.attachments.forEach(attachment => {
          const filePath = path.join(simDir, attachment.filename);
          fs.writeFileSync(filePath, attachment.content);
          console.log(`[Email Simulation] Attachment PDF saved to: ${filePath}`);
        });
      }

      // Append to simulated emails log
      const logFile = path.join(simDir, 'emails.log');
      const logEntry = `
=============================================
Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
From: ${mailOptions.from}
To: ${mailOptions.to}
Subject: ${mailOptions.subject}
Has Attachment: ${mailOptions.attachments && mailOptions.attachments.length > 0 ? mailOptions.attachments[0].filename : 'No'}
---------------------------------------------
HTML Body:
${mailOptions.html}
=============================================
\n`;
      fs.appendFileSync(logFile, logEntry);
      
      return {
        messageId: `simulated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        simulated: true
      };
    }
    return originalSendMail(mailOptions);
  };

  const originalVerify = transporterObj.verify.bind(transporterObj);
  transporterObj.verify = async function () {
    if (!isConfiguredFn()) {
      console.warn(`[Email Simulation] SMTP credentials are not configured. Simulating transporter.verify as successful.`);
      return true;
    }
    return originalVerify();
  };
}

// Apply simulation mode if SMTP is not configured
applySimulation(transporter, isEmailConfigured);
applySimulation(transporterStudio, isStudioEmailConfigured);

const app = express();
app.use(compression());
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Enable CORS and JSON parser
app.use(cors());
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Cache-Control: HTML files always check for updates, assets cached for 1 day
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
  }
  next();
});

// Route for Client Portal
app.get('/pilih-foto/:orderId', (req, res) => {
  const isDist = fs.existsSync(path.join(__dirname, 'dist'));
  res.sendFile(path.join(__dirname, isDist ? 'dist/pilih-foto.html' : 'pilih-foto.html'));
});

// Route for Client Feedback Portal
app.get('/feedback/:orderId', (req, res) => {
  const isDist = fs.existsSync(path.join(__dirname, 'dist'));
  res.sendFile(path.join(__dirname, isDist ? 'dist/feedback.html' : 'feedback.html'));
});


// Serve static files from the build folder if it exists, otherwise current folder
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '365d',
    immutable: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
} else {
  app.use(express.static(path.join(__dirname), {
    maxAge: '0'
  }));
}

// Route alias untuk /admin
app.get(['/admin', '/admin/'], (req, res) => {
  const distPath = path.join(__dirname, 'dist', 'index-admin.html');
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.sendFile(path.join(__dirname, 'index-admin.html'));
  }
});

// Route alias untuk Fast-Track Booking WhatsApp (/booking)
app.get(['/booking', '/booking/'], (req, res) => {
  const distPath = path.join(__dirname, 'dist', 'booking.html');
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.sendFile(path.join(__dirname, 'booking.html'));
  }
});

// Route alias untuk Queue TV/Kiosk (/queue)
app.get(['/queue', '/queue/'], (req, res) => {
  const distPath = path.join(__dirname, 'dist', 'queue.html');
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.sendFile(path.join(__dirname, 'queue.html'));
  }
});

// Route alias untuk Invoice Preview (/invoice)
app.get(['/invoice', '/invoice/'], (req, res) => {
  const distPath = path.join(__dirname, 'dist', 'invoice.html');
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.sendFile(path.join(__dirname, 'invoice.html'));
  }
});

/**
 * Utility function to generate DOKU-compliant Signature
 */
function generateDokuHeaders(targetPath, requestBody) {
  const clientId = process.env.DOKU_CLIENT_ID || 'MALL-12345678';
  const secretKey = process.env.DOKU_SECRET_KEY || 'SK-1234567890abcdef1234567890abcdef';

  const requestId = uuidv4();
  // Format to ISO 8601 UTC string without milliseconds if possible, or standard UTC format
  const timestamp = new Date().toISOString().split('.')[0] + 'Z';

  // 1. Generate Digest (SHA256 Base64 representation of request body string)
  const bodyString = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
  const digest = crypto.createHash('sha256').update(bodyString).digest('base64');

  // 2. Prepare String to Sign
  const stringToSign =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${targetPath}\n` +
    `Digest:${digest}`;

  // 3. Generate HMAC-SHA256 signature using Secret Key
  const signature = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');

  return {
    'Client-Id': clientId,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    'Signature': `HMACSHA256=${signature}`,
    'Content-Type': 'application/json'
  };
}

/**
 * API Route: Create DOKU Checkout Payment URL
 */
app.post('/api/payment', async (req, res) => {
  const { order_id, amount, customer_name, customer_email, callback_url, division } = req.body;

  if (!order_id || !amount) {
    return res.status(400).json({ error: 'Missing order_id or amount' });
  }

  // Strict Payload Validation
  if (typeof order_id !== 'string' && typeof order_id !== 'number') {
    return res.status(400).json({ error: 'Invalid order_id format' });
  }
  
  if (customer_name && typeof customer_name !== 'string') {
    return res.status(400).json({ error: 'Invalid customer_name format' });
  }

  const cleanAmount = parseInt(amount, 10);
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount. Must be a positive integer.' });
  }
  // === MIDTRANS PAYMENT (STUDIO ONLY) ===
  const isStudio = division && (
    division.toLowerCase().includes('studio') ||
    ['family', 'maternity', 'group', 'graduation', 'personal', 'couple', 'prewedding studio', 'poto product', 'studio lapanbelas', 'wisuda', 'pas foto', 'self photo', 'photo self', 'photobox', 'photo box'].some(c => division.toLowerCase().includes(c))
  );

  if (isStudio) {
    console.log(`[MIDTRANS] Initiating checkout for Studio Order ID: ${order_id}, Amount: IDR ${cleanAmount}`);
    try {
      // Check current appointment details to protect against double booking by already settled orders
      const { data: curAppt } = await supabase
        .from('appointments')
        .select('event_date, jam_akad, additional_notes, id')
        .eq('id', order_id)
        .maybeSingle();

      if (curAppt && curAppt.event_date) {
        const targetDate = curAppt.event_date;
        const notesStr = curAppt.additional_notes || '';
        const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
        const targetRoom = roomMatch ? roomMatch[1].trim() : '';

        let targetTimeStr = curAppt.jam_akad ? curAppt.jam_akad.slice(0, 5) : '';
        const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
        if (jamMatch) targetTimeStr = jamMatch[1].trim();

        let targetDuration = 45;
        const durMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
        if (durMatch) targetDuration = parseInt(durMatch[1].trim(), 10);

        if (targetRoom && targetTimeStr) {
          const mapRoomKey = (name) => {
            if (!name) return '';
            const t = name.toLowerCase().trim();
            if (t.includes('studio white') || t.includes('limbo') || t.includes('room a') || t.includes('room 1')) return 'limbo';
            if (t.includes('luxury') || t.includes('room b') || t.includes('room 2')) return 'luxury';
            if (t.includes('colorful') || t.includes('modern') || t.includes('room c') || t.includes('room 3')) return 'modern';
            if (t.includes('classic') || t.includes('abstrak') || t.includes('kubah') || t.includes('room d') || t.includes('room 4')) return 'abstrak';
            if (t.includes('outdoor') || t.includes('garden') || t.includes('custom') || t.includes('room e') || t.includes('room 5')) return 'custom';
            return t;
          };

          const timeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return (hours || 0) * 60 + (minutes || 0);
          };

          const targetStart = timeToMinutes(targetTimeStr);
          const targetEnd = targetStart + targetDuration;
          const targetKey = mapRoomKey(targetRoom);

          const { data: existingAppts } = await supabase
            .from('appointments')
            .select('id, jam_akad, additional_notes, status')
            .eq('event_date', targetDate)
            .neq('id', curAppt.id)
            .in('status', ['Sudah DP', 'Lunas']);

          if (existingAppts && existingAppts.length > 0) {
            const hasConflict = existingAppts.some(ex => {
              const exNotes = ex.additional_notes || '';
              const exRoomMatch = exNotes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
              const exRoom = exRoomMatch ? exRoomMatch[1].trim() : '';
              if (mapRoomKey(exRoom) !== targetKey) return false;

              let exTimeStr = ex.jam_akad ? ex.jam_akad.slice(0, 5) : '';
              const exJamMatch = exNotes.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
              if (exJamMatch) exTimeStr = exJamMatch[1].trim();
              if (!exTimeStr) return false;

              let exDuration = 45;
              const exDurMatch = exNotes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
              if (exDurMatch) exDuration = parseInt(exDurMatch[1].trim(), 10);

              const exStart = timeToMinutes(exTimeStr);
              const exEnd = exStart + exDuration;
              return targetStart < exEnd && targetEnd > exStart;
            });

            if (hasConflict) {
              console.warn(`[MIDTRANS] Double-booking detected for order ${order_id} on room ${targetRoom} at ${targetTimeStr}`);
              return res.status(409).json({
                error: 'Slot waktu studio pada tanggal dan ruangan ini telah diisi oleh pemesan lain. Silakan pilih jadwal lain.'
              });
            }
          }
        }
      }

      const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
      const isProdMt = process.env.MIDTRANS_IS_PRODUCTION === 'true';
      const midtransBaseUrl = isProdMt ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
      const authString = Buffer.from(serverKey + ':').toString('base64');

      const payload = {
        transaction_details: {
          order_id: `${order_id}-${Date.now()}`,
          gross_amount: cleanAmount
        },
        customer_details: {
          first_name: customer_name || 'Pelanggan',
          email: customer_email || 'no-email@example.com'
        },
        callbacks: {
          finish: callback_url || APP_URL + '/'
        }
      };

      const response = await axios.post(`${midtransBaseUrl}/snap/v1/transactions`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        timeout: 10000
      });

      // Charge dynamic other_qris to get authentic Midtrans QRIS barcode string
      let qrUrl = null;
      let qrString = null;
      let expiryTime = null;
      try {
        const chargeRes = await axios.post(
          `${midtransBaseUrl}/snap/v2/transactions/${response.data.token}/charge`,
          { payment_type: 'other_qris' },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Basic ${authString}`
            },
            timeout: 10000
          }
        );
        if (chargeRes.data) {
          qrUrl = chargeRes.data.qris_url || null;
          qrString = chargeRes.data.qr_string || null;
          expiryTime = chargeRes.data.expiry_time || null;
        }
      } catch (cErr) {
        console.warn('[MIDTRANS QRIS CHARGE] Note:', cErr.response ? cErr.response.data : cErr.message);
      }

      console.log('[MIDTRANS] API Response Success:', response.data.redirect_url);
      if (response.data && (response.data.redirect_url || response.data.token)) {
        return res.json({
          payment_url: response.data.redirect_url,
          snap_token: response.data.token,
          qr_url: qrUrl,
          qr_string: qrString,
          expiry_time: expiryTime,
          gateway: 'midtrans',
          client_key: process.env.MIDTRANS_CLIENT_KEY || '',
          is_production: isProdMt
        });
      } else {
        throw new Error('Midtrans API succeeded but did not return redirect_url');
      }
    } catch (error) {
      console.error('[MIDTRANS] API Error:', error.response ? error.response.data : error.message);
      return res.status(500).json({
        error: 'Gagal menghubungi server Midtrans',
        details: error.response ? error.response.data : error.message
      });
    }
  }


  // === DOKU PAYMENT (NON-STUDIO) ===
  // DOKU payment request target & url
  const targetPath = '/checkout/v1/payment';
  const isProd = process.env.DOKU_IS_PRODUCTION === 'true';
  const dokuBaseUrl = isProd
    ? 'https://api.doku.com'
    : 'https://api-sandbox.doku.com';

  const requestBody = {
    order: {
      amount: cleanAmount,
      invoice_number: order_id,
      callback_url: callback_url || APP_URL + '/'
    },
    payment: {
      payment_due_date: 60
    }
  };

  // Generate headers with secure signature
  const headers = generateDokuHeaders(targetPath, requestBody);

  console.log(`[DOKU] Initiating checkout for Order ID: ${order_id}, Amount: IDR ${cleanAmount}`);
  console.log('[DOKU] Headers:', JSON.stringify(headers, null, 2));
  console.log('[DOKU] Payload:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await axios.post(`${dokuBaseUrl}${targetPath}`, requestBody, {
      headers,
      timeout: 10000 // 10s timeout
    });

    console.log('[DOKU] API Response Success:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.response && response.data.response.payment && response.data.response.payment.url) {
      return res.json({ 
        payment_url: response.data.response.payment.url,
        gateway: 'doku'
      });
    } else {
      throw new Error('DOKU API succeeded but did not return payment.url');
    }
  } catch (error) {
    console.error('[DOKU] API Error:', error.response ? error.response.data : error.message);

    // Check if the credentials are placeholders
    const isPlaceholderCredentials =
      process.env.DOKU_CLIENT_ID === 'MALL-12345678' ||
      process.env.DOKU_SECRET_KEY === 'SK-1234567890abcdef1234567890abcdef';

    if (isPlaceholderCredentials || (error.response && (error.response.status === 401 || (error.response.status === 400 && error.response.data?.error?.code === 'invalid_client_id')))) {
      console.warn('[DOKU] Invalid/Placeholder credentials detected. Generating fully functional Mock Sandbox Payment Page.');

      // Generate a mock payment URL pointing to our local express server
      const mockPaymentUrl = `/mock-payment.html?order_id=${order_id}&amount=${cleanAmount}&name=${encodeURIComponent(customer_name || 'Pelanggan')}&email=${encodeURIComponent(customer_email || '')}`;
      return res.json({ 
        payment_url: mockPaymentUrl,
        gateway: 'doku_mock'
      });
    }

    return res.status(500).json({
      error: 'Gagal menghubungi server DOKU',
      details: error.response ? error.response.data : error.message
    });
  }
});

/**
 * Check payment status for real-time in-app auto confirmation
 */
app.get('/api/check-payment-status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const { data: appt, error } = await supabase
      .from('appointments')
      .select('id, status, dp_amount, total_amount, event_date, client_name, package_name, jam_akad, additional_notes')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const isPaid = appt.status === 'Sudah DP' || appt.status === 'Lunas';
    return res.json({
      success: true,
      order_id: appt.id,
      status: appt.status,
      is_paid: isPaid,
      appointment: appt
    });
  } catch (err) {
    console.error('Error checking payment status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * API Route: Get Booked Slots (Public Safe Endpoint)
 * Safely fetches booked schedule slots for both Studio & Non-Studio bookings using backend service credentials,
 * avoiding Supabase anon Row Level Security (RLS) restrictions for unauthenticated public clients.
 */
app.get(['/api/public/booked-slots/:date', '/api/studio-booked-slots/:date'], async (req, res) => {
  const { date } = req.params;
  if (!date) return res.status(400).json({ error: 'Date parameter is required' });

  try {
    const [{ data: studioAppts, error: studioErr }, { data: nonStudioAppts, error: nonStudioErr }, { data: dateAvail }] = await Promise.all([
      supabase
        .from('appointments')
        .select('jam_akad, additional_notes, package_name, status')
        .eq('event_date', date),
      supabase
        .from('appointments')
        .select('id, package_name, status')
        .or(`event_date.eq.${date},resepsi_date.eq.${date}`)
        .not('status', 'in', '("Dibatalkan","Batal")'),
      supabase
        .from('date_availability')
        .select('*')
        .eq('date', date)
        .maybeSingle()
    ]);

    if (studioErr) throw studioErr;

    const validStudio = (studioAppts || []).filter(d => d.status !== 'Dibatalkan' && d.status !== 'Batal');
    const validNonStudio = nonStudioAppts || [];

    res.json({
      success: true,
      date,
      bookedSlots: validStudio,
      nonStudioAppointments: validNonStudio,
      dateAvailability: dateAvail || null
    });
  } catch (err) {
    console.error('[API booked-slots] Error:', err);
    res.status(500).json({ error: 'Failed to fetch booked slots' });
  }
});

/**
 * Helper to generate PDF Invoice using PDFKit
 */
function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
      const totalVal = order.total_amount || order.total || 0;
      const dpVal = order.dp_amount || order.dp || 0;
      const remainingVal = totalVal - dpVal;

      const total = formatter.format(totalVal);
      const dp = formatter.format(dpVal);
      const remaining = formatter.format(remainingVal);

      // Support packages joined or client-side object
      const pkgName = order.package_name || (order.pkg ? order.pkg.title : 'Gold Package');
      const pkgCategory = (order.packages && order.packages.category) || (order.pkg ? order.pkg.category : 'Photography');
      const pkgDesc = (order.packages && order.packages.description) || (order.pkg ? order.pkg.description : '');

      const orderId = order.id || order.invoice_number;
      const clientName = order.client_name || '-';
      const clientEmail = order.client_email || order.customer_email || '-';
      const clientPhone = order.client_phone || '-';
      const clientAddress = order.client_address || '-';
      const notesText = order.notes || order.additional_notes || '-';

      const createdDate = safeFormatDateEN(order.created_at || order.date || new Date());

      let statusText = 'PENDING';
      if (order.status === 'Lunas') statusText = 'PAID';
      if (order.status === 'Sudah DP') statusText = 'DP SETTLED';

      const paymentMethod = order.payment_method || order.paymentMethod || 'ONLINE PAYMENT';

      // --- Draw header ---
      doc.fillColor('#2a6742')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Lapanbelas ID', 40, 40);

      doc.fillColor('#1a1c1b')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('INVOICE', 400, 40, { align: 'right' });

      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#2a6742')
        .text(`#${orderId}`, 400, 65, { align: 'right' });

      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text('Jl. LRawangsa, Paya Bujok Tunong, Kec. Langsa Baro, Kota Langsa, Aceh 24354', 40, 70, { width: 250 });

      // Draw a line under header (thick styled green/grey border like HTML)
      doc.moveTo(40, 95).lineTo(550, 95).strokeColor('#e2e8f0').lineWidth(2).stroke();

      // --- Bill To and Info section ---
      doc.fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#675d4d')
        .text('BILL TO:', 40, 120);

      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#404941')
        .text(clientName.toUpperCase(), 40, 132);

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text(`${clientEmail} | ${clientPhone}`, 40, 147)
        .text(clientAddress, 40, 161, { width: 250 });

      // Right column info
      doc.fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#675d4d')
        .text('DATE:', 340, 132)
        .text('STATUS:', 340, 147);

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#1a1c1b')
        .text(createdDate, 420, 132);

      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#2a6742')
        .text(statusText, 420, 147);

      // Payment badge (rounded rect)
      const badgeText = paymentMethod.toUpperCase();
      const badgeWidth = doc.widthOfString(badgeText) + 16;
      const badgeHeight = 16;
      const badgeX = 550 - badgeWidth;
      doc.roundedRect(badgeX, 163, badgeWidth, badgeHeight, 8).fill('#f0e0cc');
      doc.fillColor('#6e6353').fontSize(7.5).font('Helvetica-Bold').text(badgeText, badgeX, 167, { width: badgeWidth, align: 'center' });

      // --- Item Table ---
      // Table Header background
      doc.rect(40, 205, 510, 25).fill('#2a6742');

      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('PACKAGE', 50, 213)
        .text('CATEGORY', 240, 213)
        .text('DATE', 320, 213)
        .text('PRICE', 480, 213, { align: 'right', width: 60 });

      // Calculate the items details dynamically
      let currentY = 245;

      // Draw Package Title
      doc.fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor('#1a1c1b')
        .text(pkgName, 50, currentY, { width: 180 });
      let pkgNameBottom = currentY + doc.heightOfString(pkgName, { width: 180 });

      // Draw Category (Column 2)
      doc.fontSize(8.5)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text(pkgCategory, 240, currentY, { width: 70 });
      let catBottom = currentY + doc.heightOfString(pkgCategory, { width: 70 });

      // Draw Event Dates List (Column 3)
      let datesLines = [];
      if (order.prewed_date || order.prewedDate) {
        const prewedDateStr = safeFormatDateEN(order.prewed_date || order.prewedDate);
        datesLines.push(`Prewed Date: ${prewedDateStr}`);
      }

      const eventDateVal = order.event_date || order.eventDate;
      const eventDateStr = safeFormatDateEN(eventDateVal);

      const resepsiDateVal = order.resepsi_date || order.resepsiDate;
      if (resepsiDateVal) {
        const resepsiDateStr = safeFormatDateEN(resepsiDateVal);
        datesLines.push(`Akad Date: ${eventDateStr}`);
        datesLines.push(`Reception Date: ${resepsiDateStr}`);
      } else {
        datesLines.push(`Event Date: ${eventDateStr}`);
      }

      doc.fontSize(8.5)
        .font('Helvetica')
        .fillColor('#675d4d');

      let dateY = currentY;
      datesLines.forEach(line => {
        doc.text(line, 320, dateY, { width: 150 });
        dateY += doc.heightOfString(line, { width: 150 }) + 2;
      });
      let dateBottom = dateY;

      // Draw Price (Column 4)
      doc.fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor('#2a6742')
        .text(total, 480, currentY, { align: 'right', width: 60 });

      const headerBottom = Math.max(pkgNameBottom, catBottom, dateBottom);

      // Draw Description Bullet Points (if any)
      const bulletPoints = (pkgDesc || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^-/, '').trim());

      const itemCount = bulletPoints.length;
      let columns = 1;
      if (itemCount > 40) columns = 3;
      else if (itemCount > 15) columns = 2;

      let bulletStartY = (columns === 1) ? pkgNameBottom + 6 : headerBottom + 10;
      let currentBulletY = bulletStartY;
      
      let colWidth = columns === 1 ? 180 : Math.floor(490 / columns) - 10;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#675d4d');
         
      const MAX_Y = 750;
      let pageChanged = false;

      for (let i = 0; i < itemCount; i += columns) {
         let rowHeight = 0;
         for (let c = 0; c < columns; c++) {
            if (i + c < itemCount) {
               let h = doc.heightOfString(`• ${bulletPoints[i + c]}`, { width: colWidth });
               if (h > rowHeight) rowHeight = h;
            }
         }
         
         if (currentBulletY + rowHeight > MAX_Y) {
            doc.addPage();
            currentBulletY = 40;
            pageChanged = true;
         }
         
         for (let c = 0; c < columns; c++) {
            if (i + c < itemCount) {
               let colX = 50 + c * (colWidth + 10);
               doc.text(`• ${bulletPoints[i + c]}`, colX, currentBulletY, { width: colWidth });
            }
         }
         
         currentBulletY += rowHeight + 2;
      }

      // Determine bottom boundary of the row
      const rowEndY = (pageChanged || currentBulletY > headerBottom) ? currentBulletY + 12 : headerBottom + 12;

      // Draw Row Divider
      doc.moveTo(40, rowEndY).lineTo(550, rowEndY).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- Footer / Totals section ---
      let totalTop = rowEndY + 20;

      // Check if footer has enough space (needs roughly 250-300 points)
      // If it exceeds 550, it will likely overflow and create blank pages.
      if (totalTop > 550) {
        doc.addPage();
        totalTop = 40;
      }

      // Note and Attention on Left
      let notesClean = (notesText || '').trim();
      // Remove empty [KETERANGAN TAMBAHAN] section if it is empty or just "-"
      notesClean = notesClean.replace(/\[KETERANGAN TAMBAHAN\]:\s*[\r\n]*\s*(-)?\s*$/i, '').trim();
      const hasNotes = notesClean !== '' && notesClean !== '-';

      let footerEndY = totalTop + 74; // Default baseline based on the right side (Remaining Bill)

      if (hasNotes) {
        doc.fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor('#675d4d')
          .text('NOTE', 40, totalTop);

        let notesY = totalTop + 14;
        notesClean.split('\n').map(line => line.trim()).filter(line => line.length > 0).forEach(line => {
          if (line.startsWith('[') && line.includes(']:')) {
            const match = line.match(/^\[(.*?)\]:(.*)$/);
            if (match) {
              const key = match[1].trim() + ':';
              const val = match[2].trim() || '-';
              
              if (val.startsWith('{') && val.endsWith('}')) {
                try {
                  const parsedObj = JSON.parse(val);
                  doc.font('Helvetica-Bold').fontSize(7.5).text(key, 40, notesY, { width: 230 });
                  notesY += doc.heightOfString(key, { width: 230 }) + 3;
                  for (const [k, v] of Object.entries(parsedObj)) {
                    if (v && v !== '-') {
                      const cleanK = '- ' + k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) + ':';
                      doc.font('Helvetica-Bold').fontSize(7.5).text(cleanK, 45, notesY, { referenced: 'left', width: 225 });
                      const keyWidth = doc.widthOfString(cleanK) + 4;
                      doc.font('Helvetica').fontSize(7.5).text(v, 45 + keyWidth, notesY, { width: 225 - keyWidth });
                      notesY += Math.max(doc.heightOfString(cleanK, { width: 225 }), doc.heightOfString(v, { width: 225 - keyWidth })) + 2;
                    }
                  }
                  notesY += 3;
                  return; // continue to next line
                } catch(e) {}
              }

              doc.font('Helvetica-Bold').fontSize(7.5).text(key, 40, notesY, { referenced: 'left', width: 230 });
              const keyWidth = doc.widthOfString(key) + 4;
              doc.font('Helvetica').fontSize(7.5).text(val, 40 + keyWidth, notesY, { width: 230 - keyWidth });
              notesY += Math.max(doc.heightOfString(key, { width: 230 }), doc.heightOfString(val, { width: 230 - keyWidth })) + 3;
            } else {
              doc.font('Helvetica').fontSize(7.5).text(line, 40, notesY, { width: 230 });
              notesY += doc.heightOfString(line, { width: 230 }) + 3;
            }
          } else {
            doc.font('Helvetica').fontSize(7.5).text(line, 40, notesY, { width: 230 });
            notesY += doc.heightOfString(line, { width: 230 }) + 3;
          }
        });

        const attentionTop = notesY + 10;

        doc.fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor('#675d4d')
          .text('ATTENTION', 40, attentionTop);

        doc.fontSize(7.5)
          .font('Helvetica')
          .fillColor('#675d4d')
          .text('Invoice ini sah dan diproses oleh Komputer\nSilahkan hubungi Lapanbelas Admin jika kamu membutuhkan bantuan', 40, attentionTop + 12, { lineGap: 2, width: 230 });

        footerEndY = Math.max(footerEndY, attentionTop + 12 + 25);
      } else {
        doc.fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor('#675d4d')
          .text('ATTENTION', 40, totalTop);

        doc.fontSize(7.5)
          .font('Helvetica')
          .fillColor('#675d4d')
          .text('Invoice ini sah dan diproses oleh Komputer\nSilahkan hubungi Lapanbelas Admin jika kamu membutuhkan bantuan', 40, totalTop + 12, { lineGap: 2, width: 230 });

        footerEndY = Math.max(footerEndY, totalTop + 12 + 25);
      }

      // Totals on Right
      doc.fontSize(8.5)
        .font('Helvetica')
        .fillColor('#675d4d');

      const parsedNotes = parseInvoiceNotes(order);
      const subTotalNum = totalVal - parsedNotes.addonsTotal - parsedNotes.customFeesTotal + parsedNotes.voucherDiscount;

      let currentTotalY = totalTop;
      doc.text('Sub Total (Paket)', 320, currentTotalY).text(formatter.format(subTotalNum), 480, currentTotalY, { align: 'right', width: 60 });
      currentTotalY += 14;

      doc.moveTo(320, currentTotalY).lineTo(550, currentTotalY).strokeColor('#e2e8f0').lineWidth(1).stroke();
      currentTotalY += 8;

      const hasAddons = parsedNotes.addonsList.length > 0 || parsedNotes.customFeesList.length > 0;
      if (hasAddons) {
        doc.font('Helvetica-Bold').text('Add-On', 320, currentTotalY);
        currentTotalY += 14;
        doc.font('Helvetica');
        
        parsedNotes.addonsList.forEach(item => {
          doc.text(`+ ${item.name}`, 325, currentTotalY, { width: 150 }).text(formatter.format(item.amount), 480, currentTotalY, { align: 'right', width: 60 });
          currentTotalY += 14;
        });

        parsedNotes.customFeesList.forEach(item => {
          doc.text(`+ ${item.name}`, 325, currentTotalY, { width: 150 }).text(formatter.format(item.amount), 480, currentTotalY, { align: 'right', width: 60 });
          currentTotalY += 14;
        });
      }

      if (parsedNotes.voucherDiscount > 0) {
        doc.moveTo(320, currentTotalY).lineTo(550, currentTotalY).strokeColor('#e2e8f0').lineWidth(1).stroke();
        currentTotalY += 8;
        
        doc.fillColor('#dc2626').text('Discount', 320, currentTotalY).text(`-${formatter.format(parsedNotes.voucherDiscount)}`, 480, currentTotalY, { align: 'right', width: 60 });
        currentTotalY += 14;
        doc.fillColor('#675d4d');
      }

      doc.moveTo(320, currentTotalY).lineTo(550, currentTotalY).strokeColor('#e2e8f0').lineWidth(1).stroke();
      currentTotalY += 8;

      doc.text('Down Payment', 320, currentTotalY).text(dp, 480, currentTotalY, { align: 'right', width: 60 });
      currentTotalY += 14;

      // Divider for Remaining
      doc.moveTo(320, currentTotalY).lineTo(550, currentTotalY).strokeColor('#e2e8f0').lineWidth(1).stroke();
      currentTotalY += 8;

      doc.fontSize(10.5)
        .font('Helvetica-Bold')
        .fillColor('#2a6742')
        .text('Remaining Bill', 320, currentTotalY + 4)
        .fillColor('#42634d')
        .fontSize(14)
        .text(remaining, 440, currentTotalY + 2, { align: 'right', width: 100 });

      // --- Bottom Branding / Signature ---
      const signatureTop = footerEndY + 35;

      doc.fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#675d4d')
        .text('AUTHORIZED SIGNATURE', 40, signatureTop);

      // Embed official digital signature image if exists
      const path = require('path');
      const fs = require('fs');
      const sigPath = path.join(__dirname, 'signature.png');
      if (fs.existsSync(sigPath)) {
        doc.image(sigPath, 40, signatureTop + 10, { height: 28 });
      }

      doc.moveTo(40, signatureTop + 42).lineTo(160, signatureTop + 42).strokeColor('#cccccc').lineWidth(1).stroke();
      doc.fontSize(7)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text('LAPANBELAS.ID Official', 40, signatureTop + 47);

      // Copyright / Legal Footer centered
      doc.fontSize(7.5)
        .font('Helvetica')
        .fillColor('#999999')
        .text('© 2026 LAPANBELAS ID • SECURE PAYMENT VIA ENCRYPTED PARTNERS', 40, signatureTop + 75, { align: 'center', width: 510 });

      // --- Deteksi Divisi untuk T&C ---
      const pkgNameLower = (order.package_name || (order.pkg ? order.pkg.title : '')).toLowerCase();
      const pkgCategoryLower = ((order.packages && order.packages.category) || (order.pkg ? order.pkg.category : '')).toLowerCase();
      const pkgDescLower = (pkgDesc || '').toLowerCase();

      let hasWedding = false;
      let hasMakeup = false;
      let hasDecor = false;
      let hasStudio = false;

      // 0. Cek jika paket Bundling (biasanya mencakup ke-3 divisi)
      if (pkgNameLower.includes('bundling') || pkgCategoryLower.includes('bundling') || pkgDescLower.includes('bundling')) {
        hasWedding = true;
        hasMakeup = true;
        hasDecor = true;
      }

      // Pastikan folder scratch ada sebelum menulis log agar tidak error di VPS (karena scratch masuk .gitignore)
      const scratchPath = require('path').join(__dirname, 'scratch');
      if (!require('fs').existsSync(scratchPath)) {
        require('fs').mkdirSync(scratchPath, { recursive: true });
      }

      require('fs').appendFileSync(require('path').join(scratchPath, 'pdf-debug.log'), `[${new Date().toISOString()}] Order: ${order.id}\npkgNameLower: ${pkgNameLower}\npkgCategoryLower: ${pkgCategoryLower}\n`);

      // 1. Cek dari nama paket, kategori, atau isi detail (bullet points)
      if (pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') || ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k))) {
        hasStudio = true;
      }
      
      const weddingKeywords = ['wedding', 'prewedding', 'engagement', 'photo', 'foto', 'video', 'dokumentasi', 'cinematic'];
      if (weddingKeywords.some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k) || pkgDescLower.includes(k)) && !hasStudio) {
        hasWedding = true;
      }
      
      const makeupKeywords = ['makeup', 'rias', 'MUA'];
      if (makeupKeywords.some(k => pkgNameLower.includes(k) || pkgCategoryLower.includes(k) || pkgDescLower.includes(k))) {
        hasMakeup = true;
      }
      
      const decorKeywords = ['dekor', 'pelaminan', 'tenda'];
      if (decorKeywords.some(k => pkgNameLower.includes(k) || pkgCategoryLower.includes(k) || pkgDescLower.includes(k))) {
        hasDecor = true;
      }

      // 2. Cek dari layanan tambahan (addons)
      parsedNotes.addonsList.forEach(addon => {
        const addonName = addon.name.toLowerCase();
        if (addonName.includes('makeup') || addonName.includes('rias')) hasMakeup = true;
        if (addonName.includes('dekor')) hasDecor = true;
        if ((addonName.includes('photo') || addonName.includes('video')) && !hasStudio) hasWedding = true;
      });

      // 3. Cek dari tag [DIVISI] di notesText
      if (notesText && notesText.includes('[DIVISI]:')) {
        const divMatch = notesText.match(/\[DIVISI\]:\s*([^\n]+)/i);
        if (divMatch) {
          const division = divMatch[1].trim().toLowerCase();
          if (division.includes('studio')) {
            hasStudio = true;
            hasWedding = false;
            hasMakeup = false;
            hasDecor = false;
          } else if (division.includes('decor') || division.includes('dekor')) {
            hasDecor = true;
          } else if (division.includes('makeup') || division.includes('rias')) {
            hasMakeup = true;
          } else if (division.includes('wedding') || division.includes('photo') || division.includes('video') || division.includes('lapanbelas.id')) {
            hasWedding = true;
          }
        }
      }

      // 4. Fallback jika tidak ada divisi sama sekali yang terdeteksi, default ke Wedding T&C
      if (!hasWedding && !hasMakeup && !hasDecor && !hasStudio) {
        hasWedding = true;
      }

      require('fs').appendFileSync(require('path').join(scratchPath, 'pdf-debug.log'), `hasWedding: ${hasWedding}, hasMakeup: ${hasMakeup}, hasDecor: ${hasDecor}\n\n`);

      // --- Helper: Draw T&C Page ---
      const drawTacPage = (title, sectionsArray, colorPrimary) => {
        doc.addPage();
        
        doc.fillColor(colorPrimary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(title, 40, 40, { align: 'center' });

        doc.moveTo(40, 65).lineTo(550, 65).strokeColor('#e2e8f0').lineWidth(2).stroke();

        let tacY = 85;

        sectionsArray.forEach(section => {
          if (tacY > 700) {
            doc.addPage();
            tacY = 40;
          }
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1c1b').text(section.title, 40, tacY);
          tacY += 16;
          doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
          section.points.forEach(pt => {
            if (tacY > 730) {
              doc.addPage();
              tacY = 40;
            }
            doc.text(`•  ${pt}`, 50, tacY, { width: 500, align: 'justify', lineGap: 2.5 });
            tacY += doc.heightOfString(`•  ${pt}`, { width: 500, align: 'justify', lineGap: 2.5 }) + 5;
          });
          tacY += 10;
        });

        doc.fontSize(7.5)
          .font('Helvetica-Oblique')
          .fillColor('#999999')
          .text('Dokumen Syarat & Ketentuan ini digenerate secara otomatis dan merupakan bagian yang tidak terpisahkan dari Invoice Booking.', 40, 780, { align: 'center', width: 510 });
      };

      // --- 1. T&C Wedding (Lapanbelas.id) ---
      if (hasWedding) {
        drawTacPage('SYARAT & KETENTUAN FOTOGRAFI & VIDEOGRAFI', [
          {
            title: '1. Pemesanan & Pembayaran',
            points: [
              'Jadwal pemotretan (Booking) baru dianggap sah dan terkunci setelah Klien melakukan pembayaran Down Payment (DP) minimum yang telah disepakati.',
              'Pembayaran DP tidak dapat dikembalikan (non-refundable) dengan alasan apapun jika terjadi pembatalan sepihak dari Klien.',
              'Pelunasan (Full Payment) wajib diselesaikan pada H-1 selambat-lambatnya H+1 acara selesai.'
            ]
          },
          {
            title: '2. Perubahan Jadwal (Reschedule) & Pembatalan',
            points: [
              'Permohonan perubahan jadwal (reschedule) wajib diinformasikan selambat-lambatnya H-30 sebelum tanggal acara.',
              'Reschedule sangat bergantung pada ketersediaan jadwal tim lapanbelas. Apabila jadwal baru yang diminta Klien kebetulan sudah terisi, maka DP akan hangus dan pesanan dianggap batal.',
              'Jika pembatalan dilakukan oleh Klien secara sepihak, maka seluruh pembayaran yang telah masuk tidak dapat dikembalikan.',
              'Paket pricelist yang sudah di pilih klien tidak dapat di alihkan ke paket yang lain.'
            ]
          },
          {
            title: '3. Proses Pengerjaan & Penyerahan Hasil',
            points: [
              'Seluruh file foto mentah (preview) akan dikirimkan melalui tautan Google Drive maksimal 3 hari kerja setelah acara selesai dan tentu nya klien sudah melakukan pelunasan.',
              'Klien wajib menyelesaikan proses seleksi foto maksimal 150 hari setelah tautan Google Drive dikirimkan. Apabila melewati batas waktu tersebut, tim lapanbelas akan memilihkan foto secara sepihak untuk mempercepat antrian edit.',
              'Proses penyuntingan (editing) memakan waktu estimasi 30 hingga 60 hari setelah daftar foto pilihan dikonfirmasi oleh Klien, tergantung pada tingkat kerumitan dan antrian.',
              'Revisi warna atau retouch minor hanya dapat dilakukan maksimal 1 (satu) kali setelah hasil edit akhir diserahkan.'
            ]
          },
          {
            title: '4. Pelaksanaan Pemotretan & Jam Kerja',
            points: [
              'Durasi kerja tim 18Studio disesuaikan dengan jenis acara:',
              '  - Akad Nikah, Tasyakuran, Lamaran, dan Prewedding: Maksimal durasi pemotretan adalah 3 - 4 jam, dihitung berdasarkan waktu mulai acara yang disepakati.',
              '  - Resepsi: Jam kerja operasional resepsi umumnya dimulai dari pukul 10.00/11.00 WIB hingga maksimal pukul 17.30 WIB.'
            ]
          },
          {
            title: '5. Biaya Transportasi & Akomodasi (Luar Kota/Jarak Jauh)',
            points: [
              'lapanbelas.id memiliki 2 basis kantor operasional (Kuala Simpang - Tanah Terban & Kota Langsa - Paya Bujok).',
              'Pemotretan dengan jarak tempuh lebih dari 20 menit perjalanan dari kantor terdekat akan dikenakan biaya transportasi/akomodasi tambahan.',
              'Besaran biaya transportasi disesuaikan dengan jarak lokasi (mulai dari Rp 100.000 hingga Rp 300.000+). Untuk lokasi antar kota/provinsi yang mengharuskan tim menginap, biaya transportasi, penginapan, dan konsumsi tim sepenuhnya ditanggung oleh Klien.'
            ]
          },
          {
            title: '6. Hak Cipta & Penggunaan Karya',
            points: [
              'Hak cipta atas seluruh hasil karya fotografi/videografi tetap menjadi milik lapanbelas.',
              'Klien diberikan hak penuh untuk menggunakan hasil foto/video untuk kepentingan pribadi dan non-komersial.',
              'lapanbelas berhak menggunakan hasil foto/video Klien untuk keperluan promosi, portofolio, dan media sosial, kecuali jika sebelumnya Klien telah mengajukan permintaan privasi (Private Session) secara tertulis sebelum acara.'
            ]
          },
          {
            title: '7. Keadaan Memaksa (Force Majeure)',
            points: [
              'lapanbelas.id tidak dapat dituntut ganti rugi atas keterlambatan atau kegagalan tugas yang disebabkan oleh keadaan di luar kendali (force majeure) seperti bencana alam, kerusuhan, cuaca ekstrem, atau kecelakaan tak terduga.'
            ]
          }
        ], '#2a6742');
      }

      // --- 1.5. T&C Photo Studio ---
      if (hasStudio) {
        drawTacPage('SYARAT & KETENTUAN PHOTO STUDIO', [
          {
            title: '1. Pemesanan & Pembayaran',
            points: [
              'Jadwal pemotretan (Booking Slot) baru dianggap sah dan dikunci setelah Klien melakukan pembayaran Down Payment (DP) sebesar Rp 200.000 (atau nominal yang telah disetujui).',
              'Pembayaran DP bersifat hangus (non-refundable) apabila Klien melakukan pembatalan sepihak.',
              'Sisa pelunasan biaya wajib diselesaikan di studio pada hari H pemotretan sebelum sesi photoshoot dimulai.'
            ]
          },
          {
            title: '2. Waktu Sesi & Keterlambatan',
            points: [
              'Durasi pemotretan berlangsung sesuai paket yang dipilih (termasuk durasi photoshoot dan pemilihan foto).',
              'Klien wajib hadir paling lambat 10–15 menit sebelum jam sesi dimulai.',
              'Keterlambatan kehadiran Klien akan memotong durasi photoshoot yang telah dijadwalkan tanpa adanya perpanjangan waktu atau pengembalian biaya.'
            ]
          },
          {
            title: '3. Properti & Penggunaan Room',
            points: [
              'Klien berhak menggunakan properti dan background yang disediakan khusus untuk room yang dipesan.',
              'Klien bertanggung jawab penuh atas kebersihan dan keutuhan fasilitas/properti studio selama sesi berlangsung.',
              'Segala bentuk kerusakan atau kehilangan properti studio akibat kelalaian Klien akan dikenakan biaya ganti rugi penuh.'
            ]
          },
          {
            title: '4. Penyerahan & Penyimpanan Hasil Foto',
            points: [
              'Pengiriman File Mentah: Seluruh file foto mentah (preview) akan dikirimkan melalui tautan Google Drive maksimal 3 hari kerja setelah sesi foto selesai untuk dipilih oleh Klien.',
              'Proses Editing: Proses edit file foto pilihan Klien memakan waktu 3–7 hari kerja, terhitung sejak Klien selesai menyetor nomor/daftar foto yang akan diedit.',
              'Ketentuan Revisi Foto: Klien hanya berhak mengajukan 1x revisi untuk kategori minor (seperti kecerahan warna, noda kecil pada latar, atau kerapian pakaian). Foto yang sudah selesai diedit sesuai jumlah isi paket tidak dapat ditukar/diganti dengan foto baru lainnya.',
              'Ketentuan Cetak Foto: Foto yang sudah masuk proses cetak atau sudah dicetak tidak dapat dibatalkan, diganti, atau diubah dengan file foto lain.',
              'Batas Masa Simpan (Kadaluwarsa Link): Pihak studio hanya menyimpan dan menyediakan tautan (link) Google Drive selama maksimal 30 hari sejak tautan dikirimkan ke Klien. Klien wajib segera mengunduh (download) seluruh file foto ke perangkat pribadi sebelum batas waktu tersebut. Setelah melewati 30 hari, tautan akan otomatis dinonaktifkan atau dihapus permanen dari sistem studio, dan pihak studio tidak bertanggung jawab atas kehilangan file tersebut.'
            ]
          },
          {
            title: '5. Kebijakan Perubahan Jadwal (Reschedule)',
            points: [
              'Reschedule hanya dapat dilakukan maksimal 2x24 jam sebelum sesi dimulai, bergantung pada ketersediaan slot studio yang kosong.',
              'Permintaan reschedule kurang dari 2x24 jam akan dikenakan biaya administrasi tambahan sebesar Rp 50.000, atau DP dianggap hangus jika slot baru tidak tersedia.'
            ]
          },
          {
            title: '6. Hak Cipta & Penggunaan Foto (Copyright)',
            points: [
              'Hak cipta atas seluruh karya foto tetap berada di tangan Photo Studio.',
              'Klien diberikan hak penggunaan foto untuk keperluan pribadi (personal use)',
              'Photo Studio berhak menggunakan hasil foto sebagai materi promosi dan portofolio, kecuali jika Klien mengajukan keberatan tertulis sejak awal (private session).'
            ]
          },
          {
            title: '7. Keamanan & Batasan Tanggung Jawab (Liability)',
            points: [
              'Klien bertanggung jawab penuh atas keamanan barang bawaan pribadi. Photo Studio tidak bertanggung jawab atas kehilangan atau kerusakan barang berharga milik Klien.',
              'Apabila terjadi gangguan teknis besar dari pihak studio (seperti kamera utama rusak mendadak) yang menyebabkan sesi foto batal, studio hanya bertanggung jawab mengembalikan biaya (refund) penuh atau menawarkan jadwal pengganti.'
            ]
          },
          {
            title: '8. Aturan Kapasitas Maksimum',
            points: [
              'Setiap paket memiliki batas maksimum jumlah orang yang diperbolehkan masuk ke area studio (termasuk model dan pendamping).',
              'Kelebihan jumlah orang akan dikenakan biaya tambahan (charge per kepala) sebesar Rp 25.000 / orang.'
            ]
          },
          {
            title: '9. Keadaan Memaksa (Force Majeure)',
            points: [
              'Definisi: Pihak Studio dibebaskan dari tanggung jawab atas keterlambatan atau pembatalan sesi foto yang disebabkan oleh kejadian di luar kendali manusia (Force Majeure).',
              'Cakupan Kejadian: Peristiwa yang termasuk dalam Force Majeure meliputi bencana alam (gempa bumi, banjir, badai), kebakaran studio, pemadaman listrik massal dari pusat/PLN, huru-hara/kerusuhan, gangguan jaringan internet global, serta kebijakan darurat resmi dari pemerintah.',
              'Solusi Penanganan: Jika sesi foto batal akibat Force Majeure, Klien berhak mendapatkan Jadwal Ulang (Reschedule) gratis atau pengembalian dana (Refund) DP secara penuh tanpa potongan. Pihak Studio tidak dapat dituntut atas kerugian materiil maupun immateriil lainnya yang timbul akibat situasi darurat ini.'
            ]
          }
        ], '#1e40af'); // Blue/Navy color for Studio
      }

      // --- 2. T&C Makeup (Lady Makeup) ---
      if (hasMakeup) {
        drawTacPage('SYARAT & KETENTUAN LADY MAKEUP', [
          {
            title: '1. Reservasi & Down Payment (DP)',
            points: [
              'Slot tanggal dan waktu makeup Kakak baru dianggap sah (booked) setelah melakukan pembayaran Down Payment (DP) minimal sebesar Rp 1.000.000.',
              'Penting: Uang DP untuk paket yang sudah dipilih dan dibayarkan tidak dapat ditukarkan atau dialihkan ke jenis paket lainnya.',
              'Mohon maaf, pembayaran DP bersifat hangus dan tidak dapat dikembalikan (non-refundable) apabila Kakak melakukan pembatalan sepihak.'
            ]
          },
          {
            title: '2. Pelunasan Biaya',
            points: [
              'Batas waktu pelunasan sisa biaya makeup adalah minimal H-1 (satu hari sebelum acara) dan maksimal H+1 (satu hari setelah acara selesai).',
              'Mohon kerja samanya untuk menyelesaikan pelunasan tepat waktu sesuai rentang waktu tersebut ya, Kak.'
            ]
          },
          {
            title: '3. Kebijakan Perubahan Jadwal (Reschedule)',
            points: [
              'Kami sangat memahami jika ada agenda penting yang berubah. Permintaan reschedule (perubahan tanggal acara) wajib diinformasikan kepada tim kami maksimal 30 hari sebelum acara, dan persetujuannya akan bergantung pada ketersediaan slot kosong tim Lady Makeup.',
              'Jika permintaan reschedule dilakukan kurang dari 30 hari sebelum acara, maka DP dianggap hangus.'
            ]
          },
          {
            title: '4. Fitting Kebaya & Aksesoris',
            points: [
              'Kakak berhak melakukan fitting kebaya dan pemilihan aksesoris sesuai dengan jadwal yang telah ditentukan dan disepakati bersama tim Lady Makeup.',
              'Mohon bersama-sama menjaga keutuhan busana ya, Kak. Setiap kerusakan atau kehilangan pada busana atau aksesoris selama masa peminjaman oleh Klien akan dikenakan biaya ganti rugi sesuai tingkat kerusakan.'
            ]
          },
          {
            title: '5. Pelaksanaan Makeup & Keterlambatan',
            points: [
              'Kakak diharapkan sudah siap di lokasi pada waktu yang telah ditentukan (standby time). Keterlambatan dari pihak Kakak dapat mengurangi durasi pengerjaan agar tidak mengganggu jadwal klien berikutnya, dan tim kami tidak bertanggung jawab atas hasil yang kurang maksimal akibat terburu-buru.',
              'Jika ada penambahan jumlah orang yang ingin di-makeup pada hari H, mohon diinformasikan kepada tim kami minimal H-7 acara dan akan dikenakan biaya tambahan sesuai daftar harga (pricelist) yang berlaku.'
            ]
          },
          {
            title: '6. Kesehatan Kulit & Alergi Kosmetik',
            points: [
              'Kenyamanan Kakak adalah prioritas kami. Klien wajib menginformasikan kepada MUA sejak awal jika memiliki jenis kulit yang sangat sensitif, riwayat alergi terhadap kandungan kosmetik tertentu, atau sedang dalam perawatan dokter kulit.',
              'Tim Lady Makeup selalu menggunakan produk original dan menjaga kebersihan alat kerja. Namun, kami tidak bertanggung jawab atas reaksi alergi yang timbul di luar kendali kami jika Klien tidak menginformasikan kondisi kulitnya sejak awal.'
            ]
          },
          {
            title: '7. Transportasi & Akomodasi (Untuk Sesi Luar Galery)',
            points: [
              'Untuk layanan makeup panggilan di luar Galery Lady Makeup, biaya transportasi dan akomodasi tim (jika luar kota) akan ditanggung oleh Klien sesuai dengan kesepakatan awal.',
              'Pricelist berikut berlaku untuk seputaran kota kuala simpang , jika diluar ini ada penambahan biaya akomodasi.',
              'Klien mohon menyediakan area pengerjaan makeup yang memiliki pencahayaan ruangan yang cukup terang serta akses colokan listrik untuk alat makeup.'
            ]
          },
          {
            title: '8. Dokumentasi & Hak Publikasi',
            points: [
              'Tim Lady Makeup berhak mengambil foto atau video sebelum (before) dan sesudah (after) proses makeup untuk keperluan portofolio dan promosi di media sosial resmi kami.',
              'Jika Kakak merasa keberatan atau ingin hasil fotonya tetap privat (tidak dipublikasikan), mohon sampaikan kepada tim kami sebelum proses makeup dimulai ya, Kak.'
            ]
          },
          {
            title: '9. Keadaan Memaksa (Force Majeure)',
            points: [
              'Jika terjadi hal-hal di luar kendali manusia (seperti bencana alam, kecelakaan tim di perjalanan, pemadaman listrik total, atau kebijakan darurat pemerintah) yang membuat tim kami terhambat hadir, tim Lady Makeup akan menginfokan secepat mungkin.',
              'Apabila tim kami sama sekali tidak bisa hadir karena situasi darurat tersebut, kami akan mengembalikan dana (refund) yang telah masuk secara utuh atau mencarikan partner MUA pengganti yang setara demi kelancaran acara Kakak.'
            ]
          }
        ], '#db2777'); // Pink color for makeup
      }

      // --- 3. T&C Dekorasi (Lapanbelas Dekorasi) ---
      if (hasDecor) {
        drawTacPage('SYARAT & KETENTUAN LAPANBELAS DEKORASI', [
          {
            title: '1. Reservasi, Down Payment (DP) & Pemilihan Paket',
            points: [
              'Jadwal pemasangan dekorasi acara Kakak baru dianggap sah (booked) setelah melakukan pembayaran Down Payment (DP) minimal sebesar Rp 2.000.000.',
              'Pembayaran DP bersifat hangus dan tidak dapat dikembalikan jika terjadi pembatalan sepihak dari Klien.',
              'Penting: Jenis paket dekorasi yang sudah dipilih dan didepositkan tidak dapat dialihkan atau ditukarkan ke kategori paket atau layanan lainnya.'
            ]
          },
          {
            title: '2. Perubahan Konsep & Desain',
            points: [
              'Diskusi dan perubahan total konsep desain, sketsa layout, atau tema warna dekorasi wajib diselesaikan maksimal H-30 sebelum acara.',
              'Mohon maaf, perubahan konsep secara mendadak setelah melewati batas waktu tersebut tidak dapat kami layani demi kelancaran persiapan logistik ya, Kak.'
            ]
          },
          {
            title: '3. Pelunasan Biaya',
            points: [
              'Sisa pelunasan seluruh biaya dekorasi wajib diselesaikan dalam rentang waktu minimal H-1 (satu hari sebelum acara) dan maksimal H+1 (satu hari setelah acara selesai).'
            ]
          },
          {
            title: '4. Pemasangan (Loading) & Pembongkaran (Teardown)',
            points: [
              'Tim dekorasi membutuhkan waktu proses loading materi dan pemasangan di lokasi maksimal 2 (dua) hari sebelum acara, atau sesuai dengan jadwal masuk yang disetujui pihak pengelola gedung.',
              'Proses pembongkaran akan dilakukan langsung secara berkala setelah acara selesai. Mohon Klien memastikan area pengerjaan bebas dari barang berharga pribadi.'
            ]
          },
          {
            title: '5. Kebijakan Perubahan Jadwal (Reschedule)',
            points: [
              'Permintaan reschedule (perubahan tanggal acara) dapat diajukan maksimal 30 hari sebelum tanggal acara awal, dan persetujuannya mutlak tergantung pada ketersediaan slot kosong pada kalender tim Lapanbelas Dekorasi.',
              'Jika pengajuan reschedule dilakukan kurang dari 30 hari sebelum acara, maka DP dianggap hangus.'
            ]
          },
          {
            title: '6. Kerusakan & Kehilangan Properti',
            points: [
              'Selama acara berlangsung, keamanan seluruh properti dekorasi menjadi tanggung jawab bersama.',
              'Apabila terjadi kerusakan fatal atau kehilangan properti dekorasi yang disebabkan oleh kelalaian Klien atau tamu undangan, Klien wajib mengganti rugi sesuai dengan nilai barang tersebut.'
            ]
          },
          {
            title: '7. Izin Gedung & Biaya Tambahan (Surcharge)',
            points: [
              'Klien bertanggung jawab penuh untuk mengurus perizinan dekorasi, biaya kebersihan, serta biaya tambahan (surcharge) vendor yang bersumber dari pihak pengelola gedung atau lingkungan setempat.'
            ]
          },
          {
            title: '8. Kebijakan Acara Outdoor (Luar Ruangan)',
            points: [
              'Untuk konsep acara luar ruangan (outdoor), Klien wajib menyiapkan rencana cadangan (back-up plan) seperti tenda jika terjadi perubahan cuaca buruk. Tim dekorasi tidak bertanggung jawab atas kerusakan estetika yang murni disebabkan oleh faktor cuaca ekstrem di lokasi.'
            ]
          },
          {
            title: '9. Keadaan Memaksa (Force Majeure)',
            points: [
              'Pihak Lapanbelas Dekorasi dibebaskan dari tanggung jawab atas keterlambatan atau kegagalan pemasangan yang disebabkan oleh kejadian di luar kendali manusia (bencana alam, kebakaran gedung, huru-hara, atau kecelakaan berat armada angkutan).'
            ]
          }
        ], '#b45309'); // Amber/Brownish color for decor
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function parseFittingNotes(notesStr) {
  let division = 'Lady Makeup';
  let eventDate = '';
  let fittingDate = '';
  let hasilFitting = '';
  let statusFitting = 'Menunggu Fitting';
  let fittingChecklist = '{}';

  if (!notesStr) return { division, eventDate, fittingDate, hasilFitting, statusFitting, fittingChecklist };

  const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/);
  if (divisiMatch) division = divisiMatch[1].trim();
  const fittingDateMatch = notesStr.match(/\[JADWAL FITTING\]:\s*([^\n]+)/);
  if (fittingDateMatch) fittingDate = fittingDateMatch[1].trim();
  const hasilFittingMatch = notesStr.match(/\[HASIL FITTING\]:\s*([^\n]+)/);
  if (hasilFittingMatch) hasilFitting = hasilFittingMatch[1].trim();
  const statusFittingMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
  if (statusFittingMatch) statusFitting = statusFittingMatch[1].trim();
  const fittingChecklistMatch = notesStr.match(/\[FITTING CHECKLIST\]:\s*([^\n]+)/);
  if (fittingChecklistMatch) fittingChecklist = fittingChecklistMatch[1].trim();

  return { division, fittingDate, hasilFitting, statusFitting, fittingChecklist };
}

function generateFittingPDF(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const orderId = order.id || '-';
      const clientName = order.client_name || '-';
      const clientPhone = order.client_phone || '-';
      const eventDateVal = safeFormatDateID(order.event_date);

      const parsedNotes = parseFittingNotes(order.additional_notes || '');
      const fittingDateVal = safeFormatDateID(parsedNotes.fittingDate);

      let checklistObj = {};
      try {
        checklistObj = JSON.parse(parsedNotes.fittingChecklist || '{}');
      } catch (e) { }

      const busana = checklistObj.busana || parsedNotes.hasilFitting || '-';
      const aksesoris = checklistObj.aksesoris || '-';
      const catatanRias = checklistObj.catatanRias || '-';
      const ukuranBajuPria = checklistObj.ukuranBajuPria || '-';
      const ukuranBajuWanita = checklistObj.ukuranBajuWanita || '-';
      const ukuranCelanaPria = checklistObj.ukuranCelanaPria || '-';
      const keteranganUkuran = checklistObj.keteranganUkuran || '-';

      // --- Draw header ---
      // Primary color: rose-500 (#db2777)
      doc.fillColor('#db2777')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Lady Makeup', 40, 40);

      doc.fillColor('#1a1c1b')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('LEMBAR HASIL FITTING BUSANA', 400, 40, { align: 'right', width: 150 });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text('18Studio Management - Divisi Lady Makeup', 40, 68);

      // Draw a line under header
      doc.moveTo(40, 85).lineTo(550, 85).strokeColor('#e2e8f0').lineWidth(2).stroke();

      // --- Client Details ---
      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#db2777')
        .text('DETAIL CLIENT:', 40, 110);

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1a1c1b')
        .text(clientName.toUpperCase(), 40, 122);

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`WhatsApp: ${clientPhone}`, 40, 137)
        .text(`Booking ID: #${orderId}`, 40, 151);

      // Right column client info
      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#db2777')
        .text('JADWAL:', 340, 110);

      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1a1c1b')
        .text('Tanggal Acara (Hari H):', 340, 122)
        .font('Helvetica')
        .text(eventDateVal, 460, 122)

        .font('Helvetica-Bold')
        .text('Tanggal Fitting:', 340, 137)
        .font('Helvetica')
        .text(fittingDateVal, 460, 137);

      doc.moveTo(40, 175).lineTo(550, 175).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- Checklist Fitting Details ---
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#db2777')
        .text('CHECKLIST BUSANA & PROPERTI RIAS', 40, 195);

      // Draw Busana Card
      doc.rect(40, 215, 510, 45).fill('#fff0f6');
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#c2185b')
        .text('1. Busana / Kebaya Terpilih', 50, 223)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1a1c1b')
        .text(busana, 50, 238);

      // Draw Aksesoris Card
      doc.rect(40, 275, 510, 45).fill('#fff0f6');
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#c2185b')
        .text('2. Aksesoris & Properti', 50, 283)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1a1c1b')
        .text(aksesoris, 50, 298);

      // Draw Catatan Rias Card
      doc.rect(40, 335, 510, 55).fill('#f9fafb');
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#4b5563')
        .text('3. Catatan Makeup / Request Spesifik', 50, 343)
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#1f2937')
        .text(catatanRias, 50, 358, { width: 490 });

      // --- Ukuran Badan Table ---
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#db2777')
        .text('DETAIL UKURAN BUSANA & KETERANGAN', 40, 415);

      // Draw table header
      doc.rect(40, 435, 510, 22).fill('#db2777');
      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('KATEGORI', 50, 442)
        .text('UKURAN / KETERANGAN', 280, 442);

      let tableY = 457;
      const drawRow = (label, value) => {
        doc.rect(40, tableY, 510, 22).fill(tableY % 44 === 0 ? '#fdf2f8' : '#ffffff');
        doc.fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#1a1c1b')
          .text(label, 50, tableY + 7)
          .font('Helvetica')
          .text(value, 280, tableY + 7);
        tableY += 22;
      };

      drawRow('Ukuran Baju Pria', ukuranBajuPria);
      drawRow('Ukuran Baju Wanita', ukuranBajuWanita);
      drawRow('Ukuran Celana Pria', ukuranCelanaPria);
      
      // For Keterangan, draw a bigger block since it might be long text
      doc.rect(40, tableY, 510, 45).fill('#f9fafb');
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1a1c1b')
        .text('Keterangan Tambahan / Alterasi:', 50, tableY + 8)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(keteranganUkuran, 50, tableY + 22, { width: 490 });
      tableY += 50;

      // --- Signatures block ---
      const sigTop = tableY + 30;

      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#6b7280')
        .text('TANDA TANGAN CLIENT', 40, sigTop)
        .text('TANDA TANGAN MAKEUP ARTIST', 340, sigTop);

      doc.moveTo(40, sigTop + 65).lineTo(160, sigTop + 65).strokeColor('#cccccc').lineWidth(1).stroke();
      doc.moveTo(340, sigTop + 65).lineTo(460, sigTop + 65).strokeColor('#cccccc').lineWidth(1).stroke();

      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(clientName.toUpperCase(), 40, sigTop + 70)
        .text('Tim Lady Makeup', 340, sigTop + 70);

      // Copyright Footer
      doc.fontSize(7.5)
        .font('Helvetica')
        .fillColor('#999999')
        .text('© 2026 LADY MAKEUP • DOKUMEN FITTING RESMI LAPANBELAS ID', 40, sigTop + 105, { align: 'center', width: 510 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function parseDecorNotes(notesStr) {
  let division = 'Lapanbelas Dekorasi';
  let surveiDate = '';
  let pemasanganDate = '';
  let catatanSurvei = '';
  let statusSurvei = 'Belum di survei';

  if (!notesStr) return { division, surveiDate, pemasanganDate, catatanSurvei, statusSurvei };

  const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/);
  if (divisiMatch) division = divisiMatch[1].trim();
  const surveiDateMatch = notesStr.match(/\[JADWAL SURVEI\]:\s*([^\n]+)/);
  if (surveiDateMatch) surveiDate = surveiDateMatch[1].trim();
  const pemasanganDateMatch = notesStr.match(/\[JADWAL PEMASANGAN\]:\s*([^\n]+)/);
  if (pemasanganDateMatch) pemasanganDate = pemasanganDateMatch[1].trim();
  const statusMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
  if (statusMatch) statusSurvei = statusMatch[1].trim();
  const catatanMatch = notesStr.match(/\[HASIL FITTING\]:\s*([^\n]+)/);
  if (catatanMatch) catatanSurvei = catatanMatch[1].trim();

  return { division, surveiDate, pemasanganDate, catatanSurvei, statusSurvei };
}

function generateDecorPDF(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const orderId = order.id || '-';
      const clientName = order.client_name || '-';
      const clientPhone = order.client_phone || '-';
      const eventDateVal = safeFormatDateID(order.event_date);

      const parsedNotes = parseDecorNotes(order.additional_notes || '');
      const surveiDateVal = safeFormatDateID(parsedNotes.surveiDate);

      doc.fillColor('#10b981')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Lapanbelas Dekorasi', 40, 40);

      doc.fillColor('#1a1c1b')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('LEMBAR JADWAL & SURVEI DEKORASI', 380, 40, { align: 'right', width: 170 });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text('18Studio Management - Divisi Dekorasi', 40, 68);

      doc.moveTo(40, 85).lineTo(550, 85).strokeColor('#e2e8f0').lineWidth(2).stroke();

      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#10b981')
        .text('DETAIL CLIENT:', 40, 110);

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1a1c1b')
        .text(clientName.toUpperCase(), 40, 122);

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`WhatsApp: ${clientPhone}`, 40, 137)
        .text(`Booking ID: #${orderId}`, 40, 151);

      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#10b981')
        .text('JADWAL LOGISTIK:', 340, 110);

      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1a1c1b')
        .text('Tanggal Acara (Hari H):', 340, 122)
        .font('Helvetica')
        .text(eventDateVal, 460, 122)

        .font('Helvetica-Bold')
        .text('Tanggal Survei:', 340, 137)
        .font('Helvetica')
        .text(surveiDateVal, 460, 137)

        .font('Helvetica-Bold')
        .text('Jadwal Pasang:', 340, 152)
        .font('Helvetica')
        .text(parsedNotes.pemasanganDate || '-', 460, 152);

      doc.moveTo(40, 175).lineTo(550, 175).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#10b981')
        .text('CATATAN HASIL SURVEI / AKSES LOKASI', 40, 195);

      doc.rect(40, 215, 510, 80).fill('#f0fdf4');
      doc.fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor('#065f46')
        .text('Hasil Keterangan Lapangan:', 50, 225)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1a1c1b')
        .text(parsedNotes.catatanSurvei || 'Belum ada catatan hasil survei.', 50, 243, { width: 490, lineGap: 3 });

      doc.rect(40, 310, 510, 35).fill('#f3f4f6');
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text('Status Logistik:', 50, 323)
        .font('Helvetica-Bold')
        .fillColor(parsedNotes.statusSurvei === 'Selesai di survei' ? '#059669' : '#d97706')
        .text(parsedNotes.statusSurvei.toUpperCase(), 140, 323);

      const sigTop = 380;

      doc.fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#6b7280')
        .text('TANDA TANGAN CLIENT', 40, sigTop)
        .text('TANDA TANGAN KOORDINATOR LOGISTIK', 340, sigTop);

      doc.moveTo(40, sigTop + 65).lineTo(160, sigTop + 65).strokeColor('#cccccc').lineWidth(1).stroke();
      doc.moveTo(340, sigTop + 65).lineTo(460, sigTop + 65).strokeColor('#cccccc').lineWidth(1).stroke();

      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(clientName.toUpperCase(), 40, sigTop + 70)
        .text('Tim Dekorasi Lapanbelas', 340, sigTop + 70);

      doc.fontSize(7.5)
        .font('Helvetica')
        .fillColor('#999999')
        .text('© 2026 LAPANBELAS DEKORASI • DOKUMEN LOGISTIK RESMI LAPANBELAS ID', 40, sigTop + 105, { align: 'center', width: 510 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}


/**
 * Helper to send WhatsApp notification via Kirimi.id Gateway
 */
async function sendWhatsAppNotification(receiver, message, mediaUrl = null) {
  const userCode = process.env.KIRIMI_USER_CODE;
  const secret = process.env.KIRIMI_SECRET;
  const deviceId = process.env.KIRIMI_DEVICE_ID;

  // If any credentials are placeholder or missing, log warning and skip
  if (!userCode || !secret || !deviceId || 
      userCode === 'your_user_code_here' || 
      secret === 'your_secret_key_here' || 
      deviceId === 'your_device_id_here') {
    console.warn('[WhatsApp] Kirimi.id credentials are not configured in .env. Skipping send to:', receiver);
    return false;
  }

  // Format receiver number to international format: e.g. 0812... -> 62812...
  let cleanedReceiver = receiver ? receiver.toString().replace(/[^0-9]/g, '') : '';
  if (cleanedReceiver.startsWith('0')) {
    cleanedReceiver = '62' + cleanedReceiver.slice(1);
  }
  if (!cleanedReceiver) {
    console.warn('[WhatsApp] Cleaned receiver number is empty. Skipping.');
    return false;
  }

  console.log(`[WhatsApp] Sending notification to ${cleanedReceiver} with message length ${message.length}`);

  try {
    const payload = {
      user_code: userCode,
      secret: secret,
      device_id: deviceId,
      receiver: cleanedReceiver,
      message: message
    };

    // Hanya lampirkan media_url jika berupa URL publik (bukan localhost / 127.0.0.1)
    if (mediaUrl && !mediaUrl.includes('localhost') && !mediaUrl.includes('127.0.0.1')) {
      payload.media_url = mediaUrl;
    }

    const response = await axios.post('https://api.kirimi.id/v1/send-message', payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10s timeout
    });

    // Handle standard success signatures
    if (response.data && (response.data.status === true || response.data.success === true || response.data.status === 'success')) {
      console.log(`[WhatsApp] Sent notification successfully to ${cleanedReceiver}`);
      return true;
    } else {
      // Jika pengiriman dengan media gagal, coba retry sebagai teks biasa
      if (payload.media_url) {
        console.warn('[WhatsApp] Kirimi send with media failed. Retrying without media...');
        delete payload.media_url;
        const retryRes = await axios.post('https://api.kirimi.id/v1/send-message', payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        if (retryRes.data && (retryRes.data.status === true || retryRes.data.success === true || retryRes.data.status === 'success')) {
          console.log(`[WhatsApp] Sent plain text fallback successfully to ${cleanedReceiver}`);
          return true;
        }
      }
      console.error('[WhatsApp] Kirimi.id response returned failure:', response.data);
      return false;
    }
  } catch (error) {
    // Jika timeout atau error saat kirim media, fallback retry kirim teks pesan
    if (mediaUrl) {
      try {
        console.warn('[WhatsApp] Error sending with media. Retrying plain text...');
        const plainPayload = {
          user_code: userCode,
          secret: secret,
          device_id: deviceId,
          receiver: cleanedReceiver,
          message: message
        };
        const retryRes = await axios.post('https://api.kirimi.id/v1/send-message', plainPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        if (retryRes.data && (retryRes.data.status === true || retryRes.data.success === true || retryRes.data.status === 'success')) {
          console.log(`[WhatsApp] Sent plain text fallback successfully to ${cleanedReceiver}`);
          return true;
        }
      } catch (retryErr) {
        console.error('[WhatsApp] Plain text fallback also failed:', retryErr.message);
      }
    }
    console.error('[WhatsApp] Failed to send notification:', error.message);
    if (error.response) {
      console.error('[WhatsApp] Kirimi.id response error data:', error.response.data);
    }
    return false;
  }
}

/**
 * Helper to send email via Nodemailer
 */
async function sendInvoiceEmail(type, order) {
  const customerEmail = sanitizeEmail(order.client_email || order.customer_email);
  if (!customerEmail) {
    throw new Error('Alamat email klien kosong. Mohon lengkapi email klien di data appointment.');
  }

  if (!isValidEmailFormat(customerEmail)) {
    throw new Error(`Format alamat email klien tidak valid: "${customerEmail}". Mohon cek kemungkinan salah ketik (typo).`);
  }

  // Explicitly sync order.status to ensure PDF generation shows the matching state badge
  if (type === 'sudah_dp') order.status = 'Sudah DP';
  else if (type === 'lunas') order.status = 'Lunas';
  else if (type === 'menunggu_dp') order.status = 'Menunggu DP';
  else if (type === 'reminder_pelunasan') order.status = 'Sudah DP';

  const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
  const total = formatter.format(order.total_amount || order.total || 0);
  const dp = formatter.format(order.dp_amount || order.dp || 0);
  const remaining = formatter.format((order.total_amount || order.total || 0) - (order.dp_amount || order.dp || 0));

  let subject = '';
  let htmlBody = '';

  const pkgName = order.package_name || (order.pkg ? order.pkg.title : 'Paket LAPANBELAS.ID');
  const pkgDesc = (order.packages && order.packages.description) || (order.pkg ? order.pkg.description : '');
  const orderId = order.id || order.invoice_number;

  const portalCredentialsHtml = order.client_password ? `
          <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #1e3a8a; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">🔑 AKSES PORTAL KLIEN</p>
            <p style="margin: 8px 0 12px 0; font-size: 13px; color: #1e40af; line-height: 1.4;">Gunakan Booking ID & Sandi berikut untuk login, mengunduh kwitansi, atau melihat status revisi foto di portal klien kami:</p>
            <div style="display: inline-block; text-align: left; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 15px;">
              <p style="margin: 3px 0; font-size: 13px; color: #374151;"><strong>Website:</strong> <a href="https://app.lapanbelas.id" style="color: #2563eb; text-decoration: none; font-weight: bold;">app.lapanbelas.id</a></p>
              <p style="margin: 3px 0; font-size: 13px; color: #374151;"><strong>Booking ID:</strong> <span style="font-family: monospace; font-size: 13px; font-weight: bold; background: #f3f4f6; padding: 1px 4px; border-radius: 3px;">${orderId}</span></p>
              <p style="margin: 3px 0; font-size: 13px; color: #374151;"><strong>Sandi Login:</strong> <span style="font-family: monospace; font-size: 13px; font-weight: bold; background: #f3f4f6; padding: 1px 4px; border-radius: 3px;">${order.client_password}</span></p>
            </div>
          </div>
  ` : '';

  if (type === 'menunggu_dp') {
    subject = `Menunggu Pembayaran DP - Pesanan #${orderId} LAPANBELAS.ID`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2a6742; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LAPANBELAS.ID</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
          <h2 style="margin-top: 0; color: #1f2937;">Halo ${order.client_name},</h2>
          <p style="line-height: 1.6;">Terima kasih telah melakukan pemesanan di <strong>LAPANBELAS.ID</strong>. Berikut adalah rincian pesanan Anda:</p>
          
          <div style="background-color: #f9fafb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>ID Pesanan:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Paket:</strong> ${pkgName}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #4b5563;"><strong>Isi Paket:</strong><br/>${(pkgDesc || '-').replace(/\n/g, '<br/>')}</p>
            ${(() => {
        const parsed = parseInvoiceNotes(order);
        const subTotalNum = (order.total_amount || order.total || 0) - parsed.addonsTotal - parsed.customFeesTotal + parsed.voucherDiscount;
        let html = `<p style="margin: 5px 0; margin-top: 15px;"><strong>Sub Total:</strong> ${formatter.format(subTotalNum)}</p>`;
        parsed.addonsList.forEach(item => {
          html += `<p style="margin: 5px 0; color: #4b5563;">+ ${item.name}: ${formatter.format(item.amount)}</p>`;
        });
        parsed.customFeesList.forEach(item => {
          html += `<p style="margin: 5px 0; color: #4b5563;">+ ${item.name}: ${formatter.format(item.amount)}</p>`;
        });
        if (parsed.voucherDiscount > 0) {
          html += `<p style="margin: 5px 0; color: #b91c1c;">- Discount: -${formatter.format(parsed.voucherDiscount)}</p>`;
        }
        return html;
      })()}
            <p style="margin: 5px 0; margin-top: 15px;"><strong>Total Harga:</strong> ${total}</p>
            <p style="margin: 5px 0; color: #b91c1c;"><strong>Tagihan DP:</strong> ${dp}</p>
          </div>

          ${portalCredentialsHtml}
          
          <p style="line-height: 1.6;">Harap segera menyelesaikan pembayaran DP untuk mengamankan jadwal acara Anda. Jika Anda belum membayarnya, Anda bisa kembali ke website kami dan masuk to menu <strong>My Orders</strong>.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
          &copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.
        </div>
      </div>
    `;
  } else if (type === 'sudah_dp') {
    subject = `Pembayaran DP Diterima - Pesanan #${orderId} LAPANBELAS.ID`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2a6742; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LAPANBELAS.ID</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
          <h2 style="margin-top: 0; color: #1f2937;">Halo ${order.client_name},</h2>
          <p style="line-height: 1.6;">Hore! Pembayaran DP Anda telah kami terima dengan <strong>sukses</strong>.</p>
          <p style="line-height: 1.6;">Jadwal pemotretan acara Anda kini telah kami amankan.</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>ID Pesanan:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Status Pembayaran:</strong> <span style="color: #166534; font-weight: bold;">SUDAH DP</span></p>
            ${(() => {
        const parsed = parseInvoiceNotes(order);
        const subTotalNum = (order.total_amount || order.total || 0) - parsed.addonsTotal - parsed.customFeesTotal + parsed.voucherDiscount;
        let html = `<p style="margin: 5px 0;"><strong>Sub Total:</strong> ${formatter.format(subTotalNum)}</p>`;
        parsed.addonsList.forEach(item => {
          html += `<p style="margin: 2px 0 2px 10px; font-size: 13px; color: #4b5563;">+ ${item.name}: ${formatter.format(item.amount)}</p>`;
        });
        parsed.customFeesList.forEach(item => {
          html += `<p style="margin: 2px 0 2px 10px; font-size: 13px; color: #4b5563;">+ ${item.name}: ${formatter.format(item.amount)}</p>`;
        });
        if (parsed.voucherDiscount > 0) {
          html += `<p style="margin: 2px 0 2px 10px; font-size: 13px; color: #b91c1c;">- Discount: -${formatter.format(parsed.voucherDiscount)}</p>`;
        }
        return html;
      })()}
            <p style="margin: 5px 0; margin-top: 10px;"><strong>Total Harga:</strong> ${total}</p>
            <p style="margin: 5px 0;"><strong>DP Dibayarkan:</strong> ${dp}</p>
            <p style="margin: 5px 0; font-size: 16px; margin-top: 10px;"><strong>Sisa Tagihan:</strong> <strong style="color: #2a6742;">${remaining}</strong></p>
          </div>

          ${portalCredentialsHtml}
          
          <p style="line-height: 1.6;">Anda dapat melihat dan mengunduh invoice/kuitansi resmi di menu <strong>My Orders</strong> pada website kami.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
          &copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.
        </div>
      </div>
    `;
  } else if (type === 'lunas') {
    subject = `Pembayaran Lunas Terverifikasi - Pesanan #${orderId} LAPANBELAS.ID`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2a6742; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LAPANBELAS.ID</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
          <h2 style="margin-top: 0; color: #1f2937;">Halo ${order.client_name},</h2>
          <p style="line-height: 1.6;">Terima kasih banyak! Pembayaran pelunasan sisa pesanan Anda telah berhasil terverifikasi.</p>
          <p style="line-height: 1.6;">Pesanan Anda kini berstatus <strong>LUNAS (Paid in Full)</strong>.</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>ID Pesanan:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Status Pembayaran:</strong> <span style="color: #166534; font-weight: bold;">LUNAS</span></p>
            ${(() => {
        const parsed = parseInvoiceNotes(order);
        const subTotalNum = (order.total_amount || order.total || 0) - parsed.addonsTotal - parsed.customFeesTotal + parsed.voucherDiscount;
        let html = `<p style="margin: 5px 0;"><strong>Sub Total:</strong> ${formatter.format(subTotalNum)}</p>`;
        parsed.addonsList.forEach(item => {
          html += `<p style="margin: 2px 0 2px 10px; font-size: 13px; color: #4b5563;">+ ${item.name}: ${formatter.format(item.amount)}</p>`;
        });
        parsed.customFeesList.forEach(item => {
          html += `<p style="margin: 2px 0 2px 10px; font-size: 13px; color: #4b5563;">+ ${item.name}: ${formatter.format(item.amount)}</p>`;
        });
        if (parsed.voucherDiscount > 0) {
          html += `<p style="margin: 2px 0 2px 10px; font-size: 13px; color: #b91c1c;">- Discount: -${formatter.format(parsed.voucherDiscount)}</p>`;
        }
        return html;
      })()}
            <p style="margin: 5px 0; margin-top: 10px;"><strong>Total Harga:</strong> ${total}</p>
            <p style="margin: 5px 0; color: #166534;"><strong>Sisa Tagihan:</strong> Rp 0 (Lunas)</p>
          </div>
          
          <p style="line-height: 1.6;">Invoice pelunasan resmi terlampir dalam email ini dan juga dapat dilihat di menu <strong>My Orders</strong> pada website kami.</p>
          <p style="line-height: 1.6; margin-top: 15px; color: #b91c1c;"><strong>Catatan:</strong> Sebentar lagi kami akan mengirimkan link Google Drive untuk mengakses dan memilih foto Anda. Harap cek kotak masuk Anda secara berkala!</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
          &copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.
        </div>
      </div>
    `;
  } else if (type === 'reminder_pelunasan') {
    subject = `🔔 Reminder Pelunasan Sisa Pembayaran - Pesanan #${orderId} LAPANBELAS.ID`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #b91c1c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LAPANBELAS.ID</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
          <h2 style="margin-top: 0; color: #1f2937;">Halo ${order.client_name},</h2>
          <p style="line-height: 1.6;">Kami menginfokan bahwa momen bahagia Anda telah berhasil didokumentasikan oleh tim 18Studio.</p>
          <p style="line-height: 1.6;">Untuk melanjutkan ke proses pemilihan foto, pengunggahan drive, serta editing oleh editor profesional kami, mohon untuk segera menyelesaikan <strong>sisa pembayaran pelunasan</strong> Anda.</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>ID Pesanan:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Total Harga Paket:</strong> ${total}</p>
            <p style="margin: 5px 0;"><strong>DP Terbayar:</strong> ${dp}</p>
            <p style="margin: 5px 0; font-size: 16px; margin-top: 10px; color: #b91c1c;"><strong>Sisa Pelunasan:</strong> <strong>${remaining}</strong></p>
          </div>
          
          <p style="line-height: 1.6;">Anda dapat melakukan pelunasan secara tunai (Cash) di studio kami atau transfer bank resmi. Detail invoice lengkap terlampir dalam email ini.</p>
          <p style="line-height: 1.6;">Apabila Anda telah melakukan pelunasan, harap abaikan email ini atau hubungi admin kami untuk konfirmasi cepat.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
          &copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.
        </div>
      </div>
    `;
  }

  const mailer = getMailerForOrder(order);
  const mailOptions = {
    from: `"LAPANBELAS.ID" <${mailer.fromEmail}>`,
    to: customerEmail,
    subject: subject,
    html: htmlBody
  };

  if (type === 'sudah_dp' || type === 'menunggu_dp' || type === 'lunas' || type === 'reminder_pelunasan') {
    try {
      const pdfBuffer = await generateInvoicePDF(order);
      if (pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `invoice-${orderId}.pdf`,
            content: pdfBuffer
          }
        ];
      }
    } catch (pdfErr) {
      console.error('[PDF Generation Error]', pdfErr);
    }
  }

  await mailer.transporter.sendMail(mailOptions);
  console.log(`[Email] Sent ${type} email to ${customerEmail}`);

  // Send WhatsApp Notification in parallel
  const clientPhone = order.client_phone || order.phone || order.customer_phone;
  if (clientPhone) {
    let waMsg = '';
    if (type === 'menunggu_dp') {
      waMsg = `*LAPANBELAS.ID - MENUNGGU PEMBAYARAN DP* 🔔\n\n` +
        `Halo *${order.client_name || 'Pelanggan'}*,\n` +
        `Terima kasih telah melakukan pemesanan di *LAPANBELAS.ID*.\n\n` +
        `*Rincian Pesanan:* \n` +
        `• *ID Pesanan:* #${orderId}\n` +
        `• *Pilihan Paket:* ${pkgName}\n` +
        `• *Total Harga:* ${total}\n` +
        `• *DP yang harus dibayar:* ${dp}\n` +
        `• *Sisa Pelunasan:* ${remaining}\n\n` +
        `Mohon lakukan pembayaran DP ke rekening resmi studio kami yang tertera di invoice/email.\n` +
        `Anda dapat memantau pesanan & mengunduh kuitansi resmi di portal klien kami:\n` +
        `🔗 *Website:* https://app.lapanbelas.id\n` +
        `🔑 *Booking ID:* \`${orderId}\`\n` +
        (order.client_password ? `🔑 *Sandi Login:* \`${order.client_password}\`\n\n` : `\n`) +
        `Terima kasih! Kami sangat bersemangat mendokumentasikan momen bahagia Anda. 🙏`;
    } else if (type === 'sudah_dp') {
      waMsg = `*LAPANBELAS.ID - PEMBAYARAN DP TERVERIFIKASI* ✅\n\n` +
        `Halo *${order.client_name || 'Pelanggan'}*,\n` +
        `Terima kasih! Pembayaran DP Anda sebesar *${dp}* untuk pesanan *#${orderId}* telah kami terima dan verifikasi.\n\n` +
        `*Rincian Pesanan:* \n` +
        `• *Pilihan Paket:* ${pkgName}\n` +
        `• *Total Harga:* ${total}\n` +
        `• *DP Dibayarkan:* ${dp}\n` +
        `• *Sisa Pelunasan:* ${remaining}\n\n` +
        `Anda dapat memantau pesanan & mengunduh kuitansi resmi di portal klien kami:\n` +
        `🔗 *Website:* https://app.lapanbelas.id\n` +
        `🔑 *Booking ID:* \`${orderId}\`\n` +
        (order.client_password ? `🔑 *Sandi Login:* \`${order.client_password}\`\n\n` : `\n`) +
        `Sampai jumpa di hari sesi pemotretan/acara! 🙏`;
    } else if (type === 'lunas') {
      waMsg = `Halo Kak *${order.client_name || 'Pelanggan'}*! 🎉\n\n` +
        `Pembayaran pelunasan untuk pesanan *#${orderId}* (*${pkgName}*) sudah kami terima dan berstatus *LUNAS*. Terima kasih banyak! ✨\n\n` +
        `Tim kami sedang menyiapkan file foto mentah Kakak ke Google Drive. Link pemilihan foto akan segera kami kirimkan ke WhatsApp ini ya. Mohon ditunggu! 😊\n\n` +
        `Terima kasih atas kepercayaannya pada LAPANBELAS.ID! 🙏`;
    } else if (type === 'reminder_pelunasan') {
      waMsg = `Halo Kak *${order.client_name || 'Pelanggan'}*! 🔔\n\n` +
        `Terima kasih atas sesi fotonya bersama LAPANBELAS.ID kemarin.\n` +
        `Untuk melanjutkan ke proses pengiriman link Drive dan editing, mohon bantuannya untuk menyelesaikan sisa pelunasan pesanan *#${orderId}* ya Kak.\n\n` +
        `💳 *Sisa Tagihan:* *${remaining}*\n\n` +
        `*Pembayaran Transfer:*\n` +
        `• Bank Mandiri: *1060019115370*\n` +
        `• a.n. *Muhammad Andreansyah*\n\n` +
        `Lihat invoice lengkap:\n` +
        `👉 https://app.lapanbelas.id (Booking ID: \`${orderId}\`)\n\n` +
        `Jika sudah melakukan pembayaran, silakan kirim bukti transfer ke sini ya Kak. Terima kasih! 🙏✨`;
    }

    if (waMsg) {
      // Kirimi.id will download this URL on the fly, consuming 0 bytes of our Supabase storage!
      let mediaUrl = null;
      if (type === 'sudah_dp' || type === 'menunggu_dp' || type === 'lunas' || type === 'reminder_pelunasan') {
        const baseUrl = process.env.APP_URL || 'https://app.lapanbelas.id';
        mediaUrl = `${baseUrl}/api/public/invoice/${orderId}.pdf`;
      }

      sendWhatsAppNotification(clientPhone, waMsg, mediaUrl).catch(err => {
        console.error('[WhatsApp] Parallel invoice notification failed:', err);
      });
    }
  }
}

/**
 * Helper to sanitize and validate email format
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().replace(/\s+/g, '');
}

function isValidEmailFormat(email) {
  if (!email) return false;
  // Regex standar format email
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

/**
 * Helper to send progress update email via Nodemailer
 */
async function sendProgressEmail(status, order) {
  const customerEmail = sanitizeEmail(order.client_email);
  if (!customerEmail) {
    throw new Error('Alamat email klien kosong. Mohon lengkapi email klien di data appointment.');
  }

  if (!isValidEmailFormat(customerEmail)) {
    throw new Error(`Format alamat email klien tidak valid: "${customerEmail}". Mohon cek kemungkinan salah ketik (typo).`);
  }

  const mailer = getMailerForOrder(order);
  const orderId = order.id;
  const clientName = order.client_name || 'Pelanggan';
  const pkgName = order.package_name || 'Paket Foto/Video';
  let editorName = order.editor_name || '-';
  if (editorName.includes(' || ')) {
    const parts = editorName.split(' || ');
    const fotoEd = parts[0] ? parts[0].trim() : '';
    const videoEd = parts[1] ? parts[1].trim() : '';
    const isFotoUpdate = status.includes('Update Foto:') || status.includes('Foto:');
    const isVideoUpdate = status.includes('Update Video:') || status.includes('Video:');

    if (isFotoUpdate && !isVideoUpdate) {
      editorName = fotoEd || '-';
    } else if (isVideoUpdate && !isFotoUpdate) {
      editorName = videoEd || '-';
    } else {
      editorName = `Foto: ${fotoEd || '-'} | Video: ${videoEd || '-'}`;
    }
  }

  let fileCode = order.file_code || '-';
  let driveLinkSeleksi = '';
  let tanggalPilihFoto = '';

  // Extract selection date and links from file_code if it is stored in combined format
  if (fileCode.includes(' || ')) {
    const parts = fileCode.split(' || ');
    fileCode = parts[0] || '-';
    // parts[1] is legacy driveLink (preview)
    driveLinkSeleksi = parts[2] || '';
    tanggalPilihFoto = parts[3] || '';
  }

  const linkHasilFoto = order.link_hasil_foto || order.linkHasilFoto || '';
  const linkHasilVideo = order.link_hasil_video || order.linkHasilVideo || '';

  const qty = order.qty || '-';

  const deadlineFotoVal = order.deadline || '';
  const deadlineVideoVal = order.deadline_video || order.deadlineVideo || '';

  const formattedDeadlineFoto = safeFormatDateID(deadlineFotoVal);
  const formattedDeadlineVideo = safeFormatDateID(deadlineVideoVal);

  // Fetch admin_whatsapp setting dynamically from settings table
  let adminWhatsapp = '6282363252291';
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*');
    if (settingsData && !settingsError) {
      const whatsappSetting = settingsData.find(s => s.key === 'team_wa_admin') || settingsData.find(s => s.key === 'admin_whatsapp');
      if (whatsappSetting && whatsappSetting.value) {
        let cleaned = whatsappSetting.value.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) {
          cleaned = '62' + cleaned.slice(1);
        }
        adminWhatsapp = cleaned;
      }
    }
  } catch (err) {
    console.error('[Email] Failed to fetch admin_whatsapp setting:', err);
  }

  let subject = '';
  let statusBadgeColor = '';
  let statusBadgeText = '';
  let statusDescription = '';
  let progressPercentage = '0%';

  // Default handling for dual status or string formatting
  let parsedStatus = status;
  const isFotoUpdate = status.includes('Update Foto:') || status.includes('Foto:');
  const isVideoUpdate = status.includes('Update Video:') || status.includes('Video:');

  if (status.includes('Update Foto:') || status.includes('Update Video:') || status.startsWith('Foto:') || status.startsWith('Video:')) {
    parsedStatus = status.split(': ')[1].trim();
    subject = `[Update ${status.includes('Foto') ? 'Foto' : 'Video'}] Progres Pesanan #${orderId} - LAPANBELAS.ID`;
  } else if (status.includes('Foto:') && status.includes('Video:')) {
    // Determine the most advanced status if both are passed
    if (status.includes('Selesai untuk Preview')) parsedStatus = 'Selesai untuk Preview';
    else if (status.includes('Proses Edit')) parsedStatus = 'Proses Edit';
    else if (status.includes('Antrian Pengerjaan')) parsedStatus = 'Antrian Pengerjaan';
    else if (status.includes('Menunggu Seleksi Foto')) parsedStatus = 'Menunggu Seleksi Foto';
    else if (status.includes('Done')) parsedStatus = 'Done';
    subject = `Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
  }

  switch (parsedStatus) {
    case 'Menunggu Seleksi Foto':
      subject = subject || `[Pilih Foto 📁] Link Drive Seleksi Foto Pesanan #${orderId} - LAPANBELAS.ID`;
      statusBadgeColor = '#8b5cf6'; // Purple
      statusBadgeText = 'Menunggu Seleksi Foto';
      statusDescription = `Seluruh foto mentah dari momen berharga Anda telah kami unggah ke Google Drive. Silakan buka link di bawah ini untuk memilih foto terbaik Anda yang ingin diproses edit, lalu informasikan kode file pilihannya kepada kami.`;
      progressPercentage = '15%';
      break;
    case 'Antrian Pengerjaan':
      statusBadgeColor = '#6b7280'; // Gray
      if (isFotoUpdate && !isVideoUpdate) {
        subject = `[Antrian Edit Foto] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Antrian Edit Foto';
        statusDescription = `Daftar foto pilihan Anda telah kami terima dan saat ini telah masuk ke dalam antrian pengerjaan oleh editor foto profesional kami untuk memberikan hasil terbaik.`;
      } else if (isVideoUpdate && !isFotoUpdate) {
        subject = `[Antrian Edit Video] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Antrian Edit Video';
        statusDescription = `File video Anda telah kami terima dan saat ini telah masuk ke dalam antrian pengerjaan oleh editor video profesional kami untuk memberikan hasil terbaik.`;
      } else {
        subject = subject || `[Antrian Pengerjaan] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Dalam Antrian Pengerjaan';
        statusDescription = `Foto/video Anda telah kami terima dan saat ini telah masuk ke dalam antrian pengerjaan oleh editor kami. Kami berkomitmen untuk memberikan hasil terbaik bagi momen berharga Anda.`;
      }
      progressPercentage = '25%';
      break;
    case 'Proses Edit':
      statusBadgeColor = '#3b82f6'; // Blue
      if (isFotoUpdate && !isVideoUpdate) {
        subject = `[Sedang Di-edit Foto] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Proses Edit Foto';
        statusDescription = `Kabar baik! Foto pilihan dari momen spesial Anda saat ini sedang dalam proses penyuntingan (editing) secara intensif oleh editor foto kami untuk memastikan hasil terbaik.`;
      } else if (isVideoUpdate && !isFotoUpdate) {
        subject = `[Sedang Di-edit Video] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Proses Edit Video';
        statusDescription = `Kabar baik! File video dari momen spesial Anda saat ini sedang dalam proses penyuntingan (editing) secara intensif oleh editor video kami untuk memastikan hasil terbaik.`;
      } else {
        subject = subject || `[Sedang Di-edit] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Sedang Diproses Edit';
        statusDescription = `Kabar baik! Foto/video dari momen spesial Anda saat ini sedang dalam proses penyuntingan (editing) secara intensif oleh editor profesional kami untuk memastikan kualitas terbaik.`;
      }
      progressPercentage = '50%';
      break;
    case 'Selesai untuk Preview':
      statusBadgeColor = '#f59e0b'; // Amber
      if (isFotoUpdate && !isVideoUpdate) {
        subject = `[Preview Foto Siap 🔥] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Preview Foto Siap';
        statusDescription = `Hore! Proses editing foto Anda telah selesai. Hasil pengerjaan saat ini sudah siap untuk Anda lihat dan pratinjau (preview). Silakan gunakan tombol di bawah ini untuk melihat hasil preview foto Anda.`;
      } else if (isVideoUpdate && !isFotoUpdate) {
        subject = `[Preview Video Siap 🔥] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Preview Video Siap';
        statusDescription = `Hore! Proses editing video Anda telah selesai. Hasil pengerjaan saat ini sudah siap untuk Anda lihat dan pratinjau (preview). Silakan gunakan tombol di bawah ini untuk melihat hasil preview video Anda.`;
      } else {
        subject = subject || `[Siap Preview 🔥] Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'Selesai & Siap Preview';
        statusDescription = `Hore! Proses editing foto/video Anda telah selesai. Hasil pengerjaan saat ini sudah siap untuk Anda lihat dan pratinjau (preview). Silakan gunakan tombol di bawah ini untuk melihat hasil preview dan melakukan konfirmasi.`;
      }
      progressPercentage = '85%';
      break;
    case 'Done':
      statusBadgeColor = '#10b981'; // Emerald Green
      if (isFotoUpdate && !isVideoUpdate) {
        subject = `[Foto Selesai Sepenuhnya 🎉] Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'FOTO DONE (100%)';
        statusDescription = `Yeay! Seluruh pengerjaan dan editing FOTO untuk pesanan Anda telah rampung 100% dengan sempurna. File final resolusi tinggi sudah siap Anda unduh dan bagikan. <br><br>Terima kasih banyak telah mempercayakan dokumentasi momen berharga Anda kepada jasa LAPANBELAS.ID! Kami tunggu kerja sama selanjutnya ya!`;
      } else if (isVideoUpdate && !isFotoUpdate) {
        subject = `[Video Selesai Sepenuhnya 🎉] Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'VIDEO DONE (100%)';
        statusDescription = `Yeay! Seluruh pengerjaan dan editing VIDEO untuk pesanan Anda telah rampung 100% dengan sempurna. File final sudah siap Anda unduh dan bagikan. <br><br>Terima kasih banyak telah menggunakan jasa LAPANBELAS.ID untuk mengabadikan momen spesial Anda! Sampai jumpa di project selanjutnya!`;
      } else {
        subject = subject || `[Selesai Sepenuhnya 🎉] Pesanan #${orderId} - LAPANBELAS.ID`;
        statusBadgeText = 'DONE (100%)';
        statusDescription = `Yeay! Seluruh pengerjaan (Foto & Video) untuk pesanan Anda telah rampung 100% dengan sempurna. File final siap digunakan. <br><br>Terima kasih banyak telah menggunakan jasa LAPANBELAS.ID! Semoga hasilnya memuaskan dan sampai jumpa di lain kesempatan!`;
      }
      progressPercentage = '100%';
      break;
    default:
      subject = subject || `Update Progres Pesanan #${orderId} - LAPANBELAS.ID`;
      statusBadgeColor = '#2a6742';
      statusBadgeText = status;
      statusDescription = `Progres pengerjaan untuk pesanan Anda #${orderId} telah diperbarui ke status: ${status}.`;
      progressPercentage = '50%';
  }

  let ctaHtml = '';
  if (status.includes('Done') || status.includes('DONE') || parsedStatus === 'Done') {
    if (linkHasilFoto || linkHasilVideo) {
      ctaHtml = `
        <div style="margin: 35px 0 10px 0; text-align: center;">
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px; font-weight: 500; line-height: 1.6;">
            Seluruh proses editing telah rampung. Anda dapat mengunduh file final melalui tautan di bawah ini:
          </p>
          ${linkHasilFoto ? `
          <div style="text-align: center; margin-bottom: 12px;">
            <a href="${linkHasilFoto}" target="_blank" style="display: inline-block; width: 85%; background-color: #059669; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(5,150,105,0.3); text-transform: uppercase;">
              📁 UNDUH FILE FINAL FOTO
            </a>
          </div>` : ''}
          ${linkHasilVideo ? `
          <div style="text-align: center; margin-bottom: 12px;">
            <a href="${linkHasilVideo}" target="_blank" style="display: inline-block; width: 85%; background-color: #059669; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(5,150,105,0.3); text-transform: uppercase;">
              🎬 UNDUH FILE FINAL VIDEO
            </a>
          </div>` : ''}
        </div>
      `;
    }
  } else if (status.includes('Selesai untuk Preview') && (linkHasilFoto || linkHasilVideo)) {
    const waText = encodeURIComponent("halo kak saya mau konfirmasi untuk hasil editan (foto/video) sudah sesuai , lanjutkan ke finishing");
    const waUrl = `https://wa.me/${adminWhatsapp}?text=${waText}`;

    ctaHtml = `
      <div style="margin: 35px 0 10px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-bottom: 20px; font-weight: 500; line-height: 1.6;">
          Silakan periksa hasil pengerjaan di Google Drive / YouTube Anda di bawah ini. Jika sudah sesuai, klik tombol konfirmasi untuk menghubungi kami via WhatsApp.
        </p>
        
        <!-- Google Drive Preview Button Foto -->
        ${linkHasilFoto ? `
        <div style="text-align: center; margin-bottom: 12px;">
          <a href="${linkHasilFoto}" target="_blank" style="display: inline-block; width: 85%; background-color: #2563eb; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(37,99,235,0.3); text-transform: uppercase;">
            📁 Buka Preview Foto
          </a>
        </div>
        ` : ''}

        <!-- Google Drive Preview Button Video -->
        ${linkHasilVideo ? `
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${linkHasilVideo}" target="_blank" style="display: inline-block; width: 85%; background-color: #9333ea; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(147,51,234,0.3); text-transform: uppercase;">
            🎬 Buka Preview Video
          </a>
        </div>
        ` : ''}
        
        <!-- WhatsApp Confirmation Button (Secondary Green) -->
        <div style="text-align: center;">
          <a href="${waUrl}" target="_blank" style="display: inline-block; width: 85%; background-color: #16a34a; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(22,163,74,0.3); text-transform: uppercase;">
            💬 Konfirmasi Hasil Sesuai (WhatsApp)
          </a>
        </div>
      </div>
    `;
  } else if (status.includes('Menunggu Seleksi Foto') && driveLinkSeleksi) {
    ctaHtml = `
      <div style="margin: 35px 0 10px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-bottom: 20px; font-weight: 500; line-height: 1.6;">
          Silakan pilih foto terbaik Anda melalui folder Google Drive di bawah ini. Jika sudah selesai memilih, mohon hubungi admin kami atau berikan daftar kode filenya.
        </p>
        
        <!-- Google Drive Seleksi Button (Primary Purple) -->
        <div style="text-align: center;">
          <a href="${driveLinkSeleksi}" target="_blank" style="display: inline-block; width: 85%; background-color: #8b5cf6; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(139,92,246,0.3); text-transform: uppercase;">
            📁 Buka Google Drive Pilih Foto
          </a>
        </div>
      </div>
    `;
  }

  if (!ctaHtml) {
    ctaHtml = `
      <div style="text-align: center; margin: 35px 0 10px 0;">
        <a href="${APP_URL}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 700; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(255,255,255,0.15);">
          MASUK KE DASHBOARD SAYA
        </a>
      </div>
    `;
  }

  let detailsRowsHtml = `
    <tr>
      <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">ID Pesanan</td>
      <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600; font-family: monospace;">#${orderId}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Pilihan Paket</td>
      <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${pkgName}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Editor Ditugaskan</td>
      <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${editorName}</td>
    </tr>
  `;

  if (isFotoUpdate || (!isFotoUpdate && !isVideoUpdate)) {
    detailsRowsHtml += `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Kode File Edit</td>
        <td style="padding: 6px 0; color: #e2e8f0; font-weight: 600; font-family: monospace;">${fileCode}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Jumlah File</td>
        <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${qty} file</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Estimasi Selesai Foto</td>
        <td style="padding: 6px 0; color: #f43f5e; font-weight: 600;">${formattedDeadlineFoto}</td>
      </tr>
    `;
  }

  if (isVideoUpdate || (!isFotoUpdate && !isVideoUpdate)) {
    detailsRowsHtml += `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Estimasi Selesai Video</td>
        <td style="padding: 6px 0; color: #f43f5e; font-weight: 600;">${formattedDeadlineVideo}</td>
      </tr>
    `;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
      
      <!-- Header Banner with Premium Gradient -->
      <div style="background: linear-gradient(135deg, #0c3832 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
        <p style="margin: 5px 0 0 0; font-size: 11px; color: #34d399; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo & Video Studio</p>
      </div>

      <!-- Main Content Container -->
      <div style="padding: 35px 25px;">
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600; text-align: left;">Halo ${clientName},</h2>
        <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">Kami ingin menginformasikan update terbaru mengenai pengerjaan dokumentasi Anda. Berikut adalah status progres terbaru:</p>
        
        <!-- Status Badge -->
        <div style="margin: 25px 0; text-align: center;">
          <div style="display: inline-block; background-color: ${statusBadgeColor}1a; border: 1px solid ${statusBadgeColor}4d; color: ${statusBadgeColor}; padding: 10px 24px; border-radius: 30px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            ${statusBadgeText}
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="margin: 25px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px; font-weight: 600;">
            <span>PROGRES PENGERJAAN</span>
            <span style="color: ${statusBadgeColor};">${progressPercentage}</span>
          </div>
          <div style="height: 6px; width: 100%; background-color: #1e293b; border-radius: 10px; overflow: hidden;">
            <div style="height: 100%; width: ${progressPercentage}; background-color: ${statusBadgeColor}; border-radius: 10px;"></div>
          </div>
        </div>

        <!-- Status Description -->
        <div style="background-color: rgba(255,255,255,0.02); border-left: 3px solid ${statusBadgeColor}; padding: 15px 20px; border-radius: 4px 12px 12px 4px; margin: 25px 0;">
          <p style="margin: 0; line-height: 1.6; color: #cbd5e1; font-size: 13.5px; font-style: italic;">"${statusDescription}"</p>
        </div>

        <!-- Details Card -->
        <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 30px 0 10px 0; border-bottom: 1px solid #1e293b; padding-bottom: 8px; letter-spacing: 0.5px;">RINCIAN PENUGASAN</h3>
        <div style="background-color: #070d0b; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${detailsRowsHtml}
          </table>
        </div>

        <!-- Call to Action -->
        ${ctaHtml}
      </div>

      <!-- Footer Info -->
      <div style="background-color: #070d0b; border-top: 1px solid #1e293b; padding: 25px 20px; text-align: center; color: #64748b; font-size: 11px;">
        <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 500;">Butuh bantuan atau pertanyaan? Hubungi tim support kami.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.</p>
      </div>
    </div>
  `;

  await mailer.transporter.sendMail({
    from: `"LAPANBELAS.ID" <${mailer.fromEmail}>`,
    to: customerEmail,
    subject: subject,
    html: htmlBody
  });
  console.log(`[Email] Sent progress (${status}) email to ${customerEmail}`);

  // Send WhatsApp Notification
  const clientPhone = order.client_phone || order.phone || order.customer_phone;
  const isDoneStatus = parsedStatus === 'Done' || status.includes('Done') || status.includes('DONE');

  if (isDoneStatus) {
    let itemType = 'Dokumentasi';
    if (isFotoUpdate && !isVideoUpdate) itemType = 'Foto';
    else if (isVideoUpdate && !isFotoUpdate) itemType = 'Video';
    else if (pkgName && /foto/i.test(pkgName) && !/video/i.test(pkgName)) itemType = 'Foto';
    else if (pkgName && /video/i.test(pkgName) && !/foto/i.test(pkgName)) itemType = 'Video';

    // 1. KIRIM NOTIFIKASI WA KE ADMIN (BUKAN KE KLIEN)
    const adminWaTarget = adminWhatsapp;
    if (adminWaTarget) {
      let adminMsg = `🔔 *PENGERJAAN EDITOR SELESAI (DONE)*\n\n` +
        `Halo Admin, editor *${editorName}* telah menyelesaikan pengerjaan *${itemType}* untuk pesanan berikut:\n\n` +
        `📋 *ID Pesanan:* #${orderId}\n` +
        `👤 *Nama Klien:* ${clientName}\n` +
        `📦 *Paket:* ${pkgName}\n`;

      if (linkHasilFoto && linkHasilVideo) {
        adminMsg += `📁 *Hasil Foto Final:* ${linkHasilFoto}\n` +
                    `🎥 *Hasil Video Final:* ${linkHasilVideo}\n`;
      } else if (linkHasilFoto) {
        adminMsg += `📁 *Hasil Foto Final:* ${linkHasilFoto}\n`;
      } else if (linkHasilVideo) {
        adminMsg += `🎥 *Hasil Video Final:* ${linkHasilVideo}\n`;
      } else if (order.drive_link) {
        adminMsg += `📁 *Akses File Final:* ${order.drive_link}\n`;
      }

      adminMsg += `\nSilakan periksa hasil pengerjaan di Dashboard Admin untuk proses finishing & serah terima selanjutnya. Terima kasih! 🙏✨`;

      sendWhatsAppNotification(adminWaTarget, adminMsg).catch(err => {
        console.error('[WhatsApp Admin] Gagal mengirim notifikasi editor selesai:', err);
      });
      console.log(`[WhatsApp Admin] Notifikasi editor selesai berhasil dipicu ke WA Admin: ${adminWaTarget}`);
    }
  } else if (clientPhone) {
    let waMsg = `Halo Kak *${clientName}*! 🎨\n\n` +
      `Ada update progres pengerjaan untuk pesanan *#${orderId}* (*${pkgName}*):\n\n` +
      `📊 *Status:* *${statusBadgeText || parsedStatus}* (${progressPercentage || '0%'})\n` +
      `_"${statusDescription.replace(/<br\s*\/?>/gi, '\n')}"_\n\n`;

    if (isFotoUpdate && !isVideoUpdate && formattedDeadlineFoto && formattedDeadlineFoto !== '-') {
      waMsg += `⏱️ *Estimasi Selesai Foto:* ${formattedDeadlineFoto}\n`;
    } else if (isVideoUpdate && !isFotoUpdate && formattedDeadlineVideo && formattedDeadlineVideo !== '-') {
      waMsg += `⏱️ *Estimasi Selesai Video:* ${formattedDeadlineVideo}\n`;
    } else {
      const estFoto = (formattedDeadlineFoto && formattedDeadlineFoto !== '-') ? formattedDeadlineFoto : '';
      const estVideo = (formattedDeadlineVideo && formattedDeadlineVideo !== '-') ? formattedDeadlineVideo : '';
      if (estFoto && estVideo) {
        waMsg += `⏱️ *Estimasi Selesai Foto:* ${estFoto}\n` +
                 `⏱️ *Estimasi Selesai Video:* ${estVideo}\n`;
      } else if (estFoto) {
        waMsg += `⏱️ *Estimasi Selesai:* ${estFoto}\n`;
      } else if (estVideo) {
        waMsg += `⏱️ *Estimasi Selesai:* ${estVideo}\n`;
      }
    }

    // Append links if applicable
    if (parsedStatus === 'Menunggu Seleksi Foto' || status.includes('Menunggu Seleksi Foto')) {
      waMsg += `\n🔗 *Portal Pilih Foto:* ${process.env.APP_URL || 'https://app.lapanbelas.id'}/pilih-foto/${orderId}\n`;
    } else if (parsedStatus === 'Selesai untuk Preview' || status.includes('Selesai untuk Preview')) {
      if (linkHasilFoto) waMsg += `\n🔗 *Preview Foto:* ${linkHasilFoto}\n`;
      if (linkHasilVideo) waMsg += `\n🔗 *Preview Video:* ${linkHasilVideo}\n`;
    }

    waMsg += `\nProses sedang dikerjakan dengan teliti oleh tim kami. Mohon ditunggu ya Kak! 🙏✨`;

    sendWhatsAppNotification(clientPhone, waMsg).catch(err => {
      console.error('[WhatsApp] Parallel progress notification failed:', err);
    });
  }
}

/**
 * Helper to send Photo Selection Follow-Up Reminder (Email & WA)
 * For clients who have not submitted their selected photos (tanggal_pilih_foto is null/empty)
 * after receiving the raw photo Google Drive link.
 */
async function sendPhotoSelectionReminder(order, options = {}) {
  const customerEmail = sanitizeEmail(order.client_email || order.email || order.customer_email);
  const clientName = order.client_name || order.name || 'Pelanggan';
  const clientPhone = order.client_phone || order.phone || order.customer_phone;
  const pkgName = order.package_name || order.pkg || (order.packages && order.packages.name) || 'Lapanbelas Package';
  const orderId = order.id || '-';
  const driveLink = options.driveLink || order.drive_link || order.driveLink || order.driveLinkSeleksi || '';
  const daysElapsed = options.daysElapsed || 30;

  // Fetch admin_whatsapp setting dynamically from settings table
  let adminWhatsapp = '6281234567890';
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*');
    if (settingsData && !settingsError) {
      const whatsappSetting = settingsData.find(s => s.key === 'admin_whatsapp');
      if (whatsappSetting && whatsappSetting.value) {
        let cleaned = whatsappSetting.value.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) {
          cleaned = '62' + cleaned.slice(1);
        }
        adminWhatsapp = cleaned;
      }
    }
  } catch (err) {
    console.error('[Email] Failed to fetch admin_whatsapp setting:', err);
  }

  const waAdminUrl = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(`Halo Admin Lapanbelas, saya ${clientName} (Order #${orderId}) ingin konfirmasi mengenai seleksi foto saya.`)}`;

  let emailSent = false;
  let waSent = false;

  // 1. Send Email
  if (customerEmail && isValidEmailFormat(customerEmail)) {
    const subject = `⏰ Pengingat: Pilihan Foto Album & Editing Anda Menunggu Diproses - ${clientName}`;
    
    // Choose appropriate transporter
    let activeTransporter = transporter;
    let fromEmail = process.env.EMAIL_USER;
    const pkgLower = (pkgName || '').toLowerCase();
    if (pkgLower.includes('studio') || ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgLower.includes(k))) {
      activeTransporter = transporterStudio;
      fromEmail = process.env.EMAIL_STUDIO_USER;
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4c1d95 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
          <p style="margin: 5px 0 0 0; font-size: 11px; color: #c084fc; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo & Video Studio</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 35px 25px;">
          <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Halo ${clientName},</h2>
          <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
            Semoga Anda selalu dalam keadaan sehat dan berbahagia! ✨
          </p>
          <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
            Kami dari tim <strong>LAPANBELAS.ID</strong> ingin mengingatkan kembali mengenai pesanan dokumentasi Anda untuk paket <strong>"${pkgName}"</strong> (No. Pesanan: <code style="color: #e2e8f0; font-family: monospace;">#${orderId}</code>).
          </p>
          
          <!-- Alert Box -->
          <div style="background-color: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 14px; padding: 18px 20px; margin: 25px 0;">
            <p style="margin: 0; font-size: 13.5px; color: #e9d5ff; line-height: 1.6;">
              📸 <strong>Foto Mentah Anda Menunggu Dipilih!</strong><br/>
              Agar album cetak eksklusif dan proses editing video Anda dapat segera kami masukkan ke dalam antrian pengerjaan, mohon luangkan waktu untuk memilih kode file foto terbaik Anda.
            </p>
          </div>

          <!-- Action Buttons -->
          ${driveLink ? `
          <div style="text-align: center; margin: 30px 0 15px 0;">
            <a href="${driveLink}" target="_blank" style="display: inline-block; width: 85%; background: linear-gradient(135deg, #9333ea, #7c3aed); color: #ffffff; font-weight: 700; padding: 16px 24px; border-radius: 30px; text-decoration: none; font-size: 14px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(147,51,234,0.4); text-transform: uppercase;">
              📁 Buka Google Drive Pilih Foto
            </a>
          </div>
          ` : ''}

          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${waAdminUrl}" target="_blank" style="display: inline-block; width: 85%; background-color: #16a34a; color: #ffffff; font-weight: 700; padding: 14px 20px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(22,163,74,0.3); text-transform: uppercase;">
              💬 Hubungi Admin via WhatsApp
            </a>
          </div>

          <!-- Tips Panduan -->
          <div style="background-color: #070d0b; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin: 25px 0;">
            <h4 style="margin: 0 0 10px 0; color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">💡 CARA MUDAH MEMILIH FOTO:</h4>
            <ol style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 12.5px; line-height: 1.7;">
              <li>Buka folder Google Drive di atas.</li>
              <li>Catat nomor/kode file foto yang ingin diedit & dicetak (contoh: <code>IMG_0012, IMG_0045, IMG_0099</code>).</li>
              <li>Kirimkan daftar kode file tersebut ke admin WhatsApp kami atau melalui portal klien.</li>
            </ol>
          </div>

          <p style="line-height: 1.6; color: #64748b; font-size: 12.5px; text-align: center; margin-top: 25px;">
            Jika Anda mengalami kendala saat membuka link Google Drive atau memerlukan bantuan, jangan ragu untuk membalas email ini atau menghubungi admin kami.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #030706; padding: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #64748b;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await activeTransporter.sendMail({
        from: `"LAPANBELAS.ID" <${fromEmail}>`,
        to: customerEmail,
        subject: subject,
        html: htmlBody
      });
      emailSent = true;
      console.log(`[Photo Follow-Up] Sent reminder email to ${customerEmail} for order #${orderId}`);
    } catch (mailErr) {
      console.error(`[Photo Follow-Up] Failed to send email to ${customerEmail}:`, mailErr.message);
    }
  }

  // 2. Send WhatsApp Notification
  if (clientPhone) {
    const portalUrl = `${process.env.APP_URL || 'https://app.lapanbelas.id'}/pilih-foto/${orderId}`;
    let waMsg = `Halo Kak *${clientName}*! 📸\n\n` +
      `Mengingatkan kembali untuk pesanan *#${orderId}* (*${pkgName}*), saat ini kami masih menunggu daftar foto pilihan dari Kakak ya.\n\n` +
      `Pilih foto favorit Kakak langsung melalui link portal berikut:\n` +
      `👉 ${portalUrl}\n\n` +
      `Semakin cepat Kakak memilih foto, semakin cepat pula antrian editingnya siap kami proses! ✨\n\n` +
      `Jika ada kendala saat memilih foto, langsung kabari kami ya Kak. Terima kasih! 🙏`;

    try {
      waSent = await sendWhatsAppNotification(clientPhone, waMsg);
      if (waSent) {
        console.log(`[Photo Follow-Up] Sent WhatsApp reminder to ${clientPhone} for order #${orderId}`);
      }
    } catch (waErr) {
      console.error(`[Photo Follow-Up] Failed to send WhatsApp to ${clientPhone}:`, waErr.message);
    }
  }

  return { success: emailSent || waSent, emailSent, waSent };
}

/**
 * Helper to send Anniversary Greetings (Email & WA)
 */
async function sendAnniversaryGreeting(order, yearsPassed) {
  const customerEmail = sanitizeEmail(order.client_email || order.email || order.customer_email);
  const clientName = order.client_name || order.name || 'Pelanggan';
  const clientPhone = order.client_phone || order.phone || order.customer_phone;
  const pkgName = order.package_name || (order.packages && order.packages.name) || 'Lapanbelas Package';

  const subject = `Happy Anniversary dari Lapanbelas Studio! 🎉`;
  const mailer = getMailerForOrder(order);
  
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #fafafa;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6; margin-bottom: 20px;">
        <h1 style="color: #6d28d9; margin: 0; font-size: 24px;">Happy Anniversary! 💍✨</h1>
      </div>
      <div style="padding: 0 10px;">
        <p style="font-size: 16px; margin-bottom: 15px;">Halo <strong>Kak ${clientName}</strong>,</p>
        <p style="font-size: 15px; margin-bottom: 15px;">
          Tidak terasa sudah <strong>${yearsPassed} tahun</strong> berlalu sejak momen spesial pernikahan Kakak yang kami abadikan dalam <em>${pkgName}</em>.
        </p>
        <p style="font-size: 15px; margin-bottom: 20px; color: #4b5563; font-style: italic;">
          "Kami dari keluarga besar Lapanbelas Studio turut berbahagia dan mendoakan agar pernikahan Kakak selalu dipenuhi cinta, kebahagiaan, dan keberkahan setiap harinya."
        </p>
        <p style="font-size: 15px; margin-bottom: 15px;">
          Terima kasih telah mengizinkan kami menjadi bagian dari cerita terindah tersebut. Semoga kenangan yang kami tangkap terus membawa senyum bagi Kakak sekeluarga.
        </p>
        <br>
        <p style="font-size: 15px; font-weight: bold; margin-bottom: 5px; color: #111;">Salam Hangat,</p>
        <p style="font-size: 15px; color: #6b7280; margin: 0;">Tim Lapanbelas Studio</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"LAPANBELAS.ID" <${mailer.fromEmail}>`,
    to: customerEmail,
    subject: subject,
    html: htmlBody
  };

  try {
    if (customerEmail) {
      await mailer.transporter.sendMail(mailOptions);
      console.log(`[Email] Sent Anniversary email to ${customerEmail}`);
    }

    if (clientPhone) {
      const waMsg = 
        `*LAPANBELAS.ID - HAPPY ANNIVERSARY!* 🎉💍\n\n` +
        `Halo Kak *${clientName}*,\n\n` +
        `Tidak terasa sudah *${yearsPassed} tahun* berlalu sejak momen spesial pernikahan Kakak.\n\n` +
        `Kami dari keluarga besar Lapanbelas Studio turut berbahagia dan mendoakan agar pernikahan Kakak selalu dipenuhi cinta, kebahagiaan, dan keberkahan setiap harinya. ✨\n\n` +
        `Terima kasih telah mengizinkan kami mengabadikan cerita terindah tersebut.\n\n` +
        `Salam Hangat,\n*Tim Lapanbelas Studio*`;

      await sendWhatsAppNotification(clientPhone, waMsg);
    }
  } catch (err) {
    console.error('[Anniversary System] Failed to send anniversary greeting:', err);
  }
}

/**
 * API Route: Publicly accessible Invoice PDF (Zero Storage)
 * Generates PDF on the fly so Kirimi.id can download it without consuming Supabase storage.
 */
app.get('/api/public/invoice/:id.pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: order, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) return res.status(404).send('Invoice Not Found');

    const pdfBuffer = await generateInvoicePDF(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[Public Invoice PDF Error]:', err);
    res.status(500).send('Error generating PDF');
  }
});

/**
 * API Route: Send Invoice Email from Frontend
 */
app.post('/api/send-invoice-email', requireAuth, async (req, res) => {
  const { type, order } = req.body;
  if (!order || !type || !order.id) return res.status(400).json({ error: 'Invalid payload' });

  try {
    // Fetch full order data - packages(*) join won't work because package_name is text, not FK
    const { data: fullOrder, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', order.id)
      .single();

    if (error || !fullOrder) {
      return res.status(404).json({ error: 'Order not found in database' });
    }

    const orderToUse = fullOrder;

    // Manually attach package details by matching package_name text
    if (orderToUse.package_name && !orderToUse.packages) {
      const { data: pkgData } = await supabase
        .from('packages')
        .select('*')
        .eq('title', orderToUse.package_name)
        .single();
      if (pkgData) {
        orderToUse.packages = pkgData;
      }
    }

    await sendInvoiceEmail(type, orderToUse);
    res.json({ success: true });
  } catch (error) {
    console.error('[Email] Failed to send email via API:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API Route: Test Email Integration (Utility for Go-Live)
 */
app.get('/api/test-email', async (req, res) => {
  const recipient = req.query.to || process.env.EMAIL_USER;
  if (!recipient) {
    return res.status(400).json({
      success: false,
      error: 'Missing recipient email. Please provide ?to=your-email@example.com in the URL.'
    });
  }

  console.log(`[Email Test] Initiating SMTP connection test to: ${recipient}`);

  try {
    // 1. Verify transporter first
    await transporter.verify();
    console.log('[Email Test] SMTP Connection Verified Successfully!');

    // 2. Send test email
    const info = await transporter.sendMail({
      from: `"18Studio Test" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: 'Uji Coba Integrasi Email 18Studio (LAPANBELAS.ID) - Sukses!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #2a6742; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LAPANBELAS.ID</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff; color: #333333;">
            <h2 style="margin-top: 0; color: #10b981; text-align: center;">🎉 SMTP Email Berhasil Terkoneksi!</h2>
            <p style="line-height: 1.6; font-size: 14px; color: #4b5563;">
              Halo tim <strong>LAPANBELAS.ID</strong>,
            </p>
            <p style="line-height: 1.6; font-size: 14px; color: #4b5563;">
              Selamat! Integrasi pengiriman email Nodemailer dengan SMTP Gmail menggunakan sandi aplikasi Google telah **aktif dan bekerja dengan sempurna**.
            </p>
            <div style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 4px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; font-size: 13px; color: #1f2937;"><strong>Status Koneksi SMTP:</strong> Terverifikasi (OK)</p>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #1f2937;"><strong>Waktu Pengujian:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #1f2937;"><strong>Pengirim (EMAIL_USER):</strong> ${process.env.EMAIL_USER}</p>
            </div>
            <p style="line-height: 1.6; font-size: 14px; color: #4b5563; text-align: center;">
              Kini sistem siap mengirimkan invoice PDF otomatis ke klien Anda saat melakukan transaksi riil!
            </p>
          </div>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
            &copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.
          </div>
        </div>
      `
    });

    console.log(`[Email Test] Test email successfully sent. MessageID: ${info.messageId}`);
    if (info.simulated) {
      return res.json({
        success: true,
        simulated: true,
        message: `[Simulasi] Email uji coba berhasil disimulasikan ke ${recipient} (Kredensial SMTP belum diatur di .env).`,
        smtp_status: 'Mode Simulasi (Local/Sandbox)',
        smtp_config: {
          host: 'smtp.gmail.com',
          user: process.env.EMAIL_USER || 'Belum Dikonfigurasi'
        },
        message_id: info.messageId
      });
    }

    res.json({
      success: true,
      message: `Email uji coba berhasil dikirim ke ${recipient}! Silakan periksa inbox atau folder spam Anda.`,
      smtp_status: 'Terhubung & Aktif',
      smtp_config: {
        host: 'smtp.gmail.com',
        user: process.env.EMAIL_USER
      },
      message_id: info.messageId
    });

  } catch (err) {
    console.error('[Email Test] SMTP Connection/Send Failed:', err);
    res.status(500).json({
      success: false,
      error: 'Gagal mengirim email uji coba.',
      error_message: err.message,
      error_code: err.code,
      smtp_config: {
        host: 'smtp.gmail.com',
        user: process.env.EMAIL_USER || 'Belum Dikonfigurasi'
      },
      recommendation: 'Pastikan EMAIL_USER dan EMAIL_PASS (Google App Password) di environment variable sudah benar, dan verifikasi 2 langkah di Google Account Anda aktif.'
    });
  }
});

/**
 * API Route: Test WhatsApp Integration (Utility for Go-Live)
 */
app.get('/api/test-wa', async (req, res) => {
  const recipient = req.query.to;
  const message = req.query.msg || 'Halo! Ini adalah pesan uji coba integrasi WhatsApp LAPANBELAS.ID menggunakan Kirimi.id. Sukses! 🎉';

  if (!recipient) {
    return res.status(400).json({
      success: false,
      error: 'Missing recipient number. Please provide ?to=62812xxxxxxx in the URL query.'
    });
  }

  console.log(`[WhatsApp Test] Initiating WhatsApp test to: ${recipient}`);

  try {
    const success = await sendWhatsAppNotification(recipient, message);
    if (success) {
      res.json({
        success: true,
        message: `Pesan uji coba WhatsApp berhasil dikirim ke nomor ${recipient}!`,
        config: {
          user_code: process.env.KIRIMI_USER_CODE ? 'Dikonfigurasi' : 'Belum Dikonfigurasi',
          secret: process.env.KIRIMI_SECRET ? 'Dikonfigurasi' : 'Belum Dikonfigurasi',
          device_id: process.env.KIRIMI_DEVICE_ID || 'Belum Dikonfigurasi'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Gagal mengirim pesan uji coba WhatsApp. Silakan periksa log server untuk detail kesalahan.',
        config: {
          user_code: process.env.KIRIMI_USER_CODE ? 'Dikonfigurasi' : 'Belum Dikonfigurasi',
          secret: process.env.KIRIMI_SECRET ? 'Dikonfigurasi' : 'Belum Dikonfigurasi',
          device_id: process.env.KIRIMI_DEVICE_ID || 'Belum Dikonfigurasi'
        }
      });
    }
  } catch (err) {
    console.error('[WhatsApp Test] Execution Failed:', err);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan sistem saat mencoba mengirim WhatsApp.',
      error_message: err.message
    });
  }
});

/**
 * API Route: View/Download Invoice PDF directly

 */
app.get('/api/invoice-pdf/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const { data: order, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).send('Invoice not found');
    }

    if (order.package_name) {
      const { data: pkgData } = await supabase.from('packages').select('*').eq('title', order.package_name).single();
      if (pkgData) {
        order.packages = pkgData;
      }
    }

    const pdfBuffer = await generateInvoicePDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF for direct download:', err);
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * API Route: View/Download Fitting PDF directly
 */
app.get('/api/fitting-pdf/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    let order;
    if (orderId && orderId.startsWith('BK-TEST')) {
      order = {
        id: orderId,
        client_name: 'Nazla Salsabila Test',
        client_phone: '081234567890',
        event_date: '2026-08-20',
        additional_notes: `[DIVISI]: Lady Makeup
[JADWAL FITTING]: 2026-06-15
[STATUS FITTING]: Selesai Fitting
[HASIL FITTING]: Kebaya Akad Rosegold & Siger Sunda
[FITTING CHECKLIST]: {"busana":"Kebaya Akad Rosegold Premium","aksesoris":"Siger Sunda Silver, Melati, Bros","catatanRias":"Makeup flawless dewy look, request softlens grey","ld":"88 cm","pinggang":"68 cm","pinggul":"92 cm","tinggi":"162 cm"}`
      };
    } else {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        console.error('Error fetching fitting sheet:', error);
        return res.status(404).send('Fitting sheet not found');
      }
      order = data;
    }

    const pdfBuffer = await generateFittingPDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="fitting-${orderId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating fitting PDF:', err);
    return res.status(500).send('Internal Server Error');
  }
});

app.post('/api/fitting-pdf-generate', requireAuth, async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.id) return res.status(400).send('Invalid appointment data');
    const pdfBuffer = await generateFittingPDF(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="fitting-${order.id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating fitting PDF via POST:', err);
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * API Route: View/Download Decor PDF directly
 */
app.get('/api/decor-pdf/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    let order;
    if (orderId && orderId.startsWith('BK-TEST')) {
      order = {
        id: orderId,
        client_name: 'Tanta Sitepu Test',
        client_phone: '081234567890',
        event_date: '2026-06-06',
        additional_notes: `[DIVISI]: Lapanbelas Dekorasi
[JADWAL SURVEI]: 2026-06-03
[JADWAL PEMASANGAN]: 2026-06-04 s/d 2026-06-05
[STATUS FITTING]: Selesai di survei
[HASIL FITTING]: Akses jalan sempit, butuh mobil kecil`
      };
    } else {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        return res.status(404).send('Logistics sheet not found');
      }
      order = data;
    }

    const pdfBuffer = await generateDecorPDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="decor-${orderId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating decor PDF:', err);
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * API Route: Get feedback appointment details
 */
app.get('/api/feedback-appointment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const { data: apt, error } = await supabase
      .from('appointments')
      .select('id, client_name, client_email, package_name, additional_notes')
      .eq('id', orderId)
      .single();

    if (error || !apt) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    // Check if feedback already submitted
    const { data: existingFeedback } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('appointment_id', orderId)
      .maybeSingle();

    let isStudio = false;
    let hasVideo = false;

    // Fetch package details for 100% accurate classification
    if (apt.package_name) {
      const { data: pkgData } = await supabase
        .from('packages')
        .select('category, description')
        .eq('title', apt.package_name)
        .maybeSingle();

      if (pkgData) {
        const catLower = (pkgData.category || '').toLowerCase();
        const descLower = (pkgData.description || '').toLowerCase();
        if (catLower.includes('studio') || catLower.includes('self') || catLower.includes('family') || catLower.includes('wisuda') || catLower.includes('single') || catLower.includes('group')) {
          isStudio = true;
        }
        if (descLower.includes('video') || descLower.includes('cinema') || descLower.includes('videographer')) {
          hasVideo = true;
        }
      }
    }

    const pkgNameLower = (apt.package_name || '').toLowerCase();
    if (!isStudio && (pkgNameLower.includes('studio') || pkgNameLower.includes('self') || pkgNameLower.includes('pas foto') || pkgNameLower.includes('wisuda') || pkgNameLower.includes('sweet'))) {
      isStudio = true;
    }
    if (!hasVideo && (pkgNameLower.includes('video') || pkgNameLower.includes('platinum') || pkgNameLower.includes('cinematic') || ((apt.additional_notes || '').toLowerCase().includes('video')))) {
      hasVideo = true;
    }

    res.json({
      success: true,
      alreadySubmitted: !!existingFeedback,
      data: {
        ...apt,
        isStudio,
        hasVideo,
        hasPhoto: true
      }
    });
  } catch (err) {
    console.error('[API Feedback] Error fetching appointment:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * API Route: Submit client feedback
 */
app.post('/api/submit-feedback', async (req, res) => {
  const {
    appointment_id,
    client_name,
    client_email,
    rating_admin,
    rating_photographer,
    rating_videographer,
    rating_editor,
    rating_overall,
    comments
  } = req.body;

  try {
    if (!appointment_id) {
      return res.status(400).json({ error: 'Missing appointment ID' });
    }

    // 1. Verify appointment exists
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();
    
    if (aptError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // 2. Prevent duplicate feedback for the same appointment
    const { data: existing, error: existError } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('appointment_id', appointment_id)
      .maybeSingle();
      
    if (existing) {
      return res.status(409).json({ error: 'Feedback already submitted for this appointment' });
    }

    let finalComments = comments || '';
    if (rating_videographer) {
      finalComments = `[Rating Videografer: ${rating_videographer}★] ${finalComments}`.trim();
    }

    const { data, error } = await supabase
      .from('feedbacks')
      .insert([{
        appointment_id,
        client_name: client_name || appointment.client_name,
        client_email: client_email || appointment.client_email,
        rating_admin: rating_admin || 5,
        rating_photographer: rating_photographer || 5,
        rating_editor: rating_editor || 5,
        rating_overall: rating_overall || 5,
        comments: finalComments
      }]);

    if (error) throw error;

    // Send WhatsApp notification in background to each crew member
    (async () => {
      try {
        const { data: settingsData } = await supabase.from('settings').select('*');
        const settingsMap = {};
        if (settingsData) {
          settingsData.forEach(s => { settingsMap[s.key] = s.value; });
        }

        const pkgName = appointment.package_name || 'Paket Foto/Video';
        const pkgNameLower = pkgName.toLowerCase();
        const isStudio = pkgNameLower.includes('studio') || pkgNameLower.includes('self photo') || pkgNameLower.includes('pas foto') || pkgNameLower.includes('wisuda');
        const hasVideo = !!rating_videographer || pkgNameLower.includes('video') || pkgNameLower.includes('platinum') || pkgNameLower.includes('cinematic');

        // A. Notifikasi ke Admin
        const adminWa = settingsMap['team_wa_admin'] || settingsMap['admin_whatsapp'] || '6282363252291';
        let adminSummaryMsg = `*LAPANBELAS.ID - ULASAN BARU MASUK* ⭐\n\n` +
          `• *Klien:* *${appointment.client_name || client_name}*\n` +
          `• *Pesanan:* *#${appointment_id}* (${pkgName})\n\n` +
          `⭐ *Rincian Penilaian:* \n` +
          `• Pelayanan Admin: *${rating_admin || 5}/5*\n` +
          `• Fotografer (FG): *${rating_photographer || 5}/5*\n`;
        if (hasVideo && rating_videographer) {
          adminSummaryMsg += `• Videografer (VG): *${rating_videographer}/5*\n`;
        }
        adminSummaryMsg += `• Kualitas Editing: *${rating_editor || 5}/5*\n` +
          `• Pengalaman Keseluruhan: *${rating_overall || 5}/5*\n\n` +
          `💬 *Masukan & Kritik Klien:* \n` +
          `_"${comments || 'Tidak ada masukan tambahan'}"_\n\n` +
          `Terima kasih! Pantau seluruh ulasan di dashboard admin. 🙏`;

        sendWhatsAppNotification(adminWa, adminSummaryMsg).catch(e => console.error('[Feedback WA Admin Error]', e));

        // B. Notifikasi ke FG (Studio atau Wedding)
        const fgRaw = isStudio
          ? (settingsMap['team_wa_fg_studio'] || '6285262227876,6281263368230')
          : (settingsMap['team_wa_fg_wedding'] || '628113178579');
        const fgNumbers = fgRaw.split(',').map(n => n.trim()).filter(Boolean);

        const fgMsg = `Halo Tim Fotografer (FG)! 📸✨\n\n` +
          `Ada ulasan kepuasan dari klien *${appointment.client_name || client_name}* untuk pesanan *#${appointment_id}* (*${pkgName}*):\n\n` +
          `⭐ *Nilai Kinerja FG:* *${rating_photographer || 5} / 5*\n` +
          (comments ? `💬 *Catatan Klien:* _"${comments}"_\n\n` : `\n`) +
          `Terima kasih atas kerja kerasmu dan terus pertahankan karya terbaik di setiap jepretan! 🙏❤️`;

        for (const num of fgNumbers) {
          sendWhatsAppNotification(num, fgMsg).catch(e => console.error('[Feedback WA FG Error]', e));
        }

        // C. Notifikasi ke VG & Editor Video (jika paket video)
        if (hasVideo) {
          const vgNumber = settingsMap['team_wa_vg_editor'] || '6281362132800';
          const vgScore = rating_videographer || rating_editor || 5;
          const vgMsg = `Halo Tim Videografer & Editor Video! 🎥✨\n\n` +
            `Ada ulasan kepuasan dari klien *${appointment.client_name || client_name}* untuk pesanan *#${appointment_id}* (*${pkgName}*):\n\n` +
            `⭐ *Nilai Kinerja Video & Editing:* *${vgScore} / 5*\n` +
            (comments ? `💬 *Catatan Klien:* _"${comments}"_\n\n` : `\n`) +
            `Terima kasih atas dedikasimu dan terus ciptakan visual cinematic yang memukau! 🙏🎬`;

          sendWhatsAppNotification(vgNumber, vgMsg).catch(e => console.error('[Feedback WA VG Error]', e));
        }

        // D. Notifikasi ke Editor Studio (jika paket studio)
        if (isStudio) {
          const editorStudioNumber = settingsMap['team_wa_editor_studio'] || '62895630508478';
          const edMsg = `Halo Tim Editor Studio! 🎨✨\n\n` +
            `Ada ulasan hasil editing foto dari klien *${appointment.client_name || client_name}* untuk pesanan *#${appointment_id}* (*${pkgName}*):\n\n` +
            `⭐ *Nilai Kualitas Edit Foto:* *${rating_editor || 5} / 5*\n` +
            (comments ? `💬 *Catatan Klien:* _"${comments}"_\n\n` : `\n`) +
            `Terima kasih atas ketelitianmu dan terus berikan sentuhan terbaik di setiap frame! 🙏✨`;

          sendWhatsAppNotification(editorStudioNumber, edMsg).catch(e => console.error('[Feedback WA Editor Studio Error]', e));
        }
      } catch (waErr) {
        console.error('[Feedback Notification Error]', waErr);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    console.error('[API Feedback] Error submitting feedback:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * API Route: Send Progress Email from Frontend
 */
app.post('/api/send-progress-email', requireAuth, async (req, res) => {
  const { status, order } = req.body;
  if (!order || !status) return res.status(400).json({ error: 'Invalid payload' });

  try {
    // Fetch full order data to accurately identify package division
    const { data: fullOrder } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', order.id)
      .single();

    const orderToUse = fullOrder ? { ...order, ...fullOrder } : order;

    // Manually attach package details by matching package_name text
    if (orderToUse.package_name && !orderToUse.packages) {
      const { data: pkgData } = await supabase
        .from('packages')
        .select('*')
        .eq('title', orderToUse.package_name)
        .single();
      if (pkgData) {
        orderToUse.packages = pkgData;
      }
    }

    await sendProgressEmail(status, orderToUse);
    res.json({ success: true });
  } catch (error) {
    console.error('[Email] Failed to send progress email via API:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Function: Send Drive Link Email
 * Kirim link Google Drive seleksi foto + panduan + estimasi pengerjaan ke klien
 */
async function sendDriveLinkEmail(order) {
  const customerEmail = (order.client_email || '').trim();
  if (!customerEmail) return;

  const orderId = order.id;
  const clientName = order.client_name || 'Pelanggan';
  const pkgName = order.package_name || 'Paket Foto/Video';
  const driveLink = order.drive_link || '';
  const estimasiHari = order.estimasi_hari || 30;

  const subject = `[📁 Pilih Foto Anda] Link Google Drive Siap - Pesanan #${orderId} LAPANBELAS.ID`;

  // Fetch full order data to accurately identify package division
  let orderToUse = { ...order };
  try {
    const { data: fullOrder } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', orderId)
      .single();
    if (fullOrder) {
      orderToUse = { ...orderToUse, ...fullOrder };
    }
  } catch (dbErr) {
    console.error('[Email] DB fetch error in sendDriveLinkEmail:', dbErr);
  }

  // Manually attach package details to orderToUse
  if (orderToUse.package_name && !orderToUse.packages) {
    try {
      const { data: pkgData } = await supabase
        .from('packages')
        .select('*')
        .eq('title', orderToUse.package_name)
        .single();
      if (pkgData) {
        orderToUse.packages = pkgData;
      }
    } catch (pkgErr) {
      console.error('[Email] Package fetch error in sendDriveLinkEmail:', pkgErr);
    }
  }

  const mailer = getMailerForOrder(orderToUse);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0c3832 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
        <p style="margin: 5px 0 0 0; font-size: 11px; color: #34d399; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo &amp; Video Studio</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 35px 25px;">
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Halo ${clientName},</h2>
        <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
          Kabar bahagia! Seluruh foto mentah dari momen berharga Anda telah berhasil diunggah ke Google Drive kami dan kini sudah siap untuk Anda buka.
        </p>
        <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
          Silakan buka link di bawah ini dan pilih foto-foto terbaik Anda yang ingin diproses editing oleh tim editor profesional kami.
        </p>

        <!-- Drive Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/pilih-foto/${orderId}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; font-weight: 700; padding: 16px 40px; border-radius: 30px; text-decoration: none; font-size: 14px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(124,58,237,0.4); text-transform: uppercase;">
            ✨ Masuk ke Portal Pemilihan Foto
          </a>
        </div>
        
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 10px;">
          (Atau ingin download mentahan aslinya? <a href="${driveLink}" target="_blank" style="color: #a78bfa; text-decoration: underline;">Klik di sini</a>)
        </p>

        <!-- Order Info -->
        <div style="background-color: #070d0b; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 40%;">ID Pesanan</td>
              <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600; font-family: monospace;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Paket</td>
              <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${pkgName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Estimasi Pengerjaan</td>
              <td style="padding: 6px 0; color: #a78bfa; font-weight: 700;">${estimasiHari === '3-7' ? '3-7 hari' : `Maks. ${estimasiHari} hari`}</td>
            </tr>
            ${Array.isArray(order.sessions_config) && order.sessions_config.length > 1 ? `
            <tr>
              <td style="padding: 8px 0 4px 0; color: #64748b; font-weight: 500; vertical-align: top;">Sesi &amp; Kuota Foto</td>
              <td style="padding: 8px 0 4px 0; color: #f1f5f9; font-size: 12px; line-height: 1.6;">
                ${order.sessions_config.map((s, i) => `<div style="margin-bottom: 3px;">• <strong>${s.title}</strong>: <span style="color: #34d399; font-weight: bold;">${s.limit} Foto</span> ${s.subtitle ? `<span style="color: #94a3b8;">(${s.subtitle})</span>` : ''}</div>`).join('')}
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Step-by-Step Guide -->
        <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 30px 0 15px 0; border-bottom: 1px solid #1e293b; padding-bottom: 8px; letter-spacing: 0.5px;">📋 CARA MEMILIH FOTO</h3>
        <div style="space-y: 12px;">
          
          <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 14px;">
            <div style="min-width: 32px; height: 32px; background-color: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; text-align: center; line-height: 32px;">1</div>
            <div>
              <p style="margin: 0 0 4px 0; color: #f1f5f9; font-weight: 600; font-size: 13px;">Buka Portal Klien</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">Klik tombol ungu di atas untuk masuk ke portal cerdas kami. Anda bisa melihat preview foto langsung di sana.</p>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 14px;">
            <div style="min-width: 32px; height: 32px; background-color: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; text-align: center; line-height: 32px;">2</div>
            <div>
              <p style="margin: 0 0 4px 0; color: #f1f5f9; font-weight: 600; font-size: 13px;">Pilih Foto Favorit Anda</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">Pilih foto-foto terbaik sesuai jumlah yang termasuk dalam paket Anda dengan cara mengkliknya. Sistem akan menghitung otomatis.</p>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 14px;">
            <div style="min-width: 32px; height: 32px; background-color: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; text-align: center; line-height: 32px;">3</div>
            <div>
              <p style="margin: 0 0 4px 0; color: #f1f5f9; font-weight: 600; font-size: 13px;">Klik Selesai</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">Setelah kuota foto Anda terpenuhi, cukup klik tombol Selesai di bagian bawah portal. Sistem kami akan otomatis memberi tahu tim editor!</p>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 14px;">
            <div style="min-width: 32px; height: 32px; background-color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; text-align: center; line-height: 32px;">✓</div>
            <div>
              <p style="margin: 0 0 4px 0; color: #f1f5f9; font-weight: 600; font-size: 13px;">Proses Editing Dimulai</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">Setelah kami menerima daftar foto pilihan Anda, proses editing akan segera dimulai. Estimasi selesai maksimal <strong style="color: #a78bfa;">${estimasiHari} hari</strong> terhitung dari tanggal Anda selesai memilih foto.</p>
            </div>
          </div>
        </div>

        <!-- Important Note -->
        <div style="background-color: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 12px; padding: 16px; margin: 25px 0;">
          <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.6;">
            ⏱️ <strong>Catatan Penting:</strong> Waktu estimasi pengerjaan dihitung mulai dari tanggal Anda <em>selesai mengirimkan daftar foto pilihan</em>. Semakin cepat Anda memilih foto, semakin cepat pula hasil editingnya siap!
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #070d0b; border-top: 1px solid #1e293b; padding: 25px 20px; text-align: center; color: #64748b; font-size: 11px;">
        <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 500;">Ada pertanyaan? Hubungi admin kami melalui WhatsApp.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.</p>
      </div>
    </div>
  `;

  await mailer.transporter.sendMail({
    from: `"LAPANBELAS.ID" <${mailer.fromEmail}>`,
    to: customerEmail,
    subject: subject,
    html: htmlBody
  });
  console.log(`[Email] Sent drive link email via ${mailer.fromEmail} to ${customerEmail} for order ${orderId}`);

  // Send WhatsApp Notification in parallel
  const clientPhone = orderToUse.client_phone || orderToUse.phone || orderToUse.customer_phone;
  if (clientPhone) {
    const portalUrl = `${process.env.APP_URL || 'https://app.lapanbelas.id'}/pilih-foto/${orderId}`;
    const waMsg = `*LAPANBELAS.ID - LINK GOOGLE DRIVE SELEKSI FOTO* 📁\n\n` +
      `Halo *${clientName}*,\n` +
      `Kabar bahagia! Seluruh foto mentah dari momen berharga Anda telah berhasil diunggah ke Google Drive kami.\n\n` +
      `Silakan masuk ke portal pemilihan foto pintar kami untuk memilih foto-foto terbaik yang ingin diproses editing:\n` +
      `🔗 *Portal Pilih Foto:* ${portalUrl}\n\n` +
      `*Rincian Pesanan:* \n` +
      `• *ID Pesanan:* #${orderId}\n` +
      `• *Pilihan Paket:* ${pkgName}\n` +
      `• *Estimasi Pengerjaan:* ${estimasiHari === '3-7' ? '3-7 hari' : `Maks. ${estimasiHari} hari`} (setelah selesai pilih foto)\n\n` +
      `*Langkah Memilih Foto:* \n` +
      `1. Masuk ke link portal pilih foto di atas.\n` +
      `2. Klik foto-foto favorit Anda sesuai kuota paket.\n` +
      `3. Setelah selesai, klik tombol *Selesai* di bagian bawah portal.\n\n` +
      `⏱️ *Catatan:* Estimasi pengerjaan dihitung sejak Anda menyelesaikan pemilihan foto. Semakin cepat Anda memilih, semakin cepat pula hasil editingnya siap!\n\n` +
      `Terima kasih! 🙏`;

    sendWhatsAppNotification(clientPhone, waMsg).catch(err => {
      console.error('[WhatsApp] Parallel drive link notification failed:', err);
    });
  }
}

/**
 * API Route: Send Drive Link Email
 */
app.post('/api/send-drive-link-email', requireAuth, async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ error: 'Invalid payload' });

  try {
    // Save drive_link & optional sessions_config to database first
    if (order.id) {
      const updateData = {};
      if (order.drive_link) updateData.drive_link = order.drive_link.trim();
      
      if (Array.isArray(order.sessions_config) && order.sessions_config.length > 0) {
        const { data: curApt } = await supabase
          .from('appointments')
          .select('photo_selections')
          .eq('id', order.id)
          .single();
        const curSelections = (curApt && curApt.photo_selections) || {};
        updateData.photo_selections = {
          ...curSelections,
          sessions_config: order.sessions_config
        };
      }

      if (Object.keys(updateData).length > 0) {
        const { error: dbError } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', order.id);
          
        if (dbError) {
          console.error('[DB] Failed to update drive link & sessions:', dbError);
          return res.status(500).json({ error: 'Gagal menyimpan konfigurasi ke database: ' + dbError.message });
        }
      }
    }

    await sendDriveLinkEmail(order);
    res.json({ success: true });
  } catch (error) {
    console.error('[Email] Failed to send drive link email via API:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API Route: Send Editor Notification Email
 * Sends an email notification to the assigned editor (Foto/Video)
 */
app.post('/api/send-editor-notification', requireAuth, async (req, res) => {
  const {
    editorEmail,
    editorName,
    clientName,
    packageName,
    deadline,
    taskType,
    orderId
  } = req.body;

  if (!editorEmail || !editorName || !orderId) {
    return res.status(400).json({ error: 'Missing required fields (editorEmail, editorName, orderId)' });
  }

  try {
    const formattedDeadline = safeFormatDateID(deadline);

    const subject = `[🚀 Penugasan Baru] Pekerjaan ${taskType} - Pesanan #${orderId} LAPANBELAS.ID`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
          <p style="margin: 5px 0 0 0; font-size: 11px; color: #a78bfa; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo &amp; Video Studio</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 35px 25px;">
          <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Halo ${editorName},</h2>
          <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
            Anda telah ditugaskan sebagai <strong style="color: #a78bfa;">Editor ${taskType}</strong> untuk proyek terbaru LAPANBELAS.ID. Berikut adalah detail pekerjaan yang perlu Anda selesaikan:
          </p>

          <!-- Order Info Box -->
          <div style="background-color: #070d0b; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 40%;">ID Pesanan</td>
                <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600; font-family: monospace;">#${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Nama Klien</td>
                <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">${clientName || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Paket</td>
                <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">${packageName || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Tipe Tugas</td>
                <td style="padding: 8px 0; color: #a78bfa; font-weight: 700;">Editor ${taskType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Tenggat Waktu (Deadline)</td>
                <td style="padding: 8px 0; color: #ef4444; font-weight: 700;">${formattedDeadline}</td>
              </tr>
            </table>
          </div>

          <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
            Harap segera masuk ke Dasbor Admin untuk meninjau detail pekerjaan, mengakses tautan Google Drive klien, dan memperbarui status pengerjaan secara berkala.
          </p>

          <!-- Button to Admin Dashboard -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/admin" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; font-weight: 700; padding: 16px 40px; border-radius: 30px; text-decoration: none; font-size: 14px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(124,58,237,0.4); text-transform: uppercase;">
              🖥️ Buka Dasbor Admin
            </a>
          </div>

          <!-- Quick Reminder -->
          <div style="background-color: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 12px; padding: 16px; margin: 25px 0;">
            <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.6;">
              ⚠️ <strong>Catatan:</strong> Pastikan Anda memperbarui kemajuan pengerjaan tepat waktu agar klien kami dapat memantau status pesanan mereka secara real-time. Terima kasih atas kerja keras Anda!
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #070d0b; border-top: 1px solid #1e293b; padding: 25px 20px; text-align: center; color: #64748b; font-size: 11px;">
          <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 500;">LAPANBELAS.ID Creative Team Notification System</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. All rights reserved.</p>
        </div>
      </div>
    `;

    // Determine mailer based on package category or name
    let activeTransporter = transporter;
    let fromEmail = process.env.EMAIL_USER;

    if (packageName) {
      try {
        const { data: pkgData } = await supabase
          .from('packages')
          .select('category')
          .eq('title', packageName)
          .maybeSingle();
        if (pkgData) {
          const pkgCategoryLower = (pkgData.category || '').toLowerCase();
          const pkgNameLower = packageName.toLowerCase();
          if (pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') || 
              ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k))) {
            activeTransporter = transporterStudio;
            fromEmail = process.env.EMAIL_STUDIO_USER;
          }
        }
      } catch (pkgErr) {
        console.error('[Email] Failed to fetch package category for editor notification:', pkgErr);
      }
    }

    await activeTransporter.sendMail({
      from: `"LAPANBELAS.ID" <${fromEmail}>`,
      to: editorEmail,
      subject: subject,
      html: htmlBody
    });

    console.log(`[Email] Sent editor assignment notification email to ${editorEmail} for order ${orderId} (${taskType})`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Email] Failed to send editor notification email via API:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API Route: Send Manual Photo Selection Reminder (Email & WhatsApp)
 * Allows Admin to trigger follow-up reminder anytime from dashboard
 */
app.post('/api/send-photo-selection-reminder', requireAuth, async (req, res) => {
  const { order, orderId, driveLink } = req.body;
  
  let targetOrder = order;
  if (!targetOrder && orderId) {
    const { data: dbOrder, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', orderId)
      .single();
    if (error || !dbOrder) {
      return res.status(404).json({ error: 'Data pesanan tidak ditemukan' });
    }
    targetOrder = dbOrder;
  }

  if (!targetOrder) {
    return res.status(400).json({ error: 'Payload data pesanan tidak valid' });
  }

  try {
    const result = await sendPhotoSelectionReminder(targetOrder, { driveLink });
    
    // Update appointment notes with timestamp of follow-up
    const notes = targetOrder.additional_notes || '';
    const newFollowupTimestamp = `[LAST_PHOTO_FOLLOWUP]: ${new Date().toISOString()}`;
    let updatedNotes = notes;
    if (notes.includes('[LAST_PHOTO_FOLLOWUP]:')) {
      updatedNotes = notes.replace(/\[LAST_PHOTO_FOLLOWUP\]:\s*([0-9T:.-]+Z?)/, newFollowupTimestamp);
    } else {
      updatedNotes = (notes.trim() + '\n' + newFollowupTimestamp).trim();
    }

    await supabase
      .from('appointments')
      .update({ additional_notes: updatedNotes })
      .eq('id', targetOrder.id);

    res.json({ 
      success: true, 
      message: 'Pengingat seleksi foto berhasil dikirim ke klien!',
      ...result 
    });
  } catch (error) {
    console.error('[Photo Follow-Up] API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API Route: Send Manual Feedback Request (WhatsApp)
 * Allows Admin to trigger rating & feedback request to clients whose orders are Done
 */
app.post('/api/send-feedback-request', requireAuth, async (req, res) => {
  const { order, orderId } = req.body;
  const targetId = orderId || (order && order.id);

  if (!targetId) {
    return res.status(400).json({ error: 'ID Pesanan diperlukan' });
  }

  try {
    let targetOrder = order || {};
    // Fetch full appointment data to guarantee phone and name availability
    const { data: dbOrder, error: dbErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', targetId)
      .single();

    if (dbErr || !dbOrder) {
      return res.status(404).json({ error: 'Data pesanan tidak ditemukan di database' });
    }

    targetOrder = { ...targetOrder, ...dbOrder };

    const clientPhone = targetOrder.client_phone || targetOrder.phone || targetOrder.customer_phone;
    if (!clientPhone) {
      return res.status(400).json({ error: 'Nomor WhatsApp klien tidak ditemukan pada pesanan ini' });
    }

    const clientName = targetOrder.client_name || targetOrder.name || 'Pelanggan';
    const feedbackUrl = `${process.env.APP_URL || 'https://app.lapanbelas.id'}/feedback/${targetId}`;

    const waMsg = `Halo Kak *${clientName}*! 👋✨\n\n` +
      `Semoga Kakak dan keluarga selalu sehat dan suka dengan hasil dokumentasi dari LAPANBELAS.ID kemarin ya. 🥰\n\n` +
      `Boleh minta tolong waktu 1 menit untuk memberikan bintang & sedikit ulasan pengalaman Kakak bersama kami? Masukan Kakak sangat berharga untuk kami agar bisa terus memberikan yang terbaik:\n` +
      `👉 ${feedbackUrl}\n\n` +
      `Terima kasih banyak atas kebaikan dan dukungannya ya Kak! 🙏❤️`;

    const waSent = await sendWhatsAppNotification(clientPhone, waMsg);

    // Track timestamp in notes
    const notes = targetOrder.additional_notes || '';
    const newFeedbackTimestamp = `[LAST_FEEDBACK_REQUEST]: ${new Date().toISOString()}`;
    let updatedNotes = notes;
    if (notes.includes('[LAST_FEEDBACK_REQUEST]:')) {
      updatedNotes = notes.replace(/\[LAST_FEEDBACK_REQUEST\]:\s*([0-9T:.-]+Z?)/, newFeedbackTimestamp);
    } else {
      updatedNotes = (notes.trim() + '\n' + newFeedbackTimestamp).trim();
    }

    await supabase
      .from('appointments')
      .update({ additional_notes: updatedNotes })
      .eq('id', targetId);

    res.json({
      success: true,
      waSent,
      message: `Permintaan ulasan berhasil dikirim ke WhatsApp ${clientName}! ⭐`
    });
  } catch (error) {
    console.error('[Feedback Request] Error sending WhatsApp:', error);
    res.status(500).json({ error: error.message || 'Gagal mengirim pesan WhatsApp' });
  }
});

/**
 * API Route: DOKU HTTP Notification Webhook
 * When DOKU receives payment, they call this endpoint.
 */
/**
 * API Route: MIDTRANS HTTP Notification Webhook
 * When Midtrans receives payment, they call this endpoint.
 */
app.post('/api/midtrans-notification', async (req, res) => {
  const requestBody = req.body;
  
  console.log('[MIDTRANS Notification] Received Webhook Notification!');
  console.log('[MIDTRANS Notification] Payload:', JSON.stringify(requestBody, null, 2));

  const rawOrderId = requestBody.order_id;
  // Strip the timestamp suffix safely (e.g. BK-123456-17123456789 -> BK-123456)
  const invoiceNumber = typeof rawOrderId === 'string'
    ? rawOrderId.replace(/-\d{10,}$/, '')
    : null;
  const transactionStatus = requestBody.transaction_status;
  const fraudStatus = requestBody.fraud_status;

  if (!invoiceNumber) {
    return res.status(400).send('Bad Request: Missing order_id');
  }

  // Verify Signature Key
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  if (serverKey) {
    const signatureStr = (requestBody.order_id || '') + (requestBody.status_code || '') + (requestBody.gross_amount || '') + serverKey;
    const calculatedSignature = crypto.createHash('sha512').update(signatureStr).digest('hex');

    if (calculatedSignature !== requestBody.signature_key) {
      console.warn('[MIDTRANS Notification] Signature mismatch! Rejecting unauthorized webhook payload.');
      return res.status(403).json({ error: 'Invalid signature key' });
    }
    console.log('[MIDTRANS Notification] Signature verified successfully!');
  }

  let paymentSuccess = false;
  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') {
      paymentSuccess = true;
    }
  } else if (transactionStatus === 'settlement') {
    paymentSuccess = true;
  }

  if (paymentSuccess) {
    try {
      console.log(`[MIDTRANS Notification] Processing successful payment for Invoice: ${invoiceNumber}`);

      // Fetch order details with fallback to rawOrderId if stripped lookup doesn't match
      let { data: orderData, error: fetchErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', invoiceNumber)
        .maybeSingle();

      if (!orderData && invoiceNumber !== rawOrderId) {
        const { data: rawMatch } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', rawOrderId)
          .maybeSingle();
        if (rawMatch) orderData = rawMatch;
      }

      if (orderData) {
        const alreadyPaid = orderData.status === 'Sudah DP' || orderData.status === 'Lunas';
        if (!alreadyPaid) {
          const { error: updateErr } = await supabase
            .from('appointments')
            .update({ status: 'Sudah DP' })
            .eq('id', orderData.id);

          if (updateErr) {
            console.error('[MIDTRANS Notification] Failed to update Supabase:', updateErr.message);
          } else {
            console.log(`[MIDTRANS Notification] Successfully updated database. Order ${orderData.id} is now DP Settled!`);

            if (orderData.package_name) {
              const { data: pkgData } = await supabase
                .from('packages')
                .select('*')
                .eq('title', orderData.package_name)
                .maybeSingle();
              if (pkgData) orderData.packages = pkgData;
            }

            sendInvoiceEmail('sudah_dp', { ...orderData, status: 'Sudah DP' }).catch(err => {
              console.error('[MIDTRANS Notification] Failed to send invoice email after payment:', err.message);
            });
            if (typeof syncGoogleCalendarEvent === 'function') {
              syncGoogleCalendarEvent({ ...orderData, status: 'Sudah DP' }).catch(calErr => {
                console.error('[MIDTRANS Notification] Google Calendar sync error:', calErr.message);
              });
            }
          }
        } else {
          console.log(`[MIDTRANS Notification] Order ${orderData.id} is already in status '${orderData.status}'. Skipping duplicate notification.`);
        }
      } else {
        console.warn(`[MIDTRANS Notification] Order not found for invoiceNumber '${invoiceNumber}' or '${rawOrderId}'`);
      }
    } catch (dbErr) {
      console.error('[MIDTRANS Notification] Error updating database:', dbErr.message);
    }
  }

  // Midtrans expects 200 OK
  res.status(200).send('OK');
});

app.post('/api/doku-notification', async (req, res) => {
  const requestBody = req.body;
  const headers = req.headers;

  console.log('[DOKU Notification] Received Webhook Notification!');
  console.log('[DOKU Notification] Headers:', JSON.stringify(headers, null, 2));
  console.log('[DOKU Notification] Payload:', JSON.stringify(requestBody, null, 2));

  // Extract key fields from the body
  const rawInvoice = requestBody?.order?.invoice_number;
  const invoiceNumber = typeof rawInvoice === 'string'
    ? rawInvoice.replace(/-\d{10,}$/, '')
    : null;

  if (!invoiceNumber) {
    return res.status(400).send('Bad Request: Missing invoice number');
  }

  // Signature verification
  const clientId = headers['client-id'] || headers['x-client-id'];
  const requestId = headers['request-id'] || headers['x-request-id'];
  const timestamp = headers['request-timestamp'] || headers['x-request-timestamp'];
  const signatureReceived = headers['signature'] || headers['x-signature'];
  const secretKey = process.env.DOKU_SECRET_KEY;

  const isPlaceholderCredentials =
    !secretKey ||
    process.env.DOKU_CLIENT_ID === 'MALL-12345678' ||
    process.env.DOKU_SECRET_KEY === 'SK-1234567890abcdef1234567890abcdef';

  if (!isPlaceholderCredentials && signatureReceived) {
    // 1. Calculate digest
    const payloadBuffer = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(requestBody));
    const digest = crypto.createHash('sha256').update(payloadBuffer).digest('base64');

    // 2. Prepare String to sign
    const stringToSign =
      `Client-Id:${clientId}\n` +
      `Request-Id:${requestId}\n` +
      `Request-Timestamp:${timestamp}\n` +
      `Request-Target:/api/doku-notification\n` +
      `Digest:${digest}`;

    // 3. Calculate signature
    const signatureCalculated = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');
    const finalSignature = `HMACSHA256=${signatureCalculated}`;

    if (finalSignature !== signatureReceived) {
      console.warn('[DOKU Notification] Signature mismatch! Rejecting unauthorized webhook payload.');
      return res.status(403).json({ error: 'Invalid signature' });
    }
    console.log('[DOKU Notification] Signature verified successfully!');
  } else {
    console.log('[DOKU Notification] Skipping signature verification (Sandbox mode/Placeholders).');
  }

  // Update Supabase directly
  try {
    console.log(`[DOKU Notification] Processing payment for Invoice: ${invoiceNumber}`);

    let { data: orderData, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', invoiceNumber)
      .maybeSingle();

    if (!orderData && invoiceNumber !== rawInvoice) {
      const { data: rawMatch } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', rawInvoice)
        .maybeSingle();
      if (rawMatch) orderData = rawMatch;
    }

    if (orderData) {
      const alreadyPaid = orderData.status === 'Sudah DP' || orderData.status === 'Lunas';
      if (!alreadyPaid) {
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({ status: 'Sudah DP' })
          .eq('id', orderData.id);

        if (updateErr) {
          console.error('[DOKU Notification] Failed to update Supabase:', updateErr.message);
        } else {
          console.log(`[DOKU Notification] Successfully updated database. Order ${orderData.id} is now DP Settled!`);

          if (orderData.package_name) {
            const { data: pkgData } = await supabase
              .from('packages')
              .select('*')
              .eq('title', orderData.package_name)
              .maybeSingle();
            if (pkgData) orderData.packages = pkgData;
          }
          // Send email asynchronously without blocking the webhook response
          sendInvoiceEmail('sudah_dp', { ...orderData, status: 'Sudah DP' }).catch(err => {
            console.error('[DOKU Notification] Failed to send invoice email after payment:', err.message);
          });
          if (typeof syncGoogleCalendarEvent === 'function') {
            syncGoogleCalendarEvent({ ...orderData, status: 'Sudah DP' }).catch(calErr => {
              console.error('[DOKU Notification] Google Calendar sync error:', calErr.message);
            });
          }
        }
      } else {
        console.log(`[DOKU Notification] Order ${orderData.id} is already in status '${orderData.status}'. Skipping duplicate notification.`);
      }
    } else {
      console.warn(`[DOKU Notification] Order not found for invoiceNumber '${invoiceNumber}' or '${rawInvoice}'`);
    }
  } catch (dbErr) {
    console.error('[DOKU Notification] Error updating database:', dbErr.message);
  }

  // Respond to DOKU to acknowledge receipt
  return res.status(200).send('OK');
});

/**
 * API Route: Unsubscribe from Marketing Emails
 */
app.get('/unsubscribe', async (req, res) => {
  const { email, id } = req.query;

  if (!email || !id) {
    return res.status(400).send('<h1>Invalid Link</h1><p>Missing required details.</p>');
  }

  try {
    // Update user metadata in Supabase Auth to unsubscribed
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        unsubscribed: true,
        followup_status: 'unsubscribed'
      }
    });

    if (error) {
      console.error('[Unsubscribe] Failed to update user metadata:', error.message);
      return res.status(500).send('<h1>Error</h1><p>Gagal memproses penghentian langganan. Silakan hubungi admin.</p>');
    }

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #010605; color: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div style="max-width: 450px; border: 1px solid #1e293b; border-radius: 20px; padding: 40px; background-color: #070d0b; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
          <h1 style="color: #ef4444; font-size: 24px; margin-bottom: 20px; font-weight: bold; letter-spacing: 1px;">Berhasil Berhenti Berlangganan</h1>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
            Email <strong>${email}</strong> telah berhasil dihapus dari daftar promosi otomatis LAPANBELAS.ID. Anda tidak akan menerima email promosi dari kami lagi.
          </p>
          <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff; padding: 12px 35px; border-radius: 30px; text-decoration: none; font-size: 13px; font-weight: bold; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    `);
  } catch (err) {
    console.error('[Unsubscribe] Error:', err);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Background Marketing Engine: Automatic Email Follow-up
 * Runs periodically to follow up with users who logged in via Google but haven't booked.
 */
async function checkAndSendFollowUps() {
  console.log('[Follow-up System] Running daily background marketing checks...');

  try {
    // 1. Verify if our Supabase key is a valid Service Role Key (bypasses RLS)
    let serviceKeyRole = 'anon';
    try {
      const payload = supabaseServiceKey.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      serviceKeyRole = decoded.role || 'anon';
    } catch (e) {
      console.warn('[Follow-up System] Failed parsing key payload:', e.message);
    }

    if (serviceKeyRole === 'anon') {
      console.warn('[Follow-up System] Skipped: Service role key is required for auth user list operations.');
      return;
    }

    // 2. Fetch all registered auth users from Supabase Auth
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) {
      console.error('[Follow-up System] Failed to fetch users list:', usersErr.message);
      return;
    }
    const users = usersData.users || [];

    // 3. Fetch all client emails from appointments table (active customers)
    const { data: bookingsData, error: bookingsErr } = await supabase
      .from('appointments')
      .select('client_email');
    if (bookingsErr) {
      console.error('[Follow-up System] Failed to fetch bookings list:', bookingsErr.message);
      return;
    }

    // Create a Set of active customer emails (lowercase for robust comparisons)
    const activeCustomerEmails = new Set(
      bookingsData.map(b => (b.client_email || '').toLowerCase().trim()).filter(Boolean)
    );

    // 4. Fetch dynamic WhatsApp admin settings
    let adminWhatsapp = '6281234567890';
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');
      if (settingsData && !settingsError) {
        const whatsappSetting = settingsData.find(s => s.key === 'admin_whatsapp');
        if (whatsappSetting && whatsappSetting.value) {
          let cleaned = whatsappSetting.value.replace(/[^0-9]/g, '');
          if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
          }
          adminWhatsapp = cleaned;
        }
      }
    } catch (err) {
      console.error('[Follow-up System] Failed to fetch admin_whatsapp setting:', err);
    }

    console.log(`[Follow-up System] Total leads checked: ${users.length}. Total active customers: ${activeCustomerEmails.size}`);

    // 5. Process follow-ups for each lead
    for (const user of users) {
      const userEmail = (user.email || '').toLowerCase().trim();
      if (!userEmail) continue;

      // Rule: If user is already a customer, skip them!
      if (activeCustomerEmails.has(userEmail)) {
        continue;
      }

      const metadata = user.user_metadata || {};

      // Rule: If user has unsubscribed, skip them!
      if (metadata.unsubscribed === true || metadata.followup_status === 'unsubscribed') {
        continue;
      }

      // Calculate hours since their Google Login registration
      const regDate = new Date(user.created_at);
      const hoursSinceReg = (Date.now() - regDate.getTime()) / (1000 * 60 * 60);

      const displayName = metadata.full_name || userEmail.split('@')[0];

      // --- EMAIL FOLLOW-UP 1 (After 24 Hours) ---
      if (hoursSinceReg >= 24 && !metadata.followup_1_sent) {
        // console.log(`[Follow-up System] Sending Email 1 (Consultation) to ${user.email} (registered ${hoursSinceReg.toFixed(1)}h ago)...`);

        const subject1 = `Momen Berharga Anda Siap Diabadikan? 📸✨`;
        const htmlBody1 = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0c3832 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #34d399; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo &amp; Video Studio</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 35px 25px;">
              <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Halo ${displayName},</h2>
              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                Salam hangat dari Tim Kreatif <strong>LAPANBELAS.ID</strong>!
              </p>
              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                Kami melihat kemarin Anda sedang melihat-lihat daftar harga (<em>pricelist</em>) di dasbor kami. Mempersiapkan momen berharga—baik itu Akad Nikah, Wedding, prewedding, Lamaran, atau tasyakuran—adalah perjalanan yang sangat menyenangkan, dan memilih tim dokumentasi yang tepat adalah kunci utamanya.
              </p>
              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                Apakah Anda sedang bingung menentukan paket mana yang paling pas dengan konsep acara Anda? Atau ada detail layanan tambahan yang ingin Anda sesuaikan?
              </p>
              
              <p style="line-height: 1.6; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center; margin: 25px 0 10px 0;">
                Kami siap membantu Anda berkonsultasi secara GRATIS!
              </p>

              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px; text-align: center; margin-bottom: 20px;">
                Anda bisa langsung membalas email ini, atau klik tombol di bawah untuk langsung mengobrol santai dengan admin kami melalui WhatsApp:
              </p>

              <!-- Buttons -->
              <div style="text-align: center; margin: 25px 0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <a href="https://wa.me/${adminWhatsapp}?text=Halo%20kak%20saya%20mau%20konsultasi%20mengenai%20paket%20dokumentasi%20di%20LAPANBELAS.ID" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; padding: 14px 40px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(5,150,105,0.3); text-transform: uppercase; width: 80%; text-align: center;">
                  📱 Konsultasi Langsung via WhatsApp
                </a>
              </div>

              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px; text-align: center; margin-top: 25px; margin-bottom: 20px;">
                Jika Anda sudah menemukan paket yang pas, silakan lanjutkan pemesanan Anda dengan masuk kembali ke portal dasbor Anda:
              </p>

              <div style="text-align: center; margin: 25px 0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <a href="${APP_URL}" target="_blank" style="display: inline-block; background-color: #1e293b; color: #ffffff; font-weight: 600; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-size: 12px; border: 1px solid #334155; width: 80%; text-align: center;">
                  🖥️ Buka Portal Dasbor LAPANBELAS.ID
                </a>
              </div>

              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px; margin-top: 25px;">
                Semoga hari Anda menyenangkan dan persiapan acara berjalan lancar!
              </p>

              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px; margin-top: 20px; margin-bottom: 0;">
                Warm regards,<br>
                <strong>LAPANBELAS.ID Creative Team</strong>
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #070d0b; border-top: 1px solid #1e293b; padding: 25px 20px; text-align: center; color: #64748b; font-size: 11px;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 500;">Ada pertanyaan? Hubungi tim kami dengan membalas email ini.</p>
              <p style="margin: 0 0 15px 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.</p>
              <p style="margin: 0;">
                <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}&id=${user.id}" target="_blank" style="color: #64748b; text-decoration: underline;">Berhenti menerima email promosi (Unsubscribe)</a>
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"LAPANBELAS.ID" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: subject1,
            html: htmlBody1
          });

          // Mark metadata: Email 1 Sent
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...metadata,
              followup_1_sent: true,
              followup_1_sent_at: new Date().toISOString(),
              followup_status: 'sent_1'
            }
          });
          // console.log(`[Follow-up System] Successfully processed Email 1 for ${user.email}`);
        } catch (mailErr) {
          console.error(`[Follow-up System] Mail Error sending Email 1 to ${user.email}:`, mailErr.message);
        }
      }

      // --- EMAIL FOLLOW-UP 2 (After 72 Hours) ---
      else if (hoursSinceReg >= 72 && metadata.followup_1_sent && !metadata.followup_2_sent) {
        // console.log(`[Follow-up System] Sending Email 2 (Voucher 100K) to ${user.email} (registered ${hoursSinceReg.toFixed(1)}h ago)...`);

        const subject2 = `🎁 Kado Spesial untuk Hari Bahagia Anda (Voucher Potongan Terbatas!)`;
        const htmlBody2 = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0c3832 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #34d399; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo &amp; Video Studio</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 35px 25px;">
              <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Halo ${displayName},</h2>
              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                Kami sangat ingin menjadi bagian dalam mengabadikan setiap senyum, tawa, dan momen mengharukan di hari bahagia Anda nanti.
              </p>
              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                Sebagai bentuk sambutan hangat untuk Anda, kami telah menyiapkan <strong>Kado Selamat Datang Khusus</strong> berupa voucher potongan langsung sebesar <strong>Rp 100.000</strong> yang bisa Anda gunakan saat checkout!
              </p>
              
              <!-- Voucher Box -->
              <div style="background-color: #070d0b; border: 2px dashed #34d399; border-radius: 16px; padding: 25px; margin: 25px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Kode Voucher Eksklusif Anda</p>
                <h3 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 800; color: #34d399; letter-spacing: 3px; font-family: monospace;">LAPANBELASNEW</h3>
                <p style="margin: 0; font-size: 12px; color: #fbbf24; font-weight: 500;">
                  ⏱️ Potongan Rp 100.000 (Terbatas untuk 50 Pasang Pertama - Aktif 48 Jam)
                </p>
              </div>

              <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                Amankan slot tanggal acara Anda sekarang sebelum terisi oleh pasangan/klien lain, karena kuota slot per tanggal kami sangat terbatas:
              </p>

              <!-- Buttons -->
              <div style="text-align: center; margin: 25px 0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <a href="${APP_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; font-weight: 700; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(124,58,237,0.4); text-transform: uppercase; width: 80%; text-align: center;">
                  🎫 Gunakan Voucher &amp; Booking Sekarang
                </a>
              </div>

              <p style="line-height: 1.6; color: #94a3b8; font-size: 13px; font-style: italic; background-color: rgba(255,255,255,0.02); padding: 14px; border-radius: 12px; border: 1px solid #1e293b;">
                <strong>Cara Menggunakan:</strong> Cukup masukkan kode voucher <strong style="color: #34d399;">LAPANBELASNEW</strong> pada kolom voucher di halaman pemesanan dasbor Anda, dan tagihan DP Anda akan otomatis terpotong.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #070d0b; border-top: 1px solid #1e293b; padding: 25px 20px; text-align: center; color: #64748b; font-size: 11px;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 500;">Ada pertanyaan? Hubungi tim kami dengan membalas email ini.</p>
              <p style="margin: 0 0 15px 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. Semua hak dilindungi.</p>
              <p style="margin: 0;">
                <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}&id=${user.id}" target="_blank" style="color: #64748b; text-decoration: underline;">Berhenti menerima email promosi (Unsubscribe)</a>
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"LAPANBELAS.ID" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: subject2,
            html: htmlBody2
          });

          // Mark metadata: Email 2 Sent
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...metadata,
              followup_2_sent: true,
              followup_2_sent_at: new Date().toISOString(),
              followup_status: 'sent_2'
            }
          });
          // console.log(`[Follow-up System] Successfully processed Email 2 for ${user.email}`);
        } catch (mailErr) {
          console.error(`[Follow-up System] Mail Error sending Email 2 to ${user.email}:`, mailErr.message);
        }
      }
    }
  } catch (globalErr) {
    console.error('[Follow-up System] Global error in background marketing scheduler:', globalErr);
  }
}

// Start Background Interval Check (Disabled for 100% manual control)
// setInterval(checkAndSendFollowUps, 6 * 60 * 60 * 1000);
// setTimeout(checkAndSendFollowUps, 10000);

/**
 * Background Payment Reminder Engine: Automatic Payment Reminder
 * Runs periodically to automatically send a reminder email at 07:00 AM WIB (Asia/Jakarta)
 * to customers whose events have completed (H+1 or older) but status is still 'Sudah DP' (not paid in full).
 */
let lastPaymentReminderRunDate = null;
async function checkAndSendPaymentReminders() {
  try {
    const now = new Date();
    // Convert to WIB (UTC+7)
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + wibOffset);
    const wibHours = wibNow.getUTCHours();
    const wibDateStr = wibNow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Check if it is 07:00 AM WIB (hour 7)
    if (wibHours !== 7) {
      // console.log(`[Payment Reminder System] Check skipped. Current time is ${String(wibHours).padStart(2, '0')}:00 WIB. Automatic reminders only run at 07:00 AM WIB.`);
      return;
    }

    // Ensure it only runs once per day
    if (lastPaymentReminderRunDate === wibDateStr) {
      return;
    }
    lastPaymentReminderRunDate = wibDateStr;

    console.log('[Payment Reminder System] Running automatic payment reminder check at 07:00 AM WIB...');

    // Fetch all appointments where:
    // 1. status is 'Sudah DP'
    // 2. event_date is before today (meaning event has passed)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'Sudah DP')
      .lt('event_date', wibDateStr);

    // Manually attach package info for each appointment
    if (appointments && appointments.length > 0) {
      for (const appt of appointments) {
        if (appt.package_name && !appt.packages) {
          const { data: pkgData } = await supabase.from('packages').select('*').eq('title', appt.package_name).single();
          if (pkgData) appt.packages = pkgData;
        }
      }
    }

    if (error) {
      console.error('[Payment Reminder System] Failed to fetch unpaid appointments:', error.message);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('[Payment Reminder System] No unpaid appointments found for past events.');
      return;
    }

    // Filter appointments where reminder has not been sent yet
    const pendingAppts = appointments.filter(appt => appt.reminder_sent !== true);

    if (pendingAppts.length === 0) {
      console.log('[Payment Reminder System] All unpaid past appointments have already been sent a reminder.');
      return;
    }

    console.log(`[Payment Reminder System] Found ${pendingAppts.length} appointments needing payment reminder.`);

    for (const appt of pendingAppts) {
      const orderData = {
        id: appt.id,
        client_name: appt.client_name,
        client_email: appt.client_email,
        package_name: appt.package_name || (appt.packages && appt.packages.name),
        total_amount: appt.total_amount,
        dp_amount: appt.dp_amount,
        notes: appt.additional_notes || appt.notes
      };

      try {
        await sendInvoiceEmail('reminder_pelunasan', orderData);

        // Update appointment to mark reminder as sent
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', appt.id);

        if (updateErr) {
          console.error(`[Payment Reminder System] Failed to update database status for #${appt.id}:`, updateErr.message);
        } else {
          console.log(`[Payment Reminder System] Successfully sent payment reminder email to ${orderData.client_email} for order #${appt.id}`);
        }
      } catch (sendErr) {
        console.error(`[Payment Reminder System] Failed to send reminder email to ${orderData.client_email}:`, sendErr.message);
      }
    }
  } catch (globalErr) {
    console.error('[Payment Reminder System] Global error in payment reminder scheduler:', globalErr);
  }
}

// Start Payment Reminder Scheduler Check (Runs every 15 minutes, executes once per day at 07:00 AM WIB for Email only)
setInterval(checkAndSendPaymentReminders, 15 * 60 * 1000);

/**
 * Background Anniversary Engine
 * Runs periodically to automatically send Anniversary Greetings at 23:59 WIB
 */
let lastAnniversaryRunDate = null;
async function checkAndSendAnniversaryGreetings() {
  try {
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + wibOffset);
    const wibHours = wibNow.getUTCHours();
    const wibMins = wibNow.getUTCMinutes();
    const wibDateStr = wibNow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Check if it is exactly 23:59 WIB
    if (wibHours !== 23 || wibMins !== 59) return;

    // Ensure it only runs once per day
    if (lastAnniversaryRunDate === wibDateStr) return;
    lastAnniversaryRunDate = wibDateStr;

    console.log('[Anniversary System] Running automatic Anniversary check at 23:59 WIB...');

    const currentYear = wibNow.getUTCFullYear();
    const currentMonth = String(wibNow.getUTCMonth() + 1).padStart(2, '0');
    const currentDay = String(wibNow.getUTCDate()).padStart(2, '0');

    // Fetch all Lunas appointments
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'Lunas');

    if (error) {
      console.error('[Anniversary System] Failed to fetch appointments:', error.message);
      return;
    }

    if (!appointments || appointments.length === 0) return;

    const anniversaryAppts = appointments.filter(appt => {
      if (!appt.event_date) return false;
      const [year, month, day] = appt.event_date.split('-');
      
      // Check if month and day match today
      const isToday = month === currentMonth && day === currentDay;
      const isPastYear = parseInt(year) < currentYear;

      // Check if it's a Wedding/Akad/Resepsi package
      const pkgName = (appt.package_name || '').toLowerCase();
      const isWeddingPackage = pkgName.includes('akad') || pkgName.includes('resepsi') || pkgName.includes('wedding') || pkgName.includes('package');

      return isToday && isPastYear && isWeddingPackage;
    });

    console.log(`[Anniversary System] Found ${anniversaryAppts.length} clients celebrating their anniversary today!`);

    for (const appt of anniversaryAppts) {
      const [year] = appt.event_date.split('-');
      const yearsPassed = currentYear - parseInt(year);

      const orderData = {
        id: appt.id,
        client_name: appt.client_name,
        client_email: appt.client_email,
        client_phone: appt.client_phone,
        package_name: appt.package_name
      };

      try {
        await sendAnniversaryGreeting(orderData, yearsPassed);
      } catch (err) {
        console.error(`[Anniversary System] Failed to send greeting to ${orderData.client_email}:`, err.message);
      }
    }
  } catch (globalErr) {
    console.error('[Anniversary System] Global error in scheduler:', globalErr);
  }
}

// Start Anniversary Scheduler Check (Every 30 seconds to catch 23:59 accurately)
setInterval(checkAndSendAnniversaryGreetings, 30 * 1000);

/**
 * Background Photo Selection Follow-Up Engine: Monthly Auto Follow-Up
 * Runs periodically to automatically remind customers who haven't selected photos
 * for >= 30 days since their event/drive link, sending both Email & WhatsApp.
 * Ensures maximum 1 reminder per month per client.
 */
let lastPhotoFollowupRunDate = null;
async function checkAndSendMonthlyPhotoSelectionFollowUps() {
  try {
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + wibOffset);
    const wibHours = wibNow.getUTCHours();
    const wibDateStr = wibNow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Run at 09:00 AM WIB (or once on startup)
    if (wibHours !== 9 && lastPhotoFollowupRunDate !== null) {
      return;
    }

    if (lastPhotoFollowupRunDate === wibDateStr) {
      return;
    }
    lastPhotoFollowupRunDate = wibDateStr;

    console.log('[Photo Follow-Up System] Checking for clients needing monthly photo selection reminder...');

    // Fetch appointments that are Lunas or have drive_link
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .in('status', ['Lunas', 'Sudah DP']);

    if (error) {
      console.error('[Photo Follow-Up System] Failed to fetch appointments:', error.message);
      return;
    }

    if (!appointments || appointments.length === 0) return;

    // Fetch editor_assignments to check if client already has tanggal_pilih_foto or file_code
    const { data: assignments } = await supabase
      .from('editor_assignments')
      .select('*');

    const assignmentMap = {};
    if (assignments) {
      for (const asg of assignments) {
        if (asg.order_id) {
          assignmentMap[asg.order_id] = asg;
        }
      }
    }

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const twentyEightDaysMs = 28 * 24 * 60 * 60 * 1000;

    for (const appt of appointments) {
      const asg = assignmentMap[appt.id];
      const driveLink = appt.drive_link || (asg && asg.drive_link_seleksi) || '';

      // Check if photo selection is already completed
      let hasSelectedPhotos = false;
      if (asg && asg.file_code) {
        if (asg.file_code.includes(' || ')) {
          const parts = asg.file_code.split(' || ');
          const tglPilih = parts[3] || '';
          if (tglPilih && tglPilih.trim() !== '') hasSelectedPhotos = true;
        } else if (asg.file_code.trim() !== '' && asg.file_code.trim() !== '-') {
          hasSelectedPhotos = true;
        }
      }

      // Also check if notes contains explicit completed mark
      const notes = appt.additional_notes || '';
      if (notes.includes('[TANGGAL PILIH FOTO]:') || notes.includes('[SELEKSI SELESAI]')) {
        hasSelectedPhotos = true;
      }

      if (hasSelectedPhotos) continue;

      // Determine date reference (event_date or created_at)
      const refDateStr = appt.event_date || appt.created_at;
      if (!refDateStr) continue;

      const refDate = new Date(refDateStr);
      const timeSinceRef = Date.now() - refDate.getTime();

      // Must be at least 30 days elapsed
      if (timeSinceRef < thirtyDaysMs) continue;

      // Check last follow-up timestamp (stored in notes)
      const lastFollowupMatch = notes.match(/\[LAST_PHOTO_FOLLOWUP\]:\s*([0-9T:.-]+Z?)/);
      if (lastFollowupMatch && lastFollowupMatch[1]) {
        const lastFollowupTime = new Date(lastFollowupMatch[1]).getTime();
        if (Date.now() - lastFollowupTime < twentyEightDaysMs) {
          // Already sent follow up within the last month, skip
          continue;
        }
      }

      const daysElapsed = Math.floor(timeSinceRef / (24 * 60 * 60 * 1000));
      console.log(`[Photo Follow-Up System] Sending monthly reminder for #${appt.id} (${appt.client_name}), ${daysElapsed} days since event.`);

      // Send reminder
      const result = await sendPhotoSelectionReminder(appt, { driveLink, daysElapsed });

      // Update notes with last follow-up timestamp
      const newFollowupTimestamp = `[LAST_PHOTO_FOLLOWUP]: ${new Date().toISOString()}`;
      let updatedNotes = notes;
      if (lastFollowupMatch) {
        updatedNotes = notes.replace(/\[LAST_PHOTO_FOLLOWUP\]:\s*([0-9T:.-]+Z?)/, newFollowupTimestamp);
      } else {
        updatedNotes = (notes.trim() + '\n' + newFollowupTimestamp).trim();
      }

      await supabase
        .from('appointments')
        .update({ additional_notes: updatedNotes })
        .eq('id', appt.id);
    }
  } catch (globalErr) {
    console.error('[Photo Follow-Up System] Global error in monthly scheduler:', globalErr);
  }
}

// Background scheduler disabled per user request to prevent auto spam.
// Photo selection reminders are now strictly MANUAL via Admin Dashboard.
// setInterval(checkAndSendMonthlyPhotoSelectionFollowUps, 30 * 60 * 1000);
// setTimeout(checkAndSendMonthlyPhotoSelectionFollowUps, 20000);

// Start express server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` 18Studio Booking Backend running on port ${PORT}`);
  console.log(` Access application at: ${APP_URL}`);
  console.log(` Environment: ${process.env.DOKU_IS_PRODUCTION === 'true' ? 'PRODUCTION' : 'SANDBOX'}`);
  console.log(`==================================================`);
});

/**
 * Helper to extract Drive Folder ID from a URL
 */
function extractDriveFolderId(url) {
  if (!url) return null;
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return null;
}

/**
 * Helper: Build Order Photo Selection Sessions (Smart Auto-Detect + Admin Config Support)
 */
function buildOrderSessions(order, allPkgs = []) {
  const existingSessions = (order.photo_selections && order.photo_selections.sessions) ? order.photo_selections.sessions : {};
  const existingDrafts = (order.photo_selections && order.photo_selections.drafts) ? order.photo_selections.drafts : {};
  const legacyPhotos = (order.photo_selections && Array.isArray(order.photo_selections.photos)) ? order.photo_selections.photos : [];

  // 1. If admin has explicitly configured sessions, respect it 100%!
  if (order.photo_selections && Array.isArray(order.photo_selections.sessions_config) && order.photo_selections.sessions_config.length > 0) {
    return order.photo_selections.sessions_config.map((cfg, idx) => {
      const sKey = cfg.id || `session-${idx + 1}`;
      const sSaved = existingSessions[sKey] || (idx === 0 && legacyPhotos.length > 0 ? { photos: legacyPhotos, extraCount: order.photo_selections?.extraCount || 0, photoNotes: order.photo_selections?.photoNotes || {}, status: 'Terkirim' } : null);
      const sDraft = existingDrafts[sKey] || null;
      return {
        id: sKey,
        title: cfg.title || `Sesi ${idx + 1}`,
        subtitle: cfg.subtitle || (idx === 0 ? 'Sesi Utama' : 'Sesi Tambahan'),
        limit: parseInt(cfg.limit, 10) || 50,
        isPrimary: idx === 0,
        submittedPhotos: sSaved?.photos || [],
        submittedNotes: sSaved?.photoNotes || {},
        extraCount: sSaved?.extraCount || 0,
        status: sSaved?.status || (sSaved?.photos?.length > 0 ? 'Terkirim' : 'Belum Dipilih'),
        submittedAt: sSaved?.submittedAt || null,
        draft: sDraft
      };
    });
  }

  // 2. Smart Auto-Detect from Package Description & Custom Fees
  const sessions = [];
  const primPkg = (allPkgs || []).find(p => p.title.toLowerCase() === (order.package_name || '').toLowerCase());
  const desc = primPkg ? (primPkg.description || '') : '';

  // Detect Multi-Album within Primary Package (e.g. Centro Package: 50 edited for Fullpress, 80 edited for Keluarga)
  const albumMatches = [];
  const regexAlbum = /(\d+)\s*(?:Edited\s*Photo|Foto|lembar)?\s*(?:for|untuk)?\s*album\s*([^\n\r,.;()]+)/gi;
  let m;
  while ((m = regexAlbum.exec(desc)) !== null) {
    const count = parseInt(m[1], 10);
    const albName = m[2].trim();
    if (count >= 5 && albName) {
      // Clean up album name
      const cleanName = albName.replace(/^[:\s-]+/, '').trim();
      albumMatches.push({ limit: count, name: cleanName.toLowerCase().startsWith('album') ? cleanName : `Album ${cleanName}` });
    }
  }

  let sIdx = 1;
  if (albumMatches.length >= 2) {
    // Multi-album package! Split primary package into separate album sessions
    albumMatches.forEach((alb, i) => {
      const sKey = `session-${sIdx}`;
      const sSaved = existingSessions[sKey] || (i === 0 && legacyPhotos.length > 0 ? { photos: legacyPhotos, extraCount: order.photo_selections?.extraCount || 0, photoNotes: order.photo_selections?.photoNotes || {}, status: 'Terkirim' } : null);
      const sDraft = existingDrafts[sKey] || null;
      sessions.push({
        id: sKey,
        title: alb.name,
        subtitle: `${order.package_name || 'Paket'} (${i === 0 ? 'Utama' : 'Keluarga/Cetak'})`,
        limit: alb.limit,
        isPrimary: i === 0,
        submittedPhotos: sSaved?.photos || [],
        submittedNotes: sSaved?.photoNotes || {},
        extraCount: sSaved?.extraCount || 0,
        status: sSaved?.status || (sSaved?.photos?.length > 0 ? 'Terkirim' : 'Belum Dipilih'),
        submittedAt: sSaved?.submittedAt || null,
        draft: sDraft
      });
      sIdx++;
    });
  } else {
    // Single primary package session
    const getPkgLimit = (pkgTitle, d) => {
      if (d) {
        const plm = d.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
        if (plm) return parseInt(plm[1], 10);
      }
      const name = (pkgTitle || '').toLowerCase();
      const digitMatch = name.match(/(\d+)\s*(?:lembar|foto|sheet|halaman|pcs|pilih)?/);
      if (digitMatch && parseInt(digitMatch[1], 10) >= 5) return parseInt(digitMatch[1], 10);
      if (name.includes('80')) return 80;
      if (name.includes('100')) return 100;
      if (name.includes('50')) return 50;
      if (name.includes('150')) return 150;
      return 80;
    };

    const primLimit = getPkgLimit(order.package_name, desc);
    let primSubtitle = 'Sesi Utama';
    if (order.resepsi_date) primSubtitle = 'Akad & Resepsi';
    else if (order.package_name && order.package_name.toLowerCase().includes('prewed')) primSubtitle = 'Prewedding';

    const s1Saved = existingSessions['session-1'] || (legacyPhotos.length > 0 ? { photos: legacyPhotos, extraCount: order.photo_selections?.extraCount || 0, photoNotes: order.photo_selections?.photoNotes || {}, status: 'Terkirim' } : null);
    const s1Draft = existingDrafts['session-1'] || null;

    sessions.push({
      id: 'session-1',
      title: order.package_name || 'Paket Utama',
      subtitle: primSubtitle,
      limit: primLimit,
      isPrimary: true,
      submittedPhotos: s1Saved?.photos || [],
      submittedNotes: s1Saved?.photoNotes || {},
      extraCount: s1Saved?.extraCount || 0,
      status: s1Saved?.status || (s1Saved?.photos?.length > 0 ? 'Terkirim' : 'Belum Dipilih'),
      submittedAt: s1Saved?.submittedAt || null,
      draft: s1Draft
    });
    sIdx++;
  }

  // Secondary packages & addons from custom_fees
  const customFees = order.custom_fees || [];
  for (const fee of customFees) {
    const feeName = (fee.name || '').toLowerCase();
    const matchedPkg = (allPkgs || []).find(p => feeName.includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(feeName));
    const isPkgFee = matchedPkg || ['package', 'paket', 'ngunduh', 'prewed', 'akad', 'lamaran', 'engagement', 'studio', 'album', 'cetak', 'photobook', 'magazine'].some(k => feeName.includes(k));
    
    // Exclude non-photo items (frames, transport, extra people, barcodes)
    const isNonPhotoItem = (feeName.includes('frame') || feeName.includes('pigura') || feeName.includes('orang') || feeName.includes('transport') || feeName.includes('barcode') || feeName.includes('scan')) && !feeName.includes('lembar') && !feeName.includes('foto') && !feeName.includes('album');

    if (isPkgFee && !isNonPhotoItem) {
      let subtitle = 'Acara Tambahan';
      if (feeName.includes('ngunduh')) subtitle = 'Ngunduh Mantu';
      else if (feeName.includes('prewed')) subtitle = 'Prewedding';
      else if (feeName.includes('akad')) subtitle = 'Akad Nikah';
      else if (feeName.includes('lamaran')) subtitle = 'Lamaran / Engagement';
      else if (feeName.includes('album') || feeName.includes('photobook')) subtitle = 'Album Cetak';
      else if (feeName.includes('cetak')) subtitle = 'Cetak Foto';

      // Smart photo limit for addons:
      let feeLimit = 30; // default for extra sessions/prewed
      const digitMatch = feeName.match(/(\d+)\s*(?:lembar|foto|sheet|halaman|pcs|pilih)?/);
      if (digitMatch && parseInt(digitMatch[1], 10) >= 5) {
        feeLimit = parseInt(digitMatch[1], 10);
      } else if (feeName.includes('prewed')) {
        feeLimit = 30; // Prewedding default kuota 30 foto
      } else if (feeName.includes('album') || feeName.includes('photobook')) {
        feeLimit = 80;
      } else if (matchedPkg && matchedPkg.description) {
        const plm = matchedPkg.description.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
        if (plm) feeLimit = parseInt(plm[1], 10);
      }

      const sKey = `session-${sIdx}`;
      const sSaved = existingSessions[sKey] || null;
      const sDraft = existingDrafts[sKey] || null;

      sessions.push({
        id: sKey,
        title: fee.name.replace(/\b\w/g, l => l.toUpperCase()),
        subtitle: subtitle,
        limit: feeLimit,
        isPrimary: false,
        submittedPhotos: sSaved?.photos || [],
        submittedNotes: sSaved?.photoNotes || {},
        extraCount: sSaved?.extraCount || 0,
        status: sSaved?.status || (sSaved?.photos?.length > 0 ? 'Terkirim' : 'Belum Dipilih'),
        submittedAt: sSaved?.submittedAt || null,
        draft: sDraft
      });
      sIdx++;
    }
  }

  return sessions;
}

/**
 * API Route: Get Appointment Sessions Configuration (Admin)
 */
app.get('/api/admin/appointment-sessions/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { data: order, error } = await supabase
      .from('appointments')
      .select('id, drive_link, package_name, additional_notes, custom_fees, photo_selections, resepsi_date, event_date')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { data: allPkgs } = await supabase
      .from('packages')
      .select('title, description, category');

    const sessions = buildOrderSessions(order, allPkgs || []);
    const hasCustomConfig = Boolean(order.photo_selections && Array.isArray(order.photo_selections.sessions_config) && order.photo_selections.sessions_config.length > 0);

    res.json({
      success: true,
      sessions,
      hasCustomConfig,
      drive_link: order.drive_link || ''
    });
  } catch (err) {
    console.error('[Admin] Error fetching appointment sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * API Route: Save Appointment Sessions Configuration (Admin)
 */
app.post('/api/admin/save-sessions-config', requireAuth, async (req, res) => {
  try {
    const { orderId, sessions_config, drive_link } = req.body;
    if (!orderId || !Array.isArray(sessions_config)) {
      return res.status(400).json({ error: 'Invalid payload: orderId and sessions_config array required' });
    }

    const { data: curApt, error: fetchErr } = await supabase
      .from('appointments')
      .select('photo_selections, drive_link')
      .eq('id', orderId)
      .single();

    if (fetchErr) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const curSelections = (curApt && curApt.photo_selections) || {};
    const updateData = {
      photo_selections: {
        ...curSelections,
        sessions_config
      }
    };
    if (typeof drive_link === 'string' && drive_link.trim()) {
      updateData.drive_link = drive_link.trim();
    }

    const { error: updateErr } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', orderId);

    if (updateErr) {
      return res.status(500).json({ error: 'Failed to update sessions config: ' + updateErr.message });
    }

    res.json({ success: true, message: 'Konfigurasi sesi berhasil disimpan!' });
  } catch (err) {
    console.error('[Admin] Error saving sessions config:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * API Route: Get Photos from Google Drive Folder for Client Portal (Supports Multi-Package Sessions)
 */
app.get('/api/drive-folder-photos/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { subfolderId } = req.query;
  
  try {
    const { data: order, error } = await supabase
      .from('appointments')
      .select('id, drive_link, package_name, additional_notes, custom_fees, photo_selections, resepsi_date, event_date')
      .eq('id', orderId)
      .single();

    if (error || !order || !order.drive_link) {
      return res.status(404).json({ error: 'Order or Drive link not found' });
    }

    // Fetch all packages to detect photo limits & deadlines
    const { data: allPkgs } = await supabase
      .from('packages')
      .select('title, description, category');

    const sessions = buildOrderSessions(order, allPkgs || []);
    const photoLimit = sessions.reduce((acc, s) => acc + s.limit, 0);

    const folderId = extractDriveFolderId(order.drive_link);
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Drive link format' });
    }

    const targetFolderId = subfolderId || folderId;

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Drive API Key is not configured' });
    }

    // Call Google Drive API
    const response = await axios.get(`https://www.googleapis.com/drive/v3/files`, {
      params: {
        q: `'${targetFolderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`,
        fields: 'files(id, name, mimeType, thumbnailLink)',
        key: apiKey,
        pageSize: 1000
      }
    });

    // Build reliable public thumbnail URLs and sort folders first
    const files = response.data.files.map(file => {
      let thumb = file.thumbnailLink;
      if (thumb) {
        if (thumb.includes('=s')) {
          thumb = thumb.replace(/=s\d+$/, '=s400');
        } else {
          thumb = `${thumb}=s400`;
        }
      } else {
        thumb = file.mimeType !== 'application/vnd.google-apps.folder' 
          ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`
          : null;
      }

      let largeThumb = file.thumbnailLink;
      if (largeThumb) {
        if (largeThumb.includes('=s')) {
          largeThumb = largeThumb.replace(/=s\d+$/, '=s1200');
        } else {
          largeThumb = `${largeThumb}=s1200`;
        }
      } else {
        largeThumb = file.mimeType !== 'application/vnd.google-apps.folder' 
          ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`
          : null;
      }

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: thumb,
        largeThumbnailLink: largeThumb
      };
    }).sort((a, b) => {
      const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder' ? 0 : 1;
      const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder' ? 0 : 1;
      return aIsFolder - bIsFolder;
    });

    res.json({
      success: true,
      files,
      original_drive_link: order.drive_link,
      package_name: order.package_name,
      photo_limit: photoLimit,
      packages_sessions: sessions,
      photo_selections: order.photo_selections || null,
      drafts: (order.photo_selections && order.photo_selections.drafts) ? order.photo_selections.drafts : {}
    });
  } catch (err) {
    console.error('[Drive API] Error fetching photos:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch photos from Drive' });
  }
});

/**
 * API Route: Image Proxy for Google Drive Thumbnails
 */
app.get('/api/drive-image-proxy/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const { sz } = req.query;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey || !fileId) return res.status(400).send('Bad Request');

  try {
    const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${sz === '1200' ? '1200' : '400'}`;
    const imgRes = await axios.get(thumbUrl, { 
      responseType: 'stream', 
      validateStatus: (status) => status === 200,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });

    res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return imgRes.data.pipe(res);
  } catch (err) {
    try {
      const fileRes = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`, {
        responseType: 'stream'
      });
      res.setHeader('Content-Type', fileRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return fileRes.data.pipe(res);
    } catch (e) {
      return res.status(404).send('Image unavailable');
    }
  }
});

/**
 * API Route: Direct Download for Original Full-Resolution File from Google Drive
 */
app.get('/api/drive-download/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const fileName = req.query.name ? req.query.name.toString() : 'photo.jpg';
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey || !fileId) return res.status(400).send('Bad Request');

  try {
    const fileRes = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`, {
      responseType: 'stream',
      validateStatus: (status) => status === 200
    });

    const safeName = fileName.replace(/["\r\n]/g, '_');
    const encodedName = encodeURIComponent(safeName);

    res.setHeader('Content-Type', fileRes.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
    if (fileRes.headers['content-length']) {
      res.setHeader('Content-Length', fileRes.headers['content-length']);
    }

    return fileRes.data.pipe(res);
  } catch (err) {
    console.warn('[Drive Download] Streaming via API failed, redirecting to direct Google export:', err.message);
    return res.redirect(`https://drive.google.com/uc?export=download&id=${fileId}`);
  }
});

/**
 * API Route: Submit Photo Selection (Supports Multi-Package Sessions)
 */
app.post('/api/submit-photo-selection', async (req, res) => {
  const { orderId, sessionId, sessionTitle, selectedPhotos, extraPhotosCount } = req.body;
  if (!orderId || !selectedPhotos || !Array.isArray(selectedPhotos)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    // 1. Fetch current order
    const { data: order } = await supabase
      .from('appointments')
      .select('additional_notes, status, client_name, package_name, id, drive_link, client_email, photo_selections')
      .eq('id', orderId)
      .single();

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // 2. Prepare multi-session photo selections object
    const existingSelections = order.photo_selections || {};
    let currentSessions = {};
    if (existingSelections.sessions && typeof existingSelections.sessions === 'object') {
      currentSessions = { ...existingSelections.sessions };
    } else if (existingSelections.photos && Array.isArray(existingSelections.photos)) {
      // Legacy format migration
      currentSessions['session-1'] = {
        sessionId: 'session-1',
        sessionTitle: order.package_name || 'Paket Utama',
        photos: existingSelections.photos,
        extraCount: existingSelections.extraCount || 0,
        photoNotes: existingSelections.photoNotes || {},
        status: 'Terkirim',
        submittedAt: existingSelections.lastUpdated || new Date().toISOString()
      };
    }

    const targetSessionId = sessionId || 'session-1';
    const targetTitle = sessionTitle || order.package_name || 'Paket Foto';

    // Izinkan pengiriman baru maupun pembaruan (update) jika klien mengubah foto
    const isUpdate = Boolean(currentSessions[targetSessionId] && currentSessions[targetSessionId].status === 'Terkirim');
    if (isUpdate) {
      console.log(`[Portal] Updating existing photo selection for order ${orderId} (${targetTitle})`);
    }

    currentSessions[targetSessionId] = {
      sessionId: targetSessionId,
      sessionTitle: targetTitle,
      photos: selectedPhotos,
      extraCount: extraPhotosCount ? Number(extraPhotosCount) : 0,
      photoNotes: req.body.photoNotes || {},
      submittedAt: new Date().toISOString(),
      status: 'Terkirim'
    };

    // Combine all sessions' photos into combined array for backwards compatibility
    const allPhotos = Object.values(currentSessions).flatMap(s => s.photos || []);
    const allExtra = Object.values(currentSessions).reduce((sum, s) => sum + (s.extraCount || 0), 0);

    const updatedPhotoSelections = {
      ...(existingSelections.sessions_config ? { sessions_config: existingSelections.sessions_config } : {}),
      ...(existingSelections.drafts ? { drafts: existingSelections.drafts } : {}),
      sessions: currentSessions,
      photos: allPhotos,
      extraCount: allExtra,
      lastUpdated: new Date().toISOString()
    };

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        photo_selections: updatedPhotoSelections
      })
      .eq('id', orderId);

    if (updateErr) throw updateErr;

    console.log(`[Portal] Photo selection saved for order ${orderId} (${targetTitle}: ${selectedPhotos.length} photos)`);

    // 3. Update or Create editor assignment
    let { data: assignment, error: assErr } = await supabase
      .from('editor_assignments')
      .select('*')
      .eq('appointment_id', orderId)
      .maybeSingle();

    if (assErr) {
      console.error('[Portal] Failed to query editor assignment:', assErr);
    } else {
      const selectedListStr = selectedPhotos.map(p => p.name).join(', ');
      const todayStr = new Date().toISOString().split('T')[0];

      // Determine package deadline and category
      let deadlineDays = 30; // fallback
      let pkgCategory = '';
      let isStudio = false;
      if (order && order.package_name) {
        try {
          const { data: pkg } = await supabase
            .from('packages')
            .select('category, description')
            .eq('title', order.package_name)
            .maybeSingle();
          if (pkg) {
            pkgCategory = pkg.category || '';
            const matchEditor = (pkg.description || '').match(/\[DEADLINE_EDITOR\]:\s*(\d+)/i);
            const match = (pkg.description || '').match(/\[DEADLINE\]:\s*(\d+)/i);
            if (matchEditor) {
              deadlineDays = parseInt(matchEditor[1], 10);
            } else if (match) {
              const totalDays = parseInt(match[1], 10);
              deadlineDays = totalDays > 15 ? totalDays - 15 : Math.max(1, Math.round(totalDays / 2));
            } else {
              const studioCategories = ['Studio Lapanbelas', 'Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'];
              if (studioCategories.includes(pkgCategory)) {
                deadlineDays = 7;
              } else if (pkgCategory === 'Wedding' || pkgCategory === 'Pre-Wedding' || pkgCategory === 'lapanbelas.id') {
                deadlineDays = 30;
              }
            }
            const studioCategoriesForAssign = ['Studio Lapanbelas', 'Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'];
            isStudio = studioCategoriesForAssign.includes(pkgCategory);
          }
        } catch (pkgErr) {
          console.error('[Portal] Failed to fetch package details for deadline:', pkgErr);
        }
      }

      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + deadlineDays);
      const computedDeadline = baseDate.toISOString().split('T')[0];

      if (assignment) {
        // Update existing assignment
        let parts = ['', '', '', ''];
        if (assignment.file_code && assignment.file_code.includes(' || ')) {
          parts = assignment.file_code.split(' || ');
        } else {
          parts[0] = assignment.file_code || '';
        }

        // Format session-aware file code list
        const sessionFileCode = Object.values(currentSessions)
          .map(s => `[${s.sessionTitle}]: ${(s.photos || []).map(p => p.name).join(', ')}`)
          .join('\n');

        parts[0] = sessionFileCode;
        parts[3] = todayStr; // Update selection date
        
        // Copy Google Drive link if empty
        if ((!parts[2] || !parts[2].trim()) && order.drive_link) {
          parts[2] = order.drive_link;
        }
        
        const newFileCode = parts.join(' || ');

        const { error: updateAssErr } = await supabase
          .from('editor_assignments')
          .update({
            file_code: newFileCode,
            status_foto: 'Antrian Pengerjaan',
            deadline: computedDeadline,
            qty: allPhotos.length
          })
          .eq('appointment_id', orderId);

        if (updateAssErr) {
          console.error('[Portal] Failed to update editor assignment:', updateAssErr);
        } else {
          assignment.file_code = newFileCode;
          assignment.status_foto = 'Antrian Pengerjaan';
          assignment.deadline = computedDeadline;
          assignment.qty = allPhotos.length;
          console.log(`[Portal] Editor assignment updated for order ${orderId} (${targetTitle}: status_foto -> Antrian Pengerjaan, total_qty -> ${allPhotos.length})`);
        }
      } else {
        // Auto Create new assignment
        const defaultEditorName = isStudio ? 'EDITOR PHOTO STUDIO' : 'EDITOR PHOTO 18';
        const sessionFileCode = `[${targetTitle}]: ${selectedListStr}`;
        const newFileCode = `${sessionFileCode} ||  || ${order.drive_link || ''} || ${todayStr}`;
        const newAssignment = {
          appointment_id: orderId,
          editor_name: defaultEditorName,
          status_foto: 'Antrian Pengerjaan',
          file_code: newFileCode,
          deadline: computedDeadline,
          qty: selectedPhotos.length
        };
        
        const { data: createdAssignment, error: createAssErr } = await supabase
          .from('editor_assignments')
          .insert([newAssignment])
          .select()
          .single();
          
        if (createAssErr) {
          console.error('[Portal] Failed to create editor assignment:', createAssErr);
        } else {
          assignment = createdAssignment;
          console.log(`[Portal] Auto-created editor assignment for order ${orderId} -> Editor: ${defaultEditorName}, Deadline: ${computedDeadline}`);
        }
      }

      // 4. Send email notification to the assigned editor
      if (assignment) {
        const editorName = assignment.editor_name ? assignment.editor_name.split(' || ')[0]?.trim() : '';
        if (editorName) {
          const { data: editorUser, error: edErr } = await supabase
            .from('admin_users')
            .select('username')
            .eq('display_name', editorName)
            .maybeSingle();

          if (edErr) {
            console.error('[Portal] Failed to query editor details:', edErr);
          } else if (editorUser && editorUser.username) {
            try {
              const subject = `[📸 Seleksi Foto: ${targetTitle}] Klien #${orderId} - ${order.client_name}`;
              const appUrl = process.env.APP_URL || 'http://localhost:3000';
              const htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; background-color: #010605; color: #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #010605 100%); padding: 35px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LAPANBELAS.ID</h1>
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: #a78bfa; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Creative Photo &amp; Video Studio</p>
                  </div>

                  <!-- Main Content -->
                  <div style="padding: 35px 25px;">
                    <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Halo ${editorName},</h2>
                    <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                      Klien telah selesai melakukan pemilihan foto untuk sesi: <strong style="color: #a78bfa;">${targetTitle}</strong>
                    </p>

                    <!-- Order Info Box -->
                    <div style="background-color: #070d0b; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin: 25px 0;">
                      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 40%;">ID Pesanan</td>
                          <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600; font-family: monospace;">#${orderId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Nama Klien</td>
                          <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">${order.client_name || '-'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Sesi Paket</td>
                          <td style="padding: 8px 0; color: #38bdf8; font-weight: 600;">${targetTitle}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Deadline Pengerjaan</td>
                          <td style="padding: 8px 0; color: #ef4444; font-weight: 700;">${safeFormatDateID(computedDeadline)} (${deadlineDays} Hari)</td>
                        </tr>
                      </table>
                    </div>

                    <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                      Status pengerjaan foto klien masuk dalam <strong>Antrian Pengerjaan</strong>. Silakan segera buka Dasbor Admin untuk memproses editing foto pilihan klien.
                    </p>

                    <!-- Button to Admin Dashboard -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${appUrl}/admin" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; font-weight: 700; padding: 16px 40px; border-radius: 30px; text-decoration: none; font-size: 14px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(124,58,237,0.4); text-transform: uppercase;">
                        🖥️ Buka Dasbor Admin
                      </a>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #070d0b; border-top: 1px solid #1e293b; padding: 25px 20px; text-align: center; color: #64748b; font-size: 11px;">
                    <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 500;">LAPANBELAS.ID Creative Team Notification System</p>
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} LAPANBELAS.ID. All rights reserved.</p>
                  </div>
                </div>
              `;

              // Determine mailer based on package category or name
              let activeTransporter = transporter;
              let fromEmail = process.env.EMAIL_USER;
              
              const pkgCategoryLower = pkgCategory.toLowerCase();
              const pkgNameLower = (order.package_name || '').toLowerCase();
              if (pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') || 
                  ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k))) {
                activeTransporter = transporterStudio;
                fromEmail = process.env.EMAIL_STUDIO_USER;
              }

              // Kirim notifikasi email secara asynchronous (background) agar klien langsung mendapatkan respon cepat
              activeTransporter.sendMail({
                from: `"LAPANBELAS.ID" <${fromEmail}>`,
                to: editorUser.username,
                subject: subject,
                html: htmlBody
              }).then(() => {
                console.log(`[Email] Sent photo selection completion notification email to editor ${editorUser.username} for order ${orderId}`);
              }).catch(emailErr => {
                console.error('[Email] Failed to send photo selection notification email to editor:', emailErr);
              });
            } catch (prepErr) {
              console.error('[Email] Failed to prepare photo selection notification email to editor:', prepErr);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Pilihan foto untuk ${targetTitle} berhasil dikirim!`
    });
  } catch (err) {
    console.error('[Portal API] Error submitting photo selection:', err);
    res.status(500).json({ error: err.message || 'Failed to submit photo selection' });
  }
});

/**
 * API Route: Save Client Photo Selection Draft (Cloud Auto-Sync)
 */
app.post('/api/save-photo-draft', async (req, res) => {
  const { orderId, sessionId, selectedPhotos, shortlistedIds, photoNotes, extraPhotosCount } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const targetSessionId = sessionId || 'session-1';

  try {
    const { data: order, error } = await supabase
      .from('appointments')
      .select('id, photo_selections')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const existingSelections = order.photo_selections || {};
    const existingDrafts = existingSelections.drafts || {};

    // Don't overwrite if session is already finalized and submitted
    const isSubmitted = existingSelections.sessions?.[targetSessionId]?.status === 'Terkirim';

    const nowIso = new Date().toISOString();
    existingDrafts[targetSessionId] = {
      selectedPhotos: Array.isArray(selectedPhotos) ? selectedPhotos : [],
      shortlistedIds: Array.isArray(shortlistedIds) ? shortlistedIds : [],
      photoNotes: photoNotes && typeof photoNotes === 'object' ? photoNotes : {},
      extraPhotosCount: typeof extraPhotosCount === 'number' ? extraPhotosCount : 0,
      updatedAt: nowIso
    };

    const updatedPhotoSelections = {
      ...existingSelections,
      drafts: existingDrafts,
      lastDraftSavedAt: nowIso
    };

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({ photo_selections: updatedPhotoSelections })
      .eq('id', orderId);

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      updatedAt: nowIso,
      isSubmitted
    });
  } catch (err) {
    console.error('[Portal Draft API] Error saving draft:', err);
    res.status(500).json({ error: err.message || 'Failed to save draft' });
  }
});

/**
 * API Route: Lightweight Fetch Draft & Status (Fast Cloud Sync for Multiple Devices)
 */
app.get('/api/client-portal-draft/:orderId', async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) return res.status(400).json({ error: 'Order ID required' });

  try {
    const { data: order, error } = await supabase
      .from('appointments')
      .select('id, photo_selections')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const selections = order.photo_selections || {};
    res.json({
      success: true,
      drafts: selections.drafts || {},
      sessions: selections.sessions || {},
      lastUpdated: selections.lastUpdated || selections.lastDraftSavedAt || null
    });
  } catch (err) {
    console.error('[Portal Draft API] Error fetching draft:', err);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Reload server to apply new environment variables from .env: Device ID updated to D-P5DOG

/**
 * ============================================================================
 * GOOGLE CALENDAR INTEGRATION & REALTIME SYNC (OPSI A) + ICAL FEED
 * ============================================================================
 */

function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  return encodedSource.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Mendapatkan OAuth2 Access Token dari Google API menggunakan Service Account
 */
async function getGoogleCalendarAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) return null;

  try {
    privateKey = privateKey.replace(/\\n/g, '\n');

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedClaimSet = base64url(JSON.stringify(claimSet));
    const signInput = `${encodedHeader}.${encodedClaimSet}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer.sign(privateKey, 'base64')
      .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${signInput}.${signature}`;

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', jwt);

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000
    });

    return tokenRes.data.access_token;
  } catch (err) {
    console.error('[Google Calendar] Failed to obtain access token:', err.response ? err.response.data : err.message);
    return null;
  }
}

/**
 * Sinkronisasi Event Jadwal ke Google Calendar (Realtime Push)
 */
async function syncGoogleCalendarEvent(order, action = 'upsert') {
  if (!order || !order.event_date) return false;

  const accessToken = await getGoogleCalendarAccessToken();
  if (!accessToken) {
    // Credentials not set or invalid, graceful skip (iCal remains active)
    return false;
  }

  const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary');

  const notesStr = order.additional_notes || order.notes || '';
  const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
  const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/i);
  const pkgNameLower = (order.package_name || '').toLowerCase();
  const divisionVal = order.division || (divisiMatch ? divisiMatch[1].trim() : '');

  const isExplicitWedding = divisionVal.toLowerCase().includes('lapanbelas.id') || ['wedding', 'akad', 'resepsi', 'postwed', 'prewed', 'engagement', 'lamaran', 'syukuran', 'unduh'].some(k => pkgNameLower.includes(k));

  const isStudioOrder = !isExplicitWedding && (
    !!roomMatch || 
    divisionVal.toLowerCase().includes('studio') || 
    ['wisuda', 'self photo', 'photobox', 'pas photo', 'studio'].some(k => pkgNameLower.includes(k))
  );

  let eventLocation = '';
  let displayLocation = '';
  let roomName = '';

  if (isStudioOrder) {
    roomName = roomMatch ? roomMatch[1].trim() : 'Studio Lapanbelas';
    displayLocation = `Studio Lapanbelas${roomMatch ? ' (' + roomMatch[1].trim() + ')' : ''}`;
    eventLocation = 'Studio Lapanbelas, Kota Langsa';
  } else {
    roomName = divisionVal || 'Wedding';
    const clientAddr = (order.client_address || order.customer_address || '').trim();
    displayLocation = clientAddr || 'Lokasi Acara Klien';
    eventLocation = clientAddr || 'Kota Langsa';
  }

  let timeStr = order.jam_akad ? order.jam_akad.slice(0, 5) : '09:00';
  const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
  if (jamMatch) timeStr = jamMatch[1].trim();

  let durationMin = 60;
  const durMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
  if (durMatch) durationMin = parseInt(durMatch[1].trim(), 10);

  // Hitung start time & end time (WIB +07:00)
  const [hours, minutes] = timeStr.split(':').map(Number);
  const startHour = isNaN(hours) ? 9 : hours;
  const startMin = isNaN(minutes) ? 0 : minutes;

  const startPadH = String(startHour).padStart(2, '0');
  const startPadM = String(startMin).padStart(2, '0');

  const totalMinutesEnd = startHour * 60 + startMin + durationMin;
  const endHour = Math.floor(totalMinutesEnd / 60) % 24;
  const endMin = totalMinutesEnd % 60;
  const endPadH = String(endHour).padStart(2, '0');
  const endPadM = String(endMin).padStart(2, '0');

  const startIso = `${order.event_date}T${startPadH}:${startPadM}:00+07:00`;
  const endIso = `${order.event_date}T${endPadH}:${endPadM}:00+07:00`;

  const clientName = (order.client_name || order.customer_name || 'Klien').trim();
  const pkgClean = (order.package_name || 'Booking').replace(/\s*package/i, '');
  let summary = `${clientName} (${pkgClean})`;
  if (isStudioOrder && roomMatch && roomMatch[1]) {
    const shortRoom = roomMatch[1].trim().replace('Room ', 'R.');
    summary = `[${shortRoom}] ${clientName} (${pkgClean})`;
  }
  const description = [
    `ID Pesanan: #${order.id}`,
    `Klien: ${order.client_name || order.customer_name || '-'}`,
    `WhatsApp: ${order.client_phone || order.customer_phone || order.customer_whatsapp || '-'}`,
    `Email: ${order.client_email || order.customer_email || '-'}`,
    `Paket: ${order.package_name || '-'}`,
    `Status: ${order.status || 'Sudah DP'}`,
    `Total: Rp ${Number(order.invoice_total || order.total || order.total_amount || 0).toLocaleString('id-ID')}`,
    isStudioOrder ? `Ruangan Studio: ${displayLocation}` : `Alamat / Lokasi Acara: ${displayLocation}`,
    order.additional_notes ? `\nCatatan:\n${order.additional_notes}` : ''
  ].filter(Boolean).join('\n');

  const iCalUID = `order-${order.id}@lapanbelas.id`;

  const eventPayload = {
    summary: summary,
    description: description,
    location: eventLocation,
    start: { dateTime: startIso, timeZone: 'Asia/Jakarta' },
    end: { dateTime: endIso, timeZone: 'Asia/Jakarta' },
    iCalUID: iCalUID,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 1440 }
      ]
    }
  };

  try {
    const searchRes = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { iCalUID: iCalUID },
      timeout: 8000
    });

    const existingEvents = searchRes.data && searchRes.data.items ? searchRes.data.items : [];
    if (existingEvents.length > 0) {
      const existingId = existingEvents[0].id;
      await axios.patch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingId}`, eventPayload, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 8000
      });
      console.log(`[Google Calendar] Updated event for Order #${order.id} on Google Calendar`);
    } else {
      await axios.post(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, eventPayload, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 8000
      });
      console.log(`[Google Calendar] Inserted new event for Order #${order.id} on Google Calendar`);
    }
    return true;
  } catch (apiErr) {
    console.error('[Google Calendar] API error syncing event:', apiErr.response ? apiErr.response.data : apiErr.message);
    return false;
  }
}

/**
 * Sinkronisasi Ketersediaan Tanggal (Date Availability) ke Google Calendar (All-Day Event)
 * MODE MINIMALIS:
 * - HANYA membuat banner merah all-day jika kuota PENUH (🔴) atau DITUTUP ADMIN (⛔)
 * - Jika tanggal masih tersedia / ada sisa slot, HAPUS banner dari Google Calendar agar kalender bersih dan rapi
 */
async function syncDateAvailabilityToCalendar(dateStr, slotsBooked = 0, maxSlots = 3, isClosed = false) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const accessToken = await getGoogleCalendarAccessToken();
  if (!accessToken) return false;

  const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary');
  const iCalUID = `avail-${dateStr}@lapanbelas.id`;

  // Hitung tanggal esok hari (exclusive end date untuk all-day event Google Calendar)
  const d = new Date(dateStr + 'T00:00:00Z');
  const nextD = new Date(d.getTime() + 86400000);
  const nextDateStr = nextD.toISOString().split('T')[0];

  // Cari event yang sudah ada dengan iCalUID ini
  let existingId = null;
  try {
    const searchRes = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { iCalUID: iCalUID },
      timeout: 8000
    });
    if (searchRes.data && searchRes.data.items && searchRes.data.items.length > 0) {
      existingId = searchRes.data.items[0].id;
    }
  } catch (err) {
    console.error(`[Google Calendar Avail] Search error for ${dateStr}:`, err.response ? err.response.data : err.message);
  }

  // Jika tanggal TIDAK ditutup dan TIDAK penuh (masih tersedia), HAPUS banner dari kalender agar rapi
  if (!isClosed && slotsBooked < maxSlots) {
    if (existingId) {
      try {
        await axios.delete(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 8000
        });
        console.log(`[Google Calendar Avail] Cleaned up banner for open date ${dateStr}`);
      } catch (delErr) {
        console.error(`[Google Calendar Avail] Delete error for ${dateStr}:`, delErr.response ? delErr.response.data : delErr.message);
      }
    }
    return true;
  }

  // Siapkan ringkasan event all-day HANYA untuk PENUH atau DITUTUP
  let summary = '';
  let description = '';
  const colorId = '11'; // Red
  const transparency = 'opaque';

  if (isClosed) {
    summary = `⛔ [DITUTUP] Ditutup (${dateStr})`;
    description = `Tanggal: ${dateStr}\nStatus: Ditutup Manual oleh Admin.\nKeterangan: Tidak menerima pemesanan sesi foto / wedding pada tanggal ini.`;
  } else {
    summary = `🔴 [PENUH] Kuota Penuh (${slotsBooked}/${maxSlots} Slot)`;
    description = `Tanggal: ${dateStr}\nStatus: Kuota Penuh (${slotsBooked}/${maxSlots} Slot Terisi).\nPemesanan baru otomatis ditutup oleh sistem.`;
  }

  const eventPayload = {
    summary,
    description,
    start: { date: dateStr },
    end: { date: nextDateStr },
    iCalUID,
    colorId,
    transparency
  };

  try {
    if (existingId) {
      await axios.patch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingId}`, eventPayload, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 8000
      });
      console.log(`[Google Calendar Avail] Updated availability event for ${dateStr}`);
    } else {
      await axios.post(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, eventPayload, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 8000
      });
      console.log(`[Google Calendar Avail] Created availability event for ${dateStr}`);
    }
    return true;
  } catch (apiErr) {
    console.error(`[Google Calendar Avail] API error for ${dateStr}:`, apiErr.response ? apiErr.response.data : apiErr.message);
    return false;
  }
}


/**
 * API Route: iCal Feed (.ics) - Sinkronisasi Universal ke Google Calendar / Apple / Outlook
 */
app.get('/api/calendar-feed.ics', async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .in('status', ['Sudah DP', 'Lunas'])
      .order('event_date', { ascending: true });

    if (error) {
      console.error('[iCal Feed] Supabase error:', error);
      return res.status(500).send('Error generating calendar feed');
    }

    const now = new Date();
    const stampStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//18Studio//Lapanbelas Booking Calendar//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Lapanbelas Studio & Wedding Schedule',
      'X-WR-TIMEZONE:Asia/Jakarta'
    ];

    (appointments || []).forEach(appt => {
      if (!appt.event_date) return;

      const notesStr = appt.additional_notes || '';
      const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
      const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/i);
      const pkgNameLower = (appt.package_name || '').toLowerCase();
      const divisionVal = appt.division || (divisiMatch ? divisiMatch[1].trim() : '');

      const isExplicitWedding = divisionVal.toLowerCase().includes('lapanbelas.id') || ['wedding', 'akad', 'resepsi', 'postwed', 'prewed', 'engagement', 'lamaran', 'syukuran', 'unduh'].some(k => pkgNameLower.includes(k));

      const isStudio = !isExplicitWedding && (
        !!roomMatch || 
        divisionVal.toLowerCase().includes('studio') || 
        ['wisuda', 'self photo', 'photobox', 'pas photo', 'studio'].some(k => pkgNameLower.includes(k))
      );

      const locationStr = isStudio
        ? `Studio Lapanbelas${roomMatch ? ' (' + roomMatch[1].trim() + ')' : ''}`
        : ((appt.client_address || appt.customer_address || '').trim() || 'Kota Langsa');

      let timeStr = appt.jam_akad ? appt.jam_akad.slice(0, 5) : '09:00';
      const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
      if (jamMatch) timeStr = jamMatch[1].trim();

      let durationMin = 60;
      const durMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
      if (durMatch) durationMin = parseInt(durMatch[1].trim(), 10);

      const [hours, minutes] = timeStr.split(':').map(Number);
      const h = isNaN(hours) ? 9 : hours;
      const m = isNaN(minutes) ? 0 : minutes;

      const dateClean = appt.event_date.replace(/-/g, '');
      const startClean = `${dateClean}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;

      const totalMinEnd = h * 60 + m + durationMin;
      const endH = Math.floor(totalMinEnd / 60) % 24;
      const endM = totalMinEnd % 60;
      const endClean = `${dateClean}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

      const apptClientName = (appt.client_name || appt.customer_name || 'Klien').trim();
      const apptClientPhone = appt.client_phone || appt.customer_phone || '-';
      const pkgClean = (appt.package_name || 'Booking').replace(/\s*package/i, '');
      let summary = `${apptClientName} (${pkgClean})`;
      if (roomMatch && roomMatch[1]) {
        const shortRoom = roomMatch[1].trim().replace('Room ', 'R.');
        summary = `[${shortRoom}] ${apptClientName} (${pkgClean})`;
      }
      const desc = `Pesanan #${appt.id} | Klien: ${apptClientName} (${apptClientPhone}) | Status: ${appt.status} | Lokasi: ${locationStr}`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:order-${appt.id}@lapanbelas.id`);
      icsContent.push(`DTSTAMP:${stampStr}`);
      icsContent.push(`DTSTART;TZID=Asia/Jakarta:${startClean}`);
      icsContent.push(`DTEND;TZID=Asia/Jakarta:${endClean}`);
      icsContent.push(`SUMMARY:${summary.replace(/\n/g, ' ')}`);
      icsContent.push(`DESCRIPTION:${desc.replace(/\n/g, '\\n')}`);
      icsContent.push(`LOCATION:${locationStr.replace(/\n/g, ' ')}`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="lapanbelas-schedule.ics"');
    res.send(icsContent.join('\r\n'));
  } catch (e) {
    console.error('[iCal Feed] Unexpected error:', e);
    res.status(500).send('Error generating calendar feed');
  }
});

/**
 * API Route: Status Koneksi Google Calendar (Untuk Admin Settings)
 */
app.get('/api/calendar/status', async (req, res) => {
  const hasServiceEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const feedUrl = `${APP_URL}/api/calendar-feed.ics`;
  const availFeedUrl = `${APP_URL}/api/calendar-availability.ics`;

  res.json({
    realtime_api_configured: hasServiceEmail && hasKey,
    calendar_id: calendarId,
    service_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
    feed_url: feedUrl,
    availability_feed_url: availFeedUrl
  });
});

/**
 * API Route: Manual Bulk Sync ke Google Calendar (Admin Only)
 */
app.post('/api/calendar/sync-all', requireAuth, async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .in('status', ['Sudah DP', 'Lunas'])
      .order('event_date', { ascending: true });

    if (error) throw error;

    let syncedCount = 0;
    for (const appt of appointments || []) {
      const ok = await syncGoogleCalendarEvent(appt, 'upsert');
      if (ok) syncedCount++;
    }

    res.json({
      success: true,
      message: `Berhasil sinkronisasi ${syncedCount} jadwal ke Google Calendar`,
      total: (appointments || []).length,
      synced: syncedCount
    });
  } catch (err) {
    console.error('[Google Calendar Bulk Sync Error]:', err);
    res.status(500).json({ error: err.message || 'Bulk sync failed' });
  }
});

/**
 * API Route: Sinkronisasi 1 Tanggal Ketersediaan ke Google Calendar Realtime
 */
app.post('/api/calendar/sync-date', requireAuth, async (req, res) => {
  const { date, slots_booked, max_slots, is_manually_closed } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Parameter date wajib diisi' });
  }

  try {
    const ok = await syncDateAvailabilityToCalendar(
      date,
      Number(slots_booked || 0),
      Number(max_slots || 3),
      Boolean(is_manually_closed)
    );
    res.json({
      success: ok,
      message: ok
        ? `Ketersediaan tanggal ${date} berhasil disinkronkan ke Google Calendar`
        : `Google Calendar belum terkonfigurasi atau sinkronisasi dilewati.`
    });
  } catch (err) {
    console.error('[Google Calendar Sync Date Error]:', err);
    res.status(500).json({ error: err.message || 'Gagal sinkronisasi tanggal' });
  }
});

/**
 * API Route: Bulk Sync Seluruh Data Ketersediaan Slot ke Google Calendar
 */
app.post('/api/calendar/sync-availability', requireAuth, async (req, res) => {
  try {
    const { data: pkgs } = await supabase.from('packages').select('*');
    const pkgMap = {};
    if (pkgs) pkgs.forEach(p => { pkgMap[p.title] = p; });

    const [availsRes, apptsRes] = await Promise.all([
      supabase.from('date_availability').select('*'),
      supabase.from('appointments').select('*').not('status', 'in', '("Dibatalkan","Batal")')
    ]);
    if (availsRes.error) throw availsRes.error;
    if (apptsRes.error) throw apptsRes.error;

    // Filter appointment wedding (lapanbelas.id) agar sesuai dengan tampilan kalender Date Available
    const weddingAppts = (apptsRes.data || []).filter(a => {
      const pkg = pkgMap[a.package_name];
      const pkgNameLower = (pkg?.title || a.package_name || '').toLowerCase();
      const pkgCatLower = (pkg?.category || '').toLowerCase();
      const isStudio = pkgCatLower.includes('studio') || pkgNameLower.includes('studio') || ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCatLower.includes(k) || pkgNameLower.includes(k));
      return !isStudio;
    });

    const countMap = {};
    weddingAppts.forEach(a => {
      if (a.event_date) countMap[a.event_date] = (countMap[a.event_date] || 0) + 1;
      if (a.resepsi_date && a.resepsi_date !== a.event_date) countMap[a.resepsi_date] = (countMap[a.resepsi_date] || 0) + 1;
    });

    const availMap = {};
    (availsRes.data || []).forEach(av => {
      availMap[av.date] = av;
    });

    const allDates = Array.from(new Set([...Object.keys(countMap), ...Object.keys(availMap)])).sort();

    let syncedCount = 0;
    for (const d of allDates) {
      const av = availMap[d] || {};
      const maxSlots = av.max_slots || 3;
      const isClosed = !!av.is_manually_closed;
      const bookedCount = countMap[d] || 0;

      // Sinkronkan semua tanggal yang ditutup admin atau memiliki booking (penuh maupun ada sisa slot)
      if (isClosed || bookedCount > 0) {
        const ok = await syncDateAvailabilityToCalendar(d, bookedCount, maxSlots, isClosed);
        if (ok) syncedCount++;
      }
    }

    res.json({
      success: true,
      message: `Berhasil sinkronisasi ${syncedCount} status ketersediaan ke Google Calendar`,
      synced: syncedCount,
      total_dates: allDates.length
    });
  } catch (err) {
    console.error('[Google Calendar Sync Availability Error]:', err);
    res.status(500).json({ error: err.message || 'Bulk sync ketersediaan gagal' });
  }
});

/**
 * API Route: Dedicated iCal Feed (.ics) untuk Ketersediaan Slot & Tanggal Tutup
 */
app.get('/api/calendar-availability.ics', async (req, res) => {
  try {
    const [availsRes, apptsRes] = await Promise.all([
      supabase.from('date_availability').select('*'),
      supabase.from('appointments').select('event_date, resepsi_date, status').not('status', 'in', '("Dibatalkan","Batal")')
    ]);

    const countMap = {};
    (apptsRes.data || []).forEach(a => {
      if (a.event_date) countMap[a.event_date] = (countMap[a.event_date] || 0) + 1;
      if (a.resepsi_date && a.resepsi_date !== a.event_date) countMap[a.resepsi_date] = (countMap[a.resepsi_date] || 0) + 1;
    });

    const availMap = {};
    (availsRes.data || []).forEach(av => {
      availMap[av.date] = av;
    });

    const allDates = new Set([...Object.keys(countMap), ...Object.keys(availMap)]);
    const now = new Date();
    const stampStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//18Studio//Lapanbelas Slot Availability Feed//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Lapanbelas Studio - Ketersediaan Slot',
      'X-WR-TIMEZONE:Asia/Jakarta'
    ];

    for (const d of allDates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      const av = availMap[d] || {};
      const maxSlots = av.max_slots || 3;
      const isClosed = !!av.is_manually_closed;
      const bookedCount = countMap[d] !== undefined ? countMap[d] : (av.slots_booked || 0);

      if (!isClosed && bookedCount < maxSlots) continue;

      const [y, m, day] = d.split('-').map(Number);
      const nextD = new Date(Date.UTC(y, m - 1, day + 1)).toISOString().split('T')[0];

      const startClean = d.replace(/-/g, '');
      const endClean = nextD.replace(/-/g, '');

      let summary = '';
      let desc = '';
      if (isClosed) {
        summary = `⛔ [DITUTUP] Studio Ditutup (${d})`;
        desc = `Tanggal ditutup oleh Admin Lapanbelas Studio.`;
      } else {
        summary = `🔴 [PENUH] Kuota Penuh (${bookedCount}/${maxSlots})`;
        desc = `Slot pemesanan sudah habis (${bookedCount} dari ${maxSlots} slot terisi).`;
      }

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:avail-${d}@lapanbelas.id`);
      icsContent.push(`DTSTAMP:${stampStr}`);
      icsContent.push(`DTSTART;VALUE=DATE:${startClean}`);
      icsContent.push(`DTEND;VALUE=DATE:${endClean}`);
      icsContent.push(`SUMMARY:${summary}`);
      icsContent.push(`DESCRIPTION:${desc}`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('TRANSP:OPAQUE');
      icsContent.push('END:VEVENT');
    }

    icsContent.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="lapanbelas-availability.ics"');
    res.send(icsContent.join('\r\n'));
  } catch (err) {
    console.error('[iCal Availability Feed Error]:', err);
    res.status(500).send('Error generating availability calendar feed');
  }
});


/**
 * ============================================================================
 * FITUR RESCHEDULE BOOKING MANDIRI (SELF-SERVICE RESCHEDULE)
 * ============================================================================
 */
app.post('/api/reschedule-booking', async (req, res) => {
  const { order_id, new_date, new_time, reason, verification_contact } = req.body;

  if (!order_id || !new_date || !new_time) {
    return res.status(400).json({ error: 'Order ID, tanggal baru, dan jam baru wajib diisi.' });
  }

  try {
    // 1. Ambil data appointment
    const { data: curAppt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchErr || !curAppt) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan di database.' });
    }

    // 2. Verifikasi hak akses (Phone atau Email)
    if (verification_contact) {
      const cleanVerify = verification_contact.toString().replace(/[^0-9]/g, '');
      const cleanApptPhone = (curAppt.client_phone || '').replace(/[^0-9]/g, '');
      const cleanApptEmail = (curAppt.client_email || '').toLowerCase().trim();
      const inputVerifyLower = verification_contact.toString().toLowerCase().trim();

      const phoneMatch = cleanVerify && cleanApptPhone && (cleanApptPhone.endsWith(cleanVerify) || cleanVerify.endsWith(cleanApptPhone));
      const emailMatch = inputVerifyLower && cleanApptEmail && (inputVerifyLower === cleanApptEmail);

      if (!phoneMatch && !emailMatch) {
        return res.status(403).json({ error: 'Verifikasi gagal: Nomor WhatsApp atau Email tidak sesuai dengan data pemesan.' });
      }
    }

    // 3. Status Order harus Aktif (Sudah DP atau Lunas)
    const allowedStatuses = ['Sudah DP', 'Lunas'];
    if (!allowedStatuses.includes(curAppt.status)) {
      return res.status(400).json({ 
        error: `Pesanan berstatus '${curAppt.status}' tidak dapat di-reschedule secara mandiri. Hanya pesanan aktif (Sudah DP / Lunas) yang dapat dijadwalkan ulang.` 
      });
    }

    // 4. Cek Batas Waktu Reschedule (Deadline Rule)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentEventDate = new Date(curAppt.event_date);
    currentEventDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((currentEventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Extract division from additional_notes [DIVISI] tag (no standalone 'division' column in appointments)
    const notesForDiv = (curAppt.additional_notes || '').toLowerCase();
    const divMatch = notesForDiv.match(/\[divisi\]:\s*([^\n]+)/i);
    const division = divMatch ? divMatch[1].trim().toLowerCase() : '';
    const pkgName = (curAppt.package_name || '').toLowerCase();
    const isStudio = division.includes('studio') || 
      ['family', 'maternity', 'group', 'graduation', 'personal', 'couple', 'prewedding studio', 'poto product', 'wisuda', 'pas foto'].some(c => pkgName.includes(c) || division.includes(c));

    if (isStudio) {
      if (diffDays < 2) {
        return res.status(400).json({
          error: `Pengajuan reschedule sesi studio minimal H-2 sebelum tanggal acara saat ini. Jadwal Anda saat ini adalah ${safeFormatDateID(curAppt.event_date)}. Untuk kondisi darurat silakan hubungi Admin Studio.`
        });
      }
    } else {
      if (diffDays < 14) {
        return res.status(400).json({
          error: `Pengajuan reschedule acara Wedding/Dekorasi minimal H-14 sebelum tanggal acara saat ini. Jadwal Anda saat ini adalah ${safeFormatDateID(curAppt.event_date)}. Silakan hubungi Admin untuk konsultasi jadwal pengganti.`
        });
      }
    }

    // 5. Cek Tanggal Baru (Harus di masa depan)
    const targetDateObj = new Date(new_date);
    targetDateObj.setHours(0, 0, 0, 0);
    if (targetDateObj <= today) {
      return res.status(400).json({ error: 'Tanggal jadwal baru harus setelah hari ini.' });
    }

    // 6. Cek Bentrok Slot Studio (Concurrency & Conflict Guard)
    const notesStr = curAppt.additional_notes || '';
    const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
    const targetRoom = roomMatch ? roomMatch[1].trim() : '';

    let targetDuration = 45;
    const durMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
    if (durMatch) targetDuration = parseInt(durMatch[1].trim(), 10);

    if (isStudio && targetRoom) {
      const mapRoomKey = (name) => {
        if (!name) return '';
        const t = name.toLowerCase().trim();
        if (t.includes('studio white') || t.includes('limbo') || t.includes('room a') || t.includes('room 1')) return 'limbo';
        if (t.includes('luxury') || t.includes('room b') || t.includes('room 2')) return 'luxury';
        if (t.includes('colorful') || t.includes('modern') || t.includes('room c') || t.includes('room 3')) return 'modern';
        if (t.includes('classic') || t.includes('abstrak') || t.includes('kubah') || t.includes('room d') || t.includes('room 4')) return 'abstrak';
        if (t.includes('outdoor') || t.includes('garden') || t.includes('custom') || t.includes('room e') || t.includes('room 5')) return 'custom';
        return t;
      };

      const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      const targetStart = timeToMinutes(new_time);
      const targetEnd = targetStart + targetDuration;
      const targetKey = mapRoomKey(targetRoom);

      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('id, jam_akad, additional_notes, status')
        .eq('event_date', new_date)
        .neq('id', curAppt.id)
        .in('status', ['Sudah DP', 'Lunas']);

      let hasConflict = false;
      let conflictMsg = '';

      if (existingAppts && existingAppts.length > 0) {
        for (const ex of existingAppts) {
          const exNotes = ex.additional_notes || '';
          const exRoomMatch = exNotes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
          const exRoom = exRoomMatch ? exRoomMatch[1].trim() : '';

          let exTimeStr = ex.jam_akad ? ex.jam_akad.slice(0, 5) : '';
          const exJamMatch = exNotes.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
          if (exJamMatch) exTimeStr = exJamMatch[1].trim();

          let exDuration = 45;
          const exDurMatch = exNotes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
          if (exDurMatch) exDuration = parseInt(exDurMatch[1].trim(), 10);

          if (mapRoomKey(exRoom) === targetKey && exTimeStr) {
            const exStart = timeToMinutes(exTimeStr);
            const exEnd = exStart + exDuration;

            if (targetStart < exEnd && targetEnd > exStart) {
              hasConflict = true;
              conflictMsg = `Slot waktu ${new_time} di ${targetRoom} sudah terisi oleh pemesan lain. Silakan pilih slot jam lain.`;
              break;
            }
          }
        }
      }

      if (hasConflict) {
        return res.status(409).json({ error: conflictMsg });
      }
    }

    // 7. Simpan Riwayat Reschedule ke Database
    const oldDate = curAppt.event_date;
    const oldTime = curAppt.jam_akad ? curAppt.jam_akad.slice(0, 5) : '-';
    const timestampStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const rescheduleLog = `\n[RESCHEDULE RECORD]: Jadwal diubah dari ${oldDate} (${oldTime} WIB) ke ${new_date} (${new_time} WIB) pada ${timestampStr} WIB | Alasan: ${reason || '-'}`;
    
    let updatedNotes = (curAppt.additional_notes || '') + rescheduleLog;
    if (updatedNotes.includes('[JAM SESI]:')) {
      updatedNotes = updatedNotes.replace(/\[JAM SESI\]:\s*[^\n]+/i, `[JAM SESI]: ${new_time}`);
    } else if (updatedNotes.includes('[JAM PHOTOSHOOT]:')) {
      updatedNotes = updatedNotes.replace(/\[JAM PHOTOSHOOT\]:\s*[^\n]+/i, `[JAM PHOTOSHOOT]: ${new_time}`);
    }

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        event_date: new_date,
        jam_akad: new_time,
        additional_notes: updatedNotes
      })
      .eq('id', order_id);

    if (updateErr) {
      console.error('[Reschedule] Supabase update failed:', updateErr);
      return res.status(500).json({ error: 'Gagal memperbarui jadwal di database.' });
    }

    console.log(`[Reschedule] Successfully rescheduled Order #${order_id} to ${new_date} ${new_time}`);

    const updatedAppt = {
      ...curAppt,
      event_date: new_date,
      jam_akad: new_time,
      additional_notes: updatedNotes
    };

    // 8. Kirim Notifikasi WhatsApp Otomatis ke Klien
    const clientWaPhone = curAppt.client_phone || curAppt.phone;
    if (clientWaPhone) {
      const waMsg = `*LAPANBELAS.ID - KONFIRMASI RESCHEDULE JADWAL* 🗓️\n\n` +
        `Halo Kak *${curAppt.client_name || 'Klien'}*,\n` +
        `Permohonan reschedule untuk pesanan *#${order_id}* telah berhasil diproses di sistem kami.\n\n` +
        `📅 *Jadwal Baru:* ${safeFormatDateID(new_date)}\n` +
        `⏰ *Jam Sesi:* ${new_time} WIB\n` +
        `📦 *Paket:* ${curAppt.package_name || '-'}\n` +
        (targetRoom ? `🏠 *Ruangan:* ${targetRoom}\n` : '') +
        `\nCatatan jadwal di sistem kami telah otomatis disinkronkan. Terima kasih dan sampai jumpa di Studio Lapanbelas! ✨`;

      sendWhatsAppNotification(clientWaPhone, waMsg).catch(err => {
        console.error('[Reschedule WhatsApp Error]:', err.message);
      });
    }

    // 9. Sinkronisasi Realtime ke Google Calendar (Opsi A)
    syncGoogleCalendarEvent(updatedAppt, 'update').catch(calErr => {
      console.error('[Reschedule Google Calendar Error]:', calErr.message);
    });

    res.json({
      success: true,
      message: `Jadwal berhasil di-reschedule ke ${safeFormatDateID(new_date)} (${new_time} WIB)!`,
      order_id,
      new_date,
      new_time
    });

  } catch (err) {
    console.error('[Reschedule] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server saat memproses reschedule.' });
  }
});

/**
 * ============================================================================
 * ALBUM READY CONFIRMATION & MANDATORY HANDOVER PROOF (POIN 2 & 3)
 * ============================================================================
 */

/**
 * API Route: Upload Foto Serah Terima / Foto Album Fisik ke Supabase Storage
 */
app.post('/api/upload-handover-photo', requireAuth, async (req, res) => {
  const { imageBase64, type, fileName } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Data gambar (imageBase64) wajib disertakan' });
  }

  try {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const contentType = matches ? matches[1] : 'image/jpeg';
    const rawData = matches ? matches[2] : imageBase64;
    const buffer = Buffer.from(rawData, 'base64');

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const cleanType = (type || 'handover').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const targetPath = `handover/${cleanType}-${Date.now()}-${uuidv4().slice(0, 6)}.${ext}`;

    const { data: storageData, error: storageErr } = await supabase.storage
      .from('room-photos')
      .upload(targetPath, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false
      });

    if (storageErr) {
      console.error('[Storage Upload Error]:', storageErr);
      return res.status(500).json({ error: 'Gagal mengunggah foto ke storage: ' + storageErr.message });
    }

    const { data: urlData } = supabase.storage.from('room-photos').getPublicUrl(targetPath);
    const publicUrl = urlData.publicUrl;

    res.json({
      success: true,
      url: publicUrl,
      path: targetPath
    });
  } catch (err) {
    console.error('[Upload Handover Photo Error]:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses unggahan foto' });
  }
});

/**
 * API Route: Konfirmasi Album Selesai Cetak (Upload Foto Fisik Album + Kirim WA Klien)
 */
app.post('/api/confirm-album-ready', requireAuth, async (req, res) => {
  const { orderId, albumPhotoUrl, notes } = req.body;
  if (!orderId || !albumPhotoUrl) {
    return res.status(400).json({ error: 'ID Pesanan dan Foto Fisik Album yang sudah selesai wajib disertakan' });
  }

  try {
    const { data: curAppt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !curAppt) {
      return res.status(404).json({ error: 'Data pesanan tidak ditemukan di database' });
    }

    const timestampStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const albumLog = `\n[ALBUM_FINISHED_PHOTO]: ${albumPhotoUrl}\n[ALBUM_STATUS]: Siap Diambil\n[ALBUM_READY_AT]: ${new Date().toISOString()}${notes ? ` | Catatan: ${notes}` : ''}`;
    let updatedNotes = (curAppt.additional_notes || '') + albumLog;

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        additional_notes: updatedNotes
      })
      .eq('id', orderId);

    if (updateErr) {
      console.error('[Confirm Album Ready Error]:', updateErr);
      return res.status(500).json({ error: 'Gagal memperbarui status album di database: ' + updateErr.message });
    }

    // Kirim notifikasi WhatsApp ke Klien dengan foto fisik album
    const clientPhone = curAppt.customer_phone || curAppt.phone || curAppt.client_phone;
    if (clientPhone) {
      const clientName = curAppt.customer_name || curAppt.client_name || curAppt.name || 'Pelanggan';
      const pkgName = curAppt.package_name || curAppt.pkg || 'Layanan Dokumentasi';

      const waMsg = `*LAPANBELAS.ID - ALBUM FOTO ANDA SUDAH SELESAI DICETAK* 📦✨\n\n` +
        `Halo Kak *${clientName}*,\n` +
        `Kabar bahagia! Seluruh pesanan cetak & album dokumentasi Anda untuk pesanan *#${orderId}* (*${pkgName}*) kini sudah selesai dicetak dengan rapi dan kualitas terbaik! 🥰\n\n` +
        `Foto fisik album Kakak telah kami lampirkan di atas.\n\n` +
        `🏠 *Lokasi Pengambilan:* Studio Lapanbelas\n` +
        `⏰ *Jam Operasional:* 09.00 - 21.00 WIB\n\n` +
        `Silakan berkunjung ke studio kami untuk mengambil album berharga Kakak ya. Tim kami siap menyambut! Sampai jumpa di Studio Lapanbelas. 🙏❤️`;

      sendWhatsAppNotification(clientPhone, waMsg, albumPhotoUrl).catch(waErr => {
        console.error('[Confirm Album Ready WhatsApp Error]:', waErr.message);
      });
    }

    res.json({
      success: true,
      message: 'Status album siap diambil berhasil diperbarui & foto album otomatis terkirim ke WhatsApp klien!',
      orderId,
      albumPhotoUrl
    });
  } catch (err) {
    console.error('[Confirm Album Ready Error]:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server saat mengonfirmasi album' });
  }
});

/**
 * API Route: Konfirmasi Serah Terima Album ke Klien (Hard Gate: Wajib Foto + Auto-Trigger Feedback Link)
 */
app.post('/api/confirm-album-handover', requireAuth, async (req, res) => {
  const { orderId, recipientName, handoverPhotoUrl, method, isPortfolio, notes } = req.body;

  // HARD GATE VALIDATION
  if (!orderId) {
    return res.status(400).json({ error: 'ID Pesanan wajib diisi.' });
  }
  if (!recipientName || !recipientName.trim()) {
    return res.status(400).json({ error: 'Nama penerima / pengambil album wajib diisi.' });
  }
  if (!handoverPhotoUrl || !handoverPhotoUrl.trim()) {
    return res.status(400).json({ error: 'Foto bukti serah terima (klien memegang album/kurir) wajib diunggah!' });
  }

  try {
    const { data: curAppt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !curAppt) {
      return res.status(404).json({ error: 'Data pesanan tidak ditemukan di database.' });
    }

    const timestampStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const handoverLog = `\n[HANDOVER_RECORD]: Diambil oleh ${recipientName.trim()} (${method || 'Diambil di Studio'}) pada ${new Date().toISOString()} (${timestampStr} WIB) | Foto: ${handoverPhotoUrl} | Portofolio: ${isPortfolio ? 'YES' : 'NO'}${notes ? ` | Catatan: ${notes}` : ''}`;
    const updatedNotes = (curAppt.additional_notes || '') + handoverLog;

    // Update appointment status to Selesai
    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        status: 'Selesai',
        additional_notes: updatedNotes
      })
      .eq('id', orderId);

    if (updateErr) {
      console.error('[Confirm Handover DB Error]:', updateErr);
      return res.status(500).json({ error: 'Gagal memperbarui status serah terima di database: ' + updateErr.message });
    }

    // Otomatis update atau buat editor_assignments menjadi Done saat serah terima
    const { data: existingAss } = await supabase
      .from('editor_assignments')
      .select('id')
      .eq('appointment_id', orderId)
      .maybeSingle();

    if (existingAss) {
      await supabase
        .from('editor_assignments')
        .update({
          status_foto: 'Done',
          status_video: 'Done'
        })
        .eq('appointment_id', orderId);
    } else {
      await supabase
        .from('editor_assignments')
        .insert([{
          appointment_id: orderId,
          status_foto: 'Done',
          status_video: 'Done'
        }]);
    }

    // OTOMATIS TRIGGER POIN 3: Kirim WhatsApp Permintaan Ulasan / Feedback ke Klien
    const clientPhone = curAppt.customer_phone || curAppt.phone || curAppt.client_phone;
    let feedbackSent = false;

    if (clientPhone) {
      const clientName = curAppt.customer_name || curAppt.client_name || curAppt.name || 'Pelanggan';
      const feedbackUrl = `${process.env.APP_URL || 'https://app.lapanbelas.id'}/feedback/${orderId}`;

      const waMsg = `*LAPANBELAS.ID - TERIMA KASIH ATAS KEPERCAYAANNYA* 🙏✨\n\n` +
        `Halo Kak *${clientName}*,\n` +
        `Terima kasih banyak telah mempercayakan momen bahagianya bersama Studio Lapanbelas! Seluruh pesanan dokumentasi & album fisik telah resmi diserahterimakan kepada *${recipientName.trim()}* hari ini. 🥰\n\n` +
        `Boleh mohon bantuan waktu 1 menit untuk memberikan bintang & sedikit ulasan pengalaman Kakak bersama tim kami?\n` +
        `👉 ${feedbackUrl}\n\n` +
        `Masukan dan saran Kakak sangat berharga untuk kami agar bisa melayani lebih baik lagi. Sampai jumpa di momen bahagia berikutnya ya Kak! ❤️`;

      try {
        await sendWhatsAppNotification(clientPhone, waMsg, handoverPhotoUrl);
        feedbackSent = true;
      } catch (waErr) {
        console.error('[Confirm Handover WA Feedback Error]:', waErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Serah terima album berhasil disimpan! Pesanan resmi ditandai selesai dan link ulasan telah otomatis dikirimkan ke WhatsApp klien.',
      orderId,
      handoverPhotoUrl,
      recipientName: recipientName.trim(),
      feedbackSent
    });

  } catch (err) {
    console.error('[Confirm Handover Error]:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server saat memproses serah terima' });
  }
});

/**
 * API Route: Laporan Serah Terima & Portofolio Klien Bahagia (Untuk Owner)
 */
app.get('/api/handover-reports', requireAuth, async (req, res) => {
  try {
    // Fetch all feedbacks to cross-reference ratings
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    const feedbackMap = {};
    const feedbackApptIds = [];
    (feedbacks || []).forEach(f => {
      if (f.appointment_id) {
        const normId = f.appointment_id.trim();
        feedbackMap[normId] = f;
        feedbackApptIds.push(`"${normId}"`);
      }
    });

    // Fetch appointments that have handover records, album photos, status Selesai, or submitted feedback
    let orConditions = [
      'additional_notes.like.%[HANDOVER_RECORD]%',
      'additional_notes.like.%[ALBUM_FINISHED_PHOTO]%',
      'status.eq.Selesai',
      'status.eq.Album Selesai'
    ];
    if (feedbackApptIds.length > 0) {
      orConditions.push(`id.in.(${feedbackApptIds.join(',')})`);
    }

    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('*')
      .or(orConditions.join(','))
      .order('id', { ascending: false });

    if (apptErr) throw apptErr;

    const parsedReports = (appointments || []).map(appt => {
      const notes = appt.additional_notes || '';

      const albumPhotoMatch = notes.match(/\[ALBUM_FINISHED_PHOTO\]:\s*([^\n|]+)/);
      const albumReadyAtMatch = notes.match(/\[ALBUM_READY_AT\]:\s*([^\n|]+)/);

      const handoverMatch = notes.match(/\[HANDOVER_RECORD\]:\s*Diambil oleh ([^()]+)\(([^)]+)\) pada ([^|]+) \| Foto: ([^|]+) \| Portofolio: ([^\n|]+)/);

      let recipientName = null;
      let method = null;
      let handoverAt = null;
      let handoverPhotoUrl = null;
      let isPortfolio = false;

      if (handoverMatch) {
        recipientName = handoverMatch[1].trim();
        method = handoverMatch[2].trim();
        handoverAt = handoverMatch[3].trim();
        handoverPhotoUrl = handoverMatch[4].trim();
        isPortfolio = handoverMatch[5].trim().toUpperCase() === 'YES';
      }

      const clientFeedback = feedbackMap[appt.id] || null;

      let division = appt.division;
      if (!division) {
        if (notes.includes('[DIVISI]: Studio') || notes.includes('[ROOM STUDIO]')) division = 'studio';
        else if (notes.includes('[DIVISI]: Makeup') || notes.includes('Makeup')) division = 'makeup';
        else if (notes.includes('[DIVISI]: Dekor')) division = 'dekor';
        else division = 'wedding';
      }

      let ratingVideographer = null;
      let cleanComment = clientFeedback?.comments || clientFeedback?.comment || '';
      const vgMatch = cleanComment.match(/\[Rating Videografer:\s*(\d+)★?\]/i);
      if (vgMatch) {
        ratingVideographer = parseInt(vgMatch[1]);
        cleanComment = cleanComment.replace(vgMatch[0], '').trim();
      }

      return {
        orderId: appt.id,
        clientName: appt.client_name || appt.customer_name || appt.name,
        clientPhone: appt.client_phone || appt.customer_phone || appt.phone,
        clientEmail: appt.client_email,
        packageName: appt.package_name || appt.pkg,
        division,
        eventDate: appt.event_date || appt.eventDate,
        status: appt.status,
        albumPhotoUrl: albumPhotoMatch ? albumPhotoMatch[1].trim() : null,
        albumReadyAt: albumReadyAtMatch ? albumReadyAtMatch[1].trim() : null,
        recipientName,
        method,
        handoverAt,
        handoverPhotoUrl,
        isPortfolio,
        hasHandover: !!handoverPhotoUrl,
        feedback: clientFeedback ? {
          id: clientFeedback.id,
          rating: clientFeedback.rating_overall || clientFeedback.rating || 5,
          ratingAdmin: clientFeedback.rating_admin || 5,
          ratingPhotographer: clientFeedback.rating_photographer || 5,
          ratingVideographer,
          ratingEditor: clientFeedback.rating_editor || 5,
          comment: cleanComment,
          submittedAt: clientFeedback.created_at
        } : null
      };
    });

    res.json({
      success: true,
      reports: parsedReports,
      total: parsedReports.length,
      totalHandover: parsedReports.filter(r => r.hasHandover).length,
      totalFeedback: parsedReports.filter(r => !!r.feedback).length
    });
  } catch (err) {
    console.error('[Handover Reports Error]:', err);
    res.status(500).json({ error: err.message || 'Gagal memuat laporan serah terima' });
  }
});

/**
 * -------------------------------------------------------------
 * ENGINE REMINDER WHATSAPP DEADLINE EDITOR & ADMIN
 * -------------------------------------------------------------
 */

/**
 * Helper: Resolve Editor WhatsApp Number
 */
async function resolveEditorPhone(editorName, taskType, isStudio, settingsMap) {
  if (editorName && editorName.trim()) {
    try {
      const { data: user } = await supabase
        .from('admin_users')
        .select('username')
        .eq('display_name', editorName.trim())
        .maybeSingle();
      if (user && user.username) {
        const cleanDigits = user.username.replace(/[^0-9]/g, '');
        if (cleanDigits.length >= 9 && cleanDigits.length <= 15) {
          return cleanDigits;
        }
      }
    } catch (e) {
      console.warn('[Resolve Phone] Error querying user:', e.message);
    }
  }

  // Fallback ke setting studio / wedding / video
  if (taskType === 'video') {
    return settingsMap['team_wa_vg_editor'] || '6281362132800';
  } else {
    if (isStudio) {
      return settingsMap['team_wa_editor_studio'] || '62895630508478';
    } else {
      return settingsMap['team_wa_editor_wedding'] || '628113178579';
    }
  }
}

/**
 * Core Engine: Send Editor & Admin Deadline WhatsApp Reminders
 */
let lastEditorReminderRunDate = null;
async function sendEditorDeadlineReminders(options = {}) {
  const { isManual = false, specificApptId = null, targetType = 'all' } = options;

  try {
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + wibOffset);
    const wibHours = wibNow.getUTCHours();
    const wibDateStr = wibNow.toISOString().split('T')[0];

    // Jika scheduler otomatis harian, berjalan tepat pukul 09:00 WIB
    if (!isManual) {
      if (wibHours !== 9) return { count: 0, message: 'Skipped - only runs at 09:00 WIB' };
      if (lastEditorReminderRunDate === wibDateStr) return { count: 0, message: 'Already run today' };
      lastEditorReminderRunDate = wibDateStr;
    }

    console.log(`[Editor Reminder System] Running deadline reminders check (manual: ${isManual}, order: ${specificApptId || 'all'})...`);

    // 1. Ambil settings nomor WhatsApp
    const { data: settingsData } = await supabase.from('settings').select('*');
    const settingsMap = {};
    if (settingsData) {
      settingsData.forEach(s => { settingsMap[s.key] = s.value; });
    }
    const adminWa = settingsMap['team_wa_admin'] || settingsMap['admin_whatsapp'] || '6282363252291';

    // 2. Ambil assignments
    let query = supabase.from('editor_assignments').select('*');
    if (specificApptId) {
      query = query.eq('appointment_id', specificApptId);
    }
    const { data: assignments, error: assErr } = await query;
    if (assErr) {
      console.error('[Editor Reminder System] Error fetching assignments:', assErr);
      return { success: false, error: assErr.message };
    }
    if (!assignments || assignments.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada data penugasan editor yang perlu diingatkan.' };
    }

    // 3. Ambil data appointments terkait
    const apptIds = assignments.map(a => a.appointment_id);
    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('*')
      .in('id', apptIds);

    if (apptErr) {
      console.error('[Editor Reminder System] Error fetching appointments:', apptErr);
      return { success: false, error: apptErr.message };
    }

    const apptMap = {};
    (appointments || []).forEach(a => { apptMap[a.id] = a; });

    let remindersSentCount = 0;
    const adminRekapList = [];

    for (const ass of assignments) {
      const appt = apptMap[ass.appointment_id];
      if (!appt) continue;

      // Abaikan jika appointment sudah selesai atau dibatalkan
      const apptStatus = (appt.status || '').toLowerCase();
      if (apptStatus === 'batal' || apptStatus === 'cancel' || apptStatus === 'selesai') continue;
      if ((appt.additional_notes || '').includes('[HANDOVER_RECORD]')) continue;

      const pkgName = appt.package_name || 'Paket Studio / Wedding';
      const pkgNameLower = pkgName.toLowerCase();
      const isStudio = pkgNameLower.includes('studio') || pkgNameLower.includes('self photo') || pkgNameLower.includes('pas foto') || pkgNameLower.includes('wisuda');

      // Ekstrak drive link dari file_code jika ada
      let driveLink = '';
      if (ass.file_code && ass.file_code.includes(' || ')) {
        const parts = ass.file_code.split(' || ');
        driveLink = parts[1] || parts[2] || appt.drive_link || '';
      } else {
        driveLink = appt.drive_link || '';
      }

      // Parse nama editor foto & video
      let editorFoto = '';
      let editorVideo = '';
      if (ass.editor_name && ass.editor_name.includes(' || ')) {
        const parts = ass.editor_name.split(' || ');
        editorFoto = parts[0]?.trim();
        editorVideo = parts[1]?.trim();
      } else {
        editorFoto = ass.editor_name || '';
      }

      // --- A. REMINDER EDITOR FOTO ---
      const isFotoDone = ass.status_foto === 'Done' || ass.status_foto === 'Selesai';
      const isFotoActive = !isFotoDone && ass.status_foto !== 'Belum Diproses' && ass.status_foto !== 'Menunggu Seleksi Foto';

      if ((targetType === 'all' || targetType === 'foto') && isFotoActive && ass.deadline) {
        const deadlineDate = new Date(ass.deadline);
        const todayDate = new Date(wibDateStr);
        const diffDays = Math.ceil((deadlineDate - todayDate) / (1000 * 60 * 60 * 24));

        // Untuk otomatis harian: trigger pada H-3, H-2, H-1, Hari H (0), atau Overdue (< 0)
        // Untuk manual trigger: selalu kirim
        if (isManual || diffDays <= 3) {
          let urgencyLabel = '';
          if (diffDays < 0) {
            urgencyLabel = `⚠️ LEWAT DEADLINE (${Math.abs(diffDays)} Hari Terlambat!)`;
          } else if (diffDays === 0) {
            urgencyLabel = `🔥 HARI INI BATAS TERAKHIR!`;
          } else {
            urgencyLabel = `⏰ Sisa ${diffDays} Hari lagi (H-${diffDays})`;
          }

          const photoEditorPhone = await resolveEditorPhone(editorFoto, 'foto', isStudio, settingsMap);

          const waMsgFoto = `🔔 *REMINDER DEADLINE EDITOR FOTO* 📸\n` +
            `_LAPANBELAS.ID Studio & Production_\n\n` +
            `Halo *${editorFoto || 'Tim Editor Foto'}*,\n` +
            `Mengingatkan pengerjaan editing foto klien:\n\n` +
            `• *Klien:* *${appt.client_name}* (Pesanan #${appt.id})\n` +
            `• *Paket:* ${pkgName}\n` +
            `• *Deadline Editor:* *${safeFormatDateID(ass.deadline)}* (${urgencyLabel})\n` +
            `• *Jumlah Foto:* ${ass.qty || 'Sesuai Pilihan'} file\n` +
            `• *Status Pengerjaan:* ${ass.status_foto || 'Antrian Pengerjaan'}\n` +
            (driveLink ? `• *Link Bahan:* ${driveLink}\n` : '') +
            `\nMohon segera menyelesaikan editing dan unggah hasilnya ke sistem agar tim cetak dan serah terima ke klien tepat waktu. Semangat berkarya! 🙏✨`;

          if (photoEditorPhone) {
            await sendWhatsAppNotification(photoEditorPhone, waMsgFoto);
            remindersSentCount++;
          }

          adminRekapList.push({
            type: 'Foto',
            clientName: appt.client_name,
            orderId: appt.id,
            editor: editorFoto || 'Editor Foto',
            deadline: ass.deadline,
            diffDays,
            urgencyLabel
          });
        }
      }

      // --- B. REMINDER EDITOR VIDEO ---
      const isVideoDone = ass.status_video === 'Done' || ass.status_video === 'Selesai';
      const isVideoActive = !isVideoDone && ass.status_video !== 'Belum Diproses' && ass.status_video !== '-';

      if ((targetType === 'all' || targetType === 'video') && isVideoActive && ass.deadline_video) {
        const deadlineDate = new Date(ass.deadline_video);
        const todayDate = new Date(wibDateStr);
        const diffDays = Math.ceil((deadlineDate - todayDate) / (1000 * 60 * 60 * 24));

        if (isManual || diffDays <= 3) {
          let urgencyLabel = '';
          if (diffDays < 0) {
            urgencyLabel = `⚠️ LEWAT DEADLINE (${Math.abs(diffDays)} Hari Terlambat!)`;
          } else if (diffDays === 0) {
            urgencyLabel = `🔥 HARI INI BATAS TERAKHIR!`;
          } else {
            urgencyLabel = `⏰ Sisa ${diffDays} Hari lagi (H-${diffDays})`;
          }

          const videoEditorPhone = await resolveEditorPhone(editorVideo, 'video', isStudio, settingsMap);

          const waMsgVideo = `🔔 *REMINDER DEADLINE EDITOR VIDEO* 🎥\n` +
            `_LAPANBELAS.ID Studio & Production_\n\n` +
            `Halo *${editorVideo || 'Tim Editor Video'}*,\n` +
            `Mengingatkan pengerjaan editing video klien:\n\n` +
            `• *Klien:* *${appt.client_name}* (Pesanan #${appt.id})\n` +
            `• *Paket:* ${pkgName}\n` +
            `• *Deadline Video:* *${safeFormatDateID(ass.deadline_video)}* (${urgencyLabel})\n` +
            `• *Status Pengerjaan:* ${ass.status_video || 'Sedang Diproses'}\n` +
            (driveLink ? `• *Link Bahan:* ${driveLink}\n` : '') +
            `\nMohon segera menyelesaikan editing video sebelum batas waktu agar proses serah terima ke klien sesuai jadwal. Semangat berkarya! 🙏🎬`;

          if (videoEditorPhone) {
            await sendWhatsAppNotification(videoEditorPhone, waMsgVideo);
            remindersSentCount++;
          }

          adminRekapList.push({
            type: 'Video',
            clientName: appt.client_name,
            orderId: appt.id,
            editor: editorVideo || 'Editor Video',
            deadline: ass.deadline_video,
            diffDays,
            urgencyLabel
          });
        }
      }
    }

    // --- C. REKAP LAPORAN KE WHATSAPP ADMIN ---
    if (adminRekapList.length > 0 && adminWa) {
      const summaryItems = adminRekapList.map((item, idx) => {
        const icon = item.diffDays < 0 ? '🚨' : item.diffDays === 0 ? '🔥' : '⏰';
        return `${idx + 1}. ${icon} *[${item.type}]* #${item.orderId} - ${item.clientName}\n   • Editor: *${item.editor}*\n   • Batas: ${safeFormatDateID(item.deadline)} (${item.urgencyLabel})`;
      }).join('\n\n');

      const adminSummaryMsg = `📋 *REKAP REMINDER DEADLINE EDITOR* ⏰\n` +
        `_LAPANBELAS.ID - ${safeFormatDateID(wibDateStr)}_\n\n` +
        `Halo Admin, berikut tugas editor yang mendekati batas waktu atau overdue:\n\n` +
        `${summaryItems}\n\n` +
        `📌 *Total:* ${adminRekapList.length} tugas memerlukan perhatian.\n` +
        `Notifikasi pengingat ke masing-masing editor telah dikirimkan via WhatsApp. Silakan pantau di Dasbor Penugasan Editor. 🙏`;

      await sendWhatsAppNotification(adminWa, adminSummaryMsg);
      remindersSentCount++;
    }

    console.log(`[Editor Reminder System] Selesai. Terkirim ${remindersSentCount} notifikasi WA (${adminRekapList.length} tugas).`);
    return {
      success: true,
      remindersSent: remindersSentCount,
      taskCount: adminRekapList.length,
      items: adminRekapList
    };
  } catch (err) {
    console.error('[Editor Reminder System] Global Error:', err);
    return { success: false, error: err.message };
  }
}

// Background scheduler: Cek setiap 15 menit, berjalan otomatis satu kali sehari pada pukul 09:00 WIB
setInterval(() => {
  sendEditorDeadlineReminders({ isManual: false }).catch(err => {
    console.error('[Editor Reminder Scheduler Error]', err);
  });
}, 15 * 60 * 1000);

/**
 * API Route: Trigger Semua Reminder Deadline Editor & Admin
 */
app.post('/api/trigger-editor-reminders', requireAuth, async (req, res) => {
  try {
    const result = await sendEditorDeadlineReminders({ isManual: true });
    res.json(result);
  } catch (err) {
    console.error('[API Trigger Editor Reminders Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * API Route: Kirim Reminder WA untuk Satu Tugas Spesifik
 */
app.post('/api/send-editor-wa-reminder', requireAuth, async (req, res) => {
  const { appointmentId, targetType } = req.body;
  if (!appointmentId) {
    return res.status(400).json({ success: false, error: 'appointmentId is required' });
  }

  try {
    const result = await sendEditorDeadlineReminders({
      isManual: true,
      specificApptId: appointmentId,
      targetType: targetType || 'all'
    });
    res.json(result);
  } catch (err) {
    console.error('[API Send Single Editor Reminder Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * -------------------------------------------------------------
 * SERAH TERIMA FILE MENTAH FOTOGRAFER & PENUGASAN KRU
 * -------------------------------------------------------------
 */

/**
 * API Route: Konfirmasi Terima File Mentah dari Fotografer
 */
app.post('/api/confirm-raw-files-handover', requireAuth, async (req, res) => {
  const { appointmentId, photographer, videographer, fileCount, folderSize, notes, cardChecked, backupChecked, formatChecked } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });

  try {
    const { data: appt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const handoverRecord = {
      photographer: photographer || '-',
      videographer: videographer || '',
      fileCount: fileCount || '-',
      folderSize: folderSize || '-',
      notes: notes || '',
      cardChecked: !!cardChecked,
      backupChecked: !!backupChecked,
      formatChecked: !!formatChecked,
      handoverAt: nowStr
    };

    let existingNotes = appt.additional_notes || '';
    // Hapus record serah terima mentah lama jika ada
    existingNotes = existingNotes.replace(/\[RAW_FILES_HANDOVER\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '').trim();

    const handoverTag = `[RAW_FILES_HANDOVER]: Disetor oleh ${photographer || 'Fotografer'}${videographer ? ` & ${videographer}` : ''} pada ${nowStr} (Total: ${fileCount || '-'} file, Ukuran: ${folderSize || '-'})${notes ? ` | Catatan: ${notes}` : ''}`;
    const newNotes = existingNotes ? `${existingNotes}\n\n${handoverTag}` : handoverTag;

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({ additional_notes: newNotes })
      .eq('id', appointmentId);

    if (updateErr) throw updateErr;

    // Kirim notifikasi WA ke Admin bahwa file mentah sudah aman disetor
    (async () => {
      try {
        const { data: settingsData } = await supabase.from('settings').select('*');
        const settingsMap = {};
        if (settingsData) settingsData.forEach(s => { settingsMap[s.key] = s.value; });
        const adminWa = settingsMap['team_wa_admin'] || settingsMap['admin_whatsapp'] || '6282363252291';

        const waMsg = `📥 *KONFIRMASI TERIMA FILE MENTAH* 📸\n` +
          `_LAPANBELAS.ID Studio & Production_\n\n` +
          `File mentah dokumentasi telah berhasil diserahkan ke studio:\n` +
          `• *Klien:* *${appt.client_name}* (Pesanan #${appt.id})\n` +
          `• *Paket:* ${appt.package_name || '-'}\n` +
          `• *Fotografer:* *${photographer || '-'}*\n` +
          (videographer ? `• *Videografer:* *${videographer}*\n` : '') +
          `• *Jumlah File:* *${fileCount || '-'} file* (${folderSize || 'Ukuran standar'})\n` +
          `• *Waktu Terima:* ${nowStr} WIB\n` +
          (notes ? `• *Catatan:* _"${notes}"_\n` : '') +
          `\n✅ Checklist: Memory Card sudah disalin & backup aman di studio.\n` +
          `Silakan unggah link Google Drive untuk tahap seleksi foto klien di dashboard admin. 🙏`;

        if (adminWa) {
          await sendWhatsAppNotification(adminWa, waMsg);
        }
      } catch (waErr) {
        console.error('[Raw Handover WA Error]', waErr);
      }
    })();

    res.json({ success: true, message: 'Serah terima file mentah berhasil dicatat!', record: handoverRecord });
  } catch (err) {
    console.error('[Raw Handover Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * API Route: Kirim Surat Tugas ke WhatsApp Kru (Fotografer / Videografer)
 */
app.post('/api/send-crew-assignment-wa', requireAuth, async (req, res) => {
  const { appointmentId, crewRole, crewName, crewPhone } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });

  try {
    const { data: appt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const { data: settingsData } = await supabase.from('settings').select('*');
    const settingsMap = {};
    if (settingsData) settingsData.forEach(s => { settingsMap[s.key] = s.value; });

    let targetPhone = crewPhone;
    if (!targetPhone) {
      if (crewName) {
        try {
          const { data: user } = await supabase
            .from('admin_users')
            .select('username')
            .eq('display_name', crewName.trim())
            .maybeSingle();
          if (user && user.username) {
            const clean = user.username.replace(/[^0-9]/g, '');
            if (clean.length >= 9 && clean.length <= 15) targetPhone = clean;
          }
        } catch (e) {}
      }

      if (!targetPhone) {
        const pkgLower = (appt.package_name || '').toLowerCase();
        const isStudio = pkgLower.includes('studio') || pkgLower.includes('pas foto') || pkgLower.includes('wisuda');
        if (crewRole === 'Videografer') {
          targetPhone = settingsMap['team_wa_vg_editor'] || '6281362132800';
        } else {
          targetPhone = isStudio ? (settingsMap['team_wa_fg_studio'] || '6285262227876') : (settingsMap['team_wa_fg_wedding'] || '628113178579');
        }
      }
    }

    const eventDateFormatted = safeFormatDateID(appt.event_date);
    const waMsg = `📋 *SURAT PENUGASAN DOKUMENTASI* ${crewRole === 'Videografer' ? '🎥' : '📸'}\n` +
      `_LAPANBELAS.ID Studio & Production_\n\n` +
      `Halo *${crewName || 'Tim Kru'}*,\n` +
      `Anda ditugaskan sebagai *${crewRole || 'Fotografer'}* untuk proyek dokumentasi berikut:\n\n` +
      `• *ID Pesanan:* #${appt.id}\n` +
      `• *Klien:* *${appt.client_name}*\n` +
      `• *Paket:* ${appt.package_name || '-'}\n` +
      `• *Tanggal Acara:* *${eventDateFormatted}*\n` +
      (appt.resepsi_date ? `• *Tanggal Resepsi:* ${safeFormatDateID(appt.resepsi_date)}\n` : '') +
      (appt.jam_akad ? `• *Jam Akad / Acara:* ${appt.jam_akad} WIB\n` : '') +
      (appt.client_address ? `• *Lokasi / Alamat:* ${appt.client_address}\n` : '') +
      (appt.client_phone ? `• *Kontak Klien:* ${appt.client_phone}\n` : '') +
      `\n⚠️ *Penting:* Harap hadir 30 menit sebelum acara dimulai dan segera serahkan file mentah (memory card) maksimal H+1 pasca-acara. Terima kasih & selamat bertugas! 🙏✨`;

    if (targetPhone) {
      await sendWhatsAppNotification(targetPhone, waMsg);
      return res.json({ success: true, message: `Surat tugas berhasil dikirim ke WhatsApp ${crewName || crewRole}! (${targetPhone})` });
    } else {
      return res.status(400).json({ error: 'Nomor WhatsApp kru tidak ditemukan.' });
    }
  } catch (err) {
    console.error('[Send Crew Assignment Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * API Route: Tagih File Mentah ke Fotografer (Peringatan H+1)
 */
app.post('/api/remind-photographer-raw-files', requireAuth, async (req, res) => {
  const { appointmentId, photographerName } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });

  try {
    const { data: appt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !appt) return res.status(404).json({ error: 'Appointment not found' });

    const { data: settingsData } = await supabase.from('settings').select('*');
    const settingsMap = {};
    if (settingsData) settingsData.forEach(s => { settingsMap[s.key] = s.value; });

    const pkgLower = (appt.package_name || '').toLowerCase();
    const isStudio = pkgLower.includes('studio') || pkgLower.includes('wisuda');

    let fgPhone = '';
    if (photographerName && photographerName !== 'Fotografer') {
      const { data: matchedCrew } = await supabase
        .from('crew_members')
        .select('phone')
        .ilike('name', `%${photographerName.trim()}%`)
        .limit(1);
      if (matchedCrew && matchedCrew.length > 0 && matchedCrew[0].phone) {
        fgPhone = matchedCrew[0].phone;
      }
    }

    if (!fgPhone) {
      fgPhone = isStudio ? (settingsMap['team_wa_fg_studio'] || '6285262227876') : (settingsMap['team_wa_fg_wedding'] || '628113178579');
    }

    let cleanedFgPhone = fgPhone ? fgPhone.toString().replace(/[^0-9]/g, '') : '';
    if (cleanedFgPhone.startsWith('0')) cleanedFgPhone = '62' + cleanedFgPhone.slice(1);

    const waMsg = `🚨 *PENGINGAT PENYETORAN FILE MENTAH* 📸\n` +
      `_LAPANBELAS.ID Studio & Production_\n\n` +
      `Halo *${photographerName || 'Tim Fotografer'}*,\n` +
      `Acara dokumentasi untuk klien berikut telah selesai:\n\n` +
      `• *Klien:* *${appt.client_name}* (Pesanan #${appt.id})\n` +
      `• *Paket:* ${appt.package_name || '-'}\n` +
      `• *Tanggal Acara:* ${safeFormatDateID(appt.event_date)}\n\n` +
      `⚠️ *File mentah (Memory Card) terdeteksi belum disetor ke studio.*\n` +
      `Mohon segera menyalin dan menyerahkan file mentah hari ini ke PC Studio agar proses pembuatan link seleksi foto klien tidak tertunda. Terima kasih atas kerjasamanya! 🙏✨`;

    const waUrl = cleanedFgPhone ? `https://wa.me/${cleanedFgPhone}?text=${encodeURIComponent(waMsg)}` : '';

    if (cleanedFgPhone) {
      const sentOk = await sendWhatsAppNotification(cleanedFgPhone, waMsg);
      res.json({
        success: true,
        message: sentOk 
          ? `Peringatan setor file berhasil dikirim ke WhatsApp Fotografer! (${cleanedFgPhone})`
          : `Peringatan disiapkan untuk WhatsApp Fotografer (${cleanedFgPhone})`,
        waUrl,
        phone: cleanedFgPhone
      });
    } else {
      res.status(400).json({ error: 'Nomor WhatsApp Fotografer belum diatur.', waUrl });
    }
  } catch (err) {
    console.error('[Remind FG Raw Files Error]', err);
    res.status(500).json({ error: err.message });
  }
});




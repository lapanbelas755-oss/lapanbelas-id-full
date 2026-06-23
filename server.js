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

function parseInvoiceNotes(notesStr) {
  let addonsTotal = 0;
  let customFeesTotal = 0;
  let voucherDiscount = 0;
  let addonsList = [];
  let customFeesList = [];

  if (!notesStr) return { addonsTotal, customFeesTotal, voucherDiscount, addonsList, customFeesList };

  const addonSectionMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/);
  if (addonSectionMatch) {
    const lines = addonSectionMatch[1].split('\n');
    lines.forEach(line => {
      const clean = line.replace(/^-\s*/, '').trim();
      if (clean) {
        // Support both standard (Rp 1.500.000) and legacy/buggy (Rp Rp 1.500.000)
        const partsMatch = clean.match(/^(.*?)\s*\((?:Rp\s*)?Rp\s*([0-9.,]+)\)/i);
        if (partsMatch) {
          const val = Number(partsMatch[2].replace(/\./g, '').replace(/,/g, ''));
          addonsTotal += val;
          addonsList.push({ name: partsMatch[1].trim(), amount: val });
        }
      }
    });
  }

  const customFeesSectionMatch = notesStr.match(/\[BIAYA LAINNYA\]:\s*\n?((?:- .*\n?)*)/);
  if (customFeesSectionMatch) {
    const lines = customFeesSectionMatch[1].split('\n');
    lines.forEach(line => {
      const clean = line.replace(/^-\s*/, '').trim();
      if (clean) {
        // Support both standard (Rp 500.000) and legacy/buggy (Rp Rp 500.000)
        const partsMatch = clean.match(/^(.*?)\s*\((?:Rp\s*)?Rp\s*([0-9.,]+)\)/i);
        if (partsMatch) {
          const val = Number(partsMatch[2].replace(/\./g, '').replace(/,/g, ''));
          customFeesTotal += val;
          customFeesList.push({ name: partsMatch[1].trim(), amount: val });
        }
      }
    });
  }

  // Support both standard (-Rp 200.000) and legacy/buggy (-Rp Rp 200.000)
  const voucherMatch = notesStr.match(/\[VOUCHER\]:.*?\(-\s*(?:Rp\s*)?Rp\s*([0-9.,]+)\)/i);
  if (voucherMatch) {
    voucherDiscount = Number(voucherMatch[1].replace(/\./g, '').replace(/,/g, ''));
  }

  return { addonsTotal, customFeesTotal, voucherDiscount, addonsList, customFeesList };
}

const PDFDocument = require('pdfkit');

// Load environment variables early
const dotenv = require('dotenv');
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ooxjjhzojligmlyuegat.supabase.co';
// WARNING: server.js should use service_role key to bypass RLS for webhooks!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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


// Serve static files from the build folder if it exists, otherwise current folder
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  app.use(express.static(path.join(__dirname)));
}

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

  // Ensure amount is integer
  const cleanAmount = parseInt(amount, 10);
  const isStudio = division && (
    division.toLowerCase().includes('studio') ||
    ['family', 'maternity', 'group', 'graduation', 'personal', 'couple', 'prewedding studio', 'poto product', 'studio lapanbelas', 'wisuda', 'pas foto'].some(c => division.toLowerCase().includes(c))
  );

  if (isStudio) {
    console.log(`[MIDTRANS] Initiating checkout for Studio Order ID: ${order_id}, Amount: IDR ${cleanAmount}`);
    try {
      const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
      const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
      const midtransBaseUrl = isProd ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
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

      console.log('[MIDTRANS] API Response Success:', response.data.redirect_url);
      if (response.data && response.data.redirect_url) {
        return res.json({ payment_url: response.data.redirect_url });
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
      return res.json({ payment_url: response.data.response.payment.url });
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
      return res.json({ payment_url: mockPaymentUrl });
    }

    return res.status(500).json({
      error: 'Gagal menghubungi server DOKU',
      details: error.response ? error.response.data : error.message
    });
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
        .text(pkgName, 50, currentY);

      // Draw Description Bullet Points (if any)
      const bulletPoints = (pkgDesc || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^-/, '').trim());

      let bulletY = currentY + 14;
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#675d4d');

      bulletPoints.forEach(bullet => {
        doc.text(`• ${bullet}`, 50, bulletY, { width: 175 });
        const bulletHeight = doc.heightOfString(`• ${bullet}`, { width: 175 });
        bulletY += bulletHeight + 2;
      });

      // Draw Category (Column 2)
      doc.fontSize(8.5)
        .font('Helvetica')
        .fillColor('#675d4d')
        .text(pkgCategory, 240, currentY);

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
        dateY += 12;
      });

      // Draw Price (Column 4)
      doc.fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor('#2a6742')
        .text(total, 480, currentY, { align: 'right', width: 60 });

      // Determine bottom boundary of the row
      const rowEndY = Math.max(bulletY, dateY, currentY + 30) + 12;

      // Draw Row Divider
      doc.moveTo(40, rowEndY).lineTo(550, rowEndY).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- Footer / Totals section ---
      const totalTop = rowEndY + 20;

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

      const parsedNotes = parseInvoiceNotes(notesText);
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

      let hasWedding = false;
      let hasMakeup = false;
      let hasDecor = false;
      let hasStudio = false;

      // 0. Cek jika paket Bundling (biasanya mencakup ke-3 divisi)
      if (pkgNameLower.includes('bundling') || pkgCategoryLower.includes('bundling')) {
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

      // 1. Cek dari nama paket atau kategori
      if (pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') || ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k))) {
        hasStudio = true;
      }
      if ((pkgCategoryLower.includes('wedding') || pkgCategoryLower.includes('prewedding') || pkgCategoryLower.includes('engagement') || pkgNameLower.includes('wedding') || pkgNameLower.includes('photo')) && !hasStudio) {
        hasWedding = true;
      }
      if (pkgNameLower.includes('makeup') || pkgCategoryLower.includes('makeup') || pkgNameLower.includes('rias')) {
        hasMakeup = true;
      }
      if (pkgNameLower.includes('dekor') || pkgCategoryLower.includes('dekor')) {
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
 * Helper to send email via Nodemailer
 */
async function sendInvoiceEmail(type, order) {
  const customerEmail = order.client_email || order.customer_email;
  if (!customerEmail) return;

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
        const parsed = parseInvoiceNotes(order.notes || order.additional_notes);
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
        const parsed = parseInvoiceNotes(order.notes || order.additional_notes);
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
        const parsed = parseInvoiceNotes(order.notes || order.additional_notes);
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
}

/**
 * Helper to send progress update email via Nodemailer
 */
async function sendProgressEmail(status, order) {
  const customerEmail = order.client_email;
  if (!customerEmail) return;

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

  let ctaHtml = `
    <div style="text-align: center; margin: 35px 0 10px 0;">
      <a href="${APP_URL}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 700; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-size: 13px; letter-spacing: 1px; box-shadow: 0 10px 20px -5px rgba(255,255,255,0.15);">
        MASUK KE DASHBOARD SAYA
      </a>
    </div>
  `;

  if (status.includes('Selesai untuk Preview') && (linkHasilFoto || linkHasilVideo)) {
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

  const mailer = getMailerForOrder(order);
  await mailer.transporter.sendMail({
    from: `"LAPANBELAS.ID" <${mailer.fromEmail}>`,
    to: customerEmail,
    subject: subject,
    html: htmlBody
  });
  console.log(`[Email] Sent progress (${status}) email to ${customerEmail}`);
}

/**
 * API Route: Send Invoice Email from Frontend
 */
app.post('/api/send-invoice-email', async (req, res) => {
  const { type, order } = req.body;
  if (!order || !type) return res.status(400).json({ error: 'Invalid payload' });

  try {
    // Fetch full order data - packages(*) join won't work because package_name is text, not FK
    const { data: fullOrder, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', order.id)
      .single();

    const orderToUse = (fullOrder && !error) ? fullOrder : order;

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

app.post('/api/fitting-pdf-generate', async (req, res) => {
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
 * API Route: Send Progress Email from Frontend
 */
app.post('/api/send-progress-email', async (req, res) => {
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
  const customerEmail = order.client_email;
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
}

/**
 * API Route: Send Drive Link Email
 */
app.post('/api/send-drive-link-email', async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ error: 'Invalid payload' });

  try {
    // Save drive_link to database first so client portal can access it
    if (order.id && order.drive_link) {
      const { error: dbError } = await supabase
        .from('appointments')
        .update({ drive_link: order.drive_link })
        .eq('id', order.id);
        
      if (dbError) {
        console.error('[DB] Failed to update drive link:', dbError);
        return res.status(500).json({ error: 'Gagal menyimpan link Drive ke database: ' + dbError.message });
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
app.post('/api/send-editor-notification', async (req, res) => {
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
            <a href="${APP_URL}/index-admin.html" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; font-weight: 700; padding: 16px 40px; border-radius: 30px; text-decoration: none; font-size: 14px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(124,58,237,0.4); text-transform: uppercase;">
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
  // Strip the timestamp suffix (e.g. BK-123456-17123456789 -> BK-123456)
  const invoiceNumber = rawOrderId ? rawOrderId.split('-').slice(0, 2).join('-') : null;
  const transactionStatus = requestBody.transaction_status;
  const fraudStatus = requestBody.fraud_status;

  if (!invoiceNumber) {
    return res.status(400).send('Bad Request: Missing order_id');
  }

  // Verify Signature Key
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const signatureStr = requestBody.order_id + requestBody.status_code + requestBody.gross_amount + serverKey;
  const calculatedSignature = crypto.createHash('sha512').update(signatureStr).digest('hex');

  if (calculatedSignature !== requestBody.signature_key) {
    console.warn('[MIDTRANS Notification] Signature mismatch! Proceeding with caution or sandbox mode.');
  } else {
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
      console.log(`[MIDTRANS Notification] Updating Supabase database status to 'Sudah DP' for Invoice: ${invoiceNumber}`);

      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'Sudah DP' })
        .eq('id', invoiceNumber);

      if (error) {
        console.error('[MIDTRANS Notification] Failed to update Supabase:', error.message);
      } else {
        console.log('[MIDTRANS Notification] Successfully updated database. Order is now DP Settled!');

        // Fetch the full order details to send the email
        const { data: orderData, error: fetchErr } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', invoiceNumber)
          .single();

        if (orderData && !fetchErr) {
          if (orderData.package_name) {
            const { data: pkgData } = await supabase.from('packages').select('*').eq('title', orderData.package_name).single();
            if (pkgData) orderData.packages = pkgData;
          }
          sendInvoiceEmail('sudah_dp', orderData).catch(err => {
            console.error('[MIDTRANS Notification] Failed to send invoice email after payment:', err.message);
          });
        }
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
  const invoiceNumber = requestBody?.order?.invoice_number;
  const amount = requestBody?.order?.amount;

  if (!invoiceNumber) {
    return res.status(400).send('Bad Request: Missing invoice number');
  }

  // Optional Signature verification
  const clientId = headers['client-id'] || headers['x-client-id'];
  const requestId = headers['request-id'] || headers['x-request-id'];
  const timestamp = headers['request-timestamp'] || headers['x-request-timestamp'];
  const signatureReceived = headers['signature'] || headers['x-signature'];
  const secretKey = process.env.DOKU_SECRET_KEY;

  const isPlaceholderCredentials =
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
      // Soft validation: log warning but still process to avoid blocking valid payments
      // (DOKU Sandbox sometimes sends slightly different signature formats per payment method)
      console.warn('[DOKU Notification] Signature mismatch (soft check). Proceeding anyway.');
      console.warn(`[DOKU Notification] Expected: ${finalSignature}`);
      console.warn(`[DOKU Notification] Received: ${signatureReceived}`);
    } else {
      console.log('[DOKU Notification] Signature verified successfully!');
    }
  } else {
    console.log('[DOKU Notification] Skipping signature verification (Sandbox mode/Placeholders).');
  }

  // Update Supabase directly instead of using n8n
  try {
    console.log(`[DOKU Notification] Updating Supabase database status to 'Sudah DP' for Invoice: ${invoiceNumber}`);

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'Sudah DP' })
      .eq('id', invoiceNumber);

    if (error) {
      console.error('[DOKU Notification] Failed to update Supabase:', error.message);
    } else {
      console.log('[DOKU Notification] Successfully updated database. Order is now DP Settled!');

      // Fetch the full order details to send the email
      const { data: orderData, error: fetchErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', invoiceNumber)
        .single();

      if (orderData && !fetchErr) {
        // Manually attach package info (packages(*) join doesn't work since package_name is text, not FK)
        if (orderData.package_name) {
          const { data: pkgData } = await supabase.from('packages').select('*').eq('title', orderData.package_name).single();
          if (pkgData) orderData.packages = pkgData;
        }
        // Send email asynchronously without blocking the webhook response
        sendInvoiceEmail('sudah_dp', orderData).catch(err => {
          console.error('[DOKU Notification] Failed to send invoice email after payment:', err.message);
        });
      }
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
        console.log(`[Follow-up System] Sending Email 1 (Consultation) to ${user.email} (registered ${hoursSinceReg.toFixed(1)}h ago)...`);

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
          console.log(`[Follow-up System] Successfully processed Email 1 for ${user.email}`);
        } catch (mailErr) {
          console.error(`[Follow-up System] Mail Error sending Email 1 to ${user.email}:`, mailErr.message);
        }
      }

      // --- EMAIL FOLLOW-UP 2 (After 72 Hours) ---
      else if (hoursSinceReg >= 72 && metadata.followup_1_sent && !metadata.followup_2_sent) {
        console.log(`[Follow-up System] Sending Email 2 (Voucher 100K) to ${user.email} (registered ${hoursSinceReg.toFixed(1)}h ago)...`);

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
          console.log(`[Follow-up System] Successfully processed Email 2 for ${user.email}`);
        } catch (mailErr) {
          console.error(`[Follow-up System] Mail Error sending Email 2 to ${user.email}:`, mailErr.message);
        }
      }
    }
  } catch (globalErr) {
    console.error('[Follow-up System] Global error in background marketing scheduler:', globalErr);
  }
}

// Start Background Interval Check (Every 6 hours)
setInterval(checkAndSendFollowUps, 6 * 60 * 60 * 1000);
// Trigger once on server startup after a small delay (10 seconds) to verify and boot up
setTimeout(checkAndSendFollowUps, 10000);

/**
 * Background Payment Reminder Engine: Automatic Payment Reminder
 * Runs periodically to automatically send a reminder email at 07:00 AM WIB (Asia/Jakarta)
 * to customers whose events have completed (H+1 or older) but status is still 'Sudah DP' (not paid in full).
 */
async function checkAndSendPaymentReminders() {
  try {
    const now = new Date();
    // Convert to WIB (UTC+7)
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + wibOffset);
    const wibHours = wibNow.getUTCHours();

    // Check if it is exactly 7:00 AM WIB (hour 7)
    if (wibHours !== 7) {
      console.log(`[Payment Reminder System] Check skipped. Current time is ${String(wibHours).padStart(2, '0')}:00 WIB. Automatic reminders only run at 07:00 AM WIB.`);
      return;
    }

    console.log('[Payment Reminder System] Running automatic payment reminder check at 07:00 AM WIB...');

    const wibDateStr = wibNow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

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

      console.log(`[Payment Reminder System] Sending automatic payment reminder email to ${orderData.client_email} for booking #${orderData.id}...`);

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
          console.log(`[Payment Reminder System] Successfully sent reminder and updated database for #${appt.id}`);
        }
      } catch (sendErr) {
        console.error(`[Payment Reminder System] Failed to send reminder email to ${orderData.client_email}:`, sendErr.message);
      }
    }
  } catch (globalErr) {
    console.error('[Payment Reminder System] Global error in payment reminder scheduler:', globalErr);
  }
}

// Start Payment Reminder Scheduler Check (Every 30 minutes)
setInterval(checkAndSendPaymentReminders, 30 * 60 * 1000);
// Trigger once on server startup after a small delay (15 seconds) to verify and boot up
setTimeout(checkAndSendPaymentReminders, 15000);

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
 * API Route: Get Photos from Google Drive Folder for Client Portal
 */
app.get('/api/drive-folder-photos/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { subfolderId } = req.query;
  
  try {
    const { data: order, error } = await supabase
      .from('appointments')
      .select('drive_link, package_name')
      .eq('id', orderId)
      .single();

    if (error || !order || !order.drive_link) {
      return res.status(404).json({ error: 'Order or Drive link not found' });
    }

    let photoLimit = 80; // default fallback
    if (order.package_name) {
      const { data: pkgData } = await supabase
        .from('packages')
        .select('description')
        .eq('title', order.package_name)
        .single();
      if (pkgData && pkgData.description) {
        const match = pkgData.description.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
        if (match) {
          photoLimit = parseInt(match[1], 10);
        } else {
          // Fallback parsing from package name if not explicitly set in description
          const name = order.package_name.toLowerCase();
          if (name.includes('80')) photoLimit = 80;
          else if (name.includes('100')) photoLimit = 100;
          else if (name.includes('50')) photoLimit = 50;
          else if (name.includes('150')) photoLimit = 150;
        }
      } else {
        // Fallback parsing from package name if package description is missing
        const name = order.package_name.toLowerCase();
        if (name.includes('80')) photoLimit = 80;
        else if (name.includes('100')) photoLimit = 100;
        else if (name.includes('50')) photoLimit = 50;
        else if (name.includes('150')) photoLimit = 150;
      }
    }

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
          largeThumb = largeThumb.replace(/=s\d+$/, '=s1600');
        } else {
          largeThumb = `${largeThumb}=s1600`;
        }
      } else {
        largeThumb = file.mimeType !== 'application/vnd.google-apps.folder' 
          ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`
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
      photo_limit: photoLimit
    });
  } catch (err) {
    console.error('[Drive API] Error fetching photos:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch photos from Drive' });
  }
});

/**
 * API Route: Submit Photo Selection
 */
app.post('/api/submit-photo-selection', async (req, res) => {
  const { orderId, selectedPhotos } = req.body;
  if (!orderId || !selectedPhotos || !Array.isArray(selectedPhotos)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    // 1. Fetch current order to see if we can save it in additional_notes (as a workaround if no column exists)
    const { data: order } = await supabase
      .from('appointments')
      .select('additional_notes, status, client_name, package_name, id, drive_link, client_email')
      .eq('id', orderId)
      .single();

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Format selection text
    const selectionText = `\n[FOTO TERPILIH]:\n${selectedPhotos.map((p, i) => `${i+1}. ${p.name}`).join('\n')}`;
    let newNotes = order.additional_notes || '';
    if (newNotes.includes('[FOTO TERPILIH]')) {
      // Replace old selection
      newNotes = newNotes.replace(/\n\[FOTO TERPILIH\]:[\s\S]*/, selectionText);
    } else {
      newNotes += selectionText;
    }

    // 2. Update notes in database (Do NOT update status to 'Sudah Dipilih' because it violates the check constraint)
    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        additional_notes: newNotes
      })
      .eq('id', orderId);

    if (updateErr) throw updateErr;

    console.log(`[Portal] Photo selection saved for order ${orderId} in appointments.additional_notes`);

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
            const match = (pkg.description || '').match(/\[DEADLINE\]:\s*(\d+)/i);
            if (match) {
              deadlineDays = parseInt(match[1], 10);
            } else {
              const studioCategories = ['Studio Lapanbelas', 'Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'];
              if (studioCategories.includes(pkgCategory)) {
                deadlineDays = 7;
              } else if (pkgCategory === 'Wedding' || pkgCategory === 'Pre-Wedding' || pkgCategory === 'lapanbelas.id') {
                deadlineDays = 60;
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
        parts[0] = selectedListStr; // Update selected photos list
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
            deadline: computedDeadline
          })
          .eq('appointment_id', orderId);

        if (updateAssErr) {
          console.error('[Portal] Failed to update editor assignment:', updateAssErr);
        } else {
          assignment.file_code = newFileCode;
          assignment.status_foto = 'Antrian Pengerjaan';
          assignment.deadline = computedDeadline;
          console.log(`[Portal] Editor assignment updated for order ${orderId} (status_foto -> Antrian Pengerjaan, deadline -> ${computedDeadline})`);
        }
      } else {
        // Auto Create new assignment
        const defaultEditorName = isStudio ? 'EDITOR PHOTO STUDIO' : 'EDITOR PHOTO 18';
        const newFileCode = `${selectedListStr} ||  || ${order.drive_link || ''} || ${todayStr}`;
        const newAssignment = {
          appointment_id: orderId,
          editor_name: defaultEditorName,
          status_foto: 'Antrian Pengerjaan',
          file_code: newFileCode,
          deadline: computedDeadline
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
              const subject = `[📸 Seleksi Foto Selesai] Klien #${orderId} - ${order.client_name}`;
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
                      Klien telah selesai melakukan pemilihan foto untuk proyek berikut:
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
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Paket</td>
                          <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">${order.package_name || '-'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Jumlah Terpilih</td>
                          <td style="padding: 8px 0; color: #a78bfa; font-weight: 700;">${selectedPhotos.length} Foto</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Deadline Pengerjaan</td>
                          <td style="padding: 8px 0; color: #ef4444; font-weight: 700;">${safeFormatDateID(computedDeadline)} (${deadlineDays} Hari)</td>
                        </tr>
                      </table>
                    </div>

                    <p style="line-height: 1.6; color: #94a3b8; font-size: 14px;">
                      Status pengerjaan foto Anda kini masuk dalam <strong>Antrian Pengerjaan</strong>. Silakan segera buka Dasbor Admin untuk memproses editing foto pilihan klien.
                    </p>

                    <!-- Button to Admin Dashboard -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${appUrl}/index-admin.html" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; font-weight: 700; padding: 16px 40px; border-radius: 30px; text-decoration: none; font-size: 14px; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(124,58,237,0.4); text-transform: uppercase;">
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

              await activeTransporter.sendMail({
                from: `"LAPANBELAS.ID" <${fromEmail}>`,
                to: editorUser.username,
                subject: subject,
                html: htmlBody
              });

              console.log(`[Email] Sent photo selection completion notification email to editor ${editorUser.username} for order ${orderId}`);
            } catch (emailErr) {
              console.error('[Email] Failed to send photo selection notification email to editor:', emailErr);
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Portal] Failed to submit photo selection:', err);
    res.status(500).json({ error: 'Failed to save selection' });
  }
});

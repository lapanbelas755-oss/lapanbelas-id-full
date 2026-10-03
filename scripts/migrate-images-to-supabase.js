require('dotenv').config();
const https = require('https');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cache untuk menghindari download & upload berulang file yang sama
const urlMap = new Map();
let realIps = [];

// Resolve real IP via Google DoH untuk membypass DNS blocking ISP (XL Axiata / Internet Positif)
async function getRealIps() {
  if (realIps.length > 0) return realIps;
  try {
    const res = await fetch('https://dns.google/resolve?name=ik.imagekit.io&type=A');
    const data = await res.json();
    realIps = data.Answer.filter(a => a.type === 1).map(a => a.data);
    console.log('[DNS] Real IPs for ik.imagekit.io:', realIps);
    return realIps;
  } catch (err) {
    console.error('[DNS] Failed to resolve via DoH:', err.message);
    return ['3.170.229.48', '3.170.229.122'];
  }
}

// Download image dari ImageKit menggunakan real IP & SNI
async function downloadFromImageKit(urlStr) {
  const ips = await getRealIps();
  const parsedUrl = new URL(urlStr);
  const targetIp = ips[0];

  return new Promise((resolve, reject) => {
    const req = https.request({
      host: targetIp,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Host': 'ik.imagekit.io',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      },
      servername: 'ik.imagekit.io',
      rejectUnauthorized: true,
      timeout: 15000
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Failed to download ${urlStr}, status code: ${res.statusCode}`));
      }

      const contentType = res.headers['content-type'] || 'image/jpeg';
      const chunks = [];

      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, contentType });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Download timeout for ${urlStr}`));
    });
    req.end();
  });
}

// Helper untuk migrasi 1 file URL ImageKit ke Supabase Storage
async function migrateSingleUrl(urlStr, folderPrefix = 'migrated') {
  if (!urlStr || !urlStr.includes('imagekit.io')) {
    return urlStr;
  }

  // Cek cache
  if (urlMap.has(urlStr)) {
    return urlMap.get(urlStr);
  }

  try {
    const parsed = new URL(urlStr);
    const rawFilename = path.basename(parsed.pathname);
    // Bersihkan karakter aneh
    const cleanFilename = decodeURIComponent(rawFilename)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();

    const uniqueStoragePath = `${folderPrefix}/${Date.now()}_${cleanFilename}`;

    console.log(`  Downloading: ${urlStr} ...`);
    const { buffer, contentType } = await downloadFromImageKit(urlStr);

    console.log(`  Uploading to Supabase Storage: packages/${uniqueStoragePath} (${(buffer.length / 1024).toFixed(1)} KB) ...`);
    const { error: uploadError } = await supabase.storage
      .from('packages')
      .upload(uniqueStoragePath, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    const { data: pubData } = supabase.storage
      .from('packages')
      .getPublicUrl(uniqueStoragePath);

    const newUrl = pubData.publicUrl;
    console.log(`  -> SUCCESS! New URL: ${newUrl}`);

    urlMap.set(urlStr, newUrl);
    return newUrl;
  } catch (err) {
    console.error(`  [MIGRATION ERROR] ${urlStr}:`, err.message);
    return urlStr; // Fallback tetap gunakan yang lama jika gagal
  }
}

async function main() {
  console.log('=== STARTING IMAGE MIGRATION: ImageKit -> Supabase Storage ===\n');

  // Pastikan bucket packages siap
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets.some(b => b.name === 'packages')) {
    console.log('Creating bucket "packages"...');
    await supabase.storage.createBucket('packages', { public: true });
  }

  // 1. Migrasi PACKAGES
  console.log('\n--- 1. Migrating PACKAGES ---');
  const { data: packages, error: pkgErr } = await supabase.from('packages').select('id, title, image_url');
  if (pkgErr) throw pkgErr;

  let pkgUpdatedCount = 0;
  for (const pkg of packages) {
    if (pkg.image_url && pkg.image_url.includes('imagekit.io')) {
      console.log(`\n[Package #${pkg.id}] ${pkg.title}`);
      const newUrl = await migrateSingleUrl(pkg.image_url, 'packages');
      if (newUrl !== pkg.image_url) {
        const { error: updateErr } = await supabase
          .from('packages')
          .update({ image_url: newUrl })
          .eq('id', pkg.id);

        if (updateErr) {
          console.error(`  Failed to update package DB #${pkg.id}:`, updateErr.message);
        } else {
          pkgUpdatedCount++;
          console.log(`  Database package #${pkg.id} updated successfully.`);
        }
      }
    }
  }
  console.log(`\nPackages migration completed: ${pkgUpdatedCount} updated.`);

  // 2. Migrasi SETTINGS (slideshow_banners)
  console.log('\n--- 2. Migrating SETTINGS (slideshow_banners) ---');
  const { data: settingsData, error: setErr } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'slideshow_banners');

  if (!setErr && settingsData && settingsData.length > 0) {
    for (const setting of settingsData) {
      if (setting.value && setting.value.includes('imagekit.io')) {
        try {
          const banners = JSON.parse(setting.value);
          let changed = false;
          for (const banner of banners) {
            if (banner.image && banner.image.includes('imagekit.io')) {
              console.log(`\n[Banner] ${banner.title || 'Untitled'}`);
              const newUrl = await migrateSingleUrl(banner.image, 'banners');
              if (newUrl !== banner.image) {
                banner.image = newUrl;
                changed = true;
              }
            }
          }
          if (changed) {
            const { error: setUpdateErr } = await supabase
              .from('settings')
              .update({ value: JSON.stringify(banners), updated_at: new Date().toISOString() })
              .eq('id', setting.id);

            if (setUpdateErr) {
              console.error('  Failed to update slideshow settings:', setUpdateErr.message);
            } else {
              console.log('  Slideshow settings updated successfully.');
            }
          }
        } catch (e) {
          console.error('  Failed to parse/update slideshow setting:', e.message);
        }
      }
    }
  }

  // 3. Migrasi PORTFOLIO
  console.log('\n--- 3. Migrating PORTFOLIO ---');
  const { data: portfolioList, error: portErr } = await supabase.from('portfolio').select('*');
  if (!portErr && portfolioList) {
    let portUpdatedCount = 0;
    for (const item of portfolioList) {
      if (item.url && item.url.includes('imagekit.io')) {
        console.log(`\n[Portfolio #${item.id}] ${item.title}`);
        const urls = item.url.split(',').map(s => s.trim());
        const newUrls = [];
        let itemChanged = false;

        for (const u of urls) {
          if (u.includes('imagekit.io')) {
            const newU = await migrateSingleUrl(u, 'portfolio');
            newUrls.push(newU);
            if (newU !== u) itemChanged = true;
          } else {
            newUrls.push(u);
          }
        }

        if (itemChanged) {
          const { error: portUpErr } = await supabase
            .from('portfolio')
            .update({ url: newUrls.join(',') })
            .eq('id', item.id);

          if (portUpErr) {
            console.error(`  Failed to update portfolio #${item.id}:`, portUpErr.message);
          } else {
            portUpdatedCount++;
            console.log(`  Portfolio #${item.id} updated successfully.`);
          }
        }
      }
    }
    console.log(`\nPortfolio migration completed: ${portUpdatedCount} updated.`);
  }

  console.log('\n=== ALL MIGRATIONS COMPLETED SUCCESSFULLY! ===');
}

main().catch(console.error);

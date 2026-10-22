// Offline-First Service Worker for 18Studio / LAPANBELAS.ID
// Strategy: 0-Detik Instant Open, Offline-First Caching with Background Revalidation
// Strict Zero-Regression Protection for APIs, Auth & Payments

const CACHE_NAME = '18studio-pwa-v2';

const CORE_ASSETS = [
  '/',
  '/crew',
  '/booking',
  '/queue',
  '/invoice',
  '/offline.html',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
  '/crew.webmanifest',
  '/pwa-register.js'
];

// 1. Install: Precache core app shell & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual caching so one missing asset doesn't break the entire precache
      return Promise.all(
        CORE_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn('[SW Precache] Skipped asset:', asset, err);
          });
        })
      );
    })
  );
});

// 2. Activate: Purge old cache versions and claim all open clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Offline-First & 0-Second Opening
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  // Bypass unsupported schemes (chrome-extension, file, data, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // STRICT BYPASS: Never cache sw.js, manifest, APIs, Supabase, or payment gateways
  if (
    url.pathname === '/sw.js' ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('doku') ||
    url.hostname.includes('midtrans') ||
    url.hostname.includes('whatsapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return; // Pass through directly to native network
  }

  // A. Navigation Requests (HTML Pages like /, /crew, /booking, /queue, /invoice)
  // Strategy: Stale-While-Revalidate (0-Second Open from Cache + Silent Background Sync)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(req);

        // Background Network Fetch Promise
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW Navigation] Network unavailable:', err);
            return null;
          });

        // ⚡ INSTANT 0-DETIK OPEN: If cached copy exists in phone memory, serve it immediately!
        if (cachedResponse) {
          event.waitUntil(fetchPromise); // Silently revalidate in background
          return cachedResponse;
        }

        // If not in cache yet (first-ever visit to this subpage), await network
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // ✈️ AIRPLANE MODE / OFFLINE FALLBACK:
        // Try fallback to offline.html, or cached home shell
        const offlineFallback = await cache.match('/offline.html');
        if (offlineFallback) return offlineFallback;

        const homeFallback = await cache.match('/');
        if (homeFallback) return homeFallback;

        return new Response('Mode Offline - Halaman belum tersimpan di memori.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // B. Static Assets (Vite hashed JS/CSS, images, icons, fonts)
  // Strategy: Cache-First (Instant 0 ms from phone memory) with Network Fallback
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);

      if (cached) {
        // For non-hashed assets (like /logo.png), revalidate silently in background
        if (!url.pathname.startsWith('/assets/')) {
          event.waitUntil(
            fetch(req)
              .then((res) => {
                if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
                  cache.put(req, res.clone());
                }
              })
              .catch(() => {})
          );
        }
        return cached;
      }

      // Not in cache: fetch from network and save to cache
      try {
        const networkResponse = await fetch(req);
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          cache.put(req, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        return cached || new Response('', { status: 404 });
      }
    })()
  );
});

// ==========================================
// Web Push Notifications Handler (VAPID)
// ==========================================
self.addEventListener('push', (event) => {
  let data = {
    title: '18Studio / LAPANBELAS.ID',
    body: 'Anda memiliki notifikasi baru.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/',
    vibrate: [100, 50, 100]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: data.actions || []
  };

  const tasks = [
    self.registration.showNotification(data.title, options)
  ];

  // App Badging API: Show red badge on app icon
  if ('setAppBadge' in self.navigator) {
    const badgeNum = typeof data.badgeCount === 'number' ? data.badgeCount : 1;
    tasks.push(
      self.navigator.setAppBadge(badgeNum).catch((err) => console.warn('[SW Badge]', err))
    );
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  // Clear App Badge on notification click
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch((err) => console.warn('[SW Clear Badge]', err));
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

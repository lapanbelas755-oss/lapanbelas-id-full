// Offline-First Service Worker for 18Studio / LAPANBELAS.ID
// Strategy: 0-Detik Instant Open, Offline-First Caching with Background Revalidation
// Strict Zero-Regression Protection for APIs, Auth & Payments

const CACHE_NAME = '18studio-pwa-v10';
const NAV_NETWORK_TIMEOUT_MS = 2500;

const CORE_ASSETS = [
  '/',
  '/crew',
  '/booking',
  '/queue',
  '/invoice',
  '/pilih-foto',
  '/feedback',
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
  // Strategy: Network-First with short timeout -> cache fallback.
  // Mencegah HTML lama (berisi referensi bundle JS yang sudah dihapus setelah deploy)
  // tersaji dari cache dan menyebabkan layar putih / gagal masuk.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        const fetchPromise = fetch(req, { cache: 'no-store' })
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW Navigation] Network unavailable:', err);
            return null;
          });

        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve('timeout'), NAV_NETWORK_TIMEOUT_MS);
        });

        const firstResult = await Promise.race([fetchPromise, timeoutPromise]);
        if (firstResult && firstResult !== 'timeout') {
          return firstResult;
        }

        // Network lambat/offline: pakai cache bila ada, network tetap dilanjutkan di background
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        // Belum ada cache: tunggu network sampai selesai
        const networkResponse = firstResult === 'timeout' ? await fetchPromise : null;
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
    tag: data.tag || ('notif-' + Date.now()),
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || '/',
      title: data.title,
      body: data.body,
      timestamp: Date.now()
    },
    actions: data.actions && data.actions.length > 0 ? data.actions : [
      { action: 'open', title: '👀 Buka Tugas' }
    ]
  };

  const tasks = [
    self.registration.showNotification(data.title, options)
  ];

  // App Badging API: Tampilkan angka merah di icon aplikasi sesuai badgeCount aktual
  if ('setAppBadge' in self.navigator) {
    const badgeNum = typeof data.badgeCount === 'number' ? data.badgeCount : 1;
    tasks.push(
      self.navigator.setAppBadge(badgeNum).catch((err) => console.warn('[SW Badge]', err))
    );
  }

  // Broadcast sinyal ke semua window client yang sedang terbuka/background agar langsung fetch data
  const broadcastTasks = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: 'CREW_PUSH_RECEIVED', payload: data });
    });
  });
  tasks.push(broadcastTasks);

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/crew';
  const targetPath = new URL(targetUrl, self.location.origin).pathname.split('/')[1] || '';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Kirim sinyal klik notifikasi ke client agar langsung refresh data job secara instan
        client.postMessage({ type: 'CREW_NOTIFICATION_CLICKED', url: targetUrl });
      }
      const sameSection = clientList.find((c) => {
        const p = new URL(c.url).pathname.split('/')[1] || '';
        return p === targetPath && 'focus' in c;
      });
      if (sameSection) return sameSection.focus();
      if (clientList[0] && 'navigate' in clientList[0]) {
        return clientList[0].navigate(targetUrl).then((c) => (c ? c.focus() : null)).catch(() => clients.openWindow(targetUrl));
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ==========================================
// Push Subscription Rotation (iOS/Android dapat mengganti endpoint diam-diam)
// Daftarkan ulang otomatis agar notifikasi banner tidak berhenti.
// ==========================================
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
  event.waitUntil(
    (async () => {
      try {
        let applicationServerKey = event.oldSubscription && event.oldSubscription.options
          ? event.oldSubscription.options.applicationServerKey
          : null;
        if (!applicationServerKey) {
          const keyRes = await fetch('/api/notifications/vapid-public-key');
          const { publicKey } = await keyRes.json();
          const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
          const raw = atob((publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
          applicationServerKey = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        }
        const newSub = event.newSubscription || await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSub, oldEndpoint })
        });
      } catch (err) {
        console.warn('[SW pushsubscriptionchange]', err);
      }
    })()
  );
});

// ==========================================
// Client Message Listener (Sync App Badge direct from Window)
// ==========================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Sinkronisasi badge angka merah di icon iPhone / Android
  if (event.data.type === 'SYNC_BADGE') {
    const rawCount = event.data.badgeCount;
    const count = parseInt(rawCount, 10);
    if ('setAppBadge' in self.navigator) {
      if (!isNaN(count) && count > 0) {
        self.navigator.setAppBadge(count).catch((e) => console.warn('[SW setAppBadge]', e));
      } else {
        self.navigator.clearAppBadge().catch((e) => console.warn('[SW clearAppBadge]', e));
      }
    }
  } else if (event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self.navigator) {
      self.navigator.clearAppBadge().catch((e) => console.warn('[SW clearAppBadge]', e));
    }
  }
});


// PWA Service Worker Registration, Install Prompt & Push Notification (VAPID) Handler
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Automatically check for SW updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available and activated.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('DOMContentLoaded', registerSW);
    window.addEventListener('load', registerSW);
  }
}

// Capture BeforeInstallPromptEvent for custom install triggers if needed
window.addEventListener('beforeinstallprompt', (e) => {
  window.deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
  console.log('[PWA] App is installable');
});

window.addEventListener('appinstalled', () => {
  window.deferredPrompt = null;
  console.log('[PWA] App installed successfully');
});

// Helper: Convert VAPID Public Key base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Global helper to request permission and subscribe to Web Push Notifications
window.subscribeToPush = async function (userType = 'guest', userId = null) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Web Push Notifications tidak didukung di browser ini.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan atau ditolak.');
  }

  const registration = await navigator.serviceWorker.ready;

  // 1. Fetch public VAPID key from backend with fallback
  let publicKey = null;
  try {
    const keyRes = await fetch('/api/notifications/vapid-public-key');
    if (keyRes.ok) {
      const data = await keyRes.json();
      publicKey = data.publicKey;
    }
  } catch (err) {
    console.warn('[PWA] Gagal fetch VAPID key, menggunakan default fallback:', err);
  }
  if (!publicKey) {
    publicKey = 'BJ23gfn6K6UYnoipIw4bHKTCwcXuQDkSEfmgF3R6JMuYnGRGmLGToSAcTIkKInS22Z4D0O7unjvjXCkJRMM6wv8';
  }

  // 2. Subscribe to Push Manager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  // 3. Register subscription on backend
  const saveRes = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      userType,
      userId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    })
  });

  if (!saveRes.ok) {
    throw new Error('Gagal menyimpan pendaftaran notifikasi ke server.');
  }

  return await saveRes.json();
};

// Global helper to trigger a test push notification
window.testPushNotification = async function (userType = 'guest', userId = null) {
  const res = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType, userId })
  });
  return await res.json();
};

// ==========================================
// App Badging API (Red badge on app icon - Dual Window + SW Dispatch)
// ==========================================
window.setAppBadge = function (count = 1) {
  const num = parseInt(count, 10);
  if (isNaN(num) || num <= 0) {
    return window.clearAppBadge();
  }

  // 1. Jalur Window context (WebKit iOS PWA / Chrome Android)
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    navigator.setAppBadge(num).catch((e) => console.warn('[App Badge Window]', e));
  }

  // 2. Jalur Service Worker context (Background/Active controller)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'SYNC_BADGE', badgeCount: num });
    } catch (e) {
      console.warn('[App Badge SW PostMessage]', e);
    }
  }
};

window.clearAppBadge = function () {
  if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch((e) => console.warn('[App Badge Clear Window]', e));
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' });
    } catch (e) {
      console.warn('[App Badge Clear SW]', e);
    }
  }
};

// ==========================================
// Web Share Native API (with smart fallback)
// ==========================================
window.canNativeShare = function (data) {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    if (typeof navigator.canShare === 'function' && data) {
      try {
        return navigator.canShare(data);
      } catch (e) {
        return true;
      }
    }
    return true;
  }
  return false;
};

window.nativeShare = async function ({ title, text, url, files } = {}) {
  const shareData = {};
  if (title) shareData.title = title;
  if (text) shareData.text = text;
  if (url) shareData.url = url;
  if (files && Array.isArray(files) && files.length > 0) shareData.files = files;

  // 1. Try Native Web Share API (Mobile Android / iOS Sheet)
  if (window.canNativeShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, aborted: true };
      }
      console.warn('[WebShare] Native share error, falling back:', err);
    }
  }

  // 2. Fallback: Copy to Clipboard
  const combinedContent = [title, text, url].filter(Boolean).join('\n\n');
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url || combinedContent);
      return {
        success: true,
        method: 'clipboard',
        message: 'Tautan berhasil disalin ke clipboard! 📋'
      };
    } catch (clipErr) {
      console.warn('[WebShare] Clipboard fallback failed:', clipErr);
    }
  }

  // 3. Fallback: Open WhatsApp with prefilled text
  try {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(combinedContent)}`;
    window.open(waUrl, '_blank');
    return { success: true, method: 'whatsapp' };
  } catch (waErr) {
    return { success: false, error: 'Tidak dapat membagikan tautan.' };
  }
};


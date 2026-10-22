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

  // 1. Fetch public VAPID key from backend
  const keyRes = await fetch('/api/notifications/vapid-public-key');
  if (!keyRes.ok) {
    throw new Error('Gagal mengambil kunci VAPID publik dari server.');
  }
  const { publicKey } = await keyRes.json();

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
// App Badging API (Red badge on app icon)
// ==========================================
window.setAppBadge = function (count = 1) {
  if ('setAppBadge' in navigator) {
    return navigator.setAppBadge(count).catch((e) => console.warn('[App Badge]', e));
  }
};

window.clearAppBadge = function () {
  if ('clearAppBadge' in navigator) {
    return navigator.clearAppBadge().catch((e) => console.warn('[App Badge]', e));
  }
};

// Automatically clear the badge when the user switches to or opens the app
window.addEventListener('focus', () => {
  window.clearAppBadge();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    window.clearAppBadge();
  }
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


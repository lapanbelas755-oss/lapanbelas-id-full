/**
 * Web Share Native Utility for 18Studio PWA
 * Supports Native OS Share sheet (WhatsApp, Telegram, AirDrop, Messages)
 * with graceful fallback to Clipboard and WhatsApp Web.
 */

export function canNativeShare(data) {
  if (typeof window !== 'undefined' && typeof window.canNativeShare === 'function') {
    return window.canNativeShare(data);
  }
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareContent({ title, text, url, files, onToast } = {}) {
  // Use global helper if present
  if (typeof window !== 'undefined' && typeof window.nativeShare === 'function') {
    const res = await window.nativeShare({ title, text, url, files });
    if (res && res.success && res.message && onToast) {
      onToast(res.message, 'success');
    }
    return res;
  }

  const shareData = {};
  if (title) shareData.title = title;
  if (text) shareData.text = text;
  if (url) shareData.url = url;
  if (files && Array.isArray(files) && files.length > 0) shareData.files = files;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, aborted: true };
    }
  }

  const combined = [title, text, url].filter(Boolean).join('\n\n');
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url || combined);
      if (onToast) onToast('Tautan berhasil disalin ke clipboard! 📋', 'success');
      return { success: true, method: 'clipboard' };
    } catch (err) {}
  }

  return { success: false };
}

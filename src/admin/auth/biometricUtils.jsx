import React from "react";

function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url) {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray.buffer;
}

function FaceIdIcon({ className = "w-5 h-5" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V6a2 2 0 0 1 2-2h2" />
            <path d="M4 16v2a2 2 0 0 0 2 2h2" />
            <path d="M16 4h2a2 2 0 0 1 2 2v2" />
            <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
            <path d="M9 10h.01" />
            <path d="M15 10h.01" />
            <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
            <path d="M12 11v2" />
        </svg>
    );
}

// Helper deteksi ketersediaan WebAuthn Biometrik (Face ID / Touch ID / Fingerprint)
function checkBiometricSupport() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    // WebAuthn tersedia di iOS 14+ Safari/PWA dan Android 7+ Chrome
    return Boolean(window.PublicKeyCredential && navigator.credentials);
}


export { bufferToBase64Url, base64UrlToBuffer, FaceIdIcon, checkBiometricSupport };

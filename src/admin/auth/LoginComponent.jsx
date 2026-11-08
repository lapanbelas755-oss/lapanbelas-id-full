import React from "react";
import { supabase, adminFetch } from "../adminUtils";
import SvgIcon from "../SvgIcon";
import { bufferToBase64Url, base64UrlToBuffer, FaceIdIcon, checkBiometricSupport } from "./biometricUtils";

function LoginComponent({ onLogin }) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    // Biometric state - WebAuthn Supported Devices
    const [isBiometricSupported, setIsBiometricSupported] = React.useState(checkBiometricSupport);
    const [registeredBio, setRegisteredBio] = React.useState(() => {
        try {
            const saved = localStorage.getItem('18studio_admin_biometric');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [bioLoading, setBioLoading] = React.useState(false);
    const [promptRegister, setPromptRegister] = React.useState(false);
    const [pendingLoginData, setPendingLoginData] = React.useState(null);

    React.useEffect(() => {
        // Refresh saved biometric in case it was updated
        try {
            const saved = localStorage.getItem('18studio_admin_biometric');
            if (saved) setRegisteredBio(JSON.parse(saved));
        } catch (e) {}

        setIsBiometricSupported(checkBiometricSupport());
    }, []);

    const handleBiometricLogin = async () => {
        if (!registeredBio || !registeredBio.credentialId) return;
        setIsLoading(true);
        setBioLoading(true);
        setError('');
        setProgress(25);

        try {
            const chRes = await fetch('/api/admin/biometric/challenge').then(r => r.json());
            if (!chRes.success || !chRes.challenge) {
                throw new Error('Gagal membuat tantangan biometrik.');
            }

            setProgress(45);
            const challengeBuffer = base64UrlToBuffer(chRes.challenge);
            const credIdBuffer = base64UrlToBuffer(registeredBio.credentialId);

            // Trigger Face ID / Touch ID hardware prompt
            await navigator.credentials.get({
                publicKey: {
                    challenge: challengeBuffer,
                    allowCredentials: [{
                        id: credIdBuffer,
                        type: 'public-key'
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            setProgress(70);

            // Verify with server and get Supabase auth OTP
            const loginRes = await fetch('/api/admin/biometric/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: registeredBio.credentialId,
                    email: registeredBio.email
                })
            });

            const loginData = await loginRes.json();
            if (!loginRes.ok || !loginData.success) {
                throw new Error(loginData.error || 'Verifikasi biometrik gagal.');
            }

            setProgress(85);

            // Establish legitimate Supabase session
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                email: loginData.email,
                token: loginData.emailOtp,
                type: 'email'
            });

            if (verifyError || !verifyData.session) {
                throw new Error(verifyError?.message || 'Gagal sinkronisasi sesi Supabase.');
            }

            setProgress(100);
            await new Promise(r => setTimeout(r, 350));
            onLogin({ role: loginData.role, username: loginData.displayName });
        } catch (err) {
            console.error('[Biometric Login] Error:', err);
            setIsLoading(false);
            setBioLoading(false);
            setProgress(0);
            if (err.name === 'NotAllowedError') {
                setError('Pemindaian Face ID / Touch ID dibatalkan.');
            } else {
                setError(err.message || 'Login biometrik gagal. Silakan gunakan password.');
            }
        }
    };

    const handleRegisterBiometric = async () => {
        if (!pendingLoginData) return;
        setIsLoading(true);
        setBioLoading(true);
        setError('');
        setProgress(20);

        try {
            const chRes = await fetch('/api/admin/biometric/challenge').then(r => r.json());
            if (!chRes.success || !chRes.challenge) {
                throw new Error('Gagal mendapatkan challenge keamanan.');
            }

            const challengeBuffer = base64UrlToBuffer(chRes.challenge);
            const userEmail = pendingLoginData.email;
            const displayName = pendingLoginData.displayName || userEmail;
            const userIdBuffer = new TextEncoder().encode(userEmail);

            setProgress(45);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challengeBuffer,
                    rp: { name: '18Studio Admin' },
                    user: {
                        id: userIdBuffer,
                        name: userEmail,
                        displayName: displayName
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },
                        { alg: -257, type: 'public-key' }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000
                }
            });

            setProgress(75);

            const credId = bufferToBase64Url(credential.rawId);
            const deviceName = navigator.userAgent.includes('iPhone') ? 'iPhone'
                : navigator.userAgent.includes('iPad') ? 'iPad'
                : navigator.userAgent.includes('Macintosh') ? 'MacBook'
                : navigator.userAgent.includes('Android') ? 'Android'
                : 'Perangkat Ini';

            const regRes = await fetch('/api/admin/biometric/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    credentialId: credId,
                    deviceName
                })
            });

            const regData = await regRes.json();
            if (!regRes.ok || !regData.success) {
                throw new Error(regData.error || 'Gagal mendaftarkan biometrik di server.');
            }

            const bioRecord = { credentialId: credId, email: userEmail, deviceName };
            localStorage.setItem('18studio_admin_biometric', JSON.stringify(bioRecord));
            setRegisteredBio(bioRecord);

            setProgress(100);
            await new Promise(r => setTimeout(r, 350));
            onLogin(pendingLoginData.sessionData);
        } catch (err) {
            console.error('[Biometric Register] Error:', err);
            setIsLoading(false);
            setBioLoading(false);
            setProgress(0);
            if (err.name === 'NotAllowedError') {
                // User cancelled prompt, still enter dashboard normally
                onLogin(pendingLoginData.sessionData);
            } else {
                setError(err.message || 'Pendaftaran biometrik gagal.');
                setTimeout(() => onLogin(pendingLoginData.sessionData), 1000);
            }
        }
    };

    const handleRemoveBio = async () => {
        if (!registeredBio) return;
        try {
            await fetch('/api/admin/biometric/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: registeredBio.credentialId,
                    email: registeredBio.email
                })
            });
        } catch (e) { }
        localStorage.removeItem('18studio_admin_biometric');
        setRegisteredBio(null);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setProgress(15);

        // Simulasi progres loading yang halus dan responsif
        const progressTimer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 85) return prev;
                return prev + Math.floor(Math.random() * 15) + 8;
            });
        }, 120);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password
            });

            if (error || !data.session) {
                clearInterval(progressTimer);
                setIsLoading(false);
                setProgress(0);
                setError('Email atau password salah.');
                return;
            }

            // Ambil role dari tabel admin_users berdasarkan email
            const { data: dbUser } = await supabase
                .from('admin_users')
                .select('*')
                .eq('username', data.user.email)
                .single();

            let role = 'karyawan';
            let displayName = data.user.email;

            if (dbUser) {
                role = dbUser.role;
                displayName = dbUser.display_name;
            } else if (data.user.email === 'admin@lapanbelas.id' || data.user.email === 'owner@lapanbelas.id' || data.user.email === 'andresindo6@gmail.com') {
                role = 'owner';
                displayName = 'Owner';
            }

            // Penuhi progress bar hingga 100%
            clearInterval(progressTimer);
            setProgress(100);
            await new Promise(r => setTimeout(r, 400));

            // Jika device mendukung biometrik dan belum terdaftar, tawarkan aktivasi Face ID
            if (checkBiometricSupport() && isBiometricSupported && !registeredBio) {
                setIsLoading(false);
                setProgress(0);
                setPendingLoginData({
                    email: data.user.email,
                    displayName,
                    sessionData: { role, username: displayName }
                });
                setPromptRegister(true);
                return;
            }

            onLogin({ role, username: displayName });
        } catch (err) {
            console.error('[Admin Login] Error:', err);
            clearInterval(progressTimer);
            setIsLoading(false);
            setProgress(0);
            setError(err.message || 'Gagal menghubungi server. Silakan coba lagi.');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-[#0a0a0c] relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="glass-panel p-8 rounded-3xl w-full max-w-sm z-10 border border-white/10 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-wider uppercase mb-2">18Studio</h1>
                    <p className="text-sm text-gray-400">Admin Dashboard Login</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl mb-5 text-center animate-in fade-in">
                        {error}
                    </div>
                )}

                {/* MODAL PROMPT: AKTIFKAN FACE ID SETELAH LOGIN */}
                {promptRegister && pendingLoginData ? (
                    <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse">
                            <FaceIdIcon className="w-9 h-9" />
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2">Aktifkan Face ID?</h2>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                            Aktifkan Face ID / Touch ID di perangkat ini agar Anda dapat masuk otomatis tanpa mengetik password lagi.
                        </p>

                        {isLoading ? (
                            <div className="w-full pt-3 pb-2 flex flex-col items-center justify-center gap-3">
                                <div className="w-full h-2.5 bg-[#334155] rounded-full overflow-hidden relative shadow-inner">
                                    <div className="h-full bg-[#00f2fe] rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_#00f2fe]" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs font-medium text-white tracking-wider animate-pulse">
                                    Memindai Biometrik...
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleRegisterBiometric}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition shadow-[0_4px_20px_rgba(6,182,212,0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <FaceIdIcon className="w-4 h-4" />
                                    Aktifkan Sekarang
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onLogin(pendingLoginData.sessionData)}
                                    className="w-full py-2.5 text-xs text-gray-400 hover:text-white transition"
                                >
                                    Nanti Saja
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* KARTU LOGIN CEPAT FACE ID JIKA SUDAH TERDAFTAR DI DEVICE INI */}
                        {registeredBio && isBiometricSupported && (
                            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-cyan-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                                        <FaceIdIcon className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold">Login Cepat</p>
                                        <p className="text-xs text-white font-medium truncate">{registeredBio.email}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBiometricLogin}
                                    disabled={isLoading || bioLoading}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide uppercase transition shadow-[0_4px_20px_rgba(6,182,212,0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <FaceIdIcon className="w-4 h-4" />
                                    {bioLoading ? 'Memindai...' : 'Login dengan Face ID'}
                                </button>
                                <div className="flex justify-between items-center mt-2.5 px-1">
                                    <span className="text-[10px] text-gray-500">Tersimpan di {registeredBio.deviceName || 'Perangkat Ini'}</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveBio}
                                        className="text-[10px] text-red-400/70 hover:text-red-300 transition"
                                    >
                                        Hapus Face ID
                                    </button>
                                </div>
                            </div>
                        )}

                        {registeredBio && isBiometricSupported && (
                            <div className="relative mb-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px]">
                                    <span className="bg-[#121318] px-2.5 text-gray-500 uppercase tracking-wider">atau dengan password</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1.5 ml-1">Username / Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                                        <SvgIcon name="user" className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        disabled={isLoading}
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 text-white transition-colors placeholder:text-gray-600 disabled:opacity-50"
                                        placeholder="Email Admin"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1.5 ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                                        <SvgIcon name="lock" className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        disabled={isLoading}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 text-white transition-colors placeholder:text-gray-600 disabled:opacity-50"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="w-full mt-5 pt-3 pb-2 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                                    <div className="w-full h-2.5 bg-[#334155] rounded-full overflow-hidden relative shadow-inner">
                                        <div
                                            className="h-full bg-[#00f2fe] rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_#00f2fe]"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-white tracking-wider animate-pulse flex items-center gap-1">
                                        Loading...
                                    </span>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-medium transition shadow-lg mt-3 active:scale-[0.98]"
                                >
                                    Sign In
                                </button>
                            )}
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}


export default LoginComponent;
export { LoginComponent };

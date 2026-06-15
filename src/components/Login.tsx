import React, { useState } from "react";
import { 
  auth, 
  googleProvider,
  firebaseConfig
} from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { 
  Activity, 
  Cpu, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Shield, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function Login({ onLoginSuccess, darkMode, setDarkMode }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Email dan password harus diisi!");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password minimal harus 6 karakter!");
      return;
    }

    if (!auth) {
      setErrorMsg("Firebase Auth tidak tersedia di sandbox ini.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegistering) {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      } else {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let IndonesiaErrorMsg = "Terjadi kesalahan saat masuk. Silakan coba lagi.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        IndonesiaErrorMsg = "Email atau password salah!";
      } else if (error.code === "auth/email-already-in-use") {
        IndonesiaErrorMsg = "Email sudah terdaftar! Silakan lakukan Login.";
      } else if (error.code === "auth/weak-password") {
        IndonesiaErrorMsg = "Password terlalu lemah!";
      } else if (error.code === "auth/invalid-email") {
        IndonesiaErrorMsg = "Format email tidak valid!";
      } else if (error.code === "auth/network-request-failed") {
        IndonesiaErrorMsg = "Koneksi jaringan gagal. Pastikan Firebase dapat dihubungi.";
      }
      setErrorMsg(IndonesiaErrorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!auth) {
      setErrorMsg("Firebase Auth tidak tersedia di sandbox ini.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (error: any) {
      console.error("Google Auth error:", error);
      // Give details about iframe blockages which are common in sandboxes
      let blockMessage = "Google Sign-In gagal. ";
      if (error.code === "auth/popup-blocked") {
        blockMessage += "Popup diblokir oleh browser Anda. Izinkan popup untuk situs ini.";
      } else {
        blockMessage += "Hal ini sering terjadi karena batasan iframe sandbox. Silakan gunakan pendaftaran Email/Password.";
      }
      setErrorMsg(blockMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200 bg-white dark:border-white/10 dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] shadow-xl dark:shadow-[0_0_80px_-20px_rgba(59,130,246,0.15)] transition-all">
        
        {/* Modern Accent Header */}
        <div className="relative bg-slate-50 dark:bg-black/20 p-6 text-center border-b border-slate-100 dark:border-white/5">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-slate-200/60 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-white/60 hover:text-amber-500 dark:hover:text-white border border-slate-350/20 dark:border-white/10 transition-colors cursor-pointer"
              title={darkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              id="login-theme-toggle-btn"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
            </button>
          </div>

          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 dark:bg-blue-600/15 dark:border-blue-500/30">
            <Cpu className="h-8 w-8 animate-pulse text-blue-500 dark:text-blue-400" id="login-cpu-icon" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white uppercase font-display">KONTROL IOT SMART LAB</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
            Kendali 4 Relay & Monitoring DHT11 dengan Firebase
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400" id="login-error-alert">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                Alamat Email
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-white/30">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@unama.ac.id"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:bg-[#050505]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  id="email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Kata Sandi
                </label>
              </div>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-white/30">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Min. 6 karakter"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:bg-[#050505]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  id="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-white/30 hover:text-slate-800 dark:hover:text-white"
                  id="toggle-password-btn"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
              id="submit-auth-btn"
            >
              {isRegistering ? (
                <>
                  <UserPlus className="h-4.5 w-4.5" />
                  <span>Daftar Akun Baru</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4.5 w-4.5" />
                  <span>Masuk Aplikasi</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher Link */}
          <div className="mt-4 text-center text-xs">
            <span className="text-slate-400 dark:text-white/40">
              {isRegistering ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            </span>
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer"
              disabled={isLoading}
              id="switch-auth-mode-btn"
            >
              {isRegistering ? "Masuk di sini" : "Daftar di sini"}
            </button>
          </div>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-slate-200 dark:bg-white/5"></div>
            <span className="relative bg-white dark:bg-[#0A0A0A] px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
              Atau Gunakan
            </span>
          </div>

          {/* Third Party OAuth */}
          <div className="space-y-2.5">
            <button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#FAFAFA] dark:border-white/10 dark:bg-[#050505] py-2.5 text-xs font-semibold text-slate-700 dark:text-white shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5 active:scale-98 cursor-pointer"
              id="google-signin-btn"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.67 0 3.2.58 4.38 1.71l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.76-4.51z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.65 2.83c2.14-1.97 3.38-4.87 3.38-8.47z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.24 14.55c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.39 7.16C.5 8.93 0 10.9 0 13s.5 4.07 1.39 5.84l3.85-2.99zm6.76 4.41c2.97 0 5.46-.98 7.28-2.66l-3.65-2.83c-1.01.68-2.3 1.08-3.63 1.08-3.34 0-5.86-1.81-6.76-4.51l-3.85 2.99c1.98 3.89 5.96 6.56 10.61 6.56z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-[#050505] px-6 py-4 text-center text-[10px] text-slate-400 dark:text-white/30 border-t border-slate-100 dark:border-white/5">
          <p>Tersambung ke database:</p>
          <code className="mt-1 block select-all font-mono text-[9px] break-all rounded bg-slate-100 dark:bg-white/5 p-1 text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/5">
            {firebaseConfig.databaseURL}
          </code>
        </div>
      </div>
    </div>
  );
}

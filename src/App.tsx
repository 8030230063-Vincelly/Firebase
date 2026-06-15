import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { UserProfile } from "./types";
import { Cpu, RotateCw, Sparkles } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Resolve initial dark mode preference
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("iot_dark_mode");
      return saved === "true" ? true : false;
    }
    return false;
  });

  // Sync dark class on document element
  useEffect(() => {
    localStorage.setItem("iot_dark_mode", String(darkMode));
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Listen to Real Firebase Auth changes
  useEffect(() => {
    if (!auth) {
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        });
      } else {
        setUser(null);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUser(null);
      } catch (err) {
        console.error("Logout error:", err);
      }
    } else {
      setUser(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-gradient-to-br dark:from-[#1E1E24] dark:via-[#141419] dark:to-[#0D0D11] dark:text-[#E5E5E5] transition-colors duration-300">
        <div className="text-center">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500">
            <Cpu className="h-7 w-7 animate-pulse text-blue-400" />
            <RotateCw className="absolute h-10 w-10 animate-spin text-blue-500/35" />
          </div>
          <h3 className="font-sans font-bold tracking-tight text-sm uppercase text-slate-800 dark:text-white">
            Smart Lab IoT
          </h3>
          <p className="mt-1 font-mono text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-widest leading-relaxed">
            Menghubungkan Token Sandi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-gradient-to-br dark:from-[#1E1E24] dark:via-[#141419] dark:to-[#0D0D11] dark:text-[#E5E5E5] transition-colors duration-300" id="app-root-wrapper">
      
      {/* Decorative Blur Background blobs with Elegant Theme hues */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-25 select-none">
        <div className="absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-600/5 dark:bg-blue-600/10 blur-[130px]"></div>
        <div className="absolute top-2/3 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-600/5 dark:bg-indigo-600/10 blur-[120px]"></div>
      </div>

      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Login onLoginSuccess={handleLoginSuccess} darkMode={darkMode} setDarkMode={setDarkMode} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Dashboard 
              user={user} 
              onLogout={handleLogout}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { 
  Database, 
  Thermometer, 
  Droplets, 
  ToggleLeft, 
  ToggleRight, 
  Sliders, 
  LogOut, 
  User, 
  Workflow, 
  Flame, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  Heart,
  Sun,
  Moon,
  Activity,
  Cpu,
  FileText
} from "lucide-react";
import { database, getRootRef } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import { IoTData, ChartDataPoint } from "../types";
import VoiceController from "./VoiceController";
import { 
  ResponsiveContainer, 
  AreaChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Area 
} from "recharts";

export interface ActivityItem {
  id: string;
  timestamp: string;
  description: string;
  category: "voice" | "relay" | "variation" | "system";
  badgeColor: string;
}

interface DashboardProps {
  user: any;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function Dashboard({ 
  user, 
  onLogout, 
  darkMode, 
  setDarkMode 
}: DashboardProps) {
  // Live connection status
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  // IoT Hardware States standard defaults
  const [iotData, setIotData] = useState<IoTData>({
    Suhu: 27.5,
    Kelembaban: 58.0,
    Relay1: false,
    Relay2: false,
    Relay3: false,
    Relay4: false,
    Variasi: "STOP",
    VariasiJeda: 250
  });

  // Local state for charting history
  const [chartHistory, setChartHistory] = useState<ChartDataPoint[]>([]);

  // Seed initial chart data
  useEffect(() => {
    const mockArr: ChartDataPoint[] = [];
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      const timeStr = new Date(now - i * 5000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      mockArr.push({
        time: timeStr,
        suhu: parseFloat((iotData.Suhu + (Math.random() - 0.5) * 1.5).toFixed(1)),
        kelembaban: parseFloat((iotData.Kelembaban + (Math.random() - 0.5) * 3.0).toFixed(1))
      });
    }
    setChartHistory(mockArr);
  }, []);

  // Update chart periodically using the current data
  useEffect(() => {
    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setChartHistory(prev => {
        const lastPoint = prev[prev.length - 1];
        if (lastPoint && lastPoint.time === timestamp) return prev;
        
        const newPoint: ChartDataPoint = {
          time: timestamp,
          suhu: parseFloat(iotData.Suhu.toFixed(1)),
          kelembaban: parseFloat(iotData.Kelembaban.toFixed(1))
        };
        return [...prev, newPoint].slice(-12);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [iotData.Suhu, iotData.Kelembaban]);

  // Local state for Activity log
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      description: "Sistem IoT Board Controller diinisialisasi.",
      category: "system",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    }
  ]);

  // Keep track of connection logging with Ref
  const wasConnectedRef = useRef(false);

  // Helper to add activity log
  const addActivity = (description: string, category: "voice" | "relay" | "variation" | "system") => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const id = Math.random().toString(36).substring(2, 11);
    
    let badgeColor = "bg-blue-500/10 text-blue-600";
    if (category === "voice") badgeColor = "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    else if (category === "relay") badgeColor = "bg-teal-500/10 text-teal-600 dark:text-teal-400";
    else if (category === "variation") badgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    else if (category === "system") badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

    setActivities(prev => [
      { id, timestamp, description, category, badgeColor },
      ...prev
    ].slice(0, 20)); // Keep a nice queue of 20 logs
  };

  // Monitor Firebase Realtime Database status
  useEffect(() => {
    if (!database) {
      setFirebaseConnected(false);
      return;
    }

    const rootRef = getRootRef();
    if (!rootRef) return;

    // Listen to values from "/IoT" path
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIotData(prev => ({
          Suhu: typeof data.Suhu === "number" ? data.Suhu : prev.Suhu,
          Kelembaban: typeof data.Kelembaban === "number" ? data.Kelembaban : prev.Kelembaban,
          Relay1: typeof data.Relay1 === "boolean" ? data.Relay1 : prev.Relay1,
          Relay2: typeof data.Relay2 === "boolean" ? data.Relay2 : prev.Relay2,
          Relay3: typeof data.Relay3 === "boolean" ? data.Relay3 : prev.Relay3,
          Relay4: typeof data.Relay4 === "boolean" ? data.Relay4 : prev.Relay4,
          Variasi: typeof data.Variasi === "string" ? data.Variasi : prev.Variasi,
          VariasiJeda: typeof data.VariasiJeda === "number" ? data.VariasiJeda : prev.VariasiJeda
        }));
        setFirebaseConnected(true);
        if (!wasConnectedRef.current) {
          addActivity("Terhubung ke Firebase Realtime Database (RTDB) secara realtime.", "system");
          wasConnectedRef.current = true;
        }
      } else {
        // Path empty, initialize it in DB
        update(rootRef, {
          Suhu: 28.0,
          Kelembaban: 60.0,
          Relay1: false,
          Relay2: false,
          Relay3: false,
          Relay4: false,
          Variasi: "STOP",
          VariasiJeda: 250
        });
      }
    }, (error) => {
      console.error("Firebase RTDB listening error:", error);
      setFirebaseConnected(false);
      if (wasConnectedRef.current) {
        addActivity("Koneksi ke Firebase terputus.", "system");
        wasConnectedRef.current = false;
      }
    });

    // Clean up
    return () => unsubscribe();
  }, []);

  // Write changes safely to Live DB
  const pushUpdate = (updatedFields: Partial<IoTData>) => {
    // Update local state first for immediate UI snap
    setIotData(prev => ({ ...prev, ...updatedFields }));

    if (!database) {
      return;
    }

    // Live update to RTDB
    const rootRef = getRootRef();
    if (rootRef) {
      update(rootRef, updatedFields).catch(err => {
        console.error("Failed to push update to Firebase:", err);
      });
    }
  };

  // Switch specific relay
  const toggleRelay = (relayIndex: number, currentState: boolean) => {
    const relayKey = `Relay${relayIndex + 1}` as keyof IoTData;
    const targetState = !currentState;
    pushUpdate({ [relayKey]: targetState });

    const relayNames = ["Lampu 1 [R1]", "Lampu 2 [R2]", "Lampu 3 [R3]", "Lampu 4 [R4]"];
    addActivity(`Mengubah status ${relayNames[relayIndex]} menjadi ${targetState ? "AKTIF" : "MATI"}.`, "relay");
  };

  // Turn all relays ON/OFF
  const handleAllRelaysChange = (state: boolean) => {
    pushUpdate({
      Relay1: state,
      Relay2: state,
      Relay3: state,
      Relay4: state
    });
    addActivity(`Mengubah seluruh status Relay (R1 - R4) menjadi ${state ? "AKTIF" : "MATI"}.`, "relay");
  };

  // Switch variation Mode
  const handleVariationChange = (modeValue: string) => {
    pushUpdate({ Variasi: modeValue });
    const modeDesc = modeValue === "STOP" ? "MANUAL (STOP)" : `MODE VARIASI ${modeValue}`;
    addActivity(`Mengubah sirkuit kerja menjadi ${modeDesc}.`, "variation");
  };

  // Handle delay range change
  const handleSpeedSlider = (value: number) => {
    pushUpdate({ VariasiJeda: value });
    addActivity(`Menyesuaikan jeda kecepatan siklus variasi menjadi ${value} ms.`, "variation");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 dark:bg-gradient-to-br dark:from-[#1E1E24] dark:via-[#141419] dark:to-[#0D0D11] text-[#E5E5E5] font-sans overflow-hidden transition-colors duration-300" id="dashboard-wrapper">
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header / Login Info */}
        <header className="h-20 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between px-6 bg-white dark:bg-slate-900/40 dark:backdrop-blur-md shrink-0 sticky top-0 z-20 transition-colors duration-300">
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2 font-display">
              Smart IoT Board Controller
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                Firebase Live
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono">ESP32 Hardware Interface • Kocakk Network</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200/60 dark:border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="user avatar" className="h-full w-full rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span>G</span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <p className="text-[10px] font-bold text-slate-800 dark:text-white leading-none">{user?.displayName || "Tamu Lab"}</p>
                <p className="text-[8px] text-emerald-600 dark:text-green-400 mt-0.5 leading-none">Registered Member</p>
              </div>
            </div>

            {/* Quick header action: dark/light theme switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-white/60 hover:text-amber-500 dark:hover:text-white border border-slate-200/50 dark:border-white/10 transition-colors cursor-pointer"
              title={darkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              id="header-theme-toggle-btn"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-blue-500" />}
            </button>

            <button 
              onClick={onLogout}
              className="p-2 bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-950/20 rounded-full text-slate-500 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 border border-slate-200/50 dark:border-white/10 transition-colors cursor-pointer animate-none"
              id="logout-btn"
              title="Keluar"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Dashboard Viewport */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 w-full max-w-none">
          
          {/* Connection warning or live banner */}
          {!firebaseConnected && (
            <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 font-sans text-xs text-amber-600 dark:text-amber-400/90 leading-relaxed" id="sync-banner">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400 animate-pulse" />
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Menghubungkan ke Realtime Database...</p>
                <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                  Sedang menunggu sinyal data berkala dari ESP32 board Anda pada database path `/IoT`. Pastikan firmware di board Anda telah dikonfigurasi dengan URL yang sama dan tersambung ke WiFi &apos;Kocakk&apos;.
                </p>
              </div>
            </div>
          )}

          {/* Primary Dashboard layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Column 1: SENSOR MONITOR TILES & TREND CHARTS */}
             <div className="flex flex-col gap-6 lg:h-[620px]">
            
            {/* TEMPERATURE CARD */}
            <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] rounded-[32px] p-5 border border-slate-200/80 dark:border-white/5 flex flex-col justify-start gap-4 transition-all duration-300 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 dark:hover:border-red-500/20 group min-h-[178px] flex-1">
              {/* Subtle ambient lighting inner aura */}
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-all duration-300 pointer-events-none" />
              
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                    <Thermometer className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="font-sans font-extrabold text-slate-800 dark:text-white uppercase text-[11px] tracking-wider block">Suhu Udara</span>
                    <span className="text-[8px] text-slate-400 dark:text-white/40 font-mono tracking-widest block mt-0.5">ESP32 Sensor</span>
                  </div>
                </div>
                {iotData.Suhu > 32 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-550/20 px-2.5 py-0.5 text-[8px] font-bold text-red-550 dark:text-red-400 uppercase animate-pulse">
                    <Flame className="h-2.5 w-2.5" /> Panas
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[8px] font-bold text-emerald-500 dark:text-emerald-400 uppercase">
                    Optimal
                  </span>
                )}
              </div>

              <div className="flex-1 flex items-center justify-between gap-4 relative z-10 my-2">
                {/* Spacious, Perfectly Centered Circular Gauge */}
                <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
                  <svg className="absolute transform -rotate-90" width="96" height="96">
                    <circle cx="48" cy="48" r="40" className="stroke-slate-100 dark:stroke-white/5" strokeWidth="6.5" fill="none" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      className="stroke-red-500 transition-all duration-500" 
                      strokeWidth="6.5" 
                      strokeLinecap="round"
                      fill="none" 
                      strokeDasharray="251"
                      strokeDashoffset={251 - (251 * Math.min(Math.max(iotData.Suhu, 0), 50)) / 50}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800 dark:text-white font-sans tracking-tight leading-none group-hover:scale-105 transition-transform duration-300">
                      {iotData.Suhu.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-450 dark:text-white/40 uppercase tracking-wider mt-1 leading-none">°C</span>
                  </div>
                </div>

                {/* Real-time micro sparkline chart */}
                <div className="flex-1 self-stretch font-mono text-[8px] relative z-10 border border-slate-100/50 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 rounded-2xl p-2.5 flex flex-col justify-between min-h-[96px]">
                  <div className="flex items-center justify-between px-1 border-b border-slate-100/30 dark:border-white/5 pb-1 mb-1">
                    <span className="text-[8px] font-bold text-red-500/80 uppercase tracking-wider font-mono">Tren 1 Menit</span>
                    <span className="text-[7px] text-slate-400 dark:text-white/40">{chartHistory[chartHistory.length - 1]?.time || "00.00"} Live</span>
                  </div>
                  <div className="flex-1 h-full w-full min-h-[50px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartHistory} margin={{ top: 2, right: 2, left: -42, bottom: 0 }}>
                        <defs>
                          <linearGradient id="miniColorSuhu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke={darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)"} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: darkMode ? "#0c0c0c" : "#ffffff",
                            borderColor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            color: darkMode ? "#E5E5E5" : "#1e293b",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "8px",
                            padding: "4px 8px"
                          }} 
                          labelStyle={{ display: 'none' }}
                        />
                        <Area type="monotone" dataKey="suhu" name="Suhu (°C)" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#miniColorSuhu)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* HUMIDITY CARD */}
            <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] rounded-[32px] p-5 border border-slate-200/80 dark:border-white/5 flex flex-col justify-start gap-4 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:border-blue-500/20 group min-h-[178px] flex-1">
              {/* Subtle ambient lighting inner aura */}
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all duration-300 pointer-events-none" />
              
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Droplets className="h-5 w-5 pointer-events-none text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="font-sans font-extrabold text-slate-800 dark:text-white uppercase text-[11px] tracking-wider block">Kelembaban</span>
                    <span className="text-[8px] text-slate-400 dark:text-white/40 font-mono tracking-widest block mt-0.5">ESP32 Sensor</span>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[8px] font-bold text-blue-500 dark:text-blue-400 uppercase">
                  Normal
                </span>
              </div>

              <div className="flex-1 flex items-center justify-between gap-4 relative z-10 my-2">
                {/* Spacious, Perfectly Centered Circular Gauge */}
                <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
                  <svg className="absolute transform -rotate-90" width="96" height="96">
                    <circle cx="48" cy="48" r="40" className="stroke-slate-100 dark:stroke-white/5" strokeWidth="6.5" fill="none" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      className="stroke-blue-500 transition-all duration-500" 
                      strokeWidth="6.5" 
                      strokeLinecap="round"
                      fill="none" 
                      strokeDasharray="251"
                      strokeDashoffset={251 - (251 * Math.min(Math.max(iotData.Kelembaban, 0), 100)) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800 dark:text-white font-sans tracking-tight leading-none group-hover:scale-105 transition-transform duration-300">
                      {iotData.Kelembaban.toFixed(0)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-450 dark:text-white/40 uppercase tracking-wider mt-1 leading-none">%RH</span>
                  </div>
                </div>

                {/* Real-time micro sparkline chart */}
                <div className="flex-1 self-stretch font-mono text-[8px] relative z-10 border border-slate-100/50 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 rounded-2xl p-2.5 flex flex-col justify-between min-h-[96px]">
                  <div className="flex items-center justify-between px-1 border-b border-slate-100/30 dark:border-white/5 pb-1 mb-1">
                    <span className="text-[8px] font-bold text-blue-500/80 uppercase tracking-wider font-mono">Tren 1 Menit</span>
                    <span className="text-[7px] text-slate-400 dark:text-white/40">{chartHistory[chartHistory.length - 1]?.time || "00.00"} Live</span>
                  </div>
                  <div className="flex-1 h-full w-full min-h-[50px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartHistory} margin={{ top: 2, right: 2, left: -42, bottom: 0 }}>
                        <defs>
                          <linearGradient id="miniColorKele" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke={darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)"} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['dataMin - 3', 'dataMax + 3']} hide />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: darkMode ? "#0c0c0c" : "#ffffff",
                            borderColor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            color: darkMode ? "#E5E5E5" : "#1e293b",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "8px",
                            padding: "4px 8px"
                          }} 
                          labelStyle={{ display: 'none' }}
                        />
                        <Area type="monotone" dataKey="kelembaban" name="Lembab (%)" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#miniColorKele)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

             </div>

             {/* Column 2: ACTUATOR CONTROLS (Relays & Variations) */}
             <div className="flex flex-col gap-6 lg:h-[620px]">

            {/* MANUAL 4 RELAY SWITCH INTERFACES - COMPACT BLOCK */}
            <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] rounded-[32px] p-5 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:border-blue-500/20 group flex-1">
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white font-sans text-sm uppercase tracking-tight">KONTROL RELAY</h3>
                    <p className="text-[9px] text-slate-400 dark:text-white/40 mt-0.5 font-mono">Saklar Beban Sirkuit ESP32</p>
                  </div>
                  {/* Batch Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAllRelaysChange(true)}
                      className="rounded-lg bg-blue-600/10 border border-blue-500/25 px-2 py-1 text-[9px] font-bold text-blue-500 dark:text-blue-400 transition-colors hover:bg-blue-600/20 uppercase tracking-wider cursor-pointer"
                      id="all-on-btn"
                    >
                      ON ALL
                    </button>
                    <button
                      onClick={() => handleAllRelaysChange(false)}
                      className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-1 text-[9px] font-bold text-slate-700 dark:text-white/60 transition-colors dark:hover:bg-white/10 uppercase tracking-wider cursor-pointer"
                      id="all-off-btn"
                    >
                      OFF ALL
                    </button>
                  </div>
                </div>

                {/* If variation mode is active, warn that relays cannot be manual toggled */}
                {iotData.Variasi !== "STOP" && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-purple-500/5 border border-purple-500/15 p-2.5 text-[10px] text-purple-600 dark:text-purple-400 leading-snug" id="variation-active-warning">
                    <Workflow className="h-3.5 w-3.5 shrink-0 animate-spin text-purple-500 mt-0.5" />
                    <span>
                     <strong>Variasi {iotData.Variasi} aktif:</strong> Kontrol manual terkunci selagi siklus berjalan. Pilih mode <strong>STOP</strong> untuk melepas kunci.
                    </span>
                  </div>
                )}

                {/* Relay Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* RELAY 1 */}
                  <button
                    onClick={() => toggleRelay(0, iotData.Relay1)}
                    disabled={iotData.Variasi !== "STOP"}
                    className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-300 select-none ${
                      iotData.Relay1
                        ? "border-blue-500/30 bg-blue-600/10 shadow-[0_0_20px_-5px_rgba(59,130,246,0.25)]"
                        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/70"
                    } ${iotData.Variasi !== "STOP" ? "opacity-40 cursor-not-allowed" : "hover:border-slate-350 dark:hover:border-white/20 cursor-pointer active:scale-95"}`}
                    id="relay1-switch"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">R1 [D5]</span>
                      <span className={`h-2 w-2 rounded-full ${iotData.Relay1 ? "bg-blue-400 ring-4 ring-blue-500/20 shadow-lg" : "bg-slate-300 dark:bg-white/10"}`} />
                    </div>
                    <div className="mt-3 text-left">
                      <p className="font-sans font-bold text-slate-800 dark:text-white text-[11px] tracking-tight line-clamp-1">Lampu 1</p>
                      <p className={`mt-0.5 font-mono text-[8px] font-bold ${iotData.Relay1 ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-white/30"}`}>
                        {iotData.Relay1 ? "● AKTIF" : "○ MATI"}
                      </p>
                    </div>
                  </button>

                  {/* RELAY 2 */}
                  <button
                    onClick={() => toggleRelay(1, iotData.Relay2)}
                    disabled={iotData.Variasi !== "STOP"}
                    className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-300 select-none ${
                      iotData.Relay2
                        ? "border-teal-500/30 bg-teal-600/10 shadow-[0_0_20px_-5px_rgba(20,184,166,0.25)]"
                        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/70"
                    } ${iotData.Variasi !== "STOP" ? "opacity-40 cursor-not-allowed" : "hover:border-slate-350 dark:hover:border-white/20 cursor-pointer active:scale-95"}`}
                    id="relay2-switch"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">R2 [D19]</span>
                      <span className={`h-2 w-2 rounded-full ${iotData.Relay2 ? "bg-teal-400 ring-4 ring-teal-500/20 shadow-lg" : "bg-slate-300 dark:bg-white/10"}`} />
                    </div>
                    <div className="mt-3 text-left">
                      <p className="font-sans font-bold text-slate-800 dark:text-white text-[11px] tracking-tight line-clamp-1">Lampu 2</p>
                      <p className={`mt-0.5 font-mono text-[8px] font-bold ${iotData.Relay2 ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-white/30"}`}>
                        {iotData.Relay2 ? "● AKTIF" : "○ MATI"}
                      </p>
                    </div>
                  </button>

                  {/* RELAY 3 */}
                  <button
                    onClick={() => toggleRelay(2, iotData.Relay3)}
                    disabled={iotData.Variasi !== "STOP"}
                    className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-300 select-none ${
                      iotData.Relay3
                        ? "border-yellow-500/30 bg-yellow-600/10 shadow-[0_0_20px_-5px_rgba(234,179,8,0.25)]"
                        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/70"
                    } ${iotData.Variasi !== "STOP" ? "opacity-40 cursor-not-allowed" : "hover:border-slate-350 dark:hover:border-white/20 cursor-pointer active:scale-95"}`}
                    id="relay3-switch"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">R3 [D18]</span>
                      <span className={`h-2 w-2 rounded-full ${iotData.Relay3 ? "bg-yellow-400 ring-4 ring-yellow-500/20 shadow-lg" : "bg-slate-300 dark:bg-white/10"}`} />
                    </div>
                    <div className="mt-3 text-left">
                      <p className="font-sans font-bold text-slate-800 dark:text-white text-[11px] tracking-tight line-clamp-1">Lampu 3</p>
                      <p className={`mt-0.5 font-mono text-[8px] font-bold ${iotData.Relay3 ? "text-yellow-600 dark:text-yellow-400" : "text-slate-400 dark:text-white/30"}`}>
                        {iotData.Relay3 ? "● AKTIF" : "○ MATI"}
                      </p>
                    </div>
                  </button>

                  {/* RELAY 4 */}
                  <button
                    onClick={() => toggleRelay(3, iotData.Relay4)}
                    disabled={iotData.Variasi !== "STOP"}
                    className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-300 select-none ${
                      iotData.Relay4
                        ? "border-red-500/30 bg-red-600/10 shadow-[0_0_20px_-5px_rgba(239,68,68,0.25)]"
                        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/70"
                    } ${iotData.Variasi !== "STOP" ? "opacity-40 cursor-not-allowed" : "hover:border-slate-350 dark:hover:border-white/20 cursor-pointer active:scale-95"}`}
                    id="relay4-switch"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">R4 [D23]</span>
                      <span className={`h-2 w-2 rounded-full ${iotData.Relay4 ? "bg-red-400 ring-4 ring-red-500/20 shadow-lg" : "bg-slate-300 dark:bg-white/10"}`} />
                    </div>
                    <div className="mt-3 text-left">
                      <p className="font-sans font-bold text-slate-800 dark:text-white text-[11px] tracking-tight line-clamp-1">Lampu 4</p>
                      <p className={`mt-0.5 font-mono text-[8px] font-bold ${iotData.Relay4 ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-white/30"}`}>
                        {iotData.Relay4 ? "● AKTIF" : "○ MATI"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* SEQUENCE KONTROL VARIASI (RUN CHASE SEQUENCE) - COMPACT BLOCK */}
            <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] rounded-[32px] p-5 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 dark:hover:border-purple-500/20 group flex-1">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white font-sans text-sm flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3 uppercase tracking-tight">
                  <Sliders className="h-4.5 w-4.5 text-purple-400 animate-pulse" />
                  Mode Variasi
                </h3>
     
                <div className="mt-3.5 flex flex-col gap-3">
                  {/* Variation mode selection buttons */}
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 mb-1.5 font-mono">
                      PILIH SIKLUS CHASER
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {/* STOP button (Manual) */}
                      <button
                        onClick={() => handleVariationChange("STOP")}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] font-bold transition-all duration-200 cursor-pointer select-none ${
                          iotData.Variasi === "STOP"
                            ? "border-red-500/15 bg-red-500/10 text-red-500 dark:text-red-400 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)]"
                            : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/10"
                        }`}
                        id="stop-variation-mode-btn"
                      >
                        <span>STOP (MANUAL)</span>
                        <span className="font-mono text-[8px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-1 py-0.5 rounded text-slate-400">STOP</span>
                      </button>
     
                      {/* Mode 1 */}
                      <button
                        onClick={() => handleVariationChange("1")}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] font-bold transition-all duration-200 cursor-pointer select-none ${
                          iotData.Variasi === "1"
                            ? "border-purple-500/15 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-[0_0_15px_-3px_rgba(168,85,247,0.15)]"
                            : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/10"
                        }`}
                        id="mode1-variation-mode-btn"
                      >
                        <span>MODE 1 (FORWARD RUN)</span>
                        <span className="font-mono text-[8px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-1 py-0.5 rounded text-purple-400">CHASE 1</span>
                      </button>
     
                      {/* Mode 2 */}
                      <button
                        onClick={() => handleVariationChange("2")}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] font-bold transition-all duration-200 cursor-pointer select-none ${
                          iotData.Variasi === "2"
                            ? "border-indigo-500/15 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]"
                            : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/10"
                        }`}
                        id="mode2-variation-mode-btn"
                      >
                        <span>MODE 2 (REVERSE RUN)</span>
                        <span className="font-mono text-[8px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded text-indigo-400">CHASE 2</span>
                      </button>
                    </div>
                  </div>
     
                  {/* Jeda / delay speed slider */}
                  <div className="flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 font-mono">
                        JEDA KECEPATAN SIKLUS
                      </label>
                      <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">
                        {iotData.VariasiJeda} ms
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 px-2.5 py-1.5 text-slate-800 dark:text-[#E5E5E5]">
                      <input
                         type="range"
                         min="50"
                         max="500"
                         step="10"
                         disabled={iotData.Variasi === "STOP"}
                         className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-30"
                         value={iotData.VariasiJeda}
                         onChange={(e) => handleSpeedSlider(parseInt(e.target.value))}
                         id="delay-variation-slider"
                      />
                      <div className="mt-1 text-[7px] text-slate-400 dark:text-white/30 font-mono flex justify-between">
                        <span>Cepat (50ms)</span>
                        <span>Lambat (500ms)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
             </div>

             {/* Column 3: INTELLIGENT INTERFACES (Voice Engine & Activities) */}
             <div className="flex flex-col gap-6 lg:h-[620px] min-h-0">
          {/* VOICE INPUT CONTROLLER */}
          <VoiceController 
            className="flex-1 min-h-0"
            temperature={iotData.Suhu}
            humidity={iotData.Kelembaban}
            relayStates={{
              Relay1: iotData.Relay1,
              Relay2: iotData.Relay2,
              Relay3: iotData.Relay3,
              Relay4: iotData.Relay4,
            }}
            onRelayChange={(idx, state) => {
              const key = `Relay${idx + 1}` as keyof IoTData;
              pushUpdate({ [key]: state });
              const relayNames = ["Lampu 1 [R1]", "Lampu 2 [R2]", "Lampu 3 [R3]", "Lampu 4 [R4]"];
              addActivity(`[SUARA] Mengubah status ${relayNames[idx]} menjadi ${state ? "AKTIF" : "MATI"}.`, "relay");
            }}
            onAllRelaysChange={(state) => {
              handleAllRelaysChange(state);
            }}
            onVariationChange={(mode) => {
              handleVariationChange(mode);
            }}
            onLogActivity={(text, response, success) => {
              if (text.toLowerCase().includes("suhu") || text.toLowerCase().includes("kelembaban") || !success) {
                addActivity(`Perintah Suara: "${text}" → Respon: ${response}`, success ? "voice" : "system");
              } else {
                addActivity(`Menerima perintah suara: "${text}"`, "voice");
              }
            }}
            darkMode={darkMode}
          />

          {/* ACTIVITY LOG */}
          <div className="rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 text-slate-800 dark:text-[#E5E5E5] flex flex-col flex-1 min-h-0">
            <div className="pb-2.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">CATATAN AKTIVITAS</h3>
                  <p className="text-[9px] text-slate-450 dark:text-white/40 uppercase tracking-widest font-mono">Real-time Activity Log</p>
                </div>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">System Live</span>
            </div>

            <div className="mt-3.5 space-y-3 flex-1 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-center font-mono text-xs italic text-slate-350 dark:text-white/20 py-8">Belum ada catatan aktivitas.</p>
              ) : (
                <div className="relative border-l border-slate-100 dark:border-white/10 ml-3 pl-4 space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group transition-all">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-800 ${
                        act.category === 'voice' ? 'bg-orange-500' :
                        act.category === 'relay' ? 'bg-teal-500' :
                        act.category === 'variation' ? 'bg-purple-500' :
                        'bg-emerald-500'
                      }`} />
                      
                      <div className="text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${act.badgeColor}`}>
                            {act.category}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400 dark:text-white/30">{act.timestamp}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-650 dark:text-[#CCCCCC] font-sans">
                          {act.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sweet human touches and information */}
      <footer className="mt-12 text-center text-xs text-slate-400 dark:text-white/30 pb-6 border-t border-slate-200 dark:border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="flex items-center gap-1 font-mono text-[10px]">
          Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> IoT Lab Assistant © 2026 unama.ac.id
        </p>
        <div className="flex gap-4 font-mono text-[10px]">
          <a href="#" className="hover:text-slate-800 dark:hover:text-white transition-colors">Dokumentasi</a>
          <a href="#" className="hover:text-slate-800 dark:hover:text-white transition-colors">Firmware ESP32</a>
          <a href="#" className="hover:text-slate-800 dark:hover:text-white transition-colors">Bantuan</a>
        </div>
      </footer>
    </div>
  </main>
</div>
  );
}

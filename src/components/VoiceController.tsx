import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, HelpCircle, CornerDownLeft, Volume2 } from "lucide-react";
import { VoiceCommandLog } from "../types";

interface VoiceControllerProps {
  temperature: number;
  humidity: number;
  relayStates: {
    Relay1: boolean;
    Relay2: boolean;
    Relay3: boolean;
    Relay4: boolean;
  };
  onRelayChange: (idx: number, state: boolean) => void;
  onAllRelaysChange: (state: boolean) => void;
  onVariationChange: (mode: string) => void;
  darkMode: boolean;
  onLogActivity?: (text: string, response: string, success: boolean) => void;
  className?: string;
}

export default function VoiceController({
  temperature,
  humidity,
  relayStates,
  onRelayChange,
  onAllRelaysChange,
  onVariationChange,
  darkMode,
  onLogActivity,
  className = ""
}: VoiceControllerProps) {
  const [isListening, setIsListening] = useState(false);
  const [typedCommand, setTypedCommand] = useState("");
  const [logs, setLogs] = useState<VoiceCommandLog[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Keep references to inputs and callbacks stable to prevent SpeechRecognition recreations
  const temperatureRef = useRef(temperature);
  const humidityRef = useRef(humidity);
  const onRelayChangeRef = useRef(onRelayChange);
  const onAllRelaysChangeRef = useRef(onAllRelaysChange);
  const onVariationChangeRef = useRef(onVariationChange);
  const processCommandTextRef = useRef<(command: string) => void>(() => {});

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);

  useEffect(() => {
    humidityRef.current = humidity;
  }, [humidity]);

  useEffect(() => {
    onRelayChangeRef.current = onRelayChange;
  }, [onRelayChange]);

  useEffect(() => {
    onAllRelaysChangeRef.current = onAllRelaysChange;
  }, [onAllRelaysChange]);

  useEffect(() => {
    onVariationChangeRef.current = onVariationChange;
  }, [onVariationChange]);

  useEffect(() => {
    // Check Web Speech API Support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "id-ID"; // Set to Indonesian

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      let errorDesc = "Ada kendala membaca suara.";
      if (event.error === "not-allowed") {
        errorDesc = "Izin mikrofon ditolak oleh browser / iframe.";
      } else if (event.error === "no-speech") {
        errorDesc = "Suara tidak terdengar.";
      }
      addLog("Gagal mendengar", errorDesc, false);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (processCommandTextRef.current) {
        processCommandTextRef.current(transcript);
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Cancel any current utterances
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Look for Indonesian voice, fallback if none
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(voice => voice.lang.includes("id") || voice.lang.includes("ID"));
      if (idVoice) utterance.voice = idVoice;
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech Synthesis tidak didukung oleh browser ini.");
    }
  };

  const toggleListening = () => {
    if (!recognitionSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const addLog = (text: string, response: string, success: boolean) => {
    const newLog: VoiceCommandLog = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      text,
      response,
      success
    };
    setLogs(prev => [newLog, ...prev].slice(0, 5)); // Keep last 5 logs
    if (onLogActivity) {
      onLogActivity(text, response, success);
    }
  };

  const processCommandText = (command: string) => {
    if (!command.trim()) return;

    // Normalize command string to Indonesian words
    let cmdClean = command.toLowerCase().trim();
    
    // Convert generic speech-to-text outputs (numbers, spacing variations)
    cmdClean = cmdClean
      .replace(/relay\s*1/g, "relay satu")
      .replace(/relay\s*2/g, "relay dua")
      .replace(/relay\s*3/g, "relay tiga")
      .replace(/relay\s*4/g, "relay empat")
      .replace(/mode\s*1/g, "mode satu")
      .replace(/mode\s*2/g, "mode dua")
      .replace(/variasi\s*1/g, "variasi satu")
      .replace(/variasi\s*2/g, "variasi dua")
      .replace(/\b1\b/g, "satu")
      .replace(/\b2\b/g, "dua")
      .replace(/\b3\b/g, "tiga")
      .replace(/\b4\b/g, "empat");

    // Matching helper functions for high tolerance and multiple Indonesian phrasings
    const isRelayOn = (cmd: string, identifier: string) => {
      const onKeywords = ["nyalakan", "hidupkan", "aktifkan", "buka", "on", "nyala", "hidup"];
      return onKeywords.some(kw => cmd.includes(kw)) && cmd.includes(identifier);
    };

    const isRelayOff = (cmd: string, identifier: string) => {
      const offKeywords = ["matikan", "nonaktifkan", "tutup", "off", "mati"];
      return offKeywords.some(kw => cmd.includes(kw)) && cmd.includes(identifier);
    };

    let response = "";
    let matched = true;

    // --- SENSOR COMMANDS ---
    if (
      (cmdClean.includes("suhu") || cmdClean.includes("temperatur") || cmdClean.includes("baca suhu") || cmdClean.includes("berapa suhu") || cmdClean.includes("dht")) &&
      (cmdClean.includes("kelembaban") || cmdClean.includes("kelembaban udara"))
    ) {
      response = `Suhu saat ini adalah ${temperatureRef.current.toFixed(1)} derajat Celsius, dan kelembaban ${humidityRef.current.toFixed(1)} persen.`;
      speakText(response);
    } 
    else if (
      cmdClean.includes("suhu") || 
      cmdClean.includes("temperatur") || 
      cmdClean.includes("baca suhu") || 
      cmdClean.includes("berapa suhu") ||
      cmdClean.includes("dht")
    ) {
      response = `Suhu saat ini adalah ${temperatureRef.current.toFixed(1)} derajat Celsius.`;
      speakText(response);
    } 
    else if (
      cmdClean.includes("kelembaban") || 
      cmdClean.includes("berapa kelembaban") ||
      cmdClean.includes("kelembaban udara")
    ) {
      response = `Kelembaban saat ini adalah ${humidityRef.current.toFixed(1)} persen.`;
      speakText(response);
    } 

    // --- RELAY 1 COMMANDS ---
    else if (isRelayOn(cmdClean, "relay satu") || isRelayOn(cmdClean, "lampu satu")) {
      onRelayChangeRef.current(0, true);
      response = "Menyalakan lampu satu.";
      speakText(response);
    } 
    else if (isRelayOff(cmdClean, "relay satu") || isRelayOff(cmdClean, "lampu satu")) {
      onRelayChangeRef.current(0, false);
      response = "Mematikan lampu satu.";
      speakText(response);
    }

    // --- RELAY 2 COMMANDS ---
    else if (isRelayOn(cmdClean, "relay dua") || isRelayOn(cmdClean, "lampu dua")) {
      onRelayChangeRef.current(1, true);
      response = "Menyalakan lampu dua.";
      speakText(response);
    } 
    else if (isRelayOff(cmdClean, "relay dua") || isRelayOff(cmdClean, "lampu dua")) {
      onRelayChangeRef.current(1, false);
      response = "Mematikan lampu dua.";
      speakText(response);
    }

    // --- RELAY 3 COMMANDS ---
    else if (isRelayOn(cmdClean, "relay tiga") || isRelayOn(cmdClean, "lampu tiga")) {
      onRelayChangeRef.current(2, true);
      response = "Menyalakan lampu tiga.";
      speakText(response);
    } 
    else if (isRelayOff(cmdClean, "relay tiga") || isRelayOff(cmdClean, "lampu tiga")) {
      onRelayChangeRef.current(2, false);
      response = "Mematikan lampu tiga.";
      speakText(response);
    }

    // --- RELAY 4 COMMANDS ---
    else if (isRelayOn(cmdClean, "relay empat") || isRelayOn(cmdClean, "lampu empat")) {
      onRelayChangeRef.current(3, true);
      response = "Menyalakan lampu empat.";
      speakText(response);
    } 
    else if (isRelayOff(cmdClean, "relay empat") || isRelayOff(cmdClean, "lampu empat")) {
      onRelayChangeRef.current(3, false);
      response = "Mematikan lampu empat.";
      speakText(response);
    }

    // --- ALL RELAY COMMANDS ---
    else if (
      isRelayOn(cmdClean, "semua") || 
      isRelayOn(cmdClean, "seluruh") || 
      cmdClean.includes("semua relay on") ||
      cmdClean.includes("semua lampu on") ||
      cmdClean.includes("semua on")
    ) {
      onAllRelaysChangeRef.current(true);
      response = "Menyalakan seluruh lampu.";
      speakText(response);
    }
    else if (
      isRelayOff(cmdClean, "semua") || 
      isRelayOff(cmdClean, "seluruh") || 
      cmdClean.includes("semua relay off") ||
      cmdClean.includes("semua lampu off") ||
      cmdClean.includes("semua off") ||
      cmdClean.includes("matikan semua")
    ) {
      onAllRelaysChangeRef.current(false);
      response = "Mematikan seluruh lampu.";
      speakText(response);
    }

    // --- VARIATION MODES ---
    else if (
      cmdClean.includes("variasi satu") || 
      cmdClean.includes("mode satu") || 
      cmdClean.includes("variasi kesatu")
    ) {
      onVariationChangeRef.current("1");
      response = "Menjalankan rangkaian variasi mode satu.";
      speakText(response);
    }
    else if (
      cmdClean.includes("variasi dua") || 
      cmdClean.includes("mode dua") || 
      cmdClean.includes("variasi kedua")
    ) {
      onVariationChangeRef.current("2");
      response = "Menjalankan rangkaian variasi mode dua.";
      speakText(response);
    }
    else if (
      cmdClean.includes("hentikan variasi") || 
      cmdClean.includes("matikan variasi") || 
      cmdClean.includes("stop variasi") ||
      cmdClean.includes("variasi stop") ||
      cmdClean.includes("manual")
    ) {
      onVariationChangeRef.current("STOP");
      response = "Variasi dihentikan. Kembali ke mode manual.";
      speakText(response);
    }

    // --- FALLBACK ---
    else {
      response = "Perintah tidak dikenali. Katakan 'baca suhu' atau 'nyalakan lampu satu'.";
      matched = false;
      speakText(response);
    }

    addLog(command, response, matched);
  };

  useEffect(() => {
    processCommandTextRef.current = processCommandText;
  }, [processCommandText]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedCommand.trim()) return;
    processCommandText(typedCommand);
    setTypedCommand("");
  };

  return (
    <div className={`rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-gradient-to-br dark:from-[#25252D] dark:to-[#18181F] transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 text-slate-800 dark:text-[#E5E5E5] flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 dark:text-orange-400">
            <Mic className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">KONTROL SUARA SMART</h3>
            <p className="text-[9px] text-slate-450 dark:text-white/40 uppercase tracking-widest font-mono">Web Speech & TTS Engine</p>
          </div>
        </div>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="rounded-lg p-2 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          id="help-voice-btn"
          title="Tampilkan daftar perintah"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>

      {showHelp && (
        <div className="mt-3 rounded-xl bg-orange-500/5 p-3.5 text-xs text-orange-650 dark:text-orange-400 border border-orange-500/15">
          <p className="font-bold mb-1.5 flex items-center gap-1">🗣️ PERINTAH SUARA INDONESIA:</p>
          <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-slate-600 dark:text-white/60">
            <li><strong>Suhu / DHT:</strong> &quot;baca suhu&quot;, &quot;cek suhu&quot;, &quot;berapa kelembaban&quot;</li>
            <li><strong>Relay 1:</strong> &quot;nyalakan relay satu&quot;, &quot;matikan relay satu&quot;</li>
            <li><strong>Relay 2:</strong> &quot;nyalakan relay dua&quot;, &quot;matikan relay dua&quot;</li>
            <li><strong>Relay 3:</strong> &quot;nyalakan relay tiga&quot;, &quot;matikan relay tiga&quot;</li>
            <li><strong>Relay 4:</strong> &quot;nyalakan relay empat&quot;, &quot;matikan relay empat&quot;</li>
            <li><strong>Semua:</strong> &quot;nyalakan semua relay&quot;, &quot;matikan semua&quot;</li>
            <li><strong>Variasi:</strong> &quot;variasi satu&quot;, &quot;variasi dua&quot;, &quot;stop variasi&quot;</li>
          </ul>
        </div>
      )}

      {/* Voice Trigger Buttons */}
      <div className="my-3 flex flex-col items-center justify-center">
        {recognitionSupported ? (
          <button
            onClick={toggleListening}
            className={`group relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 duration-300 cursor-pointer ${
              isListening
                ? "bg-red-650 shadow-red-550/20 animate-pulse"
                : "bg-blue-600 shadow-blue-650/20 hover:bg-blue-700"
            }`}
            id="mic-activation-btn"
          >
            {isListening ? (
              <>
                <MicOff className="h-7 w-7" />
                <span className="absolute -inset-1.5 rounded-full border border-red-500/20 animate-ping"></span>
              </>
            ) : (
              <Mic className="h-7 w-7 group-hover:scale-110 transition-transform" />
            )}
          </button>
        ) : (
          <div className="text-center p-3 rounded-lg bg-red-500/5 text-red-500 dark:text-red-400 text-xs border border-red-500/15">
            <MicOff className="h-6 w-6 mx-auto mb-1 opacity-70" />
            Mikrofon diblokir / browser tidak mendukung SpeechRecognition. Silakan gunakan ketik konsol di bawah.
          </div>
        )}

        <p className="mt-2.5 text-center text-[11px] text-slate-450 dark:text-white/40">
          {isListening ? (
            <span className="font-bold text-red-500 dark:text-red-400 animate-pulse flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400"></span> Mendengarkan... Katakan &quot;Baca Suhu&quot;
            </span>
          ) : (
            <span>Klik Mic dan ucapkan perintah atau ketik di bawah</span>
          )}
        </p>
      </div>

      {/* Manual text input simulation terminal */}
      <form onSubmit={handleTextSubmit} className="relative mb-3.5 flex items-center">
        <input
          type="text"
          placeholder="Ketik perintah suara di sini..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3.5 pr-12 text-xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800 dark:border-white/10 dark:bg-[#050505] dark:text-white dark:placeholder-white/35 placeholder-slate-400"
          value={typedCommand}
          onChange={(e) => setTypedCommand(e.target.value)}
          id="voice-keyboard-input"
        />
        <button
          type="submit"
          className="absolute right-1.5 rounded-lg p-1.5 text-blue-500 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          id="send-typed-command-btn"
        >
          <Send className="h-4 w-4" />
        </button>
        <span className="absolute right-10 top-2.5 text-[9px] text-slate-350 dark:text-white/20 flex items-center gap-0.5 select-none uppercase font-mono">
          <CornerDownLeft className="h-2 w-2" /> enter
        </span>
      </form>
    </div>
  );
}

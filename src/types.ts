export interface IoTData {
  Suhu: number;
  Kelembaban: number;
  Relay1: boolean;
  Relay2: boolean;
  Relay3: boolean;
  Relay4: boolean;
  Variasi: string; // "1", "2", "STOP"
  VariasiJeda: number; // 50 to 500 ms
}

export interface ChartDataPoint {
  time: string;
  suhu: number;
  kelembaban: number;
}

export interface VoiceCommandLog {
  id: string;
  timestamp: string;
  text: string;
  response: string;
  success: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

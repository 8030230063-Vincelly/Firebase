// ================= INCLUDE LIBRARY =================
// Memilih library WiFi sesuai platform yang digunakan (ESP32 atau ESP8266)
#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif
#include <Firebase_ESP_Client.h>   // Library utama Firebase untuk ESP
#include <addons/TokenHelper.h>    // Helper untuk menangani token autentikasi Firebase
#include <addons/RTDBHelper.h>     // Helper untuk operasi Realtime Database Firebase
#include "DHT.h"                   // Library sensor suhu & kelembaban DHT

// ================= PENGATURAN WIFI & FIREBASE (GANTI DENGAN KREDENSIAL ANDA) =================
// Kredensial WiFi dan Firebase — ganti dengan milik Anda sebelum di-upload
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
#define API_KEY         "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL    "YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app"
#define USER_EMAIL      "YOUR_FIREBASE_USER_EMAIL"
#define USER_PASSWORD   "YOUR_FIREBASE_USER_PASSWORD"

// ================= KONFIGURASI PIN =================
// Mendefinisikan pin GPIO yang terhubung ke masing-masing relay dan sensor DHT
#define RELAY1_PIN 5
#define RELAY2_PIN 19
#define RELAY3_PIN 18
#define RELAY4_PIN 23
#define DHT_PIN    4
#define DHT_TYPE   DHT11

// Array pin relay agar mudah diiterasi dengan loop
const int RELAY_PINS[4] = { RELAY1_PIN, RELAY2_PIN, RELAY3_PIN, RELAY4_PIN };

// ================= LOGIKA RELAY (ACTIVE LOW) =================
// Relay modul ini bersifat Active Low:
// LOW  = relay menyala (ON), HIGH = relay mati (OFF)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// ================= OBJEK FIREBASE =================
// Objek yang dibutuhkan oleh library Firebase ESP Client
FirebaseData   fbdo;    // Objek untuk mengirim/menerima data dari Firebase
FirebaseAuth   auth;    // Objek untuk menyimpan kredensial autentikasi
FirebaseConfig config;  // Objek untuk menyimpan konfigurasi Firebase (API key, URL, dll.)

// Inisialisasi objek sensor DHT dengan pin dan tipe yang telah didefinisikan
DHT dht(DHT_PIN, DHT_TYPE);

// ================= VARIABEL VARIASI =================
// Variasi adalah mode animasi relay berjalan bergantian (seperti running light)
int           variasiMode     = 0;   // 0 = nonaktif, 1 = maju (1→4), 2 = mundur (4→1)
int           variasiStep     = 0;   // Langkah/posisi relay aktif saat ini
unsigned long variasiLastTime = 0;   // Waktu terakhir relay variasi berpindah (ms)
unsigned long variasiJeda     = 50;  // Jeda antar perpindahan relay (ms), default 50ms

// ================= VARIABEL TIMER =================
// Menggunakan millis() agar loop tidak terblokir (non-blocking timer)
unsigned long previousMillisDHT      = 0;
unsigned long previousMillisFirebase = 0;
const long    intervalDHT      = 5000;  // Interval baca sensor DHT: setiap 5 detik
const long    intervalFirebase  = 1000;  // Interval cek data Firebase: setiap 1 detik

// ================= FUNGSI BANTUAN =================

// Mematikan semua relay sekaligus (set semua ke kondisi OFF)
void matikanSemuaRelay() {
  for (int i = 0; i < 4; i++) digitalWrite(RELAY_PINS[i], RELAY_OFF);
}

// Mengatur status relay tertentu (ON atau OFF) berdasarkan indeks (0–3)
// dan mencetak hasilnya ke Serial Monitor
void setRelay(int idx, bool on) {
  digitalWrite(RELAY_PINS[idx], on ? RELAY_ON : RELAY_OFF);
  Serial.printf("[Relay] %d => %s\n", idx + 1, on ? "ON" : "OFF");
}

// Menjalankan animasi variasi relay (running light) secara non-blocking
// Dipanggil setiap iterasi loop(); hanya berjalan jika variasiMode aktif (1 atau 2)
void handleVariasi() {
  if (variasiMode == 0) return;  // Keluar jika variasi tidak aktif

  unsigned long now = millis();
  // Belum waktunya berpindah, tunggu sampai jeda tercapai
  if (now - variasiLastTime < variasiJeda) return;
  variasiLastTime = now;

  matikanSemuaRelay();  // Matikan semua relay dulu sebelum menyalakan yang berikutnya

  // Tentukan relay yang akan dinyalakan:
  // Mode 1: urutan maju  (0, 1, 2, 3, 0, 1, ...)
  // Mode 2: urutan mundur (3, 2, 1, 0, 3, 2, ...)
  int relayIdx = (variasiMode == 1)
    ? (variasiStep % 4)
    : (3 - (variasiStep % 4));

  digitalWrite(RELAY_PINS[relayIdx], RELAY_ON);
  Serial.printf("[Variasi %d | jeda %lums] Relay %d ON\n",
                variasiMode, variasiJeda, relayIdx + 1);
  variasiStep++;  // Maju ke langkah berikutnya
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);  // Mulai komunikasi serial untuk debugging

  // Atur semua pin relay sebagai OUTPUT dan matikan semuanya di awal
  // agar relay tidak menyala secara tidak sengaja saat boot
  for (int i = 0; i < 4; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
  }
  matikanSemuaRelay();

  dht.begin();  // Inisialisasi sensor DHT

  // Koneksi ke jaringan WiFi, tunggu sampai berhasil terhubung
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Menghubungkan");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n[WiFi] Terhubung | IP: " + WiFi.localIP().toString());

  // Konfigurasi Firebase menggunakan metode autentikasi Email & Password
  config.api_key      = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email    = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // Callback untuk memantau status token (digunakan oleh library Firebase)
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);    // Mulai koneksi ke Firebase
  Firebase.reconnectWiFi(true);      // Reconnect otomatis jika WiFi terputus

  Serial.println("[Firebase] Inisialisasi selesai (Email/Password Auth)");
  Serial.println("[Firebase] Menunggu token siap...");

  // Blok eksekusi sampai token autentikasi Firebase berhasil diperoleh
  while (!Firebase.ready()) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n[Firebase] Token siap, siap digunakan!");
}

// ================= LOOP =================
void loop() {
  unsigned long currentMillis = millis();  // Ambil waktu saat ini (ms sejak boot)

  // ===== BACA SENSOR DHT (setiap 5 detik) =====
  if (currentMillis - previousMillisDHT >= intervalDHT) {
    previousMillisDHT = currentMillis;

    float h = dht.readHumidity();     // Baca nilai kelembaban (%)
    float t = dht.readTemperature();  // Baca nilai suhu (°C)

    // Pastikan pembacaan valid (isnan = true jika gagal baca)
    if (!isnan(h) && !isnan(t)) {
      Serial.printf("[Sensor] Suhu: %.1f°C | Kelembaban: %.1f%%\n", t, h);

      // Kirim data suhu dan kelembaban ke Firebase Realtime Database
      if (Firebase.ready()) {
        Firebase.RTDB.setFloat(&fbdo, "/IoT/Suhu",       t);
        Firebase.RTDB.setFloat(&fbdo, "/IoT/Kelembaban", h);
      }
    } else {
      Serial.println("[Sensor] Gagal membaca DHT11!");
    }
  }

  // ===== CEK KONTROL DARI FIREBASE (setiap 1 detik) =====
  if (currentMillis - previousMillisFirebase >= intervalFirebase) {
    previousMillisFirebase = currentMillis;

    if (Firebase.ready()) {

      // --- Baca mode Variasi dari Firebase ("/IoT/Variasi") ---
      // Nilai: "1" = maju, "2" = mundur, "STOP" = hentikan variasi
      String varMode = "";
      if (Firebase.RTDB.getString(&fbdo, "/IoT/Variasi"))
        varMode = fbdo.stringData();

      if (varMode == "1" || varMode == "2") {
        // Aktifkan mode variasi baru hanya jika berbeda dari mode sebelumnya
        if (variasiMode != varMode.toInt()) {
          variasiMode     = varMode.toInt();
          variasiStep     = 0;   // Reset langkah ke awal
          variasiLastTime = 0;   // Reset timer variasi
          Serial.printf("[Variasi] Mode %d aktif\n", variasiMode);
        }
      } else if (varMode == "STOP" && variasiMode != 0) {
        // Hentikan variasi, matikan semua relay, kembali ke mode manual
        variasiMode = 0;
        variasiStep = 0;
        matikanSemuaRelay();
        Serial.println("[Variasi] Dihentikan. Kembali ke kontrol manual.");
      }

      // --- Baca nilai jeda variasi dari Firebase ("/IoT/VariasiJeda") ---
      // Nilai valid: 50–500 ms; di luar rentang ini diabaikan
      int jeda = 0;
      if (Firebase.RTDB.getInt(&fbdo, "/IoT/VariasiJeda"))
        jeda = fbdo.intData();
      if (jeda >= 50 && jeda <= 500) {
        variasiJeda = (unsigned long)jeda;
      }

      // --- Kontrol Relay Manual (hanya aktif jika variasi sedang tidak berjalan) ---
      // Membaca status ON/OFF masing-masing relay dari Firebase
      if (variasiMode == 0) {
        bool r1 = false, r2 = false, r3 = false, r4 = false;
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay1")) r1 = fbdo.boolData();
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay2")) r2 = fbdo.boolData();
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay3")) r3 = fbdo.boolData();
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay4")) r4 = fbdo.boolData();

        // Terapkan status relay sesuai perintah dari Firebase
        setRelay(0, r1);
        setRelay(1, r2);
        setRelay(2, r3);
        setRelay(3, r4);
      }
    }
  }

  // ===== JALANKAN ANIMASI VARIASI =====
  // Dipanggil setiap loop agar animasi relay berjalan mulus (non-blocking)
  handleVariasi();
}

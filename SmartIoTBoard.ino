#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "DHT.h"

// ================= PENGATURAN WIFI & FIREBASE (GANTI DENGAN KREDENSIAL ANDA) =================
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
#define API_KEY         "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL    "YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app"
#define USER_EMAIL      "YOUR_FIREBASE_USER_EMAIL"
#define USER_PASSWORD   "YOUR_FIREBASE_USER_PASSWORD"

// ================= KONFIGURASI PIN =================
#define RELAY1_PIN 5
#define RELAY2_PIN 19
#define RELAY3_PIN 18
#define RELAY4_PIN 23
#define DHT_PIN    4
#define DHT_TYPE   DHT11

const int RELAY_PINS[4] = { RELAY1_PIN, RELAY2_PIN, RELAY3_PIN, RELAY4_PIN };

// ================= LOGIKA RELAY (ACTIVE LOW) =================
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// ================= OBJEK FIREBASE =================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

DHT dht(DHT_PIN, DHT_TYPE);

// ================= VARIABEL VARIASI =================
int variasiMode = 0;
int variasiStep = 0;
unsigned long variasiLastTime = 0;
unsigned long variasiJeda = 50;

// ================= VARIABEL TIMER =================
unsigned long previousMillisDHT      = 0;
unsigned long previousMillisFirebase = 0;
const long intervalDHT      = 5000;  // baca DHT tiap 5 detik
const long intervalFirebase = 1000;  // cek Firebase tiap 1 detik

// ================= FUNGSI BANTUAN =================
void matikanSemuaRelay() {
  for (int i = 0; i < 4; i++) digitalWrite(RELAY_PINS[i], RELAY_OFF);
}

void setRelay(int idx, bool on) {
  digitalWrite(RELAY_PINS[idx], on ? RELAY_ON : RELAY_OFF);
  Serial.printf("[Relay] %d => %s\n", idx + 1, on ? "ON" : "OFF");
}

void handleVariasi() {
  if (variasiMode == 0) return;
  unsigned long now = millis();
  if (now - variasiLastTime < variasiJeda) return;
  variasiLastTime = now;

  matikanSemuaRelay();
  int relayIdx = (variasiMode == 1)
    ? (variasiStep % 4)
    : (3 - (variasiStep % 4));
  digitalWrite(RELAY_PINS[relayIdx], RELAY_ON);
  Serial.printf("[Variasi %d | jeda %lums] Relay %d ON\n",
                variasiMode, variasiJeda, relayIdx + 1);
  variasiStep++;
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  // Inisialisasi Pin Relay
  for (int i = 0; i < 4; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
  }
  matikanSemuaRelay();

  dht.begin();

  // Koneksi WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Menghubungkan");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n[WiFi] Terhubung | IP: " + WiFi.localIP().toString());

  // Konfigurasi Firebase — Email & Password Auth
  config.api_key      = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email    = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("[Firebase] Inisialisasi selesai (Email/Password Auth)");
  Serial.println("[Firebase] Menunggu token siap...");

  // Tunggu sampai token siap sebelum mulai akses data
  while (!Firebase.ready()) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n[Firebase] Token siap, siap digunakan!");
}

// ================= LOOP =================
void loop() {
  unsigned long currentMillis = millis();

  // ===== BACA SENSOR DHT =====
  if (currentMillis - previousMillisDHT >= intervalDHT) {
    previousMillisDHT = currentMillis;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (!isnan(h) && !isnan(t)) {
      Serial.printf("[Sensor] Suhu: %.1f°C | Kelembaban: %.1f%%\n", t, h);
      if (Firebase.ready()) {
        Firebase.RTDB.setFloat(&fbdo, "/IoT/Suhu",       t);
        Firebase.RTDB.setFloat(&fbdo, "/IoT/Kelembaban", h);
      }
    } else {
      Serial.println("[Sensor] Gagal membaca DHT11!");
    }
  }

  // ===== CEK KONTROL DARI FIREBASE =====
  if (currentMillis - previousMillisFirebase >= intervalFirebase) {
    previousMillisFirebase = currentMillis;

    if (Firebase.ready()) {

      // --- Kontrol Variasi ---
      String varMode = "";
      if (Firebase.RTDB.getString(&fbdo, "/IoT/Variasi"))
        varMode = fbdo.stringData();

      if (varMode == "1" || varMode == "2") {
        if (variasiMode != varMode.toInt()) {
          variasiMode = varMode.toInt();
          variasiStep = 0;
          variasiLastTime = 0;
          Serial.printf("[Variasi] Mode %d aktif\n", variasiMode);
        }
      } else if (varMode == "STOP" && variasiMode != 0) {
        variasiMode = 0;
        variasiStep = 0;
        matikanSemuaRelay();
        Serial.println("[Variasi] Dihentikan. Kembali ke kontrol manual.");
      }

      // --- Jeda Variasi ---
      int jeda = 0;
      if (Firebase.RTDB.getInt(&fbdo, "/IoT/VariasiJeda"))
        jeda = fbdo.intData();
      if (jeda >= 50 && jeda <= 500) {
        variasiJeda = (unsigned long)jeda;
      }

      // --- Kontrol Relay Manual (hanya jika variasi tidak aktif) ---
      if (variasiMode == 0) {
        bool r1 = false, r2 = false, r3 = false, r4 = false;
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay1")) r1 = fbdo.boolData();
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay2")) r2 = fbdo.boolData();
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay3")) r3 = fbdo.boolData();
        if (Firebase.RTDB.getBool(&fbdo, "/IoT/Relay4")) r4 = fbdo.boolData();

        setRelay(0, r1);
        setRelay(1, r2);
        setRelay(2, r3);
        setRelay(3, r4);
      }
    }
  }

  // ===== JALANKAN ANIMASI VARIASI =====
  handleVariasi();
}

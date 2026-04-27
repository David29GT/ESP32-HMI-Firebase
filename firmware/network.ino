#include <WiFi.h>
#include <FirebaseESP32.h>
#include <HTTPClient.h>

// Objetos globales para este módulo
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;

void conectarWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado!");
}

void iniciarFirebase() {
  fbConfig.database_url = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);
}

void enviarTiempoReal(float valor) {
  if (Firebase.setFloat(fbdo, "/monitoreo/sensor1", valor)) {
    Serial.printf("Tiempo Real: %.2f | OK\n", valor);
  } else {
    Serial.println("Error Firebase: " + fbdo.errorReason());
  }
}

void enviarReporteHistorial(float avg, float max, float min, String rawData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(WORKER_URL);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{";
    jsonPayload += "\"type\":\"history\",";
    jsonPayload += "\"avg\":" + String(avg) + ",";
    jsonPayload += "\"max\":" + String(max) + ",";
    jsonPayload += "\"min\":" + String(min) + ",";
    jsonPayload += "\"lecturas\":" + rawData;
    jsonPayload += "}";

    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode > 0) {
      Serial.printf("--- Reporte D1 Enviado: HTTP %d ---\n", httpResponseCode);
    } else {
      Serial.printf("Error enviando a D1: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
}
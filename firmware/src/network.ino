#include <WiFi.h>
#include <FirebaseESP32.h>
#include <math.h>
#include "config.h"

FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

void conectarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Conectando a WiFi: %s\n", WIFI_SSID);
}

void mantenerConexionWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  static unsigned long ultimoIntento = 0;
  const unsigned long ahora = millis();
  if (ahora - ultimoIntento < WIFI_RECONNECT_INTERVAL) {
    return;
  }

  ultimoIntento = ahora;
  Serial.println("WiFi desconectado; intentando reconectar...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void iniciarFirebase() {
  firebaseConfig.database_url = String("https://") + FIREBASE_HOST + "/";
  firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
  Serial.println("Cliente Firebase inicializado.");
}

bool enviarLecturasFirebase(float sensor1, float sensor2, float sensor3, float temperatura) {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) {
    Serial.println("Firebase no está listo; lecturas no enviadas.");
    return false;
  }

  bool correcto = true;
  correcto &= Firebase.setFloat(firebaseData, "/monitoreo/sensor1", sensor1);
  if (!correcto) {
    Serial.printf("Error en sensor1: %s\n", firebaseData.errorReason().c_str());
  }

  const bool sensor2Correcto =
      Firebase.setFloat(firebaseData, "/monitoreo/sensor2", sensor2);
  correcto &= sensor2Correcto;
  if (!sensor2Correcto) {
    Serial.printf("Error en sensor2: %s\n", firebaseData.errorReason().c_str());
  }

  const bool sensor3Correcto =
      Firebase.setFloat(firebaseData, "/monitoreo/sensor3", sensor3);
  correcto &= sensor3Correcto;
  if (!sensor3Correcto) {
    Serial.printf("Error en sensor3: %s\n", firebaseData.errorReason().c_str());
  }

  if (!isnan(temperatura)) {
    const bool temperaturaCorrecta =
        Firebase.setFloat(firebaseData, "/monitoreo/temp", temperatura);
    correcto &= temperaturaCorrecta;
    if (!temperaturaCorrecta) {
      Serial.printf("Error en temp: %s\n", firebaseData.errorReason().c_str());
    }
  }

  return correcto;
}

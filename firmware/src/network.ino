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
  firebaseConfig.timeout.socketConnection = 2000;
  firebaseConfig.timeout.serverResponse = 2000;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
  Serial.println("Cliente Firebase inicializado.");
}

bool firebaseDisponibleParaEnvio(const char *ruta) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("WiFi desconectado; se omite %s.\n", ruta);
    return false;
  }
  if (!Firebase.ready()) {
    Serial.printf("Firebase no está listo; se omite %s.\n", ruta);
    return false;
  }
  return true;
}

bool enviarFloatFirebaseAsync(const char *ruta, float valor) {
  if (!firebaseDisponibleParaEnvio(ruta)) {
    return false;
  }
  if (!Firebase.setFloatAsync(firebaseData, ruta, valor)) {
    Serial.printf("Error en %s: %s\n", ruta, firebaseData.errorReason().c_str());
    return false;
  }
  return true;
}

bool enviarBoolFirebaseAsync(const char *ruta, bool valor) {
  if (!firebaseDisponibleParaEnvio(ruta)) {
    return false;
  }
  if (!Firebase.setBoolAsync(firebaseData, ruta, valor)) {
    Serial.printf("Error en %s: %s\n", ruta, firebaseData.errorReason().c_str());
    return false;
  }
  return true;
}

bool enviarLecturasFirebase(
    float sensor1,
    float sensor2,
    float sensor3,
    float temperatura,
    bool flotadorBajo,
    bool flotadorAlto
) {
  if (!firebaseDisponibleParaEnvio("/monitoreo")) {
    return false;
  }

  bool correcto = true;
  correcto &= enviarFloatFirebaseAsync("/monitoreo/sensor1", sensor1);
  correcto &= enviarFloatFirebaseAsync("/monitoreo/sensor2", sensor2);
  correcto &= enviarFloatFirebaseAsync("/monitoreo/sensor3", sensor3);
  correcto &= enviarBoolFirebaseAsync("/monitoreo/flotador_bajo", flotadorBajo);
  correcto &= enviarBoolFirebaseAsync("/monitoreo/flotador_alto", flotadorAlto);

  if (!isnan(temperatura)) {
    correcto &= enviarFloatFirebaseAsync("/monitoreo/temp", temperatura);
  }

  return correcto;
}

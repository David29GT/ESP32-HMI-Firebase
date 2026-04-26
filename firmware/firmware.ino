#include <WiFi.h>
#include <FirebaseESP32.h>
#include "config.h"

// Objetos de Firebase
FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

void setup() {
  Serial.begin(115200);

  // 1. Conexión WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Conectado a la red!");

  // 2. Configuración de Firebase
  // Usamos database_url para asegurar que apunte correctamente al Host
  config.database_url = FIREBASE_HOST; 
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  // 3. Inicialización y Reconexión
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Ajuste opcional para mejorar estabilidad de conexión SSL
  firebaseData.setResponseSize(1024);
  
  Serial.println("Sistema Firebase listo.");
}

void loop() {
  // Generamos un dato de prueba (simulando un sensor, ej. temperatura)
  // random(min, max) genera un entero, luego le sumamos decimales
  float valorPrueba = random(18, 30) + (random(0, 100) / 100.0);

  Serial.printf("Enviando dato: %.2f... ", valorPrueba);

  // Enviamos el dato a la ruta "/monitoreo/sensor1"
  // Si la ruta no existe, Firebase la crea automáticamente
  if (Firebase.setFloat(firebaseData, "/monitoreo/sensor1", valorPrueba)) {
    Serial.println("¡Éxito en Firebase!");
  } else {
    Serial.print("Error al enviar: ");
    Serial.println(firebaseData.errorReason());
  }

  // UPDATE_INTERVAL definido en config.h (2000ms = 2s)
  delay(UPDATE_INTERVAL); 
}
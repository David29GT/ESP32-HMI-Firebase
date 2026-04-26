#include <WiFi.h>
#include <FirebaseESP32.h>
#include <HTTPClient.h>
#include "config.h"

// Objetos de Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Variables para el procesamiento del historial (Promedios y Extremos)
float suma = 0;
float valorMax = -1000.0;
float valorMin = 1000.0;
int contadorLecturas = 0;
const int LECTURAS_POR_MINUTO = 30; // 30 lecturas de 2s = 1 minuto

void setup() {
  Serial.begin(115200);

  // Conexión WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado!");

  // Configuración de Firebase
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  // Simulación de lectura (aquí iría tu sensor real)
  float lecturaActual = random(2000, 3000) / 100.0; 

// 1. ENVÍO A FIREBASE (Tiempo Real - Cada 2 segundos)
  if (Firebase.setFloat(fbdo, "/monitoreo/sensor1", lecturaActual)) {
    // Cambiamos Serial.printf por Serial.println para saltar de línea
    Serial.print("Tiempo Real: ");
    Serial.print(lecturaActual);
    Serial.println(" | OK"); // <--- El println hace el salto
  } else {
    Serial.println("Error Firebase: " + fbdo.errorReason());
  }

  // 2. ACUMULAR PARA HISTORIAL
  suma += lecturaActual;
  contadorLecturas++;
  if (lecturaActual > valorMax) valorMax = lecturaActual;
  if (lecturaActual < valorMin) valorMin = lecturaActual;

  // 3. ¿SE CUMPLIÓ EL MINUTO? (Enviar reporte a D1)
  if (contadorLecturas >= LECTURAS_POR_MINUTO) {
    float promedio = suma / contadorLecturas;
    enviarReporteHistorial(promedio, valorMax, valorMin);
    
    // Reiniciar acumuladores
    suma = 0;
    contadorLecturas = 0;
    valorMax = -1000.0;
    valorMin = 1000.0;
  }

  delay(UPDATE_INTERVAL); // 2000ms desde config.h
}

// Función para enviar el resumen al Worker (Base de Datos D1)
void enviarReporteHistorial(float avg, float max, float min) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // URL de tu Worker con el endpoint /update
    String url = "https://esp32-hmi-monitor.samsepiol-cs30.workers.dev/update";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    // Construir el JSON con los datos procesados
    String jsonPayload = "{";
    jsonPayload += "\"type\":\"history\",";
    jsonPayload += "\"avg\":" + String(avg) + ",";
    jsonPayload += "\"max\":" + String(max) + ",";
    jsonPayload += "\"min\":" + String(min);
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
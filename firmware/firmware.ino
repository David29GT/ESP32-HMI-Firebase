#include <WiFi.h>
#include <FirebaseESP32.h>
#include <HTTPClient.h>
#include "config.h"

// Objetos de Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Variables para el procesamiento del historial
float suma = 0;
float valorMax = -1000.0;
float valorMin = 1000.0;
int contadorLecturas = 0;
const int LECTURAS_POR_MINUTO = 30; 

// Arreglo para almacenar los 30 puntos crudos
float historialLecturas[LECTURAS_POR_MINUTO]; 

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
  // Simulación de lectura (Random para pruebas)
  float lecturaActual = random(2000, 3000) / 100.0;

  // 1. ENVÍO A FIREBASE (Tiempo Real - Cada 2 segundos)
  if (Firebase.setFloat(fbdo, "/monitoreo/sensor1", lecturaActual)) {
    Serial.print("Tiempo Real: ");
    Serial.print(lecturaActual);
    Serial.println(" | OK");
  } else {
    Serial.println("Error Firebase: " + fbdo.errorReason());
  }

  // 2. ACUMULAR PARA HISTORIAL
  if (contadorLecturas < LECTURAS_POR_MINUTO) {
    historialLecturas[contadorLecturas] = lecturaActual;
  }
  
  suma += lecturaActual;
  if (lecturaActual > valorMax) valorMax = lecturaActual;
  if (lecturaActual < valorMin) valorMin = lecturaActual;
  
  contadorLecturas++;

  // 3. ¿SE CUMPLIÓ EL MINUTO?
  if (contadorLecturas >= LECTURAS_POR_MINUTO) {
    float promedio = suma / contadorLecturas;
    
    // Convertimos el array a String formato JSON
    String jsonArray = "[";
    for (int i = 0; i < LECTURAS_POR_MINUTO; i++) {
      jsonArray += String(historialLecturas[i]);
      if (i < LECTURAS_POR_MINUTO - 1) jsonArray += ",";
    }
    jsonArray += "]";

    // Enviamos al Worker
    enviarReporteHistorial(promedio, valorMax, valorMin, jsonArray);
    
    // Reiniciar acumuladores
    suma = 0;
    contadorLecturas = 0;
    valorMax = -1000.0;
    valorMin = 1000.0;
  }

  delay(UPDATE_INTERVAL); 
}

void enviarReporteHistorial(float avg, float max, float min, String rawData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "https://esp32-hmi-monitor.samsepiol-cs30.workers.dev/update";
    
    http.begin(url);
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
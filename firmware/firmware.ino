#include "config.h"

// Variables de estado
float suma = 0;
float valorMax = -1000.0;
float valorMin = 1000.0;
int contadorLecturas = 0;
float historialLecturas[LECTURAS_POR_MINUTO];

void setup() {
  Serial.begin(115200);
  conectarWiFi();
  iniciarFirebase();
}

void loop() {
  // Simulación de lectura
  float lecturaActual = random(2000, 3000) / 100.0;

  // 1. Tiempo Real
  enviarTiempoReal(lecturaActual);

  // 2. Acumular datos
  if (contadorLecturas < LECTURAS_POR_MINUTO) {
    historialLecturas[contadorLecturas] = lecturaActual;
    suma += lecturaActual;
    if (lecturaActual > valorMax) valorMax = lecturaActual;
    if (lecturaActual < valorMin) valorMin = lecturaActual;
    contadorLecturas++;
  }

  // 3. Procesar Minuto
  if (contadorLecturas >= LECTURAS_POR_MINUTO) {
    float promedio = suma / contadorLecturas;
    String jsonArray = formatearJSON(historialLecturas, LECTURAS_POR_MINUTO);
    
    enviarReporteHistorial(promedio, valorMax, valorMin, jsonArray);
    
    // Reset
    suma = 0;
    contadorLecturas = 0;
    valorMax = -1000.0;
    valorMin = 1000.0;
  }

  delay(UPDATE_INTERVAL);
}
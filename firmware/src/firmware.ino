#include <math.h>
#include "config.h"

unsigned long ultimaLectura = 0;

void setup() {
  Serial.begin(115200);
  iniciarSensores();
  conectarWiFi();
  iniciarFirebase();
}

void loop() {
  mantenerConexionWiFi();

  const unsigned long ahora = millis();
  if (ahora - ultimaLectura < UPDATE_INTERVAL) {
    return;
  }
  ultimaLectura = ahora;

  const int sensor1 = Sensor_1();
  const int sensor2 = Sensor_2();
  const int sensor3 = Sensor_3();
  const float temperatura = leerTemperatura();

  Serial.printf(
      "T1: %d%% | T2: %d%% | T3: %d%% | Temperatura: ",
      sensor1,
      sensor2,
      sensor3
  );
  if (isnan(temperatura)) {
    Serial.println("DS18B20 desconectado");
    enviarLecturasFirebase(
        static_cast<float>(sensor1),
        static_cast<float>(sensor2),
        static_cast<float>(sensor3),
        NAN
    );
    return;
  }
  Serial.printf("%.2f C\n", temperatura);

  if (enviarLecturasFirebase(
          static_cast<float>(sensor1),
          static_cast<float>(sensor2),
          static_cast<float>(sensor3),
          temperatura)) {
    Serial.println("Telemetría enviada a Firebase.");
  }
}

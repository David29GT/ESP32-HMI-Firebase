#include <math.h>
#include <Adafruit_NeoPixel.h>
#include "config.h"

unsigned long ultimaLectura = 0;
Adafruit_NeoPixel pixels(
    RGB_LED_COUNT,
    RGB_LED_PIN,
    NEO_GRB + NEO_KHZ800
);

void setup() {
  Serial.begin(115200);

  // BNA conserva el pull-up externo del circuito original.
  pinMode(BNA, INPUT);
  pinMode(ANA, INPUT_PULLUP);

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(VALVE_SERVO_PIN, OUTPUT);
  pinMode(TANK_KEY_SERVO_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW);
  digitalWrite(VALVE_SERVO_PIN, LOW);
  digitalWrite(TANK_KEY_SERVO_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  pixels.begin();
  pixels.clear();
  pixels.show();

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
  const bool flotadorBajo = leerFlotadorBajo();
  const bool flotadorAlto = leerFlotadorAlto();
  const float temperatura = leerTemperatura();

  Serial.printf(
      "T1: %d%% | T2: %d%% | T3: %d%% | Flotador bajo: %s | "
      "Flotador alto: %s | Temperatura: ",
      sensor1,
      sensor2,
      sensor3,
      flotadorBajo ? "HIGH" : "LOW",
      flotadorAlto ? "HIGH" : "LOW"
  );
  if (isnan(temperatura)) {
    Serial.println("DS18B20 desconectado");
    enviarLecturasFirebase(
        static_cast<float>(sensor1),
        static_cast<float>(sensor2),
        static_cast<float>(sensor3),
        NAN,
        flotadorBajo,
        flotadorAlto
    );
    return;
  }
  Serial.printf("%.2f C\n", temperatura);

  if (enviarLecturasFirebase(
          static_cast<float>(sensor1),
          static_cast<float>(sensor2),
          static_cast<float>(sensor3),
          temperatura,
          flotadorBajo,
          flotadorAlto)) {
    Serial.println("Solicitudes de telemetría enviadas; respuesta no confirmada.");
  }
}

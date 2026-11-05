#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensorTemperatura(&oneWire);

void iniciarSensores() {
  pinMode(TRIG_SENSOR_1, OUTPUT);
  pinMode(ECHO_SENSOR_1, INPUT);
  pinMode(TRIG_SENSOR_2, OUTPUT);
  pinMode(ECHO_SENSOR_2, INPUT);
  pinMode(TRIG_SENSOR_3, OUTPUT);
  pinMode(ECHO_SENSOR_3, INPUT);

  digitalWrite(TRIG_SENSOR_1, LOW);
  digitalWrite(TRIG_SENSOR_2, LOW);
  digitalWrite(TRIG_SENSOR_3, LOW);

  sensorTemperatura.begin();
}

float medirDistanciaCm(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  const unsigned long duracion =
      pulseIn(echoPin, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duracion == 0) {
    return -1.0f;
  }

  return duracion * 0.034f / 2.0f;
}

int Sensor_1() {
  const float distancia = medirDistanciaCm(TRIG_SENSOR_1, ECHO_SENSOR_1);
  if (distancia < 0.0f || distancia > 178.0f) {
    return 0;
  }
  if (distancia < 2.0f) {
    return 100;
  }

  return constrain(map(static_cast<long>(distancia), 2, 178, 100, 0), 0, 100);
}

int Sensor_2() {
  const float distancia = medirDistanciaCm(TRIG_SENSOR_2, ECHO_SENSOR_2);
  if (distancia < 0.0f || distancia > 93.0f) {
    return 0;
  }
  if (distancia <= 14.0f) {
    return 100;
  }

  return constrain(map(static_cast<long>(distancia), 14, 93, 100, 0), 0, 100);
}

int Sensor_3() {
  const float distancia = medirDistanciaCm(TRIG_SENSOR_3, ECHO_SENSOR_3);
  if (distancia < 0.0f || distancia > 119.0f) {
    return 0;
  }
  if (distancia < 21.0f) {
    return 100;
  }

  return constrain(map(static_cast<long>(distancia), 21, 119, 100, 0), 0, 100);
}

float leerTemperatura() {
  sensorTemperatura.requestTemperatures();
  const float temperatura = sensorTemperatura.getTempCByIndex(0);

  if (temperatura == DEVICE_DISCONNECTED_C) {
    return NAN;
  }
  return temperatura < 0.0f ? 0.0f : temperatura;
}

#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensorTemperatura(&oneWire);

void iniciarSensores() {
  pinMode(POT_SENSOR_1_PIN, INPUT);
  pinMode(POT_SENSOR_2_PIN, INPUT);
  pinMode(POT_SENSOR_3_PIN, INPUT);
  analogReadResolution(12);

  sensorTemperatura.begin();
}

int leerNivelPorPotenciometro(uint8_t pin) {
  const int lectura = analogRead(pin);
  return constrain(map(lectura, 0, 4095, 0, 100), 0, 100);
}

int Sensor_1() {
  return leerNivelPorPotenciometro(POT_SENSOR_1_PIN);
}

int Sensor_2() {
  return leerNivelPorPotenciometro(POT_SENSOR_2_PIN);
}

int Sensor_3() {
  return leerNivelPorPotenciometro(POT_SENSOR_3_PIN);
}

bool leerFlotadorBajo() {
  return digitalRead(BNA);
}

bool leerFlotadorAlto() {
  return digitalRead(ANA);
}

/*
 * Lectura ultrasónica original del firmware Blynk. Conservar para restaurar
 * los sensores reales; los potenciómetros se usan actualmente para pruebas.
 *
 * float medirDistanciaCm(uint8_t trigPin, uint8_t echoPin) {
 *   digitalWrite(trigPin, LOW);
 *   delayMicroseconds(2);
 *   digitalWrite(trigPin, HIGH);
 *   delayMicroseconds(10);
 *   digitalWrite(trigPin, LOW);
 *
 *   const unsigned long duracion =
 *       pulseIn(echoPin, HIGH, ULTRASONIC_TIMEOUT_US);
 *   if (duracion == 0) return -1.0f;
 *   return duracion * 0.034f / 2.0f;
 * }
 *
 * int Sensor_1() {
 *   digitalWrite(Trig1, HIGH);
 *   delayMicroseconds(10);
 *   digitalWrite(Trig1, LOW);
 *   duration = pulseIn(Echo1, HIGH);
 *   distance = duration * 0.034 / 2;
 *   if (distance >= 2 && distance <= 178) porcentaje1 = map(distance, 2, 178, 102, 0);
 *   if (distance > 178) porcentaje1 = 0;
 *   if (distance < 2) porcentaje1 = 103;
 *   return porcentaje1;
 * }
 *
 * int Sensor_2() {
 *   digitalWrite(Trig2, HIGH);
 *   delayMicroseconds(10);
 *   digitalWrite(Trig2, LOW);
 *   duration = pulseIn(Echo2, HIGH);
 *   distance = duration * 0.034 / 2;
 *   if (distance >= 14 && distance <= 93) porcentaje2 = map(distance, 14, 93, 100, 0);
 *   if (distance > 93) porcentaje2 = 0;
 *   if (distance < 14 && distance > 4) porcentaje2 = 100;
 *   if (distance <= 4) porcentaje2 = 100;
 *   return porcentaje2;
 * }
 *
 * int Sensor_3() {
 *   digitalWrite(Trig3, LOW);
 *   delayMicroseconds(2);
 *   digitalWrite(Trig3, HIGH);
 *   delayMicroseconds(200);
 *   digitalWrite(Trig3, LOW);
 *   duration = pulseIn(Echo3, HIGH);
 *   distance = duration * 0.034 / 2;
 *   if (Data_sensor == 1) Blynk.virtualWrite(V3, distance);
 *   if (distance >= 21 && distance <= 119) porcentaje3 = map(distance, 21, 119, 100, 0);
 *   if (porcentaje3 >= 98 && porcentaje3 < 100 && Bloqueo_S3 == 1) {
 *     Desbloqueo_S3++;
 *     if (Desbloqueo_S3 == 20) {
 *       Desbloqueo_S3 = 0;
 *       Bloqueo_S3 = 0;
 *     }
 *   }
 *   if ((porcentaje3 < 98 && Desbloqueo_S3 > 0) ||
 *       (porcentaje3 == 100 && Desbloqueo_S3 > 0)) Desbloqueo_S3--;
 *   if (Bloqueo_S3 == 1) porcentaje3 = 100;
 *   if (distance > 119) porcentaje3 = 0;
 *   if (distance < 21) porcentaje3 = 100;
 *   return porcentaje3;
 * }
 */

float leerTemperatura() {
  sensorTemperatura.requestTemperatures();
  const float temperatura = sensorTemperatura.getTempCByIndex(0);

  if (temperatura == DEVICE_DISCONNECTED_C) {
    return NAN;
  }
  return temperatura < 0.0f ? 0.0f : temperatura;
}

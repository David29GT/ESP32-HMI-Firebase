#pragma once

#include <Arduino.h>
#include "secrets.h"

constexpr unsigned long UPDATE_INTERVAL = 2000UL;
constexpr unsigned long WIFI_RECONNECT_INTERVAL = 10000UL;
constexpr unsigned long ULTRASONIC_TIMEOUT_US = 30000UL;

// Potenciómetros para pruebas: ADC1 del ESP32, rango de lectura 0-4095.
constexpr uint8_t POT_SENSOR_1_PIN = 35;
constexpr uint8_t POT_SENSOR_2_PIN = 34;
constexpr uint8_t POT_SENSOR_3_PIN = 39;

// Pines ultrasónicos originales, conservados para restaurar el hardware real.
// constexpr uint8_t TRIG_SENSOR_1 = 14;
// constexpr uint8_t ECHO_SENSOR_1 = 35;
// constexpr uint8_t TRIG_SENSOR_2 = 27;
// constexpr uint8_t ECHO_SENSOR_2 = 34;
// constexpr uint8_t TRIG_SENSOR_3 = 25;
// constexpr uint8_t ECHO_SENSOR_3 = 39;

constexpr uint8_t BNA = 33;  // Flotador bajo; requiere pull-up externo (configuración original).
constexpr uint8_t ANA = 17;  // Flotador alto.
constexpr uint8_t PUMP_RELAY_PIN = 26;
constexpr uint8_t VALVE_SERVO_PIN = 23;
constexpr uint8_t TANK_KEY_SERVO_PIN = 22;
constexpr uint8_t RGB_LED_PIN = 15;
constexpr uint8_t BUZZER_PIN = 12;

constexpr uint8_t DS18B20_PIN = 32;
constexpr uint8_t RGB_LED_COUNT = 1;

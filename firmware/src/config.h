#pragma once

#include <Arduino.h>
#include "secrets.h"

constexpr unsigned long UPDATE_INTERVAL = 2000UL;
constexpr unsigned long WIFI_RECONNECT_INTERVAL = 10000UL;
constexpr unsigned long ULTRASONIC_TIMEOUT_US = 30000UL;

constexpr uint8_t TRIG_SENSOR_1 = 14;
constexpr uint8_t ECHO_SENSOR_1 = 35;
constexpr uint8_t TRIG_SENSOR_2 = 27;
constexpr uint8_t ECHO_SENSOR_2 = 34;
constexpr uint8_t TRIG_SENSOR_3 = 25;
constexpr uint8_t ECHO_SENSOR_3 = 39;
constexpr uint8_t DS18B20_PIN = 32;

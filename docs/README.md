# ESP32 HMI Real-Time Monitor

Sistema de monitoreo en tiempo real utilizando un ESP32, Firebase Realtime Database y Cloudflare Workers.

## 🚀 Estructura del Proyecto
* **/firmware**: Código de Arduino/C++ para el ESP32.
* **/worker**: Interfaz web (HMI) desplegada en Cloudflare Workers.

## 🛠️ Tecnologías
* **ESP32**: Captura y envío de datos mediante WiFi.
* **Firebase**: Base de datos NoSQL para el puente de datos.
* **Cloudflare Workers**: Hosting de la interfaz web con latencia mínima.
* **Chart.js**: Visualización de datos en tiempo real.

## 📌 Estado del Proyecto
- [x] Conexión WiFi y Firebase.
- [x] Envío de datos de sensores (simulados).
- [x] Despliegue de HMI en la nube.
- [ ] Integración de sensores físicos (Próximamente).
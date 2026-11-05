# ESP32 HMI Real-Time Monitor (SCADA Web)

Sistema SCADA para monitoreo de 3 tanques de agua y una bomba, con adquisición de datos desde un ESP32, almacenamiento en Firebase Realtime Database, procesamiento histórico automatizado y visualización en una interfaz HMI desplegada en Cloudflare Workers.

## ¿Qué está implementado actualmente?

El proyecto ya incluye la implementación de varias capas funcionales:

### 1. Firmware del ESP32
- Conexión WiFi y configuración de la base de datos Firebase.
- Lógica para capturar lecturas y variables del sistema.
- Envío de telemetría al nodo principal de Firebase.
- Arquitectura modular dividida en:
  - `firmware/firmware.ino`: lógica principal del loop de operación.
  - `firmware/network.ino`: conexión WiFi/configuración de red.
  - `firmware/sensors.ino`: lectura y preparación de datos del sistema.

### 2. Integración con Firebase
- El ESP32 envía los datos al nodo `system_live/esp32_scada_main` en Firebase Realtime Database.
- Las variables principales que se manejan son:
  - `t1` (Nivel Tanque 1)
  - `t2` (Nivel Tanque 2)
  - `t3` (Nivel Tanque 3)
  - `temp` (Temperatura)
  - `pumpRunning` (Estado de la bomba)
- **Comandos (NUEVO):** El ESP32 escucha el nodo `system_live/comandos` para recibir órdenes desde la web (ej. encender bomba, activar E-STOP).

### 3. HMI / SCADA Unificado en Cloudflare Worker
Se ha rediseñado la interfaz para tener un enrutamiento unificado con un menú de navegación superior, dividiendo la aplicación en 4 vistas principales:

- **`/` o `/scada` (Vista de Proceso):** Diagrama P&ID animado (SVG desde Cloudinary) que refleja el estado real. El agua de los tanques sube/baja y la bomba cambia de color según los datos de Firebase. Incluye panel de control lateral (sliders).
- **`/tarjetas` (Vista de Instrumentación):** Tarjetas individuales para cada equipo (Tanque 1, Tanque 2, Bomba, etc.) con indicadores visuales de color y estado.
- **`/telemetria` (Vista de Gráficas):** Dashboard con Chart.js para ver datos en tiempo real (vía Firebase) e históricos (vía consultas a D1).
- **`/alarmas` (Vista de Alarmas):** Sistema visual de alertas críticas y advertencias, con botón de "ACK" (Aceptar) para silenciar.

### 4. ETL y almacenamiento histórico
- El script `backend/main.py` (o el Cron de Cloudflare) extrae datos de Firebase.
- Se guardan en SQLite (D1) con la tabla `telemetria` (columnas: `timestamp`, `variable`, `valor`).
- Se exporta un JSON optimizado para las gráficas.

## 🏗️ Arquitectura Funcional del Sistema

```text
                   +-----------------------------------+
                   |           NAVEGADOR WEB           |
                   |  (SCADA SVG / Tarjetas / Gráficas)|
                   +-----------------+-----------------+
                                     |
                   [WebSockets / HTTP fetch] (Cloudflare Worker)
                                     |
                                     v
+------------------+      +--------------------+      +------------------+
|   ESP32 (Edge)   |<---->| Firebase RTDB (DB) |<---->| Cloudflare D1    |
| - Lee sensores   |      | - system_live      |      | (Históricos)     |
| - Activa relés   |      | - comandos         |      +------------------+
+------------------+      +--------------------+
```

## Estructura del proyecto actualizada

```text
├── .github/
│   └── workflows/
│       └── scada_update.yml       # Automatización periódica (ETL)
├── assets/                        # SVGs locales si no usas Cloudinary
├── backend/
│   ├── main.py                    # ETL: Firebase -> SQLite -> JSON
│   ├── historico_scada.db         # Base histórica SQLite
│   └── datos_grafica.json         # Datos optimizados para la UI
├── docs/
│   └── README.md                  # Documentación del proyecto
├── firmware/
│   ├── firmware.ino               # Lógica principal del ESP32 (Firebase streams)
│   ├── network.ino                # Manejo de red/WiFi
│   └── sensors.ino                # Lecturas y tratamiento de sensores
├── worker/
│   ├── wrangler.toml              # Configuración de Cloudflare Workers/D1
│   └── src/
│       ├── index.js               # Router principal (Unifica las 4 vistas)
│       ├── database.js            # Acceso a D1
│       ├── layout.js              # (Nuevo) Menú de navegación común
│       ├── scada_svg.js           # Lógica del P&ID (SVG animado)
│       ├── tarjetas.js            # Vista de instrumentación (Cards)
│       ├── telemetria.js          # Vista de gráficas (Chart.js)
│       ├── alarmas.js             # Vista de alarmas (Pendiente pulir)
│       └── manifest.js            # Configuración de manifiesto PWA
└── README.md
```

## Tecnologías utilizadas
- **Hardware:** ESP32 (C++)
- **Conectividad:** WiFi + Firebase Realtime Database (Streaming de datos)
- **Procesamiento histórico:** Python 3 / Node.js (Cloudflare Cron), SQLite3 / D1
- **API/Edge:** Cloudflare Workers
- **Frontend:** JavaScript ES6+, HTML, CSS, SVG (Chart.js para telemetría)
- **CDN Multimedia:** Cloudinary (alojamiento de los SVGs del P&ID)

## 🔌 Flujo de Datos y Control (Paso a Paso)

Para que el sistema funcione de forma real, el flujo es el siguiente:

1. **Lectura (ESP32 -> Firebase):** El ESP32 lee los sensores y actualiza el nodo `system_live/esp32_scada_main` cada X segundos.
2. **Visualización (Firebase -> Web):** El Worker de Cloudflare sirve la página web. El navegador se conecta a Firebase y escucha los cambios. Cuando el ESP32 actualiza un nivel, el SVG de la web se anima automáticamente.
3. **Control (Web -> Firebase -> ESP32):** 
   - El usuario pulsa "Encender Bomba" en la web.
   - La web escribe `true` en `system_live/comandos/pump`.
   - El ESP32 tiene un *listener* en ese nodo. Al detectar el cambio, activa el relé.
   - El ESP32 actualiza `pumpRunning: true` en el nodo principal para confirmar que se ha encendido.

## 🛡️ Seguridad y Roles (RBAC)

La HMI incluye una maqueta de roles (Operador, Supervisor, Administrador). Para que sea seguro en producción:
- Se debe implementar **Cloudflare Access** para autenticar usuarios reales (Google/Email) antes de entrar a la web.
- El Worker validará el JWT (Token) del usuario y rechazará las peticiones de escritura (ej. accionar bombas) si el rol no es el adecuado.
- Los accesos a Firebase desde la web deben estar restringidos por reglas (`Firebase Rules`) para evitar que usuarios no autenticados lean o escriban datos.

## Estado actual del proyecto

### Implementado
- [x] Conexión WiFi del ESP32
- [x] Envío de datos a Firebase
- [x] Lectura y normalización de telemetría desde Firebase
- [x] HMI/SCADA con representación visual de tanques y bomba (SVG desde Cloudinary)
- [x] Generación de JSON optimizado para gráficos
- [x] Dashboard de telemetría con Chart.js
- [x] Automatización periódica con GitHub Actions
- [x] API de acceso por Cloudflare Workers

### Pendiente / En Desarrollo (Roadmap)
- [ ] **Refactorización del Router:** Unificar las vistas de SCADA, Tarjetas y Telemetría en un solo archivo `index.js` con un layout común.
- [ ] **Conexión SVG-Firebase:** Modificar `Worker_ProcesoCasaV5` para que las animaciones del agua respondan a los datos reales de Firebase en lugar de sliders locales.
- [ ] **Control de Actuadores:** Implementar la lógica en la web para escribir comandos en Firebase y en el ESP32 para leerlos y accionar los relés.
- [ ] **Vista de Alarmas:** Conectar el sistema de alertas (críticas y advertencias) a Firebase.
- [ ] **Seguridad:** Añadir autenticación con Cloudflare Access y reglas de Firebase.
- [ ] **Alertas por correo/Telegram:** Usar un Cron Trigger en Cloudflare para notificar si hay un fallo crítico.

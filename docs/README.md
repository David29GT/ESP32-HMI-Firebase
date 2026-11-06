# ESP32 HMI Real-Time Monitor (SCADA Web)

Sistema SCADA web para monitorear y controlar un proceso de tres tanques y una bomba. La interfaz se sirve desde Cloudflare Workers, utiliza Firebase Realtime Database para el estado y los controles en tiempo real, y consulta históricos almacenados en Cloudflare D1.

## Estado actual

La aplicación web está implementada: cuenta con un layout de navegación unificado, cuatro vistas, sincronización con Firebase, autenticación Basic para las páginas y funciones de telemetría y alarmas. La integración física y validación del hardware ESP32, así como las notificaciones por Discord, continúan pendientes.

## Arquitectura frontend

`worker/src/index.js` enruta las páginas y `worker/src/layout.js` genera el layout compartido con navegación entre estas cuatro vistas:

| Vista | Ruta | Funcionalidad |
|---|---|---|
| **Proceso** | `/proceso` | Diagrama P&ID SVG, niveles y estados del proceso, controles visuales y animación según Firebase. |
| **Dashboard / Tarjetas** | `/tarjetas` | Tarjetas de equipos, controles ON/OFF, modos, setpoints, E-STOP, alarmas y registro de auditoría. |
| **Telemetría** | `/telemetria` (también `/dashboard`) | Gráficas Chart.js en tiempo real e históricos por rango consultados en D1. |
| **Alarmas** | `/alarmas` | Lista en tiempo real de alarmas, con clasificación visual y acción ACK para retirar una alarma. |

Las rutas `/` y `/scada` también sirven la vista de tarjetas.

## Firebase y sincronización en tiempo real

Las cuatro vistas se conectan directamente a Firebase Realtime Database mediante listeners. Los cambios se reflejan en los clientes conectados sin recargar la página. Los datos del proceso se leen principalmente de `monitoreo/`; los comandos, modos y estados compartidos se manejan en `system_live/controles/`, y las alarmas y eventos de auditoría en `system_live/alarmas` y `system_live/logs`.

Los cambios en sliders y controles ON/OFF, modos de operación (**MANUAL**, **AUTO** y **MANT**), setpoints y E-STOP se escriben en Firebase y se propagan a los dispositivos o vistas que escuchan esos nodos. La vista de telemetría también permite introducir valores manuales en Firebase; su simulación automática local afecta la gráfica del navegador y no reemplaza los datos reales.

### Simulador local del ESP32

Para probar la interfaz sin hardware, instala las dependencias Python (`python -m pip install -r backend\requirements.txt`) y ejecuta `python simulador_esp32.py` desde la raíz del proyecto. El script usa `backend/serviceAccountKey.json` (ignorado por Git), abre una ventana con un slider de 0 a 100 para ajustar el depósito `sensor1` y simula la transferencia por bomba (5 puntos porcentuales por segundo) y el consumo automático de T2/T3 (0.5 puntos por segundo). El botón **Consumo** activa o pausa la reducción automática del depósito; con el consumo pausado, el slider permite ajustar el nivel libremente. El depósito no alimenta los tanques superiores por gravedad; al llenarse registra una alarma que se borra cuando el nivel baja. La bomba se apaga y se registra una alarma crítica si el depósito baja de 10%; esta alarma se borra al superar 15%. Si Firebase usa otra URL, configúrala en la variable de entorno `FIREBASE_DATABASE_URL`.

## Seguridad y roles (RBAC)

### Autenticación de páginas

El Worker aplica **HTTP Basic Auth** a las rutas HTML de la aplicación. El usuario configurado es `USAC`; la contraseña se obtiene del secreto `APP_PASSWORD` de Cloudflare y no debe almacenarse en el repositorio. Si el secreto no está configurado, las páginas protegidas responden con error de configuración. La protección descrita corresponde a las páginas HTML; los endpoints API tienen su propio comportamiento.

### Permisos de interfaz

El selector de rol de la vista de tarjetas ofrece **Operador**, **Supervisor** y **Administrador**:

- **Operador:** los controles de tarjetas quedan en modo de solo lectura; el botón E-STOP permanece disponible.
- **Supervisor:** puede operar los controles de equipos, pero no cambiar modos ni setpoints ni restablecer E-STOP.
- **Administrador:** puede cambiar modos y setpoints, restablecer E-STOP e inyectar alarmas de prueba. En Telemetría también se muestran los controles de simulación automática y limpieza de gráficas.

La selección de rol y sus restricciones son lógica de presentación ejecutada en el navegador; no constituyen una autenticación individual ni autorización RBAC del lado del servidor. En Telemetría, el slider de simulación manual y la consulta de históricos están disponibles independientemente del rol seleccionado.

## Alarmas, auditoría e históricos

- **Simulador de alarmas:** el Dashboard/Tarjetas incluye un botón de simulación visible para Administrador. Inyecta en `system_live/alarmas` una alarma de prueba crítica o de advertencia; los listeners actualizan las vistas de alarmas.
- **Vista Proceso:** el Administrador puede activar el Modo Desarrollador para simular la desconexión de los sensores T1, T2 y T3. El estado se sincroniza en `monitoreo/sensorX_error`, muestra el tanque en gris sin indicar nivel e inyecta una alarma de comunicación en `system_live/alarmas`.
- **Audit Log:** los cambios relevantes de la interfaz se registran en `system_live/logs` en Firebase. La tarjeta del Dashboard muestra las entradas más recientes.
- **Telemetría e históricos:** Chart.js representa los sensores en tiempo real desde Firebase. La vista permite seleccionar rangos y consulta las mediciones históricas almacenadas en D1 mediante `/api/data?start=...&end=...`. El repositorio también incluye `backend/datos_grafica.json` como exportación JSON para gráficas; la consulta histórica interactiva de la interfaz se realiza desde D1.
- **Alarmas del Worker:** el endpoint de ingesta de datos puede registrar en la tabla `alertas` de D1 condiciones como valores fuera de rango y caídas bruscas.

## Arquitectura funcional

```text
 Navegador (4 vistas) ── HTTP Basic Auth ── Cloudflare Worker
          │                                      │
          └──────── Firebase Realtime Database ──┤
               telemetría, controles, alarmas     └── Cloudflare D1
                                                        históricos
 ESP32 (integración física pendiente) ───────── Firebase
```

El Worker entrega el frontend y proporciona endpoints para almacenar y consultar telemetría histórica. Las vistas web se conectan a Firebase desde el navegador para leer y actualizar datos en tiempo real.

## Estructura del proyecto

```text
├── backend/
│   ├── main.py                    # Punto de entrada del backend Python (pendiente de desarrollo)
│   ├── inicializar_db.py          # Inicialización local de SQLite (pendiente de desarrollo)
│   ├── historico_scada.db         # Base histórica local
│   └── datos_grafica.json         # Datos JSON para gráficas
├── docs/
│   └── README.md                  # Documentación del proyecto
├── firmware/
│   ├── firmware.ino               # Bucle principal
│   ├── network.ino                # Conectividad de red
│   ├── sensors.ino                # Lecturas de sensores
│   ├── config.h                   # Pines y parámetros (incluye secretos locales)
│   └── secrets.example.h          # Plantilla de credenciales, sin secretos reales
└── worker/
    ├── wrangler.toml              # Configuración de Cloudflare Workers y D1
    └── src/
        ├── index.js               # Router, HTTP Basic Auth y endpoints
        ├── layout.js              # Layout y navegación compartidos
        ├── scada_svg.js           # Vista Proceso (SVG y Firebase)
        ├── scada.js               # Dashboard/Tarjetas, controles y RBAC de UI
        ├── telemetria.js          # Chart.js y consulta de históricos
        ├── alarmas.js             # Vista de alarmas en tiempo real
        ├── database.js            # Operaciones con D1
        └── manifest.js            # Manifiesto PWA
```

## Tecnologías

- **Frontend:** JavaScript, HTML, CSS, SVG y Chart.js.
- **Plataforma web:** Cloudflare Workers y Cloudflare D1.
- **Tiempo real:** Firebase Realtime Database.
- **Hardware:** ESP32 y firmware C++ (integración física pendiente).
- **Históricos:** almacenamiento y consulta en D1; SQLite local figura en la estructura de `backend/`.

## Plan de Implementación de Firmware

Los módulos del firmware están presentes en `firmware/`: `firmware.ino` contiene el bucle principal, `network.ino` la conectividad, `sensors.ino` las lecturas y `config.h` la configuración. El trabajo pendiente es completar y validar su integración con el hardware ESP32 para:

1. Conectar el dispositivo a WiFi y a Firebase Realtime Database.
2. Leer los sensores de nivel y temperatura y publicar la telemetría en Firebase.
3. Escuchar los comandos compartidos desde la web y accionar los actuadores correspondientes.
4. Probar en el dispositivo la operación normal, los modos y la parada E-STOP.

## Roadmap

### Aplicación web — completada

- [x] UI SCADA y navegación unificada entre Proceso, Dashboard/Tarjetas, Telemetría y Alarmas.
- [x] Sincronización de telemetría y controles con Firebase Realtime Database.
- [x] Protección HTTP Basic Auth de las vistas HTML del Worker.
- [x] Lógica de permisos de interfaz para Operador, Supervisor y Administrador.
- [x] Visualización y confirmación de alarmas, y simulador de alarmas de prueba.
- [x] Registro de auditoría en Firebase.
- [x] Gráficas en tiempo real e históricos Chart.js consultados desde D1.

### Pendiente

- [ ] **Hardware (ESP32):** integración y validación física del firmware con sensores, actuadores y Firebase.
- [ ] **Notificaciones (Discord):** integración para enviar avisos de alarmas o fallos.




## 🗺️ Plan de Implementación: Migración de Blynk a Cloudflare + Firebase (Firmware)

El objetivo es migrar toda la lógica de control del ESP32 (actualmente en Blynk) a nuestro ecosistema de Firebase y Cloudflare Worker, manteniendo las protecciones y la máquina de estados industrial.

### 1. Mapeo de Hardware y Pines (ESP32)

El firmware actual utiliza los siguientes pines. Deben mantenerse en el nuevo archivo `config.h`:
*   **Sensores Ultrasónicos (Nivel):** T1 (Trig 14, Echo 35), T2 (Trig 27, Echo 34), T3 (Trig 25, Echo 39).
*   **Sensores de Estado (Flotadores/LDR):** BNA (Pin 33 - Nivel Bajo T1), ANA (Pin 17 - Nivel Alto T1), Manual (Pin 18), Falso (Pin 19), LDR (Pin 36).
*   **Temperatura:** DS18B20 en OneWire (Pin 32).
*   **Actuadores (Potencia):** Triac Bomba 1 (Pin 12), Triac Bomba 2 (Pin 2), Habilitador Válvula (Pin 13).
*   **Servos (Válvulas):** Servo 1 (Pin 23), Servo 2 (Pin 22).
*   **Indicadores:** LED NeoPixel (Pin 15).

### 2. Mapeo de Comunicación (Blynk Virtual Pins -> Firebase Nodes)

Sustituiremos las funciones `Blynk.virtualWrite()` y `BLYNK_WRITE()` por `Firebase.setX()` y `Firebase.stream()`.

| Función Original (Blynk) | Pestaña HMI (Worker) | Nodo en Firebase | Tipo de Dato |
| :--- | :--- | :--- | :--- |
| `V11`, `V21`, `V31` (Niveles) | Proceso / Dashboard | `monitoreo/sensor1`, `sensor2`, `sensor3` | Float (0-100) |
| `V9` (Temperatura) | Proceso / Dashboard | `monitoreo/temp` | Float |
| `V10` (Estado de Error) | Alarmas | `system_live/alarmas/alerta_X` | Object (Mensaje, Nivel) |
| `V3` (Terminal de texto) | Log / Consola | `system_live/logs` (Lista) | String / Push |
| `V4` (Boton Start/Stop) | Dashboard | `monitoreo/bomba` | Boolean |
| `V5` (Boton Opciones) | Dashboard | `system_live/comandos/opciones` | Int (1-11) |
| Razón del último apagado | Dashboard / Opciones V5 | `system_live/razon_ultimo_apagado` | String |
| `V54` (Control Válvula) | Dashboard | `system_live/comandos/valvula` | Int (0=Cerrar, 90=Abrir) |
| *N/A* (Nuevo E-STOP) | Dashboard | `system_live/controles/estop` | Boolean |

El menú V5 envía los comandos numerados del 1 al 11 como enteros a `system_live/comandos/opciones`. La LCD muestra el estado del proceso, mensajes de confirmación de comandos y, cuando la bomba se detiene, la razón leída desde `system_live/razon_ultimo_apagado`. Los eventos visibles en la terminal se registran con marca de tiempo en `system_live/logs`.

### 3. Estructura del Firmware Refactorizado

Se dividirá el código en los siguientes archivos dentro de `firmware/`:

*   **`config.h`**: Definición de pines y parámetros del firmware; incluye `secrets.h`, que contiene las credenciales locales y no se versiona. `secrets.example.h` sirve como plantilla.
*   **`network.ino`**: Conexión y reconexión WiFi e inicialización del cliente `FirebaseESP32`.
*   **`sensors.ino`**: Lecturas de `Sensor_1()`, `Sensor_2()`, `Sensor_3()` y DS18B20. La lógica de "Moda" para detección de flujo se abordará con la máquina de estados.
*   **`actuators.ino`**: Lógica para mover los servos (válvulas) y encender los Triacs (bombas), absorbiendo la lógica de seguridad (no encender si hay E-STOP o bajo nivel).
*   **`firmware.ino` (Main)**: Contendrá el `setup()` y `loop()`, además de la máquina de estados (`Control_Automatico`, `Programacion_Rapida`, `Programacion_Lenta`).

Para compilar esta fase se requieren las librerías Arduino `Firebase ESP32 Client` (cabecera `FirebaseESP32.h`), `OneWire` y `DallasTemperature`. En una instalación nueva, copia `secrets.example.h` como `secrets.h` y completa allí las credenciales locales; no publiques `secrets.h`.

### 4. Fases de Implementación (Checklist)

- [x] **Fase 1: Esqueleto de Red (implementación)**
  - Inicializar WiFi y Firebase y reintentar la conexión WiFi si se pierde.
  - Pendiente de validar en placa; la lectura de comandos de Firebase todavía no está implementada.
- [x] **Fase 2: Migración de Lecturas (implementación)**
  - Leer los tres sensores ultrasónicos y el DS18B20 cada 2 segundos.
  - Publicar los niveles en `monitoreo/sensor1`, `monitoreo/sensor2`, `monitoreo/sensor3` y la temperatura en `monitoreo/temp`.
  - Pendiente de prueba física con sensores y validación de la vista HMI.
- [ ] **Fase 3: Control de Actuadores (Escritura)**
  - Configurar los *listeners* de Firebase en el ESP32 para escuchar `monitoreo/bomba` y las válvulas.
  - Programar el encendido de los pines (Triacs y Servos).
  - *Prueba en HMI:* Mover un slider en la web y ver que el relé del ESP32 hace clic.
- [ ] **Fase 4: Migración de la Máquina de Estados (El Cerebro)**
  - Trasladar la lógica de `Estado` (0=Listo, 1=Encendido, 2=Espera), la detección de flujo y las protecciones de seguridad.
  - Sustituir los `Blynk.virtualWrite` de los errores por inserciones en `system_live/alarmas`.
- [ ] **Fase 5: Sincronización del Modo Automático**
  - Asegurar que el ESP32 respete el modo AUTOMÁTICO/MANUAL que se selecciona en el Dashboard (leyendo el nodo `system_live/controles/modo`).
  - Implementar el E-STOP: Si Firebase envía `true` en el E-STOP, el ESP32 debe apagar los Triacs inmediatamente por software.
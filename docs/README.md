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
│   └── config.h                   # Configuración del firmware
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

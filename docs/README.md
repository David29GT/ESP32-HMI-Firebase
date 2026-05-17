# ESP32 HMI Real-Time Monitor

Sistema de monitoreo industrial SCADA para el control de 3 tanques de agua independientes, utilizando una arquitectura híbrida de baja latencia y persistencia histórica automatizada.

## 🛰️ Arquitectura del Sistema y Flujo de Datos

El proyecto opera bajo dos flujos de datos paralelos para garantizar tanto la inmediatez como el análisis histórico:

### 1. Flujo de Tiempo Real (Latencia < 1s)
*   **Origen:** El **ESP32** captura los niveles de los tanques y el estado de la bomba.
*   **Transporte:** Envía los datos directamente a **Firebase Realtime Database**.
*   **Visualización:** El Dashboard (JS) mantiene una conexión abierta mediante WebSockets con Firebase, actualizando las gráficas instantáneamente al recibir un cambio.

### 2. Flujo Histórico y Procesamiento (ETL)
*   **Automatización:** Cada 5 minutos, **GitHub Actions** dispara un flujo de trabajo.
*   **Procesamiento (Python):** El script `backend/main.py` extrae los datos de Firebase, los limpia y los almacena en una base de datos **SQLite** (`historico_scada.db`).
*   **Optimización:** Se genera un archivo `datos_grafica.json` con los últimos 1000 registros procesados mediante Pandas (pivoteo de tablas y manejo de nulos).
*   **Persistencia:** GitHub Actions hace un commit automático de la DB y el JSON de vuelta al repositorio.

### 3. Capa de API (Edge Computing)
*   **Cloudflare Worker:** Actúa como middleware. Cuando el usuario solicita un rango (1H, 1D, etc.), el Worker consume el JSON crudo de GitHub, aplica filtros de tiempo dinámicos y entrega una respuesta optimizada con cabeceras CORS.

##  Estructura del Proyecto

```text
├── .github/workflows/    # Automatización (GitHub Actions)
├── backend/
│   ├── main.py           # Script ETL (Firebase -> SQLite -> JSON)
│   ├── historico_scada.db # Base de datos relacional persistente
│   └── datos_grafica.json # Cache optimizado para el Frontend
├── firmware/             # Código C++ para ESP32 (Arduino IDE/PlatformIO)
├── worker/
│   ├── src/
│   │   ├── index.js      # API de Telemetría (Cloudflare Workers)
│   │   ├── views.js      # Frontend HMI (Dashboard con Chart.js)
│   │   └── scada.js      # Lógica de renderizado del HMI
└── docs/                 # Documentación del proyecto
```

## 🛠️ Tecnologías
*   **Hardware:** ESP32 (WiFi Stack).
*   **Backend:** Python 3.13, Pandas, SQLite3.
*   **Cloud:** Firebase (RTDB), Cloudflare Workers (Edge Runtime).
*   **DevOps:** GitHub Actions (CI/CD + Cron Jobs).
*   **Frontend:** JavaScript (ES6+), Chart.js, HTML5/CSS3 Industrial UI.

## ⚙️ Configuración de Variables de Entorno

Para el correcto funcionamiento del backend automatizado, se deben configurar los siguientes **Secrets** en GitHub:

1.  `FIREBASE_CREDENTIALS`: Contenido completo del archivo `serviceAccountKey.json`.

En el Cloudflare Worker, configurar las siguientes variables:

1.  `FIREBASE_URL`: URL de tu base de datos en Firebase.
2.  `API_KEY`: Clave de seguridad para las peticiones POST desde el ESP32.

## 🔧 Instalación Local

1.  Clona el repositorio.
2.  Crea un entorno virtual de Python:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # o .venv\Scripts\activate en Windows
    ```
3.  Instala las dependencias:
    ```bash
    pip install -r backend/requirements.txt
    ```
4.  Para ejecutar el procesador manualmente:
    ```bash
    python backend/main.py
    ```

## � Estado del Proyecto
- [x] Conexión WiFi y Firebase.
- [x] Envío de datos de 3 tanques y bomba.
- [x] Despliegue de HMI en la nube.
- [x] Automatización de histórico mediante GitHub Actions.
- [ ] Implementación de alertas por correo (En desarrollo).
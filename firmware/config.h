// config.h

// --- Credenciales de Red ---
const char* WIFI_SSID = "Tigo_AX";
const char* WIFI_PASSWORD = "AV0VSNX112";

// --- Firebase Realtime Database ---
// El HOST sin "https://" y sin "/" al final
const char* FIREBASE_HOST = "esp32-hmi-default-rtdb.firebaseio.com";

// Para el "Database Secret" (Si el modo prueba no fuera suficiente):
// Ve a Configuración del proyecto > Cuentas de servicio > Secretos de la base de datos
const char* FIREBASE_AUTH = "JKAOFzyk8rVAFK6nXeZMpunyOcYfsSZ2PwsG1eML"; 

// --- Configuración de Hardware ---
const int UPDATE_INTERVAL = 2000; // Tiempo entre envíos (2 segundos)
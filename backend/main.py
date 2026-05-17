import os
import sqlite3
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db
import pandas as pd

# CONFIGURACIÓN GENERAL
RUTA_CRED_LOCAL = "backend/serviceAccountKey.json"
# Esta URL la tomé directo de tus constantes de Arduino
URL_FIREBASE = "https://esp32-hmi-default-rtdb.firebaseio.com/" 
NOMBRE_DB = "backend/historico_scada.db"
ARCHIVO_JSON_SALIDA = "backend/datos_grafica.json"

def inicializar_firebase():
    """Inicializa la conexión con Firebase de forma segura."""
    # En local usa el archivo JSON; en GitHub Actions usará variables de entorno
    if os.path.exists(RUTA_CRED_LOCAL):
        cred = credentials.Certificate(RUTA_CRED_LOCAL)
        firebase_admin.initialize_app(cred, {'databaseURL': URL_FIREBASE})
    elif "FIREBASE_CREDENTIALS" in os.environ:
        cred_json = json.loads(os.environ["FIREBASE_CREDENTIALS"])
        cred = credentials.Certificate(cred_json)
        firebase_admin.initialize_app(cred, {'databaseURL': URL_FIREBASE})
    else:
        raise FileNotFoundError("No se encontraron las credenciales de Firebase.")

def extraer_datos_firebase():
    """Obtiene el nodo principal de telemetría de la Realtime Database."""
    ref = db.reference('/') 
    datos = ref.get()
    if not datos:
        print("⚠️ No se encontraron datos en Firebase.")
        return {}
    
    # ─── IMPRESIÓN DE DIAGNÓSTICO ──────────────────────────────────────
    print("\n🔍 ESTRUCTURA REAL DE TU FIREBASE:")
    print(json.dumps(datos, indent=2))
    print("───────────────────────────────────────────────────────────────\n")
    
    return datos

def guardar_en_sqlite(datos_actuales):
    """Filtra y guarda las variables numéricas importantes en la DB histórica."""
    conexion = sqlite3.connect(NOMBRE_DB)
    cursor = conexion.cursor()
    
    # Asegura que la tabla exista en la ubicación correcta antes de insertar
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            variable TEXT NOT NULL,
            valor REAL NOT NULL
        )
    ''')
    
    timestamp_actual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Navegamos de forma segura en la estructura real de tu Firebase: system_live -> esp32_scada_main
    nodo_scada = datos_actuales.get('system_live', {}).get('esp32_scada_main', {})

    # Mapeo exacto con tus llaves de Firebase
    # Convertimos el booleano pumpRunning a 1.0 (encendido) o 0.0 (apagado) para poder graficarlo
    bomba_booleano = nodo_scada.get('pumpRunning', None)
    bomba_valor = 1.0 if bomba_booleano is True else (0.0 if bomba_booleano is False else None)

    variables_interes = {
        'tanque1_nivel': nodo_scada.get('tank1Percent', None),
        'tanque2_nivel': nodo_scada.get('tank2Percent', None),
        'tanque3_nivel': nodo_scada.get('tank3Percent', None),
        'bomba_estado': bomba_valor
    }

    for variable, valor in variables_interes.items():
        if valor is not None:
            try:
                valor_numerico = float(valor)
                cursor.execute('''
                    INSERT INTO telemetria (timestamp, variable, valor)
                    VALUES (?, ?, ?)
                ''', (timestamp_actual, variable, valor_numerico))
            except ValueError:
                continue

    conexion.commit()
    conexion.close()
    print("💾 Datos guardados exitosamente en SQLite.")

def generar_json_optimizado():
    """Usa Pandas para estructurar los datos históricos y escupir un JSON ultraliviano."""
    conexion = sqlite3.connect(NOMBRE_DB)
    
    # Extraemos los últimos 100 registros para no sobrecargar las gráficas del frontend
    query = """
        SELECT timestamp, variable, valor 
        FROM telemetria 
        ORDER BY id DESC 
        LIMIT 400 
    """
    df = pd.read_sql_query(query, conexion)
    conexion.close()

    if df.empty:
        return

    # Invertimos el orden para que la gráfica se dibuje cronológicamente de izquierda a derecha
    df = df.iloc[::-1]

    # Pivoteamos la tabla con Pandas para transformarla en un formato JSON limpio de serie temporal
    # De: [timestamp, variable, valor] -> A: [timestamp, tanque1_nivel, tanque2_nivel...]
    df_pivoted = df.pivot(index='timestamp', columns='variable', values='valor').reset_index()
    
    # Llenamos valores nulos si la telemetría falló en algún punto
    df_pivoted = df_pivoted.ffill().bfill()

    # Convertimos el DataFrame final a un diccionario/JSON amigable para el Worker
    resultado_json = df_pivoted.to_dict(orient='records')

    with open(ARCHIVO_JSON_SALIDA, 'w') as f:
        json.dump(resultado_json, f, indent=2)
    
    print(f"📊 ¡JSON de telemetría optimizado exportado en {ARCHIVO_JSON_SALIDA}!")

def main():
    print("🚀 Iniciando proceso de procesamiento SCADA...")
    inicializar_firebase()
    datos = extraer_datos_firebase()
    if datos:
        guardar_en_sqlite(datos)
        generar_json_optimizado()

if __name__ == "__main__":
    main()
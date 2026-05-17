/**
 * Ruteador Principal (El Director de Orquesta)
 * Une los módulos de Datos, Vistas y Configuración PWA.
 */

import { consultarHistorial, guardarRegistro } from './database.js';
import { renderDashboard } from './views.js';
import { renderManifest } from './manifest.js'; // Importamos el nuevo bloque
import { handleScadaRequest } from './scada.js';

// URL del JSON generado por GitHub Actions
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/David29GT/ESP32-HMI-Firebase/refs/heads/main/backend/datos_grafica.json?token=GHSAT0AAAAAADZZC5Y5R4J4SDW7MRW5Q4YU2QKBK4Q";
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- RUTA A: MANIFIESTO (Identidad de la App) ---
    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify(renderManifest()), {
        headers: { 
          "Content-Type": "application/manifest+json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // --- RUTA B: SERVICE WORKER (Requisito de instalación) ---
    if (url.pathname === "/sw.js") {
      return new Response("self.addEventListener('fetch', () => {});", {
        headers: { "Content-Type": "application/javascript" }
      });
    }

    // --- NUEVA RUTA: API DE TELEMETRÍA (Datos procesados desde GitHub) ---
    if (request.method === "GET" && url.pathname === "/api/telemetria") {
      try {
        const rango = url.searchParams.get("rango"); // 1M, 5M, 1H, 1D, VIVO
        
        // 1. Obtener datos desde el repositorio de GitHub
        const response = await fetch(GITHUB_RAW_URL, {
          headers: { "Cache-Control": "no-cache" }
        });

        if (!response.ok) throw new Error("No se pudo obtener el archivo desde GitHub");

        let telemetria = await response.json();

        // 2. Lógica de Filtrado por Tiempo
        if (rango && rango !== "VIVO") {
          const ahora = new Date();
          let msAtras = 0;

          if (rango === "1M") msAtras = 1 * 60 * 1000;
          else if (rango === "5M") msAtras = 5 * 60 * 1000;
          else if (rango === "1H") msAtras = 60 * 60 * 1000;
          else if (rango === "1D") msAtras = 24 * 60 * 60 * 1000;

          if (msAtras > 0) {
            const limite = ahora.getTime() - msAtras;
            telemetria = telemetria.filter(item => {
              // Convertimos "YYYY-MM-DD HH:MM:SS" a formato ISO para JS
              const itemTime = new Date(item.timestamp.replace(' ', 'T')).getTime();
              return itemTime >= limite;
            });
          }
        }

        return new Response(JSON.stringify(telemetria), { headers: CORS_HEADERS });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- RUTA 1: RECIBIR DATOS DEL ESP32 ---
    if (request.method === "POST" && url.pathname === "/update") {
      try {
        // Validación simple de API Key para seguridad
        const apiKey = request.headers.get("X-API-Key");
        if (env.API_KEY && apiKey !== env.API_KEY) {
          return new Response("No autorizado", { status: 401 });
        }

        const data = await request.json();
        
        // Validar que el objeto tenga los datos necesarios
        if (data.type === "history" && data.avg !== undefined) {
          await guardarRegistro(env, data);
          return new Response("Historial guardado", { status: 201 });
        }
        return new Response("OK", { status: 200 });
      } catch (err) {
        return new Response("Error: " + err.message, { status: 400 });
      }
    }

    // --- RUTA 2: OBTENER DATOS PARA LAS GRÁFICAS ---
    if (request.method === "GET" && url.pathname === "/get-history") {
      const limit = url.searchParams.get("limit") || 10;
      const target = url.searchParams.get("target"); 

      try {
        const results = await consultarHistorial(env, limit, target);
        return new Response(JSON.stringify(results), {
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          }
        });
      } catch (err) {
        return new Response("Error DB: " + err.message, { status: 500 });
      }
    }

    // --- RUTA SCADA HMI (POR DEFECTO Y /scada) ---
    if (url.pathname === "/" || url.pathname === "/scada") {
      return await handleScadaRequest();
    }

    // --- RUTA PANEL DE CONTROL (ANTIGUA PÁGINA) ---
    // Ahora accesible explícitamente a través de /dashboard
    if (url.pathname === "/dashboard") {
    // Solo pasamos la URL de Firebase para evitar exponer la API_KEY u otros secretos
      const config = {
        FIREBASE_URL: env.FIREBASE_URL
      };
      return new Response(renderDashboard(config), { 
        headers: { "Content-Type": "text/html" } 
      });
    }

    // Fallback para cualquier otra ruta no encontrada
    return new Response("Página no encontrada", { status: 404 });
  }
};
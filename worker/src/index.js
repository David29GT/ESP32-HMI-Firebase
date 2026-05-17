/**
 * Ruteador Principal (El Director de Orquesta)
 * Une los módulos de Datos, Vistas y Configuración PWA.
 */

import { consultarHistorial, guardarRegistro } from './database.js';
import { renderDashboard } from './views.js';
import { renderManifest } from './manifest.js'; // Importamos el nuevo bloque
import { handleScadaRequest } from './scada.js';

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
/**
 * Ruteador Principal (El Director de Orquesta)
 * Une los módulos de Datos y Vistas.
 */

import { consultarHistorial, guardarRegistro } from './database.js';
import { renderDashboard } from './views.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- RUTA 1: RECIBIR DATOS DEL ESP32 ---
    if (request.method === "POST" && url.pathname === "/update") {
      try {
        const data = await request.json();
        if (data.type === "history") {
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

    // --- RUTA 3: PANEL DE CONTROL (HTML) ---
    // Si no es ninguna de las anteriores, entregamos la interfaz
    return new Response(renderDashboard(), { 
      headers: { "Content-Type": "text/html" } 
    });
  }
};
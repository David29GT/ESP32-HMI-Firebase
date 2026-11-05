/**
 * Ruteador Principal (El Director de Orquesta)
 * Une los módulos de Datos, Vistas y Configuración PWA.
 */

import { guardarLoteTelemetria, registrarAlerta, obtenerUltimaMedicion, consultarRangoD1 } from './database.js';
import { renderDashboard } from './telemetria.js';
import { renderAlarmas } from './alarmas.js';
import { renderManifest } from './manifest.js'; // Importamos el nuevo bloque
import { handleScadaRequest } from './scada.js';
import { renderScadaSvg } from './scada_svg.js';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Content-Type": "application/json"
};

// --- CONFIGURACIÓN DE LÓGICA DE NEGOCIO ---
const SETPOINTS = {
  TANK_MIN: 10,
  TANK_MAX: 95,
  TEMP_MAX: 55
};

const PROTECTED_PAGE_PATHS = new Set([
  "/",
  "/scada",
  "/tarjetas",
  "/dashboard",
  "/telemetria",
  "/proceso",
  "/alarmas"
]);

function hasValidPageCredentials(request, expectedPassword) {
  const authorization = request.headers.get("Authorization");
  const match = authorization && authorization.match(/^Basic\s+(.+)$/i);
  if (!match) return false;

  try {
    const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
    const credentials = new TextDecoder().decode(bytes);
    const separator = credentials.indexOf(":");
    return separator !== -1 &&
      credentials.slice(0, separator) === "USAC" &&
      credentials.slice(separator + 1) === expectedPassword;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const url = new URL(request.url);

      if (request.method === "GET" && PROTECTED_PAGE_PATHS.has(url.pathname)) {
        if (!env.APP_PASSWORD) {
          return new Response(JSON.stringify({ error: "Autenticación no configurada" }), {
            status: 503,
            headers: { ...CORS_HEADERS, "Cache-Control": "no-store" }
          });
        }

        if (!hasValidPageCredentials(request, env.APP_PASSWORD)) {
          return new Response("Autenticación requerida", {
            status: 401,
            headers: {
              "WWW-Authenticate": 'Basic realm="USAC HMI", charset="UTF-8"',
              "Cache-Control": "no-store",
              "Content-Type": "text/plain; charset=utf-8"
            }
          });
        }
      }

      // --- ENDPOINT: POST /api/data ---
      if (request.method === "POST" && url.pathname === "/api/data") {
        let batch = [];
        const isSim = url.searchParams.get("mode") === "sim";

        if (isSim) {
            const now = Date.now();
            for (let i = 0; i < 4; i++) {
              batch.push({
                ts: new Date(now - (3 - i) * 4000).toISOString(),
                t1: 50 + Math.random() * 5, t2: 40 + Math.random() * 5, t3: 30 + Math.random() * 5, temp: 25 + Math.random() * 2
              });
            }
        } else {
          batch = await request.json();
        }

        if (!Array.isArray(batch) || batch.length === 0) throw new Error("Batch inválido");
        const latest = batch[batch.length - 1];

        // 1. Setpoints
        const errorMsg = latest.t1 < SETPOINTS.TANK_MIN || latest.t1 > SETPOINTS.TANK_MAX ? `T1 fuera de rango` : 
                         latest.temp > SETPOINTS.TEMP_MAX ? `Temp crítica` : null;
        if (errorMsg) await registrarAlerta(env, "OUT_OF_RANGE", errorMsg);

        // 2. Lógica Delta
        const previous = await obtenerUltimaMedicion(env);
        if (previous) {
          for (const tank of ['t1', 't2', 't3']) {
            const delta = previous[tank] - latest[tank];
            if (delta > 10) await registrarAlerta(env, "SUDDEN_DROP", `Caída brusca en ${tank.toUpperCase()}`);
          }
        }

        await guardarLoteTelemetria(env, batch);

        if (env.FIREBASE_URL) {
          fetch(`${env.FIREBASE_URL}/system_live/latest_data.json`, {
            method: 'PUT', body: JSON.stringify({ ...latest, server_ts: ".sv" })
          });
        }

        return new Response(JSON.stringify({ status: "success" }), { headers: CORS_HEADERS });
      }

      // --- ENDPOINT: GET /api/data ---
      if (request.method === "GET" && url.pathname === "/api/data") {
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");
        if (!start || !end) return new Response(JSON.stringify({error: "Faltan parámetros"}), { status: 400, headers: CORS_HEADERS });

        const results = await consultarRangoD1(env, start, end);
        return new Response(JSON.stringify(results), { headers: CORS_HEADERS });
      }

      // --- RUTA: DASHBOARD ---
      if (url.pathname === "/dashboard" || url.pathname === "/telemetria") {
        return new Response(renderDashboard({ FIREBASE_URL: env.FIREBASE_URL }), { 
          headers: { "Content-Type": "text/html" } 
        });
      }

      // --- RUTA: ALARMAS ---
      if (url.pathname === "/alarmas") {
        return new Response(renderAlarmas({ FIREBASE_URL: env.FIREBASE_URL }), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // --- RUTA: DIAGRAMA DE PROCESO ---
      if (url.pathname === "/proceso") {
        return new Response(await renderScadaSvg({ FIREBASE_URL: env.FIREBASE_URL }), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // --- RUTA: SCADA ---
      if (url.pathname === "/" || url.pathname === "/scada" || url.pathname === "/tarjetas") {
        return await handleScadaRequest({ FIREBASE_URL: env.FIREBASE_URL });
      }

      // --- MANIFIESTO Y SW ---
    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify(renderManifest()), {
        headers: { "Content-Type": "application/manifest+json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (url.pathname === "/sw.js") {
      return new Response("self.addEventListener('fetch', () => {});", {
        headers: { "Content-Type": "application/javascript" }
      });
    }

    return new Response(JSON.stringify({error: "Not Found"}), { status: 404, headers: CORS_HEADERS });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: CORS_HEADERS 
      });
    }
  }
};
/**
 * Módulo de Base de Datos (Lego de Datos)
 * Aquí centralizamos todas las consultas a Cloudflare D1.
 */

export async function guardarLoteTelemetria(env, batch) {
    return await env.DB.prepare(
        "INSERT INTO telemetria (datos_json, timestamp) VALUES (?, DATETIME('now'))"
    )
    .bind(JSON.stringify(batch))
    .run();
}

export async function registrarAlerta(env, tipo, detalle) {
    return await env.DB.prepare(
        "INSERT INTO alertas (tipo, detalle, timestamp) VALUES (?, ?, DATETIME('now'))"
    )
    .bind(tipo, detalle)
    .run();
}

export async function obtenerUltimaMedicion(env) {
    // Buscamos el registro más reciente para comparar el Delta
    const { results } = await env.DB.prepare(
        "SELECT datos_json FROM telemetria ORDER BY id DESC LIMIT 1"
    ).all();
    
    if (results.length === 0) return null;
    const batch = JSON.parse(results[0].datos_json);
    return batch[batch.length - 1]; // Retornamos la última del lote previo
}

export async function consultarRangoD1(env, start, end) {
    const query = `
        SELECT * FROM telemetria 
        WHERE timestamp BETWEEN ? AND ? 
        ORDER BY timestamp ASC
    `;
    const { results } = await env.DB.prepare(query).bind(start, end).all();
    return results;
}
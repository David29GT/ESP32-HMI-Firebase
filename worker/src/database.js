/**
 * Módulo de Base de Datos (Lego de Datos)
 * Aquí centralizamos todas las consultas a Cloudflare D1.
 */

export async function consultarHistorial(env, limit, target) {
    let query, params;

    if (target) {
        // Búsqueda forense: 10 minutos alrededor del punto clickeado
        query = `SELECT * FROM historial 
                 WHERE fecha BETWEEN DATETIME(?, '-5 minutes') AND DATETIME(?, '+5 minutes') 
                 ORDER BY fecha ASC LIMIT 20`;
        params = [target, target];
    } else {
        // Vista normal: Últimos registros según el límite
        query = `SELECT * FROM historial ORDER BY id DESC LIMIT ?`;
        params = [limit];
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return results;
}

export async function guardarRegistro(env, data) {
    return await env.DB.prepare(
        "INSERT INTO historial (promedio, maximo, minimo, lecturas, fecha) VALUES (?, ?, ?, ?, DATETIME('now'))"
    )
    .bind(data.avg, data.max, data.min, JSON.stringify(data.lecturas))
    .run();
}
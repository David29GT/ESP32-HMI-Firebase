export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- RUTA 1: RECIBIR DATOS DEL ESP32 ---
    if (request.method === "POST" && url.pathname === "/update") {
      try {
        const data = await request.json();
        if (data.type === "history") {
          await env.DB.prepare(
            "INSERT INTO historial (promedio, maximo, minimo, lecturas, fecha) VALUES (?, ?, ?, ?, DATETIME('now', 'localtime'))"
          )
          .bind(data.avg, data.max, data.min, data.lecturas)
          .run();
          return new Response("Historial guardado", { status: 201 });
        }
        return new Response("OK", { status: 200 });
      } catch (err) {
        return new Response("Error: " + err.message, { status: 400 });
      }
    }

    // --- RUTA 3: OBTENER DATOS PARA LA WEB ---
    if (request.method === "GET" && url.pathname === "/get-history") {
      const limit = url.searchParams.get("limit") || 10; // Permite elegir cuántos minutos ver
      const { results } = await env.DB.prepare(
        "SELECT * FROM historial ORDER BY id DESC LIMIT ?"
      ).bind(limit).all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // --- RUTA 2: HMI ACTUALIZADA ---
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Control Nivel Agua - USAC</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
        <style>
            body { background-color: #f4f7f6; color: #333; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
            .header { width: 90%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .container { display: flex; width: 95%; gap: 20px; }
            .panel { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex: 1; }
            .btn-group { display: flex; gap: 5px; margin-bottom: 15px; }
            button { padding: 8px 12px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; font-weight: bold; }
            button:hover { background: #0056b3; }
            h2 { color: #1a237e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
            canvas { max-height: 400px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="color: #1a237e;">Control Nivel Agua - USAC</h1>
        </div>

        <div class="container">
            <div class="panel">
                <h2>Monitoreo en Tiempo Real</h2>
                <canvas id="realtimeChart"></canvas>
            </div>

            <div class="panel">
                <h2>Historial (Cloudflare D1)</h2>
                <div class="btn-group">
                    <button onclick="cargarHistorial(5)">5M</button>
                    <button onclick="cargarHistorial(10)">10M</button>
                    <button onclick="cargarHistorial(30)">30M</button>
                    <button onclick="cargarHistorial(60)">1H</button>
                </div>
                <canvas id="historyChart"></canvas>
            </div>
        </div>

        <script>
            // --- CONFIGURACIÓN FIREBASE (TIEMPO REAL) ---
            const firebaseConfig = { databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com/" };
            firebase.initializeApp(firebaseConfig);
            const dbRef = firebase.database().ref("monitoreo/sensor1");

            const ctxRT = document.getElementById('realtimeChart').getContext('2d');
            const rtChart = new Chart(ctxRT, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Nivel %', data: [], borderColor: '#2196F3', tension: 0.3, fill: true, backgroundColor: 'rgba(33, 150, 243, 0.1)' }] }
            });

            dbRef.on('value', (snapshot) => {
                const val = snapshot.val();
                const now = new Date().toLocaleTimeString();
                if (rtChart.data.labels.length > 20) { rtChart.data.labels.shift(); rtChart.data.datasets[0].data.shift(); }
                rtChart.data.labels.push(now);
                rtChart.data.datasets[0].data.push(val);
                rtChart.update();
            });

            // --- LÓGICA HISTORIAL (D1) ---
            const ctxHist = document.getElementById('historyChart').getContext('2d');
            let historyChart = new Chart(ctxHist, {
                type: 'bar', // Usaremos barras para ver los promedios por minuto
                data: { labels: [], datasets: [{ label: 'Promedio Minuto', data: [], backgroundColor: '#4CAF50' }] }
            });

            async function cargarHistorial(puntos) {
                const response = await fetch('/get-history?limit=' + puntos);
                const data = await response.json();
                
                // Limpiar y rellenar con datos nuevos
                historyChart.data.labels = data.map(r => r.fecha.split(' ')[1]).reverse();
                historyChart.data.datasets[0].data = data.map(r => r.promedio).reverse();
                historyChart.update();
            }

            // Cargar por defecto los últimos 10 min
            cargarHistorial(10);
        </script>
    </body>
    </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
};
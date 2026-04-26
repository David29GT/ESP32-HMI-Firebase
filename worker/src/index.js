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
      const limit = url.searchParams.get("limit") || 10;
      const { results } = await env.DB.prepare(
        "SELECT * FROM historial ORDER BY id DESC LIMIT ?"
      ).bind(limit).all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // --- RUTA 2: HMI ACTUALIZADA (PANEL DE CONTROL) ---
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Panel de Control - USAC</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
        <style>
            body { background-color: #f4f7f6; color: #333; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
            .header { width: 95%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 20px; }
            .container { display: flex; width: 95%; gap: 20px; flex-wrap: wrap; }
            .panel { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex: 1; min-width: 400px; }
            .btn-group { display: flex; gap: 8px; margin-bottom: 15px; }
            button { padding: 8px 16px; border: none; border-radius: 6px; background: #2196F3; color: white; cursor: pointer; font-weight: bold; transition: 0.3s; }
            button:hover { background: #1976D2; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            h2 { color: #1a237e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 0; }
            canvas { width: 100% !important; max-height: 350px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="color: #1a237e; margin: 0;">Panel de Control</h1>
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
            // Configuración común para los cursores (Tooltips)
            const commonOptions = {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return 'Nivel: ' + context.parsed.y.toFixed(2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => value + '%' } }
                }
            };

            // --- TIEMPO REAL (FIREBASE) ---
            const firebaseConfig = { databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com/" };
            firebase.initializeApp(firebaseConfig);
            const dbRef = firebase.database().ref("monitoreo/sensor1");

            const rtChart = new Chart(document.getElementById('realtimeChart'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Actual', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', fill: true, tension: 0.4 }] },
                options: commonOptions
            });

            dbRef.on('value', (snapshot) => {
                const val = snapshot.val();
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                if (rtChart.data.labels.length > 20) { rtChart.data.labels.shift(); rtChart.data.datasets[0].data.shift(); }
                rtChart.data.labels.push(now);
                rtChart.data.datasets[0].data.push(val);
                rtChart.update('none'); // Update suave
            });

            // --- HISTORIAL (D1) ---
            const histChart = new Chart(document.getElementById('historyChart'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Promedio Minuto', data: [], borderColor: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.1)', fill: true, tension: 0.3 }] },
                options: commonOptions
            });

            async function cargarHistorial(minutos) {
                try {
                    const response = await fetch('/get-history?limit=' + minutos);
                    const data = await response.json();
                    
                    // Invertimos para que el tiempo fluya de izquierda a derecha
                    histChart.data.labels = data.map(r => r.fecha.split(' ')[1]).reverse();
                    histChart.data.datasets[0].data = data.map(r => r.promedio).reverse();
                    histChart.update();
                } catch (e) { console.error(\"Error cargando historial:\", e); }
            }

            cargarHistorial(10);
        </script>
    </body>
    </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- RUTA 1: RECIBIR DATOS DEL ESP32 ---
    if (request.method === "POST" && url.pathname === "/update") {
      try {
        const data = await request.json();

        // Si el ESP32 envía un reporte de HISTORIAL (cada minuto)
        if (data.type === "history") {
          await env.DB.prepare(
            "INSERT INTO historial (promedio, maximo, minimo) VALUES (?, ?, ?)"
          )
          .bind(data.avg, data.max, data.min)
          .run();
          
          return new Response("Historial guardado en D1", { status: 201 });
        }

        // Si es un dato normal para la gráfica (Firebase se maneja desde el ESP32)
        return new Response("OK", { status: 200 });

      } catch (err) {
        return new Response("Error: " + err.message, { status: 400 });
      }
    }

    // --- RUTA 2: VER LA GRÁFICA (Tu HMI) ---
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>ESP32 HMI MONITOR</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
        <style>
            body { background-color: #121212; color: #00ff00; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; }
            h1 { text-shadow: 0 0 10px #00ff00; margin-top: 20px; }
            .chart-container { width: 80%; background: #1e1e1e; padding: 20px; border-radius: 10px; border: 1px solid #333; margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>ESP32 HMI MONITOR</h1>
        <div class="chart-container">
            <canvas id="realtimeChart"></canvas>
        </div>

        <script>
            // Configuración de tu Firebase
            const firebaseConfig = { databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com/" };
            firebase.initializeApp(firebaseConfig);
            const dbRef = firebase.database().ref("monitoreo/sensor1");

            const ctx = document.getElementById('realtimeChart').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Sensor 1 (Tiempo Real)',
                        data: [],
                        borderColor: '#00ff00',
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 4,
                        fill: true
                    }]
                },
                options: {
                    scales: {
                        x: { grid: { color: '#333' }, ticks: { color: '#00ff00' } },
                        y: { grid: { color: '#333' }, ticks: { color: '#00ff00' }, beginAtZero: true }
                    },
                    plugins: { legend: { labels: { color: '#00ff00' } } }
                }
            });

            // Escuchar cambios en tiempo real
            dbRef.on('value', (snapshot) => {
                const val = snapshot.val();
                const now = new Date().toLocaleTimeString();
                
                if (chart.data.labels.length > 15) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }

                chart.data.labels.push(now);
                chart.data.datasets[0].data.push(val);
                chart.update();
            });
        </script>
    </body>
    </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
};
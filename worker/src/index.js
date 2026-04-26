export default {
  async fetch(request, env, ctx) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <title>ESP32 HMI Real-Time</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
      <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
      <style>
        body { background: #121212; color: #00ff00; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; }
        .chart-container { width: 80%; margin-top: 20px; border: 1px solid #333; padding: 20px; border-radius: 10px; background: #1a1a1a; }
        h1 { text-shadow: 0 0 10px #00ff00; }
      </style>
    </head>
    <body>
      <h1>ESP32 HMI MONITOR</h1>
      <div class="chart-container">
        <canvas id="liveChart"></canvas>
      </div>

      <script>
        // Configuración de tu Firebase
        const firebaseConfig = {
          databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // Configuración de la Gráfica (Chart.js)
        const ctx = document.getElementById('liveChart').getContext('2d');
        const liveChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sensor 1 (Tiempo Real)',
                    data: [],
                    borderColor: '#00ff00',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(0, 255, 0, 0.1)'
                }]
            },
            options: {
                scales: {
                    x: { ticks: { color: '#00ff00' } },
                    y: { ticks: { color: '#00ff00' }, beginAtZero: true }
                }
            }
        });

        // Escuchar cambios en Firebase
        db.ref('monitoreo/sensor1').on('value', (snapshot) => {
            const val = snapshot.val();
            const time = new Date().toLocaleTimeString();
            
            // Agregar nuevo dato
            liveChart.data.labels.push(time);
            liveChart.data.datasets[0].data.push(val);

            // Mantener solo los últimos 15 puntos para que no se sature
            if(liveChart.data.labels.length > 15) {
                liveChart.data.labels.shift();
                liveChart.data.datasets[0].data.shift();
            }
            liveChart.update();
        });
      </script>
    </body>
    </html>`;

    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  },
};
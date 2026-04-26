export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- RUTA 1: RECIBIR DATOS DEL ESP32 ---
    if (request.method === "POST" && url.pathname === "/update") {
      try {
        const data = await request.json();
        if (data.type === "history") {
          await env.DB.prepare(
            "INSERT INTO historial (promedio, maximo, minimo, lecturas, fecha) VALUES (?, ?, ?, ?, DATETIME('now', '-6 hours'))"
          )
          .bind(data.avg, data.max, data.min, JSON.stringify(data.lecturas))
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

    // --- RUTA 2: PANEL DE CONTROL ---
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
            body { background-color: #f4f7f6; color: #333; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
            .header { width: 95%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .container { display: flex; width: 95%; gap: 20px; flex-wrap: wrap; }
            .panel { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex: 1; min-width: 450px; position: relative; }
            
            .nivel-badge { background: #1a237e; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; }
            .nivel-label { font-size: 12px; display: block; opacity: 0.8; }

            .btn-group { display: flex; gap: 4px; margin-bottom: 15px; flex-wrap: wrap; }
            button { padding: 5px 10px; border: none; border-radius: 4px; background: #2196F3; color: white; cursor: pointer; font-weight: bold; font-size: 10px; transition: 0.2s; }
            button.btn-alt { background: #ff9800; }
            button:hover { filter: brightness(0.85); }
            h2 { color: #1a237e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="color: #1a237e; margin: 0;">Panel de Control</h1>
            <div class="nivel-badge">
                <span class="nivel-label">NIVEL ACTUAL</span>
                <span id="txt-actual">0.0%</span>
            </div>
        </div>

        <div class="container">
            <div class="panel">
                <h2>Tiempo Real</h2>
                <canvas id="realtimeChart"></canvas>
            </div>

            <div class="panel">
                <h2>Historial (Cloudflare D1)</h2>
                <div class="btn-group">
                    <button onclick="cargarHistorial(1)">1M</button>
                    <button onclick="cargarHistorial(3)">3M</button>
                    <button onclick="cargarHistorial(5)">5M</button>
                    <button onclick="cargarHistorial(10)">10M</button>
                    <button onclick="cargarHistorial(15)">15M</button>
                    <button onclick="cargarHistorial(30)">30M</button>
                    <button onclick="cargarHistorial(60)">1H</button>
                    <button onclick="cargarHistorial(120)">2H</button>
                    <button onclick="cargarHistorial(180)">3H</button>
                    <button onclick="cargarHistorial(300)">5H</button>
                    <button onclick="cargarHistorial(480)">8H</button>
                    <button onclick="cargarHistorial(1440)">1D</button>
                    <button onclick="cargarHistorial(2880)">2D</button>
                    <button onclick="cargarHistorial(4320)">3D</button>
                    <button onclick="cargarHistorial(43200)">1MES</button>
                </div>
                <canvas id="historyChart"></canvas>
            </div>
        </div>

        <script>
            const commonOptions = {
                responsive: true,
                plugins: { tooltip: { mode: 'index', intersect: false } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
            };

            // --- FIREBASE ---
            const firebaseConfig = { databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com/" };
            firebase.initializeApp(firebaseConfig);
            const dbRef = firebase.database().ref("monitoreo/sensor1");

            const rtChart = new Chart(document.getElementById('realtimeChart'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Nivel %', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', fill: true, tension: 0.4 }] },
                options: commonOptions
            });

            dbRef.on('value', (snapshot) => {
                const val = snapshot.val();
                const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
                document.getElementById('txt-actual').innerText = val.toFixed(1) + '%';
                if (rtChart.data.labels.length > 20) { rtChart.data.labels.shift(); rtChart.data.datasets[0].data.shift(); }
                rtChart.data.labels.push(now);
                rtChart.data.datasets[0].data.push(val);
                rtChart.update('none');
            });

            // --- HISTORIAL ---
            const histChart = new Chart(document.getElementById('historyChart'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Cargando...', data: [], borderColor: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.1)', fill: true, tension: 0.1 }] },
                options: commonOptions
            });

            async function cargarHistorial(limit) {
                const response = await fetch('/get-history?limit=' + limit);
                const dataRaw = await response.json();
                const data = dataRaw.reverse(); // Ordenamos cronológicamente

                if (limit <= 5) {
                    // MODO ALTA RESOLUCIÓN: Expandir los arrays de 30 lecturas
                    let labelsFull = [];
                    let dataFull = [];
                    
                    data.forEach((entry) => {
                        const lecturas = JSON.parse(entry.lecturas);
                        const horaBase = entry.fecha.split(' ')[1]; // Extrae HH:mm:ss
                        
                        lecturas.forEach((valor, i) => {
                            // Solo mostramos la hora en el primer punto de cada minuto para no saturar el eje X
                            labelsFull.push(i === 0 ? horaBase : ""); 
                            dataFull.push(valor);
                        });
                    });

                    histChart.data.labels = labelsFull;
                    histChart.data.datasets[0].data = dataFull;
                    histChart.data.datasets[0].label = 'Señal Real (Alta Res - ' + limit + ' min)';
                } else {
                    // MODO TENDENCIA: Usar promedios para rangos largos
                    histChart.data.labels = data.map(r => {
                        const partes = r.fecha.split(' '); 
                        return limit > 1440 ? r.fecha : partes[1];
                    });
                    histChart.data.datasets[0].data = data.map(r => r.promedio);
                    histChart.data.datasets[0].label = 'Tendencia (Promedio por Minuto)';
                }
                
                histChart.update();
            }

            cargarHistorial(10);
        </script>
    </body>
    </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
};
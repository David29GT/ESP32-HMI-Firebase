/**
 * Módulo de Interfaz (Lego de Vista)
 * Contiene el HTML, CSS y el JavaScript que corre en el navegador.
 */

export const renderDashboard = () => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel de Control - USAC</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <style>
        body { 
            background-color: #f4f7f6; 
            color: #333; 
            font-family: 'Segoe UI', sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 10px; 
            margin: 0;
            width: 100%;
            box-sizing: border-box;
        }
        .header { 
            width: 100%; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px; 
            padding: 0 5px;
            box-sizing: border-box;
        }
        .container { 
            display: flex; 
            width: 100%; 
            gap: 15px; 
            flex-direction: column; 
        }
        .panel { 
            background: white; 
            padding: 15px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            width: 100%; 
            box-sizing: border-box;
            min-width: 0; 
        }
        .nivel-badge { 
            background: #1a237e; 
            color: #fff; 
            padding: 8px 15px; 
            border-radius: 8px; 
            font-size: 20px; 
            font-weight: bold; 
            text-align: center; 
        }
        .nivel-label { font-size: 10px; display: block; opacity: 0.8; }
        .btn-group { display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap; }
        .info-msg { font-size: 11px; color: #1a237e; margin-bottom: 10px; background: #e8eaf6; padding: 8px; border-radius: 4px; border-left: 4px solid #1a237e; }
        
        button { 
            flex: 1;
            min-width: 60px;
            padding: 10px 5px; 
            border: none; 
            border-radius: 4px; 
            background: #2196F3; 
            color: white; 
            cursor: pointer; 
            font-weight: bold; 
            font-size: 11px; 
        }
        button.active { background: #1a237e; }
        h2 { color: #1a237e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 0; font-size: 1.2rem; }
        
        canvas {
            width: 100% !important;
            max-height: 300px;
        }

        @media (min-width: 900px) {
            .container { flex-direction: row; }
            body { padding: 20px; }
            .header { width: 95%; }
            .container { width: 95%; }
        }
    </style>

    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1a237e">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/3565/3565407.png">
</head>
<body>
    <div class="header">
        <h1 style="color: #1a237e; margin: 0; font-size: 1.5rem;">Panel de Control</h1>
        <div class="nivel-badge"><span class="nivel-label">NIVEL ACTUAL</span><span id="txt-actual">0.0%</span></div>
    </div>

    <div class="container">
        <div class="panel">
            <h2>Tiempo Real</h2>
            <canvas id="realtimeChart"></canvas>
        </div>

        <div class="panel">
            <h2>Historial (Cloudflare D1)</h2>
            <div id="status-msg" class="info-msg">🔍 Haz clic para ver detalle | Doble clic para resetear</div>
            <div class="btn-group">
                <button onclick="cargarHistorial(1, this)">1M</button>
                <button onclick="cargarHistorial(5, this)">5M</button>
                <button onclick="cargarHistorial(60, this)">1H</button>
                <button onclick="cargarHistorial(1440, this)">1D</button>
                <button onclick="cargarHistorial(43200, this)">1MES</button>
                <button style="background:#ff9800" onclick="resetView(this)">RESETEAR</button>
            </div>
            <canvas id="historyChart"></canvas>
        </div>
    </div>

    <script>
        let currentMode = 'trend';
        let rawDataFromDB = [];

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { mode: 'index', intersect: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        };

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
            document.getElementById('txt-actual').innerText = val.toFixed(1) + '%';
            const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
            if (rtChart.data.labels.length > 20) { rtChart.data.labels.shift(); rtChart.data.datasets[0].data.shift(); }
            rtChart.data.labels.push(now);
            rtChart.data.datasets[0].data.push(val);
            rtChart.update('none');
        });

        const ctxHist = document.getElementById('historyChart');
        const histChart = new Chart(ctxHist, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Cargando...', data: [], borderColor: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.1)', fill: true, tension: 0.1 }] },
            options: {
                ...commonOptions,
                onClick: (e, el) => {
                    if (el.length > 0 && currentMode === 'trend') {
                        const index = el[0].index;
                        cargarHistorial(null, null, rawDataFromDB[index].fecha);
                    }
                }
            }
        });

        ctxHist.addEventListener('dblclick', () => resetView());

        async function cargarHistorial(limit, btn, targetDate = null) {
            document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');

            let url = '/get-history?';
            if (targetDate) {
                url += 'target=' + encodeURIComponent(targetDate);
                currentMode = 'zoom';
                document.getElementById('status-msg').innerText = "📍 Modo Detalle (Zoom). Doble clic para volver.";
            } else {
                url += 'limit=' + limit;
                currentMode = limit <= 5 ? 'zoom' : 'trend';
                document.getElementById('status-msg').innerText = "🔍 Haz clic para ver detalle | Doble clic para resetear";
            }

            try {
                const response = await fetch(url);
                const data = await response.json();
                rawDataFromDB = targetDate ? data : [...data].reverse();
                
                if (currentMode === 'zoom') {
                    let labelsFull = [];
                    let dataFull = [];
                    rawDataFromDB.forEach((entry) => {
                        try {
                            const lecturas = entry.lecturas ? JSON.parse(entry.lecturas) : [entry.promedio];
                            const hora = entry.fecha.split(' ')[1];
                            lecturas.forEach((valor, i) => {
                                labelsFull.push(i === 0 ? hora : ""); 
                                dataFull.push(valor);
                            });
                        } catch(e) {
                            labelsFull.push(entry.fecha.split(' ')[1]);
                            dataFull.push(entry.promedio);
                        }
                    });
                    histChart.data.labels = labelsFull;
                    histChart.data.datasets[0].data = dataFull;
                    histChart.data.datasets[0].label = targetDate ? 'Detalle Forense: ' + targetDate : 'Señal Cruda';
                } else {
                    histChart.data.labels = rawDataFromDB.map(r => limit > 1440 ? r.fecha : r.fecha.split(' ')[1]);
                    histChart.data.datasets[0].data = rawDataFromDB.map(r => r.promedio);
                    histChart.data.datasets[0].label = 'Tendencia (Promedios)';
                }
                histChart.update();
            } catch(err) {
                console.error("Error cargando datos:", err);
            }
        }

        function resetView(btn) {
            cargarHistorial(10, btn || document.querySelector('.btn-group button:nth-child(4)'));
        }

        cargarHistorial(10);
    </script>
</body>
</html>
`;
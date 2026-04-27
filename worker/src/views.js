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
        }
        /* Clase especial para que la bomba ocupe todo el ancho abajo */
        .panel-full {
            width: 100%;
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
        
        .bomba-container {
            position: relative;
            width: 100%;
            max-width: 400px; /* Un poco más grande ahora que está abajo */
            margin: 10px auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            background: #fff;
        }
        .bomba-img {
            width: 100%;
            display: block;
            height: auto;
        }
        .bomba-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            width: calc(100% - 20px);
            height: calc(100% - 20px);
            mix-blend-mode: overlay;
            opacity: 0;
            transition: all 0.5s ease;
            pointer-events: none;
            border-radius: 4px;
        }

        .simulador-box {
            background: #fff3e0;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px dashed #ff9800;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        canvas {
            width: 100% !important;
            max-height: 250px;
        }

        @media (min-width: 900px) {
            .container { 
                display: grid;
                grid-template-columns: 1fr 1fr; /* Dos columnas para las gráficas */
                width: 95%;
            }
            .panel-full {
                grid-column: span 2; /* La bomba ocupa las dos columnas */
            }
            body { padding: 20px; }
            .header { width: 95%; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: #1a237e; margin: 0; font-size: 1.5rem;">Panel de Control - USAC</h1>
        <div class="nivel-badge"><span class="nivel-label">NIVEL ACTUAL</span><span id="txt-actual">0.0%</span></div>
    </div>

    <div class="container">
        <div class="panel">
            <h2>Tiempo Real</h2>
            <canvas id="realtimeChart"></canvas>
        </div>

        <div class="panel">
            <h2>Historial (Cloudflare D1)</h2>
            <div id="status-msg" class="info-msg">🔍 Haz clic para ver detalle</div>
            <div class="btn-group">
                <button onclick="cargarHistorial(1, this)">1M</button>
                <button onclick="cargarHistorial(60, this)">1H</button>
                <button onclick="cargarHistorial(1440, this)">1D</button>
                <button style="background:#ff9800" onclick="resetView(this)">RESETEAR</button>
            </div>
            <canvas id="historyChart"></canvas>
        </div>

        <div class="panel panel-full">
            <h2>Estado de Activos e Instrumentación</h2>
            
            <div class="simulador-box">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <label style="font-size: 12px; font-weight: bold; color: #e65100;">🛠️ MODO PRUEBA (Simulación Manual):</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                         <input type="checkbox" id="check-manual"> <span style="font-size: 12px;">Activar</span>
                    </div>
                </div>
                <input type="range" id="simulador-nivel" min="0" max="100" value="0" style="width: 100%;">
            </div>

            <div class="bomba-container">
                <img src="https://res.cloudinary.com/drov8gutj/image/upload/v1777261467/HeavyDutyPlasticCentrifugalPump_pmvqm8.svg" class="bomba-img">
                <div id="bomba-status-overlay" class="bomba-overlay"></div>
            </div>
            <div id="bomba-label" style="text-align:center; font-weight:bold; color:#666; font-size: 1.1rem; margin-top: 10px;">ESTADO: APAGADO</div>
        </div>
    </div>

    <script>
        const overlay = document.getElementById('bomba-status-overlay');
        const label = document.getElementById('bomba-label');
        const txtActual = document.getElementById('txt-actual');
        const slider = document.getElementById('simulador-nivel');
        const checkManual = document.getElementById('check-manual');

        function actualizarHMI(val) {
            const num = parseFloat(val);
            txtActual.innerText = num.toFixed(1) + '%';
            
            if (num > 80) {
                overlay.style.opacity = "1";
                overlay.style.backgroundColor = "#F44336"; 
                label.innerText = "ESTADO: EMERGENCIA / ALTO NIVEL";
                label.style.color = "#F44336";
            } else if (num > 20) {
                overlay.style.opacity = "1";
                overlay.style.backgroundColor = "#4CAF50"; 
                label.innerText = "ESTADO: BOMBA ACTIVA";
                label.style.color = "#4CAF50";
            } else {
                overlay.style.opacity = "0";
                label.innerText = "ESTADO: APAGADO / NIVEL BAJO";
                label.style.color = "#666";
            }
        }

        const firebaseConfig = { databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com/" };
        firebase.initializeApp(firebaseConfig);
        const dbRef = firebase.database().ref("monitoreo/sensor1");

        const rtChart = new Chart(document.getElementById('realtimeChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Nivel %', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
        });

        dbRef.on('value', (snapshot) => {
            if (!checkManual.checked) {
                const val = snapshot.val() || 0;
                actualizarHMI(val);
                
                const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
                if (rtChart.data.labels.length > 20) { rtChart.data.labels.shift(); rtChart.data.datasets[0].data.shift(); }
                rtChart.data.labels.push(now);
                rtChart.data.datasets[0].data.push(val);
                rtChart.update('none');
            }
        });

        slider.addEventListener('input', (e) => {
            if (checkManual.checked) {
                actualizarHMI(e.target.value);
            }
        });

        async function cargarHistorial(limit, btn) { console.log("Carga D1..."); }
        function resetView(btn) { cargarHistorial(10, btn); }
        cargarHistorial(10);
    </script>
</body>
</html>
`;
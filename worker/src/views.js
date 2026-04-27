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
        .panel-full { width: 100%; }
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
        
        /* Layout de Activos (Bomba y Tanque) */
        .assets-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: flex-end;
            gap: 30px;
            margin: 20px 0;
        }

        /* Estilos del Tanque */
        .tanque-container {
            width: 120px;
            height: 180px;
            border: 4px solid #444;
            border-radius: 10px 10px 5px 5px;
            position: relative;
            background: #eee;
            overflow: hidden;
            box-shadow: inset 5px 0 10px rgba(0,0,0,0.1);
        }
        .agua {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 0%; /* Controlado por JS */
            background: linear-gradient(to top, #0288d1, #29b6f6);
            transition: height 0.5s ease-in-out;
            display: flex;
            justify-content: center;
        }
        /* Efecto de olas/brillo en el agua */
        .agua::after {
            content: "";
            position: absolute;
            top: 0;
            width: 100%;
            height: 5px;
            background: rgba(255,255,255,0.4);
        }

        /* Estilos de la Bomba */
        .bomba-container {
            position: relative;
            width: 220px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            background: #fff;
        }
        .bomba-img { width: 100%; display: block; height: auto; }
        .bomba-overlay {
            position: absolute;
            top: 10px; left: 10px;
            width: calc(100% - 20px);
            height: calc(100% - 20px);
            mix-blend-mode: overlay;
            opacity: 0;
            transition: all 0.5s ease;
            pointer-events: none;
        }

        .simulador-box {
            background: #fff3e0;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px dashed #ff9800;
            max-width: 600px;
            margin-left: auto; margin-right: auto;
        }

        canvas { width: 100% !important; max-height: 250px; }

        @media (min-width: 900px) {
            .container { display: grid; grid-template-columns: 1fr 1fr; width: 95%; }
            .panel-full { grid-column: span 2; }
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
            <canvas id="historyChart"></canvas>
        </div>

        <div class="panel panel-full">
            <h2>Instrumentación de Planta</h2>
            
            <div class="simulador-box">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <label style="font-size: 12px; font-weight: bold; color: #e65100;">🛠️ MODO SIMULACIÓN:</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                         <input type="checkbox" id="check-manual"> <span style="font-size: 12px;">Activar Manual</span>
                    </div>
                </div>
                <input type="range" id="simulador-nivel" min="0" max="100" value="0" style="width: 100%;">
            </div>

            <div class="assets-grid">
                <div style="text-align: center;">
                    <div class="tanque-container">
                        <div id="agua-nivel" class="agua"></div>
                    </div>
                    <p style="font-size: 12px; font-weight: bold; color: #555;">TANQUE A-1</p>
                </div>

                <div style="text-align: center;">
                    <div class="bomba-container">
                        <img src="https://res.cloudinary.com/drov8gutj/image/upload/v1777261467/HeavyDutyPlasticCentrifugalPump_pmvqm8.svg" class="bomba-img">
                        <div id="bomba-status-overlay" class="bomba-overlay"></div>
                    </div>
                    <p id="bomba-label" style="font-size: 12px; font-weight: bold; color: #666;">ESTADO: APAGADO</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        const agua = document.getElementById('agua-nivel');
        const overlay = document.getElementById('bomba-status-overlay');
        const label = document.getElementById('bomba-label');
        const txtActual = document.getElementById('txt-actual');
        const slider = document.getElementById('simulador-nivel');
        const checkManual = document.getElementById('check-manual');

        function actualizarHMI(val) {
            const num = parseFloat(val);
            txtActual.innerText = num.toFixed(1) + '%';
            
            // Actualizar Tanque
            agua.style.height = num + '%';
            
            // Actualizar Bomba
            if (num > 80) {
                overlay.style.opacity = "1";
                overlay.style.backgroundColor = "#F44336"; 
                label.innerText = "ESTADO: EMERGENCIA";
                label.style.color = "#F44336";
            } else if (num > 5) {
                overlay.style.opacity = "1";
                overlay.style.backgroundColor = "#4CAF50"; 
                label.innerText = "ESTADO: BOMBA ACTIVA";
                label.style.color = "#4CAF50";
            } else {
                overlay.style.opacity = "0";
                label.innerText = "ESTADO: APAGADO";
                label.style.color = "#666";
            }
        }

        // Firebase Config
        const firebaseConfig = { databaseURL: "https://esp32-hmi-default-rtdb.firebaseio.com/" };
        firebase.initializeApp(firebaseConfig);
        const dbRef = firebase.database().ref("monitoreo/sensor1");

        // Chart Config
        const rtChart = new Chart(document.getElementById('realtimeChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Nivel %', data: [], borderColor: '#2196F3', fill: true, tension: 0.4 }] },
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
            if (checkManual.checked) actualizarHMI(e.target.value);
        });

        async function cargarHistorial(limit) { console.log("Cargando..."); }
        cargarHistorial(10);
    </script>
</body>
</html>
`;
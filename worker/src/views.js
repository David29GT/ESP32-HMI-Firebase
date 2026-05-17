/**
 * Módulo de Interfaz (Lego de Vista)
 * Contiene el HTML, CSS y el JavaScript que corre en el navegador.
 */

export const renderDashboard = (config) => `
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
        .nav-bar {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            margin-bottom: 20px;
            width: 100%;
            max-width: 900px;
        }
        .nav-bar a {
            text-decoration: none;
            color: #1a237e;
            font-weight: bold;
            padding: 8px 16px;
            background: #e8eaf6;
            border-radius: 20px;
            font-size: 14px;
            transition: 0.3s;
        }
        .nav-bar a:hover { background: #c5cae9; }
        .nav-bar a.active { background: #1a237e; color: white; }
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
        
        /* --- ESTILOS DE ACTIVOS --- */
        .assets-wrapper {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: flex-end;
            gap: 40px;
            margin: 20px 0;
        }
        .tanque-container {
            width: 100px;
            height: 160px;
            border: 3px solid #333;
            border-radius: 8px 8px 4px 4px;
            position: relative;
            background: #f0f0f0;
            overflow: hidden;
            box-shadow: inset 4px 0 8px rgba(0,0,0,0.05);
        }
        .agua {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 0%;
            background: linear-gradient(to top, #1976D2, #64B5F6);
            transition: height 0.4s ease;
        }
        .bomba-container {
            position: relative;
            width: 200px;
            padding: 10px;
            border: 1px solid #eee;
            border-radius: 8px;
        }
        .bomba-img { width: 100%; display: block; }
        .bomba-overlay {
            position: absolute;
            top: 10px; left: 10px;
            width: calc(100% - 20px);
            height: calc(100% - 20px);
            mix-blend-mode: overlay;
            opacity: 0;
            transition: all 0.4s ease;
            pointer-events: none;
        }
        .simulador-box {
            background: #fff3e0;
            padding: 15px;
            border-radius: 8px;
            border: 1px dashed #ff9800;
            margin-bottom: 20px;
            max-width: 600px;
            margin-left: auto; margin-right: auto;
        }

        canvas { width: 100% !important; max-height: 280px; }

        @media (min-width: 900px) {
            .container { display: grid; grid-template-columns: 1fr 1fr; width: 95%; }
            .panel-full { grid-column: span 2; }
            body { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="nav-bar">
        <a href="/dashboard" class="active">📊 Dashboard</a>
        <a href="/">🏭 SCADA HMI</a>
    </div>

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

        <div class="panel panel-full">
            <h2>Monitoreo de Activos</h2>
            
            <div class="simulador-box">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label style="font-size: 12px; font-weight: bold; color: #e65100;">🛠️ SIMULACIÓN MANUAL:</label>
                    <input type="checkbox" id="check-manual">
                </div>
                <input type="range" id="simulador-nivel" min="0" max="100" value="0" style="width: 100%;">
            </div>

            <div class="assets-wrapper">
                <div style="text-align:center">
                    <div class="tanque-container"><div id="agua-nivel" class="agua"></div></div>
                    <p style="font-size:11px; font-weight:bold; color:#555; margin-top:5px">TANQUE NIVEL</p>
                </div>
                <div style="text-align:center">
                    <div class="bomba-container">
                        <img src="https://res.cloudinary.com/drov8gutj/image/upload/v1777261467/HeavyDutyPlasticCentrifugalPump_pmvqm8.svg" class="bomba-img">
                        <div id="bomba-status-overlay" class="bomba-overlay"></div>
                    </div>
                    <p id="bomba-label" style="font-size:11px; font-weight:bold; color:#666; margin-top:5px">ESTADO: APAGADO</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // --- VARIABLES Y CONFIG ---
        let currentMode = 'trend';
        let rawDataFromDB = [];
        const overlay = document.getElementById('bomba-status-overlay');
        const agua = document.getElementById('agua-nivel');
        const label = document.getElementById('bomba-label');
        const slider = document.getElementById('simulador-nivel');
        const checkManual = document.getElementById('check-manual');

        // Paleta de 10 colores según nivel
        const escalaColores = [
            "#BDBDBD", "#90CAF9", "#64B5F6", "#42A5F5", "#2196F3", 
            "#4CAF50", "#8BC34A", "#FFC107", "#FF9800", "#F44336"
        ];

        function actualizarHMI(val) {
            const num = parseFloat(val);
            document.getElementById('txt-actual').innerText = num.toFixed(1) + '%';
            agua.style.height = num + '%';

            // Lógica de colores (10 niveles)
            let colorIdx = Math.min(Math.floor(num / 10), 9);
            overlay.style.backgroundColor = escalaColores[colorIdx];
            overlay.style.opacity = num > 2 ? "1" : "0";

            if(num > 90) { label.innerText = "ALERTA: CRÍTICO"; label.style.color = "#F44336"; }
            else if(num > 10) { label.innerText = "ESTADO: OPERANDO"; label.style.color = "#4CAF50"; }
            else { label.innerText = "ESTADO: APAGADO"; label.style.color = "#666"; }
        }

        // --- CHARTS ---
        const commonOptions = {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        };

        const rtChart = new Chart(document.getElementById('realtimeChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Nivel %', data: [], borderColor: '#2196F3', fill: true, tension: 0.4 }] },
            options: commonOptions
        });

        const ctxHist = document.getElementById('historyChart');
        const histChart = new Chart(ctxHist, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Historial', data: [], borderColor: '#4CAF50', fill: true }] },
            options: { ...commonOptions, onClick: (e, el) => {
                if (el.length > 0 && currentMode === 'trend') {
                    const labelValue = histChart.data.labels[el[0].index];
                    const original = rawDataFromDB.find(r => r.fecha.includes(labelValue));
                    if(original) cargarHistorial(null, null, original.fecha);
                }
            }}
        });

        // --- FIREBASE ---
        const firebaseConfig = { databaseURL: "${config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/'}" };
        firebase.initializeApp(firebaseConfig);
        const dbRef = firebase.database().ref("monitoreo/sensor1");

        dbRef.on('value', (snapshot) => {
            if(!checkManual.checked) {
                const val = snapshot.val() || 0;
                actualizarHMI(val);
                const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
                if (rtChart.data.labels.length > 20) { rtChart.data.labels.shift(); rtChart.data.datasets[0].data.shift(); }
                rtChart.data.labels.push(now); rtChart.data.datasets[0].data.push(val);
                rtChart.update('none');
            }
        });

        slider.addEventListener('input', (e) => {
            if(checkManual.checked) actualizarHMI(e.target.value);
        });

        // --- LÓGICA DE HISTORIAL D1 ---
        async function cargarHistorial(limit, btn, targetDate = null) {
            document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active'); 
            
            const statusMsg = document.getElementById('status-msg');
            const originalMsg = targetDate ? "📍 Modo Detalle. Doble clic para volver." : "🔍 Clic para detalle | Doble clic reset";
            statusMsg.innerText = "⏳ Cargando datos...";

            let url = targetDate ? '/get-history?target=' + encodeURIComponent(targetDate) : '/get-history?limit=' + limit;
            currentMode = (targetDate || limit <= 5) ? 'zoom' : 'trend';

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Error en servidor");
                const data = await response.json();
                rawDataFromDB = targetDate ? data : [...data].reverse();
                
                let labelsFinales = [], datosFinales = [];
                const UMBRAL = 3; 

                if (currentMode === 'zoom') {
                    rawDataFromDB.forEach(entry => {
                        const lecturas = entry.lecturas ? JSON.parse(entry.lecturas) : [entry.promedio];
                        // Tratamos la fecha como UTC y convertimos a local
                        const fechaLocal = new Date(entry.fecha.replace(' ','T') + 'Z');
                        const hora = fechaLocal.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        lecturas.forEach((v, i) => { labelsFinales.push(i === 0 ? hora : ""); datosFinales.push(v); });
                    });
                } else {
                    for (let i = 0; i < rawDataFromDB.length; i++) {
                        const actual = rawDataFromDB[i];
                        const fechaActualLocal = new Date(actual.fecha.replace(' ','T') + 'Z');
                        
                        if (i > 0) {
                            const fechaPreviaLocal = new Date(rawDataFromDB[i-1].fecha.replace(' ','T') + 'Z');
                            const diff = (fechaActualLocal - fechaPreviaLocal) / 60000;
                            if (diff > UMBRAL) { labelsFinales.push(""); datosFinales.push(0); }
                        }
                        
                        const labelStr = limit > 1440 
                            ? fechaActualLocal.toLocaleDateString() 
                            : fechaActualLocal.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                            
                        labelsFinales.push(labelStr);
                        datosFinales.push(actual.promedio);
                    }
                }
                histChart.data.labels = labelsFinales;
                histChart.data.datasets[0].data = datosFinales;
                histChart.update();
                statusMsg.innerText = originalMsg;
            } catch(e) { 
                console.error(e);
                statusMsg.innerText = "❌ Error al cargar datos del historial";
            }
        }

        ctxHist.addEventListener('dblclick', () => resetView());
        function resetView() { cargarHistorial(60, document.querySelector('.btn-group button:nth-child(3)')); }

        cargarHistorial(60);
    </script>
</body>
</html>
`;
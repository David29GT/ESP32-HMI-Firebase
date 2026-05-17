/**
 * Módulo de Interfaz (Lego de Vista)
 * Contiene el HTML, CSS y el JavaScript que corre en el navegador.
 */

export const renderDashboard = (config) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Telemetría - USAC</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <style>
        body { 
            background-color: #f1f5f9; 
            color: #1e293b; 
            font-family: 'Segoe UI', sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 20px; 
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
            max-width: 900px;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px; 
            padding: 0 5px;
            box-sizing: border-box;
        }
        .container { 
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            width: 100%; 
            max-width: 900px;
            gap: 15px; 
        }
        .panel { 
            grid-column: span 2;
            background: white; 
            padding: 15px; 
            border-radius: 12px; 
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
            width: 100%; 
            box-sizing: border-box;
            min-width: 0; 
        }
        .nivel-badge { 
            background: #1a237e; 
            color: #fff; 
            padding: 4px 10px; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: bold; 
            text-align: center; 
        }
        .nivel-label { font-size: 10px; display: block; opacity: 0.8; }
        .btn-group { display: flex; gap: 4px; margin: 10px 0; flex-wrap: wrap; }
        .info-msg { font-size: 10px; color: #1a237e; margin-bottom: 5px; opacity: 0.7; }
        
        button { 
            flex: 1;
            padding: 6px 2px; 
            border: none; 
            border-radius: 4px; 
            background: #2196F3; 
            color: white; 
            cursor: pointer; 
            font-size: 11px; 
        }
        button.active { background: #1a237e; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        h2 { color: #1a237e; margin: 0; font-size: 1rem; }
        canvas { width: 100% !important; max-height: 280px; }
    </style>
</head>
<body>
    <div class="nav-bar">
        <a href="/">🏭 SCADA HMI</a>
        <a href="/dashboard" class="active">📊 Telemetría</a>
    </div>

    <div class="header">
        <h1 style="color: #1a237e; margin: 0; font-size: 1.5rem;">Panel de Control de Telemetría</h1>
        <div style="display: flex; gap: 10px;">
            <div class="nivel-badge"><span class="nivel-label">TANQUE 1</span><span id="txt-actual-1">0.0%</span></div>
            <div class="nivel-badge"><span class="nivel-label">TANQUE 2</span><span id="txt-actual-2">0.0%</span></div>
            <div class="nivel-badge"><span class="nivel-label">TANQUE 3</span><span id="txt-actual-3">0.0%</span></div>
        </div>
    </div>

    <div class="container">
        ${[1, 2, 3].map(id => `
            <div class="panel">
                <h2>Monitoreo de Tanque ${id}</h2>
                <div id="status-msg-${id}" class="info-msg">⏱️ Modo: Tiempo Real activado</div>
                <div class="btn-group">
                    <button onclick="activarRT(${id}, this)" class="active" style="background:#4caf50">VIVO</button>
                    <button onclick="cargarHistorial(${id}, 1, this)">1M</button>
                    <button onclick="cargarHistorial(${id}, 5, this)">5M</button>
                    <button onclick="cargarHistorial(${id}, 60, this)">1H</button>
                    <button onclick="cargarHistorial(${id}, 1440, this)">1D</button>
                    <button onclick="cargarHistorial(${id}, 43200, this)">1MES</button>
                    <button style="background:#ff9800" onclick="resetView(${id})">RESETEAR</button>
                </div>
                <canvas id="chart-${id}"></canvas>
            </div>
        `).join('')}
    </div>

    <script>
        // --- VARIABLES Y CONFIG ---
        const tankCharts = {};
        const isRTMode = { 1: true, 2: true, 3: true };
        const rawDataFromDB = { 1: [], 2: [], 3: [], 3: [] };
        const currentMode = { 1: 'trend', 2: 'trend', 3: 'trend' };

        // --- CHARTS ---
        const commonOptions = {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        };

        function initChart(id) {
            const ctx = document.getElementById('chart-' + id);
            tankCharts[id] = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Nivel %', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', fill: true, tension: 0.4 }] },
                options: { ...commonOptions, onClick: (e, el) => {
                    if (!isRTMode[id] && el.length > 0 && currentMode[id] === 'trend') {
                        const labelValue = tankCharts[id].data.labels[el[0].index];
                        const original = rawDataFromDB[id].find(r => r.fecha.includes(labelValue));
                        if(original) cargarHistorial(id, null, null, original.fecha);
                    }
                }}
            });
        }

        // --- FIREBASE ---
        const firebaseConfig = { databaseURL: "${config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/'}" };
        firebase.initializeApp(firebaseConfig);

        function setupFirebase(id) {
            const dbRef = firebase.database().ref("monitoreo/sensor" + id);
            dbRef.on('value', (snapshot) => {
                const val = snapshot.val() || 0; // Obtener el valor del sensor
                document.getElementById('txt-actual-' + id).innerText = parseFloat(val).toFixed(1) + '%'; // Actualizar solo el porcentaje

                if (isRTMode[id]) {
                    const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
                    const chart = tankCharts[id];
                    if (chart.data.labels.length > 25) { 
                        chart.data.labels.shift(); 
                        chart.data.datasets[0].data.shift(); 
                    }
                    chart.data.labels.push(now);
                    chart.data.datasets[0].data.push(val);
                    chart.update('none');
                }
            });
        }

        // --- LÓGICA DE HISTORIAL D1 ---
        async function cargarHistorial(tankId, limit, btn, targetDate = null) {
            isRTMode[tankId] = false;
            const panel = btn ? btn.closest('.panel') : document.getElementById('status-msg-' + tankId).closest('.panel');
            panel.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active'); 
            
            const statusMsg = document.getElementById('status-msg-' + tankId);
            const originalMsg = targetDate ? "📍 Modo Detalle. Doble clic para volver." : "🔍 Clic para detalle | Doble clic reset";
            statusMsg.innerText = "⏳ Cargando datos...";

            let url = targetDate ? '/get-history?target=' + encodeURIComponent(targetDate) : '/get-history?limit=' + limit + '&sensor=' + tankId;
            currentMode[tankId] = (targetDate || limit <= 5) ? 'zoom' : 'trend';

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Error en servidor");
                const data = await response.json();
                rawDataFromDB[tankId] = targetDate ? data : [...data].reverse();
                
                let labelsFinales = [], datosFinales = [];
                const UMBRAL = 3; 

                if (currentMode[tankId] === 'zoom') {
                    rawDataFromDB[tankId].forEach(entry => {
                        const lecturas = entry.lecturas ? JSON.parse(entry.lecturas) : [entry.promedio];
                        const fechaLocal = new Date(entry.fecha.replace(' ','T') + 'Z');
                        const hora = fechaLocal.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        lecturas.forEach((v, i) => { labelsFinales.push(i === 0 ? hora : ""); datosFinales.push(v); });
                    });
                } else {
                    for (let i = 0; i < rawDataFromDB[tankId].length; i++) {
                        const actual = rawDataFromDB[tankId][i];
                        const fechaActualLocal = new Date(actual.fecha.replace(' ','T') + 'Z');
                        
                        if (i > 0) {
                            const fechaPreviaLocal = new Date(rawDataFromDB[tankId][i-1].fecha.replace(' ','T') + 'Z');
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
                const chart = tankCharts[tankId];
                chart.data.datasets[0].borderColor = '#4CAF50';
                chart.data.labels = labelsFinales;
                chart.data.datasets[0].data = datosFinales;
                chart.update();
                statusMsg.innerText = originalMsg;
            } catch(e) { 
                console.error(e);
                statusMsg.innerText = "❌ Error al cargar datos del historial";
            }
        }

        function activarRT(tankId, btn) {
            isRTMode[tankId] = true;
            const panel = btn.closest('.panel');
            panel.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const chart = tankCharts[tankId];
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.data.datasets[0].borderColor = '#2196F3';
            chart.update();
            document.getElementById('status-msg-' + tankId).innerText = "⏱️ Modo: Tiempo Real activado";
        }

        function resetView(tankId) { 
            const panel = document.getElementById('status-msg-' + tankId).closest('.panel');
            cargarHistorial(tankId, 60, panel.querySelector('.btn-group button:nth-child(4)')); 
        }

        window.onload = () => {
            [1, 2, 3].forEach(id => {
                initChart(id);
                setupFirebase(id);
                cargarHistorial(id, 60);
                document.getElementById('chart-' + id).addEventListener('dblclick', () => resetView(id));
            });
        };
    </script>
</body>
</html>
`;
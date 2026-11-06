/**
 * Módulo de Interfaz (Lego de Vista)
 * Contiene el HTML, CSS y el JavaScript que corre en el navegador.
 */

import { renderLayout } from './layout.js';

export const renderDashboard = (config) => renderLayout(`
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
        .telemetry-heading {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }
        .telemetry-role {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #fff;
            color: #1e293b;
            font-size: 0.75rem;
        }
        .telemetry-admin-controls[hidden] { display: none; }
        .telemetry-badges {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 10px;
            min-width: 0;
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
            padding: 4px 8px; 
            border-radius: 8px; 
            font-size: 14px; 
            font-weight: bold; 
            text-align: center; 
            min-width: 70px;
        }
        .nivel-badge.temp { background: #d32f2f; }
        .nivel-label { font-size: 9px; display: block; opacity: 0.8; }
        .btn-group { display: flex; gap: 4px; margin: 8px 0; flex-wrap: wrap; }
        .range-selector { 
            background: #f8fafc; 
            padding: 8px; 
            border-radius: 8px; 
            border: 1px dashed #cbd5e1;
            margin-top: 5px;
        }
        .info-msg { font-size: 10px; color: #1a237e; margin-bottom: 5px; opacity: 0.7; }
        
        button { 
            flex: 1;
            padding: 6px 2px; 
            border: none; 
            border-radius: 4px; 
            background: #2196F3; 
            color: white; 
            cursor: pointer; 
            font-size: 10px; 
            font-weight: bold;
            transition: 0.2s;
        }
        button:hover { opacity: 0.8; }
        button.active { background: #1a237e !important; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        h2 { color: #1a237e; margin: 0; font-size: 1rem; }
        canvas { width: 100% !important; max-height: 280px; }

        /* --- SIMULATION PANEL (DARK INDUSTRIAL) --- */
        .sim-panel {
            background: #1e293b;
            color: #38bdf8;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 11px;
            border: 1px solid #334155;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        .sim-panel label { font-weight: 800; letter-spacing: 0.5px; color: #94a3b8; }
        .sim-panel input[type=range] {
            flex: 1;
            cursor: pointer;
            accent-color: #38bdf8;
        }
        .sim-value-display {
            font-family: 'Consolas', monospace;
            background: #0f172a;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #334155;
            min-width: 50px;
            text-align: right;
        }
        @media (max-width: 700px) {
            .header {
                align-items: flex-start;
                flex-direction: column;
                gap: 12px;
            }
            .telemetry-badges {
                justify-content: flex-start;
                width: 100%;
                gap: 8px;
            }
            .nivel-badge {
                flex: 1 1 calc(50% - 8px);
                min-width: 0;
            }
        }
    </style>
    <div class="header">
        <div class="telemetry-heading">
            <h1 style="color: #1a237e; margin: 0; font-size: 1.5rem;">Monitoreo de Telemetría</h1>
            <label for="telemetry-role">Rol de prueba:
                <select id="telemetry-role" class="telemetry-role" onchange="switchTelemetryRole(this.value)">
                    <option value="adm_01">Administrador</option>
                    <option value="sup_01">Supervisor</option>
                    <option value="op_01">Operador</option>
                </select>
            </label>
        </div>
        <div class="telemetry-badges">
            <div class="nivel-badge"><span class="nivel-label">TANQUE 1</span><span id="txt-actual-1">0.0%</span></div>
            <div class="nivel-badge"><span class="nivel-label">TANQUE 2</span><span id="txt-actual-2">0.0%</span></div>
            <div class="nivel-badge"><span class="nivel-label">TANQUE 3</span><span id="txt-actual-3">0.0%</span></div>
            <div class="nivel-badge temp"><span class="nivel-label">TEMP.</span><span id="txt-actual-temp">0.0°C</span></div>
        </div>
    </div>

    <div class="container">
        ${['1', '2', '3', 'temp'].map(id => `
            <div class="panel">
                <h2>${id === 'temp' ? 'Sensor de Temperatura' : 'Monitoreo de Tanque ' + id}</h2>
                <div id="status-msg-${id}" class="info-msg">📡 Modo: Tiempo Real (Firebase)</div>
                
                <!-- SELECTOR DE RANGOS (D1) -->
                <div class="btn-group range-selector" id="range-group-${id}">
                    <button class="active" onclick="setRange('${id}', 'Real', this)">Real</button>
                    ${["1M", "2M", "5M", "10M", "30M", "1H", "2H", "8H", "1D", "2D", "3D", "5D", "7D"].map(r => 
                        `<button onclick="setRange('${id}', '${r}', this)">${r}</button>`
                    ).join('')}
                </div>
                
                <!-- PANEL DE SIMULACIÓN LOCAL -->
                <div class="sim-panel">
                    <label>SIMULADOR ${id === 'temp' ? 'TEMP' : 'T' + id}:</label>
                    <input type="range" id="slider-tanque${id}" 
                           min="${id === 'temp' ? '0' : '0'}" max="${id === 'temp' ? '80' : '100'}" step="0.1" value="25" 
                           oninput="manualSim('${id}', this.value)" onchange="manualSim('${id}', this.value)">
                    <span class="sim-value-display" id="val-sim-${id}">25.0${id === 'temp' ? '°C' : '%'}</span>
                </div>
                <div class="btn-group telemetry-admin-controls" hidden>
                    <button id="btn-sim-${id}" onclick="toggleSim('${id}')" style="background:#2196F3">SIM: AUTO OFF</button>
                    <button style="background:#ff9800" onclick="limpiarGrafica('${id}')">LIMPIAR GRÁFICA</button>
                </div>
                <canvas id="chart-${id}"></canvas>
            </div>
        `).join('')}
    </div>

    <script>
        // --- VARIABLES Y CONFIG ---
        const tankCharts = {};
        const simStates = { 1: false, 2: false, 3: false, temp: false };
        const simIntervals = { 1: null, 2: null, 3: null, temp: null };
        const isRealTime = { 1: true, 2: true, 3: true, temp: true };
        const telemetryUsers = {
            op_01: { role: 'OPERADOR' },
            sup_01: { role: 'SUPERVISOR' },
            adm_01: { role: 'ADMINISTRADOR' }
        };
        let currentUser = telemetryUsers.adm_01;

        function applyTelemetryRBAC() {
            const isAdmin = currentUser.role === 'ADMINISTRADOR';
            document.querySelectorAll('.telemetry-admin-controls').forEach(controls => {
                controls.hidden = !isAdmin;
            });
        }

        function switchTelemetryRole(userId) {
            currentUser = telemetryUsers[userId] || telemetryUsers.op_01;
            applyTelemetryRBAC();
        }

        // --- CHARTS ---
        function initChart(id) {
            const isTemp = id === 'temp';
            const ctx = document.getElementById('chart-' + id);
            tankCharts[id] = new Chart(ctx, {
                type: 'line',
                data: { 
                    labels: [], 
                    datasets: [{ 
                        label: 'Nivel %', 
                        data: [], 
                        borderColor: id === '1' ? '#2196F3' : id === '2' ? '#4caf50' : id === '3' ? '#ff9800' : '#f44336', 
                        backgroundColor: 'rgba(0,0,0,0.05)', 
                        fill: true, 
                        tension: 0.4,
                        pointRadius: 2
                    }] 
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 600 },
                    scales: { 
                        y: { beginAtZero: true, max: isTemp ? 80 : 100, ticks: { callback: v => v + (isTemp ? '°C' : '%') } },
                        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // --- FUNCIÓN DE EMPUJE DE DATOS (CORRIMIENTO) ---
        function pushToChart(id, val) {
            const chart = tankCharts[id];
            if (!chart) return;
            const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
            
            if (chart.data.labels.length > 25) { 
                chart.data.labels.shift(); 
                chart.data.datasets[0].data.shift(); 
            }
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(val);
            chart.update('none');
        }

        // --- FIREBASE ---
        const firebaseConfig = { databaseURL: "${config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/'}" };
        firebase.initializeApp(firebaseConfig);

        function setupFirebase(id) {
            // Mapeo de nodos de Firebase
            const fbPath = id === 'temp' ? "monitoreo/temp" : "monitoreo/sensor" + id;
            const dbRef = firebase.database().ref(fbPath);
            
            dbRef.on('value', (snapshot) => {
                const rawValue = snapshot.val();
                const val = rawValue === null ? 0 : Number(rawValue);
                if (!Number.isFinite(val)) {
                    console.error("Valor no numérico recibido en " + fbPath, rawValue);
                    return;
                }
                const valorLimpio = parseFloat(val).toFixed(1);
                const suffix = id === 'temp' ? '°C' : '%';

                // 1. Actualizar indicadores de texto (Badge y Simulación)
                const txtActual = document.getElementById('txt-actual-' + id);
                const simValDisplay = document.getElementById('val-sim-' + id);
                const simSlider = document.getElementById('slider-tanque' + id);

                if (txtActual) txtActual.innerText = valorLimpio + suffix;
                if (simValDisplay) simValDisplay.innerText = valorLimpio + suffix;
                if (simSlider) simSlider.value = val;

                // 2. Graficar solo si NO estamos en simulación local automática
                if (!simStates[id] && isRealTime[id]) {
                    pushToChart(id, val);
                }
            }, (error) => {
                console.error("Error leyendo " + fbPath + " desde Firebase", error);
                const status = document.getElementById('status-msg-' + id);
                if (status) status.innerText = "❌ Error de Firebase: " + error.message;
            });
        }

        // --- SIMULACIÓN MANUAL: ESCRIBE EN FIREBASE ---
        function manualSim(id, nuevoValor) {
            const val = parseFloat(nuevoValor);
            const suffix = id === 'temp' ? '°C' : '%';
            document.getElementById('val-sim-' + id).innerText = val.toFixed(1) + suffix;
            // Sincronizamos con Firebase para que el ESP u otros clientes vean el cambio
            const fbPath = id === 'temp' ? "monitoreo/temp" : "monitoreo/sensor" + id;
            firebase.database().ref(fbPath).set(val).catch(error => {
                console.error("No se pudo actualizar Firebase en " + fbPath, error);
                const status = document.getElementById('status-msg-' + id);
                if (status) status.innerText = "❌ Error al escribir en Firebase: " + error.message;
            });
        }

        // --- LÓGICA DE RANGOS HISTÓRICOS (CONSULTA A D1) ---
        async function setRange(id, range, btn) {
            // UI: Actualizar botones activos
            const parent = document.getElementById('range-group-' + id);
            parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const status = document.getElementById('status-msg-' + id);
            
            if (range === 'Real') {
                isRealTime[id] = true;
                status.innerText = "📡 Modo: Tiempo Real (Firebase)";
                return;
            }

            isRealTime[id] = false;
            status.innerText = "🔎 Modo: Consulta Histórica (" + range + ")...";
            
            // Calcular tiempos
            const now = new Date();
            let start = new Date();
            const val = parseInt(range);
            if (range.includes('M')) start.setMinutes(now.getMinutes() - val);
            else if (range.includes('H')) start.setHours(now.getHours() - val);
            else if (range.includes('D')) start.setDate(now.getDate() - val);

            const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
            const endStr = now.toISOString().slice(0, 19).replace('T', ' ');

            try {
                const res = await fetch(\`/api/data?start=\${startStr}&end=\${endStr}\`);
                const text = await res.text();
                
                if (!res.ok) {
                    let msg = text;
                    try { msg = JSON.parse(text).error; } catch(e) {}
                    throw new Error(msg || "Error en el servidor");
                }

                const data = JSON.parse(text); 
                
                const chart = tankCharts[id];
                chart.data.labels = [];
                chart.data.datasets[0].data = [];

                // Mapeo de columna JSON a ID
                const colMap = { '1': 't1', '2': 't2', '3': 't3', 'temp': 'temp' };
                
                data.forEach(row => {
                    const batch = JSON.parse(row.datos_json);
                    batch.forEach(m => {
                        const time = new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        chart.data.labels.push(time);
                        chart.data.datasets[0].data.push(m[colMap[id]]);
                    });
                });
                chart.update();
                status.innerText = "✅ Mostrando historial de D1 (" + range + ")";
            } catch (err) {
                status.innerText = "❌ Error al consultar D1: " + err.message;
            }
        }

        // --- LÓGICA DE SIMULACIÓN AUTOMÁTICA (CORRIMIENTO) ---
        function toggleSim(id) {
            if (currentUser.role !== 'ADMINISTRADOR') return;
            simStates[id] = !simStates[id];
            const btn = document.getElementById('btn-sim-' + id);
            const status = document.getElementById('status-msg-' + id);

            if (simStates[id]) {
                btn.innerText = "SIM: AUTO ON";
                btn.style.background = "#4caf50";
                status.innerText = "🚀 Modo Simulación: Generando corrimiento automático local...";
                // Iniciamos un intervalo de 2 segundos para inyectar datos de la página a la gráfica
                simIntervals[id] = setInterval(() => {
                    const val = parseFloat(document.getElementById('slider-tanque' + id).value);
                    pushToChart(id, val);
                }, 2000);
            } else {
                btn.innerText = "SIM: AUTO OFF";
                btn.style.background = "#2196F3";
                status.innerText = "📡 Modo Real: Esperando datos del ESP (Firebase)...";
                clearInterval(simIntervals[id]);
            }
        }

        function limpiarGrafica(id) {
            if (currentUser.role !== 'ADMINISTRADOR') return;
            const chart = tankCharts[id];
            if (!chart) return;
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();
        }

        window.onload = () => {
            applyTelemetryRBAC();
            [1, 2, 3, 'temp'].forEach(id => {
                initChart(id);
                setupFirebase(id);
            });
        };
    </script>
`, "telemetria");
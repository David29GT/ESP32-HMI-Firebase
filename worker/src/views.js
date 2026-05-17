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
                    <button onclick="activarRT(this)" class="active" style="background:#4caf50">VIVO</button>
                    <button onclick="cargarHistorial('1M', this)">1M</button>
                    <button onclick="cargarHistorial('5M', this)">5M</button>
                    <button onclick="cargarHistorial('1H', this)">1H</button>
                    <button onclick="cargarHistorial('1D', this)">1D</button>
                    <button style="background:#ff9800" onclick="resetView(${id})">RESETEAR</button>
                </div>
                <canvas id="chart-${id}"></canvas>
            </div>
        `).join('')}
    </div>

    <script>
        // --- VARIABLES Y CONFIG ---
        const tankCharts = {};
        let isRTMode = true; // Estado global del flujo (Tiempo Real vs Histórico)

        // --- CHARTS ---
        const commonOptions = {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 800 },
            scales: { 
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }
            },
            plugins: { legend: { display: false } }
        };

        function initChart(id) {
            const ctx = document.getElementById('chart-' + id);
            tankCharts[id] = new Chart(ctx, {
                type: 'line',
                data: { 
                    labels: [], 
                    datasets: [{ 
                        label: 'Nivel %', 
                        data: [], 
                        borderColor: id === 1 ? '#2196F3' : id === 2 ? '#4caf50' : '#ff9800', 
                        backgroundColor: 'rgba(0,0,0,0.05)', 
                        fill: true, 
                        tension: 0.4,
                        pointRadius: 2
                    }] 
                },
                options: commonOptions
            });
        }

        // --- FUNCIÓN MODULAR DE ACTUALIZACIÓN ---
        function actualizarGrafica(id, timestamps, valores) {
            const chart = tankCharts[id];
            if (!chart) return;
            
            chart.data.labels = timestamps;
            chart.data.datasets[0].data = valores;
            chart.update();
        }

        // --- FIREBASE ---
        const firebaseConfig = { databaseURL: "${config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/'}" };
        firebase.initializeApp(firebaseConfig);

        function setupFirebase(id) {
            const dbRef = firebase.database().ref("monitoreo/sensor" + id);
            dbRef.on('value', (snapshot) => {
                const val = snapshot.val() || 0; // Obtener el valor del sensor
                document.getElementById('txt-actual-' + id).innerText = parseFloat(val).toFixed(1) + '%'; // Actualizar solo el porcentaje

                if (isRTMode) {
                    const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
                    const chart = tankCharts[id];
                    if (chart.data.labels.length > 20) { 
                        chart.data.labels.shift(); 
                        chart.data.datasets[0].data.shift(); 
                    }
                    chart.data.labels.push(now);
                    chart.data.datasets[0].data.push(val);
                    chart.update('none'); // Update sin animación para RT
                }
            });
        }

        // --- LÓGICA DE HISTORIAL (API CLOUDFLARE + GITHUB) ---
        async function cargarHistorial(rango, btn) {
            isRTMode = false; // Pausamos el tiempo real

            // Gestión visual de botones
            document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');

            // Actualizar mensajes de estado
            [1, 2, 3].forEach(id => {
                document.getElementById('status-msg-' + id).innerText = "⏳ Consultando API...";
            });

            try {
                // CORRECCIÓN: Agregar la URL completa y absoluta de tu Cloudflare Worker
                const response = await fetch('https://esp32-hmi-monitor.samsepiol-cs30.workers.dev/api/telemetria?rango=' + rango);
                if (!response.ok) throw new Error("Error en la respuesta del Worker");
                
                const data = await response.json();

                if (!data || data.length === 0) {
                    [1, 2, 3].forEach(id => {
                        document.getElementById('status-msg-' + id).innerText = "⚠️ No hay datos en este rango";
                    });
                    return;
                }

                // Procesamiento de datos: Mapeo de columnas
                const timestamps = data.map(item => item.timestamp.split(' ')[1]); // Solo la hora para el eje X
                const t1_data = data.map(item => item.tanque1_nivel);
                const t2_data = data.map(item => item.tanque2_nivel);
                const t3_data = data.map(item => item.tanque3_nivel);

                // Actualización modular de las 3 gráficas
                actualizarGrafica(1, timestamps, t1_data);
                actualizarGrafica(2, timestamps, t2_data);
                actualizarGrafica(3, timestamps, t3_data);

                [1, 2, 3].forEach(id => {
                    document.getElementById('status-msg-' + id).innerText = "📊 Histórico: " + rango;
                });

            } catch (error) {
                console.error("SCADA Error:", error);
                [1, 2, 3].forEach(id => {
                    document.getElementById('status-msg-' + id).innerText = "❌ Error al conectar con el Backend";
                });
            }
        }

        function activarRT(btn) {
            isRTMode = true;
            document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            else document.querySelectorAll('button[style*="background:#4caf50"]').forEach(b => b.classList.add('active'));

            [1, 2, 3].forEach(id => {
                const chart = tankCharts[id];
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update();
                document.getElementById('status-msg-' + id).innerText = "⏱️ Modo: Tiempo Real activado";
            });
        }

        function resetView(tankId) { 
            activarRT();
        }

        window.onload = () => {
            [1, 2, 3].forEach(id => {
                initChart(id);
                setupFirebase(id);
            });
            activarRT();
        };
    </script>
</body>
</html>
`;
/**
 * Módulo SCADA HMI (Nueva Página)
 * Procesa SVGs dinámicos y genera la interfaz de control avanzada.
 */

export async function handleScadaRequest() {
    const MIS_TARJETAS = [
      {
        nombre: "Depósito T1",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778597351/Tanque1_nfv478.svg",
        pintadoIndependiente: false, 
        colorFijoestatico: "#64748b",
        animarNivel: true,
        idAguaOriginal: "aguaT1"
      },
      {
        nombre: "Bomba",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778483624/DrivePump_bx7yly.svg",
        pintadoIndependiente: false,
        colorFijoestatico: "#64748b"
      },
      {
        nombre: "Válvula",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778483502/MiniElectricSafetyShutoffValve_cd5tgs.svg",
        pintadoIndependiente: false,
        colorFijoestatico: "#64748b"
      },
      {
        nombre: "Tanque de Agua 2",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778991112/Tanque2_hbqomy.svg",
        pintadoIndependiente: false,
        colorFijoestatico: "#64748b",
        animarNivel: true,
        idAguaOriginal: "aguaT2"
      }
    ];

    const PIPE_URLS = [
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483014/PipeHorizontal_yanb3l.svg",
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483015/PipeVertical_yvenzq.svg",
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483010/90DegreeBend1_fpndun.svg",
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483015/PipeTeeUp_pfsgth.svg"
    ];

    async function getEnhancedSVG(url, idPrefix, isIndependent = false, animarNivel = false, idAguaOriginal = "aguaT1") {
      const res = await fetch(url);
      let svg = await res.text();
      
      if (animarNivel) {
        const frameId = idAguaOriginal.replace("agua", "Frame"); 
        svg = svg.replace('>', `><defs><clipPath id="${idPrefix}-clip"><use xlink:href="#${idPrefix}-${frameId}" /></clipPath></defs>`);
      }

      svg = svg.replace(/id="([^"]+)"/g, (m, id) => `id="${idPrefix}-${id}"`);
      svg = svg.replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${idPrefix}-${id})`);
      svg = svg.replace(/xlink:href="#([^"]+)"/g, (m, id) => `xlink:href="#${idPrefix}-${id}"`);

      if (animarNivel) {
        svg = svg.replace(`id="${idPrefix}-${idAguaOriginal}"`, `id="${idPrefix}-${idAguaOriginal}" class="water-layer" clip-path="url(#${idPrefix}-clip)"`);
      }

      const viewBox = svg.match(/viewBox="([^"]+)"/i)?.[1] || "0 0 300 300";
      const innerContent = svg.replace(/<svg[^>]*>|<\/svg>/gi, "");
      const paintClass = isIndependent ? "paint-custom" : "paint-layer";

      return `
        <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="pointer-events: none; user-select: none;">
          <defs><mask id="m-${idPrefix}"><g fill="white" stroke="white">${innerContent}</g></mask></defs>
          <g>${innerContent}</g>
          <rect class="${paintClass}" width="100%" height="100%" mask="url(#m-${idPrefix})" style="mix-blend-mode: color; opacity: 0.8; pointer-events: none;" />
        </svg>`;
    }

    const allSVGs = await Promise.all([
        ...MIS_TARJETAS.map((t, idx) => getEnhancedSVG(t.url, `card-${idx}`, t.pintadoIndependiente, t.animarNivel, t.idAguaOriginal)),
        ...PIPE_URLS.map((url, i) => getEnhancedSVG(url, `p${i}`))
    ]);

    const customSVGs = allSVGs.slice(0, MIS_TARJETAS.length);
    const svgPipes = allSVGs.slice(MIS_TARJETAS.length);

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { background: #f1f5f9; color: #1e293b; font-family: 'Segoe UI', sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; margin: 0; }
        .dashboard { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; width: 100%; max-width: 900px; }
        .card { background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .card-controls-panel { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; display: flex; flex-direction: column; gap: 5px; text-align: center; }
        .btn-toggle { border: none; padding: 5px 14px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
        .btn-toggle.active { background: #22c55e; color: white; }
        .btn-toggle.inactive { background: #ef4444; color: white; }
        .canvas { background: #f8fafc; border-radius: 8px; height: 160px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #cbd5e1; pointer-events: none; }
        svg { width: 100%; height: 100%; max-width: 90%; max-height: 90%; }
        .pipe-mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; }
        .pipe-item { background: #ffffff; height: 70px; border-radius: 6px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .water-layer { transform-box: fill-box; transform-origin: bottom; transition: transform 0.4s ease; }
        .status-badge-mini { padding: 6px; border-radius: 5px; text-align: center; font-weight: 700; font-size: 0.7rem; }
        input[type=range].scada-range { width: 100%; cursor: pointer; }
        .card.disabled-ui { opacity: 0.6; }
        .card.disabled-ui .canvas, .card.disabled-ui .card-controls-panel { pointer-events: none; filter: grayscale(1); }
        
        /* --- SISTEMA DE ALARMAS --- */
        .alarms-section { width: 100%; max-width: 900px; margin-bottom: 20px; }
        .alarm-card {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 18px; border-radius: 10px; margin-bottom: 8px;
            font-size: 0.8rem; font-weight: 700; border: 2px solid transparent;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .alarm-card.critical { background: #fee2e2; color: #991b1b; border-color: #ef4444; animation: blink-critical 1.5s infinite; }
        .alarm-card.warning { background: #fef3c7; color: #92400e; border-color: #f59e0b; animation: blink-warning 2s infinite; }
        
        @keyframes blink-critical {
          0% { box-shadow: 0 0 0 #ef4444; }
          50% { box-shadow: 0 0 12px #ef4444; border-color: #b91c1c; }
          100% { box-shadow: 0 0 0 #ef4444; }
        }
        @keyframes blink-warning {
          0% { border-color: #f59e0b; }
          50% { border-color: #b45309; }
          100% { border-color: #f59e0b; }
        }
        .btn-ack { background: #334155; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; transition: 0.2s; }
        .btn-ack:hover { background: #1e293b; }

        /* --- VECTOR DE CONTROL --- */
        .control-vector-card { grid-column: span 2; background: #ffffff; border: 2px solid #1e293b; padding: 20px; border-radius: 12px; }
        .mode-selector { display: flex; gap: 10px; margin: 15px 0; }
        .btn-mode { flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: white; cursor: pointer; border-radius: 8px; font-weight: bold; font-size: 0.75rem; transition: 0.3s; }
        .btn-mode.active { background: #1e293b; color: white; border-color: #1e293b; }
        
        .setpoint-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
        .setpoint-row { background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .setpoint-header { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; color: #475569; margin-bottom: 5px; }
        
        .estop-section { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .estop-badge { flex: 1; padding: 10px; border-radius: 6px; font-weight: 800; font-size: 0.7rem; text-align: center; }
        .estop-badge.inactive { background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1; }
        .estop-badge.active { background: #fee2e2; color: #ef4444; border: 1px solid #ef4444; animation: blink-critical 1s infinite; }

        /* --- PERFIL DE USUARIO --- */
        .user-profile-card { position: fixed; top: 15px; right: 15px; background: white; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; z-index: 1000; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1e293b; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.7rem; }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-size: 0.75rem; font-weight: 800; color: #1e293b; line-height: 1; }
        .user-role { font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
        .role-selector { font-size: 0.55rem; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; margin-top: 4px; cursor: pointer; background: #f8fafc; }

        /* --- AUDIT LOG --- */
        .audit-log-card { grid-column: span 2; background: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
        .audit-log-list { list-style: none; padding: 0; margin: 10px 0 0 0; max-height: 120px; overflow-y: auto; }
        .audit-log-list li { font-family: monospace; font-size: 0.65rem; color: #475569; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
        .audit-log-list li:last-child { border-bottom: none; }
        .audit-log-list li .ts { color: #94a3b8; font-weight: bold; margin-right: 5px; }

        /* --- RBAC MASKING --- */
        .readonly-operador { position: relative; }
        .readonly-operador::after { 
            content: "🔒"; position: absolute; top: 10px; right: 10px; font-size: 0.8rem; z-index: 20; background: #f8fafc; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; opacity: 0.8;
        }
        .readonly-operador input, .readonly-operador button:not(.btn-ack) { 
            pointer-events: none !important; opacity: 0.4 !important; filter: grayscale(1); 
        }

        /* --- DIAGNÓSTICO Y TELEMETRÍA --- */
        .telemetry-card { grid-column: span 2; background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 15px; border-radius: 12px; }
        .telemetry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
        .metric-box { background: #1e293b; padding: 10px; border-radius: 8px; text-align: center; border: 1px solid #334155; }
        .metric-val { display: block; font-size: 1.1rem; font-weight: 800; color: #f8fafc; }
        .metric-label { font-size: 0.6rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
        .db-status { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; margin-top: 15px; padding-top: 10px; border-top: 1px solid #334155; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
        .heartbeat { width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; animation: heartbeat-pulse 1s infinite; }
        @keyframes heartbeat-pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }

        /* --- BALANCE DE MATERIA / OEE --- */
        .oee-card { grid-column: span 2; background: #fdf2f8; border: 1px solid #fbcfe8; padding: 15px; border-radius: 12px; }
        .oee-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
        .oee-box { background: #ffffff; padding: 10px; border-radius: 8px; text-align: center; border: 1px solid #f9a8d4; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .oee-val { display: block; font-size: 1.1rem; font-weight: 800; color: #be185d; }
        .oee-label { font-size: 0.55rem; text-transform: uppercase; color: #db2777; letter-spacing: 0.5px; font-weight: bold; }

        .nav-bar {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            width: 100%;
            max-width: 900px;
        }
        .nav-bar a {
            text-decoration: none;
            color: #1e293b;
            font-weight: bold;
            padding: 8px 16px;
            background: #e2e8f0;
            border-radius: 20px;
            font-size: 14px;
        }
        .nav-bar a.active { background: #1e293b; color: white; }
      </style>
    </head>
    <body>
      <div class="nav-bar">
        <a href="/">📊 Dashboard</a>
        <a href="/scada" class="active">🏭 SCADA HMI</a>
      </div>
      <div class="user-profile-card">
        <div class="user-avatar" id="user-avatar-initials">S1</div>
        <div class="user-info">
          <span class="user-name" id="user-display-name">Supervisor_01</span>
          <span class="user-role" id="user-display-role">SUPERVISOR</span>
          <select class="role-selector" onchange="switchUser(this.value)">
            <option value="sup_01">Ver como Supervisor</option>
            <option value="op_01">Ver como Operador</option>
            <option value="adm_01">Ver como Administrador</option>
          </select>
        </div>
      </div>
      <h2 style="margin-top: 20px; margin-bottom: 20px; color: #334155;">SCADA HMI - USAC</h2>
      <div id="alarms-list" class="alarms-section"></div>
      <div class="dashboard">
        <!-- TARJETA DE TELEMETRÍA Y DIAGNÓSTICO -->
        <div class="card telemetry-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: #38bdf8; font-size: 0.8rem; font-weight: 800;">RED Y DIAGNÓSTICO DE TELEMETRÍA</label>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 0.6rem; color: #94a3b8; font-weight: bold;">HEARTBEAT</span>
              <div class="heartbeat"></div>
            </div>
          </div>
          <div class="telemetry-grid">
            <div class="metric-box"><span class="metric-val" id="rssi-val">-65 <small style="font-size:0.5rem">dBm</small></span><span class="metric-label">WiFi RSSI</span></div>
            <div class="metric-box"><span class="metric-val" id="cycle-val">120 <small style="font-size:0.5rem">ms</small></span><span class="metric-label">Scan Cycle</span></div>
            <div class="metric-box"><span class="metric-val" id="ping-val">45 <small style="font-size:0.5rem">ms</small></span><span class="metric-label">Ping CF</span></div>
            <div class="metric-box"><span class="metric-val" id="bw-val">2.4 <small style="font-size:0.5rem">KB/s</small></span><span class="metric-label">Bandwidth</span></div>
          </div>
          <div class="db-status">
            <div class="status-dot"></div>
            <span>Firebase DB: <b style="color: #22c55e;">CONECTADO</b></span>
            <span style="margin-left: auto; color: #94a3b8;">Sincronización: <span id="last-sync">hace 0s</span></span>
          </div>
        </div>

        <!-- TARJETA DE BALANCE DE MATERIA Y OEE -->
        <div class="card oee-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: #be185d; font-size: 0.8rem; font-weight: 800;">BALANCE DE MATERIA & EFICIENCIA (OEE)</label>
          </div>
          <div class="oee-grid">
            <div class="oee-box"><span class="oee-val" id="oee-perc">94.2 <small style="font-size:0.5rem">%</small></span><span class="oee-label">OEE Global</span></div>
            <div class="oee-box"><span class="oee-val" id="flow-rate">0.0 <small style="font-size:0.5rem">L/min</small></span><span class="oee-label">Caudal Est.</span></div>
            <div class="oee-box"><span class="oee-val" id="total-vol">124.5 <small style="font-size:0.5rem">L</small></span><span class="oee-label">Vol. Total</span></div>
            <div class="oee-box"><span class="oee-val" id="runtime-val">08:24 <small style="font-size:0.5rem">h</small></span><span class="oee-label">Runtime</span></div>
          </div>
        </div>

        <!-- TARJETA DE REGISTRO DE CAMBIOS (AUDIT LOG) -->
        <div class="card audit-log-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: #1e293b; font-size: 0.8rem; font-weight: 800;">REGISTRO DE CAMBIOS (AUDIT LOG)</label>
          </div>
          <ul id="audit-log-list" class="audit-log-list">
            <!-- Logs dinámicos -->
          </ul>
        </div>

        <!-- TARJETA DE VECTOR DE CONTROL -->
        <div class="card control-vector-card" id="control-vector">
          <label style="color: #1e293b; font-size: 0.8rem; letter-spacing: 0.5px; font-weight: 800;">Vector de Control / Modos de Operación</label>
          <div class="mode-selector">
            <button id="mode-MANUAL" class="btn-mode active" onclick="setOpMode('MANUAL')">MANUAL</button>
            <button id="mode-AUTO" class="btn-mode" onclick="setOpMode('AUTO')">AUTOMÁTICO</button>
            <button id="mode-MANT" class="btn-mode" onclick="setOpMode('MANT')">MANTENIMIENTO</button>
          </div>
          <div class="setpoint-group">
            <div class="setpoint-row">
              <div class="setpoint-header"><span>SETPOINT ALTO (Supervisor)</span><span id="sp-high-val">90%</span></div>
              <input type="range" class="scada-range" id="sp-high" min="50" max="100" value="90" oninput="updateSP('high')">
            </div>
            <div class="setpoint-row">
              <div class="setpoint-header"><span>SETPOINT BAJO (Supervisor)</span><span id="sp-low-val">10%</span></div>
              <input type="range" class="scada-range" id="sp-low" min="0" max="50" value="10" oninput="updateSP('low')">
            </div>
          </div>
          <div class="estop-section">
            <div id="estop-indicator" class="estop-badge inactive">SISTEMA: NORMAL (E-STOP OK)</div>
            <button class="btn-ack" style="background: #ef4444; padding: 10px 15px;" onclick="triggerEStop()">E-STOP</button>
            <button class="btn-ack" style="padding: 10px 15px;" onclick="resetEStop()">RESET (S/R)</button>
          </div>
        </div>

        ${MIS_TARJETAS.map((t, idx) => `
          <div class="card" id="card-container-${idx}" data-independent="${t.pintadoIndependiente}" data-static-color="${t.colorFijoestatico}">
            <div class="card-header"><label>${t.nombre}</label><button class="btn-toggle active" id="toggle-${idx}" onclick="toggleCard(${idx})">ON</button></div>
            <div class="canvas">${customSVGs[idx]}</div>
            <div class="card-controls-panel">
              <label>Color Proceso: <span id="card-colorTxt-${idx}">50</span>%</label>
              <input type="range" class="scada-range" id="colorSlider-${idx}" min="0" max="19" value="${(idx * 3) % 20}" oninput="updateCardColor(${idx})">
              <div id="card-statusLabel-${idx}" class="status-badge-mini">OK</div>
            </div>
          </div>`).join('')}
        <div class="card" style="grid-column: span 2;" id="card-container-pipes">
          <div class="card-header"><label>Red de Tuberías</label><button class="btn-toggle active" id="toggle-pipes" onclick="togglePipes()">ON</button></div>
          <div class="canvas"><div class="pipe-mini-grid">${svgPipes.map(s => `<div class="pipe-item">${s}</div>`).join('')}</div></div>
          <div class="card-controls-panel" style="flex-direction: row; justify-content: space-between; align-items: center;">
             <input type="range" class="scada-range" id="pipes-colorSlider" min="0" max="19" value="6" oninput="updatePipesColor()">
             <div id="pipes-statusLabel" class="status-badge-mini" style="min-width: 100px;">FLUJO OK</div>
          </div>
        </div>
        <div class="card" style="grid-column: span 2; background: #eff6ff; border: 2px solid #3b82f6;">
          <label>Nivel Global: <span id="levelTxt">50</span>%</label>
          <input type="range" class="scada-range" id="levelSlider" min="0" max="100" value="50" oninput="updateSystemLevel()">
        </div>
      </div>
      <script>
        const paleta = [
          { n: "GRIS", c: "#94a3b8", t: "#000" }, { n: "DEEP", c: "#334155", t: "#fff" },
          { n: "WHITE", c: "#f8fafc", t: "#000" }, { n: "SILVER", c: "#cbd5e1", t: "#000" },
          { n: "ALERTA", c: "#ef4444", t: "#fff" }, { n: "BLOOD", c: "#7f1d1d", t: "#fff" },
          { n: "AZUL", c: "#3b82f6", t: "#fff" }, { n: "NAVY", c: "#1e3a8a", t: "#fff" },
          { n: "GOLD", c: "#fbbf24", t: "#000" }, { n: "BROWN", c: "#92400e", t: "#fff" },
          { n: "VERDE", c: "#22c55e", t: "#fff" }, { n: "FOREST", c: "#064e3b", t: "#fff" },
          { n: "ORANGE", c: "#f97316", t: "#fff" }, { n: "RUST", c: "#7c2d12", t: "#fff" },
          { n: "CIAN", c: "#06b6d4", t: "#fff" }, { n: "TEAL", c: "#164e63", t: "#fff" },
          { n: "PURPLE", c: "#a855f7", t: "#fff" }, { n: "INDIGO", c: "#4c1d95", t: "#fff" },
          { n: "PINK", c: "#ec4899", t: "#fff" }, { n: "ROSE", c: "#831843", t: "#fff" }
        ];
        const cardStates = Array(${MIS_TARJETAS.length}).fill(true);
        let pipesState = true;

        // --- GESTIÓN DE USUARIOS (RBAC) ---
        const USERS = {
          "op_01": { name: "Operador_01", role: "OPERADOR", initials: "O1" },
          "sup_01": { name: "Supervisor_01", role: "SUPERVISOR", initials: "S1" },
          "adm_01": { name: "Admin_USAC", role: "ADMINISTRADOR", initials: "AD" }
        };
        let currentUser = USERS["sup_01"];

        function applyRBAC() {
          const isOp = currentUser.role === 'OPERADOR';
          document.getElementById('user-avatar-initials').innerText = currentUser.initials;
          document.getElementById('user-display-name').innerText = currentUser.name;
          document.getElementById('user-display-role').innerText = currentUser.role;

          const cardsToLock = document.querySelectorAll('.card:not(.telemetry-card):not(.oee-card):not(.audit-log-card)');
          cardsToLock.forEach(c => {
            if(isOp) c.classList.add('readonly-operador');
            else c.classList.remove('readonly-operador');
          });
        }

        function switchUser(uid) {
          currentUser = USERS[uid];
          applyRBAC();
          addLogEntry('Sistema', \`Sesión cambiada a \${currentUser.name} (\${currentUser.role})\`);
        }

        // --- LÓGICA DE AUDIT LOG ---
        let auditLogEntries = [];
        function addLogEntry(user, action) {
          const now = new Date();
          const ts = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
          auditLogEntries.unshift({ ts, user, action });
          if(auditLogEntries.length > 10) auditLogEntries.pop();
          renderAuditLog();
        }
        function renderAuditLog() {
          const list = document.getElementById('audit-log-list');
          list.innerHTML = auditLogEntries.map(e => \`<li><span class="ts">[\${e.ts}]</span> <b>\${e.user}</b> \${e.action}</li>\`).join('');
        }

        // --- ESTADO VECTOR DE CONTROL ---
        let opMode = 'MANUAL';
        let estopActive = false;

        function setOpMode(mode) {
          if(opMode === mode) return;
          opMode = mode;
          document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
          document.getElementById('mode-' + mode).classList.add('active');
          addLogEntry(currentUser.name, \`cambió MODO a \${mode}.\`);
        }

        function updateSP(type) {
          const val = document.getElementById('sp-' + type).value;
          document.getElementById('sp-' + type + '-val').innerText = val + '%';
        }

        function triggerEStop() {
          if(estopActive) return;
          estopActive = true;
          document.getElementById('estop-indicator').innerText = "🛑 PARADA DE EMERGENCIA ACTIVA";
          document.getElementById('estop-indicator').className = "estop-badge active";
          document.querySelectorAll('.card').forEach(c => { if(c.id !== 'control-vector') c.classList.add('disabled-ui'); });
          addLogEntry(currentUser.name, 'activó PARADA DE EMERGENCIA.');
        }

        function resetEStop() {
          if(!estopActive) return;
          estopActive = false;
          document.getElementById('estop-indicator').innerText = "SISTEMA: NORMAL (E-STOP OK)";
          document.getElementById('estop-indicator').className = "estop-badge inactive";
          document.querySelectorAll('.card').forEach(c => c.classList.remove('disabled-ui'));
          for(let i=0; i<cardStates.length; i++) if(!cardStates[i]) document.getElementById("card-container-" + i).classList.add("disabled-ui");
          if(!pipesState) document.getElementById("card-container-pipes").classList.add("disabled-ui");
          addLogEntry(currentUser.name, 'reseteó PARADA DE EMERGENCIA.');
        }

        // --- LÓGICA DE TELEMETRÍA ---
        let lastSyncTime = Date.now();
        function updateTelemetry() {
          const rssi = -60 - Math.floor(Math.random() * 15);
          const cycle = 110 + Math.floor(Math.random() * 30);
          const ping = 40 + Math.floor(Math.random() * 20);
          const bw = (2.1 + Math.random()).toFixed(1);
          
          document.getElementById('rssi-val').innerHTML = \`\${rssi} <small style="font-size:0.5rem">dBm</small>\`;
          document.getElementById('cycle-val').innerHTML = \`\${cycle} <small style="font-size:0.5rem">ms</small>\`;
          document.getElementById('ping-val').innerHTML = \`\${ping} <small style="font-size:0.5rem">ms</small>\`;
          document.getElementById('bw-val').innerHTML = \`\${bw} <small style="font-size:0.5rem">KB/s</small>\`;
          
          const diff = Math.floor((Date.now() - lastSyncTime) / 1000);
          document.getElementById('last-sync').innerText = \`hace \${diff}s\`;
          if(diff > 5 && Math.random() > 0.8) lastSyncTime = Date.now();
        }

        // --- LÓGICA DE OEE Y BALANCE ---
        let lastLevel = 50;
        let totalAccumulated = 124.5;
        
        function updateOEEAndFlow() {
          const currentLevel = parseFloat(document.getElementById('levelSlider').value);
          const deltaLevel = currentLevel - lastLevel;
          
          // Cálculo de Caudal: Asumiendo tanque de 1000L, 1% = 10L
          // Intervalo de ejecución: 2s (1/30 min) -> Caudal = (deltaL * 10) / (1/30)
          const estimatedFlow = Math.abs((deltaLevel * 10) * 30).toFixed(1);
          
          if (deltaLevel > 0) totalAccumulated += deltaLevel * 10;
          
          // Simulación de métricas OEE basadas en disponibilidad
          const availability = (cardStates[1] ? 98 : 45); // Si la bomba está ON
          const performance = (95 + Math.random() * 4);
          const oeeValue = ((availability * performance) / 100).toFixed(1);

          document.getElementById('flow-rate').innerHTML = \`\${estimatedFlow} <small style="font-size:0.5rem">L/min</small>\`;
          document.getElementById('oee-perc').innerHTML = \`\${oeeValue} <small style="font-size:0.5rem">%</small>\`;
          document.getElementById('total-vol').innerHTML = \`\${Math.floor(totalAccumulated)} <small style="font-size:0.5rem">L</small>\`;
          
          lastLevel = currentLevel;
        }

        // --- LÓGICA DE ALARMAS ---
        let alarmasActivas = [
          { id: 101, cod: "T1-LVL-HIGH", msg: "Tanque 1: Nivel Crítico (Sobrellenado)", nivel: "critical", hora: "10:45:12" },
          { id: 102, cod: "P1-TEMP-WRN", msg: "Bomba Principal: Sobrecalentamiento detectado", nivel: "warning", hora: "11:02:30" }
        ];

        function renderAlarms() {
          const container = document.getElementById('alarms-list');
          if (alarmasActivas.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#64748b; font-size:0.75rem; font-style:italic; padding:10px; border:1px dashed #cbd5e1; border-radius:8px;">✅ No hay alarmas activas en el sistema</div>';
            return;
          }
          container.innerHTML = alarmasActivas.map(a => \`
            <div class="alarm-card \${a.nivel}">
              <div>
                <span style="opacity:0.7; font-family:monospace;">[\${a.cod}]</span> \${a.msg}
                <br><small style="font-weight:400; opacity:0.8;">Sello de tiempo: \${a.hora}</small>
              </div>
              <button class="btn-ack" onclick="ackAlarm(\${a.id})">ACEPTAR (ACK)</button>
            </div>\`).join('');
        }

        function ackAlarm(id) {
          alarmasActivas = alarmasActivas.filter(a => a.id !== id);
          renderAlarms();
        }

        function toggleCard(idx) {
          cardStates[idx] = !cardStates[idx];
          const btn = document.getElementById("toggle-" + idx);
          const container = document.getElementById("card-container-" + idx);
          btn.innerText = cardStates[idx] ? "ON" : "OFF";
          btn.className = "btn-toggle " + (cardStates[idx] ? "active" : "inactive");
          container.classList.toggle("disabled-ui", !cardStates[idx]);
          updateCardColor(idx);
        }

        function togglePipes() {
          pipesState = !pipesState;
          const btn = document.getElementById("toggle-pipes");
          btn.innerText = pipesState ? "ON" : "OFF";
          btn.className = "btn-toggle " + (pipesState ? "active" : "inactive");
          updatePipesColor();
        }

        function updateCardColor(idx) {
          const container = document.getElementById("card-container-" + idx);
          const slider = document.getElementById("colorSlider-" + idx);
          const color = paleta[slider.value];
          const paintLayer = container.querySelector('.paint-layer, .paint-custom');
          
          document.getElementById("card-colorTxt-" + idx).innerText = Math.round((slider.value/19)*100);
          const badge = document.getElementById("card-statusLabel-" + idx);
          
          if (cardStates[idx]) {
            badge.style.backgroundColor = color.c; badge.style.color = color.t; badge.innerText = color.n;
            paintLayer.setAttribute('fill', container.dataset.independent === "true" ? container.dataset.staticColor : color.c);
          } else {
            badge.style.backgroundColor = "#e2e8f0"; badge.innerText = "OFF";
            paintLayer.setAttribute('fill', "#cbd5e1");
          }
        }

        function updatePipesColor() {
          const slider = document.getElementById("pipes-colorSlider");
          const color = paleta[slider.value];
          const badge = document.getElementById("pipes-statusLabel");
          const pipes = document.querySelectorAll('#card-container-pipes .paint-layer');
          
          if (pipesState) {
            badge.style.backgroundColor = color.c; badge.style.color = color.t; badge.innerText = color.n;
            pipes.forEach(p => p.setAttribute('fill', color.c));
          } else {
            badge.style.backgroundColor = "#e2e8f0"; badge.innerText = "OFF";
            pipes.forEach(p => p.setAttribute('fill', "#cbd5e1"));
          }
        }

        function updateSystemLevel() {
          const val = document.getElementById('levelSlider').value;
          document.getElementById('levelTxt').innerText = val;
          document.querySelectorAll('.water-layer').forEach(w => w.style.transform = "scaleY(" + (val/100) + ")");
        }

        window.onload = () => {
          addLogEntry('Sistema', 'HMI SCADA iniciado.');
          renderAlarms(); 
          applyRBAC();
          updateSystemLevel(); 
          updatePipesColor(); 
          updateTelemetry(); 
          updateOEEAndFlow();
          setInterval(() => { updateTelemetry(); updateOEEAndFlow(); }, 2000);
          for(let i=0; i<cardStates.length; i++) updateCardColor(i);
        };
      </script>
    </body>
    </html>`;
    return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
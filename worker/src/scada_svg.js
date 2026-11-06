import { renderLayout } from './layout.js';

export async function renderScadaSvg(config = {}) {
    const urlSvg = "https://res.cloudinary.com/drov8gutj/image/upload/v1779076947/ProcesoCasaV5_Optimizado_kum9ov.svg";

    try {
      const svgResponse = await fetch(urlSvg);
      if (!svgResponse.ok) {
        throw new Error("No se pudo obtener el archivo SVG desde Cloudinary");
      }
      let svgRawText = await svgResponse.text();

      // Inyección de los contenedores clipPath iniciales vacíos para los tanques
      const inyeccionDefs = `
        <clipPath id="clip-deposito"><rect id="clip-rect-deposito" x="0" y="0" width="0" height="0" /></clipPath>
        <clipPath id="clip-tanque2"><rect id="clip-rect-tanque2" x="0" y="0" width="0" height="0" /></clipPath>
        <clipPath id="clip-tanque1"><rect id="clip-rect-tanque1" x="0" y="0" width="0" height="0" /></clipPath>
      `;
      
      svgRawText = svgRawText.replace("<defs id=\"defs1\">", `<defs id="defs1">${inyeccionDefs}`);

      // Configuración limpia de actuadores
      const actuadores = [
        { 
          ids: ["Pump", "Motor", "Base"], 
          nombre: "Bomba de Agua",
          tipo: "bomba" 
        },        
        { 
          ids: ["Shutoff_Housing__x2B__Electric_Box", "Mini_Pipe"], 
          nombre: "Válvula Selectora de Tanque",
          tipo: "bomba" 
        },
        { 
          ids: [
            "TB_BASE_VERTICAL_Shape_1", 
            "TB_BASE_HORIZONTAL_Shape_2", 
            "TB_BASE_T_Shape_3", 
            "TB_BASE_T_path3", 
            "TB_BASE_FIN_Shape_4"
          ], 
          nombre: "Tubería Base", 
          tipo: "tuberia", 
          selector: "path, rect, polygon" 
        },
        { 
          ids: ["TuberiaT2_Shape_5"], 
          nombre: "Tubería T2", 
          tipo: "tuberia", 
          selector: "path, rect, polygon" 
        },
        { 
          ids: [
            "TuberiaT3_Shape_6", 
            "TuberiaT3_CODO_Shape_6", 
            "TuberiaT3_VERTICAL_Shape_6"
          ], 
          nombre: "Tubería T3", 
          tipo: "tuberia", 
          selector: "path, rect, polygon" 
        },
        /* =========================================================================
           CONTROL DE TANQUES: Separamos el ID dinámico (agua) del estático (fondo)
           Usamos 'clipId' para apuntar a la máscara que controlará la altura.
           ========================================================================= */
        {
          ids: ["aguaT3"], 
          idFondo: "Contenedor_Agua_Dep",
          clipId: "clip-rect-deposito",
          nombre: "Nivel Depósito",
          sensor: "sensor3",
          tanque: "T1",
          initVal: 50,
          tipo: "tanque"
        },
        {
          ids: ["aguaT2"],
          idFondo: "Contenedor_Agua_T2",
          clipId: "clip-rect-tanque2",
          nombre: "Nivel Tanque Segundo Nivel",
          sensor: "sensor2",
          tanque: "T2",
          initVal: 50,
          tipo: "tanque"
        },
        {
          ids: ["aguaT1"],
          idFondo: "Contenedor_Agua_T3",
          clipId: "clip-rect-tanque1",
          nombre: "Nivel Tanque Tercer Nivel",
          sensor: "sensor1",
          tanque: "T3",
          initVal: 50,
          tipo: "tanque"
        }
      ];

      // Generación dinámica del panel de controles izquierdo
      const controlesHTML = actuadores.map((act, idx) => `
        <div class="control-card-item" id="container-${idx}">
          <div class="control-card-header">
            <label class="instrument-label">${act.nombre}</label>
            ${idx === 0 ? `<div class="pump-controls">
              <button class="btn-toggle active developer-control" id="toggle-${idx}" onclick="toggleActuador(${idx})" hidden>ON</button>
              <button class="fault-simulation-button developer-control" id="simulate-pump-fault" type="button" onclick="toggleSimulatedPumpFault()" hidden>Simular falla</button>
            </div>` : `<button class="btn-toggle active developer-control" id="toggle-${idx}" onclick="toggleActuador(${idx})" hidden>ON</button>`}
          </div>
          ${act.tipo === 'tanque' ? `<div class="slider-wrapper developer-control" hidden>
            <label class="control-label">
              Nivel de tanque:
              <span id="colorTxt-${idx}" class="color-percentage">0</span>%
            </label>
            <input type="range" class="scada-range" id="slider-${idx}" min="0" max="100" value="${act.initVal}" oninput="handleSliderInput(${idx})">
            <label class="sensor-disconnect-control">
              <input type="checkbox" id="sensor-error-${act.sensor}" onchange="setSensorDisconnected('${act.sensor}', this.checked)">
              Simular Sensor Desconectado (${act.tanque})
            </label>
          </div>` : ""}
          <div id="statusLabel-${idx}" class="status-badge-mini">PROCESO OK</div>
        </div>
      `).join('');

      const content = `
    <style>
        html, body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background-color: #f1f5f9;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            color: #1e293b;
            box-sizing: border-box;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: 340px 1fr;
            gap: 20px;
            padding: 20px;
            height: calc(100vh - 56px);
            box-sizing: border-box;
        }

        .tarjeta-hmi {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.05);
            padding: 20px;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
        }

        #panel-instrumentacion {
            gap: 12px;
            overflow-y: auto;
        }

        h2 {
            margin-top: 0;
            margin-bottom: 5px;
            color: #334155;
            font-size: 1.15rem;
            letter-spacing: 0.3px;
        }
        .subtitle {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 15px;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 10px;
        }

        .control-card-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            transition: all 0.25s ease;
        }

        .control-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .pump-controls {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .fault-simulation-button {
            border: 1px solid #fecaca;
            border-radius: 5px;
            background: #fff;
            color: #b91c1c;
            padding: 4px 8px;
            font-size: 0.65rem;
            font-weight: 800;
            cursor: pointer;
        }
        .fault-simulation-button.active {
            background: #ef4444;
            color: #fff;
        }

        .instrument-label {
            font-size: 0.75rem;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .slider-wrapper {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .control-label {
            font-size: 0.68rem;
            color: #64748b;
            font-weight: 700;
        }

        .color-percentage {
            font-size: 0.85rem;
            font-weight: 800;
        }

        .btn-toggle {
            border: none;
            padding: 4px 12px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.7rem;
            transition: all 0.2s ease;
            letter-spacing: 0.5px;
        }
        .btn-toggle.active {
            background: #22c55e;
            color: white;
            box-shadow: 0 2px 4px rgba(34,197,94,0.2);
        }
        .btn-toggle.inactive {
            background: #ef4444;
            color: white;
            box-shadow: 0 2px 4px rgba(239,68,68,0.2);
        }

        .status-badge-mini {
            padding: 4px;
            border-radius: 4px;
            text-align: center;
            font-weight: 700;
            font-size: 0.65rem;
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
        }

        input[type=range].scada-range {
            -webkit-appearance: none;
            width: 100%;
            background: transparent;
            height: 20px;
            margin: 0;
        }
        input[type=range].scada-range:focus { outline: none; }
        input[type=range].scada-range::-webkit-slider-runnable-track { width: 100%; height: 6px; cursor: pointer; border-radius: 3px; background: #e2e8f0; }
        input[type=range].scada-range::-moz-range-track { width: 100%; height: 6px; cursor: pointer; border-radius: 3px; background: #e2e8f0; }
        
        input[type=range].scada-range::-webkit-slider-thumb { height: 14px; width: 14px; border-radius: 50%; background: #475569; cursor: pointer; -webkit-appearance: none; margin-top: -4px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        input[type=range].scada-range::-moz-range-thumb { height: 14px; width: 14px; border: none; border-radius: 50%; background: #475569; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }

        .control-card-item.disabled-ui {
            border-color: #cbd5e1;
            opacity: 0.65;
        }
        .control-card-item.disabled-ui input[type=range] {
            pointer-events: none;
        }
        .developer-control[hidden],
        .priority-actions[hidden] {
            display: none !important;
        }
        .control-mode-button {
            border: 1px solid #cbd5e1;
            border-radius: 7px;
            background: #fff;
            color: #334155;
            padding: 8px 10px;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
        }
        .priority-card {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 12px;
            display: grid;
            gap: 8px;
        }
        .priority-title {
            color: #1e3a8a;
            font-size: 0.78rem;
            font-weight: 800;
        }
        .priority-current {
            color: #1d4ed8;
            font-size: 1rem;
            font-weight: 800;
        }
        .priority-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .priority-button {
            border: 1px solid #93c5fd;
            border-radius: 6px;
            background: #fff;
            color: #1e40af;
            padding: 6px 10px;
            font-size: 0.7rem;
            font-weight: 700;
            cursor: pointer;
        }
        .priority-button.active {
            border-color: #2563eb;
            background: #2563eb;
            color: #fff;
        }
        .process-alert-status {
            border-radius: 6px;
            background: #f1f5f9;
            color: #475569;
            padding: 8px;
            font-size: 0.7rem;
            font-weight: 800;
        }
        .process-alert-status.critical {
            background: #fee2e2;
            color: #991b1b;
        }
        .process-alert-status.warning {
            background: #fef3c7;
            color: #92400e;
        }
        .process-alert-details {
            max-height: 120px;
            overflow-y: auto;
            font-size: 0.68rem;
            color: #475569;
            line-height: 1.4;
        }
        .process-level-label rect {
            fill: rgba(255, 255, 255, 0.86);
            stroke: #cbd5e1;
            stroke-width: 1.5;
        }
        .process-level-label text {
            fill: #0f172a;
            font-family: Arial, sans-serif;
            font-weight: 800;
            text-anchor: middle;
            dominant-baseline: middle;
            pointer-events: none;
        }
        .process-modal[hidden] { display: none; }
        .process-modal {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, 0.78);
        }
        .process-modal-dialog {
            width: min(100%, 420px);
            padding: 22px;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        }
        .process-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
        }
        .process-modal-title {
            margin: 0;
            color: #0f172a;
            font-size: 1.1rem;
        }
        .process-modal-close {
            border: 0;
            border-radius: 7px;
            background: #e2e8f0;
            color: #0f172a;
            padding: 6px 10px;
            font-size: 1.1rem;
            font-weight: 800;
            cursor: pointer;
        }
        .process-modal-details {
            display: grid;
            gap: 10px;
            color: #334155;
            font-size: 0.95rem;
        }
        .glow-blue {
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 1)) !important;
        }
        .glow-red {
            filter: drop-shadow(0 0 8px rgba(239, 68, 68, 1)) !important;
        }
        .glow-yellow {
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 1)) !important;
        }
        .sensor-disconnect-control {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #475569;
            font-size: 0.65rem;
            font-weight: 700;
        }
        .process-user-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .process-user-controls select {
            max-width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 7px;
            background: #fff;
            color: #334155;
            padding: 7px;
            font-size: 0.7rem;
        }

        #tarjeta-visualizacion {
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
        }

        #contenedor-svg {
            width: 100%;
            height: 100%;
            overflow: auto;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            padding: 15px;
        }

        #contenedor-svg svg {
            display: block;
            height: 100%;
            width: auto;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        @media (max-width: 900px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
                height: auto;
                min-height: 0;
                padding: 8px;
                gap: 10px;
            }

            .tarjeta-hmi {
                padding: 10px;
            }

            #tarjeta-visualizacion {
                order: -1;
                min-width: 0;
                min-height: 65vh;
            }

            #panel-instrumentacion {
                order: 1;
                height: auto;
                max-height: none;
                overflow: visible;
            }

            #contenedor-svg {
                width: 100%;
                height: auto;
                flex: 1 1 auto;
                min-height: 0;
                min-width: 0;
                overflow: hidden;
                padding: 0;
            }

            #contenedor-svg svg {
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }
        }
    </style>
    <div class="dashboard-grid">
        <div id="panel-instrumentacion" class="tarjeta-hmi">
            <h2>SCADA HMI - USAC</h2>
            <div class="subtitle">Control de Variables</div>
            <div class="process-user-controls">
                <select id="process-role-selector" aria-label="Rol de usuario" onchange="switchProcessUser(this.value)">
                    <option value="op_01">Ver como Operador</option>
                    <option value="sup_01">Ver como Supervisor</option>
                    <option value="adm_01" selected>Ver como Administrador</option>
                </select>
                <button id="developer-mode-toggle" class="control-mode-button" type="button" onclick="toggleDeveloperMode()" aria-expanded="false" hidden>⚙️ Modo Desarrollador</button>
            </div>
            <div class="priority-card">
                <div class="priority-title">Prioridad de Llenado</div>
                <div id="filling-priority-current" class="priority-current" aria-live="polite">Prioridad Actual: Cargando...</div>
                <div id="filling-priority-actions" class="priority-actions" hidden>
                    <button class="priority-button" data-priority="2" type="button" onclick="setFillingPriority(2)">T2</button>
                    <button class="priority-button" data-priority="3" type="button" onclick="setFillingPriority(3)">T3</button>
                    <button class="priority-button" data-priority="1" type="button" onclick="setFillingPriority(1)">Intercalado</button>
                </div>
            </div>
            <div id="process-alert-status" class="process-alert-status" aria-live="polite">Sistema sin alarmas activas</div>
            <div id="process-alert-details" class="process-alert-details" aria-live="polite"></div>
            ${controlesHTML}
        </div>

        <div id="tarjeta-visualizacion" class="tarjeta-hmi">
            <div id="contenedor-svg">
                ${svgRawText}
            </div>
        </div>
    </div>
    <div id="process-info-modal" class="process-modal" hidden role="dialog" aria-modal="true" aria-labelledby="process-modal-title" onclick="if (event.target === this) closeProcessInfoModal()">
        <div class="process-modal-dialog">
            <div class="process-modal-header">
                <h3 id="process-modal-title" class="process-modal-title"></h3>
                <button id="process-modal-close" class="process-modal-close" type="button" aria-label="Cerrar" onclick="closeProcessInfoModal()">X</button>
            </div>
            <div id="process-modal-details" class="process-modal-details"></div>
        </div>
    </div>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <script>
        const actuadoresData = ${JSON.stringify(actuadores)};
        const estadosActuadores = Array(actuadoresData.length).fill(true);
        const dimensionesOriginalesTanques = {};
        const sensorActuators = { 7: "sensor1", 6: "sensor2", 5: "sensor3" };
        const sensorActuatorIndexes = { sensor1: 7, sensor2: 6, sensor3: 5 };
        const sensorLevels = {};
        const sensorDisconnected = { sensor1: false, sensor2: false, sensor3: false };
        const originalProcessFills = new WeakMap();
        const processOverlays = new Map();
        const actuatorStatePaths = {
            0: "monitoreo/bomba",
            1: "monitoreo/valvula",
            2: "system_live/controles/tuberias/base",
            3: "system_live/controles/tuberias/t2",
            4: "system_live/controles/tuberias/t3",
            5: "monitoreo/tanque3Activo",
            6: "monitoreo/tanque2Activo",
            7: "monitoreo/tanque1Activo"
        };
        const firebaseConfig = {
            databaseURL: ${JSON.stringify(config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/')}
        };
        firebase.initializeApp(firebaseConfig);
        const firebaseDatabase = firebase.database();
        const PROCESS_COLORS = {
            blue: "#3b82f6",
            red: "#ef4444",
            yellow: "#fbbf24"
        };
        const USERS = {
            "op_01": { name: "Operador_01", role: "OPERADOR" },
            "sup_01": { name: "Supervisor_01", role: "SUPERVISOR" },
            "adm_01": { name: "Admin_USAC", role: "ADMINISTRADOR" }
        };
        let currentUser = USERS.adm_01;
        let developerMode = false;
        let pumpActive = false;
        let simulatedPumpFault = false;
        let interleavedTank = 3;
        let valveActive = false;
        let emergencyStopActive = false;
        let fillingPriority = 1;
        let activeAlarms = [];
        let activeProcessInfo = null;
        let processLevelLabels = new Map();
        const processReadErrors = new Set();
        const pipeStates = { base: false, t2: false, t3: false };

        function writeFirebase(path, value) {
            firebaseDatabase.ref(path).set(value).catch(error => {
                console.error("No se pudo actualizar Firebase en " + path, error);
            });
        }

        const fillingPriorityNames = {
            1: "Intercalado",
            2: "Tanque 2",
            3: "Tanque 3"
        };

        function renderFillingPriority(value) {
            const priority = Number(value);
            const name = fillingPriorityNames[priority];
            document.getElementById("filling-priority-current").textContent = name
                ? "Prioridad Actual: " + name
                : "Prioridad Actual: No configurada";
            document.querySelectorAll(".priority-button").forEach(button => {
                const isSelected = Number(button.dataset.priority) === priority;
                button.classList.toggle("active", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            });
        }

        function setFillingPriority(value) {
            if (!currentUser || currentUser.role !== "ADMINISTRADOR") return;
            if (!Number.isInteger(value) || !Object.prototype.hasOwnProperty.call(fillingPriorityNames, value)) return;

            firebaseDatabase.ref("system_live/controles/prioridad").set(value).catch(error => {
                console.error("No se pudo actualizar la prioridad de llenado en Firebase", error);
                alert("No se pudo actualizar la prioridad de llenado. Revisa la conexión y los permisos de Firebase.");
            });
        }

        function applyProcessRole() {
            const isAdmin = currentUser && currentUser.role === "ADMINISTRADOR";
            const developerButton = document.getElementById("developer-mode-toggle");
            developerButton.hidden = !isAdmin;
            document.getElementById("filling-priority-actions").hidden = !isAdmin;

            if (!isAdmin) {
                developerMode = false;
                simulatedPumpFault = false;
                document.getElementById("process-role-selector").value =
                    Object.keys(USERS).find(uid => USERS[uid] === currentUser) || "op_01";
                const faultButton = document.getElementById("simulate-pump-fault");
                faultButton.classList.remove("active");
                faultButton.textContent = "Simular falla";
            }

            developerButton.setAttribute("aria-expanded", String(isAdmin && developerMode));
            developerButton.textContent = developerMode ? "⚙️ Ocultar controles" : "⚙️ Modo Desarrollador";
            document.querySelectorAll(".developer-control").forEach(control => {
                const isVisible = Boolean(isAdmin && developerMode);
                control.hidden = !isVisible;
                if ("disabled" in control) control.disabled = !isVisible;
            });
            const pumpButton = document.getElementById("toggle-0");
            pumpButton.disabled = !isAdmin || !developerMode;
            pumpButton.setAttribute("aria-label", "Bomba " + (pumpActive ? "encendida" : "apagada"));
        }

        function switchProcessUser(uid) {
            if (!Object.prototype.hasOwnProperty.call(USERS, uid)) return;
            currentUser = USERS[uid];
            applyProcessRole();
            renderIndustrialState();
        }

        function toggleDeveloperMode() {
            if (!currentUser || currentUser.role !== "ADMINISTRADOR") return;
            developerMode = !developerMode;
            applyProcessRole();
        }

        function toggleSimulatedPumpFault() {
            if (!currentUser || currentUser.role !== "ADMINISTRADOR" || !developerMode) return;
            simulatedPumpFault = !simulatedPumpFault;
            const button = document.getElementById("simulate-pump-fault");
            button.classList.toggle("active", simulatedPumpFault);
            button.textContent = simulatedPumpFault ? "Quitar falla" : "Simular falla";
            renderIndustrialState();
        }

        function parseActuatorState(value) {
            if (value && typeof value === "object") {
                value = value.activo ?? value.estado ?? value.active ?? value.on;
            }
            const normalizedValue = String(value).toLowerCase();
            return value === true || value === 1 ||
                normalizedValue === "true" || normalizedValue === "1" ||
                normalizedValue === "on" || normalizedValue === "encendida" ||
                normalizedValue === "abierta";
        }

        function recordProcessReadError(path, error) {
            console.error("Error leyendo " + path, error);
            processReadErrors.add(path);
            renderIndustrialState();
        }

        function clearProcessReadError(path) {
            processReadErrors.delete(path);
        }

        function getAlarmSeverity(alarm) {
            const rawLevel = String(alarm.nivel || alarm.severity || alarm.tipo || "warning").toLowerCase();
            if (rawLevel.includes("critic") || rawLevel.includes("high")) return "critical";
            if (rawLevel.includes("info")) return "info";
            return "warning";
        }

        function renderProcessAlertStatus() {
            const status = document.getElementById("process-alert-status");
            const details = document.getElementById("process-alert-details");
            const hasCriticalAlarm = activeAlarms.some(alarm => getAlarmSeverity(alarm) === "critical");
            const hasWarningAlarm = activeAlarms.some(alarm => getAlarmSeverity(alarm) === "warning");
            status.classList.toggle("critical", emergencyStopActive || simulatedPumpFault || hasCriticalAlarm);
            status.classList.toggle("warning", !emergencyStopActive && !simulatedPumpFault &&
                !hasCriticalAlarm && (processReadErrors.size > 0 || hasWarningAlarm));

            if (emergencyStopActive) status.textContent = "E-STOP ACTIVO";
            else if (simulatedPumpFault) status.textContent = "FALLA DE BOMBA SIMULADA";
            else if (processReadErrors.size > 0) {
                status.textContent = "ERROR DE SINCRONIZACIÓN: " + processReadErrors.size + " señal(es)";
            }
            else if (activeAlarms.length) status.textContent =
                "ALARMAS ACTIVAS: " + activeAlarms.length;
            else status.textContent = "Sistema sin alarmas activas";

            const descriptions = activeAlarms.map(alarm =>
                String(alarm.mensaje || alarm.msg || alarm.detalle || alarm.cod || "Alarma sin descripción"));
            if (emergencyStopActive) descriptions.unshift("Parada de emergencia activa");
            if (simulatedPumpFault) descriptions.unshift("Falla crítica simulada en la bomba");
            if (processReadErrors.size) descriptions.push("Error leyendo señal(es): " + Array.from(processReadErrors).join(", "));
            details.replaceChildren(...descriptions.map(description => {
                const item = document.createElement("div");
                item.textContent = description;
                return item;
            }));
        }

        function getProcessAlarmOverrides() {
            const overrides = new Map();
            const addOverride = (target, color) => {
                const current = overrides.get(target);
                if (color === PROCESS_COLORS.red || !current) overrides.set(target, color);
            };

            if (emergencyStopActive) {
                [0, 1, 2, 3, 4, 5, 6, 7].forEach(target =>
                    addOverride(target, PROCESS_COLORS.red));
                return overrides;
            }

            if (simulatedPumpFault) {
                [0, 1, 2, 3, 4, 5, 6, 7].forEach(target =>
                    addOverride(target, PROCESS_COLORS.red));
                return overrides;
            }

            if (activeAlarms.length > 0) {
                const processAlarms = activeAlarms.filter(alarm => alarm.tipo !== "sensor");
                const color = processAlarms.some(alarm => getAlarmSeverity(alarm) === "critical")
                    ? PROCESS_COLORS.red
                    : processAlarms.some(alarm => getAlarmSeverity(alarm) === "warning")
                        ? PROCESS_COLORS.yellow
                        : null;
                if (color) {
                    [0, 1, 2, 3, 4, 5, 6, 7].forEach(target => addOverride(target, color));
                }
            }
            if (processReadErrors.size) {
                [0, 1, 2, 3, 4, 5, 6, 7].forEach(target =>
                    addOverride(target, PROCESS_COLORS.yellow));
            }
            return overrides;
        }

        function renderIndustrialState() {
            const route = { base: false, t2: false, t3: false, valve: valveActive };
            if (pumpActive) {
                if (fillingPriority === 2) {
                    route.base = true;
                    route.t2 = true;
                } else if (fillingPriority === 3) {
                    route.base = true;
                    route.t3 = true;
                } else {
                    route.base = true;
                    route[interleavedTank === 2 ? "t2" : "t3"] = true;
                }
            }

            const normalColors = [
                pumpActive ? PROCESS_COLORS.blue : null,
                route.valve ? PROCESS_COLORS.blue : null,
                route.base ? PROCESS_COLORS.blue : null,
                route.t2 ? PROCESS_COLORS.blue : null,
                route.t3 ? PROCESS_COLORS.blue : null
            ];
            const overrides = getProcessAlarmOverrides();
            normalColors.forEach((color, index) =>
                paintProcessElement(index, overrides.get(index) || color));

            [5, 6, 7].forEach(index => {
                const alarmColor = overrides.get(index);
                if (sensorDisconnected[actuadoresData[index].sensor]) renderTankLevel(index);
                else if (alarmColor) paintTankAlarm(index, alarmColor);
                else renderTankLevel(index);
            });
            const pumpButton = document.getElementById("toggle-0");
            pumpButton.textContent = pumpActive ? "ON" : "OFF";
            pumpButton.classList.toggle("active", pumpActive);
            pumpButton.classList.toggle("inactive", !pumpActive);
            pumpButton.setAttribute("aria-label", "Bomba " + (pumpActive ? "encendida" : "apagada"));
            const valveButton = document.getElementById("toggle-1");
            valveButton.textContent = valveActive ? "ON" : "OFF";
            valveButton.classList.toggle("active", valveActive);
            valveButton.classList.toggle("inactive", !valveActive);
            renderProcessAlertStatus();
        }

        function setupProcessFirebaseListeners() {
            const priorityPath = "system_live/controles/prioridad";
            firebaseDatabase.ref(priorityPath).on("value", snapshot => {
                clearProcessReadError(priorityPath);
                fillingPriority = Number(snapshot.val());
                if (!Object.prototype.hasOwnProperty.call(fillingPriorityNames, fillingPriority)) {
                    fillingPriority = 1;
                }
                renderFillingPriority(snapshot.val());
                renderIndustrialState();
            }, error => {
                recordProcessReadError(priorityPath, error);
                document.getElementById("filling-priority-current").textContent =
                    "No fue posible cargar la prioridad desde Firebase.";
            });

            const pumpPath = "monitoreo/bomba";
            firebaseDatabase.ref(pumpPath).on("value", snapshot => {
                clearProcessReadError(pumpPath);
                setPumpState(snapshot.val() !== null && parseActuatorState(snapshot.val()));
                renderIndustrialState();
            }, error => recordProcessReadError(pumpPath, error));

            ["base", "t2", "t3"].forEach(pipe => {
                const path = "system_live/controles/tuberias/" + pipe;
                firebaseDatabase.ref(path).on("value", snapshot => {
                    clearProcessReadError(path);
                    pipeStates[pipe] = snapshot.val() !== null && parseActuatorState(snapshot.val());
                    const actuatorIndex = { base: 2, t2: 3, t3: 4 }[pipe];
                    updateActuatorState(actuatorIndex, pipeStates[pipe]);
                    renderIndustrialState();
                }, error => recordProcessReadError(path, error));
            });

            const applyValveState = value => {
                valveActive = parseActuatorState(value);
                updateActuatorState(1, valveActive);
                renderIndustrialState();
                updateProcessInfoModal();
            };
            const systemValvePath = "system_live/controles/valvula";
            firebaseDatabase.ref(systemValvePath).on("value", snapshot => {
                clearProcessReadError(systemValvePath);
                if (snapshot.val() !== null) applyValveState(snapshot.val());
                else renderIndustrialState();
            }, error => recordProcessReadError(systemValvePath, error));
            const monitorValvePath = "monitoreo/valvula";
            firebaseDatabase.ref(monitorValvePath).on("value", snapshot => {
                clearProcessReadError(monitorValvePath);
                if (snapshot.val() !== null) applyValveState(snapshot.val());
                else renderIndustrialState();
            }, error => recordProcessReadError(monitorValvePath, error));

            const estopPath = "system_live/controles/estop";
            firebaseDatabase.ref(estopPath).on("value", snapshot => {
                clearProcessReadError(estopPath);
                emergencyStopActive = snapshot.val() !== null && parseActuatorState(snapshot.val());
                renderIndustrialState();
            }, error => recordProcessReadError(estopPath, error));

            const alarmsPath = "system_live/alarmas";
            firebaseDatabase.ref(alarmsPath).on("value", snapshot => {
                clearProcessReadError(alarmsPath);
                activeAlarms = [];
                snapshot.forEach(child => {
                    const alarm = child.val();
                    if (alarm && typeof alarm === "object") activeAlarms.push(alarm);
                });
                renderIndustrialState();
            }, error => {
                recordProcessReadError(alarmsPath, error);
            });
        }

        function handleSliderInput(idx) {
            if (!currentUser || currentUser.role !== "ADMINISTRADOR" || !developerMode) return;
            const slider = document.getElementById("slider-" + idx);
            if (!slider || !sensorActuators[idx]) return;
            const level = Math.max(0, Math.min(100, Number(slider.value)));
            if (!Number.isFinite(level)) return;
            sensorLevels[sensorActuators[idx]] = level;
            renderTankLevel(idx);
            writeFirebase("monitoreo/" + sensorActuators[idx], level);
        }

        function updateActuatorState(idx, isOn) {
            estadosActuadores[idx] = isOn;
            const button = document.getElementById("toggle-" + idx);
            const container = document.getElementById("container-" + idx);
            if (!button || !container) return;
            button.innerText = isOn ? "ON" : "OFF";
            button.classList.toggle("active", isOn);
            button.classList.toggle("inactive", !isOn);
            container.classList.toggle("disabled-ui", !isOn);
            updateElementColor(idx);
        }

        function setupFirebaseListeners() {
            ["sensor1", "sensor2", "sensor3"].forEach(sensor => {
                firebaseDatabase.ref("monitoreo/" + sensor).on("value", snapshot => {
                    if (snapshot.val() === null) return;
                    const value = Number(snapshot.val());
                    if (!Number.isFinite(value)) return;

                    const idx = sensorActuatorIndexes[sensor];
                    const clamped = Math.max(0, Math.min(100, value));
                    sensorLevels[sensor] = clamped;
                    const slider = document.getElementById("slider-" + idx);
                    if (slider) slider.value = String(clamped);
                    renderTankLevel(idx);
                    renderIndustrialState();
                }, error => console.error("Error leyendo monitoreo/" + sensor, error));

                const errorPath = "monitoreo/" + sensor + "_error";
                firebaseDatabase.ref(errorPath).on("value", snapshot => {
                    clearProcessReadError(errorPath);
                    sensorDisconnected[sensor] =
                        snapshot.val() !== null && parseActuatorState(snapshot.val());
                    renderTankLevel(sensorActuatorIndexes[sensor]);
                    renderIndustrialState();
                }, error => recordProcessReadError(errorPath, error));
            });

            [5, 6, 7].forEach(idx => {
                const path = actuatorStatePaths[idx];
                firebaseDatabase.ref(path).on("value", snapshot => {
                    if (snapshot.val() === null) return;
                    updateActuatorState(idx, parseActuatorState(snapshot.val()));
                    renderIndustrialState();
                }, error => console.error("Error leyendo " + path, error));
            });

        }

        // Limpieza explícita del cuadro rojo de fondo de la válvula
        const cuadroViejo = document.getElementById("Rectangulos_opacos_7_valula");
        if(cuadroViejo) cuadroViejo.remove();

        // Corrección de mezcla para capas de fondo
        const capasBloqueo = ["Capa_3_tanques", "Capa_Fondo_Tanques", "Fondo_azul_estatico"];
        capasBloqueo.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.mixBlendMode = "multiply"; 
        });

        function toggleActuador(idx) {
            if (!currentUser || currentUser.role !== "ADMINISTRADOR" || !developerMode) return;
            const btn = document.getElementById("toggle-" + idx);
            if (!btn || btn.disabled) return;
            const container = document.getElementById("container-" + idx);
            const currentState = idx === 0 ? pumpActive : estadosActuadores[idx];
            estadosActuadores[idx] = !currentState;
            if (idx === 0) setPumpState(estadosActuadores[idx]);

            if (estadosActuadores[idx]) {
                btn.innerText = "ON";
                btn.classList.add("active");
                btn.classList.remove("inactive");
                if (container) container.classList.remove("disabled-ui");
            } else {
                btn.innerText = "OFF";
                btn.classList.add("inactive");
                btn.classList.remove("active");
                if (container) container.classList.add("disabled-ui");
            }
            if (idx === 1) {
                writeFirebase("system_live/controles/valvula", estadosActuadores[idx]);
                writeFirebase("monitoreo/valvula", estadosActuadores[idx]);
            } else {
                writeFirebase(actuatorStatePaths[idx], estadosActuadores[idx]);
            }
            if (idx < 5) renderIndustrialState();
        }

        function setPumpState(isOn) {
            if (isOn && !pumpActive) {
                interleavedTank = interleavedTank === 2 ? 3 : 2;
            }
            pumpActive = isOn;
            estadosActuadores[0] = isOn;
            const button = document.getElementById("toggle-0");
            if (button) {
                button.textContent = isOn ? "ON" : "OFF";
                button.classList.toggle("active", isOn);
                button.classList.toggle("inactive", !isOn);
                button.setAttribute("aria-label", "Bomba " + (isOn ? "encendida" : "apagada"));
            }
            updateProcessInfoModal();
        }

        function updateElementColor(idx) {
            if (idx >= 0 && idx < 5) {
                renderIndustrialState();
                return;
            }
            renderTankLevel(idx);
        }

        function paintProcessElement(idx, colorHex) {
            const config = actuadoresData[idx];
            const badge = document.getElementById("statusLabel-" + idx);
            if (!config || !badge) return;

            const isBlue = colorHex === PROCESS_COLORS.blue;
            const isRed = colorHex === PROCESS_COLORS.red;
            const isWarning = colorHex === PROCESS_COLORS.yellow;
            const label = isRed ? "FALLA CRÍTICA"
                : isWarning ? "ADVERTENCIA"
                    : isBlue ? "FLUJO ACTIVO"
                        : "EN REPOSO";

            config.ids.forEach(id => {
                const element = document.getElementById(id);
                if (!element) return;

                if (config.tipo === "bomba") {
                    const previousOverlay = processOverlays.get(id);
                    if (previousOverlay) {
                        previousOverlay.remove();
                        processOverlays.delete(id);
                    }

                    element.classList.remove("glow-blue", "glow-red", "glow-yellow");
                    if (!colorHex || !element.parentNode) return;

                    const overlay = element.cloneNode(true);
                    overlay.id = "process-overlay-" + id;
                    overlay.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
                    overlay.style.mixBlendMode = "color";
                    overlay.style.pointerEvents = "none";
                    overlay.style.filter = colorHex === PROCESS_COLORS.red
                        ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.95))"
                        : colorHex === PROCESS_COLORS.yellow
                            ? "drop-shadow(0 0 6px rgba(251, 191, 36, 0.95))"
                            : "drop-shadow(0 0 5px rgba(59, 130, 246, 0.9))";

                    const overlayShapes = ["path", "rect", "polygon", "circle", "ellipse"].includes(overlay.tagName.toLowerCase())
                        ? [overlay]
                        : overlay.querySelectorAll("path, rect, polygon, circle, ellipse");
                    overlayShapes.forEach(shape => {
                        shape.setAttribute("fill", colorHex);
                        shape.style.setProperty("fill", colorHex);
                    });
                    element.parentNode.appendChild(overlay);
                    processOverlays.set(id, overlay);
                    element.classList.add(isRed ? "glow-red" : isWarning ? "glow-yellow" : "glow-blue");
                    return;
                }

                const isPipe = config.tipo === "tuberia";
                element.classList.remove("glow-blue", "glow-red", "glow-yellow");
                const shapes = ["path", "rect", "polygon", "circle", "ellipse"].includes(element.tagName.toLowerCase())
                    ? [element]
                    : element.querySelectorAll("path, rect, polygon, circle, ellipse");
                if (isPipe) {
                    const glowClass = colorHex
                        ? (isRed ? "glow-red" : isWarning ? "glow-yellow" : "glow-blue")
                        : null;
                    [element, ...shapes].forEach(shape => {
                        shape.classList.remove("glow-blue", "glow-red", "glow-yellow");
                        if (glowClass) shape.classList.add(glowClass);
                    });
                }
                shapes.forEach(shape => {
                    if (!originalProcessFills.has(shape)) {
                        originalProcessFills.set(shape, {
                            fillAttribute: shape.getAttribute("fill"),
                            fillStyle: shape.style.getPropertyValue("fill"),
                            fillPriority: shape.style.getPropertyPriority("fill")
                        });
                    }

                    if (colorHex) {
                        shape.setAttribute("fill", colorHex);
                        shape.style.setProperty("fill", colorHex);
                        return;
                    }

                    const original = originalProcessFills.get(shape);
                    if (original.fillAttribute === null) shape.removeAttribute("fill");
                    else shape.setAttribute("fill", original.fillAttribute);
                    if (original.fillStyle) {
                        shape.style.setProperty("fill", original.fillStyle, original.fillPriority);
                    } else {
                        shape.style.removeProperty("fill");
                    }
                });
            });

            badge.style.backgroundColor = colorHex || "";
            badge.style.color = colorHex === PROCESS_COLORS.yellow ? "#1e293b" : colorHex ? "#fff" : "";
            badge.textContent = config.nombre.toUpperCase() + ": " + label;
        }

        function paintTankAlarm(idx, color) {
            const config = actuadoresData[idx];
            if (!config || config.tipo !== "tanque") return;
            const badge = document.getElementById("statusLabel-" + idx);
            if (!badge) return;
            paintProcessElement(idx, color);
        }

        function renderProcessIndicators() {
            processLevelLabels.forEach(({ group, background, text }, sensor) => {
                const config = actuadoresData.find(act => act.tipo === "tanque" && act.sensor === sensor);
                const dimensions = config && dimensionesOriginalesTanques[config.clipId];
                if (!config || !dimensions) return;

                const level = sensorLevels[sensor];
                const label = sensorDisconnected[sensor]
                    ? config.tanque + ": SIN SEÑAL"
                    : typeof level === "number"
                        ? config.tanque + ": " + Math.round(level) + "%"
                        : config.tanque + ": --%";
                const fontSize = Math.max(12, Math.min(20, dimensions.width * 0.09));
                const width = Math.min(dimensions.width * 0.94, Math.max(fontSize * 3.2, label.length * fontSize * 0.58 + 18));
                const height = fontSize * 1.65;
                const centerX = dimensions.x + dimensions.width / 2;
                const centerY = dimensions.y + dimensions.height / 2;

                group.setAttribute("transform", "translate(" + centerX + " " + centerY + ")");
                background.setAttribute("x", String(-width / 2));
                background.setAttribute("y", String(-height / 2));
                background.setAttribute("width", String(width));
                background.setAttribute("height", String(height));
                background.setAttribute("rx", String(height * 0.2));
                text.setAttribute("font-size", String(fontSize));
                text.textContent = label;
            });
        }

        function updateProcessInfoModal() {
            if (!activeProcessInfo) return;
            const title = document.getElementById("process-modal-title");
            const details = document.getElementById("process-modal-details");
            if (!title || !details) return;

            const { type, index } = activeProcessInfo;
            const config = actuadoresData[index];
            if (!config) return;
            title.textContent = config.tipo === "tanque"
                ? (config.tanque === "T1" ? "Depósito Principal" : config.nombre.replace(/^Nivel /, ""))
                : config.nombre;

            const rows = [];
            if (type === "tank") {
                const sensor = config.sensor;
                const level = sensorLevels[sensor];
                rows.push(["Nivel actual", sensorDisconnected[sensor] || typeof level !== "number"
                    ? "No disponible"
                    : Math.round(level) + "%"]);
                rows.push(["Estado del sensor", sensorDisconnected[sensor] ? "Desconectado" : "Conectado"]);
            } else if (type === "pump") {
                rows.push(["Estado actual", pumpActive ? "ON" : "OFF"]);
                rows.push(["Tiempo de funcionamiento", "No disponible"]);
            } else if (type === "valve") {
                rows.push(["Posición actual", valveActive ? "T2" : "T3"]);
            }

            details.replaceChildren(...rows.map(([label, value]) => {
                const row = document.createElement("div");
                const labelElement = document.createElement("strong");
                labelElement.textContent = label + ": ";
                row.append(labelElement, document.createTextNode(value));
                return row;
            }));
        }

        function openProcessInfo(type, index) {
            activeProcessInfo = { type, index };
            const modal = document.getElementById("process-info-modal");
            updateProcessInfoModal();
            modal.hidden = false;
            document.getElementById("process-modal-close").focus();
        }

        function closeProcessInfoModal() {
            const modal = document.getElementById("process-info-modal");
            if (modal) modal.hidden = true;
            activeProcessInfo = null;
        }

        function setupProcessDiagramInteractions() {
            const svg = document.querySelector("#contenedor-svg > svg");
            if (!svg) return;

            const svgNamespace = "http://www.w3.org/2000/svg";
            let labelLayer = svg.querySelector("#process-level-labels");
            if (!labelLayer) {
                labelLayer = document.createElementNS(svgNamespace, "g");
                labelLayer.id = "process-level-labels";
                labelLayer.setAttribute("pointer-events", "none");
                svg.appendChild(labelLayer);
            }

            const targetIndexes = new Map();
            actuadoresData.forEach((config, index) => {
                const targets = config.tipo === "tanque"
                    ? [...config.ids, config.idFondo]
                    : config.ids;
                targets.filter(Boolean).forEach(id => {
                    const target = document.getElementById(id);
                    if (!target) return;
                    target.style.cursor = "pointer";
                    target.style.pointerEvents = "auto";
                    targetIndexes.set(id, index);
                });

                if (config.tipo === "tanque") {
                    const group = document.createElementNS(svgNamespace, "g");
                    group.setAttribute("class", "process-level-label");
                    group.setAttribute("pointer-events", "none");
                    const background = document.createElementNS(svgNamespace, "rect");
                    const text = document.createElementNS(svgNamespace, "text");
                    group.append(background, text);
                    labelLayer.appendChild(group);
                    processLevelLabels.set(config.sensor, { group, background, text });
                }
            });

            svg.addEventListener("click", event => {
                let target = event.target;
                while (target && target !== svg) {
                    const index = targetIndexes.get(target.id);
                    if (index !== undefined) {
                        const type = actuadoresData[index].tipo === "tanque"
                            ? "tank"
                            : index === 0 ? "pump" : index === 1 ? "valve" : null;
                        if (type) openProcessInfo(type, index);
                        return;
                    }
                    target = target.parentNode;
                }
            });
        }

        function renderTankLevel(idx) {
            const config = actuadoresData[idx];
            if (!config || config.tipo !== "tanque") return;

            const sensor = config.sensor;
            const slider = document.getElementById("slider-" + idx);
            const badge = document.getElementById("statusLabel-" + idx);
            const textPct = document.getElementById("colorTxt-" + idx);
            const element = document.getElementById(config.ids[0]);
            if (!slider || !badge || !textPct || !element) return;

            const disconnectControl = document.getElementById("sensor-error-" + sensor);
            if (disconnectControl) disconnectControl.checked = sensorDisconnected[sensor];
            if (sensorDisconnected[sensor]) {
                slider.disabled = true;
                textPct.textContent = "--";
                textPct.style.color = "#64748b";
                element.setAttribute("fill", "#64748b");
                element.style.fill = "#64748b";
                element.style.opacity = "0.5";

                const clipRect = document.getElementById(config.clipId);
                const dimensions = dimensionesOriginalesTanques[config.clipId];
                if (clipRect && dimensions) {
                    clipRect.setAttribute("x", dimensions.x);
                    clipRect.setAttribute("y", dimensions.y);
                    clipRect.setAttribute("width", dimensions.width);
                    clipRect.setAttribute("height", dimensions.height);
                }

                badge.style.backgroundColor = "#64748b";
                badge.style.color = "#fff";
                badge.textContent = config.nombre.toUpperCase() + ": SENSOR DESCONECTADO";
                renderProcessIndicators();
                updateProcessInfoModal();
                return;
            }

            slider.disabled = false;
            const level = Math.max(0, Math.min(100, sensorLevels[sensor] ?? Number(slider.value)));
            if (!Number.isFinite(level)) return;
            slider.value = String(level);
            textPct.textContent = String(Math.round(level));
            textPct.style.color = PROCESS_COLORS.blue;

            element.setAttribute("fill", PROCESS_COLORS.blue);
            element.style.fill = PROCESS_COLORS.blue;
            element.style.opacity = "0.8";

            const clipRect = document.getElementById(config.clipId);
            const dimensions = dimensionesOriginalesTanques[config.clipId];
            if (clipRect && dimensions) {
                const height = dimensions.height * (level / 100);
                clipRect.setAttribute("x", dimensions.x);
                clipRect.setAttribute("y", dimensions.y + dimensions.height - height);
                clipRect.setAttribute("width", dimensions.width);
                clipRect.setAttribute("height", height);
            }

            badge.style.backgroundColor = "";
            badge.style.color = "";
            badge.textContent = config.nombre.toUpperCase() + " AL " + Math.round(level) + "%";
            renderProcessIndicators();
            updateProcessInfoModal();
        }

        async function setSensorDisconnected(sensor, isDisconnected) {
            if (!currentUser || currentUser.role !== "ADMINISTRADOR" || !developerMode) return;
            if (!Object.prototype.hasOwnProperty.call(sensorDisconnected, sensor)) return;
            if (typeof isDisconnected !== "boolean") return;

            const alarmRef = firebaseDatabase.ref("system_live/alarmas/sensor_error_" + sensor);
            const alarm = {
                mensaje: "Fallo de comunicación en " + sensor.toUpperCase(),
                nivel: "warning",
                tipo: "sensor",
                hora: new Date().toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                })
            };
            const sensorErrorRef = firebaseDatabase.ref("monitoreo/" + sensor + "_error");

            try {
                await Promise.all([
                    sensorErrorRef.set(isDisconnected),
                    isDisconnected ? alarmRef.set(alarm) : alarmRef.remove()
                ]);
            } catch (error) {
                console.error("No se pudo actualizar el estado de desconexión de " + sensor, error);
                alert("No se pudo actualizar el estado del sensor en Firebase. Revisa la conexión y los permisos.");
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            actuadoresData.forEach((act) => {
                if (act.tipo === "tanque") {
                    const elAgua = document.getElementById(act.ids[0]);
                    if (elAgua) {
                        const bbox = elAgua.getBBox();
                        // Almacenamos el área real del rectángulo de agua
                        dimensionesOriginalesTanques[act.clipId] = {
                            x: bbox.x,
                            y: bbox.y,
                            width: bbox.width,
                            height: bbox.height
                        };
                        // Enlazamos de forma limpia el agua al clipPath inyectado
                        elAgua.setAttribute("clip-path", "url(#" + act.clipId.replace("-rect", "") + ")");
                    }
                }
            });

            setupProcessDiagramInteractions();
            actuadoresData.forEach((act, idx) => {
                if (act.tipo === "tanque") renderTankLevel(idx);
            });
            applyProcessRole();
            renderFillingPriority(null);
            renderIndustrialState();
            setupFirebaseListeners();
            setupProcessFirebaseListeners();
            document.addEventListener("keydown", event => {
                if (event.key === "Escape") closeProcessInfoModal();
            });
        });
    </script>
      `;

      return renderLayout(content, "proceso");

    } catch (error) {
      throw error;
    }
}
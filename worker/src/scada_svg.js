import { renderLayout } from './layout.js';

export async function renderScadaSvg(config = {}) {
    const urlSvg = "https://res.cloudinary.com/drov8gutj/image/upload/v1779076947/ProcesoCasaV5_Optimizado_kum9ov.svg";

    try {
      const svgResponse = await fetch(urlSvg);
      if (!svgResponse.ok) {
        throw new Error("No se pudo obtener el archivo SVG desde Cloudinary");
      }
      let svgRawText = await svgResponse.text();

      // Inyección de filtros y los contenedores clipPath iniciales vacíos para los tanques
      const inyeccionDefs = `
        <filter id="sombra-hundido" x="-20%" y="-20%" width="140%" height="140%">
          <feOffset dx="0.8" dy="1"/>
          <feGaussianBlur stdDeviation="0.6" result="offset-blur"/>
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
          <feFlood flood-color="#000000" flood-opacity="0.6" result="color"/>
          <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
          <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
        </filter>
        <clipPath id="clip-deposito"><rect id="clip-rect-deposito" x="0" y="0" width="0" height="0" /></clipPath>
        <clipPath id="clip-tanque2"><rect id="clip-rect-tanque2" x="0" y="0" width="0" height="0" /></clipPath>
        <clipPath id="clip-tanque1"><rect id="clip-rect-tanque1" x="0" y="0" width="0" height="0" /></clipPath>
      `;
      
      svgRawText = svgRawText.replace("<defs id=\"defs1\">", `<defs id="defs1">${inyeccionDefs}`);

      // Configuración limpia de actuadores
      const actuadores = [
        { 
          ids: ["Pump", "Motor", "Base"], 
          nombre: "Bomba Completa", 
          initVal: 10, 
          tipo: "bomba" 
        },        
        { 
          ids: ["Shutoff_Housing__x2B__Electric_Box", "Mini_Pipe"], 
          nombre: "Válvula de Seguridad", 
          initVal: 4, 
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
          initVal: 6, 
          tipo: "tuberia", 
          selector: "path, rect, polygon" 
        },
        { 
          ids: ["TuberiaT2_Shape_5"], 
          nombre: "Tubería T2", 
          initVal: 6, 
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
          initVal: 6, 
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
          initVal: 12, 
          tipo: "tanque"
        },
        {
          ids: ["aguaT2"],
          idFondo: "Contenedor_Agua_T2",
          clipId: "clip-rect-tanque2",
          nombre: "Nivel Tanque Central",
          initVal: 12,
          tipo: "tanque"
        },
        {
          ids: ["aguaT1"],
          idFondo: "Contenedor_Agua_T3",
          clipId: "clip-rect-tanque1",
          nombre: "Nivel Tanque Superior",
          initVal: 12,
          tipo: "tanque"
        }
      ];

      // Generación dinámica del panel de controles izquierdo
      const controlesHTML = actuadores.map((act, idx) => `
        <div class="control-card-item" id="container-${idx}">
          <div class="control-card-header">
            <label class="instrument-label">${act.nombre}</label>
            <button class="btn-toggle active" id="toggle-${idx}" onclick="toggleActuador(${idx})">ON</button>
          </div>
          <div class="slider-wrapper">
            <label class="control-label">
              ${act.tipo === 'tanque' ? 'Nivel / Opacidad:' : 'Filtro de Color:'} 
              <span id="colorTxt-${idx}" class="color-percentage">0</span>%
            </label>
            <input type="range" class="scada-range" id="slider-${idx}" min="0" max="19" value="${act.initVal}" oninput="handleSliderInput(${idx})">
          </div>
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

        .efecto-dinamico {
            transition: transform 0.15s ease-in-out, fill 0.25s ease, opacity 0.25s ease;
            transform-origin: center;
        }
    </style>
    <div class="dashboard-grid">
        <div id="panel-instrumentacion" class="tarjeta-hmi">
            <h2>SCADA HMI - USAC</h2>
            <div class="subtitle">Control de Variables</div>
            ${controlesHTML}
        </div>

        <div id="tarjeta-visualizacion" class="tarjeta-hmi">
            <div id="contenedor-svg">
                ${svgRawText}
            </div>
        </div>
    </div>

    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <script>
        const paleta = [
            { n: "GRIS CLARO", c: "#94a3b8", t: "#000" }, { n: "GRIS DEEP", c: "#334155", t: "#fff" },
            { n: "BLANCO", c: "#f8fafc", t: "#000" }, { n: "PLATA DEEP", c: "#cbd5e1", t: "#000" },
            { n: "ROJO ALERTA", c: "#ef4444", t: "#fff" }, { n: "ROJO DEEP", c: "#7f1d1d", t: "#fff" },
            { n: "AZUL AGUA", c: "#3b82f6", t: "#fff" }, { n: "AZUL DEEP", c: "#1e3a8a", t: "#fff" },
            { n: "AMARILLO", c: "#fbbf24", t: "#000" }, { n: "AMARILLO DEEP", c: "#92400e", t: "#fff" },
            { n: "VERDE OK", c: "#22c55e", t: "#fff" }, { n: "VERDE DEEP", c: "#064e3b", t: "#fff" },
            { n: "NARANJA", c: "#f97316", t: "#fff" }, { n: "NARANJA DEEP", c: "#7c2d12", t: "#fff" },
            { n: "CIAN", c: "#06b6d4", t: "#fff" }, { n: "CIAN DEEP", c: "#164e63", t: "#fff" },
            { n: "PÚRPURA", c: "#a855f7", t: "#fff" }, { n: "PÚRPURA DEEP", c: "#4c1d95", t: "#fff" },
            { n: "ROSA", c: "#ec4899", t: "#fff" }, { n: "ROSA DEEP", c: "#831843", t: "#fff" }
        ];

        const coloresOriginalesSvg = {};
        const actuadoresData = ${JSON.stringify(actuadores)};
        const estadosActuadores = Array(actuadoresData.length).fill(true);
        const dimensionesOriginalesTanques = {};
        const sensorActuators = { 7: "sensor1", 6: "sensor2", 5: "sensor3" };
        const firebaseConfig = {
            databaseURL: ${JSON.stringify(config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/')}
        };
        firebase.initializeApp(firebaseConfig);
        const firebaseDatabase = firebase.database();

        function writeFirebase(path, value) {
            firebaseDatabase.ref(path).set(value).catch(error => {
                console.error("No se pudo actualizar Firebase en " + path, error);
            });
        }

        function handleSliderInput(idx) {
            updateElementColor(idx);
            const slider = document.getElementById("slider-" + idx);

            if (sensorActuators[idx]) {
                const nivel = (Number(slider.value) / 19) * 100;
                writeFirebase("monitoreo/" + sensorActuators[idx], Number(nivel.toFixed(1)));
            } else if (idx === 0) {
                writeFirebase("monitoreo/bomba", estadosActuadores[0]);
            }
        }

        function updatePumpFromFirebase(value) {
            const normalizedValue = String(value).toLowerCase();
            const isOn = value === true || value === 1 ||
                normalizedValue === "true" || normalizedValue === "1" ||
                normalizedValue === "on" || normalizedValue === "encendida";
            const button = document.getElementById("toggle-0");
            const container = document.getElementById("container-0");

            estadosActuadores[0] = isOn;
            button.innerText = isOn ? "ON" : "OFF";
            button.className = "btn-toggle " + (isOn ? "active" : "inactive");
            container.classList.toggle("disabled-ui", !isOn);
            document.getElementById("slider-0").value = isOn ? "10" : "4";
            updateElementColor(0);
        }

        function setupFirebaseListeners() {
            ["sensor1", "sensor2", "sensor3"].forEach(sensor => {
                firebaseDatabase.ref("monitoreo/" + sensor).on("value", snapshot => {
                    const value = Number(snapshot.val());
                    if (!Number.isFinite(value)) return;

                    const idx = { sensor1: 7, sensor2: 6, sensor3: 5 }[sensor];
                    const clamped = Math.max(0, Math.min(100, value));
                    document.getElementById("slider-" + idx).value =
                        String(Math.round((clamped / 100) * 19));
                    updateElementColor(idx);
                }, error => console.error("Error leyendo monitoreo/" + sensor, error));
            });

            firebaseDatabase.ref("monitoreo/bomba").on("value", snapshot => {
                const value = snapshot.val();
                if (value !== null) updatePumpFromFirebase(value);
            }, error => console.error("Error leyendo monitoreo/bomba", error));
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
            const btn = document.getElementById("toggle-" + idx);
            const container = document.getElementById("container-" + idx);
            estadosActuadores[idx] = !estadosActuadores[idx];

            if (estadosActuadores[idx]) {
                btn.innerText = "ON";
                btn.className = "btn-toggle active";
                container.classList.remove("disabled-ui");
            } else {
                btn.innerText = "OFF";
                btn.className = "btn-toggle inactive";
                container.classList.add("disabled-ui");
            }
            updateElementColor(idx);
            if (idx === 0) writeFirebase("monitoreo/bomba", estadosActuadores[idx]);
        }

        function setSliderTrackStyle(id, colorHex, percentVal) {
            const styleId = "slider-style-" + id;
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement("style");
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            
            const gradient = "linear-gradient(to right, " + colorHex + " 0%, " + colorHex + " " + percentVal + "%, #e2e8f0 " + percentVal + "%, #e2e8f0 100%)";

            styleEl.innerHTML = 
                "#" + id + "::-webkit-slider-runnable-track { background: " + gradient + " !important; }" +
                "#" + id + "::-moz-range-track { background: " + gradient + " !important; }" +
                "#" + id + "::-webkit-slider-thumb { background: " + colorHex + " !important; }" +
                "#" + id + "::-moz-range-thumb { background: " + colorHex + " !important; }";
        }

        function updateElementColor(idx) {
            const config = actuadoresData[idx];
            const slider = document.getElementById("slider-" + idx);
            const badge = document.getElementById("statusLabel-" + idx);
            const textPct = document.getElementById("colorTxt-" + idx);

            if (!slider || !badge || !textPct) return;

            const colorIdx = parseInt(slider.value);
            const color = paleta[colorIdx];
            const pctFill = (colorIdx / 19) * 100;

            textPct.innerText = Math.round(pctFill);
            textPct.style.color = color.c;

            // =========================================================================
            // MODO 1: TRATAMIENTO METALIZADO (BOMBA Y VÁLVULA)
            // =========================================================================
            if (config.tipo === "bomba") {
                config.ids.forEach(idComponente => {
                    const elementoSvg = document.getElementById(idComponente);
                    if (!elementoSvg) return;

                    let overlay = document.getElementById("overlay-" + idComponente);
                    if (!overlay) {
                        overlay = elementoSvg.cloneNode(true);
                        overlay.id = "overlay-" + idComponente;
                        overlay.classList.add("efecto-dinamico");
                        overlay.style.mixBlendMode = "color";
                        overlay.style.pointerEvents = "none";
                        elementoSvg.parentNode.appendChild(overlay);
                    }

                    if (!estadosActuadores[idx]) {
                        overlay.style.opacity = "0";
                        elementoSvg.style.filter = "none";
                        elementoSvg.style.transform = "none";
                    } else {
                        overlay.style.opacity = "1.0";
                        const paths = overlay.querySelectorAll("path, rect, polygon, circle, ellipse");
                        paths.forEach(p => p.setAttribute("fill", color.c));

                        elementoSvg.style.filter = "url(#sombra-hundido)";
                        elementoSvg.style.transform = "translateY(0.4px) translateX(0.2px)";
                        overlay.style.transform = "translateY(0.4px) translateX(0.2px)";
                    }
                });

                if (!estadosActuadores[idx]) {
                    badge.style.backgroundColor = "#e2e8f0";
                    badge.style.color = "#94a3b8";
                    badge.innerText = "STANDBY METAL";
                    setSliderTrackStyle(slider.id, '#94a3b8', pctFill);
                } else {
                    badge.style.backgroundColor = color.c;
                    badge.style.color = color.t;
                    badge.innerText = config.nombre.toUpperCase() + ": " + color.n;
                    setSliderTrackStyle(slider.id, color.c, pctFill);
                }
                return;
            }

            // =========================================================================
            // MODO 2: TUBERÍAS GENERALES
            // =========================================================================
            if (config.tipo === "tuberia") {
                config.ids.forEach(idComponente => {
                    const elementoSvg = document.getElementById(idComponente);
                    if (!elementoSvg) return;

                    const elementosInternos = (elementoSvg.tagName === "path" || elementoSvg.tagName === "rect" || elementoSvg.tagName === "polygon")
                        ? [elementoSvg] 
                        : elementoSvg.querySelectorAll(config.selector);

                    if (!estadosActuadores[idx]) {
                        elementoSvg.style.filter = "none";
                        elementosInternos.forEach((el, elIdx) => {
                            const key = idComponente + "-" + elIdx;
                            if (coloresOriginalesSvg[key]) {
                                el.setAttribute("fill", coloresOriginalesSvg[key]);
                                el.style.fill = coloresOriginalesSvg[key];
                            }
                        });
                    } else {
                        elementoSvg.style.filter = "url(#sombra-hundido)";
                        elementosInternos.forEach(el => {
                            el.setAttribute("fill", color.c);
                            el.style.fill = color.c;
                        });
                    }
                });

                if (!estadosActuadores[idx]) {
                    badge.style.backgroundColor = "#e2e8f0";
                    badge.style.color = "#94a3b8";
                    badge.innerText = "STANDBY ORIGINAL";
                    setSliderTrackStyle(slider.id, '#94a3b8', pctFill);
                } else {
                    badge.style.backgroundColor = color.c;
                    badge.style.color = color.t;
                    badge.innerText = config.nombre.toUpperCase() + ": " + color.n;
                    setSliderTrackStyle(slider.id, color.c, pctFill);
                }
                return;
            }

            // =========================================================================
            // MODO 3: CONTROL DE AGUA / TANQUES MEDIANTE CLIPPATH DINGÁMICO (CORREGIDO)
            // =========================================================================
            if (config.tipo === "tanque") {
                const clipRect = document.getElementById(config.clipId);
                const dimensiones = dimensionesOriginalesTanques[config.clipId];

                config.ids.forEach(idComponente => {
                    const elementoSvg = document.getElementById(idComponente);
                    if (!elementoSvg) return;

                    if (!estadosActuadores[idx]) {
                        elementoSvg.style.opacity = "0"; 
                    } else {
                        elementoSvg.style.opacity = "0.80";
                        // Mantenemos el color fijo o el de la paleta si deseas cambiarlo, sin romper la silueta
                        elementoSvg.setAttribute("fill", "#3b82f6"); 
                        elementoSvg.style.fill = "#3b82f6";

                        // Modificamos el clipPath dinámico para simular el llenado de abajo hacia arriba
                        if (clipRect && dimensiones) {
                            const fraccionNivel = pctFill / 100;
                            const nuevaAltura = dimensiones.height * fraccionNivel;
                            const nuevoY = dimensiones.y + (dimensiones.height - nuevaAltura);

                            clipRect.setAttribute("x", dimensiones.x);
                            clipRect.setAttribute("y", nuevoY);
                            clipRect.setAttribute("width", dimensiones.width);
                            clipRect.setAttribute("height", nuevaAltura);
                        }
                    }
                });

                if (!estadosActuadores[idx]) {
                    badge.style.backgroundColor = "#ef4444";
                    badge.style.color = "#fff";
                    badge.innerText = "TANQUE DESCONECTADO";
                    setSliderTrackStyle(slider.id, '#ef4444', pctFill);
                } else {
                    badge.style.backgroundColor = "#3b82f6";
                    badge.style.color = "#fff";
                    badge.innerText = config.nombre.toUpperCase() + " AL " + Math.round(pctFill) + "%";
                    setSliderTrackStyle(slider.id, '#3b82f6', pctFill);
                }
                return;
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            // Mapeo inicial de los colores originales de tuberías
            actuadoresData.forEach((act) => {
                if (act.ids) {
                    act.ids.forEach(idComponente => {
                        const elementoSvg = document.getElementById(idComponente);
                        if (elementoSvg) {
                            elementoSvg.classList.add("effecto-dinamico");
                            if (act.selector) {
                                const elementosInternos = (elementoSvg.tagName === "path" || elementoSvg.tagName === "rect" || elementoSvg.tagName === "polygon")
                                    ? [elementoSvg]
                                    : elementoSvg.querySelectorAll(act.selector);
                                    
                                elementosInternos.forEach((el, elIdx) => {
                                    const fillOriginal = el.getAttribute("fill") || window.getComputedStyle(el).fill;
                                    coloresOriginalesSvg[idComponente + "-" + elIdx] = fillOriginal;
                                });
                            }
                        }
                    });
                }

                // Obtener las dimensiones exactas del rectángulo azul original del tanque usando BoundingBox
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

            // Inicialización limpia
            actuadoresData.forEach((act, idx) => updateElementColor(idx));
            setupFirebaseListeners();
        });
    </script>
      `;

      return renderLayout(content, "proceso");

    } catch (error) {
      throw error;
    }
}
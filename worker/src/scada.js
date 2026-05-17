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
      <h2 style="margin-bottom: 20px; color: #334155;">SCADA HMI - USAC</h2>
      <div id="alarms-list" class="alarms-section"></div>
      <div class="dashboard">
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
          renderAlarms(); updateSystemLevel(); updatePipesColor();
          for(let i=0; i<cardStates.length; i++) updateCardColor(i);
        };
      </script>
    </body>
    </html>`;
    return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
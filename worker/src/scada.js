/**
 * Módulo SCADA HMI (Nueva Página)
 * Procesa SVGs dinámicos y genera la interfaz de control avanzada.
 */

import { renderLayout } from './layout.js';

export async function handleScadaRequest(config = {}) {
    const MIS_TARJETAS = [
      {
        nombre: "Tanque de Agua 3",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778991112/Tanque2_hbqomy.svg",
        pintadoIndependiente: false,
        colorFijoestatico: "#64748b",
        animarNivel: true,
        idAguaOriginal: "aguaT2",
        sensor: "sensor3"
      },
      { vacio: true },
      {
        nombre: "Tanque de Agua 2",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778991112/Tanque2_hbqomy.svg",
        pintadoIndependiente: false,
        colorFijoestatico: "#64748b",
        animarNivel: true,
        idAguaOriginal: "aguaT2",
        sensor: "sensor2"
      },
      { vacio: true },
      {
        nombre: "Depósito T1",
        url: "https://res.cloudinary.com/drov8gutj/image/upload/v1778597351/Tanque1_nfv478.svg",
        pintadoIndependiente: false, 
        colorFijoestatico: "#64748b",
        animarNivel: true,
        idAguaOriginal: "aguaT1",
        sensor: "sensor1"
      },
      { vacio: true },
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
      }
    ];

    const PIPE_URLS = [
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483014/PipeHorizontal_yanb3l.svg",
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483015/PipeVertical_yvenzq.svg",
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483010/90DegreeBend1_fpndun.svg",
      "https://res.cloudinary.com/drov8gutj/image/upload/v1778483015/PipeTeeUp_pfsgth.svg"
    ];

    async function getEnhancedSVG(
      url,
      idPrefix,
      isIndependent = false,
      animarNivel = false,
      idAguaOriginal = "aguaT1"
    ) {
      const res = await fetch(url);
      let svg = await res.text();
      let clipDefinition = "";

      svg = svg.replace(/id="([^"]+)"/g, (m, id) => `id="${idPrefix}-${id}"`);
      svg = svg.replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${idPrefix}-${id})`);
      svg = svg.replace(/xlink:href="#([^"]+)"/g, (m, id) => `xlink:href="#${idPrefix}-${id}"`);

      if (animarNivel) {
        const clipId = `${idPrefix}-clip`;
        const clipRectId = `${clipId}-rect`;
        clipDefinition = `<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect id="${clipRectId}" x="0" y="0" width="0" height="0" /></clipPath></defs>`;
        svg = svg.replace(
          /<svg\b[^>]*>/i,
          root => `${root}${clipDefinition}`
        );
        svg = svg.replace(
          `id="${idPrefix}-${idAguaOriginal}"`,
          `id="${idPrefix}-${idAguaOriginal}" class="water-layer" data-clip-rect="${clipRectId}" clip-path="url(#${clipId})"`
        );
      }

      const viewBox = svg.match(/viewBox="([^"]+)"/i)?.[1] || "0 0 300 300";
      const innerContent = svg.replace(/<svg[^>]*>|<\/svg>/gi, "");
      const maskContent = clipDefinition ? innerContent.replace(clipDefinition, "") : innerContent;
      const paintClass = isIndependent ? "paint-custom" : "paint-layer";

      return `
        <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="pointer-events: none; user-select: none;">
          <defs><mask id="m-${idPrefix}"><g fill="white" stroke="white">${maskContent}</g></mask></defs>
          <g>${innerContent}</g>
          <rect class="${paintClass}" width="100%" height="100%" mask="url(#m-${idPrefix})" style="mix-blend-mode: color; opacity: 0.8; pointer-events: none;" />
        </svg>`;
    }

    const allSVGs = await Promise.all([
        ...MIS_TARJETAS.map((t, idx) => t.vacio ? Promise.resolve(null) : getEnhancedSVG(
          t.url,
          `card-${idx}`,
          t.pintadoIndependiente,
          t.animarNivel,
          t.idAguaOriginal
        )),
        ...PIPE_URLS.map((url, i) => getEnhancedSVG(url, `p${i}`))
    ]);

    const customSVGs = allSVGs.slice(0, MIS_TARJETAS.length);
    const svgPipes = allSVGs.slice(MIS_TARJETAS.length);

    const html = `
      <style>
        body { background: var(--bg-body); color: var(--text-main); font-family: 'Segoe UI', sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; margin: 0; }
        .dashboard { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; width: 100%; max-width: 1100px; }
        .dashboard > * { order: 20; min-width: 0; }
        .dashboard > #card-container-0 { order: 1; }
        .dashboard > #card-container-2 { order: 2; }
        .dashboard > #card-container-4 { order: 3; }
        .dashboard > #card-container-6 { order: 4; }
        .dashboard > #card-container-7 { order: 5; }
        .dashboard > .priority-card { order: 10; }
        .dashboard > .control-vector-card { order: 11; }
        .dashboard > .audit-log-card { order: 12; }
        .dashboard > .card-empty-slot { display: none; }
        .card { background: var(--bg-card); color: var(--text-main); padding: 15px; border-radius: 12px; border: 1px solid var(--border-main); box-shadow: var(--shadow-card); display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .card-controls-panel { background: var(--bg-subtle); border: 1px solid var(--border-main); padding: 10px; border-radius: 8px; display: flex; flex-direction: column; gap: 5px; text-align: center; }
        .developer-control { display: none; }
        .dashboard.developer-mode .developer-control { display: flex; }
        .dashboard.developer-mode .card-controls-panel { display: flex; }
        .btn-toggle { border: none; padding: 5px 14px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
        .btn-toggle.active { background: #22c55e; color: white; }
        .btn-toggle.inactive { background: #ef4444; color: white; }
        .canvas { display: flex; background: var(--bg-subtle); border-radius: 8px; height: 160px; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--border-main); pointer-events: none; }
        svg { width: 100%; height: 100%; max-width: 90%; max-height: 90%; }
        .pipe-mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; }
        .pipe-item { background: var(--bg-card); height: 70px; border-radius: 6px; border: 1px solid var(--border-main); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .water-layer { transition: none; }
        .status-badge-mini { padding: 6px; border-radius: 5px; text-align: center; font-weight: 700; font-size: 0.7rem; }
        .card-current-status { color: var(--text-main); font-size: 1rem; font-weight: 700; }
        .dashboard-header { width: 100%; max-width: 1100px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .dashboard-header h2 { margin: 20px 0; color: var(--text-main); }
        .btn-developer { border: 1px solid var(--border-main); background: var(--bg-card); color: var(--text-main); padding: 8px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .priority-card { grid-column: span 3; border: 2px solid var(--accent); background: var(--accent-soft); }
        .priority-title { color: var(--text-main); font-size: 0.85rem; font-weight: 800; }
        .priority-current { color: var(--accent); font-size: 1.35rem; font-weight: 800; }
        .priority-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .priority-button { border: 1px solid var(--border-main); background: var(--bg-card); color: var(--accent); padding: 8px 12px; border-radius: 7px; cursor: pointer; font-weight: 700; }
        .priority-button.active { background: var(--accent-strong); color: #fff; border-color: var(--accent-strong); }
        input[type=range].scada-range { width: 100%; cursor: pointer; }
        .card.disabled-ui { opacity: 0.6; }
        .card.disabled-ui .canvas, .card.disabled-ui .card-controls-panel { pointer-events: none; filter: grayscale(1); }
        .card.estop-locked input, .card.estop-locked button { pointer-events: none !important; filter: grayscale(1); }
        
        /* --- SISTEMA DE ALARMAS --- */
        .alarms-section { width: 100%; max-width: 1100px; margin-bottom: 20px; }
        .alarm-card {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 18px; border-radius: 10px; margin-bottom: 8px;
            font-size: 0.8rem; font-weight: 700; border: 2px solid transparent;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .alarm-card.critical { background: var(--critical-soft); color: var(--critical-text); border-color: var(--alert); animation: blink-critical 1.5s infinite; }
        .alarm-card.warning { background: var(--warning-soft); color: var(--warning-text); border-color: var(--warning); animation: blink-warning 2s infinite; }
        .dashboard-top-panels { width: 100%; max-width: 1100px; display: grid; gap: 12px; margin: 0 0 18px; }
        .sensor-indicators { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .sensor-indicator { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 10px; padding: 12px 14px; box-shadow: var(--shadow-card); }
        .sensor-indicator-label { display: block; color: var(--text-muted); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
        .sensor-indicator-value { display: block; margin-top: 5px; color: var(--text-main); font-size: 1.25rem; font-weight: 800; }
        .lcd-panel { --lcd-bg: #164e63; --lcd-fg: #ffffff; background-color: var(--lcd-bg); color: var(--lcd-fg); border: 2px solid var(--border-main); border-radius: 10px; padding: 14px 16px; box-shadow: var(--shadow-card); opacity: 1; filter: none; }
        .lcd-header, .terminal-header, .pump-control-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .lcd-title, .terminal-title, .pump-control-title { margin: 0; font-size: 0.85rem; font-weight: 800; }
        .lcd-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .lcd-options[hidden] { display: none; }
        .lcd-options label { display: inline-flex; gap: 5px; align-items: center; font-size: 0.68rem; font-weight: 700; }
        .lcd-options select { border: 1px solid var(--border-main); border-radius: 5px; padding: 4px 6px; background: var(--bg-input); color: var(--text-main); }
        .lcd-message { min-height: 54px; margin: 12px 0 0; display: flex; align-items: center; justify-content: flex-start; text-align: left; font-family: "Courier New", "Lucida Console", monospace; font-size: clamp(1rem, 2.5vw, 1.35rem); font-weight: 800; letter-spacing: 0.04em; overflow-wrap: anywhere; }
        .lcd-panel[data-font="pixel"] .lcd-message { font-family: "Lucida Console", "Courier New", monospace; letter-spacing: 0.12em; text-transform: uppercase; }
        .lcd-panel[data-font="terminal"] .lcd-message { font-family: Consolas, "Cascadia Mono", "Courier New", monospace; letter-spacing: 0.02em; }
        .lcd-panel[data-font="digital"] .lcd-message { font-family: "Arial Narrow", Impact, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
        .lcd-panel[data-font="sans"] .lcd-message { font-family: "Segoe UI", Arial, sans-serif; letter-spacing: 0.01em; }
        .terminal-panel { background: #23272a; color: #dcddde; border: 1px solid #3f4347; border-radius: 10px; padding: 14px 16px; box-shadow: var(--shadow-card); }
        .terminal-title { color: #ffffff; }
        .terminal-indicator { width: 9px; height: 9px; border-radius: 50%; background: #43b581; box-shadow: 0 0 8px rgba(67, 181, 129, 0.65); }
        .system-terminal { min-height: 95px; max-height: 180px; overflow-y: auto; margin: 10px 0 0; padding: 0; list-style: none; font: 0.76rem/1.6 Consolas, "Courier New", monospace; }
        .system-terminal li { overflow-wrap: anywhere; }
        .system-terminal .ts { color: #a3a6aa; }
        .system-terminal .user { color: #43b581; font-weight: 700; }
        .pump-control-card { background: var(--bg-card); color: var(--text-main); border: 2px solid var(--border-main); border-radius: 12px; padding: 16px; box-shadow: var(--shadow-card); }
        .pump-control-actions { display: grid; grid-template-columns: minmax(0, 2fr) minmax(130px, 1fr); gap: 10px; margin-top: 12px; }
        .pump-main-button, .pump-options-button { min-height: 54px; border: 0; border-radius: 9px; padding: 12px 16px; color: #fff; font-size: 0.95rem; font-weight: 900; cursor: pointer; }
        .pump-main-button { background: #dc2626; }
        .pump-main-button.on { background: #16a34a; }
        .pump-main-button:disabled { cursor: not-allowed; opacity: 0.65; }
        .pump-options-button { background: var(--accent-strong); color: var(--on-accent); }
        .pump-current-state { margin: 10px 0 0; color: var(--text-muted); font-size: 0.78rem; font-weight: 700; }
        .system-options-dialog { width: min(440px, calc(100% - 28px)); border: 1px solid var(--border-main); border-radius: 12px; padding: 20px; background: var(--bg-card); color: var(--text-main); box-shadow: var(--shadow-card); }
        .system-options-dialog::backdrop { background: rgba(15, 23, 42, 0.65); }
        .system-options-dialog[open] { max-height: min(85vh, 760px); overflow-y: auto; }
        .system-options-dialog h2 { margin: 0; color: var(--text-main); }
        .options-reason, .options-menu-text { font-family: Consolas, "Courier New", monospace; white-space: pre-wrap; }
        .options-reason { margin: 16px 0; padding: 12px; border-radius: 7px; background: var(--bg-subtle); color: var(--text-main); font-size: 0.8rem; }
        .options-reason strong { color: var(--text-muted); }
        .options-menu-title { margin: 14px 0 8px; font-size: 0.9rem; }
        .options-menu { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; font: 0.76rem/1.45 Consolas, "Courier New", monospace; }
        .options-menu li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }
        .option-quick-button { border: 1px solid var(--border-main); border-radius: 5px; padding: 4px 8px; background: var(--bg-subtle); color: var(--text-main); font-size: 0.68rem; font-weight: 800; cursor: pointer; }
        .options-command-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 14px; }
        .options-command-form input { min-width: 0; border: 1px solid var(--border-main); border-radius: 7px; padding: 9px; background: var(--bg-input); color: var(--text-main); }
        .options-command-form button, .system-options-dialog .options-close { margin-top: 0; border: 0; border-radius: 7px; padding: 9px 14px; background: var(--accent-strong); color: var(--on-accent); font-weight: 800; cursor: pointer; }
        .system-options-dialog .options-close { margin-top: 14px; }
        .options-command-status { min-height: 1.2em; margin: 8px 0 0; color: var(--text-muted); font-size: 0.75rem; }
        
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
        .btn-ack { background: var(--nav-active-bg); color: var(--nav-active-text); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; transition: 0.2s; }
        .btn-ack:hover { background: var(--accent-strong); }

        /* --- VECTOR DE CONTROL --- */
        .control-vector-card { grid-column: span 3; background: var(--bg-card); border: 2px solid var(--border-main); padding: 20px; border-radius: 12px; }
        .mode-selector { display: flex; gap: 10px; margin: 15px 0; }
        .btn-mode { flex: 1; padding: 10px; border: 1px solid var(--border-main); background: var(--bg-input); color: var(--text-main); cursor: pointer; border-radius: 8px; font-weight: bold; font-size: 0.75rem; transition: 0.3s; }
        .btn-mode.active { background: var(--accent-strong); color: white; border-color: var(--accent-strong); }
        
        .setpoint-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
        .setpoint-row { background: var(--bg-subtle); padding: 10px; border-radius: 8px; border: 1px solid var(--border-main); }
        .setpoint-header { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; color: var(--text-muted); margin-bottom: 5px; }
        
        .estop-section { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .estop-badge { flex: 1; padding: 10px; border-radius: 6px; font-weight: 800; font-size: 0.7rem; text-align: center; }
        .estop-badge.inactive { background: var(--bg-subtle); color: var(--text-muted); border: 1px solid var(--border-main); }
        .btn-sim-alarm { background: var(--warning); color: var(--warning-text); padding: 10px 15px; white-space: nowrap; }
        .estop-badge.active { background: var(--critical-soft); color: var(--alert); border: 1px solid var(--alert); animation: blink-critical 1s infinite; }

        /* --- PERFIL DE USUARIO --- */
        .user-profile-card { position: fixed; top: 70px; right: 15px; background: var(--bg-card); color: var(--text-main); padding: 10px; border-radius: 12px; border: 1px solid var(--border-main); box-shadow: var(--shadow-card); display: flex; align-items: center; gap: 10px; z-index: 1000; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-strong); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.7rem; }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-size: 0.75rem; font-weight: 800; color: var(--text-main); line-height: 1; }
        .user-role { font-size: 0.55rem; color: var(--text-muted); font-weight: bold; text-transform: uppercase; margin-top: 2px; }
        .role-selector { font-size: 0.55rem; border: 1px solid var(--border-main); border-radius: 4px; padding: 2px; margin-top: 4px; cursor: pointer; background: var(--bg-input); color: var(--text-main); }

        /* --- AUDIT LOG --- */
        .audit-log-card { grid-column: span 3; background: var(--bg-card); border: 1px solid var(--border-main); padding: 15px; border-radius: 12px; }
        .audit-log-list { list-style: none; padding: 0; margin: 10px 0 0 0; max-height: 120px; overflow-y: auto; }
        .audit-log-list li { font-family: monospace; font-size: 0.65rem; color: var(--text-muted); padding: 4px 0; border-bottom: 1px dashed var(--border-main); }
        .audit-log-list li:last-child { border-bottom: none; }
        .audit-log-list li .ts { color: var(--text-muted); font-weight: bold; margin-right: 5px; }

        /* --- RBAC MASKING --- */
        .readonly-operador { position: relative; }
        .readonly-operador::after { 
            content: "🔒"; position: absolute; top: 10px; right: 10px; font-size: 0.8rem; z-index: 20; background: var(--bg-subtle); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-main); opacity: 0.8;
        }
        .readonly-operador input, .readonly-operador button:not(#btn-estop) { 
            pointer-events: none !important; opacity: 0.4 !important; filter: grayscale(1); 
        }

        /* --- DIAGNÓSTICO Y TELEMETRÍA --- */
        .telemetry-card { grid-column: span 3; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-main); padding: 15px; border-radius: 12px; }
        .telemetry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
        .metric-box { background: var(--bg-subtle); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid var(--border-main); }
        .metric-val { display: block; font-size: 1.1rem; font-weight: 800; color: var(--text-main); }
        .metric-label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; }
        .db-status { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-main); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
        .heartbeat { width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; animation: heartbeat-pulse 1s infinite; }
        @keyframes heartbeat-pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }

        /* --- BALANCE DE MATERIA / OEE --- */
        .oee-card { grid-column: span 3; background: var(--accent-soft); border: 1px solid var(--border-main); padding: 15px; border-radius: 12px; }
        .oee-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
        .oee-box { background: var(--bg-card); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid var(--border-main); box-shadow: var(--shadow-card); }
        .oee-val { display: block; font-size: 1.1rem; font-weight: 800; color: var(--accent); }
        .oee-label { font-size: 0.55rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; font-weight: bold; }

        @media (max-width: 760px) {
          .dashboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .priority-card, .control-vector-card, .audit-log-card, .telemetry-card, .oee-card { grid-column: span 2; }
          .sensor-indicators { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          body { padding: 12px; }
          .dashboard { grid-template-columns: minmax(0, 1fr); gap: 10px; }
          .priority-card, .control-vector-card, .audit-log-card, .telemetry-card, .oee-card { grid-column: span 1; }
          .sensor-indicators { gap: 8px; }
          .pump-control-actions { grid-template-columns: 1fr; }
          .lcd-header { align-items: flex-start; }
        }

      </style>
      <div class="user-profile-card">
        <div class="user-avatar" id="user-avatar-initials">S1</div>
        <div class="user-info">
          <span class="user-name" id="user-display-name">Supervisor_01</span>
          <span class="user-role" id="user-display-role">SUPERVISOR</span>
          <select class="role-selector" onchange="switchUser(this.value)">
            <option value="sup_01">Ver como Supervisor</option>
            <option value="op_01">Ver como Operador</option>
            <option value="adm_01" selected>Ver como Administrador</option>
          </select>
        </div>
      </div>
      <div class="dashboard-header">
        <h2>Dashboard - SCADA HMI</h2>
        <button id="developer-mode-toggle" class="btn-developer" type="button" onclick="toggleDeveloperMode()" aria-expanded="false" hidden>⚙️ Modo Desarrollador</button>
      </div>
      <div id="alarms-list" class="alarms-section"></div>
      <section class="dashboard-top-panels" aria-label="Resumen principal del sistema">
        <div class="sensor-indicators" aria-label="Indicadores de sensores">
          <div class="sensor-indicator"><span class="sensor-indicator-label">Nivel T1 · Depósito</span><strong class="sensor-indicator-value" id="top-level-sensor1">--%</strong></div>
          <div class="sensor-indicator"><span class="sensor-indicator-label">Nivel T2</span><strong class="sensor-indicator-value" id="top-level-sensor2">--%</strong></div>
          <div class="sensor-indicator"><span class="sensor-indicator-label">Nivel T3</span><strong class="sensor-indicator-value" id="top-level-sensor3">--%</strong></div>
          <div class="sensor-indicator"><span class="sensor-indicator-label">Temperatura</span><strong class="sensor-indicator-value" id="top-temperature">--°C</strong></div>
        </div>
        <section class="lcd-panel" id="system-lcd" aria-live="polite">
          <div class="lcd-header">
            <h2 class="lcd-title">PANTALLA DE ESTADO</h2>
            <div class="lcd-options" id="lcd-options" hidden>
              <label for="lcd-background">Fondo
                <select id="lcd-background" onchange="updateLcdAppearance()">
                  <option value="#064e3b">Verde</option>
                  <option value="#0f172a">Azul oscuro</option>
                  <option value="#164e63" selected>Celeste oscuro</option>
                  <option value="#d1fae5">Verde claro</option>
                  <option value="#dbeafe">Azul claro</option>
                  <option value="#cffafe">Celeste claro</option>
                  <option value="#fef3c7">Ámbar claro</option>
                  <option value="#f3f4f6">Gris claro</option>
                  <option value="#ffffff">Blanco</option>
                  <option value="#c0c0c0">Gris plateado</option>
                  <option value="#ffff00">Amarillo puro</option>
                  <option value="#00ffff">Cian brillante</option>
                  <option value="#00ff00">Verde puro</option>
                  <option value="#ff00ff">Magenta</option>
                  <option value="#ff0000">Rojo puro</option>
                  <option value="#0000ff">Azul puro</option>
                  <option value="#1e3a8a">Azul marino profundo</option>
                  <option value="#312e81">Índigo oscuro</option>
                  <option value="#1d4ed8">Azul real iluminado</option>
                  <option value="#3e8fd8">Celeste LCD Blynk</option>
                  <option value="#22c55e">Verde ON/OFF de tarjetas</option>
                </select>
              </label>
              <label for="lcd-text-color">Texto
                <select id="lcd-text-color" onchange="updateLcdAppearance()">
                  <option value="#ffffff" selected>Blanco</option>
                  <option value="#000000">Negro</option>
                </select>
              </label>
              <label for="lcd-font">Fuente
                <select id="lcd-font" onchange="updateLcdAppearance()">
                  <option value="mono" selected>Monoespaciada</option>
                  <option value="pixel">Estilo píxel</option>
                  <option value="terminal">Terminal (Consolas)</option>
                  <option value="digital">Digital</option>
                  <option value="sans">Sans serif</option>
                </select>
              </label>
            </div>
          </div>
          <p class="lcd-message" id="lcd-message">Sistema Listo - Modo Automático</p>
        </section>
        <section class="terminal-panel" aria-label="Terminal de eventos">
          <div class="terminal-header">
            <h2 class="terminal-title">Terminal del sistema</h2>
            <span class="terminal-indicator" aria-hidden="true"></span>
          </div>
          <ul class="system-terminal" id="system-terminal" aria-live="polite">
            <li>Esperando eventos del sistema...</li>
          </ul>
        </section>
        <section class="pump-control-card" aria-label="Control principal de bomba">
          <div class="pump-control-header">
            <h2 class="pump-control-title">Control principal</h2>
          </div>
          <div class="pump-control-actions">
            <button type="button" class="pump-main-button" id="pump-main-toggle" onclick="toggleMainPump()" aria-pressed="false">ENCENDER BOMBA</button>
            <button type="button" class="pump-options-button" onclick="openSystemOptions()">OPCIONES</button>
          </div>
          <p class="pump-current-state" id="pump-current-state" aria-live="polite">Estado de bomba: esperando Firebase...</p>
        </section>
      </section>
      <dialog class="system-options-dialog" id="system-options-dialog" aria-labelledby="system-options-title">
        <h2 id="system-options-title">Opciones del sistema · V5</h2>
        <div class="options-reason">- Razón de último apagado:
<strong id="last-shutdown-reason">Cargando desde Firebase...</strong></div>
        <h3 class="options-menu-title">- Opciones de configuración</h3>
        <ol class="options-menu">
          <li><span>1) Abrir llave T1</span><button class="option-quick-button" type="button" onclick="sendSystemOption(1)">Enviar</button></li>
          <li><span>2) Cerrar llave T1</span><button class="option-quick-button" type="button" onclick="sendSystemOption(2)">Enviar</button></li>
          <li><span>3) Dar prioridad al llenado de T2</span><button class="option-quick-button" type="button" onclick="sendSystemOption(3)">Enviar</button></li>
          <li><span>4) Dar prioridad al llenado de T3</span><button class="option-quick-button" type="button" onclick="sendSystemOption(4)">Enviar</button></li>
          <li><span>5) Llenado de T2 y T3 intercalado</span><button class="option-quick-button" type="button" onclick="sendSystemOption(5)">Enviar</button></li>
          <li><span>6) Activar modo automatico</span><button class="option-quick-button" type="button" onclick="sendSystemOption(6)">Enviar</button></li>
          <li><span>7) Desactivar modo automatico</span><button class="option-quick-button" type="button" onclick="sendSystemOption(7)">Enviar</button></li>
          <li><span>8) Quitar tiempo de espera</span><button class="option-quick-button" type="button" onclick="sendSystemOption(8)">Enviar</button></li>
          <li><span>9) Cambiar tiempo de deteccion a 20 minutos</span><button class="option-quick-button" type="button" onclick="sendSystemOption(9)">Enviar</button></li>
          <li><span>10) Habilitar envio de datos de distancia del sensor</span><button class="option-quick-button" type="button" onclick="sendSystemOption(10)">Enviar</button></li>
          <li><span>11) Deshabilitar envio de datos de distancia del sensor</span><button class="option-quick-button" type="button" onclick="sendSystemOption(11)">Enviar</button></li>
        </ol>
        <form class="options-command-form" id="options-command-form" onsubmit="submitSystemOption(event)">
          <input id="options-command-input" type="number" min="1" max="11" step="1" inputmode="numeric" placeholder="Número de opción (1-11)" aria-label="Número de opción">
          <button type="submit" id="options-submit-button">Enviar</button>
        </form>
        <p class="options-command-status" id="options-command-status" aria-live="polite"></p>
        <button class="options-close" type="button" onclick="closeSystemOptions()">Cerrar</button>
      </dialog>
      <div class="dashboard">
        <div class="card priority-card">
          <div class="priority-title">Prioridad de Llenado</div>
          <div id="filling-priority-current" class="priority-current" aria-live="polite">Prioridad Actual: Cargando...</div>
          <div id="filling-priority-actions" class="priority-actions" hidden>
            <button class="priority-button" data-priority="2" type="button" onclick="setFillingPriority(2)">T2</button>
            <button class="priority-button" data-priority="3" type="button" onclick="setFillingPriority(3)">T3</button>
            <button class="priority-button" data-priority="1" type="button" onclick="setFillingPriority(1)">Intercalado</button>
          </div>
        </div>

        <!-- TARJETA DE REGISTRO DE CAMBIOS (AUDIT LOG) -->
        <div class="card audit-log-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: var(--text-main); font-size: 0.8rem; font-weight: 800;">REGISTRO DE CAMBIOS (AUDIT LOG)</label>
          </div>
          <ul id="audit-log-list" class="audit-log-list">
            <!-- Logs dinámicos -->
          </ul>
        </div>

        <!-- TARJETA DE VECTOR DE CONTROL -->
        <div class="card control-vector-card" id="control-vector">
          <label style="color: var(--text-main); font-size: 0.8rem; letter-spacing: 0.5px; font-weight: 800;">Vector de Control / Modos de Operación</label>
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
            <button id="btn-estop" class="btn-ack" style="background: #ef4444; padding: 10px 15px;" onclick="triggerEStop()">E-STOP</button>
            <div id="reset-estop-control">
              <button class="btn-ack" style="padding: 10px 15px;" onclick="resetEStop()">RESET (S/R)</button>
            </div>
            <button id="simulate-alarm-control" class="btn-ack btn-sim-alarm" type="button" onclick="simulateAlarm()" hidden>⚠️ Simular Alarma</button>
          </div>
        </div>

        ${MIS_TARJETAS.map((t, idx) => {
          if (t.vacio) {
            return `<div class="card-empty-slot" style="visibility: hidden; pointer-events: none;"></div>`;
          }
          return `
          <div class="card" id="card-container-${idx}" data-independent="${t.pintadoIndependiente}" data-static-color="${t.colorFijoestatico}">
            <div class="card-header"><label>${t.nombre}</label><button class="btn-toggle active developer-control" id="toggle-${idx}" onclick="toggleCard(${idx})">ON</button></div>
            <div class="card-current-status" id="card-current-status-${idx}">${t.animarNivel ? "Nivel: --% · " : ""}Estado: Encendido</div>
            <div class="canvas">${customSVGs[idx]}</div>
            <div class="card-controls-panel developer-control">
              <label>${t.animarNivel ? "Nivel de Tanque" : "Color Proceso"}: <span id="card-colorTxt-${idx}">50</span>%</label>
              <input type="range" class="scada-range" id="colorSlider-${idx}" min="0" max="${t.animarNivel ? "100" : "19"}" step="${t.animarNivel ? "0.1" : "1"}" value="${t.animarNivel ? "50" : (idx * 3) % 20}" oninput="handleCardSliderInput(${idx})">
              <div id="card-statusLabel-${idx}" class="status-badge-mini">OK</div>
            </div>
          </div>`;
        }).join('')}
        <div class="card" style="grid-column: span 2;" id="card-container-pipes">
          <div class="card-header"><label>Red de Tuberías</label><button class="btn-toggle active developer-control" id="toggle-pipes" onclick="togglePipes()">ON</button></div>
          <div class="card-current-status" id="pipes-current-status">Estado: Encendido</div>
          <div class="canvas"><div class="pipe-mini-grid">${svgPipes.map(s => `<div class="pipe-item">${s}</div>`).join('')}</div></div>
          <div class="card-controls-panel developer-control" style="flex-direction: row; justify-content: space-between; align-items: center;">
             <input type="range" class="scada-range" id="pipes-colorSlider" min="0" max="19" value="6" oninput="handlePipesColorInput()">
             <div id="pipes-statusLabel" class="status-badge-mini" style="min-width: 100px;">FLUJO OK</div>
          </div>
        </div>
        <div class="card developer-control" style="grid-column: span 2; background: var(--accent-soft); border: 2px solid var(--accent);">
          <label>Nivel Global: <span id="levelTxt">50</span>%</label>
            <input type="range" class="scada-range" id="levelSlider" min="0" max="100" value="50" oninput="handleSystemLevelInput()">
        </div>

        <!-- BLOQUES DE DIAGNÓSTICO AL FINAL DEL DASHBOARD -->
        <div class="card telemetry-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: var(--text-main); font-size: 0.8rem; font-weight: 800;">RED Y DIAGNÓSTICO DE TELEMETRÍA</label>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 0.6rem; color: var(--text-muted); font-weight: bold;">HEARTBEAT</span>
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
            <span style="margin-left: auto; color: var(--text-muted);">Sincronización: <span id="last-sync">hace 0s</span></span>
          </div>
        </div>

        <div class="card oee-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: var(--text-main); font-size: 0.8rem; font-weight: 800;">BALANCE DE MATERIA & EFICIENCIA (OEE)</label>
          </div>
          <div class="oee-grid">
            <div class="oee-box"><span class="oee-val" id="oee-perc">94.2 <small style="font-size:0.5rem">%</small></span><span class="oee-label">OEE Global</span></div>
            <div class="oee-box"><span class="oee-val" id="flow-rate">0.0 <small style="font-size:0.5rem">L/min</small></span><span class="oee-label">Caudal Est.</span></div>
            <div class="oee-box"><span class="oee-val" id="total-vol">124.5 <small style="font-size:0.5rem">L</small></span><span class="oee-label">Vol. Total</span></div>
            <div class="oee-box"><span class="oee-val" id="runtime-val">08:24 <small style="font-size:0.5rem">h</small></span><span class="oee-label">Runtime</span></div>
          </div>
        </div>
      </div>
      <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
      <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
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
        const cardSensorMap = Object.fromEntries(
          ${JSON.stringify(MIS_TARJETAS.map((card, idx) => card.sensor ? [idx, card.sensor] : null).filter(Boolean))}
        );
        const sensorCardMap = Object.fromEntries(
          Object.entries(cardSensorMap).map(([cardIdx, sensor]) => [sensor, Number(cardIdx)])
        );
        const visibleCardIndexes = [0, 2, 4, 6, 7];
        const cardStatePaths = {
          0: "monitoreo/tanque3Activo",
          2: "monitoreo/tanque2Activo",
          4: "monitoreo/tanque1Activo",
          6: "monitoreo/bomba",
          7: "monitoreo/valvula"
        };
        const cardColorPaths = {
          6: "system_live/controles/bomba/color",
          7: "system_live/controles/valvula/color"
        };
        const firebaseConfig = {
          databaseURL: ${JSON.stringify(config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/')}
        };
        firebase.initializeApp(firebaseConfig);
        const firebaseDatabase = firebase.database();
        const tankLevels = {};
        const tankClipDimensions = {};
        let activeAlarms = [];
        let developerMode = false;
        let pumpCommandPending = false;
        let pumpStateKnown = false;
        let pumpControlError = "";
        let fillingPriority = 1;
        let interleavedDestination = 2;
        let lastShutdownReason = "Ninguna";
        let shutdownReasonKnown = false;
        let externalLcdMessage = "";
        let transientLcdMessage = "";
        let transientLcdTimer = null;
        let pumpStartUntil = 0;
        let lastProcessStatusMessage = null;
        const defaultLcdMessage = "Sistema Listo - Modo Automático";
        const optionMessages = {
          1: "Abriendo llave de agua T1",
          2: "Cerrando llave de agua T1",
          3: "La prioridad sera llenar T2",
          4: "La prioridad sera llenar T3",
          5: "El llenado de T2 y T3 sera intercalado",
          6: "Activando modo automatico",
          7: "Desactivando modo automatico",
          8: "Quitando tiempo de espera",
          9: "Cambiando tiempo de deteccion a 20 minutos",
          10: "Habilitando envio de datos de distancia del sensor",
          11: "Deshabilitando envio de datos de distancia del sensor"
        };
        const shutdownReasonPath = "system_live/razon_ultimo_apagado";
        const fillingPriorityNames = {
          1: "Intercalado",
          2: "Tanque 2",
          3: "Tanque 3"
        };

        function writeFirebase(path, value) {
          firebaseDatabase.ref(path).set(value).catch(error => {
            console.error("No se pudo actualizar Firebase en " + path, error);
          });
        }

        function renderFillingPriority(value) {
          const priority = Number(value);
          const name = fillingPriorityNames[priority];
          const label = document.getElementById("filling-priority-current");
          label.textContent = name
            ? "Prioridad Actual: " + name
            : "Prioridad Actual: No configurada";

          document.querySelectorAll(".priority-button").forEach(button => {
            const isSelected = Number(button.dataset.priority) === priority;
            button.classList.toggle("active", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
          });
          fillingPriority = Object.prototype.hasOwnProperty.call(fillingPriorityNames, priority)
            ? priority
            : 1;
          updateSystemMessage();
        }

        function updatePumpControl() {
          const button = document.getElementById("pump-main-toggle");
          const isOn = Boolean(cardStates[6]);
          button.classList.toggle("on", isOn);
          button.textContent = pumpStateKnown
            ? (isOn ? "APAGAR BOMBA" : "ENCENDER BOMBA")
            : "CARGANDO BOMBA...";
          button.setAttribute("aria-pressed", String(isOn));
          button.disabled = !pumpStateKnown || pumpCommandPending ||
            (currentUser && currentUser.role === "OPERADOR") ||
            (estopActive && !isOn);
          document.getElementById("pump-current-state").textContent = pumpControlError ||
            (estopActive && !isOn
              ? "E-STOP activo: no se puede encender la bomba."
              : "Estado de bomba: " + (isOn ? "Encendida" : "Apagada"));
        }

        async function toggleMainPump() {
          if (!currentUser || currentUser.role === "OPERADOR" || !pumpStateKnown || pumpCommandPending) return;
          const nextState = !cardStates[6];
          if (nextState && estopActive) {
            updatePumpControl();
            return;
          }

          pumpControlError = "";
          pumpCommandPending = true;
          updatePumpControl();
          try {
            await firebaseDatabase.ref("monitoreo/bomba").set(nextState);
            addLogEntry(currentUser.name, nextState ? "encendió la bomba." : "apagó la bomba.");
          } catch (error) {
            console.error("No se pudo cambiar el estado de la bomba desde el panel principal.", error);
            pumpControlError = "Error al cambiar la bomba. Revisa conexión y permisos de Firebase.";
          } finally {
            pumpCommandPending = false;
            updatePumpControl();
          }
        }

        function openSystemOptions() {
          document.getElementById("options-command-status").textContent =
            currentUser && currentUser.role === "ADMINISTRADOR" ? "" : "Solo el Administrador puede enviar comandos.";
          document.getElementById("system-options-dialog").showModal();
        }

        function closeSystemOptions() {
          document.getElementById("system-options-dialog").close();
        }

        function updateLcdAppearance() {
          const panel = document.getElementById("system-lcd");
          if (!currentUser || currentUser.role !== "ADMINISTRADOR") return;
          const background = document.getElementById("lcd-background").value;
          const textColor = document.getElementById("lcd-text-color").value;
          const font = document.getElementById("lcd-font").value;
          panel.style.backgroundColor = background;
          panel.style.setProperty("--lcd-bg", background);
          panel.style.setProperty("--lcd-fg", textColor);
          panel.dataset.font = font;

          try {
            localStorage.setItem("hmi-lcd-appearance", JSON.stringify({ background, textColor, font }));
          } catch (error) {
            console.warn("No se pudo guardar la apariencia de la pantalla LCD.", error);
          }
        }

        function loadLcdAppearance() {
          try {
            const saved = JSON.parse(localStorage.getItem("hmi-lcd-appearance") || "null");
            const backgrounds = [
              "#064e3b", "#0f172a", "#164e63", "#d1fae5", "#dbeafe", "#cffafe", "#fef3c7", "#f3f4f6",
              "#ffffff", "#c0c0c0", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff",
              "#1e3a8a", "#312e81", "#1d4ed8", "#3e8fd8", "#22c55e"
            ];
            if (saved && backgrounds.includes(saved.background)) {
              document.getElementById("lcd-background").value = saved.background;
            }
            if (saved && ["#ffffff", "#000000"].includes(saved.textColor)) {
              document.getElementById("lcd-text-color").value = saved.textColor;
            }
            if (saved && ["mono", "pixel", "terminal", "digital", "sans"].includes(saved.font)) {
              document.getElementById("lcd-font").value = saved.font;
            }
          } catch (error) {
            console.warn("No se pudo recuperar la apariencia guardada de la pantalla LCD.", error);
          }
          updateLcdAppearance();
        }

        function renderLcdMessage(value) {
          let message = value;
          if (value && typeof value === "object") {
            message = value.message ?? value.mensaje ?? value.text ?? value.estado;
          }
          externalLcdMessage = message === null || message === undefined ? "" : String(message).trim();
          updateSystemMessage();
        }

        function getSystemStatusMessage() {
          const tank1Level = tankLevels.sensor1;
          if (typeof tank1Level === "number" && tank1Level < 10) {
            return "El deposito esta a menos del 15%. Se suspende el llenado";
          }
          if (typeof tank1Level === "number" && tank1Level < 15) {
            return "Advertencia! Bajo nivel en T1";
          }
          if (typeof tank1Level === "number" && tank1Level >= 99.5) {
            return "El deposito T1 esta lleno. Cerrando llave..";
          }
          if (pumpStateKnown && cardStates[6]) {
            if (Date.now() < pumpStartUntil) return "* Arranque de bomba de agua";
            const destination = fillingPriority === 2 ? 2 :
              fillingPriority === 3 ? 3 : interleavedDestination;
            return "Llenando deposito " + destination;
          }
          if (pumpStateKnown && !cardStates[6]) return "Entrando en modo espera";
          return externalLcdMessage || defaultLcdMessage;
        }

        function updateSystemMessage() {
          const statusMessage = getSystemStatusMessage();
          document.getElementById("lcd-message").textContent =
            transientLcdMessage || statusMessage;

          if (lastProcessStatusMessage !== null && statusMessage !== lastProcessStatusMessage) {
            addLogEntry("Sistema", statusMessage);
          }
          lastProcessStatusMessage = statusMessage;
        }

        function showOptionMessage(message) {
          transientLcdMessage = message;
          clearTimeout(transientLcdTimer);
          updateSystemMessage();
          transientLcdTimer = setTimeout(() => {
            transientLcdMessage = "";
            updateSystemMessage();
          }, 5000);
        }

        async function sendSystemOption(option) {
          if (!currentUser || currentUser.role !== "ADMINISTRADOR") {
            document.getElementById("options-command-status").textContent =
              "Solo el Administrador puede enviar comandos.";
            return;
          }
          if (!Number.isInteger(option) || !Object.prototype.hasOwnProperty.call(optionMessages, option)) {
            document.getElementById("options-command-status").textContent =
              "Ingresa una opción válida entre 1 y 11.";
            return;
          }

          const status = document.getElementById("options-command-status");
          const submitButton = document.getElementById("options-submit-button");
          status.textContent = "Enviando comando " + option + "...";
          submitButton.disabled = true;
          document.querySelectorAll(".option-quick-button").forEach(button => {
            button.disabled = true;
          });
          try {
            await firebaseDatabase.ref("system_live/comandos/opciones").set(option);
            const message = optionMessages[option];
            showOptionMessage(message);
            addLogEntry(currentUser.name, message);
            status.textContent = "Comando " + option + " enviado.";
            document.getElementById("options-command-input").value = "";
          } catch (error) {
            console.error("No se pudo enviar la opción " + option + " a Firebase.", error);
            status.textContent = "Error al enviar. Revisa conexión y permisos de Firebase.";
          } finally {
            submitButton.disabled = currentUser.role !== "ADMINISTRADOR";
            document.querySelectorAll(".option-quick-button").forEach(button => {
              button.disabled = currentUser.role !== "ADMINISTRADOR";
            });
          }
        }

        function submitSystemOption(event) {
          event.preventDefault();
          const input = document.getElementById("options-command-input");
          const option = Number(input.value);
          if (!input.value.trim() || !Number.isInteger(option)) {
            document.getElementById("options-command-status").textContent =
              "Ingresa un número entero entre 1 y 11.";
            input.focus();
            return;
          }
          sendSystemOption(option);
        }

        function setFillingPriority(value) {
          if (!currentUser || currentUser.role !== "ADMINISTRADOR") return;
          if (!Number.isInteger(value) || !Object.prototype.hasOwnProperty.call(fillingPriorityNames, value)) return;

          firebaseDatabase.ref("system_live/controles/prioridad").set(value)
            .then(() => addLogEntry(currentUser.name, "cambió la prioridad de llenado a " + fillingPriorityNames[value] + "."))
            .catch(error => {
              console.error("No se pudo actualizar la prioridad de llenado en Firebase", error);
              alert("No se pudo actualizar la prioridad de llenado. Revisa la conexión y los permisos de Firebase.");
            });
        }

        function toggleDeveloperMode() {
          if (!currentUser || currentUser.role !== "ADMINISTRADOR") return;
          developerMode = !developerMode;
          const dashboard = document.querySelector(".dashboard");
          const button = document.getElementById("developer-mode-toggle");
          dashboard.classList.toggle("developer-mode", developerMode);
          button.setAttribute("aria-expanded", String(developerMode));
          button.textContent = developerMode ? "⚙️ Ocultar controles" : "⚙️ Modo Desarrollador";
        }

        function parseFirebaseState(value) {
          const normalizedValue = String(value).toLowerCase();
          return value === true || value === 1 ||
            normalizedValue === "true" || normalizedValue === "1" ||
            normalizedValue === "on" || normalizedValue === "encendida";
        }

        function applyTankLevel(sensor, value) {
          const level = Math.max(0, Math.min(100, Number(value)));
          if (!Number.isFinite(level)) return;
          tankLevels[sensor] = level;
          document.getElementById("top-level-" + sensor).textContent = level.toFixed(1) + "%";
          updateSystemMessage();

          const cardIdx = sensorCardMap[sensor];
          if (!Number.isInteger(cardIdx) || !cardSensorMap[cardIdx]) {
            console.error("No hay una tarjeta de tanque configurada para " + sensor + ".");
            return;
          }
          const slider = document.getElementById("colorSlider-" + cardIdx);
          if (!slider) {
            console.error("No se encontró el slider de la tarjeta para " + sensor + ".");
            return;
          }
          slider.value = String(level);
          updateCardColor(cardIdx);
          updateCardSummary(cardIdx);

          updateTankWaterClip(cardIdx, level);

          const levels = Object.values(tankLevels);
          if (levels.length === 3 && levels.every(current => Math.abs(current - level) < 0.01)) {
            document.getElementById("levelSlider").value = String(Math.round(level));
            document.getElementById("levelTxt").innerText = String(Math.round(level));
          }
        }

        function applyCardState(idx, isOn) {
          const previousPumpState = cardStates[6];
          const pumpWasKnown = pumpStateKnown;
          cardStates[idx] = isOn;
          if (idx === 6) {
            pumpStateKnown = true;
            pumpControlError = "";
            if (pumpWasKnown && previousPumpState !== isOn) {
              pumpStartUntil = isOn ? Date.now() + 2500 : 0;
              if (isOn) {
                setTimeout(() => {
                  if (pumpStateKnown && cardStates[6]) updateSystemMessage();
                }, 2500);
              }
            }
          }
          const button = document.getElementById("toggle-" + idx);
          const container = document.getElementById("card-container-" + idx);
          button.innerText = isOn ? "ON" : "OFF";
          button.className = "btn-toggle " + (isOn ? "active" : "inactive");
          container.classList.toggle("disabled-ui", !isOn);
          updateCardColor(idx);
          updateCardSummary(idx);
          if (idx === 6) {
            updatePumpControl();
            updateSystemMessage();
          }
        }

        function setupFirebaseListeners() {
          firebaseDatabase.ref("system_live/controles/prioridad").on("value", snapshot => {
            renderFillingPriority(snapshot.val());
          }, error => {
            console.error("Error leyendo system_live/controles/prioridad", error);
            document.getElementById("filling-priority-current").textContent =
              "No fue posible cargar la prioridad desde Firebase.";
          });

          Object.values(cardSensorMap).forEach(sensor => {
            firebaseDatabase.ref("monitoreo/" + sensor).on("value", snapshot => {
              if (snapshot.val() !== null) applyTankLevel(sensor, snapshot.val());
            }, error => console.error("Error leyendo monitoreo/" + sensor, error));
          });

          firebaseDatabase.ref("monitoreo/temp").on("value", snapshot => {
            if (snapshot.val() === null) return;
            const temperature = Number(snapshot.val());
            if (!Number.isFinite(temperature)) {
              console.error("Valor de temperatura no válido recibido desde monitoreo/temp", snapshot.val());
              return;
            }
            document.getElementById("top-temperature").textContent = temperature.toFixed(1) + "°C";
          }, error => console.error("Error leyendo monitoreo/temp", error));

          firebaseDatabase.ref("system_live/lcd_message").on("value", snapshot => {
            renderLcdMessage(snapshot.val());
          }, error => {
            console.error("Error leyendo system_live/lcd_message", error);
            document.getElementById("lcd-message").textContent =
              "Error al cargar el mensaje de estado desde Firebase.";
          });

          firebaseDatabase.ref(shutdownReasonPath).on("value", snapshot => {
            const value = snapshot.val();
            let reason = value;
            if (value && typeof value === "object") {
              reason = value.razon ?? value.mensaje ?? value.message ?? value.motivo;
            }
            const normalizedReason = reason === null || reason === undefined
              ? "Ninguna"
              : String(reason).trim() || "Ninguna";
            document.getElementById("last-shutdown-reason").textContent = normalizedReason;
            if (shutdownReasonKnown && normalizedReason !== lastShutdownReason) {
              addLogEntry("Sistema", "Razón de último apagado: " + normalizedReason);
            }
            lastShutdownReason = normalizedReason;
            shutdownReasonKnown = true;
          }, error => {
            console.error("Error leyendo " + shutdownReasonPath, error);
            document.getElementById("last-shutdown-reason").textContent =
              "No fue posible leer la razón desde Firebase.";
          });

          firebaseDatabase.ref("system_live/controles/valvula").on("value", snapshot => {
            if (snapshot.val() === null) return;
            interleavedDestination = parseFirebaseState(snapshot.val()) ? 2 : 3;
            updateSystemMessage();
          }, error => console.error("Error leyendo system_live/controles/valvula", error));

          Object.entries(cardStatePaths).forEach(([cardIdxText, path]) => {
            const cardIdx = Number(cardIdxText);
            firebaseDatabase.ref(path).on("value", snapshot => {
              if (snapshot.val() !== null || cardIdx === 6) {
                applyCardState(cardIdx, parseFirebaseState(snapshot.val()));
              }
            }, error => console.error("Error leyendo " + path, error));
          });

          Object.entries(cardColorPaths).forEach(([cardIdxText, path]) => {
            const cardIdx = Number(cardIdxText);
            firebaseDatabase.ref(path).on("value", snapshot => {
              const value = Number(snapshot.val());
              if (!Number.isInteger(value) || value < 0 || value > 19) return;
              document.getElementById("colorSlider-" + cardIdx).value = String(value);
              updateCardColor(cardIdx);
            }, error => console.error("Error leyendo " + path, error));
          });

          firebaseDatabase.ref("system_live/controles/tuberias/activo").on("value", snapshot => {
            if (snapshot.val() === null) return;
            pipesState = parseFirebaseState(snapshot.val());
            const button = document.getElementById("toggle-pipes");
            button.innerText = pipesState ? "ON" : "OFF";
            button.className = "btn-toggle " + (pipesState ? "active" : "inactive");
            updatePipesColor();
          }, error => console.error("Error leyendo estado de tuberías", error));

          firebaseDatabase.ref("system_live/controles/tuberias/color").on("value", snapshot => {
            const value = Number(snapshot.val());
            if (!Number.isInteger(value) || value < 0 || value > 19) return;
            document.getElementById("pipes-colorSlider").value = String(value);
            updatePipesColor();
          }, error => console.error("Error leyendo color de tuberías", error));

          setupAlarmListener();
        }

        function setupControlVectorListeners() {
          firebaseDatabase.ref("system_live/controles/modo").on("value", snapshot => {
            const mode = snapshot.val();
            if (!["MANUAL", "AUTO", "MANT"].includes(mode)) return;
            opMode = mode;
            document.querySelectorAll(".btn-mode").forEach(button => {
              button.classList.toggle("active", button.id === "mode-" + mode);
            });
          }, error => console.error("Error leyendo modo de operación", error));

          [
            { type: "high", path: "system_live/controles/setpoint_alto" },
            { type: "low", path: "system_live/controles/setpoint_bajo" }
          ].forEach(({ type, path }) => {
            firebaseDatabase.ref(path).on("value", snapshot => {
              const value = Number(snapshot.val());
              if (snapshot.val() === null || !Number.isFinite(value)) return;
              const slider = document.getElementById("sp-" + type);
              slider.value = String(value);
              document.getElementById("sp-" + type + "-val").innerText = slider.value + "%";
            }, error => console.error("Error leyendo " + path, error));
          });

          firebaseDatabase.ref("system_live/controles/estop").on("value", snapshot => {
            const value = snapshot.val();
            if (value === null) return;
            applyEStopState(parseFirebaseState(value));
          }, error => console.error("Error leyendo estado E-STOP", error));
        }

        function setupAuditLogListener() {
          firebaseDatabase.ref("system_live/logs")
            .orderByKey()
            .limitToLast(10)
            .on("value", snapshot => {
              const logs = [];
              snapshot.forEach(child => {
                const entry = child.val();
                if (entry && typeof entry === "object") logs.push(entry);
              });
              const newestFirst = logs.reverse();
              renderAuditLog(newestFirst);
              renderSystemTerminal(newestFirst.slice(0, 5));
            }, error => {
              console.error("Error leyendo el Audit Log de Firebase", error);
              const list = document.getElementById("audit-log-list");
              list.replaceChildren();
              const item = document.createElement("li");
              item.textContent = "No fue posible cargar el registro de auditoría.";
              list.appendChild(item);
              const terminal = document.getElementById("system-terminal");
              terminal.replaceChildren();
              const terminalItem = document.createElement("li");
              terminalItem.textContent = "No fue posible cargar los logs desde Firebase.";
              terminal.appendChild(terminalItem);
            });
        }

        // --- GESTIÓN DE USUARIOS (RBAC) ---
        const USERS = {
          "op_01": { name: "Operador_01", role: "OPERADOR", initials: "O1" },
          "sup_01": { name: "Supervisor_01", role: "SUPERVISOR", initials: "S1" },
          "adm_01": { name: "Admin_USAC", role: "ADMINISTRADOR", initials: "AD" }
        };
        let currentUser = USERS["adm_01"];

        function applyRBAC() {
          const isOp = currentUser.role === 'OPERADOR';
          const isSupervisor = currentUser.role === 'SUPERVISOR';
          document.getElementById('user-avatar-initials').innerText = currentUser.initials;
          document.getElementById('user-display-name').innerText = currentUser.name;
          document.getElementById('user-display-role').innerText = currentUser.role;
          const isAdmin = currentUser.role === 'ADMINISTRADOR';
          document.getElementById('developer-mode-toggle').hidden = !isAdmin;
          document.getElementById('filling-priority-actions').hidden = !isAdmin;
          document.getElementById('lcd-options').hidden = !isAdmin;
          if (!isAdmin && developerMode) {
            developerMode = false;
            document.querySelector('.dashboard').classList.remove('developer-mode');
            document.getElementById('developer-mode-toggle').setAttribute('aria-expanded', 'false');
            document.getElementById('developer-mode-toggle').textContent = '⚙️ Modo Desarrollador';
          }

          const cardsToLock = document.querySelectorAll('.card:not(.telemetry-card):not(.oee-card):not(.audit-log-card):not(.control-vector-card)');
          cardsToLock.forEach(c => {
            if(isOp) c.classList.add('readonly-operador');
            else c.classList.remove('readonly-operador');
          });

          document.getElementById('control-vector').classList.toggle('readonly-operador', isOp);
          document.querySelector('.setpoint-group').classList.toggle('readonly-operador', isOp || isSupervisor);
          document.querySelector('.mode-selector').classList.toggle('readonly-operador', isOp || isSupervisor);
          document.getElementById('reset-estop-control').classList.toggle('readonly-operador', isOp || isSupervisor);
          document.getElementById('simulate-alarm-control').hidden = !currentUser || currentUser.role !== 'ADMINISTRADOR';
          document.getElementById("options-command-input").disabled = !isAdmin;
          document.getElementById("options-submit-button").disabled = !isAdmin;
          document.querySelectorAll(".option-quick-button").forEach(button => {
            button.disabled = !isAdmin;
          });
          document.getElementById("options-command-status").textContent = isAdmin
            ? ""
            : "Solo el Administrador puede enviar comandos.";
          updatePumpControl();
        }

        function switchUser(uid) {
          currentUser = USERS[uid];
          applyRBAC();
          addLogEntry('Sistema', \`Sesión cambiada a \${currentUser.name} (\${currentUser.role})\`);
        }

        // --- LÓGICA DE AUDIT LOG ---
        function addLogEntry(user, action) {
          firebaseDatabase.ref("system_live/logs").push({
            user,
            action,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          }).catch(error => {
            console.error("No se pudo guardar una entrada del Audit Log", error);
          });
        }

        function renderAuditLog(entries) {
          const list = document.getElementById('audit-log-list');
          const fragment = document.createDocumentFragment();
          entries.forEach(entry => {
            const item = document.createElement("li");
            const time = document.createElement("span");
            time.className = "ts";
            const rawTimestamp = entry.timestamp ?? entry.ts ?? entry.hora;
            const parsedTimestamp = typeof rawTimestamp === "number"
              ? new Date(rawTimestamp)
              : new Date(String(rawTimestamp || ""));
            time.textContent = "[" + (
              Number.isNaN(parsedTimestamp.getTime())
                ? "hora no disponible"
                : parsedTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            ) + "] ";

            const user = document.createElement("b");
            user.textContent = String(entry.user || "Sistema");
            item.append(time, user, document.createTextNode(" " + String(entry.action || "")));
            fragment.appendChild(item);
          });
          list.replaceChildren(fragment);
        }

        function renderSystemTerminal(entries) {
          const list = document.getElementById("system-terminal");
          if (!entries.length) {
            const empty = document.createElement("li");
            empty.textContent = "Sin eventos registrados.";
            list.replaceChildren(empty);
            return;
          }

          const fragment = document.createDocumentFragment();
          entries.slice().reverse().forEach(entry => {
            const item = document.createElement("li");
            const timestamp = entry.timestamp ?? entry.ts ?? entry.hora;
            const date = typeof timestamp === "number"
              ? new Date(timestamp)
              : new Date(String(timestamp || ""));
            const time = document.createElement("span");
            time.className = "ts";
            time.textContent = "[" + (
              Number.isNaN(date.getTime())
                ? "hora no disponible"
                : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            ) + "] ";
            const user = document.createElement("span");
            user.className = "user";
            user.textContent = String(entry.user || "Sistema");
            item.append(time, user, document.createTextNode(" " + String(entry.action || entry.message || entry.mensaje || "")));
            fragment.appendChild(item);
          });
          list.replaceChildren(fragment);
        }

        // --- ESTADO VECTOR DE CONTROL ---
        let opMode = 'MANUAL';
        let estopActive = false;

        function setOpMode(mode) {
          if(currentUser.role !== 'ADMINISTRADOR') return;
          if(!["MANUAL", "AUTO", "MANT"].includes(mode)) return;
          if(opMode === mode) return;
          opMode = mode;
          document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
          document.getElementById('mode-' + mode).classList.add('active');
          writeFirebase("system_live/controles/modo", mode);
          addLogEntry(currentUser.name, \`cambió MODO a \${mode}.\`);
        }

        const setpointAuditTimers = {};
        function updateSP(type) {
          if(currentUser.role === 'OPERADOR' || currentUser.role === 'SUPERVISOR') return;
          if(type !== "high" && type !== "low") return;
          const val = document.getElementById('sp-' + type).value;
          document.getElementById('sp-' + type + '-val').innerText = val + '%';
          const path = type === "high"
            ? "system_live/controles/setpoint_alto"
            : "system_live/controles/setpoint_bajo";
          writeFirebase(path, Number(val));

          clearTimeout(setpointAuditTimers[type]);
          setpointAuditTimers[type] = setTimeout(() => {
            addLogEntry(currentUser.name, \`actualizó SETPOINT \${type.toUpperCase()} a \${val}%.\`);
          }, 500);
        }

        function applyEStopState(active) {
          estopActive = active;
          updateCardColor(7);
          const indicator = document.getElementById('estop-indicator');
          indicator.innerText = active
            ? "🛑 PARADA DE EMERGENCIA ACTIVA"
            : "SISTEMA: NORMAL (E-STOP OK)";
          indicator.className = "estop-badge " + (active ? "active" : "inactive");

          document.querySelectorAll('.card').forEach(card => {
            if(card.id === 'control-vector') return;
            card.classList.toggle('disabled-ui', active);
            card.classList.toggle('estop-locked', active);
          });

          if(!active) {
            visibleCardIndexes.forEach(idx => {
              document.getElementById("card-container-" + idx)
                .classList.toggle("disabled-ui", !cardStates[idx]);
            });
            document.getElementById("card-container-pipes")
              .classList.toggle("disabled-ui", !pipesState);
          }
          updatePumpControl();
        }

        function triggerEStop() {
          if(estopActive) return;
          applyEStopState(true);
          writeFirebase("system_live/controles/estop", true);
          addLogEntry(currentUser.name, 'activó PARADA DE EMERGENCIA.');
        }

        function resetEStop() {
          if(currentUser.role !== 'ADMINISTRADOR') return;
          if(!estopActive) return;
          applyEStopState(false);
          writeFirebase("system_live/controles/estop", false);
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

        // --- ALARMAS SINCRONIZADAS CON FIREBASE ---
        function renderAlarms(snapshot) {
          const container = document.getElementById('alarms-list');
          const alarms = [];
          snapshot.forEach(child => {
            const alarm = child.val();
            if (alarm && typeof alarm === "object") alarms.push({ id: child.key, alarm });
          });
          activeAlarms = alarms.map(({ alarm }) => alarm);
          updateCardColor(7);
          updateSystemMessage();

          if (alarms.length === 0) {
            container.textContent = "✅ No hay alarmas activas en el sistema";
            container.style.cssText = "text-align:center; color:#64748b; font-size:0.75rem; font-style:italic; padding:10px; border:1px dashed #cbd5e1; border-radius:8px;";
            return;
          }

          container.style.cssText = "";
          const fragment = document.createDocumentFragment();
          alarms.forEach(({ id, alarm }) => {
            const rawLevel = String(alarm.nivel || alarm.severity || alarm.tipo || "info").toLowerCase();
            const level = rawLevel.includes("critic") || rawLevel.includes("high")
              ? "critical"
              : rawLevel.includes("warn") || rawLevel.includes("out_of_range") || rawLevel.includes("sudden_drop")
                ? "warning"
                : "info";
            const card = document.createElement("div");
            card.className = "alarm-card " + level;

            const details = document.createElement("div");
            const code = document.createElement("span");
            code.style.cssText = "opacity:0.7; font-family:monospace;";
            code.textContent = "[" + String(alarm.cod || alarm.codigo || id) + "] ";
            details.appendChild(code);
            details.appendChild(document.createTextNode(String(
              alarm.mensaje || alarm.msg || alarm.detalle || "Alarma sin descripción"
            )));

            const rawTime = alarm.hora || alarm.timestamp || alarm.ts;
            const time = typeof rawTime === "number"
              ? new Date(rawTime).toLocaleString()
              : String(rawTime || "Hora no disponible");
            const timeLabel = document.createElement("small");
            timeLabel.style.cssText = "font-weight:400; opacity:0.8;";
            timeLabel.textContent = "Sello de tiempo: " + time;
            details.appendChild(document.createElement("br"));
            details.appendChild(timeLabel);

            const ack = document.createElement("button");
            ack.className = "btn-ack";
            ack.type = "button";
            ack.textContent = "ACEPTAR (ACK)";
            ack.addEventListener("click", async () => {
              ack.disabled = true;
              try {
                await firebaseDatabase.ref("system_live/alarmas/" + id).remove();
              } catch (error) {
                console.error("No se pudo confirmar la alarma " + id, error);
                ack.disabled = false;
                ack.textContent = "ERROR: REINTENTAR";
              }
            });

            card.append(details, ack);
            fragment.appendChild(card);
          });
          container.replaceChildren(fragment);
        }

        function setupAlarmListener() {
          firebaseDatabase.ref("system_live/alarmas").on("value", renderAlarms, error => {
            console.error("Error leyendo system_live/alarmas", error);
            const container = document.getElementById("alarms-list");
            container.textContent = "No fue posible cargar las alarmas desde Firebase.";
          });
        }

        async function simulateAlarm() {
          if (currentUser.role !== "ADMINISTRADOR") return;

          const messages = ["Fallo en bomba", "Fuga detectada", "Temperatura alta"];
          const message = messages[Math.floor(Math.random() * messages.length)];
          const level = Math.random() < 0.5 ? "critical" : "warning";
          const hora = new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          });
          const alarm = { mensaje: message, nivel: level, hora };

          try {
            await firebaseDatabase.ref("system_live/alarmas").push(alarm);
            alert("Alarma simulada inyectada: " + level.toUpperCase() + " - " + message);
          } catch (error) {
            console.error("No se pudo inyectar la alarma simulada en Firebase", error);
            alert("No se pudo inyectar la alarma. Revisa la conexión y los permisos de Firebase.");
          }
        }

        function toggleCard(idx) {
          cardStates[idx] = !cardStates[idx];
          const btn = document.getElementById("toggle-" + idx);
          const container = document.getElementById("card-container-" + idx);
          btn.innerText = cardStates[idx] ? "ON" : "OFF";
          btn.className = "btn-toggle " + (cardStates[idx] ? "active" : "inactive");
          container.classList.toggle("disabled-ui", !cardStates[idx]);
          updateCardColor(idx);
          updateCardSummary(idx);
          if (cardStatePaths[idx]) writeFirebase(cardStatePaths[idx], cardStates[idx]);
        }

        function togglePipes() {
          pipesState = !pipesState;
          const btn = document.getElementById("toggle-pipes");
          btn.innerText = pipesState ? "ON" : "OFF";
          btn.className = "btn-toggle " + (pipesState ? "active" : "inactive");
          document.getElementById("pipes-current-status").textContent =
            "Estado: " + (pipesState ? "Encendido" : "Apagado");
          updatePipesColor();
          writeFirebase("system_live/controles/tuberias/activo", pipesState);
        }

        function handleCardSliderInput(idx) {
          updateCardColor(idx);
          const slider = document.getElementById("colorSlider-" + idx);

          if (cardSensorMap[idx]) {
            writeFirebase("monitoreo/" + cardSensorMap[idx], Number(slider.value));
          } else if (cardColorPaths[idx]) {
            writeFirebase(cardColorPaths[idx], Number(slider.value));
          }
        }

        function handlePipesColorInput() {
          updatePipesColor();
          writeFirebase("system_live/controles/tuberias/color",
            Number(document.getElementById("pipes-colorSlider").value));
        }

        function updateCardColor(idx) {
          const container = document.getElementById("card-container-" + idx);
          const slider = document.getElementById("colorSlider-" + idx);
          const value = Number(slider.value);
          const isTank = Boolean(cardSensorMap[idx]);
          const paintLayer = container.querySelector('.paint-layer, .paint-custom');

          if (idx === 7) {
            const badge = document.getElementById("card-statusLabel-" + idx);
            const processAlarms = activeAlarms.filter(alarm => alarm.tipo !== "sensor");
            const alarmSeverity = alarm => {
              const level = String(alarm.nivel || alarm.severity || alarm.tipo || "warning").toLowerCase();
              if (level.includes("critic") || level.includes("high")) return "critical";
              if (level.includes("info")) return "info";
              return "warning";
            };
            const hasCriticalAlarm = processAlarms.some(alarm => alarmSeverity(alarm) === "critical");
            const hasWarningAlarm = processAlarms.some(alarm => alarmSeverity(alarm) === "warning");
            const color = estopActive || hasCriticalAlarm
              ? "#ef4444"
              : hasWarningAlarm
                ? "#fbbf24"
                : cardStates[idx]
                  ? "#3b82f6"
                  : null;

            paintLayer.setAttribute("fill", color || "transparent");
            paintLayer.style.opacity = color ? "0.8" : "0";
            paintLayer.style.filter = color
              ? "drop-shadow(0 0 6px " + color + ")"
              : "none";
            badge.style.backgroundColor = color || "#e2e8f0";
            badge.style.color = color === "#fbbf24" ? "#1e293b" : color ? "#fff" : "#475569";
            badge.innerText = estopActive || hasCriticalAlarm
              ? "FALLA CRÍTICA"
              : hasWarningAlarm
                ? "ADVERTENCIA"
                : cardStates[idx]
                  ? "FLUJO ACTIVO"
                  : "EN REPOSO";
            return;
          }

          if (isTank) {
            document.getElementById("card-colorTxt-" + idx).innerText =
              value.toFixed(1).replace(/\.0$/, "");
            const badge = document.getElementById("card-statusLabel-" + idx);
            badge.style.backgroundColor = "#3b82f6";
            badge.style.color = "#fff";
            badge.innerText = "AGUA";
            paintLayer.setAttribute("fill", "#3b82f6");
            return;
          }

          const color = paleta[value];
          
          document.getElementById("card-colorTxt-" + idx).innerText =
            Math.round((value / 19) * 100);
          const badge = document.getElementById("card-statusLabel-" + idx);
          
          if (cardStates[idx]) {
            badge.style.backgroundColor = color.c; badge.style.color = color.t; badge.innerText = color.n;
            paintLayer.setAttribute('fill', container.dataset.independent === "true" ? container.dataset.staticColor : color.c);
          } else {
            badge.style.backgroundColor = "#e2e8f0"; badge.innerText = "OFF";
            paintLayer.setAttribute('fill', "#cbd5e1");
          }
        }

        function updateCardSummary(idx) {
          const status = document.getElementById("card-current-status-" + idx);
          if (!status) return;
          const sensor = cardSensorMap[idx];
          const level = sensor ? tankLevels[sensor] : null;
          const levelText = typeof level === "number"
            ? "Nivel: " + Math.round(level) + "% · "
            : "";
          status.textContent = levelText + "Estado: " + (cardStates[idx] ? "Encendido" : "Apagado");
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
          document.getElementById("pipes-current-status").textContent =
            "Estado: " + (pipesState ? "Encendido" : "Apagado");
        }

        function updateSystemLevel() {
          const val = document.getElementById('levelSlider').value;
          document.getElementById('levelTxt').innerText = val;
          Object.values(sensorCardMap).forEach(cardIdx => updateTankWaterClip(cardIdx, Number(val)));
        }

        function updateTankWaterClip(cardIdx, level) {
          const dimensions = tankClipDimensions[cardIdx];
          const clipRectId = "card-" + cardIdx + "-clip-rect";
          const clipRect = document.getElementById(clipRectId);
          if (!dimensions || !clipRect || !Number.isFinite(level)) return;

          const boundedLevel = Math.max(0, Math.min(100, level));
          const height = dimensions.height * (boundedLevel / 100);
          clipRect.setAttribute("x", String(dimensions.x));
          clipRect.setAttribute("y", String(dimensions.y + dimensions.height - height));
          clipRect.setAttribute("width", String(dimensions.width));
          clipRect.setAttribute("height", String(height));
        }

        function handleSystemLevelInput() {
          updateSystemLevel();
          const level = Number(document.getElementById("levelSlider").value);
          ["sensor1", "sensor2", "sensor3"].forEach(sensor => {
            writeFirebase("monitoreo/" + sensor, level);
          });
        }

        window.onload = () => {
          addLogEntry('Sistema', 'HMI SCADA iniciado.');
          applyRBAC();
          loadLcdAppearance();
          Object.values(sensorCardMap).forEach(cardIdx => {
            const waterLayer = document.querySelector("#card-container-" + cardIdx + " .water-layer");
            if (!waterLayer) {
              console.error("No se encontró la capa de agua del tanque en la tarjeta " + cardIdx + ".");
              return;
            }
            try {
              const bounds = waterLayer.getBBox();
              tankClipDimensions[cardIdx] = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
              };
              updateTankWaterClip(cardIdx, Number(document.getElementById("colorSlider-" + cardIdx).value));
            } catch (error) {
              console.error("No se pudieron inicializar las dimensiones del agua en la tarjeta " + cardIdx + ".", error);
            }
          });
          applyCardState(7, false);
          updateSystemLevel(); 
          updatePipesColor(); 
          updateTelemetry(); 
          updateOEEAndFlow();
          setInterval(() => { updateTelemetry(); updateOEEAndFlow(); }, 2000);
          visibleCardIndexes.forEach(idx => updateCardColor(idx));
          setupFirebaseListeners();
          setupControlVectorListeners();
          setupAuditLogListener();
        };
      </script>`;
    return new Response(renderLayout(html, "dashboard"), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
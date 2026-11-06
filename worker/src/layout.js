const NAV_ITEMS = [
  { id: "proceso", href: "/proceso", label: "Proceso" },
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "telemetria", href: "/telemetria", label: "Telemetría" },
  { id: "alarmas", href: "/alarmas", label: "Alarmas" }
];

const THEME_NAMES = {
  ocean: "Océano",
  graphite: "Grafito",
  vercel: "Vercel",
  isa101: "ISA-101"
};

const THEME_STYLES = `
  :root,
  :root[data-theme="ocean"] {
    color-scheme: light;
    --bg-body: #f8fafc;
    --bg-card: #ffffff;
    --bg-subtle: #f1f5f9;
    --bg-input: #ffffff;
    --text-main: #0f172a;
    --text-muted: #64748b;
    --border-main: #e2e8f0;
    --accent: #3b82f6;
    --accent-strong: #2563eb;
    --on-accent: #ffffff;
    --accent-soft: #eff6ff;
    --success: #22c55e;
    --alert: #ef4444;
    --warning: #f59e0b;
    --warning-soft: #fef3c7;
    --warning-text: #92400e;
    --critical-soft: #fee2e2;
    --critical-text: #991b1b;
    --info-soft: #dbeafe;
    --info-text: #1e3a8a;
    --flow-color: #3b82f6;
    --nav-bg: #ffffff;
    --nav-link-bg: #f1f5f9;
    --nav-active-bg: #1e293b;
    --nav-active-text: #ffffff;
    --shadow-card: 0 4px 10px rgba(15, 23, 42, 0.08);
    --chart-grid: #e2e8f0;
    --chart-text: #475569;
    --chart-fill: rgba(59, 130, 246, 0.12);
    --chart-series-1: #2196f3;
    --chart-series-2: #22c55e;
    --chart-series-3: #f59e0b;
    --chart-series-temp: #ef4444;
  }
  :root[data-theme="graphite"] {
    color-scheme: dark;
    --bg-body: #0f172a;
    --bg-card: #1e293b;
    --bg-subtle: #172235;
    --bg-input: #0f172a;
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --border-main: #334155;
    --accent: #38bdf8;
    --accent-strong: #0ea5e9;
    --on-accent: #082f49;
    --accent-soft: #102a3a;
    --success: #22c55e;
    --alert: #ef4444;
    --warning: #fbbf24;
    --warning-soft: #3a2f14;
    --warning-text: #fde68a;
    --critical-soft: #3b1c25;
    --critical-text: #fecaca;
    --info-soft: #102a3a;
    --info-text: #bae6fd;
    --flow-color: #38bdf8;
    --nav-bg: #1e293b;
    --nav-link-bg: #273449;
    --nav-active-bg: #38bdf8;
    --nav-active-text: #082f49;
    --shadow-card: 0 4px 14px rgba(0, 0, 0, 0.24);
    --chart-grid: #334155;
    --chart-text: #cbd5e1;
    --chart-fill: rgba(56, 189, 248, 0.18);
    --chart-series-1: #38bdf8;
    --chart-series-2: #4ade80;
    --chart-series-3: #fbbf24;
    --chart-series-temp: #fb7185;
  }
  :root[data-theme="vercel"] {
    color-scheme: dark;
    --bg-body: #0a0a0a;
    --bg-card: #111318;
    --bg-subtle: #17191f;
    --bg-input: #0a0a0a;
    --text-main: #fafafa;
    --text-muted: #a1a1aa;
    --border-main: #1f2330;
    --accent: #6366f1;
    --accent-strong: #818cf8;
    --on-accent: #ffffff;
    --accent-soft: #1b1b35;
    --success: #22c55e;
    --alert: #ef4444;
    --warning: #fbbf24;
    --warning-soft: #332711;
    --warning-text: #fde68a;
    --critical-soft: #35191d;
    --critical-text: #fecaca;
    --info-soft: #1b1b35;
    --info-text: #c7d2fe;
    --flow-color: #818cf8;
    --nav-bg: #111318;
    --nav-link-bg: #1a1c24;
    --nav-active-bg: #6366f1;
    --nav-active-text: #ffffff;
    --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.32);
    --chart-grid: #292c36;
    --chart-text: #d4d4d8;
    --chart-fill: rgba(129, 140, 248, 0.18);
    --chart-series-1: #818cf8;
    --chart-series-2: #4ade80;
    --chart-series-3: #fbbf24;
    --chart-series-temp: #fb7185;
  }
  :root[data-theme="isa101"] {
    color-scheme: light;
    --bg-body: #e5e7eb;
    --bg-card: #ffffff;
    --bg-subtle: #f3f4f6;
    --bg-input: #ffffff;
    --text-main: #111827;
    --text-muted: #4b5563;
    --border-main: #d1d5db;
    --accent: #4b5563;
    --accent-strong: #374151;
    --on-accent: #ffffff;
    --accent-soft: #f3f4f6;
    --success: #22c55e;
    --alert: #ef4444;
    --warning: #f59e0b;
    --warning-soft: #fef3c7;
    --warning-text: #78350f;
    --critical-soft: #fee2e2;
    --critical-text: #7f1d1d;
    --info-soft: #e5e7eb;
    --info-text: #1f2937;
    --flow-color: #2563eb;
    --nav-bg: #ffffff;
    --nav-link-bg: #f3f4f6;
    --nav-active-bg: #4b5563;
    --nav-active-text: #ffffff;
    --shadow-card: 0 4px 8px rgba(17, 24, 39, 0.08);
    --chart-grid: #d1d5db;
    --chart-text: #374151;
    --chart-fill: rgba(37, 99, 235, 0.12);
    --chart-series-1: #2563eb;
    --chart-series-2: #16a34a;
    --chart-series-3: #d97706;
    --chart-series-temp: #dc2626;
  }
  * { box-sizing: border-box; }
  body { background: var(--bg-body); color: var(--text-main); }
  .site-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    width: 100%;
    padding: 12px 20px;
    background: var(--nav-bg);
    border-bottom: 1px solid var(--border-main);
    font-family: 'Segoe UI', sans-serif;
  }
  .site-nav a {
    color: var(--text-main);
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 20px;
    background: var(--nav-link-bg);
  }
  .site-nav a:hover { background: var(--border-main); }
  .site-nav a.active { color: var(--nav-active-text); background: var(--nav-active-bg); }
  .theme-control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    color: var(--text-muted);
    font: 700 12px 'Segoe UI', sans-serif;
  }
  .theme-control select {
    padding: 7px 10px;
    border: 1px solid var(--border-main);
    border-radius: 8px;
    background: var(--bg-input);
    color: var(--text-main);
    font: inherit;
  }
  .card, .panel, .tarjeta-hmi, .alarma-card, .alarmas-mensaje, .priority-card, .control-vector-card, .audit-log-card, .oee-card {
    background-color: var(--bg-card);
    color: var(--text-main);
    border-color: var(--border-main);
  }
  .card, .panel, .tarjeta-hmi, .alarma-card, .alarmas-mensaje {
    box-shadow: var(--shadow-card);
  }
  .card-current-status, .instrument-label, .control-label, .subtitle, .process-alert-details, .setpoint-header, .user-name, .alarmas-mensaje {
    color: var(--text-main);
  }
  .user-role, .alarma-hora, .telemetry-role { color: var(--text-muted); }
  :where(input, select, textarea, button:not(.btn-toggle):not(.btn-mode):not(.btn-ack):not(.priority-button)) {
    color-scheme: inherit;
  }
  .alarma-critica, .alarm-card.critical {
    color: var(--critical-text);
    background: var(--critical-soft);
    border-color: var(--alert);
  }
  .alarma-advertencia, .alarm-card.warning {
    color: var(--warning-text);
    background: var(--warning-soft);
    border-color: var(--warning);
  }
  .alarma-info {
    color: var(--info-text);
    background: var(--info-soft);
    border-color: var(--accent);
  }
  .alarma-ack, .btn-ack { background: var(--nav-active-bg); color: var(--nav-active-text); }
  .alarmas-mensaje.error { border-color: var(--alert); color: var(--critical-text); }
  .priority-card { background: var(--accent-soft); border-color: var(--accent); }
  .priority-title, .priority-current, .priority-button { color: var(--accent); }
  .priority-button { background: var(--bg-card); border-color: var(--border-main); }
  .priority-button.active { background: var(--accent-strong); border-color: var(--accent-strong); color: var(--on-accent); }
  .canvas, .pipe-item, .card-controls-panel, .control-card-item, .setpoint-row, .range-selector {
    background-color: var(--bg-subtle);
    border-color: var(--border-main);
  }
  .control-vector-card { border-color: var(--border-main); }
  .telemetry-card { background: var(--bg-card); color: var(--text-main); border-color: var(--border-main); }
  .telemetry-card .metric-box, .oee-box {
    background: var(--bg-subtle);
    color: var(--text-main);
    border-color: var(--border-main);
  }
  .metric-val, .metric-label, .audit-log-list li { color: var(--text-main); }
  .metric-label, .audit-log-list li .ts, .db-status span[style] { color: var(--text-muted) !important; }
  .oee-card { background: var(--accent-soft); border-color: var(--border-main); }
  .oee-val, .oee-label { color: var(--accent); }
  .telemetry-card > div > label, .oee-card > div > label { color: var(--text-main) !important; }
  .user-profile-card { background: var(--bg-card); border-color: var(--border-main); }
  .user-avatar { background: var(--accent-strong); }
  .estop-badge.inactive { background: var(--bg-subtle); color: var(--text-muted); border-color: var(--border-main); }
  .btn-sim-alarm { background: var(--warning); color: var(--warning-text); }
  .mode-selector .btn-mode { background: var(--bg-input); color: var(--text-main); border-color: var(--border-main); }
  .mode-selector .btn-mode.active, .btn-mode.active { background: var(--accent-strong); color: var(--on-accent); border-color: var(--accent-strong); }
  .btn-developer, .control-mode-button, .telemetry-role, .role-selector, .process-user-controls select {
    background: var(--bg-input);
    color: var(--text-main);
    border-color: var(--border-main);
  }
  .process-level-label rect { fill: var(--bg-card); stroke: var(--border-main); }
  .process-level-label text { fill: var(--text-main); }
  .process-modal-dialog { background: var(--bg-card); border-color: var(--border-main); color: var(--text-main); }
  .process-modal-title, .process-modal-details { color: var(--text-main); }
  .process-modal-close { background: var(--bg-subtle); color: var(--text-main); }
  .process-alert-status { background: var(--bg-subtle); color: var(--text-main); }
  .process-alert-status.critical { background: var(--critical-soft); color: var(--critical-text); }
  .process-alert-status.warning { background: var(--warning-soft); color: var(--warning-text); }
  .dashboard-header h2, .telemetry-heading h1, .telemetry-heading h2, .panel-header h2, .alarmas-page h1 { color: var(--text-main) !important; }
  .container .panel { background: var(--bg-card); color: var(--text-main); border-color: var(--border-main); }
  .container .range-selector { background: var(--bg-subtle); border-color: var(--border-main); }
  .container .info-msg, .container h2 { color: var(--accent); }
  .container .nivel-badge { background: var(--accent-strong); color: #fff; }
  .container .sim-panel { background: var(--bg-subtle); color: var(--accent); border-color: var(--border-main); }
  .container .sim-panel label { color: var(--text-muted); }
  .container .sim-value-display { background: var(--bg-body); color: var(--text-main); border-color: var(--border-main); }
  canvas { color: var(--chart-text); }
`;

export function renderLayout(content, activeTab) {
  const navigation = NAV_ITEMS.map(({ id, href, label }) => `
    <a href="${href}"${id === activeTab ? ' class="active" aria-current="page"' : ""}>${label}</a>
  `).join("");
  const pageTitle = activeTab === "dashboard" ? "Dashboard - SCADA HMI" : "SCADA HMI - USAC";
  const pageStyles = content.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  const bodyContent = content.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  return `<!DOCTYPE html>
<html lang="es" data-theme="ocean">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <script>
    (() => {
      try {
        const savedTheme = localStorage.getItem("hmi-theme");
        if (["ocean", "graphite", "vercel", "isa101"].includes(savedTheme)) {
          document.documentElement.dataset.theme = savedTheme;
        }
      } catch (error) {
        console.warn("No se pudo leer el tema guardado del HMI.", error);
      }
    })();
  </script>
  ${pageStyles.join("\n")}
  <style>${THEME_STYLES}</style>
</head>
<body>
  <nav class="site-nav" aria-label="Navegación principal">
    ${navigation}
    <label class="theme-control" for="hmi-theme-select">
      Tema
      <select id="hmi-theme-select" aria-label="Tema visual">
        ${Object.entries(THEME_NAMES).map(([value, label]) => `
          <option value="${value}">${label}</option>
        `).join("")}
      </select>
    </label>
  </nav>
  ${bodyContent}
  <script>
    (() => {
      const themes = ${JSON.stringify(Object.keys(THEME_NAMES))};
      const selector = document.getElementById("hmi-theme-select");
      const applyTheme = theme => {
        if (!themes.includes(theme)) return;
        document.documentElement.dataset.theme = theme;
        selector.value = theme;
        document.dispatchEvent(new CustomEvent("hmi:themechange", { detail: { theme } }));
      };

      applyTheme(document.documentElement.dataset.theme || "ocean");
      selector.addEventListener("change", () => {
        applyTheme(selector.value);
        try {
          localStorage.setItem("hmi-theme", selector.value);
        } catch (error) {
          console.warn("No se pudo guardar la preferencia de tema del HMI.", error);
        }
      });
    })();
  </script>
</body>
</html>`;
}

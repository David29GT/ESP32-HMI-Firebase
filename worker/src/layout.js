const NAV_ITEMS = [
  { id: "proceso", href: "/proceso", label: "Proceso" },
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "telemetria", href: "/telemetria", label: "Telemetría" },
  { id: "alarmas", href: "/alarmas", label: "Alarmas" }
];

export function renderLayout(content, activeTab) {
  const navigation = NAV_ITEMS.map(({ id, href, label }) => `
    <a href="${href}"${id === activeTab ? ' class="active" aria-current="page"' : ""}>${label}</a>
  `).join("");
  const pageTitle = activeTab === "dashboard" ? "Dashboard - SCADA HMI" : "SCADA HMI - USAC";
  const pageStyles = content.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  const bodyContent = content.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    * { box-sizing: border-box; }
    .site-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      width: 100%;
      padding: 12px 20px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      font-family: 'Segoe UI', sans-serif;
    }
    .site-nav a {
      color: #1e293b;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 20px;
      background: #f1f5f9;
    }
    .site-nav a:hover { background: #e2e8f0; }
    .site-nav a.active { color: #fff; background: #1e293b; }
  </style>
  ${pageStyles.join("\n")}
</head>
<body>
  <nav class="site-nav" aria-label="Navegación principal">${navigation}</nav>
  ${bodyContent}
</body>
</html>`;
}

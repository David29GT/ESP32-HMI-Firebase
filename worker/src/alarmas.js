import { renderLayout } from './layout.js';

export function renderAlarmas(config = {}) {
  const content = `
    <style>
      body {
        margin: 0;
        background: #f1f5f9;
        color: #1e293b;
        font-family: 'Segoe UI', sans-serif;
      }
      .alarmas-page {
        width: min(100% - 32px, 900px);
        margin: 24px auto;
      }
      .alarmas-page h1 {
        margin: 0 0 16px;
        font-size: 1.5rem;
      }
      #lista-alarmas {
        display: grid;
        gap: 12px;
      }
      .alarma-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border: 2px solid transparent;
        border-radius: 10px;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
      }
      .alarma-critica {
        color: #7f1d1d;
        background: #fee2e2;
        border-color: #ef4444;
        animation: parpadeo-critico 1.5s infinite;
      }
      .alarma-advertencia {
        color: #78350f;
        background: #fef3c7;
        border-color: #f59e0b;
      }
      .alarma-info {
        color: #1e3a8a;
        background: #dbeafe;
        border-color: #60a5fa;
      }
      .alarma-detalle {
        display: grid;
        gap: 5px;
      }
      .alarma-nivel {
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .alarma-hora {
        font-size: 0.8rem;
        opacity: 0.8;
      }
      .alarma-ack {
        flex: 0 0 auto;
        padding: 8px 16px;
        border: 0;
        border-radius: 6px;
        background: #1e293b;
        color: white;
        font-weight: 800;
        cursor: pointer;
      }
      .alarma-ack:disabled {
        cursor: wait;
        opacity: 0.6;
      }
      .alarmas-mensaje {
        padding: 16px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: white;
        color: #475569;
      }
      .alarmas-mensaje.error {
        border-color: #ef4444;
        color: #991b1b;
      }
      @keyframes parpadeo-critico {
        50% { box-shadow: 0 0 14px rgba(239, 68, 68, 0.55); }
      }
      @media (prefers-reduced-motion: reduce) {
        .alarma-critica { animation: none; }
      }
    </style>
    <main class="alarmas-page">
      <h1>Alarmas del sistema</h1>
      <div id="lista-alarmas" aria-live="polite">
        <div class="alarmas-mensaje">Conectando con Firebase...</div>
      </div>
    </main>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <script>
      const firebaseConfig = {
        databaseURL: ${JSON.stringify(config.FIREBASE_URL || 'https://esp32-hmi-default-rtdb.firebaseio.com/')}
      };
      firebase.initializeApp(firebaseConfig);

      const listaAlarmas = document.getElementById("lista-alarmas");
      const alarmasRef = firebase.database().ref("system_live/alarmas");

      function mostrarMensaje(texto, esError = false) {
        const mensaje = document.createElement("div");
        mensaje.className = "alarmas-mensaje" + (esError ? " error" : "");
        mensaje.textContent = texto;
        listaAlarmas.replaceChildren(mensaje);
      }

      function obtenerGravedad(alarma) {
        const valor = String(alarma.nivel || alarma.severity || alarma.tipo || "info").toLowerCase();
        if (valor.includes("critic") || valor.includes("high") || valor.includes("critical")) {
          return { clase: "alarma-critica", etiqueta: "Crítica" };
        }
        if (valor.includes("warn") || valor.includes("out_of_range") || valor.includes("sudden_drop")) {
          return { clase: "alarma-advertencia", etiqueta: "Advertencia" };
        }
        return { clase: "alarma-info", etiqueta: valor };
      }

      function obtenerHora(alarma) {
        const valor = alarma.hora || alarma.timestamp || alarma.ts;
        if (valor === undefined || valor === null || valor === "") return "Hora no disponible";
        const fecha = typeof valor === "number" ? new Date(valor) : new Date(String(valor));
        return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleString();
      }

      function renderAlarmas(datos) {
        if (!datos || typeof datos !== "object") {
          mostrarMensaje("No hay alarmas activas.");
          return;
        }

        const entradas = Object.entries(datos).filter(([, alarma]) =>
          alarma && typeof alarma === "object"
        );
        if (entradas.length === 0) {
          mostrarMensaje("No hay alarmas activas.");
          return;
        }

        const fragmento = document.createDocumentFragment();
        entradas.forEach(([idAlarma, alarma]) => {
          const gravedad = obtenerGravedad(alarma);
          const tarjeta = document.createElement("article");
          tarjeta.className = "alarma-card " + gravedad.clase;

          const detalle = document.createElement("div");
          detalle.className = "alarma-detalle";

          const nivel = document.createElement("strong");
          nivel.className = "alarma-nivel";
          nivel.textContent = gravedad.etiqueta;

          const mensaje = document.createElement("span");
          mensaje.textContent = String(alarma.mensaje || alarma.msg || alarma.detalle || "Alarma sin descripción");

          const hora = document.createElement("time");
          hora.className = "alarma-hora";
          hora.textContent = obtenerHora(alarma);

          const ack = document.createElement("button");
          ack.className = "alarma-ack";
          ack.type = "button";
          ack.textContent = "ACK";
          ack.addEventListener("click", async () => {
            ack.disabled = true;
            try {
              await firebase.database().ref("system_live/alarmas/" + idAlarma).remove();
            } catch (error) {
              console.error("No se pudo confirmar la alarma " + idAlarma, error);
              ack.disabled = false;
              mostrarMensaje("No se pudo eliminar la alarma. Intenta de nuevo.", true);
            }
          });

          detalle.append(nivel, mensaje, hora);
          tarjeta.append(detalle, ack);
          fragmento.append(tarjeta);
        });

        listaAlarmas.replaceChildren(fragmento);
      }

      alarmasRef.on("value", snapshot => {
        renderAlarmas(snapshot.val());
      }, error => {
        console.error("Error leyendo system_live/alarmas", error);
        mostrarMensaje("No fue posible cargar las alarmas desde Firebase.", true);
      });
    </script>`;

  return renderLayout(content, "alarmas");
}

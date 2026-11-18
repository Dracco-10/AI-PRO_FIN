// página demo, como si fuera el sitio de un cliente de AGIChat con el widget instalado
import { defaultWsUrl, mountChatWidget } from "./sdk";

document.body.insertAdjacentHTML(
  "afterbegin",
  `<main class="demo-page">
     <h1>Cine Club La Sexta</h1>
     <p>Sitio de prueba de un cliente de AGIChat. Abajo a la derecha está Butaca, el asistente que te ayuda a escoger qué ver 🎟️</p>
   </main>`
);

mountChatWidget(document.getElementById("root")!, { wsUrl: defaultWsUrl(), defaultOpen: true });

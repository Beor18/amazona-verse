/* Amazona Verse · «Cotorras en línea»: conexión al Realtime de Supabase (Kelvin, 2026-11-09; docs/DECISION_LOG.md).
   Es la ÚNICA copia de la clave publicable del proyecto: es pública por diseño (va en el cliente) y solo abre canales
   de Realtime (Broadcast y Presence). El proyecto no tiene tablas ni cuentas. No la copies a documentos ni mensajes.
   Se carga solo al abrir «Jugar en línea» (src/game/en_linea.js). */
window.AV_EN_LINEA_CFG = {
  ws: 'wss://xsbtepftqkwqbielveaw.supabase.co/realtime/v1/websocket',
  clave: 'sb_publishable_u8-4kpHjvMUNdRkpfH2P0A_S3DFUZcV',
};

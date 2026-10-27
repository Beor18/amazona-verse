/* Inglés del episodio 5. Suma el diccionario del capítulo 1 y las frases de este pack.
   src/game/idioma.js lo carga solo cuando el idioma es EN. */
(function () {
  'use strict';
  const extra = {
    'Las voces olvidadas': 'The forgotten voices',
    'Capítulo 5 · El taller': 'Chapter 5 · The workshop',
    'Capítulo 5 · Las voces olvidadas': 'Chapter 5 · The forgotten voices',
    'Capítulo 5. No uses tu nombre real.': 'Chapter 5. Do not use your real name.',
    'Las dos voces se oyeron': 'The two voices were heard',
    'Las dos voces se oyeron enteras. Iguaca tiene unas preguntas, cuando quieras. Y el capítulo 6 espera: el pacto de los 36.': 'Both voices were heard in full. Iguaca has some questions, whenever you like. And chapter 6 is waiting: the pact of the 36.',
    'Habla con Iguaca': 'Talk to Iguaca',
    'Sintoniza el transmisor': 'Tune the transmitter',
    'Separa las dos ondas': 'Separate the two waves',
    'Copia el patrón de la luz': 'Copy the light pattern',
    'Ordena el mensaje': 'Put the message in order',
    'Lee las cinco ruinas': 'Read the five ruins',
    'Pregunta por las dos que faltan': 'Ask about the two who are missing',
    'Endereza la antena': 'Straighten the antenna',
    'Elige cómo enviar la señal': 'Choose how to send the signal',
    'Pon tres estaciones': 'Place three stations',
    'Prueba el relevo': 'Test the relay',
    'Pide ayuda para las estaciones': 'Ask for help with the stations',
    'Vuelve a probar hasta la niebla': 'Test again, all the way to the fog',
    'Mensajes en pedazos': 'Messages in pieces',
    'Lo que recuerdan las piedras': 'What the stones remember',
    'El relevo': 'The relay',
    'Transmisor': 'Transmitter',
    'Ruinas': 'Ruins',
    'Señal': 'Signal',
    'Sintoniza cinco posiciones': 'Tune five positions',
    'Marca las dos ondas': 'Mark the two waves',
    'Copia el patrón': 'Copy the pattern',
    'Lee y clasifica las cinco marcas': 'Read and sort the five marks',
    'Escucha al Guardián': 'Listen to the Guardian',
    'Endereza la antena y elige un código': 'Straighten the antenna and choose a code',
    'Primera prueba': 'First test',
    'Pide ayuda': 'Ask for help',
    'La señal llega': 'The signal arrives',
    'Dos voces a la vez. No es eco.': 'Two voices at once. It is not an echo.',
    'Esa voz es de ahora… y la otra también.': 'That voice is from now… and so is the other one.',
    'Villa Raíz. Por fin.': 'Villa Raíz. At last.',
    'Nos conocían por otros nombres, en dos islas del sur.': 'They knew us by other names, on two islands to the south.',
    'Ya no estamos donde estábamos. Pero hablamos desde ahora, igual que ustedes.': 'We are no longer where we were. But we speak from now, just as you do.',
    'El pacto no se rompió con el cielo. Se rompió cuando dejamos de hablarnos.': 'The pact did not break with the sky. It broke when we stopped speaking to each other.',
    'Busquen a los que quedan. Los treinta y seis no eran treinta y seis por separado.': 'Look for those who remain. The thirty-six were not thirty-six apart.',
    'Eran dos. Las de las islas del sur.': 'There were two. The ones from the islands to the south.',
    'Mira: otra luz, más allá. Y otra.': 'Look: another light, farther out. And another.',
    'No los vas a poder juntar tú sola.': 'You will not be able to bring them together on your own.',
    'No. Pero sí puedo ayudar a que se junten.': 'No. But I can help them come together.',
    'Linterna': 'Flashlight',
    'Lupa': 'Magnifying glass',
    'Bandera de Puerto Rico': 'Flag of Puerto Rico',
    'Mapa de las torres': 'Map of the towers',
    'ordenar el mensaje': 'putting the message in order',
    'leer las piedras': 'reading the stones',
    'llevar la señal hasta la niebla': 'carrying the signal to the fog',
    'el Diario completo': 'the full journal',
    'Próximo:': 'Next:',
    'Diario de las voces': 'Journal of the voices',
    'Diario': 'Journal',
    'Señales': 'Signals',
    'Memoria': 'Memory',
  };
  function publicar(base) {
    window.AV_EN = Object.assign({}, base || {}, extra);
  }
  let base = null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'content/cap1/en.js', false);
    xhr.send();
    if (xhr.status === 0 || xhr.status === 200) {
      const previo = window.AV_EN;
      (0, eval)(xhr.responseText);
      base = window.AV_EN;
      window.AV_EN = previo;
    }
  } catch (e) { base = window.AV_EN || null; }
  publicar(base);
})();

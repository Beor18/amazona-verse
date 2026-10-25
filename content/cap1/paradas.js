/* Content pack cap1 · paradas de aprendizaje en la aldea (zona de los edificios de Kelvin)
   Tres preguntas cortas de ciencias sobre el lugar (agua, construcción y bosque), en ES/EN, que repasan lo que el niño vio en
   "La ruta de la gota": conceptos de la lección (el agua corre cuesta abajo, lo que llueve en la montaña hace crecer el río,
   dónde construir) y un dato verificado (yagrumo, USDA FS · Drew et al. 2009). Otras cinco de ciencia de Puerto Rico
   (cotorra, palma de sierra, nido, María y flamboyán) salen de una ficha «verificado» de lecciones.js (USFWS, USDA Forest Service),
   muestran su fuente y desbloquean esa ficha. Cada parada se liga a un objetivo de lecciones.js, que da sus estándares DEPR 2022 y NGSS.
   - Aparecen al terminar la misión educativa y son opcionales: retroalimentación inmediata, pista y respuesta explicada
     (G.aula.hacerPregunta), sin puntaje. El intento queda en S.edu.paradas y en el registro del aula.
   - Lugares por id de POI (parada_agua, parada_techo, parada_claro: los coloca el level designer); las cinco de ciencia de
     Puerto Rico no tienen POI en mapa_cap1.js (lo genera tools/blender/mapa_build.py) y usan 'prov': posiciones medidas sobre
     el mapa alrededor de 'aldea' (o de 'plaza' en el mundo viejo). Siempre a 5 m o más de cualquier otro interactuable,
     hallazgo u objeto: si el sitio no cumple, la parada se aparta sola hasta el primer lugar seco que cumpla. */
(function () {
  'use strict';
  const SEPARACION = 5;
  const PARADAS = [
    { id: 'parada_agua', icono: 'gota', color: '#3d8fb0', objetivo: 'O6',
      prov: [{ de: 'aldea', dx: 9, dz: 7 }, { de: 'plaza', dx: -9, dz: 7 }],
      pregunta: { id: 'parada_agua', tipo: 'opcion_multiple',
        enunciado: { es: 'Mira las casas de la aldea. Si llueve fuerte en la montaña, ¿cuál está más segura?', en: 'Look at the village houses. If it rains hard on the mountain, which one is safer?' },
        opciones: [{ es: 'La casa alta, lejos del río', en: 'The house up high, away from the river' }, { es: 'La casa en la orilla del río', en: 'The house on the riverbank' }, { es: 'Las dos están igual de seguras', en: 'Both are equally safe' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. Lo que llueve en la montaña baja por el río y lo hace crecer.', en: 'Yes. Rain on the mountain flows down the river and makes it rise.' },
          incorrecta: { es: 'Pista: recuerda la ruta de la gota. ¿Hacia dónde corrió el agua?', en: 'Hint: remember the raindrop. Where did the water run?' } } } },
    { id: 'parada_techo', icono: 'casa', color: '#a8743f', objetivo: 'O6',
      prov: [{ de: 'aldea', dx: -9, dz: 7 }, { de: 'plaza', dx: -9, dz: -8 }],
      pregunta: { id: 'parada_techo', tipo: 'opcion_multiple',
        enunciado: { es: 'Este techo está inclinado. ¿Para qué sirve la pendiente cuando llueve?', en: 'This roof is sloped. What is the slope for when it rains?' },
        opciones: [{ es: 'Para que el agua corra hacia abajo y no se quede arriba', en: 'So the water runs down and does not stay on top' }, { es: 'Para que el techo pese más', en: 'To make the roof heavier' }, { es: 'Para que la lluvia entre a la casa', en: 'To let the rain into the house' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. El agua siempre corre cuesta abajo, como la gota por la quebrada.', en: 'Yes. Water always runs downhill, like the raindrop in the ravine.' },
          incorrecta: { es: 'Pista: ¿hacia dónde corre el agua en una loma?', en: 'Hint: which way does water run on a slope?' } } } },
    { id: 'parada_claro', icono: 'hoja', color: '#3f9f5a', objetivo: 'O4', ficha: 'yagrumo',
      prov: [{ de: 'aldea', dx: 0, dz: -11 }, { de: 'plaza', dx: 10, dz: -9 }],
      pregunta: { id: 'parada_claro', tipo: 'opcion_multiple',
        enunciado: { es: 'En este claro no hay árboles encima. ¿Cómo es la luz aquí, comparada con el suelo del bosque?', en: 'There are no trees above this clearing. How is the light here compared with the forest floor?' },
        opciones: [{ es: 'Hay más luz', en: 'There is more light' }, { es: 'Hay menos luz', en: 'There is less light' }, { es: 'Es igual', en: 'It is the same' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. Por eso, después de un huracán, el yagrumo crece rápido en los claros: es un árbol pionero.', en: 'Yes. That is why, after a hurricane, the yagrumo grows fast in clearings: it is a pioneer tree.' },
          incorrecta: { es: 'Pista: mira hacia arriba. ¿Qué tapa el sol dentro del bosque?', en: 'Hint: look up. What blocks the sun inside the forest?' } } } },
    // Ciencia de Puerto Rico. Cada dato sale de una ficha «verificado» de lecciones.js (misma fuente, que se muestra) y la desbloquea.
    // Las posiciones (dx, dz desde el POI 'aldea') están medidas sobre el mapa: pendiente de 10° o menos, a 4 m o más del agua, a 3 m o más
    // de la huella de los edificios de Kelvin y a 12 m o más de los interactuables, hallazgos y otras paradas. Hacen un círculo por el norte, el oeste y el sur.
    { id: 'parada_cotorra', icono: 'hoja', color: '#2f9e4f', objetivo: 'O5', ficha: 'cotorra_estatus', fuente: 'USFWS',
      prov: [{ de: 'aldea', dx: 1, dz: -16 }, { de: 'plaza', dx: 12, dz: 9 }],
      pregunta: { id: 'parada_cotorra', tipo: 'opcion_multiple',
        enunciado: { es: '¿Qué tiene de especial Vittata, la cotorra puertorriqueña?', en: 'What is special about Vittata, the Puerto Rican parrot?' },
        opciones: [{ es: 'Es el único loro nativo de Estados Unidos', en: 'It is the only native parrot in the United States' }, { es: 'Vive en todos los países del mundo', en: 'It lives in every country in the world' }, { es: 'Es un loro que no sabe volar', en: 'It is a parrot that cannot fly' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. Y la ley la protege como especie en peligro desde 1967.', en: 'Yes. And the law has protected it as an endangered species since 1967.' },
          incorrecta: { es: 'Pista: piensa en Vittata. ¿Es de aquí? ¿Sabe volar?', en: 'Hint: think of Vittata. Is she from here? Can she fly?' } } } },
    { id: 'parada_palma', icono: 'hoja', color: '#6a9f3a', objetivo: 'O6', ficha: 'palma_sierra', fuente: 'USDA Forest Service (Drew et al. 2009, El Verde)',
      prov: [{ de: 'aldea', dx: -13, dz: -16 }, { de: 'plaza', dx: 4, dz: 15 }],
      pregunta: { id: 'parada_palma', tipo: 'opcion_multiple',
        enunciado: { es: 'Tras los huracanes Hugo y Georges, ¿qué especie era la más abundante en un bosque que estudiaron en El Yunque?', en: 'After hurricanes Hugo and Georges, which species was the most abundant in a forest studied in El Yunque?' },
        opciones: [{ es: 'La palma de sierra', en: 'The sierra palm' }, { es: 'El flamboyán', en: 'The flamboyant tree' }, { es: 'El bambú', en: 'Bamboo' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. En 2005, la palma de sierra era la más abundante en ese estudio de El Verde.', en: 'Yes. By 2005, the sierra palm was the most abundant species in that El Verde study.' },
          incorrecta: { es: 'Pista: el flamboyán viene de Madagascar. Busca una palma de la montaña.', en: 'Hint: the flamboyant tree comes from Madagascar. Look for a mountain palm.' } } } },
    { id: 'parada_nido', icono: 'casa', color: '#8a5a2b', objetivo: 'O4', ficha: 'cotorra_nidos', fuente: 'USFWS',
      prov: [{ de: 'aldea', dx: -27, dz: 6 }, { de: 'plaza', dx: -13, dz: 12 }],
      pregunta: { id: 'parada_nido', tipo: 'opcion_multiple',
        enunciado: { es: '¿Dónde pone su nido una cotorra puertorriqueña?', en: 'Where does a Puerto Rican parrot nest?' },
        opciones: [{ es: 'En huecos de los árboles', en: 'In tree holes' }, { es: 'En el suelo, entre las hojas', en: 'On the ground, among the leaves' }, { es: 'En la arena de la playa', en: 'In the beach sand' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. Y en El Yunque también usa huecos artificiales.', en: 'Yes. And in El Yunque it also uses artificial cavities.' },
          incorrecta: { es: 'Pista: busca un lugar alto y protegido, dentro de un tronco.', en: 'Hint: look for a high, sheltered place inside a trunk.' } } } },
    { id: 'parada_maria', icono: 'gota', color: '#5b6f8f', objetivo: 'O6', ficha: 'cotorra_maria', fuente: 'USFWS',
      prov: [{ de: 'aldea', dx: -26, dz: 20 }, { de: 'plaza', dx: 14, dz: -13 }],
      pregunta: { id: 'parada_maria', tipo: 'opcion_multiple',
        enunciado: { es: 'En 2017, el huracán María dejó a El Yunque sin cotorras silvestres. ¿Cómo volvieron?', en: 'In 2017, Hurricane María left El Yunque with no wild parrots. How did they come back?' },
        opciones: [{ es: 'Se liberaron cotorras criadas en aviarios', en: 'Parrots raised in aviaries were released' }, { es: 'Llegaron volando desde otro país', en: 'They flew in from another country' }, { es: 'Nunca volvieron', en: 'They never came back' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. En 2020 se volvieron a liberar en El Yunque cotorras criadas en aviarios.', en: 'Yes. In 2020, aviary-raised parrots were released in El Yunque again.' },
          incorrecta: { es: 'Pista: recuerda los aviarios, donde se crían cotorras a salvo.', en: 'Hint: remember the aviaries, where parrots are raised safely.' } } } },
    { id: 'parada_flamboyan', icono: 'flor', color: '#d6403a', objetivo: 'O5', ficha: 'flamboyan', fuente: 'USDA Forest Service (manual de semillas)',
      prov: [{ de: 'aldea', dx: -1, dz: 29 }, { de: 'plaza', dx: -4, dz: -15 }],
      pregunta: { id: 'parada_flamboyan', tipo: 'opcion_multiple',
        enunciado: { es: 'El flamboyán tiene flores rojas enormes. ¿De dónde es originario?', en: 'The flamboyant tree has huge red flowers. Where is it originally from?' },
        opciones: [{ es: 'De Madagascar', en: 'From Madagascar' }, { es: 'De El Yunque, aquí mismo', en: 'From El Yunque, right here' }, { es: 'Del Polo Norte', en: 'From the North Pole' }],
        correcta: 0,
        retro: { correcta: { es: 'Sí. Viene de Madagascar y hoy se planta en casi todos los países sin heladas.', en: 'Yes. It comes from Madagascar and is now planted in nearly every country without frost.' },
          incorrecta: { es: 'Pista: no es de aquí. Vino de una isla muy lejos.', en: 'Hint: it is not from here. It came from a faraway island.' } } } },
  ];
  const TX = {
    parada: { es: 'Parada de ciencias', en: 'Science stop' }, mirar: { es: 'Mirar: parada de ciencias', en: 'Look: science stop' },
    aldea: { es: 'La aldea', en: 'The village' }, fuente: { es: 'Fuente', en: 'Source' },
  };

  AVE.registerPack({
    id: 'cap1',
    paradas: PARADAS,

    preparar(G) {
      const S = G.S, AU = G.aula, E = G.c.edu, H = G.terreno.height;
      if (!AU || !AU.activo || !E || !E.marcador) return;
      const t = AU.t;
      const objetivo = id => ((AU.LEC.objetivos || []).find(o => o.id === id) || {});
      const resp = () => (S.edu.paradas = S.edu.paradas || {});
      const disponible = () => !!S.missions.educativa;

      // Lugar: POI del level designer o provisional; después, separación de 5 m y suelo seco
      function lugar(p) {
        let q = null;
        try { q = typeof G.terreno.poi === 'function' ? G.terreno.poi(p.id) : null; } catch (e) { q = null; }
        if (!q || !isFinite(q.x)) for (const pr of p.prov) { const b = E.poi(pr.de); if (b) { q = { x: b.x + pr.dx, z: b.z + pr.dz }; break; } }
        return q ? { x: q.x, z: q.z } : null;
      }
      const ocupados = () => [].concat(
        G.interaccion.list.map(i => ({ x: i.x, z: i.z })),
        (G.diario.entries || []).map(f => ({ x: f.x, z: f.z })),
        (G.objetos.recursos || []).map(r => ({ x: r.x, z: r.z })));
      const libre = (x, z) => ocupados().every(o => Math.hypot(o.x - x, o.z - z) >= SEPARACION) && !(G.agua.levelAt(x, z) > H(x, z));
      function apartar(q) {
        if (libre(q.x, q.z)) return q;
        for (let r = 2; r <= 24; r += 2) for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2, x = q.x + Math.cos(a) * r, z = q.z + Math.sin(a) * r;
          if (libre(x, z)) return { x, z };
        }
        return q;
      }

      const vis = [];
      for (const p of PARADAS) {
        const q0 = lugar(p); if (!q0) continue;
        const q = apartar(q0);
        p.x = q.x; p.z = q.z;
        const m = E.marcador({ x: q.x, y: H(q.x, q.z), z: q.z, icono: p.icono, color: p.color, altoIcono: 2.1 });
        vis.push({ p, m });
        G.interaccion.add({ id: p.id, x: q.x, z: q.z, r: 2.2,
          visible: () => disponible() && !resp()[p.id],
          label: () => t(TX.mirar), use: () => abrir(p) });
      }

      function abrir(p) {
        const cab = `<div class="edu-head"><div><span class="eyebrow">${AU.esc(t(TX.parada))} · ${AU.esc(p.objetivo)}</span><h2>${AU.esc(t(TX.aldea))}</h2>${p.fuente ? `<small class="fuente">${AU.esc(t(TX.fuente))}: ${AU.esc(p.fuente)}</small>` : ''}</div></div>`;
        AU.hacerPregunta(p.pregunta, { cabecera: cab, alTerminar: intento => {
          resp()[p.id] = intento;
          G.ui.hideCard();
          G.emit('aprendizaje', { tipo: 'pregunta', id: p.id, intento });
          if (p.ficha) AU.desbloquear([p.ficha]);
          const v = vis.find(x => x.p === p); if (v) G.fx.burst(p.x, H(p.x, p.z) + 1.5, p.z, 'gold', 16);
          if (AU.partida()) AU.registrar({ paradas: Object.assign({}, resp()) });
          G.guardado.autosave();
        } });
      }

      // Modo Maestro: pestaña con las paradas, su objetivo y sus estándares (de lecciones.js)
      AU.pestana({ id: 'paradas', titulo: { es: 'Paradas', en: 'Stops' }, html: () => {
        const r = resp();
        return `<p class="note">${AU.esc(t({ es: 'Preguntas cortas en la aldea, opcionales, después de "La ruta de la gota". Tres repasan la lección; cinco traen un dato de ciencia de Puerto Rico tomado de una ficha verificada, con su fuente.', en: 'Short optional questions in the village after "The Raindrop\'s Path". Three review the lesson; five bring a Puerto Rico science fact from a verified card, with its source.' }))}</p>
          <ul class="maestro-fuentes">${PARADAS.map(p => { const o = objetivo(p.objetivo); return `<li><b>${AU.esc(t(p.pregunta.enunciado))}</b><br>
            <small>${AU.esc(p.objetivo)} · ${AU.esc(t(o.enunciado || ''))} · DEPR ${AU.esc((o.depr_2022 || []).join(', '))} · NGSS ${AU.esc((o.ngss || []).join(', '))}${p.fuente ? ' · ' + AU.esc(t(TX.fuente)) + ': ' + AU.esc(p.fuente) : ''}${r[p.id] ? ' · ' + AU.esc(t({ es: 'intento', en: 'attempt' })) + ' ' + r[p.id] : ''}</small></li>`; }).join('')}</ul>`;
      } });

      G.on('render', () => {
        const now = performance.now() / 1000;
        for (const { p, m } of vis) { m.g.visible = disponible() && !resp()[p.id]; if (m.g.visible) m.animar(now); }
      }, 55);

      G.c.paradas = { lista: PARADAS, abrir, libre, SEPARACION };
    },
  });
})();

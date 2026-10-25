/* Content pack cap1 · paradas de aprendizaje en la aldea (zona de los edificios de Kelvin)
   Tres preguntas cortas de ciencias sobre el lugar (agua, construcción y bosque), en ES/EN, que repasan lo que el niño vio en
   "La ruta de la gota". No traen historia ni datos nuevos: solo conceptos de la lección (el agua corre cuesta abajo, lo que
   llueve en la montaña hace crecer el río, dónde construir) y un dato verificado (yagrumo, USDA FS · Drew et al. 2009).
   Cada parada se liga a un objetivo de lecciones.js, que da sus estándares DEPR 2022 y NGSS (grados 3–6).
   - Aparecen al terminar la misión educativa y son opcionales: retroalimentación inmediata, pista y respuesta explicada
     (G.aula.hacerPregunta), sin puntaje. El intento queda en S.edu.paradas y en el registro del aula.
   - Lugares por id de POI (parada_agua, parada_techo, parada_claro: los coloca el level designer); mientras no existan,
     provisionales alrededor de 'aldea' (o 'plaza' en el mundo viejo). Siempre a 5 m o más de cualquier otro interactuable,
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
  ];
  const TX = {
    parada: { es: 'Parada de ciencias', en: 'Science stop' }, mirar: { es: 'Mirar: parada de ciencias', en: 'Look: science stop' },
    aldea: { es: 'La aldea', en: 'The village' },
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
        const cab = `<div class="edu-head"><div><span class="eyebrow">${AU.esc(t(TX.parada))} · ${AU.esc(p.objetivo)}</span><h2>${AU.esc(t(TX.aldea))}</h2></div></div>`;
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
        return `<p class="note">${AU.esc(t({ es: 'Preguntas cortas en la aldea, opcionales, después de "La ruta de la gota". Repasan la lección; no traen datos nuevos.', en: 'Short optional questions in the village after "The Raindrop\'s Path". They review the lesson; no new facts.' }))}</p>
          <ul class="maestro-fuentes">${PARADAS.map(p => { const o = objetivo(p.objetivo); return `<li><b>${AU.esc(t(p.pregunta.enunciado))}</b><br>
            <small>${AU.esc(p.objetivo)} · ${AU.esc(t(o.enunciado || ''))} · DEPR ${AU.esc((o.depr_2022 || []).join(', '))} · NGSS ${AU.esc((o.ngss || []).join(', '))}${r[p.id] ? ' · ' + AU.esc(t({ es: 'intento', en: 'attempt' })) + ' ' + r[p.id] : ''}</small></li>`; }).join('')}</ul>`;
      } });

      G.on('render', () => {
        const now = performance.now() / 1000;
        for (const { p, m } of vis) { m.g.visible = disponible() && !resp()[p.id]; if (m.g.visible) m.animar(now); }
      }, 55);

      G.c.paradas = { lista: PARADAS, abrir, libre, SEPARACION };
    },
  });
})();

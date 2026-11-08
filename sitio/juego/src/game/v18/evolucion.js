/* Juego · V18.2 «Evolución, niveles y alianzas» · prototipo (directiva docs/DIRECTIVA_V18_2_EVOLUCION.md §14; diseño
   docs/equipo/V18_2_DISENO.md). Las cotorras NO cambian de especie ni de modelo: suben de nivel y su poder cambia de verdad.
   - Datos en el progreso V18 (progreso.js v2, `d.evo`): { esp: { <sp>: { xp, nivel, mejoras, variante } }, alianzas, alianzaSel,
     marcas (hitos ya pagados), dia (topes diarios), retro }. El nivel SIEMPRE se recalcula a partir de la XP (máx. 40).
   - Curva: XP total para el nivel n = 20(n−1) + 3(n−1)(n−2) → nv 10 = 396, nv 20 = 1.406, nv 40 = 5.226.
   - Fuentes (eventos que ya existen): duelo contra la Campeona ganado 40 (mitad desde la 3.ª victoria del día), perdido 15
     (solo si le quitaste ≥ 1 pluma y duró ≥ 20 s); duelo de 2 = 0. Hitos de una vez (puente, Sombra, Serpiente, Sapo, especies,
     materiales, primera victoria con cada especie, reto de dos cotorras, desafío de la alianza). Minigolf: 15 (+15 récord), 3/día.
     Topes diarios: 160 XP en duelos, 300 XP en todo lo repetible. Los hitos ya cumplidos en partidas viejas pagan una vez.
     Avisos al jugar (no solo en la ficha): tarjeta de nivel en cada subida, tarjeta de etapa al cruzar 10/20/30, tarjeta pequeña
     «+N XP» al ganar XP explorando y el reto de la alianza en el panel de fin del duelo.
   - Vittata, tres etapas del Grito del Yunque (ajustar(f, h) → Object.create(h) con los números; habilidades.js no copia código):
       1–9 Grito del Yunque 7 m ±35° · 10–19 Eco Amplificado 9 m ±42° · 20+ Eco Dirigido 11 m ±26°, onda a 22 m/s, desvía semillas.
     Topes fijos: el grito nunca quita plumas, espera ≥ 5 s, coste ≥ 35, alcance ≤ 11 m, interrupción ≤ 1,4 s. Plumas, energía y
     ataques básicos no cambian con el nivel. La Campeona no sube.
   - Arausiaca: Escudo de plumas igual; nv 10 dura 3 s; nv 20 recupera 15 de energía al bloquear (solo si es la del jugador).
   - Alianza Eco Protector (Vittata + Arausiaca): Vittata nv ≥ 10 + Arausiaca elegible → «disponible»; ganar a la Campeona con
     Vittata interrumpiéndola ≥ 2 veces → «desbloqueada» (tarjeta). Coste 60, recarga 14 s, deja el grito en espera 5 s; lanza la
     onda de la etapa actual y pone un escudo de 2 s que para un golpe (Ala fuerte lo rompe). H / botón .vd-ali en el duelo.
   V18.2 producto (bloque B.1, docs/DIRECTIVA_V18_2.md §3, §7–§10):
   - Las 34 especies del catálogo base suben del 1 al 40 con cuatro etapas (§3), solo con números y efectos que ya existen:
       1–9 Aprendiz (el poder tal cual) · 10–19 Despertar (su número principal ×1,12 y espera ×0,92)
       20–29 Guardián (×1,24, espera ×0,88 y una habilidad secundaria según su técnica: PICO deshace las semillas de la rival
       que vienen de frente; OJOS marca a la rival 1,5 s; PLUMAS da un desvío de 0,4 s; ALAS deja el golpe de ala listo)
       30–40 Maestro (×1,35, espera ×0,85 y destellos dorados al usarlo). Cada poder tiene su tope (MEJORA) y el coste no baja.
     Vittata y Arausiaca conservan sus etapas propias (arriba); Vittata suma «Grito Maestro» en el nivel 30 (§4).
   - Alianzas de bandada (§7–§9): seis, una por elemento de fantasía (§6), elegidas por variedad de técnicas y coste técnico
     bajo (cada una reutiliza los efectos de las dos cotorras). Las juega la líder; la compañera aporta su efecto y su retrato.
       Eco Protector     · Vittata (PICO) + Arausiaca (PLUMAS) · eco: onda de la etapa + escudo de 2 s.
       Lluvia Guiada     · barbadensis (PICO) + xantholora (OJOS) · naturaleza: marca 2 s y lanza la lluvia de semillas, que la sigue.
       Viento Cruzado    · agilis (ALAS) + farinosa (ALAS) · viento: quiebro (0,6 s sin que te den) y Ala fuerte de 3 m que rompe escudos.
       Destello del Pitón · guildingii (PLUMAS) + versicolor (OJOS) · luz: deslumbra 1 s (si está a ≤ 8 m) y frena sus tiros 2 s.
       Marea de Lluvia   · dufresniana (PLUMAS) + diadema (PICO) · agua: escudo de lluvia de 2 s y una semilla de río que bota.
       Ráfaga Volcánica  · finschi (ALAS) + auropalliata (PICO) · fuego: la ráfaga y, 0,75 s después, una onda de volcán corta (6 m).
     Todas: coste 60, recarga 14 s, dejan el poder propio en espera 5 s y duran ≤ 2 s; ninguna quita más de 1 pluma.
     Explorando (tecla G / botón Poder con la alianza elegida), la compañera ayuda: escudo (eco), señala lo cercano con que
     interactuar (naturaleza), sopla un remolino (viento), revela los rastros de la Maraña (luz), lluvia y escudo (agua), chispas (fuego).
     Se consiguen: líder en nivel 10 + compañera en tu bandada → «disponible»; ganar a la Campeona con la líder usando su poder
     2 veces (Eco Protector: interrumpiéndola 2 veces) → «desbloqueada». Sin compras, sin azar, sin rankings.
   - Formato: el mismo `evo` de v2 (alianzas: { <id>: estado }, alianzaSel: id | null). Una partida v1 o del prototipo carga igual.
   Solo con la bandera V18. Modo de prueba: AV.G.v18evo.prueba({ especie: 'vittata', nivel: 20, alianza: true }) / prueba(null).
   Prueba: AV.v18EvolucionTest(). */
window.AVV18Evolucion = function (G) {
  'use strict';
  if (G.v18evo) return G.v18evo;
  const V = G.v18 || window.AVV18Progreso(G);
  const H = G.v18hab || window.AVV18Habilidades(G);
  const NIVEL_MAX = 40, ALI = 'eco_protector', ESTADOS_ALI = ['bloqueada', 'disponible', 'desbloqueada'], VARIANTES = ['amplificado', 'dirigido', 'maestro'];
  const T = n => 20 * (n - 1) + 3 * (n - 1) * (n - 2); // XP total para llegar al nivel n
  const XP_MAX = T(NIVEL_MAX);
  function nivelDe(xp) { let n = 1; while (n < NIVEL_MAX && xp >= T(n + 1)) n++; return n; }
  /* Equilibrio de XP (8-nov, medido con la sesión simulada del test «Ritmo»: nivel 10 en la 1.ª sesión, 20 en la 3.ª, 30 tras
     unas 10 sesiones). Lo de una vez de la 1.ª sesión pesa más; lo repetible del día pesa menos para que nada se pueda farmear.
     Arco, Muelle, Puerto, Chispa, Moon y Guardián pagan sus propios números con dar() (120, 100, 150 y 30). */
  const XP = { gana: 40, pierde: 15, ganaEspecie: 60, especie: 30, material: 5, puente: 120, sombra: 80, serpiente: 60, sapo: 60, retoDos: 60, golfNido: 15, golfRecord: 15, desafio: 50,
    golfCompleto: 30, golfOro: 30, perfecta: 30, tresDuelos: 40 };
  const TOPE = { duelosDia: 160, repetibleDia: 300, golfDia: 3, mitadDesde: 3, pierdeQuitadas: 1, pierdeDura: 20 };
  // Etapas de Vittata (Grito del Yunque). La 1 son exactamente los números de habilidades.js (no se toca nada).
  const ETAPAS = [
    { desde: 1, id: 'grito_yunque', nombre: 'Grito del Yunque', alcance: 7, cono: 0.82, vel: 16, empuje: 15, interrumpe: 1.1, coste: 35, cooldown: 5,
      frase: 'Onda sonora que empuja e interrumpe. Acércate y apunta.' },
    { desde: 10, id: 'eco_amplificado', nombre: 'Eco Amplificado', alcance: 9, cono: 0.74, vel: 16, empuje: 17, interrumpe: 1.2, coste: 35, cooldown: 5.5,
      frase: 'Tu grito llega más lejos (9 m) y es más ancho. Tienes que esperar un poco más entre gritos.' },
    { desde: 20, id: 'eco_dirigido', nombre: 'Eco Dirigido', alcance: 11, cono: 0.9, vel: 22, empuje: 18, interrumpe: 1.4, coste: 40, cooldown: 6, desvia: true,
      frase: 'Grito estrecho y rápido de hasta 11 m: apunta bien y deshaz las semillas de la rival.' },
    { desde: 30, id: 'grito_maestro', nombre: 'Grito Maestro', alcance: 11, cono: 0.82, vel: 22, empuje: 19, interrumpe: 1.4, coste: 40, cooldown: 6, desvia: true, maestro: true,
      frase: 'Grito rápido de hasta 11 m, más abierto que el Eco Dirigido: deshace semillas y suelta destellos dorados.' }
  ];
  const TOPES_GRITO = { cooldownMin: 5, costeMin: 35, alcanceMax: 11, interrumpeMax: 1.4 };
  // ---------- Etapas de las 34 especies del catálogo base (§3) ----------
  const ETAPAS_ESP = [
    { desde: 1, id: 'aprendiz', nombre: 'Aprendiz', k: 1, cd: 1 },
    { desde: 10, id: 'despertar', nombre: 'Despertar', k: 1.12, cd: 0.92 },
    { desde: 20, id: 'guardian', nombre: 'Guardián', k: 1.24, cd: 0.88, secundaria: true },
    { desde: 30, id: 'maestro', nombre: 'Maestro', k: 1.35, cd: 0.85, secundaria: true, maestro: true }
  ];
  // Qué número sube con la etapa en cada poder y su tope (multiplicador máximo). Imitación no tiene número: solo baja su espera.
  const MEJORA = {
    quiebro: ['vel', 1.3], lluvia_semillas: ['alcance', 1.25], ojo_cenote: ['dura', 1.3], ala_fuerte: ['alcance', 1.2], abanico_colores: ['alcance', 1.25],
    semilla_rio: ['vida', 1.3], mirada_piton: ['dura', 1.3], ojo_sol: ['dura', 1.3], capa_palma: ['dura', 1.3], pluma_rebote: ['dura', 1.3],
    hojas_envuelven: ['dura', 1.25], ojo_selva: ['dura', 1.3], viento_islas: ['alcance', 1.25], voz_volcan: ['alcance', 1.25], ojo_manglar: ['dura', 1.3],
    gota_lluvia: ['dura', 1.3], chillido_bandada: ['empuje', 1.35], rafaga: ['vel', 1.25], eco_cordillera: ['alcance', 1.35], rasante: ['dura', 1.3],
    canto_real: ['devuelve', 1.35], remolino: ['alcance', 1.3], plumas_aliso: ['quita', 1.3], semilla_pina: ['gorda', 1.2], columna_nube: ['mareo', 1.2],
    plumas_manglar: ['dura', 1.3], vuelo_niebla: ['vel', 1.25], vuelta_pino: ['vel', 1.25], imitacion: [null, 1], vista_cumbre: ['dura', 1.3],
    ojo_bandada: ['dura', 1.3], cuento: ['dura', 1.2]
  };
  const SECUNDARIA = { pico: { desvia: 6, cono: 0.8 }, ojos: { marca: 1.5, marcaK: 0.5 }, plumas: { desvio: 0.4 }, alas: { alaLista: true } };
  // ---------- Las 6 alianzas de bandada (§7–§9). Datos del duelo en H.registrar (más abajo) ----------
  const ALIANZAS = [
    { id: 'eco_protector', nombre: 'Eco Protector', lider: 'vittata', apoyo: 'arausiaca', elemento: 'eco', reto: 'interrupciones', marca: 'desafio_eco',
      frase: 'Vittata grita y la cotorra de Dominica la cubre con un escudo de plumas. En el duelo: tecla H o el botón Eco Protector.',
      explora: 'Explorando, tu grito sale con un escudo de plumas.' },
    { id: 'lluvia_guiada', nombre: 'Lluvia Guiada', lider: 'barbadensis', apoyo: 'xantholora', elemento: 'naturaleza', reto: 'poder',
      frase: 'El loro yucateco marca a la rival y tu lluvia de semillas la sigue. En el duelo: tecla H o el botón de la alianza.',
      explora: 'Explorando, tus semillas señalan lo más cercano con lo que puedes interactuar.' },
    { id: 'viento_cruzado', nombre: 'Viento Cruzado', lider: 'agilis', apoyo: 'farinosa', elemento: 'viento', reto: 'poder',
      frase: 'Esquivas con un quiebro y el loro corona azul remata con un Ala fuerte que rompe escudos. En el duelo: tecla H o el botón de la alianza.',
      explora: 'Explorando, tu quiebro levanta un remolino de hojas.' },
    { id: 'destello_piton', nombre: 'Destello del Pitón', lider: 'guildingii', apoyo: 'versicolor', elemento: 'luz', reto: 'poder',
      frase: 'Tu abanico deslumbra y el loro de Santa Lucía frena los tiros de la rival. En el duelo: tecla H o el botón de la alianza.',
      explora: 'Explorando, tu abanico revela los rastros de la Maraña cercanos.' },
    { id: 'marea_lluvia', nombre: 'Marea de Lluvia', lider: 'dufresniana', apoyo: 'diadema', elemento: 'agua', reto: 'poder',
      frase: 'Te cubre un escudo de lluvia y el loro diadema lanza una semilla de río que bota. En el duelo: tecla H o el botón de la alianza.',
      explora: 'Explorando, tu escudo de lluvia salpica gotas a tu alrededor.' },
    { id: 'rafaga_volcan', nombre: 'Ráfaga Volcánica', lider: 'finschi', apoyo: 'auropalliata', elemento: 'fuego', reto: 'poder',
      frase: 'Cruzas con una ráfaga y el loro de nuca amarilla suelta detrás una onda de volcán. En el duelo: tecla H o el botón de la alianza.',
      explora: 'Explorando, tu ráfaga deja un rastro de chispas doradas.' }
  ];
  const ALI_IDS = ALIANZAS.map(a => a.id);
  const aliDe = id => ALIANZAS.find(a => a.id === id) || null;
  const TXT = {
    subeV: '¡Vittata subió al nivel {}!', sube: '¡Tu cotorra subió al nivel {}!', nv: 'Nv {}', nivel: 'Nivel {}', xp: '+{} XP', subiste: '¡Subiste al nivel {}!',
    etapa: '¡Nueva etapa!', variante: 'Ya puedes elegir la variante del grito en Pausa → Mis cotorras.',
    aliNueva: '¡Nueva alianza!', aliNombre: 'Eco Protector',
    aliFrase: 'Vittata grita y la cotorra de Dominica la cubre con un escudo de plumas. En el duelo: tecla H o el botón Eco Protector.',
    aliDisp: 'La Campeona quiere entrenarte con una alianza: gánale con Vittata interrumpiéndola 2 veces con tu grito.',
    aliReq: 'Alianza Eco Protector: Vittata en nivel 10 y la cotorra de Dominica en tu bandada.',
    aliReto: 'Alianza Eco Protector: gana a la Campeona con Vittata interrumpiéndola 2 veces.',
    aliDispG: 'La Campeona quiere entrenarte con una alianza: gánale con la cotorra líder usando su poder 2 veces.',
    aliReqG: 'La cotorra líder en nivel 10 y la compañera en tu bandada.', aliRetoG: 'Gana a la Campeona con la cotorra líder usando su poder 2 veces.',
    aliLider: 'Líder', aliApoyo: 'Compañera', aliBloq: 'Bloqueada', aliDispE: 'Disponible', aliDesb: 'Desbloqueada',
    aliTit: 'Alianza', aliOn: 'Activada', aliOff: 'Desactivada', varTit: 'Variante del grito',
    apoyo: '¡Tu compañera de alianza te ayuda!', apoyoEco: '¡La cotorra de Dominica te cubre!',
    falta: 'Faltan {} XP para el nivel {}', max: 'Nivel máximo', mejora: 'Mejora:', maestroFx: 'destellos dorados',
    k_alcance: 'Alcance', k_dura: 'Duración', k_vel: 'Velocidad', k_vida: 'Recorrido de la semilla', k_empuje: 'Empuje', k_devuelve: 'Energía que devuelve',
    k_quita: 'Energía que quita', k_gorda: 'Tamaño de la semilla', k_mareo: 'Mareo', k_cooldown: 'Espera',
    sec_pico: 'Además, deshace las semillas de la rival que vienen de frente.', sec_ojos: 'Además, marca a la rival 1,5 s: no puede esquivar y tus semillas la siguen.',
    sec_plumas: 'Además, te da un desvío de 0,4 s en el que nada te golpea.', sec_alas: 'Además, deja tu golpe de ala listo al momento.',
    fr_despertar: 'Tu poder mejora y se recarga más rápido.', fr_guardian: 'Tu poder gana una habilidad secundaria.', fr_maestro: 'Dominio avanzado: tu poder brilla con destellos dorados.',
    retro: 'Tu aventura cuenta: +{} XP para tu cotorra.', prueba: 'Modo de prueba de la evolución',
    subeTit: '¡Subiste de nivel!', retroTit: '¡Tu aventura cuenta!', xpTit: 'Experiencia',
    aliSec: 'Alianzas de bandada', aliPorDesc: 'Alianzas por descubrir: {}',
    reqLider: '{} en nivel 10 (ahora Nv {})', reqApoyo: '{} en tu bandada',
    retoPoder: 'Reto: gana a la Campeona con {} usando {} 2 veces.', retoEco: 'Reto: gana a la Campeona con {} interrumpiéndola 2 veces con tu grito.',
    usarCon: 'Elige a {} en Mis cotorras para usarla.',
    aliDispN: '¡Nueva alianza disponible! {}: gana a la Campeona con {} usando {} 2 veces.',
    retoFin: 'Reto de alianza {}: llevas {} de 2', retoFinLogrado: 'Reto de alianza {}: ¡logrado!'
  };
  // Retratos que existen en assets/retratos/v18 (sin retrato no se pide imagen: nada de errores 404 en la consola)
  const RETRATOS = new Set(['agilis', 'arausiaca', 'auropalliata', 'barbadensis', 'brasiliensis', 'collaria', 'diadema', 'dufresniana', 'farinosa', 'finschi', 'guildingii', 'tresmariae', 'versicolor', 'viridigenalis', 'xantholora']);
  const conRetrato = sp => (RETRATOS.has(sp) ? sp : false);
  // Nombre de una especie para los avisos (Vittata por su nombre; las demás, su nombre común en el idioma de la partida)
  function nombre(sp) {
    if (sp === 'vittata') return 'Vittata';
    let en = false; try { en = !!(G.idioma && G.idioma.activo && G.idioma.activo()); } catch (e) { en = false; }
    const L = window.AV_ESPECIES, e = L && Array.isArray(L.especies) && L.especies.find(x => x && x.id === sp);
    const s = String((e && e.comun && (en ? e.comun.en : e.comun.es)) || sp);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  const sonar = (n, a) => { try { if (G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const con = (t, n) => t.replace('{}', n);
  const rango = e => Math.max(0, V.ESTADOS.indexOf(e || 'no_descubierta'));
  const elegible = sp => rango(V.estado(sp)) >= rango('seleccionable');
  const perfil = () => (G.S && G.S.profile && ((G.S.profile.look && G.S.profile.look.species) || G.S.profile.species)) || 'vittata';
  let hoyFijo = null; // solo las pruebas
  const hoy = () => { if (hoyFijo) return hoyFijo; const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // ---------- Datos: saneado (nunca se confía en el guardado) ----------
  function sanear(e) {
    if (!e.esp || typeof e.esp !== 'object' || Array.isArray(e.esp)) e.esp = {};
    for (const sp of Object.keys(e.esp)) {
      const r = e.esp[sp]; if (!r || typeof r !== 'object') { delete e.esp[sp]; continue; }
      r.xp = Number.isFinite(r.xp) && r.xp > 0 ? Math.min(XP_MAX, Math.floor(r.xp)) : 0;
      r.nivel = nivelDe(r.xp);
      if (VARIANTES.indexOf(r.variante) < 0 || (r.variante === 'maestro' && r.nivel < 30)) r.variante = null;
      if (!r.mejoras || typeof r.mejoras !== 'object' || Array.isArray(r.mejoras)) r.mejoras = {};
      if (sp === 'vittata') for (const et of ETAPAS) if (et.desde > 1 && r.nivel >= et.desde) r.mejoras[et.id] = true;
      // mejoras desbloqueadas (§13)
      for (const et of ETAPAS_ESP) if (et.desde > 1 && r.nivel >= et.desde) r.mejoras[et.id] = true;
    }
    if (!e.alianzas || typeof e.alianzas !== 'object' || Array.isArray(e.alianzas)) e.alianzas = {};
    for (const id of ALI_IDS) if (ESTADOS_ALI.indexOf(e.alianzas[id]) < 0) e.alianzas[id] = 'bloqueada';
    if (ALI_IDS.indexOf(e.alianzaSel) < 0 || e.alianzas[e.alianzaSel] !== 'desbloqueada') e.alianzaSel = null;
    if (!e.marcas || typeof e.marcas !== 'object') e.marcas = {};
    if (!e.dia || typeof e.dia !== 'object' || typeof e.dia.fecha !== 'string' || !e.dia.por || typeof e.dia.por !== 'object') e.dia = { fecha: '', por: {} };
    for (const k of Object.keys(e.dia.por)) if (!Number.isFinite(e.dia.por[k]) || e.dia.por[k] < 0) e.dia.por[k] = 0;
    e.retro = !!e.retro;
    return e;
  }
  const E = () => sanear(V.evo());
  const reg = (e, sp) => e.esp[sp] || (e.esp[sp] = { xp: 0, nivel: 1, mejoras: {}, variante: null });
  const etapaIdx = n => (n >= 30 ? 3 : n >= 20 ? 2 : n >= 10 ? 1 : 0);
  const aliDeEspecie = sp => ALIANZAS.find(a => a.lider === sp) || ALIANZAS.find(a => a.apoyo === sp) || null;
  // Lo que sabe la ficha de una cotorra: nivel, XP, XP hasta el siguiente, etapa, alianza y lo que mejora su poder
  function info(sp) {
    const r = E().esp[sp], xp = r ? r.xp : 0, nivel = r ? r.nivel : 1, variante = r ? r.variante : null, i = etapaIdx(nivel);
    const sig = nivel >= NIVEL_MAX ? null : T(nivel + 1), a = aliDeEspecie(sp);
    return { xp, nivel, variante, etapa: ETAPAS_ESP[i].id, etapaNombre: ETAPAS_ESP[i].nombre, sig, falta: sig == null ? 0 : sig - xp,
      alianza: a ? a.id : null, alianzaEstado: a ? E().alianzas[a.id] : null, rol: a ? (a.lider === sp ? 'lider' : 'apoyo') : null, mejora: mejoraDe(sp, nivel) };
  }
  function dia(e) { const f = hoy(); if (e.dia.fecha !== f) e.dia = { fecha: f, por: {} }; return e.dia; }
  function etapaDe(nivel, variante) {
    let et = ETAPAS[0]; for (const x of ETAPAS) if (nivel >= x.desde) et = x;
    if (et.desde >= 20 && variante === 'amplificado') et = ETAPAS[1];
    else if (et.desde >= 30 && variante === 'dirigido') et = ETAPAS[2];
    return et;
  }
  // Lo que mejora el poder de una especie en un nivel (para la ficha y las pruebas): [{ k, pct }] + secundaria + maestro
  function mejoraDe(sp, nivel) {
    const p = H.poderDe(sp), h = H.get(p), i = etapaIdx(nivel), out = { poder: p, nombre: (h && h.nombre) || '', cambios: [], secundaria: null, maestro: i >= 3 };
    if (!h || !i) return out;
    const a = ajustar({ especie: sp, nivel }, h);
    for (const k of ['alcance', 'dura', 'vel', 'vida', 'empuje', 'devuelve', 'quita', 'gorda', 'mareo']) if (typeof h[k] === 'number' && a[k] !== h[k]) out.cambios.push({ k, pct: Math.round(100 * (a[k] / h[k] - 1)) });
    if (a.cooldown !== h.cooldown) out.cambios.push({ k: 'cooldown', pct: Math.round(100 * (a.cooldown / h.cooldown - 1)) });
    if (sp !== 'vittata' && sp !== 'arausiaca' && i >= 2) out.secundaria = h.tecnica || null;
    return out;
  }

  // ---------- XP ----------
  let ultimo = null; // la última XP de un duelo (para el panel de fin)
  let mudo = false;  // las pruebas apagan los oyentes mientras simulan duelos
  // o: { repetible, duelo, cuenta, max, mitadDesde, silencio }
  function dar(sp, n, fuente, o) {
    o = o || {}; if (!sp || !(n > 0)) return 0;
    let dado = 0, antes = 1, despues = 1;
    V.cambiarEvo(e0 => {
      const e = sanear(e0), d = dia(e);
      if (o.cuenta) {
        const c = d.por[o.cuenta] || 0;
        if (o.max != null && c >= o.max) n = 0;
        else { if (o.mitadDesde && c >= o.mitadDesde - 1) n = Math.floor(n / 2); d.por[o.cuenta] = c + 1; }
      }
      if (o.repetible) { n = Math.min(n, Math.max(0, TOPE.repetibleDia - (d.por.total || 0))); if (o.duelo) n = Math.min(n, Math.max(0, TOPE.duelosDia - (d.por.duelo || 0))); }
      if (n <= 0) return;
      const r = reg(e, sp); antes = r.nivel;
      dado = Math.min(n, XP_MAX - r.xp); r.xp += dado; r.nivel = nivelDe(r.xp); despues = r.nivel; sanear(e);
      if (o.repetible) { d.por.total = (d.por.total || 0) + dado; if (o.duelo) d.por.duelo = (d.por.duelo || 0) + dado; }
    });
    if (dado) { try { G.emit('v18', { tipo: 'evo', especie: sp, xp: dado, fuente: fuente || '' }); } catch (e) { /* sin oyentes */ } }
    if (despues > antes) subio(sp, antes, despues, o.silencio);
    else if (dado && !o.silencio && !o.duelo && !mudo) miniXp(sp, dado);
    if (dado) revisarAlianza();
    return dado;
  }
  function subio(sp, a, b, silencio) {
    try { G.emit('v18', { tipo: 'evo', especie: sp, nivel: b, antes: a, sube: true }); } catch (e) { /* sin oyentes */ }
    if (silencio) return;
    toast(con(sp === 'vittata' ? TXT.subeV : TXT.sube, b), 3200);
    sonar('unlock');
    try { if (G.fx && G.fx.burst && G.S) { G.fx.burst(G.S.pos.x, G.S.pos.y + 1.4, G.S.pos.z, 'gold', 14); G.fx.burst(G.S.pos.x, G.S.pos.y + 0.8, G.S.pos.z, 'stars', 8); } } catch (e) { /* sin efectos */ }
    if (sp === 'vittata') { let hubo = false; for (const et of ETAPAS) if (et.desde > 1 && a < et.desde && b >= et.desde) { hubo = true; carta(TXT.etapa, et.nombre, et.frase, false, et.desde === 20 ? TXT.variante : ''); } if (!hubo) cartaNivel(sp, b); return; }
    const i = etapaIdx(b);
    if (i > etapaIdx(a)) { const et = ETAPAS_ESP[i], m = mejoraDe(sp, b); carta(TXT.etapa, [m.nombre, et.nombre], TXT['fr_' + et.id], false, m.secundaria && i === 2 ? TXT['sec_' + m.secundaria] : ''); }
    else cartaNivel(sp, b);
  }
  // Lo que falta para el siguiente nivel, en una frase
  function faltaTxt(sp) { const r = info(sp); return r.sig == null ? TXT.max : con(con(TXT.falta, r.falta), r.nivel + 1); }
  // Subida sin etapa nueva: tarjeta de nivel (el aviso de abajo se puede pisar con otro; la tarjeta no)
  function cartaNivel(sp, b) { carta(TXT.subeTit, [nombre(sp), con(TXT.nv, b)], faltaTxt(sp), conRetrato(sp), ''); }
  // XP sin subir de nivel fuera del duelo (el duelo ya lo dice en su panel de fin): tarjeta pequeña que no tapa una grande
  function miniXp(sp, n) {
    if (cartaEl && !cartaEl.classList.contains('mini')) return null;
    return carta(con(TXT.xp, n), [nombre(sp), con(TXT.nv, info(sp).nivel)], faltaTxt(sp), false, '', 'mini');
  }
  // Hitos de una sola vez: se deducen del progreso V18 (así las partidas viejas cobran lo que ya hicieron, una vez)
  function hitos() {
    const d = V.copia(), out = [], m = d.mundo || {}, ot = d.otorgados || {}, inv = d.inv || {}, pf = perfil();
    if (m.puente_villa === 'reparado') out.push(['puente', XP.puente]);
    if (m.sombra_tormenta === 'dispersa') out.push(['sombra', XP.sombra]);
    if (m.serpiente_marana === 'deshecha') out.push(['serpiente', XP.serpiente]);
    if (m.sapo_encantado === 'despierto') out.push(['sapo', XP.sapo]);
    if (ot.reto_dos_cotorras) out.push(['reto_dos', XP.retoDos]);
    if (ot.minigolf_villa_completo) out.push(['golf_completo', XP.golfCompleto]);
    if (ot.minigolf_villa_oro || (m.minigolf_villa && m.minigolf_villa.medalla === 'oro')) out.push(['golf_oro', XP.golfOro]);
    if ((inv.victoria_perfecta || 0) > 0) out.push(['perfecta', XP.perfecta]);
    if ((Number(m.duelos_ganados) || 0) >= 3) out.push(['tres_duelos', XP.tresDuelos]);
    for (const k of Object.keys(m)) if (m[k] === 'recogida') out.push(['mat:' + k, XP.material]);
    for (const k of Object.keys(ot)) if (/^duelo_gana_/.test(k)) out.push(['gana:' + k.slice(11), XP.ganaEspecie]);
    for (const sp of Object.keys(d.especies || {})) if (sp !== 'vittata' && sp !== pf && rango(d.especies[sp]) >= rango('seleccionable')) out.push(['esp:' + sp, XP.especie]);
    return out;
  }
  function revisarHitos(silencio) {
    const marcas = E().marcas, nuevos = hitos().filter(h => !marcas[h[0]]);
    const primera = !E().retro;
    if (!nuevos.length) { if (primera) V.cambiarEvo(e => { e.retro = true; }); return 0; }
    const total = nuevos.reduce((a, h) => a + h[1], 0);
    V.cambiarEvo(e => { sanear(e); for (const h of nuevos) e.marcas[h[0]] = true; e.retro = true; });
    const sp = V.seleccionada() || perfil();
    const n = dar(sp, total, 'hito', { silencio: silencio || primera });
    if (primera && n && !silencio) { toast(con(TXT.retro, n), 4200); const r = info(sp); carta(TXT.retroTit, [nombre(sp), con(TXT.nv, r.nivel)], con(TXT.retro, n), conRetrato(sp), r.nivel >= 10 ? r.etapaNombre : ''); }
    return n;
  }

  // ---------- Alianzas de bandada ----------
  const nombrePoder = sp => ((H.get(H.poderDe(sp)) || {}).nombre || '');
  // El reto de desbloqueo de una alianza, con la líder y su poder por su nombre
  const retoTexto = a => (a.reto === 'interrupciones' ? con(TXT.retoEco, nombre(a.lider)) : con(con(TXT.retoPoder, nombre(a.lider)), nombrePoder(a.lider)));
  const estadoAli = id => E().alianzas[id || ALI];
  let avisoTO = 0;
  function revisarAlianza() {
    const nuevas = ALIANZAS.filter(a => estadoAli(a.id) === 'bloqueada' && info(a.lider).nivel >= 10 && elegible(a.apoyo));
    if (!nuevas.length) return false;
    V.cambiarEvo(e => { sanear(e); for (const a of nuevas) e.alianzas[a.id] = 'disponible'; });
    const a0 = nuevas[0];
    // después de los avisos del duelo
    clearTimeout(avisoTO); avisoTO = setTimeout(() => { if (estadoAli(a0.id) === 'disponible') toast(a0.id === ALI ? TXT.aliDisp : con(con(con(TXT.aliDispN, a0.nombre), nombre(a0.lider)), nombrePoder(a0.lider)), 5200); }, 3800);
    return true;
  }
  function desbloquearAlianza(id, silencio) {
    // firma del prototipo: desbloquearAlianza(silencio)
    if (typeof id !== 'string') { silencio = id; id = ALI; }
    const a = aliDe(id); if (!a || estadoAli(id) !== 'disponible') return false;
    V.cambiarEvo(e => { sanear(e); e.alianzas[id] = 'desbloqueada'; e.alianzaSel = id; e.marcas[a.marca || ('desafio:' + id)] = true; });
    dar(a.lider, XP.desafio, 'desafio', { silencio });
    if (!silencio) { sonar('unlock'); carta(TXT.aliNueva, a.nombre, a.frase, a.apoyo, a.explora); }
    return true;
  }
  // elegirAlianza(on) actúa sobre la alianza de la cotorra elegida (o Eco Protector); elegirAlianza(on, id) sobre esa
  function elegirAlianza(on, id) {
    if (!id) { const a = ALIANZAS.find(x => x.lider === V.seleccionada()); id = a ? a.id : ALI; }
    if (estadoAli(id) !== 'desbloqueada') return false;
    V.cambiarEvo(e => { sanear(e); if (on) e.alianzaSel = id; else if (e.alianzaSel === id) e.alianzaSel = null; }); return true;
  }
  function elegirVariante(v) {
    if (VARIANTES.indexOf(v) < 0 || info('vittata').nivel < (v === 'maestro' ? 30 : 20)) return false;
    V.cambiarEvo(e => { reg(sanear(e), 'vittata').variante = v; }); return true;
  }
  const textoApoyo = sp => (sp === 'arausiaca' ? TXT.apoyoEco : TXT.apoyo);

  // ---------- Lo que lee el duelo (combate.js) y el motor (habilidades.js) ----------
  function paraDuelo(sp) {
    const r = info(sp), e = E(), o = { nivel: r.nivel, variante: r.variante, xp: r.xp }, a = aliDe(e.alianzaSel);
    if (a && a.lider === sp && e.alianzas[a.id] === 'desbloqueada') o.alianza = a.id;
    if (sp === 'arausiaca' && r.nivel >= 20) o.bonusBloqueo = 15;
    return o;
  }
  // Destellos dorados del Maestro y habilidad secundaria del Guardián: se añaden DESPUÉS del efecto de siempre (que lee this.*)
  function envolver(a, h, extra) {
    const base = h.efecto;
    a.efecto = function (ctx) { const r = base.call(this, ctx); try { extra.call(this, ctx); } catch (e) { /* sin ese efecto */ } return r; };
    return a;
  }
  function brillo(ctx) { const yo = ctx.yo; if (ctx.fx) { ctx.fx('gold', yo.pos.x, yo.pos.y + 1.5, yo.pos.z); ctx.fx('stars', yo.pos.x, yo.pos.y + 1.9, yo.pos.z); } }
  function secundaria(tec, ctx) {
    const yo = ctx.yo, otro = ctx.otro, s = SECUNDARIA[tec]; if (!s || !yo) return;
    if (s.desvia && otro && ctx.desviar) { const d = H.mira(yo, otro); ctx.desviar({ x: yo.pos.x + d.x * 0.5, y: yo.pos.y + 1, z: yo.pos.z + d.z * 0.5 }, d, s.desvia, s.cono); }
    if (s.marca && otro) { otro.marcada = Math.max(otro.marcada || 0, s.marca); if (!(otro.marcaK > 0)) otro.marcaK = s.marcaK; }
    if (s.desvio) yo.inv = Math.max(yo.inv || 0, s.desvio);
    if (s.alaLista && yo.cd) yo.cd.golpe_ala = 0;
  }
  const r2 = x => Math.round(x * 100) / 100;
  function ajustar(f, h) {
    if (!f || !f.nivel || !h) return h;
    if (h.id === 'grito_yunque' && f.especie === 'vittata') {
      const et = etapaDe(f.nivel, f.variante); if (et.desde === 1) return h;
      const a = Object.create(h);
      a.alcance = Math.min(TOPES_GRITO.alcanceMax, et.alcance); a.cono = et.cono; a.vel = et.vel; a.empuje = et.empuje;
      a.interrumpe = Math.min(TOPES_GRITO.interrumpeMax, et.interrumpe); a.coste = Math.max(TOPES_GRITO.costeMin, et.coste);
      a.cooldown = Math.max(TOPES_GRITO.cooldownMin, et.cooldown); a.desvia = !!et.desvia; a.etapa = et.id; a.nombreEtapa = et.nombre;
      if (et.maestro) { a.maestro = true; envolver(a, h, function (ctx) { brillo(ctx); }); }
      return a;
    }
    if (h.id === 'escudo_plumas' && f.especie === 'arausiaca') {
      if (f.nivel < 10) return h;
      const a = Object.create(h); a.dura = 3; a.etapa = 'escudo_firme';
      if (f.nivel >= 30) { a.cooldown = 6.5; a.maestro = true; a.etapa = 'escudo_maestro'; envolver(a, h, function (ctx) { brillo(ctx); }); }
      return a;
    }
    // Las otras 32 especies: solo su propio poder (nunca básicos, alianzas ni el poder de otra)
    const m = MEJORA[h.id], i = etapaIdx(f.nivel);
    if (!m || !i || f.especie === 'vittata' || f.especie === 'arausiaca' || H.poderDe(f.especie) !== h.id) return h;
    const et = ETAPAS_ESP[i], a = Object.create(h);
    if (m[0] && typeof h[m[0]] === 'number') a[m[0]] = Math.min(h[m[0]] * m[1], r2(h[m[0]] * Math.min(m[1], et.k)));
    a.cooldown = r2(Math.max(h.cooldown * 0.85, h.cooldown * et.cd)); a.etapa = et.id; a.nombreEtapa = et.nombre;
    if (et.secundaria || et.maestro) { const tec = h.tecnica; a.secundaria = tec; a.maestro = !!et.maestro; envolver(a, h, function (ctx) { secundaria(tec, ctx); if (et.maestro) brillo(ctx); }); }
    return a;
  }
  function lineaHud(f) {
    const r = info(f.especie), n = f.nivel || r.nivel, et = f.especie === 'vittata' ? etapaDe(n, f.variante).nombre : (etapaIdx(n) ? ETAPAS_ESP[etapaIdx(n)].nombre : ((H.get(f.poder) || {}).nombre || ''));
    const a = T(r.nivel), b = r.nivel >= NIVEL_MAX ? a + 1 : T(r.nivel + 1);
    return { nivel: con(TXT.nv, n), etapa: et, frac: r.nivel >= NIVEL_MAX ? 1 : Math.max(0, Math.min(1, (r.xp - a) / (b - a))) };
  }
  function htmlFin() {
    if (!ultimo) return '';
    const r = ultimo.reto, reto = r ? `<span style="display:block" data-v18reto-fin>${esc(r.ok ? con(TXT.retoFinLogrado, r.nombre) : con(con(TXT.retoFin, r.nombre), r.n))}</span>` : '';
    if (!ultimo.xp) return reto;
    return `<span>${esc(con(TXT.xp, ultimo.xp))}</span>` + (ultimo.sube ? ` · <span>${esc(con(TXT.subiste, ultimo.sube))}</span>` : '') + reto;
  }

  // ---------- Eco Protector en el motor de habilidades (API pública registrar) ----------
  H.registrar({ id: ALI, nombre: 'Eco Protector', alianza: true, tecnica: 'pico+plumas', coste: 60, cooldown: 14, dura: 2, bloqueaGrito: 5, apoyo: 'arausiaca', fx: 'onda',
    // no se encadena con un escudo ya puesto
    puede: f => !(f.escudo > 0),
    efecto(ctx) {
      const yo = ctx.yo, g = ajustar(yo, H.get('grito_yunque'));
      const r = g.efecto.call(g, ctx) || {}; // la onda de la etapa actual de Vittata (mismo efecto que el grito)
      yo.escudo = this.dura; yo.alasT = Math.min(this.dura, 0.9);
      ctx.escudo(yo, this.dura);
      yo.cd.grito_yunque = Math.max(yo.cd.grito_yunque || 0, this.bloqueaGrito);
      ctx.fx('feathers', yo.pos.x, yo.pos.y + 1, yo.pos.z); ctx.sonar('unlock');
      ctx.apoyo(this.apoyo);
      ctx.poder({ id: this.id, de: yo.id, apoyo: this.apoyo, dura: this.dura, alcance: g.alcance, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z } });
      return { ok: true, acierto: null, dir: r.dir };
    } });

  // ---------- Las otras 5 alianzas: cada una encadena efectos que ya existen de sus dos cotorras (sin modelos ni motor nuevos) ----------
  // Común: coste 60, recarga 14 s, el poder propio de la líder queda en espera 5 s, aviso de apoyo con el retrato de la compañera.
  function cierre(def, ctx, extra) {
    const yo = ctx.yo;
    if (yo.cd && yo.poder) yo.cd[yo.poder] = Math.max(yo.cd[yo.poder] || 0, def.bloquea);
    ctx.apoyo(def.apoyo); ctx.sonar('unlock');
    ctx.poder(Object.assign({ id: def.id, de: yo.id, apoyo: def.apoyo, dura: def.dura, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z } }, extra || {}));
  }
  const conNumeros = (id, nums) => Object.assign(Object.create(H.get(id)), nums);
  const ALI_BASE = { alianza: true, coste: 60, cooldown: 14, bloquea: 5 };
  // Lluvia Guiada (barbadensis + xantholora, NATURALEZA): marca 2 s (las semillas la siguen fuerte) y la lluvia de la etapa actual.
  H.registrar(Object.assign({}, ALI_BASE, { id: 'lluvia_guiada', nombre: 'Lluvia Guiada', tecnica: 'pico+ojos', lider: 'barbadensis', apoyo: 'xantholora', dura: 2, fx: 'leaves',
    efecto(ctx) {
      const { yo, otro } = ctx;
      otro.marcada = Math.max(otro.marcada || 0, this.dura); otro.marcaK = Math.max(otro.marcaK || 0, 0.8);
      ctx.fx('gold', otro.pos.x, otro.pos.y + 1.4, otro.pos.z);
      const l = ajustar(yo, H.get('lluvia_semillas')); l.efecto.call(l, ctx);
      cierre(this, ctx); return { ok: true };
    } }));
  // Viento Cruzado (agilis + farinosa, VIENTO): quiebro (0,6 s sin que te den) y, 0,3 s después, Ala fuerte de 3 m que rompe escudos.
  H.registrar(Object.assign({}, ALI_BASE, { id: 'viento_cruzado', nombre: 'Viento Cruzado', tecnica: 'alas+alas', lider: 'agilis', apoyo: 'farinosa', dura: 0.6, remata: 0.3, alcance: 3, fx: 'feathers',
    efecto(ctx) {
      const yo = ctx.yo, q = ajustar(yo, H.get('quiebro')), def = this; q.efecto.call(q, ctx);
      ctx.despues(def.remata, () => { const a = conNumeros('ala_fuerte', { alcance: def.alcance }); a.efecto.call(a, ctx); });
      cierre(this, ctx); return { ok: true };
    } }));
  // Destello del Pitón (guildingii + versicolor, LUZ): abanico (deslumbra 1 s si está a ≤ 8 m) y sus tiros van lentos 2 s.
  H.registrar(Object.assign({}, ALI_BASE, { id: 'destello_piton', nombre: 'Destello del Pitón', tecnica: 'plumas+ojos', lider: 'guildingii', apoyo: 'versicolor', dura: 2, fx: 'stars',
    efecto(ctx) {
      const { yo, otro } = ctx, ab = ajustar(yo, H.get('abanico_colores')), r = ab.efecto.call(ab, ctx) || {};
      otro.lenta = Math.max(otro.lenta || 0, this.dura);
      ctx.fx('ring', otro.pos.x, otro.pos.y + 1.0, otro.pos.z);
      cierre(this, ctx); return { ok: true, acierto: r.acierto };
    } }));
  // Marea de Lluvia (dufresniana + diadema, AGUA): escudo de lluvia de 2 s (frena como la Gota de lluvia) y una semilla de río.
  H.registrar(Object.assign({}, ALI_BASE, { id: 'marea_lluvia', nombre: 'Marea de Lluvia', tecnica: 'plumas+pico', lider: 'dufresniana', apoyo: 'diadema', dura: 2, fx: 'escudo',
    // no se encadena con un escudo ya puesto
    puede: f => !(f.escudo > 0),
    efecto(ctx) {
      const yo = ctx.yo, g = H.get('gota_lluvia');
      yo.escudo = this.dura; yo.alasT = Math.min(this.dura, 0.9); yo.escudoE = { reduceEmpuje: g.reduceEmpuje, reduceMareo: g.reduceMareo };
      ctx.escudo(yo, this.dura);
      const s = H.get('semilla_rio'); s.efecto.call(s, ctx);
      cierre(this, ctx); return { ok: true };
    } }));
  // Ráfaga Volcánica (finschi + auropalliata, FUEGO): la ráfaga y, 0,75 s después, una onda de volcán corta (6 m, empuje 16, sin plumas).
  H.registrar(Object.assign({}, ALI_BASE, { id: 'rafaga_volcan', nombre: 'Ráfaga Volcánica', tecnica: 'alas+pico', lider: 'finschi', apoyo: 'auropalliata', dura: 1, tras: 0.75, fx: 'onda',
    efecto(ctx) {
      const yo = ctx.yo, rf = ajustar(yo, H.get('rafaga')), def = this; rf.efecto.call(rf, ctx);
      ctx.despues(def.tras, () => { const v = conNumeros('voz_volcan', { carga: 0.2, alcance: 6, empuje: 16, pico: 0.6 }); v.efecto.call(v, ctx); });
      ctx.fx('gold', yo.pos.x, yo.pos.y + 1.0, yo.pos.z);
      cierre(this, ctx); return { ok: true };
    } }));

  // ---------- La alianza explorando: al usar tu poder con la G (explorar.js emite v18poder explorando), ayuda la compañera ----------
  let ultimaExplora = null;
  const EXPLORA = {
    eco_protector(p) { if (G.v18fx && G.v18fx.escudo) G.v18fx.escudo(null, 3); G.fx.burst(p.x, p.y + 1, p.z, 'feathers', 10); return 1; },
    lluvia_guiada(p) {
      let best = null, bd = 40;
      try { for (const it of G.interaccion.list) { if (it.visible && !it.visible()) continue; const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < bd) { bd = d; best = it; } } } catch (e) { /* sin interacción */ }
      if (best) { const y = G.terreno && G.terreno.height ? G.terreno.height(best.x, best.z) + 1 : p.y; G.fx.burst(best.x, y, best.z, 'leaves', 10); G.fx.burst(best.x, y + 0.4, best.z, 'gold', 8); G.fx.ringFx(best.x, y, best.z, 2, 0.9, 0.6); return 1; }
      G.fx.burst(p.x, p.y + 1, p.z, 'leaves', 8); return 0;
    },
    viento_cruzado(p) { G.fx.ringFx(p.x, p.y + 0.4, p.z, 5, 0.7, 0.5); G.fx.burst(p.x, p.y + 0.5, p.z, 'leaves', 16); G.fx.burst(p.x, p.y + 0.1, p.z, 'dust', 12); return 1; },
    destello_piton(p) {
      let n = 0;
      try { for (const r of ((G.marana && G.marana.rastros) || [])) { if (r.limpio || Math.hypot(r.x - p.x, r.z - p.z) > 90) continue; const y = G.terreno.height(r.x, r.z) + 1.2; G.fx.burst(r.x, y, r.z, 'stars', 10); G.fx.ringFx(r.x, y, r.z, 2, 0.9, 0.6); n++; } } catch (e) { /* sin maraña */ }
      G.fx.burst(p.x, p.y + 1.1, p.z, 'stars', 12); return n;
    },
    marea_lluvia(p) { if (G.v18fx && G.v18fx.escudo) G.v18fx.escudo(null, 3); if (G.fx.drops) G.fx.drops(p.x, p.y + 2.2, p.z, 1.6, p.y); G.fx.burst(p.x, p.y + 1, p.z, 'bubbles', 10); return 1; },
    rafaga_volcan(p) { G.fx.burst(p.x, p.y + 0.8, p.z, 'gold', 16); G.fx.burst(p.x, p.y + 0.1, p.z, 'dust', 10); G.fx.ringFx(p.x, p.y + 0.4, p.z, 3, 0.6, 0.6); return 1; }
  };
  function explorando(ev) {
    if (mudo || !ev || !ev.explorando || ev.de !== 'jugador' || ev.alianza) return null;
    const sp = V.seleccionada() || perfil(), a = aliDe(E().alianzaSel);
    if (!a || a.lider !== sp || E().alianzas[a.id] !== 'desbloqueada' || ev.id !== H.poderDe(sp)) return null;
    const p = ev.origen || (G.S && G.S.pos) || { x: 0, y: 0, z: 0 };
    let n = 0; try { n = EXPLORA[a.id](p); } catch (e) { /* sin efectos */ }
    ultimaExplora = { id: a.id, apoyo: a.apoyo, n, t: Date.now() };
    sonar('pickup', 2);
    return ultimaExplora;
  }

  // ---------- Avisos: tarjeta dorada que no bloquea el juego ----------
  let cartaEl = null, cartaTO = 0;
  // estilos de la tarjeta y de la ficha (Mis cotorras puede abrirse antes de ninguna tarjeta)
  function css() {
    if (!document.getElementById('v18-evo-css')) {
      const st = document.createElement('style'); st.id = 'v18-evo-css';
      // arriba (sobre el aviso y el panel del duelo, que al terminar ya dice lo mismo): abajo tapaba los botones grandes en el móvil
      st.textContent = '#v18-evo-carta{position:fixed;left:0;right:0;margin-inline:auto;top:calc(env(safe-area-inset-top,0px) + 8px);width:min(360px,calc(100vw - 32px));z-index:45;pointer-events:none;' +
        'background:linear-gradient(160deg,#fff6d8,#ffd98a);color:#3b2a14;border-radius:16px;padding:12px 16px;box-shadow:0 0 0 3px #ffefb8,0 6px 24px #0007;font-family:Fredoka,system-ui,sans-serif;text-align:center;animation:v18evo .45s ease-out}' +
        '#v18-evo-carta h3{margin:0;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#8a5a20}#v18-evo-carta b{display:block;font-size:24px;margin:2px 0 4px}#v18-evo-carta p{margin:0;font-size:14px;line-height:1.3}' +
        '#v18-evo-carta img{width:44px;height:44px;border-radius:50%;float:left;margin-right:8px;background:#fff8}' +
        '.v18-evo-f{display:block;font-size:12px;margin-top:3px}.v18-evo-bar{display:block;height:4px;border-radius:2px;background:#0003;overflow:hidden;margin:2px 6px}.v18-evo-bar b{display:block;height:100%;background:#e0a526}' +
        '.v18-evo-m{display:block;font-size:11px;line-height:1.25;margin:1px 2px;opacity:.9}' +
        '.v18-evo-et{display:inline-block;font-size:10px;padding:1px 5px;border-radius:8px;background:#ffe39a;color:#3b2a14;margin:2px 1px}.v18-evo-et.no{background:#0002;color:inherit;opacity:.6}' +
        '.v18-evo-x{margin-top:8px;font-size:14px}.v18-evo-x .btn{min-height:44px}' +
        '#v18-evo-carta.mini{width:min(260px,calc(100vw - 32px));padding:6px 12px;border-radius:12px}#v18-evo-carta.mini h3{font-size:16px;letter-spacing:0;text-transform:none;color:#7a4a10}' +
        '#v18-evo-carta.mini b{font-size:14px;margin:0 0 2px}#v18-evo-carta.mini p{font-size:12px}' +
        '.v18-evo-ali{margin:6px 0;padding:6px 8px;border-radius:10px;background:#0001;text-align:left;font-size:13px;line-height:1.3}.v18-evo-ali p{margin:3px 0 0}' +
        '.v18-evo-ali .si{color:#2f7a2f;font-weight:700}.v18-evo-ali .no{opacity:.8}.v18-evo-ali img{vertical-align:middle;border-radius:50%;margin-right:4px}' +
        '@media (min-width:761px){#v18-evo-carta{top:calc(env(safe-area-inset-top,0px) + 96px)}}' + // en la computadora el aviso (#toast, capa superior) ocupa el borde de arriba
        '@keyframes v18evo{from{transform:translateY(-16px) scale(.9);opacity:0}to{transform:none;opacity:1}}';
      document.head.appendChild(st);
    }
  }
  // Con el cómic, el creador o una tarjeta en el teléfono encima, la tarjeta espera a que se cierren (como los avisos, QA-93)
  let cartaPend = null, cartaPendTO = 0;
  function tapada() {
    const $ = id => document.getElementById(id), vis = el => !!el && !el.hidden;
    return vis($('comic')) || vis($('creator')) || (vis($('card')) && window.innerWidth <= 560);
  }
  function soltarPend(n) {
    clearTimeout(cartaPendTO);
    if (!cartaPend) return;
    if (tapada() && n < 200) { cartaPendTO = setTimeout(() => soltarPend(n + 1), 600); return; }
    const a = cartaPend; cartaPend = null; carta.apply(null, a);
  }
  function carta(tit, nombre, frase, alianza, extra, tipo) {
    css();
    if (tapada()) { if (!(tipo === 'mini' && cartaPend && cartaPend[5] !== 'mini')) cartaPend = [tit, nombre, frase, alianza, extra, tipo]; soltarPend(0); return null; }
    if (!cartaEl) { cartaEl = document.createElement('div'); cartaEl.id = 'v18-evo-carta'; cartaEl.setAttribute('role', 'status'); document.body.appendChild(cartaEl); }
    // un texto por nodo: el traductor EN los encuentra
    cartaEl.innerHTML = (alianza ? `<img src="assets/retratos/v18/${esc(typeof alianza === 'string' ? alianza : 'arausiaca')}.png" alt="">` : '') + `<h3>${esc(tit)}</h3><b>${Array.isArray(nombre) ? nombre.map(x => `<span>${esc(x)}</span>`).join(' · ') : esc(nombre)}</b><p><span>${esc(frase)}</span>${extra ? ` <span>${esc(extra)}</span>` : ''}</p>`;
    cartaEl.className = tipo === 'mini' ? 'mini' : '';
    cartaEl.hidden = false; cartaEl.style.animation = 'none'; void cartaEl.offsetWidth; cartaEl.style.animation = '';
    if (tipo !== 'mini') { try { if (G.fx && G.fx.burst && G.S) G.fx.burst(G.S.pos.x, G.S.pos.y + 1.6, G.S.pos.z, 'gold', 16); } catch (e) { /* sin efectos */ } }
    clearTimeout(cartaTO); cartaTO = setTimeout(quitarCarta, tipo === 'mini' ? 2600 : 5200);
    return cartaEl;
  }
  function quitarCarta() { clearTimeout(cartaTO); clearTimeout(cartaPendTO); cartaPend = null; if (cartaEl) { cartaEl.remove(); cartaEl = null; } }

  // ---------- Mis cotorras (descubrir.js): ficha de nivel, XP hasta el siguiente, etapa, lo que mejora y alianza ----------
  const retrato = (sp, px) => `<img src="assets/retratos/v18/${esc(sp)}.png" alt="" width="${px}" height="${px}" style="vertical-align:middle;margin-right:4px;border-radius:50%">`;
  const estadoTxt = st => (st === 'desbloqueada' ? TXT.aliDesb : st === 'disponible' ? TXT.aliDispE : TXT.aliBloq);
  function htmlMejora(sp, r) {
    const m = r.mejora; if (!m.cambios.length && !m.maestro) return '';
    let h = `<span class="v18-evo-m"><span>${esc(TXT.mejora)}</span> ` + m.cambios.map(c => `<span><span>${esc(TXT['k_' + c.k])}</span> ${c.pct > 0 ? '+' : '−'}${Math.abs(c.pct)} %</span>`).join(' · ');
    if (m.secundaria) h += ` · <span>${esc(TXT['sec_' + m.secundaria])}</span>`;
    if (m.maestro) h += ` · <span>${esc(TXT.maestroFx)}</span>`;
    return h + '</span>';
  }
  function htmlFicha(sp) {
    try { css(); } catch (e) { /* sin documento */ }
    const r = info(sp), L = lineaHud({ especie: sp, nivel: r.nivel, variante: r.variante, poder: H.poderDe(sp) });
    let h = `<span class="v18-evo-f"><span>${esc(L.nivel)}</span> · <span>${esc(L.etapa)}</span></span><i class="v18-evo-bar"><b style="width:${Math.round(L.frac * 100)}%"></b></i>`;
    h += `<span class="v18-evo-m">${r.sig == null ? `<span>${esc(TXT.max)}</span>` : `<span>${esc(con(con(TXT.falta, r.falta), r.nivel + 1))}</span>`}</span>`;
    if (sp === 'vittata') h += '<span style="display:block">' + ETAPAS.slice(1).map(et => r.nivel >= et.desde ? `<span class="v18-evo-et">${esc(et.nombre)}</span>` : `<span class="v18-evo-et no"><span>${esc(et.nombre)}</span> · <span>${esc(con(TXT.nivel, et.desde))}</span></span>`).join('') + '</span>';
    else {
      h += htmlMejora(sp, r);
      if (sp === V.seleccionada()) h += '<span style="display:block">' + ETAPAS_ESP.slice(1).map(et => r.nivel >= et.desde ? `<span class="v18-evo-et">${esc(et.nombre)}</span>` : `<span class="v18-evo-et no"><span>${esc(et.nombre)}</span> · <span>${esc(con(TXT.nivel, et.desde))}</span></span>`).join('') + '</span>';
    }
    if (r.alianza) { const a = aliDe(r.alianza); h += `<span class="v18-evo-et${r.alianzaEstado === 'desbloqueada' ? '' : ' no'}" data-v18ficha-ali="${a.id}"><span>${esc(a.nombre)}</span> · <span>${esc(r.rol === 'lider' ? TXT.aliLider : TXT.aliApoyo)}</span> · <span>${esc(estadoTxt(r.alianzaEstado))}</span></span>`; }
    return h;
  }
  function htmlExtra() {
    const e = E(), v = info('vittata'), sel = V.seleccionada();
    let h = '';
    if (sel === 'vittata' && v.nivel >= 20) {
      const cur = v.variante || (v.nivel >= 30 ? 'maestro' : 'dirigido'), vs = VARIANTES.filter(x => x !== 'maestro' || v.nivel >= 30), et = { amplificado: 1, dirigido: 2, maestro: 3 };
      h += `<div class="row v18-evo-x"><span>${esc(TXT.varTit)}</span> ` + vs.map(x => `<button class="btn${cur === x ? '' : ' ghost'}" type="button" data-v18var="${x}" aria-pressed="${cur === x}">${esc(ETAPAS[et[x]].nombre)}</button>`).join(' ') + '</div>';
    }
    const a = ALIANZAS.find(x => x.lider === sel);
    if (a && e.alianzas[a.id] === 'desbloqueada') {
      const on = e.alianzaSel === a.id;
      h += `<div class="row v18-evo-x"><span>${esc(TXT.aliTit)}</span> <button class="btn${on ? '' : ' ghost'}" type="button" data-v18ali="${a.id}" aria-pressed="${on}">${retrato(a.apoyo, 28)}${esc(a.nombre)}</button> <span>${esc(on ? TXT.aliOn : TXT.aliOff)}</span></div>`;
      h += `<p class="v18-evo-x" style="opacity:.85">${esc(a.explora)}</p>`;
    }
    return h + htmlAlianzas();
  }
  // Las alianzas de bandada que ya conoces (la líder o la compañera está en tu bandada): estado, qué falta y el reto, uno por uno
  function htmlAlianzas() {
    const e = E(), sel = V.seleccionada(), vistas = ALIANZAS.filter(a => elegible(a.lider) || elegible(a.apoyo));
    const marca = ok => `<span class="${ok ? 'si' : 'no'}" aria-hidden="true">${ok ? '✓' : '○'}</span> `;
    const ret = sp => (RETRATOS.has(sp) ? retrato(sp, 24) : '');
    let h = `<div class="v18-evo-x" data-v18alianzas><b>${esc(TXT.aliSec)}</b>`;
    for (const a of vistas) {
      const st = e.alianzas[a.id], nl = info(a.lider).nivel;
      h += `<div class="v18-evo-ali" data-v18ali-fila="${a.id}" data-estado="${st}">${ret(a.lider)}${ret(a.apoyo)}<b>${esc(a.nombre)}</b> · <span>${esc(estadoTxt(st))}</span>`;
      if (st === 'bloqueada') {
        h += `<p><span>${esc(a.id === ALI ? TXT.aliReq : TXT.aliReqG)}</span></p>`;
        h += `<p>${marca(nl >= 10)}<span>${esc(con(con(TXT.reqLider, nombre(a.lider)), nl))}</span></p>`;
        h += `<p>${marca(elegible(a.apoyo))}<span>${esc(con(TXT.reqApoyo, nombre(a.apoyo)))}</span></p>`;
        h += `<p class="no">${marca(false)}<span>${esc(retoTexto(a))}</span></p>`;
      } else if (st === 'disponible') {
        h += `<p>${marca(true)}<span>${esc(con(con(TXT.reqLider, nombre(a.lider)), nl))}</span></p><p>${marca(true)}<span>${esc(con(TXT.reqApoyo, nombre(a.apoyo)))}</span></p>`;
        h += `<p data-v18reto="${a.id}">${marca(false)}<b>${esc(retoTexto(a))}</b></p>`;
      } else if (sel !== a.lider) h += `<p><span>${esc(con(TXT.usarCon, nombre(a.lider)))}</span></p>`;
      h += '</div>';
    }
    const ocultas = ALIANZAS.length - vistas.length;
    if (ocultas) h += `<p style="opacity:.75"><span>${esc(con(TXT.aliPorDesc, ocultas))}</span></p>`;
    return h + '</div>';
  }
  function enlazar(card) {
    if (!card) return;
    const otra = () => setTimeout(() => { try { const c = G.ui.$('card'); if (G.v18descubrir && c && !c.hidden) G.v18descubrir.abrirSeleccion(); } catch (er) { /* tarjeta */ } }, 0);
    card.querySelectorAll('[data-v18var]').forEach(b => { b.onclick = () => { elegirVariante(b.getAttribute('data-v18var')); sonar('pickup', 2); otra(); }; });
    card.querySelectorAll('[data-v18ali]').forEach(b => { b.onclick = () => { const id = aliDe(b.getAttribute('data-v18ali')) ? b.getAttribute('data-v18ali') : ALI; elegirAlianza(E().alianzaSel !== id, id); sonar('pickup', 3); otra(); }; });
  }

  // ---------- Modo de prueba documentado (para videos y equilibrio) ----------
  // prueba({ especie, nivel | xp, variante, alianza: true | '<id>' }) · prueba(null) restaura lo de antes
  function prueba(o) {
    if (o === null) {
      const res = E().respaldo; if (!res) return false;
      V.cambiarEvo(e => { const r = JSON.parse(res); e.esp = r.esp; e.alianzas = r.alianzas; e.alianzaSel = r.alianzaSel; delete e.respaldo; delete e.prueba; sanear(e); });
      return true;
    }
    o = o || {}; const sp = o.especie || 'vittata';
    V.cambiarEvo(e0 => {
      const e = sanear(e0);
      if (!e.respaldo) e.respaldo = JSON.stringify({ esp: e.esp, alianzas: e.alianzas, alianzaSel: e.alianzaSel });
      const r = reg(e, sp); r.xp = Math.max(0, Math.min(XP_MAX, o.xp != null ? o.xp : T(Math.max(1, Math.min(NIVEL_MAX, o.nivel || 1)))));
      if (o.variante) r.variante = o.variante;
      if (o.alianza) { const id = aliDe(o.alianza) ? o.alianza : ((ALIANZAS.find(x => x.lider === sp) || {}).id || ALI); e.alianzas[id] = 'desbloqueada'; e.alianzaSel = id; }
      e.prueba = true; sanear(e);
    });
    try { console.info('[V18.2] ' + TXT.prueba + ': ' + JSON.stringify(info(sp))); } catch (e) { /* consola */ }
    return info(sp);
  }

  // ---------- Conexiones (eventos que ya existen) ----------
  G.on('v18combate', ev => {
    if (mudo || !ev || ev.duelo) return; // duelo de 2: 0 XP
    const sp = ev.especie || (G.v18combate && G.v18combate.estado().j && G.v18combate.estado().j.especie) || V.seleccionada() || perfil();
    const cj = G.v18combate && G.v18combate.estado && G.v18combate.estado().j; // nivel con el que empezó el duelo (los hitos de la victoria también suben)
    const n0 = (cj && cj.especie === sp && cj.nivel) || info(sp).nivel;
    if (ev.tipo === 'win' && ev.de === 'jugador') {
      ultimo = { xp: 0, sube: 0 };
      ultimo.xp = dar(sp, XP.gana, 'duelo', { repetible: true, duelo: true, cuenta: 'victorias', mitadDesde: TOPE.mitadDesde });
      // Desafío de cada alianza «disponible» de esta líder: Eco Protector, 2 interrupciones; las otras, 2 usos del poder propio
      for (const a of ALIANZAS) {
        if (a.lider !== sp || estadoAli(a.id) !== 'disponible') continue;
        const n = (a.reto === 'interrupciones' ? ev.interrupciones : ev.poderJ) || 0;
        if (n >= 2 && desbloquearAlianza(a.id)) { ultimo.xp += XP.desafio; ultimo.reto = { nombre: a.nombre, ok: true }; } else ultimo.reto = { nombre: a.nombre, n: Math.min(2, n) };
      }
    } else if (ev.tipo === 'loss' && ev.a === 'jugador') {
      ultimo = { xp: 0, sube: 0 };
      if ((ev.quitadas || 0) >= TOPE.pierdeQuitadas && (ev.dura || 0) >= TOPE.pierdeDura) ultimo.xp = dar(sp, XP.pierde, 'duelo', { repetible: true, duelo: true });
      const a = ALIANZAS.find(x => x.lider === sp && estadoAli(x.id) === 'disponible');
      if (a) ultimo.reto = { nombre: a.nombre, n: Math.min(2, (a.reto === 'interrupciones' ? ev.interrupciones : ev.poderJ) || 0) };
    } else return;
    if (info(sp).nivel > n0) ultimo.sube = info(sp).nivel;
  });
  G.on('v18poder', explorando);
  G.on('v18minigolf', ev => {
    if (mudo || !ev || ev.tipo !== 'nido') return;
    dar(V.seleccionada() || perfil(), XP.golfNido + (ev.nuevo ? XP.golfRecord : 0), 'golf', { repetible: true, cuenta: 'golf', max: TOPE.golfDia });
  });
  G.on('v18', ev => {
    if (mudo || !ev || ev.tipo === 'evo') return;
    if (ev.tipo === 'mundo' || ev.tipo === 'recompensa' || ev.tipo === 'especie') { revisarHitos(); revisarAlianza(); }
  });
  G.on('apply', () => setTimeout(() => { if (!mudo) { revisarHitos(); revisarAlianza(); } }, 0), 98);
  setTimeout(() => { if (!mudo) { revisarHitos(); revisarAlianza(); } }, 0);

  // =====================================================================================================================
  // Prueba: AV.v18EvolucionTest()
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const Cb = G.v18combate, S = G.S, P = V;
    let crudo = null; try { crudo = localStorage.getItem(P.clave()); } catch (e) { /* sin almacenamiento */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, inv0 = Object.assign({}, S.inv), sel0 = P.seleccionada();
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = (t, ms) => { toasts.push(String(t)); return toast0.call(G.ui, t, ms); };
    const evs = [], podEv = []; let oye = true;
    G.on('v18', e => { if (oye && e && e.tipo === 'evo' && e.sube) evs.push(e); });
    G.on('v18poder', e => { if (oye) podEv.push(e); });
    // Estado limpio: Vittata elegida, la primera victoria ya pagada (sin materiales) y los hitos presentes ya cobrados
    const reset = () => { P.borrar(); P.desbloquear('vittata'); P.seleccionar('vittata'); P.otorgar('combate_1', 'victoria_duelo', 1); P.otorgar('duelo_gana_vittata', 'victoria_vittata', 1); P.otorgar('duelo_gana_arausiaca', 'victoria_arausiaca', 1);
      P.cambiarEvo(e => { for (const k of Object.keys(e)) delete e[k]; sanear(e); e.retro = true; for (const h of hitos()) e.marcas[h[0]] = true; }); hoyFijo = 'prueba-1'; ultimo = null; };
    const C = () => Cb.estado();
    const correr = (s, antes) => { for (let t = 0; t < s && C().fase === 'lucha'; t += 0.05) { if (antes) antes(); Cb.paso(0.05); } };
    const quieta = (dx, dz) => { const r = C().r; r.pos.x = S.pos.x + dx; r.pos.z = S.pos.z + (dz || 0); r.pensar = 99; r.esquivaT = 99; r.poderT = 99; r.golpeT = 99; r.tiroT = 99; r.mov.t = 99; r.mov.x = r.mov.z = 0; r.kb.t = 0; r.kb.x = r.kb.z = 0; }; // mov.t > 0 con velocidad 0: no se acerca
    const cara = (x, z) => { const n = Math.hypot(x, z || 0) || 1; S.facing = { x: x / n, z: (z || 0) / n }; };
    const vaciar = () => { while (C().timers.length) C().timers.shift().fn(); };
    // Jugadora automática «media» para el equilibrio (determinista: su propio generador con semilla)
    const ETAPAS_EQ = [1, 10, 20, 30];
    function dueloMedio(nivel, k, dif) {
      let sem = 101 + k * 31; const rnd = () => { sem = (sem * 48271) % 2147483647; return (sem - 1) / 2147483646; };
      const op = { sinCuenta: true, especie: 'vittata', evo: { nivel }, semilla: 3 + k * 17 }; if (dif) op.dificultad = dif;
      Cb.iniciar(op);
      const jug = {}; let t = 0, prox = 0, fase = 0, faseT = 0, lado = 1, aparta = 0, error = 0, vista = 0;
      correr(180, () => {
        t += 0.05; const c = C(), j = c.j, r = c.r, d = H.dirA(j, r), v = 5.5 * 0.05;
        if (t >= faseT) { fase = rnd() < 0.5 ? 0 : 1; faseT = t + 3 + rnd() * 3; lado = rnd() < 0.5 ? -1 : 1; }
        if (t >= vista) { error = (rnd() - 0.5) * 0.9; vista = t + 0.5; }
        const ca = Math.cos(error), sa = Math.sin(error); cara(d.x * ca - d.z * sa, d.x * sa + d.z * ca);
        const gH = H.listo(j, 'grito_yunque'), alcG = (ajustar(j, H.get('grito_yunque')) || {}).alcance || 7;
        const quiere = fase === 0 ? 1.8 : Math.max(4, Math.min(8, alcG - 1.5));
        let mx = 0, mz = 0;
        if (aparta > 0) { aparta -= 0.05; mx = -d.z * lado; mz = d.x * lado; }
        else if (d.d > quiere + 0.8) { mx = d.x; mz = d.z; } else if (d.d < quiere - 0.8) { mx = -d.x; mz = -d.z; }
        const viene = c.balas.find(b => b.de === r && Math.hypot(b.m.position.x - S.pos.x, b.m.position.z - S.pos.z) < 6);
        if (viene && aparta <= 0 && t >= prox && rnd() < 0.35) { aparta = 0.35; prox = t + 0.6; }
        const ox = S.pos.x - Cb.sitio.x, oz = S.pos.z - Cb.sitio.z, od = Math.hypot(ox, oz) || 1;
        if (od > 9.5 && (mx * ox + mz * oz) > 0) { const tx = -oz / od, tz = ox / od, sg = (tx * d.x + tz * d.z) > 0 ? -1 : 1; mx = tx * sg; mz = tz * sg; }
        S.pos.x += mx * v; S.pos.z += mz * v;
        const ox2 = S.pos.x - Cb.sitio.x, oz2 = S.pos.z - Cb.sitio.z, od2 = Math.hypot(ox2, oz2); if (od2 > 11) { S.pos.x = Cb.sitio.x + ox2 / od2 * 11; S.pos.z = Cb.sitio.z + oz2 / od2 * 11; }
        if (j.mareo > 0 || t < prox) return;
        if (rnd() < 0.3) { prox = t + 0.3; return; }
        let u = null;
        if (gH.ok && d.d < alcG && d.d > 2.4 && rnd() < 0.6) u = 'grito_yunque';
        else if (d.d < 2.3 && H.listo(j, 'golpe_ala').ok) u = 'golpe_ala';
        else if (d.d > 3.5 && j.energia >= 50 && H.listo(j, 'semilla').ok && rnd() < 0.5) u = 'semilla';
        if (u) { const ru = Cb.usar(j, u); if (ru.ok) { prox = t + 0.6; jug[u] = (jug[u] || 0) + 1; if (ru.acierto) jug[u + '+'] = (jug[u + '+'] || 0) + 1; } }
      });
      const c = C(); return { gana: c.resultado === 'win', s: c.tLucha || 0, quitadas: (c.r.plumasMax || 5) - c.r.plumas, perdidas: 5 - c.j.plumas, st: Object.assign({}, c.stats, jug) };
    }
    function medirEquilibrio(q) {
      q = q || {}; const N = q.n || 36, res = {};
      for (const nivel of (q.niveles || ETAPAS_EQ)) {
        let g = 0, dur = 0, pl = 0, pj = 0, primera = 0; const st = {};
        const dif = q.dificultad ? q.dificultad[etapaIdx(nivel)] : null;
        for (let k = 0; k < N; k++) { const r = dueloMedio(nivel, k, dif); if (r.gana) { g++; if (!primera) primera = k + 1; } dur += r.s; if (q.stats) for (const x in r.st) if (typeof r.st[x] === 'number') st[x] = (st[x] || 0) + r.st[x] / N; pl += r.quitadas; pj += r.perdidas; }
        res['nv' + nivel] = { gana: g + '/' + N, pct: Math.round(100 * g / N), primera, s: Math.round(dur / N), quitadas: Math.round(10 * pl / N) / 10, perdidas: Math.round(10 * pj / N) / 10 };
        if (q.stats) { for (const x in st) st[x] = Math.round(st[x] * 10) / 10; res['nv' + nivel].st = st; }
      }
      Cb.salir();
      return res;
    }
    const fresco = () => { const c = C(), j = c.j, r = c.r; j.cd = {}; j.energia = 100; j.escudo = 0; j.mareo = 0; j.inv = 0; r.mareo = 0; r.inv = 0; r.escudo = 0; r.interrumpida = 0; r.kb.t = 0; r.kb.x = r.kb.z = 0; r.plumas = 5; j.plumas = 5; };
    if (o.barrido) {
      mudo = true; oye = false; reset();
      const filas = [];
      try { for (const dif of o.barrido) filas.push({ dif: dif.map(d => d.id), res: medirEquilibrio({ n: o.n || 36, dificultad: dif, stats: o.stats }) }); } catch (e) { filas.push({ error: String(e && (e.stack || e.message)) }); }
      mudo = false; hoyFijo = null; quitarCarta(); try { Cb.salir(); } catch (e) { /* ya fuera */ }
      G.ui.toast = toast0; Object.assign(S.pos, pos0); S.facing = fac0;
      try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
      P.recargar();
      return { passed: 1, total: 1, results: [{ name: 'barrido', ok: true, extra: JSON.stringify(filas) }] };
    }
    try {
      // 10 (antes que nada). Sin la bandera no se carga nada: lo mide boot.js antes de pedir este módulo
      const antes = o.antes || {};
      if (antes.v18 === false) check('Con la bandera apagada (?v18=0) no se carga evolucion.js (ni con gestos del jugador)', !antes.cargado && !antes.evo && !antes.script, JSON.stringify(antes));
      else check('Con la bandera apagada no se carga nada (esta sesión tiene la bandera, encendida por defecto: se comprueba con ?v18=0)', antes.v18 === true || antes.v18 == null, JSON.stringify(antes));

      // 1. Curva y topes de XP
      let mono = true; for (let x = 0, n0 = 1; x <= XP_MAX + 500; x += 7) { const n = nivelDe(x); if (n < n0) mono = false; n0 = n; }
      check('Curva: T(10)=396, T(20)=1406, T(30)=3016, T(40)=5226; nivel monótono y tope 40',
        T(10) === 396 && T(20) === 1406 && T(30) === 3016 && T(40) === 5226 && nivelDe(395) === 9 && nivelDe(396) === 10 && nivelDe(1e9) === NIVEL_MAX && mono && nivelDe(0) === 1);

      // 2. Migración: una partida V18 vieja (v1, sin evo) carga igual; evo corrupto se sanea; una build vieja conserva evo
      reset();
      const v1 = { v: 1, especies: { arausiaca: 'seleccionable', agilis: 'descubierta' }, inv: { pluma_rival: 2 }, otorgados: { combate_1: true, duelo_gana_vittata: true }, mundo: { puente_villa: 'reparado', v18_piedra1: 'recogida' }, sel: 'vittata' };
      localStorage.setItem(P.clave(), JSON.stringify(v1)); P.recargar();
      const c1 = P.copia();
      check('Partida V18 vieja (v1 sin evolución): carga sin errores, pasa a v2 y conserva especies, inventario, recompensas, mundo y elegida',
        c1.v === 2 && c1.especies.arausiaca === 'seleccionable' && c1.especies.agilis === 'descubierta' && c1.inv.pluma_rival === 2 && c1.otorgados.combate_1 && c1.mundo.puente_villa === 'reparado' && P.seleccionada() === 'vittata' &&
        typeof c1.evo === 'object' && info('vittata').nivel === 1 && paraDuelo('vittata').nivel === 1 && !paraDuelo('vittata').alianza, JSON.stringify(c1));
      const r1 = revisarHitos(true), r2 = revisarHitos(true);
      check('Partida vieja: los hitos ya cumplidos dan su XP una sola vez (puente 120 + arausiaca 30 + 1.ª victoria 60 + material 5)', r1 === 215 && r2 === 0 && info('vittata').xp === 215, r1 + ' / ' + r2 + ' / ' + info('vittata').xp);
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true });
      check('Partida vieja: el duelo empieza con su nivel (sin alianza) y sin errores', C().fase === 'lucha' && C().j.nivel === info('vittata').nivel && !C().j.alianza, C().j.nivel);
      Cb.salir();
      localStorage.setItem(P.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: {}, sel: null, evo: { esp: { vittata: { xp: -50, nivel: 99, variante: 'rara' }, x: 7 }, alianzas: { eco_protector: 'regalada' }, alianzaSel: 'otra', dia: 5, marcas: null } }));
      P.recargar(); const ev1 = E();
      check('Evolución corrupta se sanea: xp<0 → 0, nivel 99 → recalculado, variante rara → null, alianza → bloqueada',
        ev1.esp.vittata.xp === 0 && ev1.esp.vittata.nivel === 1 && ev1.esp.vittata.variante === null && !ev1.esp.x && ev1.alianzas[ALI] === 'bloqueada' && ev1.alianzaSel === null && typeof ev1.dia === 'object', JSON.stringify(ev1));
      { // una build anterior (V = 1) lee un v2: lo marca v1 y conserva evo (Object.assign); al volver aquí la XP sigue
        localStorage.setItem(P.clave(), JSON.stringify({ v: 2, especies: { arausiaca: 'seleccionable' }, inv: {}, otorgados: {}, mundo: {}, sel: 'vittata', evo: { esp: { vittata: { xp: 500 } } } }));
        let d = JSON.parse(localStorage.getItem(P.clave())); if (d.v !== 1) { d.v = 1; d = Object.assign({ v: 1, especies: {}, inv: {}, otorgados: {}, mundo: {}, sel: null }, d); }
        localStorage.setItem(P.clave(), JSON.stringify(d)); P.recargar();
        check('Vuelta atrás: una build anterior conserva evo y al volver se lee igual (xp 500 → nivel 11)', info('vittata').xp === 500 && info('vittata').nivel === 11, JSON.stringify(info('vittata')));
      }

      // 3. Guardar → recargar conserva nivel, XP, variante, alianza y alianza elegida
      reset(); P.desbloquear('arausiaca'); const x3 = info('vittata').xp;
      prueba({ especie: 'vittata', xp: T(22) + 17, variante: 'amplificado', alianza: true });
      P.recargar();
      const g3 = info('vittata'), raw3 = JSON.parse(localStorage.getItem(P.clave()));
      check('Guardar → recargar conserva nivel, XP, variante, alianza y su elección', g3.nivel === 22 && g3.xp === T(22) + 17 && g3.variante === 'amplificado' && estadoAli() === 'desbloqueada' && E().alianzaSel === ALI &&
        raw3.evo.esp.vittata.xp === T(22) + 17 && raw3.v === 2, JSON.stringify(g3));
      check('Modo de prueba documentado: prueba(null) restaura lo de antes', prueba(null) && info('vittata').xp === x3 && estadoAli() === 'bloqueada', JSON.stringify(info('vittata')));

      // 4. Topes de XP
      reset();
      const win = ex => G.emit('v18combate', Object.assign({ tipo: 'win', de: 'jugador', a: 'rival', especie: 'arausiaca', dura: 40, interrupciones: 0, quitadas: 5 }, ex));
      const loss = ex => G.emit('v18combate', Object.assign({ tipo: 'loss', de: 'rival', a: 'jugador', especie: 'arausiaca', dura: 40, interrupciones: 0, quitadas: 2 }, ex));
      const xs = []; for (let i = 0; i < 20; i++) { const a = info('arausiaca').xp; win(); xs.push(info('arausiaca').xp - a); }
      check('20 victorias en un día dan como máximo 160 XP de duelo (40 ×2, luego la mitad)', info('arausiaca').xp === 160 && xs[0] === 40 && xs[1] === 40 && xs[2] === 20 && xs[19] === 0, xs.join(','));
      hoyFijo = 'prueba-2'; let a4 = info('arausiaca').xp;
      loss({ quitadas: 0 }); const l0 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      loss({ dura: 12 }); const l1 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      loss(); const l2 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      G.emit('v18combate', { tipo: 'win', de: 'jugador', duelo: 2, especie: 'arausiaca' }); const d2 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      check('Derrota sin quitar plumas = 0, derrota corta (<20 s) = 0, derrota peleada = 15, duelo de 2 = 0', l0 === 0 && l1 === 0 && l2 === 15 && d2 === 0, [l0, l1, l2, d2].join(','));
      check('Al cambiar de fecha se reinician los topes diarios (la primera victoria vuelve a dar 40)', (win(), info('arausiaca').xp - a4 === 40), info('arausiaca').xp - a4);
      P.desbloquear('arausiaca'); P.seleccionar('arausiaca'); a4 = info('arausiaca').xp;
      for (let i = 0; i < 5; i++) G.emit('v18minigolf', { tipo: 'nido', golpes: 3, nuevo: i === 0 });
      check('Minigolf: 15 por nido (+15 récord), como máximo 3 nidos al día', info('arausiaca').xp - a4 === 60, info('arausiaca').xp - a4);
      { hoyFijo = 'prueba-3'; let t = 0; for (let i = 0; i < 30; i++) { const a = info('arausiaca').xp; win(); G.emit('v18minigolf', { tipo: 'nido', golpes: 2, nuevo: true }); t += info('arausiaca').xp - a; }
        const extra = dar('arausiaca', 500, 'otra', { repetible: true }), extra2 = dar('arausiaca', 50, 'otra', { repetible: true });
        check('Tope global de lo repetible: como máximo 300 XP al día (duelos 160 + minigolf 90 + 50 de otra fuente; luego 0)', t === 250 && extra === 50 && extra2 === 0, [t, extra, extra2].join(',')); }
      const h0 = revisarHitos(true), pre = info('arausiaca').xp; P.cambiarMundo('puente_villa', 'reparado'); const h1 = info('arausiaca').xp; P.cambiarMundo('puente_villa', 'roto'); P.cambiarMundo('puente_villa', 'reparado');
      check('Los hitos no se repiten (el puente paga 120 una vez aunque se vuelva a marcar)', h0 === 0 && h1 - pre === 120 && info('arausiaca').xp === h1 && revisarHitos(true) === 0, [h0, h1 - pre, info('arausiaca').xp - h1].join(','));
      // Ritmo pactado (diseño §3): nivel 10 en la 1.ª sesión, 20 en 2-3 sesiones, 30 tras varias semanas. Sesión simulada con TODAS las
      // fuentes reales (eventos de duelo y minigolf, hitos del progreso V18 y lo que pagan Arco, Muelle, Puerto, Chispa, Moon y Guardián)
      { reset(); mudo = false;
        const quita = k => P.cambiarEvo(e => { delete e.marcas[k]; });
        const duelos = (g, p, ex) => { for (let i = 0; i < g; i++) win(Object.assign({ especie: 'vittata' }, i === 0 ? ex : null)); for (let i = 0; i < p; i++) loss({ especie: 'vittata' }); };
        const nidos = (k, rec) => { for (let i = 0; i < k; i++) G.emit('v18minigolf', { tipo: 'nido', golpes: 3, nuevo: i < rec }); };
        const esp = ids => ids.forEach(id => P.desbloquear(id));
        const ext = (n, fuente) => dar('vittata', n, fuente);
        const ses = [];
        // 1.ª sesión (unos 45 min): la cotorra de Dominica y el de Kawall, 4 materiales y el puente, primera victoria con Vittata,
        // 5 duelos (4 ganados, 1 peleado) y un hoyo de minigolf con 2 nidos
        hoyFijo = 'ritmo-1'; quita('gana:vittata'); P.cambiarEvo(e => { delete e.marcas['esp:arausiaca']; delete e.marcas.puente; });
        esp(['arausiaca', 'kawalli']); ['ritmo_m1', 'ritmo_m2', 'ritmo_m3', 'ritmo_m4'].forEach(k => P.cambiarMundo(k, 'recogida')); P.cambiarMundo('puente_villa', 'reparado');
        revisarHitos(true); duelos(4, 1); nidos(2, 1); P.otorgar('minigolf_villa_completo', 'golf', 1); revisarHitos(true); ses.push(info('vittata').nivel);
        // 2.ª: Sombra y Serpiente, las Atalayas, Chispa y Moon, 3 especies, 6 duelos (el desafío de Eco Protector incluido), victoria perfecta, 3 duelos, oro en minigolf
        hoyFijo = 'ritmo-2'; P.cambiarMundo('sombra_tormenta', 'dispersa'); P.cambiarMundo('serpiente_marana', 'deshecha'); esp(['agilis', 'collaria', 'farinosa']);
        ext(120, 'atalayas'); ext(30, 'chispa'); ext(30, 'moon'); duelos(5, 1, { interrupciones: 2 }); nidos(3, 1);
        P.cambiarMundo('duelos_ganados', 3); P.otorgar('ritmo_perfecta', 'victoria_perfecta', 1); P.otorgar('minigolf_villa_oro', 'golf_oro', 1); revisarHitos(true); ses.push(info('vittata').nivel);
        const ecoS2 = estadoAli(ALI);
        // 3.ª: Sapo, reto de dos cotorras, Puerto y Muelle, Guardián, 3 especies, 6 duelos y 3 nidos
        hoyFijo = 'ritmo-3'; P.cambiarMundo('sapo_encantado', 'despierto'); P.otorgar('reto_dos_cotorras', 'reto_extra', 1); esp(['barbadensis', 'diadema', 'versicolor']);
        ext(150, 'puerto'); ext(100, 'muelle'); ext(30, 'guardian'); duelos(5, 1); nidos(3, 1); revisarHitos(true); ses.push(info('vittata').nivel);
        // Después, sesiones normales: 4 duelos ganados, 1 peleado y 2 nidos (y una especie nueva cada dos sesiones)
        const resto = ['guildingii', 'dufresniana', 'finschi', 'auropalliata', 'xantholora', 'viridigenalis', 'tresmariae', 'brasiliensis', 'leucocephala'];
        let s30 = 0; for (let k = 4; k <= 16; k++) { hoyFijo = 'ritmo-' + k; if (k % 2 && resto.length) esp([resto.shift()]); duelos(4, 1); nidos(2, 0); revisarHitos(true); ses.push(info('vittata').nivel); if (!s30 && info('vittata').nivel >= 30) s30 = k; }
        quitarCarta(); mudo = false;
        check('Ritmo (sesión simulada con todas las fuentes): nivel 10-12 tras la 1.ª sesión, 20 en la 2.ª o la 3.ª (no antes), 30 no antes de la 8.ª sesión',
          ses[0] >= 10 && ses[0] <= 12 && ses[1] < 20 && ses[2] >= 20 && ses[2] <= 24 && (s30 === 0 || s30 >= 8) && ecoS2 === 'desbloqueada', 'niveles por sesión ' + ses.join(' → ') + ' · nivel 30 en la sesión ' + (s30 || '>16') + ' · Eco Protector ' + ecoS2); }
      oye = true;

      // 5. Etapas: ajustar() devuelve los números de cada etapa, sin nivel devuelve el mismo objeto, topes en todas
      const gr = H.get('grito_yunque'), gr0 = gr, A = n => ajustar({ especie: 'vittata', nivel: n }, gr);
      const e1 = A(1), e10 = A(10), e20 = A(20), e25a = ajustar({ especie: 'vittata', nivel: 25, variante: 'amplificado' }, gr);
      check('Etapas: nv 1 = el grito de hoy (mismo objeto); nv 10 = 9 m ±42° 5,5 s; nv 20 = 11 m ±26° onda 22 m/s 6 s y desvía; nv 25 Amplificado = 9 m',
        e1 === gr && e10.alcance === 9 && e10.cono === 0.74 && e10.cooldown === 5.5 && e10.coste === 35 && e20.alcance === 11 && e20.cono === 0.9 && e20.vel === 22 && e20.cooldown === 6 && e20.coste === 40 && e20.desvia && !e10.desvia && e25a.alcance === 9,
        JSON.stringify({ 10: [e10.alcance, e10.cono, e10.cooldown], 20: [e20.alcance, e20.cono, e20.vel, e20.cooldown] }));
      check('Sin f.nivel (IA, duelo de 2, minigolf, amenazas) el motor recibe el mismo objeto; ni básicos ni el poder de otra especie cambian',
        ajustar({ especie: 'vittata' }, gr) === gr && H.ver({ especie: 'vittata' }, gr) === gr && ajustar({ especie: 'agilis', nivel: 9 }, H.get('quiebro')) === H.get('quiebro') && ajustar({ especie: 'agilis', nivel: 30 }, H.get('ala_fuerte')) === H.get('ala_fuerte') && ajustar({ especie: 'agilis', nivel: 30 }, H.get('golpe_ala')) === H.get('golpe_ala') && ajustar({ especie: 'ventralis', nivel: 30 }, gr) === gr);
      const topes = [1, 9, 10, 19, 20, 30, 40].map(n => A(n)).concat([e25a]);
      check('Topes en todas las etapas: espera ≥ 5 s, coste ≥ 35, alcance ≤ 11 m, interrupción ≤ 1,4 s, esquivable (≥ 0,43 s en llegar)',
        topes.every(h => h.cooldown >= 5 && h.coste >= 35 && h.alcance <= 11 && h.interrumpe <= 1.4 && h.alcance / h.vel >= 0.43), topes.map(h => h.alcance + '/' + h.vel).join(' '));
      const es10 = ajustar({ especie: 'arausiaca', nivel: 10 }, H.get('escudo_plumas'));
      check('Arausiaca: Escudo de plumas igual en nv 1; nv 10 dura 3 s; nv 20 recupera 15 de energía al bloquear', ajustar({ especie: 'arausiaca', nivel: 1 }, H.get('escudo_plumas')) === H.get('escudo_plumas') && es10.dura === 3 && es10.cooldown === 7 && paraDuelo('arausiaca').bonusBloqueo === undefined);

      // 6. En el duelo real: cada etapa cambia de verdad el grito (alcance, empuje y precisión MEDIDOS)
      mudo = true;
      const medir = (nivel, dist, ang) => {
        Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel }, dificultad: Cb.CLASICA }); fresco();
        const a = (ang || 0) * Math.PI / 180; quieta(Math.cos(a) * dist, Math.sin(a) * dist); cara(1, 0);
        const i0 = C().stats.intJ, x0 = C().r.pos.x; Cb.usar(C().j, 'grito_yunque');
        correr(1.0, () => { const r = C().r; r.pensar = 99; r.golpeT = 99; r.tiroT = 99; r.poderT = 99; r.esquivaT = 99; });
        return { da: C().stats.intJ > i0, empuje: Math.round((C().r.pos.x - x0) * 100) / 100, mareo: C().r.interrumpida || 0, plumas: C().r.plumas };
      };
      const M = {};
      // (distancia entre las dos; la onda sale 0,5 m por delante del pico y alcanza hasta alcance + 0,6). La Campeona CLASICA:
      // la de la etapa se aparta de un salto al salir del mareo y estropearía la medida del empuje
      for (const n of [1, 10, 20]) M[n] = { 7: medir(n, 7), 9: medir(n, 9), 11: medir(n, 11), 13: medir(n, 13), ang38: medir(n, 6.5, 38), ang30: medir(n, 6.5, 30) };
      const alc = n => [7, 9, 11, 13].filter(d => M[n][d].da).pop() || 0;
      check('Alcance medido: nv 1 acierta a 7 m y no a 9; nv 10 a 9 y no a 11; nv 20 a 11 y no a 13',
        M[1][7].da && !M[1][9].da && M[10][9].da && !M[10][11].da && M[20][11].da && !M[20][13].da, JSON.stringify({ 1: alc(1), 10: alc(10), 20: alc(20) }));
      check('Empuje e interrupción medidos crecen con la etapa (a 7 m) y el grito nunca quita plumas',
        M[1][7].empuje < M[10][7].empuje && M[10][7].empuje < M[20][7].empuje && M[1][7].mareo < M[20][7].mareo && [1, 10, 20].every(n => M[n][7].plumas === 5),
        JSON.stringify({ empuje_m: [M[1][7].empuje, M[10][7].empuje, M[20][7].empuje], mareo_s: [M[1][7].mareo, M[10][7].mareo, M[20][7].mareo] }));
      check('Precisión medida: a 38° de lado solo acierta el Eco Amplificado (cono ancho); a 30°, nv 1 y 10 sí y el Eco Dirigido no (cono estrecho)',
        !M[1].ang38.da && M[10].ang38.da && !M[20].ang38.da && M[1].ang30.da && M[10].ang30.da && !M[20].ang30.da, JSON.stringify({ a38: [M[1].ang38.da, M[10].ang38.da, M[20].ang38.da], a30: [M[1].ang30.da, M[10].ang30.da, M[20].ang30.da] }));
      // Eco Dirigido deshace las semillas rivales dentro del cono; el Amplificado no
      const semilla = nivel => {
        Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel } }); fresco(); quieta(8); cara(1, 0);
        const r = C().r; r.energia = 100; Cb.usar(r, 'semilla'); Cb.paso(0.05);
        const n0 = C().balas.filter(b => b.de === r).length; Cb.usar(C().j, 'grito_yunque');
        return { antes: n0, despues: C().balas.filter(b => b.de === r).length, desvios: C().stats.desvios };
      };
      const sd20 = semilla(20), sd10 = semilla(10);
      check('Eco Dirigido (nv 20) deshace la semilla rival que viene en su cono; con Eco Amplificado sigue volando', sd20.antes === 1 && sd20.despues === 0 && sd20.desvios === 1 && sd10.antes === 1 && sd10.despues === 1, JSON.stringify({ sd20, sd10 }));
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel: 1 } });
      check('Nivel 1 en el duelo: el motor usa el grito de hoy tal cual', H.listo(C().j, 'grito_yunque').h === gr && C().j.nivel === 1);
      Cb.salir(); mudo = false;

      // 7. Subida de nivel jugando: con 370 XP, ganar a la Campeona sube a 10 (aviso, evento y tarjeta); la etapa entra en el siguiente duelo
      reset(); prueba({ especie: 'vittata', xp: 370 }); evs.length = 0; toasts.length = 0;
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); fresco();
      const nvAntes = C().j.nivel, hudNv = document.querySelector('#v18-duelo [data-k="nvN"]');
      C().r.plumas = 1; quieta(1.2); cara(1, 0); Cb.usar(C().j, 'golpe_ala');
      const finXp = document.querySelector('#v18-duelo [data-k="finXp"]');
      check('Ganar a la Campeona con 370 XP: +40 XP y sube a nivel 10 con aviso, evento v18 {tipo:"evo"}, tarjeta «Eco Amplificado» y «+40 XP» en el panel',
        C().resultado === 'win' && info('vittata').nivel === 10 && info('vittata').xp === 410 && toasts.some(t => t === con(TXT.subeV, 10)) && evs.some(e => e.nivel === 10 && e.especie === 'vittata') &&
        !!cartaEl && /Eco Amplificado/.test(cartaEl.textContent) && finXp && /\+40 XP/.test(finXp.textContent) && /10/.test(finXp.textContent), JSON.stringify({ nv: info('vittata'), t: toasts.slice(-3), fin: finXp && finXp.textContent }));
      check('El HUD del duelo muestra «Nv 9 · Grito del Yunque» y la barra de XP; la etapa no cambia a mitad del duelo', nvAntes === 9 && hudNv && hudNv.textContent === 'Nv 9' && C().j.nivel === 9, hudNv && hudNv.textContent);
      C().finT -= 5000; Cb.otraVez(); C().fase = 'lucha';
      check('En el siguiente duelo («Otra vez») ya es Eco Amplificado: 9 m', C().j.nivel === 10 && H.listo(C().j, 'grito_yunque').h.alcance === 9 && document.querySelector('#v18-duelo [data-k="nvE"]').textContent === 'Eco Amplificado');
      Cb.salir(); quitarCarta();

      // 8. Alianza Eco Protector
      reset(); prueba({ especie: 'vittata', nivel: 12 }); revisarAlianza();
      const b1 = estadoAli(); prueba({ especie: 'vittata', nivel: 5 }); P.desbloquear('arausiaca'); revisarAlianza(); const b2 = estadoAli();
      prueba({ especie: 'vittata', nivel: 10 }); revisarAlianza(); const b3 = estadoAli();
      check('Alianza: bloqueada sin la cotorra de Dominica o con Vittata < 10; con las dos → disponible (aviso)', b1 === 'bloqueada' && b2 === 'bloqueada' && b3 === 'disponible', [b1, b2, b3].join(' → '));
      // Desafío en un duelo real: ganar a la Campeona con 1 interrupción no basta; con 2 sí
      const desafio = n => {
        Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); fresco(); cara(1, 0);
        for (let i = 0; i < n; i++) { fresco(); quieta(5); Cb.usar(C().j, 'grito_yunque'); vaciar(); }
        fresco(); C().r.plumas = 1; quieta(1.2); Cb.usar(C().j, 'golpe_ala');
        return { res: C().resultado, intJ: C().stats.intJ, ali: estadoAli() };
      };
      const dsf1 = desafio(1); C().finT -= 5000; const dsf2 = desafio(2);
      check('Desafío: ganar con 1 interrupción no la desbloquea; con 2 sí (tarjeta «¡Nueva alianza!» y queda elegida)', dsf1.res === 'win' && dsf1.ali === 'disponible' && dsf2.res === 'win' && dsf2.intJ === 2 && dsf2.ali === 'desbloqueada' &&
        E().alianzaSel === ALI && !!cartaEl && /Eco Protector/.test(cartaEl.textContent), JSON.stringify({ dsf1, dsf2 }));
      Cb.salir(); quitarCarta(); mudo = true;
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); fresco(); quieta(5); cara(1, 0);
      const ali = document.querySelector('#v18-duelo .vd-ali');
      check('Con la alianza elegida, el duelo trae Eco Protector y su botón', C().j.alianza === ALI && ali && !ali.hidden && ali.textContent === 'Eco Protector');
      podEv.length = 0; const ond0 = C().stats.ondas, int0 = C().stats.intJ;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true, cancelable: true }));
      const tieneH = !!(G.input && G.input.keys && G.input.keys.has('h')); document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'h', code: 'KeyH', bubbles: true }));
      const j8 = C().j, enDesp = j8.energia, escDesp = j8.escudo; vaciar();
      check('Tecla H: lanza la onda (empuja e interrumpe) + escudo de 2 s; −60 energía, recarga 14 s, grito en espera 5 s; la H no llega al juego',
        podEv.some(e => e.id === ALI && e.apoyo === 'arausiaca') && C().stats.ondas > ond0 && C().stats.intJ === int0 + 1 && Math.abs(escDesp - 2) < 1e-6 && Math.abs(enDesp - 40) < 1e-6 &&
        j8.cd.eco_protector === 14 && j8.cd.grito_yunque >= 5 && !H.listo(j8, 'grito_yunque').ok && !tieneH && C().r.plumas === 5, JSON.stringify({ en: enDesp, esc: escDesp, cd: j8.cd, tieneH }));
      check('Apoyo visual de la cotorra de Dominica: retrato y «¡La cotorra de Dominica te cubre!» en el HUD', !document.querySelector('#v18-duelo [data-k="apoyo"]').hidden);
      j8.cd = {}; j8.energia = 100;
      check('Con un escudo ya puesto no sale (no se encadena)', H.listo(j8, ALI).motivo === 'ahora no');
      const r8 = C().r; r8.pos.x = S.pos.x + 1.5; r8.pos.z = S.pos.z; r8.cd = {}; r8.mareo = 0; r8.interrumpida = 0;
      Cb.usar(r8, 'golpe_ala'); const tras1 = { pl: j8.plumas, esc: j8.escudo }; j8.inv = 0; r8.cd = {};
      Cb.usar(r8, 'golpe_ala');
      check('Su escudo para UN golpe normal; el siguiente sí quita pluma', tras1.pl === 5 && tras1.esc === 0 && j8.plumas === 4, JSON.stringify(tras1) + ' → ' + j8.plumas);
      fresco(); j8.cd = {}; Cb.usar(j8, ALI); vaciar(); const poder0 = r8.poder; r8.poder = 'ala_fuerte'; r8.cd = {}; r8.energia = 100; r8.mareo = 0; r8.pos.x = S.pos.x + 1.5; r8.pos.z = S.pos.z;
      Cb.usar(r8, 'ala_fuerte'); r8.poder = poder0;
      check('Ala fuerte rompe su escudo y el golpe entra entero', j8.escudo === 0 && j8.plumas === 4, JSON.stringify({ esc: j8.escudo, pl: j8.plumas }));
      fresco(); j8.cd = {}; Cb.usar(j8, ALI); vaciar(); let tEsc = 0;
      correr(2.5, () => { quieta(9); if (j8.escudo > 0) tEsc += 0.05; j8.inv = 9; });
      check('Duración: el escudo dura 2 s y se va solo (nunca permanente)', j8.escudo === 0 && tEsc >= 1.9 && tEsc <= 2.1, tEsc.toFixed(2));
      j8.energia = 100; correr(11.0, () => { quieta(9); j8.energia = 100; });
      const a13 = H.listo(j8, ALI).ok; correr(1.0, () => { quieta(9); j8.energia = 100; });
      check('Recarga: a los 13,5 s aún no; a los 14,5 s sí', !a13 && H.listo(j8, ALI).ok);
      j8.energia = 50; j8.cd = {};
      check('Coste: con 50 de energía no sale (cuesta 60)', H.listo(j8, ALI).motivo === 'energia');
      j8.energia = 100; podEv.length = 0;
      ali.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      check('El botón (también con el dedo) la lanza igual', podEv.some(e => e.id === ALI));
      // No gana sola: una jugadora que solo machaca la alianza y el grito pierde contra la Campeona
      const spam = { usos: 0, gritos: 0 };
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true, semilla: 11 });
      correr(150, () => { const c = C(), d = H.dirA(c.j, c.r); cara(d.x, d.z); S.pos.x = Cb.sitio.x - 5; S.pos.z = Cb.sitio.z;
        if (H.listo(c.j, ALI).ok) { Cb.usar(c.j, ALI); spam.usos++; } else if (H.listo(c.j, 'grito_yunque').ok) { Cb.usar(c.j, 'grito_yunque'); spam.gritos++; } });
      check('No gana sola: quien solo machaca Eco Protector y el grito pierde contra la Campeona (sin quitarle plumas)', C().resultado === 'loss' && C().r.plumas === 5 && spam.usos >= 1 && spam.gritos + spam.usos >= 2,
        JSON.stringify(Object.assign(spam, { res: C().resultado, plumasRival: C().r.plumas, dura: Math.round(C().tLucha) })));
      Cb.salir();
      // Sin alianza elegida: no hay botón y la H no hace nada (sigue libre para el juego)
      elegirAlianza(false); Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); podEv.length = 0;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true, cancelable: true }));
      const hLibre = !!(G.input && G.input.keys && G.input.keys.has('h')); document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'h', code: 'KeyH', bubbles: true }));
      check('Sin alianza elegida: ni botón ni H (la tecla sigue libre para el juego)', !C().j.alianza && document.querySelector('#v18-duelo .vd-ali').hidden && !podEv.some(e => e.id === ALI), 'H llega a input.js: ' + hLibre);
      Cb.salir(); elegirAlianza(true);

      // 9. Táctil simulado: botón visible, ≥ 56 px, sin tapar el Diario ni los botones grandes
      { Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); const hudEl = document.getElementById('v18-duelo'), eraT = hudEl.classList.contains('tactil'); hudEl.classList.add('tactil');
        const b = hudEl.querySelector('.vd-ali'), rb = b.getBoundingClientRect();
        const choca = ['b-diary', 'b-act', 'b-dash', 'b-jump', 'b-fly', 'b-dive', 'b-menu', 'minimapa'].map(id => document.getElementById(id)).filter(el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
          .filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && !(r.right <= rb.left || r.left >= rb.right || r.bottom <= rb.top || r.top >= rb.bottom); }).map(el => el.id);
        check('Táctil: el botón Eco Protector se ve, mide ≥ 56 px y no tapa el Diario ni los botones grandes', !b.hidden && rb.height >= 56 && rb.width >= 120 && !choca.length, JSON.stringify({ alto: rb.height, ancho: rb.width, choca }));
        if (!eraT) hudEl.classList.remove('tactil'); Cb.salir(); }

      // Mis cotorras: nivel, barra, etapas y fila de alianza
      { P.seleccionar('vittata'); const D = G.v18descubrir; let okM = false, txt = '';
        if (D && D.abrirSeleccion) { D.abrirSeleccion(); const card = G.ui.$('card'); txt = card ? card.textContent : ''; okM = txt.indexOf('Nv ' + info('vittata').nivel) >= 0 && /Eco Amplificado/.test(txt) && /Eco Dirigido/.test(txt) && /Nivel 20/.test(txt) && !!card.querySelector('[data-v18ali]');
          const bA = card.querySelector('[data-v18ali]'); if (bA) bA.click(); okM = okM && E().alianzaSel === null; G.ui.hideCard(); elegirAlianza(true); }
        check('Mis cotorras: nivel, barra de XP, etapas (bloqueadas con «Nivel 20») y la fila de alianza que se activa y desactiva', okM, txt.slice(0, 160)); }

      // ===================== V18.2 producto (bloque B.1): niveles 1–40, las 6 alianzas, XP de cada actividad y migración =====================
      mudo = false; quitarCarta();
      // 11. Curva completa: cada nivel del 1 al 40 empieza justo en T(n); la ficha sabe la XP que falta
      { let ok = true; for (let n = 1; n <= NIVEL_MAX; n++) { if (nivelDe(T(n)) !== n || (n > 1 && nivelDe(T(n) - 1) !== n - 1)) ok = false; }
        reset(); prueba({ especie: 'agilis', xp: T(22) + 5 }); const ia = info('agilis');
        check('Niveles 1–40: cada nivel empieza en T(n); la ficha da nivel 22, «faltan» = T(23) − XP y etapa Guardián', ok && ia.nivel === 22 && ia.falta === T(23) - T(22) - 5 && ia.sig === T(23) && ia.etapa === 'guardian' &&
          info('agilis').alianza === 'viento_cruzado' && prueba({ especie: 'agilis', nivel: 40 }).falta === 0 && info('agilis').sig === null, JSON.stringify(ia)); }
      // 12. Las 34 especies del catálogo base: un poder propio cada una y cuatro etapas medibles (números del motor, con topes)
      { const propios = H.lista().filter(h => !h.basico && !h.alianza && h.especies && h.especies.length), malos = [];
        for (const h of propios) {
          const sp = h.especies[0]; if (sp === 'vittata' || sp === 'arausiaca') continue;
          const m = MEJORA[h.id], k = m && m[0]; if (!m) { malos.push(sp + ': sin tabla'); continue; }
          const v = {}; for (const n of [1, 9, 10, 19, 20, 29, 30, 40]) v[n] = ajustar({ especie: sp, nivel: n }, h);
          const eps = 1e-9, cdOk = v[10].cooldown < h.cooldown && v[20].cooldown < v[10].cooldown && v[30].cooldown < v[20].cooldown && v[40].cooldown === v[30].cooldown && v[19].cooldown === v[10].cooldown && v[30].cooldown >= h.cooldown * 0.85 - eps;
          const kOk = !k || (v[10][k] > h[k] && v[20][k] >= v[10][k] && v[30][k] >= v[20][k] && v[30][k] <= h[k] * m[1] + eps);
          const etOk = v[1] === h && v[9] === h && v[10].coste === h.coste && v[30].coste === h.coste && !v[10].secundaria && v[20].secundaria === h.tecnica && !v[20].maestro && v[30].maestro && v[29].etapa === 'guardian' && v[10].etapa === 'despertar';
          if (!cdOk || !kOk || !etOk) malos.push(sp + (cdOk ? '' : ' espera') + (kOk ? '' : ' ' + k) + (etOk ? '' : ' etapas'));
        }
        const sps = new Set(propios.map(h => h.especies[0]));
        check('Las 34 especies del catálogo base tienen poder propio; en las 32 sin etapas propias, Despertar/Guardián/Maestro mejoran número y espera (con tope, sin bajar el coste) y suman secundaria y destellos',
          propios.length === 34 && sps.size === 34 && !sps.has('martinicana') && !sps.has('violacea') && !malos.length, propios.length + ' poderes · ' + (malos.join(', ') || 'ok')); }
      // 13. Lo que se nota al jugar: la habilidad secundaria de cada técnica (Guardián) y los destellos del Maestro, medidos en el motor
      { const par = (sp, nivel) => {
          const reg = { fx: [], desv: 0 }, yo = H.luchador({ id: 'jugador', especie: sp, nivel, pos: { x: 0, y: 0, z: 0 }, kb: { x: 0, z: 0, t: 0 }, mira: () => ({ x: 1, z: 0 }) });
          const otro = H.luchador({ id: 'rival', especie: 'vittata', ia: true, pos: { x: 4, y: 0, z: 0 }, kb: { x: 0, z: 0, t: 0 }, mov: { x: 0, z: 0, t: 0 } });
          const ctx = { otro, fx: t => reg.fx.push(t), desviar: () => { reg.desv++; return 0; }, despues: (s, fn) => fn(), golpear: () => true, lanzar: () => {}, onda: () => {}, escudo: () => {}, poder: () => {}, sonar: () => {}, apoyo: () => {} };
          yo.cd.golpe_ala = 0.5; const r = H.usar(yo, H.poderDe(sp), ctx); return { r, yo, otro, reg };
        };
        const pico = [10, 20].map(n => par('barbadensis', n).reg.desv), ojos = [10, 20].map(n => par('versicolor', n).otro.marcada || 0);
        const plumas = [10, 20].map(n => par('albifrons', n).yo.inv || 0), alas = [10, 20].map(n => par('agilis', n).yo.cd.golpe_ala);
        const oro = [20, 30].map(n => par('barbadensis', n).reg.fx.filter(t => t === 'gold').length);
        check('Guardián (nv 20): PICO deshace semillas, OJOS marca 1,5 s, PLUMAS desvío 0,4 s, ALAS ala lista; en nv 10 no. Maestro (nv 30): destellos dorados',
          pico[0] === 0 && pico[1] === 1 && ojos[0] === 0 && ojos[1] >= 1.5 && plumas[0] < 0.4 && plumas[1] >= 0.4 && alas[0] > 0 && alas[1] === 0 && oro[0] === 0 && oro[1] >= 1,
          JSON.stringify({ pico, ojos, plumas, alas, oro })); }
      // En el duelo real: el Quiebro de agilis en nv 20 deja el ala lista y va más rápido; en nv 1 es el de siempre
      { const q = nivel => { Cb.iniciar({ sinCuenta: true, especie: 'agilis', evo: { nivel } }); fresco(); quieta(6); cara(1, 0); const j = C().j; j.cd.golpe_ala = 0.5; const l = H.listo(j, 'quiebro'); Cb.usar(j, 'quiebro'); return { ala: j.cd.golpe_ala, vel: l.h && l.h.vel, cd: j.cd.quiebro, nv: j.nivel }; };
        const q1 = q(1), q20 = q(20); Cb.salir();
        check('Duelo real: Quiebro nv 20 = más rápido, menos espera y el ala lista al momento; nv 1 = igual que hoy', q1.vel === 13 && q1.cd === 4 && q1.ala > 0 && q20.vel > 13 && q20.cd < 4 && q20.ala === 0 && q20.nv === 20, JSON.stringify({ q1, q20 })); }
      // 14. Las 6 alianzas: requisitos, desafío, el duelo (coste, recarga, apoyo, efecto, ≤ 1 pluma) y la exploración
      { const res = {}, ondas = () => C().stats.ondas, mias = () => C().balas.filter(b => b.de === C().j).length;
        check('Hay 6 alianzas, cada una con líder y compañera distintas del catálogo base y un elemento distinto (§6, §9)', ALIANZAS.length === 6 && new Set(ALIANZAS.map(a => a.elemento)).size === 6 &&
          new Set(ALIANZAS.map(a => a.lider)).size === 6 && ALIANZAS.every(a => H.get(a.id) && H.get(a.id).alianza && a.lider !== a.apoyo && H.poderDe(a.lider) && H.poderDe(a.apoyo)), ALIANZAS.map(a => a.id).join(','));
        for (const a of ALIANZAS) {
          const R = res[a.id] = {};
          reset(); P.desbloquear(a.lider); P.seleccionar(a.lider); prueba({ especie: a.lider, nivel: 12 }); revisarAlianza(); R.sinApoyo = estadoAli(a.id);
          prueba({ especie: a.lider, nivel: 9 }); P.desbloquear(a.apoyo); revisarAlianza(); R.nv9 = estadoAli(a.id);
          prueba({ especie: a.lider, nivel: 10 }); revisarAlianza(); R.nv10 = estadoAli(a.id);
          const reto = a.reto === 'interrupciones' ? 'interrupciones' : 'poderJ';
          win({ especie: a.lider, [reto]: 1 }); R.reto1 = estadoAli(a.id); win({ especie: a.lider === 'arausiaca' ? 'vittata' : 'arausiaca', [reto]: 5 }); R.otra = estadoAli(a.id);
          win({ especie: a.lider, [reto]: 2 }); R.reto2 = estadoAli(a.id); R.sel = E().alianzaSel === a.id && paraDuelo(a.lider).alianza === a.id && !paraDuelo(a.apoyo).alianza;
          const h = H.get(a.id); R.datos = h.coste === 60 && h.cooldown === 14 && h.dura <= 2 && h.bloquea !== 0;
          // Duelo real con la rival a 2 m delante
          mudo = true; Cb.iniciar({ sinCuenta: true, especie: a.lider, evo: { nivel: 10, alianza: a.id } }); fresco(); quieta(2); cara(1, 0); podEv.length = 0;
          const j = C().j, o0 = ondas(), b0 = mias(), u = Cb.usar(j, a.id), b1 = mias(), escudo = j.escudo, inv = j.inv;
          const ap = document.querySelector('#v18-duelo [data-k="apoyo"]'), img = ap && ap.querySelector('img');
          R.duelo = !!u.ok && j.alianza === a.id && Math.abs(j.energia - 40) < 1e-6 && j.cd[a.id] === 14 && (j.cd[j.poder] || 0) >= 5 && !H.listo(j, j.poder).ok && ap && !ap.hidden && img && img.src.indexOf(a.apoyo + '.png') >= 0 &&
            podEv.some(e => e.id === a.id && e.apoyo === a.apoyo);
          vaciar(); const r = C().r;
          R.efecto = ({ eco_protector: () => Math.abs(escudo - 2) < 1e-6 && ondas() > o0, lluvia_guiada: () => r.marcada > 0 && b1 - b0 === 3, viento_cruzado: () => inv >= 0.6 - 1e-6 && r.plumas === 4,
            destello_piton: () => r.deslumbrada > 0 && r.lenta >= 2 - 1e-6, marea_lluvia: () => Math.abs(escudo - 2) < 1e-6 && b1 - b0 === 1, rafaga_volcan: () => ondas() > o0 })[a.id]();
          R.plumas = r.plumas; R.unaPluma = r.plumas >= 4;
          j.cd = {}; j.energia = 50; j.escudo = 0; R.coste = H.listo(j, a.id).motivo === 'energia';
          Cb.salir(); mudo = false;
          // Explorando: con la líder elegida y la alianza activada, su poder trae la ayuda de la compañera; con la compañera, no
          const ex0 = ultimaExplora; G.emit('v18poder', { id: H.poderDe(a.lider), de: 'jugador', explorando: true, origen: { x: S.pos.x, y: S.pos.y, z: S.pos.z } }); R.explora = ultimaExplora !== ex0 && ultimaExplora.id === a.id && ultimaExplora.apoyo === a.apoyo;
          P.seleccionar(a.apoyo); const ex1 = ultimaExplora; G.emit('v18poder', { id: H.poderDe(a.apoyo), de: 'jugador', explorando: true }); R.exploraOtra = ultimaExplora === ex1;
          R.ok = R.sinApoyo === 'bloqueada' && R.nv9 === 'bloqueada' && R.nv10 === 'disponible' && R.reto1 === 'disponible' && R.otra === 'disponible' && R.reto2 === 'desbloqueada' && R.sel && R.datos && R.duelo && R.efecto && R.unaPluma && R.coste && R.explora && R.exploraOtra;
        }
        quitarCarta();
        for (const a of ALIANZAS) { const R = res[a.id]; check('Alianza ' + a.nombre + ' (' + a.lider + ' + ' + a.apoyo + '): requisitos → disponible, desafío → desbloqueada, en el duelo coste 60, recarga 14 s, apoyo con retrato, su efecto y ≤ 1 pluma; explorando, la ayuda de la compañera', R.ok, JSON.stringify(R)); } }
      // 15. XP de cada actividad que ya existe (hitos de una vez + repetibles con tope) y los módulos que llaman a G.v18evo.dar
      { reset(); mudo = true; const pend = []; const tiene = (key, xp) => { const h = hitos().find(x => x[0] === key); if (!h || h[1] !== xp) pend.push(key + '=' + (h ? h[1] : 'no')); };
        P.cambiarMundo('puente_villa', 'reparado'); tiene('puente', 120); P.cambiarMundo('sombra_tormenta', 'dispersa'); tiene('sombra', 80);
        P.cambiarMundo('serpiente_marana', 'deshecha'); tiene('serpiente', 60); P.cambiarMundo('sapo_encantado', 'despierto'); tiene('sapo', 60);
        P.otorgar('reto_dos_cotorras', 'reto_extra', 1); tiene('reto_dos', 60); P.otorgar('minigolf_villa_completo', 'golf', 1); tiene('golf_completo', 30);
        P.otorgar('minigolf_villa_oro', 'golf_oro', 1); tiene('golf_oro', 30); P.otorgar('perfecta_t', 'victoria_perfecta', 1); tiene('perfecta', 30);
        P.cambiarMundo('duelos_ganados', 3); tiene('tres_duelos', 40); P.cambiarMundo('piedra_1', 'recogida'); tiene('mat:piedra_1', 5);
        P.desbloquear('collaria'); tiene('esp:collaria', 30); P.otorgar('duelo_gana_agilis', 'victoria_agilis', 1); tiene('gana:agilis', 60);
        const debe = hitos().filter(x => !E().marcas[x[0]]).reduce((s2, x) => s2 + x[1], 0), pago = revisarHitos(true), otra = revisarHitos(true);
        const mods = []; for (const [k, M] of [['chispa', G.v18chispa], ['moon', G.v18moon], ['guardian', G.v18guardian]]) {
          if (!M || !M.pagarXP || !M.ID) { mods.push(k + ': sin cargar'); continue; }
          const a = info('vittata').xp; P.cambiarMundo(M.ID, { ganadas: 1, victorias: 1, vueltas: 1 }); const n = M.pagarXP(), n2 = M.pagarXP(); mods.push(k + ' ' + n + '/' + n2 + ' Δ' + (info('vittata').xp - a));
          if (!(n > 0 && n2 === 0 && info('vittata').xp - a === n)) pend.push(k); }
        const d1 = dar('vittata', 30, 'puerto');
        mudo = false;
        check('XP de cada actividad: puente 120, Sombra 80, Serpiente 60, Sapo 60, reto de dos 60, minigolf (hoyo 30, oro 30), victoria perfecta 30, 3 duelos 40, material 5, especie 30, victoria con especie 60; se cobran una vez; Chispa, Moon y Guardián pagan con dar() una sola vez',
          !pend.length && pago === debe && debe >= 120 + 80 + 60 + 60 + 60 + 30 + 30 + 30 + 40 + 5 + 30 + 60 && otra === 0 && d1 === 30, (pend.join(',') || 'ok') + ' · pago ' + pago + '/' + debe + ' · ' + mods.join(' · ')); }
      // 16. Migración: una partida del prototipo (v2 con solo Eco Protector) y una v1 cargan sin perder nada; recargar conserva todo
      { const proto = { v: 2, especies: { arausiaca: 'seleccionable' }, inv: { pluma_rival: 1 }, otorgados: { combate_1: true }, mundo: { puente_villa: 'reparado' }, sel: 'vittata',
          evo: { esp: { vittata: { xp: T(12) + 3, nivel: 12, mejoras: { eco_amplificado: true }, variante: null } }, alianzas: { eco_protector: 'desbloqueada' }, alianzaSel: 'eco_protector', marcas: { puente: true, desafio_eco: true, 'esp:arausiaca': true }, dia: { fecha: 'x', por: { total: 5 } }, retro: true } };
        localStorage.setItem(P.clave(), JSON.stringify(proto)); P.recargar(); mudo = true;
        const e = E(), rh = revisarHitos(true);
        const okP = info('vittata').nivel === 12 && info('vittata').xp === T(12) + 3 && e.alianzas.eco_protector === 'desbloqueada' && e.alianzaSel === 'eco_protector' && paraDuelo('vittata').alianza === 'eco_protector' &&
          ALI_IDS.filter(id => id !== ALI).every(id => e.alianzas[id] === 'bloqueada') && e.marcas.puente && e.esp.vittata.mejoras.eco_amplificado && e.esp.vittata.mejoras.despertar && rh === 0 && P.cuantos('pluma_rival') === 1;
        prueba({ especie: 'finschi', nivel: 31, alianza: 'rafaga_volcan' }); P.recargar();
        const okR = info('finschi').nivel === 31 && estadoAli('rafaga_volcan') === 'desbloqueada' && E().alianzaSel === 'rafaga_volcan' && info('vittata').nivel === 12 && JSON.parse(localStorage.getItem(P.clave())).v === 2;
        localStorage.setItem(P.clave(), JSON.stringify({ v: 1, especies: { agilis: 'seleccionable' }, inv: {}, otorgados: {}, mundo: {}, sel: 'agilis' })); P.recargar();
        const okV1 = P.seleccionada() === 'agilis' && info('agilis').nivel === 1 && ALI_IDS.every(id => estadoAli(id) === 'bloqueada') && !paraDuelo('agilis').alianza;
        mudo = false;
        check('Migración: la partida del prototipo (Eco Protector, nivel 12, hitos cobrados) carga igual y suma las 5 alianzas nuevas bloqueadas; recargar conserva nivel y alianza; una v1 empieza en nivel 1 sin alianzas',
          okP && okR && okV1, JSON.stringify({ okP, okR, okV1, rh, evo: E().alianzas })); }
      // 17. Ficha (Mis cotorras): nivel, XP que falta, etapa, lo que mejora y la alianza, también para una especie que no es Vittata
      { reset(); P.desbloquear('agilis'); P.seleccionar('agilis'); prueba({ especie: 'agilis', nivel: 22 }); const f = document.createElement('div'); f.innerHTML = htmlFicha('agilis'); const t = f.textContent;
        const x = document.createElement('div'); x.innerHTML = htmlExtra(); const tx = x.textContent;
        check('Ficha de agilis nv 22: «Nv 22 · Guardián», «Faltan … XP», «Velocidad +24 %», «Espera −12 %», la secundaria de ALAS, las etapas y «Viento Cruzado · Líder»; la fila de alianza dice cómo conseguirla',
          /Nv 22/.test(t) && /Guardián/.test(t) && /Faltan \d+ XP para el nivel 23/.test(t) && /Velocidad \+24 %/.test(t) && /Espera −12 %/.test(t) && t.indexOf(TXT.sec_alas) >= 0 && /Maestro · Nivel 30/.test(t) && /Viento Cruzado · Líder · Bloqueada/.test(t) &&
          /Viento Cruzado/.test(tx) && tx.indexOf(TXT.aliReqG) >= 0 && lineaHud({ especie: 'agilis', nivel: 22, poder: 'quiebro' }).etapa === 'Guardián', t.slice(0, 260) + ' | ' + tx.slice(0, 120)); }
      // 18. Avisos al jugar (no solo en la ficha): tarjeta de nivel en cada subida, «+N XP» pequeña al ganar XP explorando,
      // una tarjeta grande no la pisa una pequeña y, con el cómic encima, la tarjeta espera a que se cierre
      { reset(); quitarCarta(); prueba({ especie: 'vittata', xp: T(11) - 10 }); dar('vittata', 30, 'prueba');
        const t1 = cartaEl ? cartaEl.textContent : '', grande1 = !!cartaEl && !cartaEl.classList.contains('mini');
        quitarCarta(); dar('vittata', 5, 'prueba'); const t2 = cartaEl ? cartaEl.textContent : '', mini2 = !!cartaEl && cartaEl.classList.contains('mini');
        quitarCarta(); carta(TXT.etapa, 'Eco Amplificado', 'x'); dar('vittata', 5, 'prueba'); const sigue = !!cartaEl && !cartaEl.classList.contains('mini') && /Eco Amplificado/.test(cartaEl.textContent);
        quitarCarta(); const cm = document.getElementById('comic'), cmH = cm ? cm.hidden : true; let espera = null, sale = null;
        if (cm) { cm.hidden = false; prueba({ especie: 'vittata', xp: T(13) - 1 }); dar('vittata', 3, 'prueba'); espera = !cartaEl; cm.hidden = cmH; await new Promise(r => setTimeout(r, 900)); sale = !!cartaEl && /Nv 13/.test(cartaEl.textContent); }
        quitarCarta(); const fx0 = toasts.length; dar('vittata', 5, 'duelo', { duelo: true, repetible: true }); const duelSinMini = !cartaEl && toasts.length === fx0;
        check('Avisos al jugar: cada subida de nivel trae su tarjeta («¡Subiste de nivel!», Vittata, Nv 11, lo que falta); la XP explorando sale en una tarjeta pequeña; una grande no la pisa una pequeña; con el cómic abierto espera; la XP del duelo va en su panel',
          grande1 && /Subiste de nivel/.test(t1) && /Vittata/.test(t1) && /Nv 11/.test(t1) && /Faltan \d+ XP para el nivel 12/.test(t1) && mini2 && /\+5 XP/.test(t2) && sigue && (cm ? espera && sale : true) && duelSinMini,
          JSON.stringify({ t1: t1.slice(0, 80), t2: t2.slice(0, 60), sigue, espera, sale, duelSinMini })); quitarCarta(); }
      // 19. El reto de cada alianza, claro en Mis cotorras (lo que falta, con nombres) y en el panel de fin del duelo
      { reset(); P.desbloquear('arausiaca'); P.desbloquear('barbadensis'); P.seleccionar('vittata'); prueba({ especie: 'vittata', nivel: 10 }); revisarAlianza(); quitarCarta();
        const box = document.createElement('div'); box.innerHTML = htmlAlianzas();
        const fEco = box.querySelector('[data-v18ali-fila="eco_protector"]'), fLl = box.querySelector('[data-v18ali-fila="lluvia_guiada"]'), fVi = box.querySelector('[data-v18ali-fila="viento_cruzado"]');
        const ll = aliDe('lluvia_guiada'), retoLl = retoTexto(ll);
        const okLista = fEco && fEco.getAttribute('data-estado') === 'disponible' && fEco.textContent.indexOf(retoTexto(aliDe(ALI))) >= 0 && /Vittata interrumpiéndola 2 veces/.test(fEco.textContent) &&
          fLl && fLl.getAttribute('data-estado') === 'bloqueada' && fLl.textContent.indexOf(con(TXT.reqApoyo, nombre('xantholora'))) >= 0 && fLl.textContent.indexOf(con(con(TXT.reqLider, nombre('barbadensis')), 1)) >= 0 && fLl.textContent.indexOf(retoLl) >= 0 &&
          retoLl.indexOf(nombre('barbadensis')) >= 0 && retoLl.indexOf(nombrePoder('barbadensis')) >= 0 && nombrePoder('barbadensis').length > 2 && !fVi && box.textContent.indexOf(con(TXT.aliPorDesc, 4)) >= 0 && !box.querySelector('img[src*="vittata"]');
        let okCard = true; const D = G.v18descubrir;
        if (D && D.abrirSeleccion) { D.abrirSeleccion(); const card = G.ui.$('card'); okCard = !!card.querySelector('[data-v18alianzas]') && !!card.querySelector('[data-v18reto="eco_protector"]'); G.ui.hideCard(); }
        win({ especie: 'vittata', interrupciones: 1 }); const fin1 = htmlFin(); win({ especie: 'vittata', interrupciones: 2 }); const fin2 = htmlFin(); quitarCarta();
        check('Mis cotorras: cada alianza conocida dice su estado y qué falta (líder en nivel 10, compañera en tu bandada) y su reto con la líder y su poder por su nombre; las que no conoces solo se cuentan; el panel de fin del duelo dice cómo va el reto',
          okLista && okCard && fin1.indexOf(con(con(TXT.retoFin, 'Eco Protector'), 1)) >= 0 && fin2.indexOf(con(TXT.retoFinLogrado, 'Eco Protector')) >= 0 && estadoAli(ALI) === 'desbloqueada',
          JSON.stringify({ okLista: !!okLista, okCard, fin1: fin1.replace(/<[^>]+>/g, ' ').slice(0, 90), fin2: fin2.replace(/<[^>]+>/g, ' ').slice(0, 90), lista: box.textContent.slice(0, 200) })); }
      // Los textos nuevos tienen su inglés en content/cap1/en.js (el traductor los busca tal cual)
      {
        const EN = window.AV_EN || {}, faltan = [];
        const todos = Object.values(TXT).concat(ALIANZAS.map(a => a.nombre), ALIANZAS.map(a => a.frase), ALIANZAS.map(a => a.explora), ETAPAS.map(e => e.nombre), ETAPAS.map(e => e.frase), ETAPAS_ESP.map(e => e.nombre));
        for (const s of todos) if (s !== TXT.prueba && !EN[s]) faltan.push(s);
        check('Textos de la evolución y las alianzas con inglés (content/cap1/en.js)', !window.AV_EN || !faltan.length, window.AV_EN ? (faltan.slice(0, 6).join(' | ') || 'ok') : 'AV_EN sin cargar (solo se carga en EN)'); }
      P.seleccionar('vittata');

      // Equilibrio con la Campeona (DIFICULTAD de combate.js): una jugadora automática «media», de ritmo de niño (una acción
      // cada 0,6 s como mucho, reacciona tarde, deja pasar ocasiones, apunta con error y a veces se aparta de una semilla),
      // juega N duelos por etapa (nv 1, 10, 20 y 30) contra la Campeona de su etapa. Todo con semilla: mismo resultado siempre.
      if (o.equilibrio !== false) {
        mudo = true; const res = medirEquilibrio({ n: o.n || 36, dificultad: o.dificultad }); mudo = false;
        const pcts = ETAPAS_EQ.map(n => res['nv' + n].pct), ok = pcts.every(x => x >= 55 && x <= 75);
        check('Equilibrio: la jugadora media gana entre el 55 y el 75 % de los duelos en cada etapa (Aprendiz, Despertar, Guardián y Maestro)', ok, JSON.stringify(res));
        check('Primera victoria posible en el nivel 1: la jugadora media gana alguno de sus 3 primeros duelos en el nivel 1', res.nv1.primera > 0 && res.nv1.primera <= 3, 'primera victoria en el duelo ' + res.nv1.primera);
        check('La Campeona sube con la etapa: piensa antes y usa más su poder en Maestro que en Aprendiz (sin tocar lo que quita cada golpe)',
          Cb.DIFICULTAD[3].pensar < Cb.DIFICULTAD[0].pensar && Cb.DIFICULTAD[3].poder > Cb.DIFICULTAD[0].poder && Cb.DIFICULTAD.every(d => d.plumas >= 3 && d.plumas <= 5), JSON.stringify(Cb.DIFICULTAD.map(d => d.id + ':' + d.pensar + '/' + d.poder + '/' + d.plumas)));
      }
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    mudo = false; oye = false; hoyFijo = null; quitarCarta();
    try { Cb.salir(); } catch (e) { /* ya fuera */ }
    G.ui.toast = toast0;
    Object.assign(S.pos, pos0); S.facing = fac0;
    for (const k of Object.keys(S.inv)) if (!(k in inv0)) delete S.inv[k];
    Object.assign(S.inv, inv0); try { if (G.objetos && G.objetos.renderInv) G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    P.recargar(); void sel0;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18evo = { T, nivelDe, NIVEL_MAX, XP, TOPE, ETAPAS, TOPES_GRITO, info, etapaDe, paraDuelo, ajustar, lineaHud, htmlFin, htmlFicha, htmlExtra, enlazar,
    dar, revisarHitos, revisarAlianza, desbloquearAlianza, elegirAlianza, elegirVariante, estadoAlianza: estadoAli, prueba, carta, test,
    ALIANZAS, ETAPAS_ESP, MEJORA, etapaIdx, mejoraDe, textoApoyo, explorando, ultimaExplora: () => ultimaExplora };
  return G.v18evo;
};

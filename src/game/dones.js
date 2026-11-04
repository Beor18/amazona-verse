/* Amazona Verse · dones de familia (CG-10, paso 1).
   Seis familias por geografía (PROPUESTA_PODERES_SECRETOS_BANDADAS.md §A.2 y §A.3).
   Los ejes son de fantasía: ±1 paso, suma cero, velocidad como mucho ±3 %.
   En Retos y duelos valen 1, salvo el modo «Con dones». El don activo es el paso 2 (CG-11).
   CG-16: un don con mentora solo se activa después de su escena. Hoy solo Iguaca (Llamada).
   Otra mentora entra en MENTORAS o en pack.mentoras, sin archivo content/epN/dones.js.
   Lilacina (ojo) y Oratrix (ráfaga) no están: las decide Kelvin.
   Lo carga src/engine/fisica.js. API: G.dones = { familia, ejes, paso, mult, conDones, mentoras, mirar, test }. */
(function () {
  'use strict';
  const FAMILIAS = {
    islenas:      { nombre: 'Isleñas',            vel: 0,  giro: 0,  aguante: 0,  vista: 0,  sigilo: 0 },
    montaneras:   { nombre: 'Montañeras',         vel: -1, giro: -1, aguante: 2,  vista: 0,  sigilo: 0 },
    norte:        { nombre: 'Del norte',          vel: 1,  giro: 1,  aguante: -1, vista: 0,  sigilo: -1 },
    cordilleranas:{ nombre: 'Cordilleranas',      vel: 0,  giro: -1, aguante: 1,  vista: 1,  sigilo: -1 },
    gran_rio:     { nombre: 'Del gran río',       vel: 1,  giro: 0,  aguante: 0,  vista: -1, sigilo: 0 },
    bosque_sur:   { nombre: 'Del bosque del sur', vel: -1, giro: 0,  aguante: -1, vista: 1,  sigilo: 1 }
  };
  const DE = {
    vittata: 'islenas', ventralis: 'islenas', leucocephala: 'islenas', agilis: 'islenas', collaria: 'islenas', barbadensis: 'islenas',
    imperialis: 'montaneras', arausiaca: 'montaneras', guildingii: 'montaneras', versicolor: 'montaneras', martinicana: 'montaneras', violacea: 'montaneras',
    finschi: 'norte', oratrix: 'norte', tresmariae: 'norte', viridigenalis: 'norte', xantholora: 'norte', albifrons: 'norte',
    auropalliata: 'cordilleranas', guatemalae: 'cordilleranas', autumnalis: 'cordilleranas', lilacina: 'cordilleranas', mercenarius: 'cordilleranas',
    diadema: 'gran_rio', kawalli: 'gran_rio', festiva: 'gran_rio', dufresniana: 'gran_rio', ochrocephala: 'gran_rio', amazonica: 'gran_rio', farinosa: 'gran_rio',
    rhodocorytha: 'bosque_sur', vinacea: 'bosque_sur', brasiliensis: 'bosque_sur', pretrei: 'bosque_sur', tucumana: 'bosque_sur', aestiva: 'bosque_sur'
  };
  const CEROS = FAMILIAS.islenas;
  // 1 paso. Aguante: trepar ×1,05 y planeo ×0,90 (pierde menos altura).
  const PASO = { velocidad: 1.03, giro: 1.06, trepar: 1.05, planeo: 0.90, vista: 1.15, sigilo: 0.8 };

  window.AVDones = function (G) {
    if (G.dones) return G.dones;
    let conDonesFam = null, forzar = null;
    const enReto = () => document.body.classList.contains('retos-on') || document.body.classList.contains('duelo-on')
      || !!(G.retosApi && G.retosApi.activo);
    function especie() {
      const p = G.S && G.S.profile, look = p && p.look;
      return (look && look.species) || (p && p.species) || 'vittata';
    }
    function idFamilia() {
      if (enReto()) return conDonesFam || 'islenas';
      if (forzar) return forzar;
      return DE[especie()] || 'islenas';
    }
    function ficha() { return FAMILIAS[idFamilia()] || CEROS; }
    function paso(eje) {
      const f = ficha();
      if (eje === 'velocidad') return f.vel;
      if (eje === 'giro') return f.giro;
      if (eje === 'aguante' || eje === 'trepar' || eje === 'planeo') return f.aguante;
      if (eje === 'vista') return f.vista;
      if (eje === 'sigilo') return f.sigilo;
      return 0;
    }
    function mult(eje) {
      const n = paso(eje), k = PASO[eje] || (eje === 'aguante' ? PASO.trepar : 1);
      let m = Math.pow(k, n);
      // Rebufo de la Llamada: ×1,08 de crucero mientras dura. El tope ×1,15 lo pone fisica.js.
      if (eje === 'velocidad' && don && don.id === 'llamada' && performance.now() < don.fin) m *= 1.08;
      // Rasante de río: ×1,25 de crucero a menos de 1,5 m del agua. El nado ×1,3 lo lee factorAgua.
      if (eje === 'velocidad' && don && don.id === 'rasante' && performance.now() < don.fin && cercaAgua()) m *= 1.25;
      return m;
    }
    function cercaAgua() {
      if (!G.agua || !G.S || !G.agua.levelAt) return false;
      const w = G.agua.levelAt(G.S.pos.x, G.S.pos.z);
      return w > -Infinity && Math.abs(G.S.pos.y - w) <= 1.5;
    }
    function factorAgua() {
      const on = activo() === 'rasante' && cercaAgua();
      const nado = on && G.fisica && G.fisica.MOVE && G.fisica.MOVE.swimming;
      return { crucero: on ? 1.25 : 1, nado: nado ? 1.3 : 1 };
    }
    const REGALO = {
      islenas: { id: 'llamada', es: 'Vittata llama a la bandada.', en: 'Vittata calls the flock.', dura: 8, espera: 40 },
      cordilleranas: { id: 'ojo', es: 'Vittata ve desde la cumbre.', en: 'Vittata sees from the summit.', dura: 6, espera: 30 },
      norte: { id: 'rafaga', es: 'Fantasía: el impulso se encadena.', en: 'Fantasy: the dash chains.', dura: 5, espera: 25 },
      montaneras: { id: 'columna', es: 'Fantasía: sube una columna de nube.', en: 'Fantasy: a cloud column rises.', dura: 6, espera: 30 },
      gran_rio: { id: 'rasante', es: 'Fantasía: el río te lleva a ras.', en: 'Fantasy: the river carries you low.', dura: 8, espera: 30 },
      bosque_sur: { id: 'plumas', es: 'Fantasía: las hojas te envuelven.', en: 'Fantasy: leaves wrap around you.', dura: 10, espera: 35 }
    };
    // Mentoras que ya se pueden jugar. Otra entra aquí o en pack.mentoras:
    // { id, don, es: [{ who, text }], en: [{ who, text }], aviso: { es, en }, cabe: () => bool }.
    // Kelvin 4-nov (24c, «todas ✅»): voces de las mentoras de docs/equipo/PROPUESTA_MENTORAS_24C.md (Iguaca con iniciativa; cada una con su voz).
    function posOk(x, z) {
      const S = G.S;
      if (!S || !S.pos || !S.profile || !S.profile.created || S.event) return false;
      const M = G.fisica && G.fisica.MOVE;
      if (!M || M.flying || M.swimming) return false;
      const dx = S.pos.x - x, dz = S.pos.z - z;
      return dx * dx + dz * dz <= 36;
    }
    function mapa56() {
      const q = location.search || '';
      const pequeno = /[?&]mapa=pequeno(&|$)/.test(q), forzar = /[?&]mapa=real(&|$)/.test(q);
      return ((!pequeno) || forzar) && !!(window.AVE && window.AVE.mundoReal && window.AV_MAPA_CAP1);
    }
    function sitio(cap, fill, mapa) {
      let real = !!(window.AVE && window.AVE.mundoReal);
      if (cap === 'ep3' || cap === 'ep4') real = real && !!window.AV_MAPA_CAP1;
      if (cap === 'ep5' || cap === 'ep6') real = mapa56();
      return real ? mapa : fill;
    }
    const cabeEn = (cap, fill, mapa) => () => G.pack && G.pack.id === cap && posOk(sitio(cap, fill, mapa).x, sitio(cap, fill, mapa).z);
    const MENTORAS = [
      {
        id: 'iguaca', don: 'llamada',
        es: [
          { who: 'Iguaca', text: "¡Por fin llegas! No me mires así: hoy no vuelas sola. ¿Tienes voz o solo plumas?" },
          { who: 'Vittata', text: "¿Y si llamo y nadie viene?" },
          { who: 'Iguaca', text: "Vendrán. Yo ya les avisé. Mantén el impulso y grita como si fuera tu cumpleaños." }
        ],
        en: [
          { who: 'Iguaca', text: "Finally! Don't look at me like that: today you don't fly alone. Got a voice, or just feathers?" },
          { who: 'Vittata', text: "What if I call and nobody comes?" },
          { who: 'Iguaca', text: "They'll come. I already told them. Hold the dash and shout like it's your birthday." }
        ],
        aviso: { es: 'Nuevo don: Llamada de la bandada. Mantén Impulso.', en: 'New gift: Flock Call. Hold Dash.' },
        cabe() {
          const S = G.S;
          if (!G.pack || G.pack.id !== 'cap1' || !S || !S.refuge || S.refuge.parcel !== 'B' || S.refuge.damaged || S.event) return false;
          if (!S.profile || !S.profile.created || !S.pos) return false;
          const M = G.fisica && G.fisica.MOVE;
          if (!M || M.flying || M.swimming) return false;
          const dx = S.pos.x - S.refuge.x, dz = S.pos.z - S.refuge.z;
          return dx * dx + dz * dz <= 64;
        }
      },
      {
        id: 'vinacea', don: 'plumas',
        es: [
          { who: 'Vinacea', text: "Shhh… ¿Oyes eso? Nada. Así suena alguien bien escondido." },
          { who: 'Vittata', text: "¿Y cuánto tiempo me quedo quieta?" },
          { who: 'Vinacea', text: "Hasta que una hoja te confunda con su hermana." }
        ],
        en: [
          { who: 'Vinacea', text: "Shhh… Hear that? Nothing. That's what a good hider sounds like." },
          { who: 'Vittata', text: "How long do I stay still?" },
          { who: 'Vinacea', text: "Until a leaf thinks you're its sister." }
        ],
        aviso: { es: 'Nuevo don: Plumas de hoja. Mantén Impulso.', en: 'New gift: Leaf Feathers. Hold Dash.' },
        cabe: cabeEn('ep2', { x: -5, z: -18 }, { x: -11, z: 53 })
      },
      {
        id: 'festiva', don: 'rasante',
        es: [
          { who: 'Festiva', text: "¡Carrera hasta la piedra grande! El último invita a mangos. ¡Ja, ja!" },
          { who: 'Vittata', text: "¡Pero tú vuelas pegada al agua! ¿Cómo no te mojas?" },
          { who: 'Festiva', text: "¡Sí me mojo! Esa es la gracia. Bájate y no sueltes el impulso." }
        ],
        en: [
          { who: 'Festiva', text: "Race you to the big rock! Last one buys the mangoes. Ha!" },
          { who: 'Vittata', text: "But you fly right on the water! How don't you get wet?" },
          { who: 'Festiva', text: "I do get wet! That's the fun. Go low and don't let go of the dash." }
        ],
        aviso: { es: 'Nuevo don: Rasante de río. Mantén Impulso.', en: 'New gift: River Skim. Hold Dash.' },
        cabe: cabeEn('ep3', { x: 7.6, z: 16.4 }, { x: 195.6, z: 204.4 })
      },
      {
        id: 'oratrix', don: 'rafaga',
        es: [
          { who: 'Oratrix', text: "¡Silencio, público! Lo que vas a ver no lo hace cualquier cotorra." },
          { who: 'Vittata', text: "¿Y yo puedo?" },
          { who: 'Oratrix', text: "Con talento como el mío, no. Pero inténtalo: sostén el impulso… y aplaudiré. Quizás." }
        ],
        en: [
          { who: 'Oratrix', text: "Quiet, audience! What you're about to see, not just any parrot can do." },
          { who: 'Vittata', text: "Can I do it?" },
          { who: 'Oratrix', text: "With talent like mine? No. But try: hold the dash… and I'll clap. Maybe." }
        ],
        aviso: { es: 'Nuevo don: Ráfaga doble. Mantén Impulso.', en: 'New gift: Double Gust. Hold Dash.' },
        cabe: cabeEn('ep4', { x: 12, z: 0 }, { x: 205, z: 160 })
      },
      {
        id: 'lilacina', don: 'ojo',
        es: [
          { who: 'Lilacina', text: "¿Qué ves desde aquí arriba? ¿Y qué no ves?" },
          { who: 'Vittata', text: "Veo árboles… muchos árboles." },
          { who: 'Lilacina', text: "¿Y si sostienes el impulso un ratito? ¿Seguirán siendo solo árboles?" }
        ],
        en: [
          { who: 'Lilacina', text: "What do you see from up here? And what don't you see?" },
          { who: 'Vittata', text: "I see trees… lots of trees." },
          { who: 'Lilacina', text: "And if you hold the dash a little? Will they still be just trees?" }
        ],
        aviso: { es: 'Nuevo don: Ojo de cumbre. Mantén Impulso.', en: 'New gift: Summit Eye. Hold Dash.' },
        cabe: cabeEn('ep5', { x: 0, z: 2 }, { x: -63, z: -146 })
      },
      {
        id: 'versicolor', don: 'columna',
        es: [
          { who: 'Versicolor', text: "Esa nube parece un pichón dormido… ay, perdona. ¿Qué te decía?" },
          { who: 'Vittata', text: "¡Que el aire sube!" },
          { who: 'Versicolor', text: "¡Eso! Entra en la nube, sostén el impulso y déjate subir. Salúdame al pichón." }
        ],
        en: [
          { who: 'Versicolor', text: "That cloud looks like a sleeping chick… oh, sorry. What was I saying?" },
          { who: 'Vittata', text: "That the air goes up!" },
          { who: 'Versicolor', text: "Right! Fly into the cloud, hold the dash and let it lift you. Say hi to the chick for me." }
        ],
        aviso: { es: 'Nuevo don: Columna de nube. Mantén Impulso.', en: 'New gift: Cloud Column. Hold Dash.' },
        cabe: cabeEn('ep6', { x: -20, z: -20 }, { x: -40, z: -117 })
      }
    ];
    const enCurso = new Set();
    function aprendidos() {
      const S = G.S;
      if (!S) return [];
      if (!Array.isArray(S.dones)) S.dones = [];
      return S.dones;
    }
    function sabe(id) { return aprendidos().includes(id); }
    function mentoras() {
      const extra = (G.pack && G.pack.mentoras) || [];
      return MENTORAS.concat(extra).filter(m => m && m.lista !== false && m.don && typeof m.cabe === 'function');
    }
    function mentoraDe(donId) { return mentoras().find(m => m.don === donId) || null; }
    function puede(r) {
      if (!r) return false;
      if (forzar || conDonesFam) return true;
      const m = mentoraDe(r.id);
      if (!m) return true;
      return sabe(r.id);
    }
    function enAhora() {
      return document.documentElement.lang === 'en' || !!(G.idioma && G.idioma.activo && G.idioma.activo());
    }
    function aprender(id) {
      const a = aprendidos();
      if (a.includes(id)) return false;
      a.push(id);
      if (G.guardado && G.guardado.autosave) G.guardado.autosave();
      return true;
    }
    function estiloMentora() {
      if (document.getElementById('don-mentora-css')) return;
      const st = document.createElement('style');
      st.id = 'don-mentora-css';
      st.textContent = '#toast.don-aprender,:root:is(.a11y-t1,.a11y-t2) #toast.don-aprender{top:calc(env(safe-area-inset-top,0px) + 12px);bottom:auto;left:0;right:0;margin-inline:auto;max-width:min(343px,calc(100vw - 32px));font-size:max(16px,calc(16px * var(--fs-k,1)));line-height:1.25;cursor:pointer}' +
        '@media (max-width:560px){#toast.don-aprender{top:calc(env(safe-area-inset-top,0px) + 12px);bottom:auto;left:0;right:0;margin-inline:auto;max-width:min(343px,calc(100vw - 32px))}}' +
        '#b-dash.don-latido{animation:don-latido .9s ease-out 1}' +
        '@keyframes don-latido{0%{box-shadow:0 0 0 3px rgba(255,208,120,.95)}100%{box-shadow:0 0 0 18px rgba(255,208,120,0)}}' +
        '@media (prefers-reduced-motion:reduce){#b-dash.don-latido{animation:none;outline:3px solid rgba(255,208,120,.95)}}';
      document.head.appendChild(st);
      const t = document.getElementById('toast');
      if (t) t.addEventListener('click', () => {
        if (!t.classList.contains('don-aprender')) return;
        t.classList.remove('don-aprender');
        if (G.ui && G.ui.hideToast) G.ui.hideToast();
      });
    }
    function avisoAprender(texto) {
      estiloMentora();
      const t = document.getElementById('toast');
      if (G.ui && G.ui.toast) G.ui.toast(texto, 3000);
      if (t) t.classList.add('don-aprender');
      const b = document.getElementById('b-dash');
      if (b) {
        b.classList.remove('don-latido');
        void b.offsetWidth;
        b.classList.add('don-latido');
        setTimeout(() => b.classList.remove('don-latido'), 1000);
      }
      setTimeout(() => { if (t) t.classList.remove('don-aprender'); }, 3200);
    }
    function ofrecer(m) {
      if (!G.dialogo || !G.dialogo.say) return false;
      enCurso.add(m.id);
      const en = enAhora();
      const src = (en && m.en) || m.es || [];
      const lineas = src.map(l => ({ who: l.who, text: l.text, lang: en ? 'en' : '' }));
      G.dialogo.say(lineas, () => {
        enCurso.delete(m.id);
        if (!aprender(m.don)) return;
        const a = m.aviso || {};
        avisoAprender(en ? (a.en || a.es || '') : (a.es || ''));
      }, { libre: true });
      return true;
    }
    function mirar() {
      if (G.quiet || enReto() || conDonesFam || forzar) return false;
      if (!G.dialogo || !G.dialogo.activo || G.dialogo.activo()) return false;
      if (G.ui && (G.ui.cardOpen || (G.ui.overlayOpen && G.ui.overlayOpen()))) return false;
      for (const m of mentoras()) {
        if (sabe(m.don)) { enCurso.delete(m.id); continue; }
        if (enCurso.has(m.id)) continue;
        if (!m.cabe()) continue;
        return ofrecer(m);
      }
      return false;
    }
    function soltarEscenas() { enCurso.clear(); }
    let don = null, sostenido = 0, rafagaCd = null, columna = null, gotas = 0, hojas = 0, cargas = null;
    function soltarSostener() {
      if (!sostenido) return;
      const ms = performance.now() - sostenido;
      sostenido = 0;
      if (ms >= 600) activar();
    }
    function sostener(on) { if (on) sostenido = performance.now(); else soltarSostener(); }
    function activar() {
      if (enReto() && !conDonesFam) return false;
      // «Con dones»: una carga por partida. No se recarga al terminar la espera.
      if (conDonesFam && cargas === 0) return false;
      const ahora = performance.now();
      if (don && ahora < don.listo) return false;
      const r = REGALO[idFamilia()];
      if (!r || !puede(r)) return false;
      const avisoEl = document.getElementById('toast');
      if (avisoEl) avisoEl.classList.remove('don-aprender');
      const una = conDonesFam && cargas != null;
      don = { id: r.id, fin: ahora + r.dura * 1000, listo: una ? Infinity : ahora + (r.dura + r.espera) * 1000 };
      if (una) cargas = 0;
      if (r.id === 'llamada') G.emit('canto');
      if (r.id === 'ojo' && G.fx && G.fx.ringFx && G.S && G.S.pos) G.fx.ringFx(G.S.pos.x, G.S.pos.y + 1, G.S.pos.z, 12, 1.4, 0.85);
      if (r.id === 'rafaga' && G.fisica && G.fisica.TUNING) {
        rafagaCd = G.fisica.TUNING.dashCooldown;
        G.fisica.TUNING.dashCooldown = 0.25;
        if (G.fisica.MOVE) G.fisica.MOVE.airDash = true;
      }
      if (r.id === 'columna' && G.S) columna = { x: G.S.pos.x, y: G.S.pos.y, z: G.S.pos.z };
      const en = document.documentElement.lang === 'en';
      if (G.ui && G.ui.toast) G.ui.toast(en ? r.en : r.es, 2200);
      return true;
    }
    function activo() { return don && performance.now() < don.fin ? don.id : null; }
    function nuevaPartida() { cargas = 1; don = null; sostenido = 0; cerrarRafaga(); columna = null; return true; }
    function soltarDon() { don = null; sostenido = 0; cerrarRafaga(); columna = null; }
    function cerrarRafaga() {
      if (rafagaCd == null || !G.fisica || !G.fisica.TUNING) return;
      G.fisica.TUNING.dashCooldown = rafagaCd;
      rafagaCd = null;
    }
    function pasoDon() {
      const id = activo();
      if (id === 'rafaga' && G.fisica && G.fisica.MOVE) G.fisica.MOVE.airDash = true;
      else if (rafagaCd != null) cerrarRafaga();
      if (id === 'columna' && columna && G.S) {
        const dx = G.S.pos.x - columna.x, dz = G.S.pos.z - columna.z;
        if (dx * dx + dz * dz <= 36) G.S.vy = Math.max(G.S.vy || 0, 6);
        if (G.fx && G.fx.burst && performance.now() > (columna.humo || 0)) {
          columna.humo = performance.now() + 220;
          G.fx.burst(columna.x, (G.S.pos.y || 0) + 0.4, columna.z, 'bubbles', 3);
        }
      } else if (id !== 'columna') columna = null;
      if (id === 'rasante' && cercaAgua() && G.agua && G.agua.spray && G.S && performance.now() > gotas) {
        gotas = performance.now() + 180;
        G.agua.spray(G.S.pos.x, G.agua.levelAt(G.S.pos.x, G.S.pos.z), G.S.pos.z);
      }
      // Hojas alrededor: no se toca el material de Vittata. La fauna no recibe un susto.
      if (id === 'plumas' && G.fx && G.fx.burst && G.S && performance.now() > hojas) {
        hojas = performance.now() + 350;
        G.fx.burst(G.S.pos.x, (G.S.pos.y || 0) + 0.8, G.S.pos.z, 'leaves', 8);
      }
    }
    function pintarBoton() {
      const b = document.getElementById('b-dash');
      if (!b) return;
      const ahora = performance.now();
      let p = 0;
      if (sostenido) p = Math.min(1, (ahora - sostenido) / 600);
      else if (don && ahora < don.listo) p = Math.max(0, (don.listo - ahora) / ((don.listo - don.fin) || 1));
      b.style.outline = p > 0.02 ? '3px solid rgba(255, 208, 120, ' + (0.35 + 0.6 * Math.min(1, p)).toFixed(2) + ')' : '';
    }
    G.on('update', () => { pasoDon(); pintarBoton(); mirar(); }, 80);
    G.on('apply', () => { soltarEscenas(); }, 46);
    // Vuelta de prueba: crucero, giros, planeo que hay que recuperar, vista y sigilo.
    // Los pesos dejan a las 6 familias dentro de ±1,5 % de la media (CG-10).
    function tiempo(id) {
      const antes = forzar;
      forzar = id;
      const vel = mult('velocidad'), giro = mult('giro'), climb = mult('trepar'), sink = mult('planeo'), vista = mult('vista'), sig = mult('sigilo');
      forzar = antes;
      return 30 / vel + 15 / giro + 5 * (sink / climb) + 5 / vista + 5 * sig;
    }
    function test() {
      const P = G.pruebas, out = [];
      const check = (nombre, ok, extra) => out.push({ name: nombre, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const clase0 = document.body.classList.contains('retos-on');
      const forz0 = forzar, con0 = conDonesFam;
      try {
        const ids = Object.keys(FAMILIAS);
        check('Hay 6 familias y 36 especies', ids.length === 6 && Object.keys(DE).length === 36, Object.keys(DE).length + ' especies');
        ids.forEach(id => {
          const f = FAMILIAS[id];
          const suma = f.vel + f.giro + f.aguante + f.vista + f.sigilo;
          check(f.nombre + ' suma cero', suma === 0, String(suma));
          check(f.nombre + ' no pasa de ±2 pasos', [f.vel, f.giro, f.aguante, f.vista, f.sigilo].every(n => n >= -2 && n <= 2));
        });
        check('La velocidad no pasa de ±3 %', ids.every(id => { forzar = id; const m = mult('velocidad'); return m >= 0.97 - 1e-9 && m <= 1.03 + 1e-9; }));
        forzar = null;
        const cat = window.AV_ESPECIES;
        const lista = cat ? (cat.especies || []).concat(cat.extintas || []) : null;
        if (lista) {
          const faltan = lista.filter(e => !DE[e.id]).map(e => e.id);
          const sobran = Object.keys(DE).filter(id => !lista.some(e => e.id === id));
          check('Cada especie del catálogo tiene familia', !faltan.length && !sobran.length, faltan.concat(sobran).join(', '));
        } else check('Hay catálogo de especies', false, 'sin AV_ESPECIES');
        forzar = 'islenas';
        check('Vittata es Isleña: ejes en 1', DE.vittata === 'islenas' && mult('velocidad') === 1 && mult('giro') === 1 && mult('trepar') === 1);
        forzar = null;
        document.body.classList.add('retos-on');
        forzar = 'norte';
        check('En Retos los ejes valen 1', mult('velocidad') === 1 && mult('giro') === 1 && mult('sigilo') === 1, String(mult('velocidad')));
        conDonesFam = 'norte';
        check('Con dones, Del norte va a ×1,03', Math.abs(mult('velocidad') - 1.03) < 1e-9, String(mult('velocidad')));
        conDonesFam = null; forzar = null;
        document.body.classList.remove('retos-on');
        don = null;
        forzar = 'islenas';
        let cantos = 0;
        G.on('canto', () => { cantos++; });
        check('Mantener Impulso activa la Llamada de la bandada', activar() === true && activo() === 'llamada' && cantos >= 1, activo() || 'sin don');
        check('Mientras recarga no vuelve a activarse', activar() === false);
        don = null;
        forzar = 'cordilleranas';
        check('Ojo de cumbre se activa en las Cordilleranas', activar() === true && activo() === 'ojo', activo() || 'sin don');
        don = null;
        forzar = 'norte';
        const cd0 = G.fisica && G.fisica.TUNING ? G.fisica.TUNING.dashCooldown : null;
        G.fisica.MOVE.airDash = false;
        check('Ráfaga doble: el impulso espera 0,25 s y el del aire se recarga', cd0 != null && activar() === true && activo() === 'rafaga' && G.fisica.TUNING.dashCooldown === 0.25 && G.fisica.MOVE.airDash === true, String(G.fisica.TUNING.dashCooldown));
        don.fin = performance.now() - 1;
        pasoDon();
        check('Al acabar la ráfaga, la espera del impulso vuelve', G.fisica.TUNING.dashCooldown === cd0 && rafagaCd == null, String(G.fisica.TUNING.dashCooldown));
        don = null;
        forzar = 'montaneras';
        const vy0 = G.S.vy, x0 = G.S.pos.x;
        check('Columna de nube: sale bajo la cotorra', activar() === true && activo() === 'columna' && columna && Math.hypot(columna.x - x0, columna.z - G.S.pos.z) < 0.01, activo() || 'sin don');
        G.S.vy = 0; pasoDon();
        check('Dentro de 6 m la columna sube con fuerza 6', G.S.vy >= 6, String(G.S.vy));
        G.S.pos.x = x0 + 10; G.S.vy = 0; pasoDon();
        check('Fuera de la columna no empuja', G.S.vy === 0, String(G.S.vy));
        G.S.pos.x = x0; G.S.vy = vy0;
        don = null; forzar = null; columna = null;
        forzar = 'gran_rio';
        const pos0 = { x: G.S.pos.x, y: G.S.pos.y, z: G.S.pos.z }, nad0 = G.fisica.MOVE.swimming;
        let mojado = null;
        if (G.agua && G.terreno) {
          const H = G.terreno.height;
          for (let x = -80; x <= 240 && !mojado; x += 20) for (let z = -80; z <= 240 && !mojado; z += 20) {
            const lv = G.agua.levelAt(x, z);
            if (lv > -Infinity && lv >= H(x, z) - 0.2) mojado = { x, z, w: lv };
          }
        }
        check('Rasante de río: hay agua para probarlo', !!mojado, mojado ? mojado.x + ',' + mojado.z : 'sin agua');
        if (mojado) {
          G.S.pos.x = mojado.x; G.S.pos.y = mojado.w + 0.4; G.S.pos.z = mojado.z;
          const base = mult('velocidad');
          check('A ras del agua el crucero sube ×1,25', activar() === true && activo() === 'rasante' && cercaAgua() && Math.abs(mult('velocidad') - base * 1.25) < 1e-9, String(mult('velocidad')));
          let sprays = 0; const spray0 = G.agua.spray;
          G.agua.spray = () => { sprays++; };
          try { pasoDon(); } finally { G.agua.spray = spray0; }
          check('A ras del agua deja estela', sprays >= 1, String(sprays));
          G.fisica.MOVE.swimming = true;
          check('Al bucear el nado vale ×1,3', factorAgua().nado === 1.3, String(factorAgua().nado));
          G.fisica.MOVE.swimming = nad0;
          G.S.pos.y = mojado.w + 8;
          check('Lejos del agua el crucero no cambia', !cercaAgua() && Math.abs(mult('velocidad') - base) < 1e-9, String(mult('velocidad')));
        }
        G.S.pos.x = pos0.x; G.S.pos.y = pos0.y; G.S.pos.z = pos0.z;
        don = null;
        forzar = 'bosque_sur';
        let hojasN = 0;
        const burst0 = G.fx && G.fx.burst;
        if (burst0) G.fx.burst = function (x, y, z, kind, n) { if (kind === 'leaves') hojasN++; return burst0.apply(this, arguments); };
        check('Plumas de hoja: un remolino, sin tocar a Vittata', activar() === true && activo() === 'plumas' && REGALO.bosque_sur.dura === 10 && REGALO.bosque_sur.espera === 35, activo() || 'sin don');
        try { pasoDon(); } finally { if (burst0) G.fx.burst = burst0; }
        check('Salen hojas y no se avisa a la fauna', hojasN >= 1, String(hojasN));
        don = null; forzar = null;
        const en = document.documentElement.lang === 'en';
        check('El aviso tiene frase en español y en inglés', ['islenas', 'cordilleranas', 'norte', 'montaneras', 'gran_rio', 'bosque_sur'].every(id => REGALO[id].es && REGALO[id].en) && (en ? REGALO.bosque_sur.en : REGALO.bosque_sur.es).length > 8);
        const refugio0 = G.S.refuge, evento0 = G.S.event, posM = { x: G.S.pos.x, y: G.S.pos.y, z: G.S.pos.z };
        const packId0 = G.pack && G.pack.id;
        const dones0 = Array.isArray(G.S.dones) ? G.S.dones.slice() : [];
        const quiet0 = G.quiet, fly0 = G.fisica.MOVE.flying, swim0 = G.fisica.MOVE.swimming;
        const look0 = G.S.profile && G.S.profile.look;
        const creado0 = !!(G.S.profile && G.S.profile.created);
        const especiePerfil0 = G.S.profile && G.S.profile.species;
        const auto0 = G.guardado && G.guardado.autosave;
        const capas = ['end', 'comic', 'creator'].map(id => { const n = document.getElementById(id); return n ? { n, hidden: n.hidden } : null; });
        try {
          if (G.guardado) G.guardado.autosave = () => {};
          if (!G.S.profile) G.S.profile = { created: true, name: 'Aprendiz', look: { species: 'vittata' } };
          G.S.profile.created = true;
          G.S.profile.species = 'vittata';
          G.S.profile.look = Object.assign({}, look0, { species: 'vittata' });
          capas.forEach(c => { if (c) c.n.hidden = true; });
          if (G.ui && G.ui.cardOpen && G.ui.hideCard) G.ui.hideCard();
          G.S.dones = dones0.filter(id => id !== 'llamada');
          forzar = null; conDonesFam = null; don = null;
          document.body.classList.remove('retos-on');
          check('Sin la escena de Iguaca la Llamada no se activa', idFamilia() === 'islenas' && activar() === false && !activo(), activo() || 'parada');
          const listaM = mentoras();
          check('En el capítulo 1 solo Iguaca enseña; las otras cinco esperan su capítulo', listaM.length === 6 && listaM[0].id === 'iguaca' && listaM[0].don === 'llamada' && ['vinacea', 'festiva', 'oratrix', 'lilacina', 'versicolor'].every(id => listaM.some(m => m.id === id)) && listaM.filter(m => m.id !== 'iguaca').every(m => !m.cabe()));
          const iguaca = listaM[0];
          check('Las tres líneas caben en un globo y el aviso trae inglés', iguaca.es.length === 3 && iguaca.en.length === 3 && iguaca.es.every(l => l.text.length < 100) && iguaca.en.every(l => l.text.length < 100) && iguaca.aviso.en === 'New gift: Flock Call. Hold Dash.');
          check('La partida guarda los dones aprendidos', !!(G.guardado && G.guardado.KEYS && G.guardado.KEYS.includes('dones')) && Array.isArray(G.guardado.freshState().dones));
          G.quiet = false; G.fisica.MOVE.flying = false; G.fisica.MOVE.swimming = false;
          G.S.event = null;
          G.S.refuge = { parcel: 'B', x: G.S.pos.x + 40, z: G.S.pos.z, damaged: false };
          if (G.dialogo && G.dialogo.clear) G.dialogo.clear();
          soltarEscenas();
          check('Lejos de la colina Iguaca no habla', mirar() === false && !(G.dialogo && G.dialogo.activo && G.dialogo.activo()));
          G.S.refuge = { parcel: 'B', x: G.S.pos.x, z: G.S.pos.z, damaged: false };
          const empezo = mirar() === true && G.dialogo && G.dialogo.libre && !!G.dialogo.libre() && G.dialogo.actual().who === 'Iguaca' && G.dialogo.actual().text.length < 100;
          check('En el refugio de la colina Iguaca enseña la Llamada', empezo, G.dialogo && G.dialogo.actual() ? G.dialogo.actual().who + ': ' + G.dialogo.actual().text : 'sin diálogo');
          if (empezo) G.dialogo.next();
          check('Vittata contesta y el globo sigue libre', empezo && G.dialogo.actual() && G.dialogo.actual().who === 'Vittata' && G.dialogo.actual().libre === true && G.dialogo.actual().text.length < 100, G.dialogo && G.dialogo.actual() ? G.dialogo.actual().text : '');
          if (empezo) G.dialogo.next();
          const tt = document.getElementById('toast'), dash = document.getElementById('b-dash');
          check('Al aprender sale el aviso y Impulso late una vez', sabe('llamada') && tt && !tt.hidden && tt.classList.contains('don-aprender') && /Llamada de la bandada|Flock Call/.test(tt.textContent) && dash && dash.classList.contains('don-latido'), tt ? tt.textContent : 'sin aviso');
          don = null;
          check('Con la Llamada aprendida, mantener Impulso la activa', activar() === true && activo() === 'llamada', activo() || 'sin don');
          don = null;
          const pack0 = G.pack.id;
          G.pack.id = 'ep4';
          const ora = sitio('ep4', { x: 12, z: 0 }, { x: 205, z: 160 });
          G.S.dones = (G.S.dones || []).filter(id => id !== 'rafaga');
          G.S.pos.x = ora.x; G.S.pos.z = ora.z;
          G.S.event = null; G.quiet = false; G.fisica.MOVE.flying = false; G.fisica.MOVE.swimming = false;
          if (G.dialogo && G.dialogo.clear) G.dialogo.clear();
          soltarEscenas();
          const oraOk = mirar() === true && G.dialogo && G.dialogo.actual && G.dialogo.actual() && G.dialogo.actual().who === 'Oratrix';
          check('En su capítulo, Oratrix enseña la Ráfaga doble', oraOk, G.dialogo && G.dialogo.actual && G.dialogo.actual() ? G.dialogo.actual().who : 'sin diálogo');
          if (oraOk) { G.dialogo.next(); G.dialogo.next(); }
          check('Al aprender la ráfaga sale su aviso', sabe('rafaga') && /Ráfaga doble|Double Gust/.test((document.getElementById('toast') || {}).textContent || ''), (document.getElementById('toast') || {}).textContent || '');
          G.pack.id = pack0;
        } finally {
          if (G.guardado && auto0) G.guardado.autosave = auto0;
          G.S.refuge = refugio0; G.S.event = evento0;
          G.S.pos.x = posM.x; G.S.pos.y = posM.y; G.S.pos.z = posM.z;
          if (G.pack && packId0) G.pack.id = packId0;
          G.S.dones = dones0;
          G.quiet = quiet0; G.fisica.MOVE.flying = fly0; G.fisica.MOVE.swimming = swim0;
          if (G.S.profile) {
            G.S.profile.look = look0 || null;
            G.S.profile.created = creado0;
            if (especiePerfil0 === undefined) delete G.S.profile.species; else G.S.profile.species = especiePerfil0;
          }
          if (clase0) document.body.classList.add('retos-on');
          capas.forEach(c => { if (c) c.n.hidden = c.hidden; });
          soltarEscenas();
          if (G.dialogo && G.dialogo.clear) G.dialogo.clear();
          const tt = document.getElementById('toast');
          if (tt) tt.classList.remove('don-aprender');
          const dash = document.getElementById('b-dash');
          if (dash) dash.classList.remove('don-latido');
          don = null;
        }
        const tiempos = ids.map(tiempo);
        const media = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        const peor = Math.max(...tiempos.map(t => Math.abs(t / media - 1)));
        check('Cada familia queda a ±1,5 % del tiempo medio de la vuelta', peor <= 0.015, (peor * 100).toFixed(2) + ' %');
      } catch (e) {
        check('La prueba corre sin excepciones', false, String(e && e.stack || e).slice(0, 300));
      } finally {
        forzar = forz0; conDonesFam = con0; don = null; sostenido = 0; cerrarRafaga();
        if (!clase0) document.body.classList.remove('retos-on');
      }
      const passed = out.filter(o => o.ok).length;
      return { ok: passed === out.length, passed, total: out.length, results: out };
    }
    const api = G.dones = {
      familias: FAMILIAS, de: DE, familia: idFamilia, ejes: ficha, paso, mult, tiempo,
      conDones(id) { conDonesFam = id && FAMILIAS[id] ? id : null; if (!conDonesFam) cargas = null; return api; },
      forzar(id) { forzar = id || null; return api; },
      nuevaPartida, soltarDon, sostener, activar,
      activo, mentoras, mirar, soltarEscenas,
      test
    };
    const exponer = n => {
      const AV = window.AV;
      if (AV && AV.G === G) {
        if (!AV.donesTest) AV.donesTest = () => test();
        if (!AV.cg17Test) AV.cg17Test = o => (G.retosApi ? Promise.resolve(G.retosApi.cg17Test(o)) : G.AVE.assets.script('src/game/retos.js').then(() => window.AVRetos(G).cg17Test(o)));
      }
      else if (n > 0) setTimeout(() => exponer(n - 1), 200);
    };
    exponer(40);
    return api;
  };
})();

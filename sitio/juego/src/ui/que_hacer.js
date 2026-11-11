/* CG-120 · «¿Qué hay para hacer?» en la Pausa y en la portada.
   Cada fila dice el estado y tiene Ir. Ir reutiliza elegir / lanzar18 / llevar de menu_modos.js.
   La casa del bohío está encendida (CG-126). El piloto sigue con bandera. */
(function () {
  'use strict';
  window.AVQueHacer = function (G) {
    if (G.queHacer) return G.queHacer;
    const $ = id => document.getElementById(id);
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const puente = () => !!(G.v18 && G.v18.mundo && G.v18.mundo('puente_villa') === 'reparado');
    const tactil = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const patrulla = () => {
      const e = G.invasoras && G.invasoras.estado && G.invasoras.estado();
      const n = e && e.vistos ? e.vistos.length : 0;
      return L('Patrulla ' + n + '/4', 'Patrol ' + n + '/4');
    };
    const listo = () => L('Listo', 'Ready');
    function irModo(modo) {
      cerrar();
      const pausa = $('pause');
      if (pausa && pausa.hidePopover) { try { pausa.hidePopover(); } catch (e) { /* ya cerrada */ } }
      if (G.menuModos && G.menuModos.elegir) return G.menuModos.elegir(modo);
      return false;
    }
    function irLlevar(x, z) {
      cerrar();
      const pausa = $('pause');
      if (pausa && pausa.hidePopover) { try { pausa.hidePopover(); } catch (e) { /* ya cerrada */ } }
      if (G.menuModos && G.menuModos.llevar) G.menuModos.llevar(x, z);
    }
    const filas = () => [
      { id: 'aventura', nombre: L('Aventura', 'Adventure'), estado: listo, puede: () => true, ir: () => irModo('aventura') },
      { id: 'golf', nombre: L('Minigolf', 'Mini golf'), estado: listo, puede: () => true, ir: () => irModo('golf') },
      { id: 'pesca', nombre: L('Pesca', 'Fishing'), estado: listo, puede: () => G.PESCA !== false, ir: () => irModo('pesca') },
      { id: 'duelo', nombre: L('Duelo', 'Duel'), estado: listo, puede: () => true, ir: () => irModo('duelo') },
      { id: 'duelo2', nombre: L('Duelo de 2', '2-player duel'), estado: () => tactil() ? L('Solo en computadora', 'Computer only') : listo(), puede: () => !tactil(), ir: () => irModo('duelo2') },
      { id: 'chispa', nombre: L('Carrera con Chispa', 'Race with Chispa'), estado: listo, puede: () => true, ir: () => irModo('chispa') },
      { id: 'moon', nombre: L('Entrenamiento con Moon', 'Training with Moon'), estado: listo, puede: () => true, ir: () => irModo('moon') },
      { id: 'guardian', nombre: L('Circuito del Primer Vuelo', 'First Flight Circuit'), estado: listo, puede: () => true, ir: () => irModo('guardian') },
      { id: 'tuerca', nombre: L('Tuerca, en Puerto de La Mina', 'Tuerca, at Puerto de La Mina'), estado: () => puente() ? listo() : L('Se abre al reparar el puente', 'Opens when the bridge is repaired'), puede: () => puente(), ir: () => irLlevar(73.6, -75.2) },
      { id: 'patrulla', nombre: L('Patrulla', 'Patrol'), estado: patrulla, puede: () => true, ir: () => irLlevar(150, 170) },
      { id: 'familia', nombre: L('Aventuras en familia', 'Family adventures'), estado: listo, puede: () => true, ir: () => abrirFamilia() },
      { id: 'cotorras', nombre: L('Mis cotorras', 'My parrots'), estado: listo, puede: () => true, ir: () => irModo('cotorras') },
      { id: 'casa', nombre: L('Casa del bohío', 'Bohio house'), estado: listo, puede: () => true, ir: () => irCasa() },
      { id: 'piloto', nombre: L('Escuela de vuelo', 'Flight school'), estado: () => G.piloto === false ? L('Apagada', 'Off') : listo(), puede: () => G.piloto !== false, ir: () => irPiloto() },
      { id: 'taller', nombre: L('Taller de Tuerca', "Tuerca's workshop"), estado: () => G.interioresOn === false ? L('Apagado', 'Off') : listo(), puede: () => G.interioresOn !== false, ir: () => irTaller() },
      { id: 'construir', nombre: L('Construir', 'Build'), estado: listo, puede: () => !!(G.construir && G.construir.empezar), ir: () => { cerrar(); if (G.construir) G.construir.empezar(); } },
      { id: 'mercadito', nombre: L('Mercadito', 'Market'), estado: listo, puede: () => !!(G.tienda && G.tienda.abrir), ir: () => { cerrar(); if (G.tienda) G.tienda.abrir('que-hacer'); } }
    ];
    function irPiloto() {
      cerrar();
      const ir = () => {
        const p = G.v18piloto && G.v18piloto.sitio && G.v18piloto.sitio();
        if (p && p.puente) irLlevar(p.puente.x, p.puente.z);
        if (G.v18piloto && G.v18piloto.empezar) G.v18piloto.empezar();
      };
      if (G.v18piloto && G.v18piloto.empezar) return ir();
      if (window.AV && AV.pilotoCargar) return AV.pilotoCargar().then(ir);
      return false;
    }
    function irTaller() {
      const ed = G.tallerTuerca && G.tallerTuerca.ED;
      const p = ed && ed.puerta ? ed.puerta : { x: -61.27, z: 85.6 };
      irLlevar(p.x, p.z);
    }
    function irCasa() {
      const ir = d => { if (d) irLlevar(d.x, d.z); };
      if (G.bohios && G.bohios.donde) return ir(G.bohios.donde());
      if (window.AV && AV.bohios) return AV.bohios().then(b => b && b.donde && ir(b.donde()));
      return false;
    }
    function abrirFamilia() {
      cerrar();
      if (G.familiaAventuras && G.familiaAventuras.abrir) return G.familiaAventuras.abrir();
      if (window.AVE && AVE.assets && AVE.assets.script) {
        return AVE.assets.script('src/game/familia_aventuras.js').then(() => window.AVFamiliaAventuras && window.AVFamiliaAventuras(G).abrir());
      }
      return false;
    }
    let dlg = $('que-hacer');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'que-hacer';
      dlg.setAttribute('aria-labelledby', 'que-hacer-t');
      document.body.appendChild(dlg);
    }
    function pintar() {
      const t = L('¿Qué hay para hacer?', 'What is there to do?');
      const b1 = $('b-que-hacer'), b2 = $('b-que-hacer-title');
      if (b1) b1.textContent = t;
      if (b2) b2.textContent = t;
      dlg.innerHTML = '<h2 id="que-hacer-t">' + t + '</h2><ul class="qh-lista"></ul><div class="qh-pie"><button type="button" class="btn ghost qh-cerrar">' + L('Cerrar', 'Close') + '</button></div>';
      const ul = dlg.querySelector('.qh-lista');
      for (const f of filas()) {
        if (f.id === 'construir' && !(G.construir && G.construir.empezar) && !G.queHacerPrueba) continue;
        if (f.id === 'mercadito' && !(G.tienda && G.tienda.abrir) && !G.queHacerPrueba) continue;
        const li = document.createElement('li');
        li.className = 'qh-fila';
        li.dataset.qh = f.id;
        const puede = !!f.puede();
        li.innerHTML = '<span class="qh-txt"><b></b><small></small></span>';
        li.querySelector('b').textContent = f.nombre;
        li.querySelector('small').textContent = f.estado();
        const ir = document.createElement('button');
        ir.type = 'button';
        ir.className = 'btn qh-ir';
        ir.textContent = L('Ir', 'Go');
        ir.disabled = !puede;
        ir.addEventListener('click', () => { if (puede) f.ir(); });
        li.appendChild(ir);
        ul.appendChild(li);
      }
      dlg.querySelector('.qh-cerrar').addEventListener('click', cerrar);
    }
    function abrir() { pintar(); if (!dlg.open) dlg.showModal(); const ir = dlg.querySelector('.qh-ir:not([disabled])'); if (ir) ir.focus(); }
    function cerrar() { if (dlg.open) dlg.close(); }
    function enganchar(id) {
      const b = $(id); if (!b || b.dataset.qhListo) return;
      b.dataset.qhListo = '1';
      b.addEventListener('click', ev => { ev.preventDefault(); abrir(); });
    }
    enganchar('b-que-hacer');
    enganchar('b-que-hacer-title');
    pintar();
    async function test() {
      const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
      const abierto = dlg.open;
      try {
        abrir();
        ok('El panel se abre desde la portada y desde la pausa', !!($('b-que-hacer') && $('b-que-hacer-title') && dlg.open));
        const ids = [...dlg.querySelectorAll('[data-qh]')].map(el => el.dataset.qh);
        ok('Están Family Quest, Tuerca, la Patrulla y Mis cotorras', ['familia', 'tuerca', 'patrulla', 'cotorras'].every(id => ids.includes(id)), ids.join(','));
        ok('CG-126 · está la casa del bohío', ids.includes('casa'));
        ok('CG-126 · están la escuela de vuelo y el taller de Tuerca', ids.includes('piloto') && ids.includes('taller') && !dlg.querySelector('[data-qh="piloto"] .qh-ir').disabled && !dlg.querySelector('[data-qh="taller"] .qh-ir').disabled);
        const filasEl = [...dlg.querySelectorAll('.qh-fila')];
        ok('Cada fila tiene estado e Ir', filasEl.length > 0 && filasEl.every(el => el.querySelector('small') && el.querySelector('small').textContent && el.querySelector('.qh-ir')));
        const tu = dlg.querySelector('[data-qh="tuerca"] small');
        ok('Sin el puente, Tuerca dice que se abre al repararlo', !!(tu && /puente|bridge/i.test(tu.textContent)) && dlg.querySelector('[data-qh="tuerca"] .qh-ir').disabled);
        const pa = dlg.querySelector('[data-qh="patrulla"] small');
        ok('La Patrulla dice cuántas van', !!(pa && /Patrulla|Patrol/.test(pa.textContent) && /\/4/.test(pa.textContent)), pa && pa.textContent);
        dlg.style.width = '390px';
        const ir = dlg.querySelector('.qh-ir');
        const r = ir.getBoundingClientRect();
        ok('A 390 px, Ir mide al menos 44 px y la lista no se sale', r.width >= 44 && r.height >= 40 && dlg.scrollWidth <= dlg.clientWidth + 2, Math.round(r.width) + '×' + Math.round(r.height));
        ir.focus();
        ok('Con teclado, el foco llega a Ir', document.activeElement === ir);
        let modo = null;
        const ant = G.menuModos && G.menuModos.elegir;
        if (G.menuModos) G.menuModos.elegir = m => { modo = m; return Promise.resolve(true); };
        dlg.querySelector('[data-qh="golf"] .qh-ir').click();
        ok('Ir al minigolf usa el menú', modo === 'golf', modo);
        if (G.menuModos && ant) G.menuModos.elegir = ant;
      } catch (e) { ok('La prueba terminó', false, e && e.message); }
      finally { dlg.style.width = ''; if (!abierto) cerrar(); }
      return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
    }
    const api = { abrir, cerrar, pintar, test };
    G.queHacer = api;
    const publicar = () => { if (window.AV) window.AV.queHacerTest = o => api.test(o); };
    publicar();
    setTimeout(publicar, 0);
    return api;
  };
})();

/* AVE.pieles · pieles de especie sobre la Vittata del juego (mismo modelo y mismo rig; solo cambia el mapa de color)
   Las 22 pieles salen de los .blend de Kelvin cocidos sobre el UV de la Vittata (tools/blender/pieles_cocer.py):
   assets/textures/pieles/<piel>.jpg, 1024², ≈ 75 KB (1,6 MB las 22). El enlace especie → piel está en content/comun/especies.js (campo piel).
   - Carga perezosa: nada se descarga hasta que un personaje usa una especie con piel (ninguna textura en la descarga inicial).
   - Sin piel (vittata, agilis, albifrons, festiva…), el personaje queda con el tinte por máscaras de character.js.
   - Con piel: se cambia el mapa de color del cuerpo y del pico (y del plumón de las crías, que lo comparte); el sombreado y el
     shader de máscaras siguen puestos, con el tinte apagado (la piel ya trae los colores). Los párpados toman el color del
     anillo del ojo de esa piel.
   API (para el criadero, el Modo Retos y cualquier pack):
     AVE.pieles.lista()                      → [{ piel, especie, archivo }] las 22 pieles (especie null si no tiene id en el catálogo)
     AVE.pieles.tiene(id)                    → true si la especie (o la piel) tiene piel cocida
     AVE.pieles.aplicar(personaje, id)       → Promise<boolean>. Fija la piel en ese personaje (sobrevive a applyLook) hasta quitar().
                                               id: especie de especies.js ('aestiva') o nombre de piel ('ochrocephala_panamensis').
                                               Sin piel (o id null), suelta la piel fija y deja el tinte de hoy; resuelve false.
     AVE.pieles.quitar(personaje)            → vuelve al mapa original y al tinte de la especie de su look
     AVE.pieles.listo(personaje)             → Promise que espera a que la piel pedida esté puesta (para retratos y capturas)
     AVE.pieles.cargar(id)                   → Promise<THREE.Texture|null> (precarga; caché compartida entre personajes)
     AVE.pieles.liberar()                    → suelta de la GPU las texturas en caché (se vuelven a subir si se usan)
     AVE.pieles.alCambiarEspecie(pj, id)     → lo llama Character.setSpecies (character.js): piel si la especie la tiene
   Ejemplo (rival de otra especie en Retos):  const ch = await AVCharacter.create(); ch.applyLook(look); AVE.pieles.aplicar(ch, 'oratrix');
   Prueba: AV.pielesTest() (src/pruebas/pieles.js, se carga al pedirla; no va en la descarga inicial). */
(function () {
  'use strict';
  const DIR = 'assets/textures/pieles/';
  // Las 22 pieles cocidas: archivo de Kelvin → piel → especie del catálogo. anillo: color medio de la piel alrededor del ojo
  // (lo mide pieles_cocer.py); lo usan los párpados. ochrocephala_panamensis es subespecie: el catálogo no le da id (Kelvin decide).
  const PIELES = [
    { piel: 'aestiva', especie: 'aestiva', archivo: 'Aestiva.blend', anillo: '#bcb496' },
    { piel: 'amazonica', especie: 'amazonica', archivo: 'Amazonica.blend', anillo: '#bcb496' },
    { piel: 'auropalliata', especie: 'auropalliata', archivo: 'Auropalliata.blend', anillo: '#bcb496' },
    { piel: 'barbadensis', especie: 'barbadensis', archivo: 'Barbadensis.blend', anillo: '#bcb496' },
    { piel: 'brasiliensis', especie: 'brasiliensis', archivo: 'Brasiliensis.blend', anillo: '#bcb496' },
    { piel: 'diadema', especie: 'diadema', archivo: 'Diadema.blend', anillo: '#bcb496' },
    { piel: 'dufresniana', especie: 'dufresniana', archivo: 'Dufresniana.blend', anillo: '#bcb496' },
    { piel: 'farinosa', especie: 'farinosa', archivo: 'Farinosa.blend', anillo: '#bcb496' },
    { piel: 'guatemalae', especie: 'guatemalae', archivo: 'Guatemalae.blend', anillo: '#bcb496' },
    { piel: 'guildingii', especie: 'guildingii', archivo: 'Guildingii.blend', anillo: '#bcb496' },
    { piel: 'imperialis', especie: 'imperialis', archivo: 'Imperialis.blend', anillo: '#bcb496' },
    { piel: 'kawalli', especie: 'kawalli', archivo: 'Kawalli.blend', anillo: '#bcb496' },
    { piel: 'leucocephala', especie: 'leucocephala', archivo: 'Leucocephala.blend', anillo: '#bcb496' },
    { piel: 'mercenarius', especie: 'mercenarius', archivo: 'Mercenarius.blend', anillo: '#bcb496' },
    { piel: 'ochrocephala_panamensis', especie: null, archivo: 'Ochrocephala panamensis.blend', anillo: '#bcb496' },
    { piel: 'ochrocephala', especie: 'ochrocephala', archivo: 'Ochrocephala.blend', anillo: '#bcb496' },
    { piel: 'oratrix', especie: 'oratrix', archivo: 'Oratrix.blend', anillo: '#bcb496' },
    { piel: 'rhodocorytha', especie: 'rhodocorytha', archivo: 'Rhodocorytha.blend', anillo: '#aba499' },
    { piel: 'versicolor', especie: 'versicolor', archivo: 'Versicolor.blend', anillo: '#bcb496' },
    { piel: 'viridigenalis', especie: 'viridigenalis', archivo: 'Viridigenalis.blend', anillo: '#bcb496' },
    { piel: 'xantholora', especie: 'xantholora', archivo: 'Xantholora.blend', anillo: '#bcb496' },
    { piel: 'tresmariae', especie: 'tresmariae', archivo: 'tresmariae.blend', anillo: '#bcb496' },
  ];
  const POR_PIEL = {}; for (const p of PIELES) POR_PIEL[p.piel] = p;

  // especie → piel: primero el campo piel de especies.js (la fuente de verdad); si el catálogo no está cargado, la tabla de arriba
  function pielDe(id) {
    if (!id) return null;
    const ES = window.AV_ESPECIES;
    if (ES && Array.isArray(ES.especies)) {
      const e = ES.especies.find(x => x.id === id);
      if (e) return e.piel && POR_PIEL[e.piel] ? e.piel : null;
    }
    if (POR_PIEL[id]) return id;
    const p = PIELES.find(x => x.especie === id);
    return p ? p.piel : null;
  }
  const url = piel => DIR + piel + '.jpg';

  // ---------- Texturas (perezosas, en caché) ----------
  const cache = {}, pedidas = [];   // pedidas: registro de descargas (lo lee la prueba)
  function cargar(id) {
    const piel = pielDe(id);
    if (!piel) return Promise.resolve(null);
    if (cache[piel]) return cache[piel];
    pedidas.push(piel);
    cache[piel] = new Promise(res => {
      new THREE.TextureLoader().load(url(piel), t => {
        t.flipY = false;                       // mismo criterio que las texturas del .glb (UV de glTF)
        t.name = 'piel_' + piel;
        if (window.AVColor) window.AVColor.tex(t); else { t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; }
        res(t);
      }, undefined, () => { console.warn('pieles: no se pudo cargar ' + url(piel) + '; queda el tinte'); res(null); });  // no se reintenta
    });
    return cache[piel];
  }
  function liberar() { for (const p of Object.values(cache)) p.then(t => t && t.dispose()); }

  // ---------- Personaje ----------
  // Mapa original del cuerpo: el de los materiales propios del personaje (cuerpo y pico comparten la textura del .glb)
  function mapaBase(ch) {
    if (ch._pielBase !== undefined) return ch._pielBase;
    let base = null;
    for (const m of Object.values(ch.materials || {})) if (m && m.map && !/^piel_/.test(m.map.name || '')) { base = m.map; break; }
    ch._pielBase = base;
    return base;
  }
  // Recorre el cuerpo y todo lo que comparta su mapa (plumón de las crías); nunca la ropa (isAccessory)
  function cadaMaterial(ch, fn) {
    ch.root.traverse(o => {
      if (!o.isMesh || o.userData.isAccessory) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.map) fn(m);
    });
  }
  function ponerMapa(ch, tex) {
    const base = mapaBase(ch); if (!base) return false;
    cadaMaterial(ch, m => {
      if (m.map === base || (m.userData.pielDe === ch.root.uuid)) {
        if (m.map !== tex) { m.map = tex; m.needsUpdate = true; }
        m.userData.pielDe = tex === base ? undefined : ch.root.uuid;
      }
    });
    return true;
  }
  function tinteApagado(ch) { if (ch.tint && ch.tint.tintOn) ch.tint.tintOn.value.set(0, 0, 0); }
  function parpados(ch, piel) {
    const P = POR_PIEL[piel];
    if (ch.lidMat && P && P.anillo && window.AVColor) {
      window.AVColor.set(ch.lidMat.skin.color, P.anillo); ch.lidMat.lip.color.copy(ch.lidMat.skin.color).multiplyScalar(0.45);
    }
  }

  // Estado por personaje: fija (aplicar), actual (puesta) y la promesa de la última petición
  const estado = ch => ch._piel || (ch._piel = { fija: null, actual: null, pedida: null, promesa: Promise.resolve(false) });

  function poner(ch, piel) {
    const S = estado(ch);
    S.pedida = piel;
    if (!piel) {
      if (S.actual) { ponerMapa(ch, mapaBase(ch)); S.actual = null; }
      return (S.promesa = Promise.resolve(false));
    }
    if (S.actual === piel) { tinteApagado(ch); parpados(ch, piel); return (S.promesa = Promise.resolve(true)); }
    S.promesa = cargar(piel).then(tex => {
      if (S.pedida !== piel) return false;      // otra petición llegó mientras cargaba
      if (!tex || !ponerMapa(ch, tex)) return false;
      S.actual = piel; tinteApagado(ch); parpados(ch, piel);
      return true;
    });
    return S.promesa;
  }

  // Character.setSpecies(id) llama aquí al final: si el personaje tiene una piel fija, manda; si no, la de su especie (o ninguna)
  function alCambiarEspecie(ch, id) {
    if (!ch || !ch.root) return Promise.resolve(false);
    const S = estado(ch);
    return poner(ch, S.fija || pielDe(id));
  }
  function aplicar(ch, id) {
    if (!ch || !ch.root) return Promise.resolve(false);
    const piel = pielDe(id), S = estado(ch), antes = S.fija;
    S.fija = piel;
    if (piel) return poner(ch, piel);
    if (antes) { if (ch.setSpecies) ch.setSpecies(ch.species || 'vittata'); else poner(ch, null); }  // suelta la piel fija anterior
    return Promise.resolve(false);
  }
  function quitar(ch) {
    if (!ch || !ch.root) return;
    estado(ch).fija = null;
    if (ch.setSpecies) ch.setSpecies(ch.species || 'vittata'); else poner(ch, null);
  }
  const listo = ch => (ch && ch._piel ? ch._piel.promesa : Promise.resolve(false));
  const lista = () => PIELES.map(p => ({ piel: p.piel, especie: p.especie, archivo: p.archivo }));
  const tiene = id => !!pielDe(id);

  window.AVE = window.AVE || {};
  // _prueba: lo que necesita src/pruebas/pieles.js (AV.pielesTest, se carga al pedirla); no es API
  AVE.pieles = { lista, tiene, piel: pielDe, aplicar, quitar, listo, cargar, liberar, alCambiarEspecie, DIR,
    _prueba: { PIELES, POR_PIEL, pedidas, mapaBase, cadaMaterial } };
})();

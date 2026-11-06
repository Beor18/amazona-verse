/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · KIMI-070 (frente D): la Maraña como misterio
   junto al puente roto. Solo visual y sonido: un rastro de la Maraña (la misma malla instanciada de
   src/game/marana.js, con ojos que se abren a <26 m y siguen al jugador, enredaderas que se mueven y
   la voz = sonido existente nido_chispa) vigila el hueco del puente colgante MIENTRAS está roto.
   Al repararlo, la Maraña se retira: el mundo que cambia contigo. Inliminable (la bandada no lo limpia),
   sin recompensa, sin diario, sin avisos: es un misterio que se ve y se oye.
   Coste: 0 draw calls extra (los 2 de siempre de la Maraña, instanciados) y 0 texturas nuevas.
   Detrás de la bandera V18 (src/boot.js; encendida por defecto, ?v18=0 la apaga). Prueba: AV.v18MisterioTest(). */
window.AVV18Misterio = function (G) {
  'use strict';
  if (G.v18Misterio) return G.v18Misterio;
  const V = G.v18 || window.AVV18Progreso(G);
  const S = G.S, T = G.terreno;
  const ID_RASTRO = 'v18_puente', ID_PUENTE = 'puente_villa';
  let rastro = null, intentos = 0;
  const roto = () => (V.mundo(ID_PUENTE) || 'roto') !== 'reparado';

  // junto al hueco roto, en la orilla de la cabecera (fuera del tablero y del río): vigila el puente desde la hierba
  function sitio() {
    const pl = T.plataformas.find(p => p.id === 'puente' && p.tipo === 'puente');
    if (!pl) return null;
    const ux = pl.bx - pl.ax, uz = pl.bz - pl.az, L = Math.hypot(ux, uz) || 1;
    const nx = ux / L, nz = uz / L;
    const px = -nz, pz = nx; // perpendicular al eje: un lado del tablero
    const lado = (pl.ancho || 3) / 2 + 1.6, t = 0.1; // cerca de la cabecera, mirando el hueco del centro
    return { x: pl.ax + nx * (L * t) + px * lado, z: pl.az + nz * (L * t) + pz * lado };
  }
  function colocar() {
    if (rastro) return true;
    if (!G.marana) return false;
    const p = sitio();
    if (!p) return false;
    rastro = G.marana.aparecer({ id: ID_RASTRO, x: p.x, z: p.z, inliminable: true, visto: true });
    return !!rastro;
  }
  function retirar() {
    if (!rastro) return;
    try { G.marana.retirar(ID_RASTRO); } catch (e) { /* sin maraña */ }
    rastro = null;
  }
  function sincronizar() { if (roto()) colocar(); else retirar(); }

  // espera a que existan el puente (terreno.plataformas) y la maraña; se reintenta al aplicar y con cada cambio del puente
  function esperar() {
    if (colocar()) { sincronizar(); return; }
    if (++intentos < 120) setTimeout(esperar, 500);
  }
  Promise.resolve(G.mundo && G.mundo.listo).then(esperar, esperar);
  G.on('apply', () => setTimeout(sincronizar, 0), 96);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID_PUENTE) sincronizar(); });

  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const clave = V.clave();
    let crudo = null; try { crudo = localStorage.getItem(clave); } catch (e) { /* sin almacenamiento */ }
    const q = G.quiet, M = G.fisica && G.fisica.MOVE, fly = M && M.flying;
    const px = S.pos.x, py = S.pos.y, pz = S.pos.z;
    try {
      for (let i = 0; i < 60 && !colocar(); i++) await new Promise(r => setTimeout(r, 250));
      check('Aparece el rastro del misterio', !!rastro, rastro && (Math.round(rastro.x) + ',' + Math.round(rastro.z)));
      const pl = T.plataformas.find(p => p.id === 'puente' && p.tipo === 'puente');
      const mx = pl ? (pl.ax + pl.bx) / 2 : 0, mz = pl ? (pl.az + pl.bz) / 2 : 0;
      check('Está junto al puente (a 3–12 m del eje, fuera del tablero)', !!rastro && pl &&
        Math.hypot(rastro.x - mx, rastro.z - mz) > 2 && Math.hypot(rastro.x - mx, rastro.z - mz) < 12,
        'eje ' + Math.round(mx) + ',' + Math.round(mz) + ' · rastro ' + (rastro && Math.round(rastro.x) + ',' + Math.round(rastro.z)));
      // la cara: ojos que se abren cerca y siguen; la voz es el sonido existente (lo cubre maranaTest)
      G.quiet = false; if (M) M.flying = false;
      if (G.marana.probar) G.marana.probar(true); // en calidad baja la Maraña se apaga: la prueba mira la cara igual
      S.pos.x = rastro.x + 8; S.pos.z = rastro.z; S.pos.y = T.height(rastro.x, rastro.z) + 1.5;
      for (let i = 0; i < 16; i++) G.marana.paso(0.1);
      const abrio = G.marana.ojos.visible && G.marana.ojos.count >= 2 && rastro.apertura > 0.8;
      const m1 = G.marana.ojos.count ? Array.from(G.marana.ojos.instanceMatrix.array.slice(0, 16)) : null;
      S.pos.x = rastro.x - 8; // el jugador cruza al otro lado: los ojos deben girar
      for (let i = 0; i < 16; i++) G.marana.paso(0.1);
      const m2 = G.marana.ojos.count ? Array.from(G.marana.ojos.instanceMatrix.array.slice(0, 16)) : null;
      const giran = !!m1 && !!m2 && m1.some((v, i) => Math.abs(v - m2[i]) > 1e-4);
      check('Los ojos se abren cerca y siguen al jugador', abrio && giran, 'apertura ' + rastro.apertura.toFixed(2) + ' · ojos ' + G.marana.ojos.count);
      // inliminable: volar encima no lo limpia ni escribe en el diario
      const notas0 = G.marana.notas.length;
      if (M) M.flying = true;
      S.pos.x = rastro.x; S.pos.z = rastro.z;
      for (let i = 0; i < 10; i++) G.marana.paso(0.1);
      check('La bandada no lo limpia (misterio inliminable)', !!rastro && !rastro.limpio && G.marana.notas.length === notas0);
      // coste: los mismos 2 draw calls de la maraña (malla + ojos), nada nuevo
      const info = G.renderer.renderer.info;
      const una = () => { G.renderer.renderer.render(G.renderer.scene, G.renderer.camera); return info.render.calls; };
      G.marana.malla.visible = false; G.marana.ojos.visible = false; const base = una();
      G.marana.malla.visible = true; G.marana.ojos.visible = true; const con = una();
      check('Coste ≤ 2 draw calls (mallas instanciadas de siempre)', con - base <= 2, base + ' → ' + con);
      // al reparar el puente se retira; al romperse (estado limpio) vuelve
      V.cambiarMundo(ID_PUENTE, 'reparado'); sincronizar();
      check('Al reparar el puente la Maraña se retira', !rastro && G.marana.rastros.every(r => r.id !== ID_RASTRO));
      V.borrar(); V.recargar(); sincronizar();
      check('Con el puente sin reparar vuelve a aparecer', !!rastro && roto());
      S.pos.x = px; S.pos.y = py; S.pos.z = pz;
    } catch (e) { check('Sin excepciones', false, e && e.stack); }
    if (G.marana && G.marana.probar) G.marana.probar(false);
    G.quiet = q; if (M) M.flying = fly;
    S.pos.x = px; S.pos.y = py; S.pos.z = pz;
    try { if (crudo == null) { V.borrar(); } else localStorage.setItem(clave, crudo); } catch (e) { /* sin almacenamiento */ }
    V.recargar(); sincronizar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18Misterio = { ID_RASTRO, colocar, retirar, sincronizar, rastro: () => rastro, test };
  return G.v18Misterio;
};

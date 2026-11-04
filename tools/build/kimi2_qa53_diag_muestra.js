(async () => {
  const R = AV.G.renderer;
  const st = R.stats();
  const f = window.__fases || [];
  const c1 = st.calls, f1 = st.fps;
  await new Promise(r => setTimeout(r, 600));
  const s2 = R.stats();
  return JSON.stringify({
    calls: st.calls, tris: st.triangulos, fps: Math.round(st.fps || 0),
    cal: R.calidad.nivel, progs: R.renderer.info.programs.length,
    lost: window.__ctxLost || 0, restored: window.__ctxRestored || 0,
    mundoListo: !!(AV.G.mundo && AV.G.mundo.listo),
    hidden: AV.G.ui.worldHidden(),
    fotos: R.fotos ? R.fotos() : null,
    fasesN: f.length, faseUlt: f.length ? f[f.length - 1] : null,
    vivo: s2.calls !== c1 || s2.fps !== f1
  });
})()

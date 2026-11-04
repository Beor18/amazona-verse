(() => {
  const R = AV.G.renderer;
  const st = R.stats();
  return JSON.stringify({
    calls: st.calls, tris: st.triangulos, fps: Math.round(st.fps || 0),
    cal: R.calidad.nivel, progs: R.renderer.info.programs.length,
    lost: window.__ctxLost || 0, restored: window.__ctxRestored || 0,
    mundoListo: !!(AV.G.mundo && AV.G.mundo.listo),
    hidden: AV.G.ui.worldHidden()
  });
})()

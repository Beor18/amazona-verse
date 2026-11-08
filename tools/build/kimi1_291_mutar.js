// KIMI-291: muta las luces tras el horneado inicial del atlas para reproducir el rojo
// «El atlas de impostores de la flora se repintó» (renderer.js contextTest) sin esperar
// al deriva natural de sol/hemi (look.js/clima.js/atardecer.js cambian R.sun/R.hemi en marcha).
try {
  const R = window.AV.G.renderer;
  R.sun.color.offsetHSL(0.03, 0.05, 0.06);
  R.sun.intensity *= 0.85;
  R.hemi.color.offsetHSL(-0.02, 0, 0.04);
  window.__k291_mutado = [R.sun.intensity, R.hemi.intensity];
} catch (e) { window.__k291_mutado = String(e); }

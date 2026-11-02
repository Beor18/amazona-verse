//--- inicio
(async () => { window.__G = window.AV.G; window.__cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }); window.AV.G.quiet = false; return JSON.stringify({ ok: 1 }); })()
//--- diario pantalla
(async () => { const G = window.__G, S = G.S; const t = G.pack.titulo || G.pack.id; G.diario.open(); await window.__cuadros(20);
 const c = document.getElementById('card'); return JSON.stringify({ pack: t, tarjeta: c ? c.innerText.slice(0, 700) : null }); })()

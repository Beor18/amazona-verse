//--- inicio
(async () => { window.__G = window.AV.G; window.__cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }); window.AV.G.quiet = false; return JSON.stringify({ ok: 1 }); })()
//--- sin_medalla
(async () => { const G = window.__G; G.diario.open(); await window.__cuadros(10); const c = document.getElementById('card'); const r = { tiene: /medalla del Guardi/i.test(c.innerText) }; G.ui.hideCard(); return JSON.stringify(r); })()
//--- medalla pantalla
(async () => { const G = window.__G, S = G.S; if (!S.collected.includes('medalla')) S.collected.push('medalla'); G.diario.open(); await window.__cuadros(10);
 const c = document.getElementById('card'); const el = [...c.querySelectorAll('.lbl')].find(e => /medalla/i.test(e.textContent)); if (el) el.scrollIntoView({ block: 'center' }); await window.__cuadros(10);
 return JSON.stringify({ seccion: !!el, texto: el ? el.nextElementSibling.innerText : null }); })()

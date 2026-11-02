//--- inicio
(async () => { const G = window.AV.G, R = G.renderer; window.__G = G;
 window.__cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
 window.__foto = async (az, d, h, mirar) => { const S = G.S; R.camera.position.set(S.pos.x + Math.sin(az) * d, S.pos.y + h, S.pos.z + Math.cos(az) * d); R.camera.lookAt(S.pos.x, S.pos.y + (mirar == null ? 0.5 : mirar), S.pos.z); R.camera.updateMatrixWorld(); R.drawScene(R.camera); return R.canvas.toDataURL('image/png'); };
 window.__fz = () => { const S = G.S; return Math.atan2(-S.facing.x, -S.facing.z); };
 G.quiet = false; return JSON.stringify({ ok: 1 }); })()
//--- descubriste2 pantalla
(async () => { const G = window.__G, S = G.S, L = G.lugares, out = {};
 const lista = L.lista(); const p = lista.find(x => !L.descubiertos().includes(x.id));
 G.fisica.endFlight(); G.fisica.MOVE.flying = false; await G.mundo.streaming.alrededor(p.x, p.z); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar();
 S.pos.x = p.x; S.pos.z = p.z; S.pos.y = G.fisica.suelo(p.x, p.z, G.terreno.height(p.x, p.z) + 1) + 0.2; G.camara.place(true);
 if (G.dialogo.open()) G.dialogo.clear(); G.quiet = false; L.revisar(); let k = 0; const tt = document.getElementById("toast"); while (k++ < 600 && tt.hidden) { L.avisar(0.1); await window.__cuadros(1); } await window.__cuadros(10); out.toast = { txt: tt.textContent, hidden: tt.hidden, cuadros: k }; return JSON.stringify(out); })()

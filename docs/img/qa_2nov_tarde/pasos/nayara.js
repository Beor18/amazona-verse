//--- inicio
(async () => { window.__G = window.AV.G; window.__cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }); window.AV.G.quiet = false; return JSON.stringify({ ok: 1 }); })()
//--- nayara pantalla
(async () => { const G = window.__G, S = G.S; const nav = G.actores.npc('navegante'); const out = { npc: !!nav };
 if (nav) { nav.visible = true; const p = nav.pos || (nav.mesh && nav.mesh.position) || {}; out.pos = { x: p.x, z: p.z }; }
 const it = G.interaccion.find('navegante'); const px = it ? it.x : (out.pos && out.pos.x), pz = it ? it.z : (out.pos && out.pos.z);
 if (px == null) return JSON.stringify(out);
 await G.mundo.streaming.alrededor(px, pz); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar();
 G.fisica.endFlight(); S.pos.x = px + 3; S.pos.z = pz + 1; S.pos.y = G.fisica.suelo(S.pos.x, S.pos.z, G.terreno.height(S.pos.x, S.pos.z) + 1); G.camara.yaw = Math.atan2(px - S.pos.x, pz - S.pos.z) + 3.14; G.camara.place(true);
 await window.__cuadros(40);
 G.dialogo.say([{ who: 'Navegante', img: 'assets/navegante.png', text: 'Me llamo Nayara. Crucé el mar desde La Española, y allá aprendí a leer el agua.' }]); await window.__cuadros(60);
 return JSON.stringify(out); })()

//--- inicio
(async () => { const G = window.AV.G, R = G.renderer; window.__G = G;
 window.__cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
 window.__foto = async (az, d, h, mirar) => { const S = G.S; R.camera.position.set(S.pos.x + Math.sin(az) * d, S.pos.y + h, S.pos.z + Math.cos(az) * d); R.camera.lookAt(S.pos.x, S.pos.y + (mirar == null ? 0.5 : mirar), S.pos.z); R.camera.updateMatrixWorld(); R.drawScene(R.camera); return R.canvas.toDataURL('image/png'); };
 window.__fz = () => { const S = G.S; return Math.atan2(-S.facing.x, -S.facing.z); };
 G.quiet = false; return JSON.stringify({ ok: 1 }); })()
//--- nido
(async () => { const G = window.__G, S = G.S, F = G.fisica, M = F.MOVE, H = G.terreno.height, SO = G.solidos, P3 = G.actores.player3D, out = {};
 G.eventos.log('LumaHelped'); await window.__cuadros(60);
 const n = G.interaccion.find('nido_criadero'); if (!n) return JSON.stringify({ nido: 'sin nido tras misión', hechas: Object.keys(S.missions) });
 out.visible = n.visible ? !!n.visible() : true;
 await G.mundo.streaming.alrededor(n.x, n.z); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar(); SO.terminar();
 const x = n.x + 1.8, z = n.z; const y = Math.max(H(x, z), 0) + 3;
 G.input.keys.clear(); M.vx = M.vz = 0; S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0; M.wasAir = true; M.flying = true; M.grounded = false; F.land(); G.camara.place(true);
 let n0 = G.actores.posa.n, mx = 0, k = 0, foto = null;
 while (k++ < 400) { await window.__cuadros(1); mx = Math.max(mx, P3.posarG || 0); if (!foto && M.grounded && (P3.posarG || 0) > 0.6) foto = await window.__foto(window.__fz() + 1.2, 3, 1.0, 0.5); if (M.grounded && k > 150) break; }
 out.info = { gestos: G.actores.posa.n - n0, pesoMax: Math.round(mx * 100) / 100, posado: M.posado, tipo: G.actores.posa.tipo, nido: { x: n.x, z: n.z }, pos: { x: S.pos.x, z: S.pos.z } };
 if (foto) out.bm130_posarse_nido = foto; await window.__cuadros(30); out.bm130_nido_quieta = await window.__foto(window.__fz() + 1.2, 3, 1.0, 0.5);
 return JSON.stringify(out); })()

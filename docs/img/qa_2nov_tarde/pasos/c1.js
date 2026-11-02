//--- inicio
(async () => { const G = window.AV.G, R = G.renderer; window.__G = G;
 window.__cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
 window.__foto = async (az, d, h, mirar) => { const S = G.S; R.camera.position.set(S.pos.x + Math.sin(az) * d, S.pos.y + h, S.pos.z + Math.cos(az) * d); R.camera.lookAt(S.pos.x, S.pos.y + (mirar == null ? 0.5 : mirar), S.pos.z); R.camera.updateMatrixWorld(); R.drawScene(R.camera); return R.canvas.toDataURL('image/png'); };
 window.__fz = () => { const S = G.S; return Math.atan2(-S.facing.x, -S.facing.z); };
 G.quiet = false; return JSON.stringify({ ok: 1 }); })()
//--- rama
(async () => { const G = window.__G, S = G.S, F = G.fisica, M = F.MOVE, H = G.terreno.height, SO = G.solidos, V = G.vegetacion, P3 = G.actores.player3D, out = {};
 const L = Object.assign({}, S.pos), arb = [];
 for (const m in (V && V.instancias) || {}) { if (!/tabonuco|ceiba|flamboyan|yagrumo|arbol_enano/.test(m)) continue; const P = V.instancias[m]; for (let i = 0; i < P.n; i++) arb.push({ x: P.pos[i * 4], y: P.pos[i * 4 + 1], z: P.pos[i * 4 + 2], d: Math.hypot(P.pos[i * 4] - L.x, P.pos[i * 4 + 2] - L.z) }); }
 arb.sort((a, b) => a.d - b.d); let rama = null;
 for (const t of arb.slice(0, 10)) { await G.mundo.streaming.alrededor(t.x, t.z); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar(); SO.terminar();
  for (let dz = -4; dz <= 4; dz += 0.3) for (let dx = -4; dx <= 4; dx += 0.3) { const x = t.x + dx, z = t.z + dz; if (Math.hypot(dx, dz) < 1) continue; const g = SO.altoEn(x, z, t.y + 10), hg = g - H(x, z); if (!(hg > 1.5 && hg < 8) || !SO.fino(x, z, g + 0.01)) continue; if (!rama || Math.abs(hg - 3.5) < Math.abs(rama.hg - 3.5)) rama = { x, z, g, hg }; }
  if (rama) break; }
 if (!rama) return JSON.stringify({ rama: 'sin rama' });
 await window.__cuadros(30);
 const K = G.input.keys; K.clear();
 const caer = async (nombre, x, z, y) => { M.vx = M.vz = 0; S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0; M.wasAir = true; M.flying = true; M.grounded = false; F.land(); G.camara.place(true); let n0 = G.actores.posa.n, mx = 0, foto = null, n = 0;
  while (n++ < 400) { await window.__cuadros(1); mx = Math.max(mx, P3.posarG || 0); if (!foto && M.grounded && (P3.posarG || 0) > 0.6) { foto = await window.__foto(window.__fz() + 1.2, 2.6, 0.9, 0.5); } if (M.grounded && n > 150) break; }
  if (foto) out[nombre] = foto; return { gestos: G.actores.posa.n - n0, pesoMax: Math.round(mx * 100) / 100, posado: M.posado, tipo: G.actores.posa.tipo }; };
 out.rama_info = await caer('bm130_posarse_rama', rama.x, rama.z, rama.g + 2);
 await window.__cuadros(40); out.bm130_rama_quieta = await window.__foto(window.__fz() + 1.2, 2.6, 0.9, 0.5);
 const n = G.interaccion && G.interaccion.find && G.interaccion.find('nido_criadero');
 if (n) { await G.mundo.streaming.alrededor(n.x, n.z); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar(); SO.terminar();
  const ang = Math.atan2(S.pos.x - n.x, S.pos.z - n.z) || 0; const x = n.x + Math.sin(ang) * 1.6, z = n.z + Math.cos(ang) * 1.6;
  out.nido_info = await caer('bm130_posarse_nido', x, z, Math.max(H(x, z), n.y || 0) + 3); out.nido_pos = { x: n.x, z: n.z, visible: n.visible ? !!n.visible() : true };
  await window.__cuadros(40); out.bm130_nido_quieta = await window.__foto(window.__fz() + 1.2, 3, 1.0, 0.5);
 } else out.nido = 'sin interaccion nido_criadero';
 return JSON.stringify(out); })()
//--- crucero
(async () => { const G = window.__G, S = G.S, F = G.fisica, M = F.MOVE, K = G.input.keys, I = G.input, out = {};
 K.clear(); const H = G.terreno.height; S.pos.y = H(S.pos.x, S.pos.z) + 40; M.flying = true; M.grounded = false; S.vy = 0;
 if (!M.flying) F.toggleFly(); G.camara.yaw = 0.35;
 K.add('w'); await window.__cuadros(150);
 out.vuelo = { fly: M.flying, speed: Math.round(M.speed * 10) / 10, legsDown: G.actores.player3D.legsDown };
 out.bm130_crucero_atras = await window.__foto(window.__fz(), 3.2, 0.7, 0.2);
 out.bm130_crucero_lado = await window.__foto(window.__fz() + 1.57, 3.2, 0.5, 0.2);
 K.clear(); return JSON.stringify(out); })()
//--- ladera
(async () => { const G = window.__G, S = G.S, F = G.fisica, M = F.MOVE, H = G.terreno.height, out = {};
 let mejor = null; const c = Object.assign({}, S.pos);
 for (let r = 6; r <= 150; r += 4) for (let a = 0; a < 24; a++) { const x = c.x + Math.cos(a / 24 * 6.283) * r, z = c.z + Math.sin(a / 24 * 6.283) * r; if (G.agua.levelAt(x, z) > H(x, z) - 0.4) continue;
  const g = Math.hypot((H(x + 0.5, z) - H(x - 0.5, z)), (H(x, z + 0.5) - H(x, z - 0.5))); const deg = Math.atan(g) * 180 / Math.PI; if (deg > 24 && deg < 36 && (!mejor || Math.abs(deg - 30) < Math.abs(mejor.deg - 30))) mejor = { x, z, deg }; }
 if (!mejor) return JSON.stringify({ ladera: 'no hallada' });
 await G.mundo.streaming.alrededor(mejor.x, mejor.z); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar();
 M.flying = false; F.endFlight(); S.pos.x = mejor.x; S.pos.z = mejor.z; S.pos.y = F.suelo(mejor.x, mejor.z, H(mejor.x, mejor.z) + 0.5); S.vy = 0; M.grounded = true; M.vx = M.vz = 0;
 await window.__cuadros(60); out.ladera = { grados: Math.round(mejor.deg), x: Math.round(mejor.x), z: Math.round(mejor.z), grounded: M.grounded };
 out.bm130_ladera_lado = await window.__foto(window.__fz() + 1.57, 1.8, 0.35, 0.25);
 out.bm130_ladera_frente = await window.__foto(window.__fz() + 3.14, 1.8, 0.45, 0.25);
 return JSON.stringify(out); })()
//--- descubriste pantalla
(async () => { const G = window.__G, S = G.S, L = G.lugares, out = {};
 const lista = L.lista(); out.n = lista.length; const p = lista.find(x => !L.descubiertos().includes(x.id)) || lista[0]; if (!p) return JSON.stringify({ sin: 'lugares' });
 G.fisica.endFlight(); G.fisica.MOVE.flying = false; await G.mundo.streaming.alrededor(p.x, p.z); if (G.mundo.streaming.terminar) await G.mundo.streaming.terminar();
 S.pos.x = p.x; S.pos.z = p.z; S.pos.y = G.fisica.suelo(p.x, p.z, G.terreno.height(p.x, p.z) + 1) + 0.2; G.camara.place(true);
 if (G.dialogo.open()) G.dialogo.clear(); G.quiet = false; out.nuevos = L.revisar(); L.avisar(0); await window.__cuadros(25);
 const tt = document.getElementById('toast'); out.toast = tt ? tt.textContent : null; return JSON.stringify(out); })()

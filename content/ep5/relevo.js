/* Episodio 5 · relevo (EP5_GDD §4 y §5, EP5_MISIONES M3).
   Tres códigos, cinco alturas y la línea de vista contra la altura del terreno. Sin azar. */
(function () {
  'use strict';
  const EP = window.AV_EP5 = window.AV_EP5 || {};
  EP.taller = { id: 'taller', x: 0, z: 6 };
  EP.niebla = { id: 'niebla', x: 0, z: -34 };
  // Cinco alturas: dos lomas, dos ruinas y el mirador. El jugador usa tres.
  EP.estaciones = [
    { id: 'loma', nombre: 'la loma baja', x: 0, z: -6 },
    { id: 'otra', nombre: 'la otra loma', x: -14, z: -8 },
    { id: 'torre', nombre: 'la torre que mira al mar', x: 0, z: -18 },
    { id: 'mirador', nombre: 'el mirador', x: 0, z: -28 },
    { id: 'pilar', nombre: 'el pilar', x: 18, z: -6 },
  ];
  EP.codigos = {
    luz: { nombre: 'Luz', pieza: 'el espejo', ventaja: 'La luz llega lejos si no hay una loma en medio.', costo: 'No atraviesa la niebla, salvo desde el mirador.' },
    sonido: { nombre: 'Sonido', pieza: 'el tambor', ventaja: 'El sonido pasa la niebla y las lomas.', costo: 'Llega corto: si dos puestos quedan lejos, se pierde.' },
    tela: { nombre: 'Tela', pieza: 'la bandera', ventaja: 'Se ve de día y el ruido no la tapa.', costo: 'De noche no se ve, salvo que alguien la alumbre.' },
  };
  EP.alcanceSonido = 16;
  // Colinas del prototipo (el pack las copia al terreno antes de arrancar). La del (9, 0) tapa al pilar.
  EP.relieves = [
    { tipo: 'colina', x: 0, z: -18, alto: 2.5, ancho: 18 },
    { tipo: 'colina', x: 0, z: -28, alto: 4, ancho: 16 },
    { tipo: 'colina', x: 9, z: 0, alto: 11, ancho: 28 },
    { tipo: 'colina', x: -14, z: -8, alto: 3, ancho: 20 },
  ];
  const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

  // Rayo entre dos puestos. Luz: choca con el suelo. Sonido: ignora el suelo y falla si pasa el alcance. Tela: no usa este rayo.
  EP.lineaVista = function (altura, a, b, codigo) {
    const d = dist(a, b);
    if (codigo === 'sonido' && d > EP.alcanceSonido) return { ok: false, motivo: 'corto', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    if (codigo !== 'luz') return { ok: true, motivo: 'libre' };
    const ya = altura(a.x, a.z) + 2.2, yb = altura(b.x, b.z) + 2.2;
    const n = Math.max(6, Math.ceil(d / 1.5));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (altura(x, z) > ya + (yb - ya) * t - 0.35) return { ok: false, motivo: 'loma', x, z };
    }
    return { ok: true, motivo: 'libre' };
  };

  // Primer corte de una cadena. La luz solo entra en la niebla desde el mirador. Sin gente, el corte es «vacia».
  EP.corte = function (altura, codigo, puestos, opts) {
    opts = opts || {};
    const ord = puestos.slice().sort((a, b) => dist(EP.taller, a) - dist(EP.taller, b));
    const cadena = [EP.taller].concat(ord, [EP.niebla]);
    if (codigo === 'tela' && !opts.linternas) return { motivo: 'noche', a: cadena[0], b: cadena[1] };
    if (codigo !== 'tela') {
      for (let i = 0; i < cadena.length - 1; i++) {
        const a = cadena[i], b = cadena[i + 1];
        if (codigo === 'luz' && b.id === 'niebla' && a.id !== 'mirador') return { motivo: 'niebla', a, b, x: a.x, z: (a.z + b.z) / 2 };
        const r = EP.lineaVista(altura, a, b, codigo);
        if (!r.ok) return { motivo: r.motivo, a, b, x: r.x, z: r.z };
      }
    }
    return { motivo: 'vacia', a: cadena[1], b: cadena[Math.min(2, cadena.length - 1)] };
  };

  const pack = window.AVE && AVE.packs && AVE.packs.ep5;
  if (pack && pack.mundo && pack.mundo.terreno) pack.mundo.terreno.relieves = EP.relieves;
})();

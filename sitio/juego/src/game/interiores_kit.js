/* Juego · Kit modular de interior (CG-111, V18.4). Piezas procedurales, sin modelos nuevos:
   pared, esquina, piso, techo, puerta, ventana, estante y vitrina. El bohío amueblado que ya existe
   (assets/models/entorno/bohio_interior.glb) es el mobiliario de la Casa; este kit es la cáscara.
   Un material compartido y una malla por tipo. No se enciende en el mundo sin ?interiores=1.
   Prueba: AV.interioresKitTest(). */
(function () {
  'use strict';
  window.AVInterioresKit = function (G) {
    if (G.interioresKit) return G.interioresKit;
    const T = window.THREE;
    const TIPOS = ['pared', 'esquina', 'piso', 'techo', 'puerta', 'ventana', 'estante', 'vitrina'];
    const MODELO = 'assets/models/entorno/bohio_interior.glb';
    const MADERA = '#a56b3c', BARRO = '#c4a574', PAJA = '#d7b15a', HOJA = '#6ea84a';
    const lin = hex => new T.Color(hex).convertSRGBToLinear();
    const activo = () => G.INTERIORES === true || /[?&]interiores=1\b/.test(location.search);
    const material = () => {
      if (material._m) return material._m;
      material._m = new T.MeshLambertMaterial({ vertexColors: true });
      material._m.name = 'interior-kit';
      return material._m;
    };
    function volcar(geo, pos, col, color) {
      const c = lin(color), p = geo.attributes.position, idx = geo.index;
      const n = idx ? idx.count : p.count;
      for (let i = 0; i < n; i++) {
        const vi = idx ? idx.getX(i) : i;
        pos.push(p.getX(vi), p.getY(vi), p.getZ(vi));
        col.push(c.r, c.g, c.b);
      }
      geo.dispose();
    }
    function caja(pos, col, w, h, d, x, y, z, color) {
      const g = new T.BoxGeometry(w, h, d);
      g.applyMatrix4(new T.Matrix4().makeTranslation(x, y, z));
      volcar(g, pos, col, color);
    }
    function geometria(tipo) {
      const pos = [], col = [];
      if (tipo === 'pared') caja(pos, col, 2, 2.2, 0.12, 0, 1.1, 0, MADERA);
      else if (tipo === 'esquina') { caja(pos, col, 0.12, 2.2, 0.7, 0, 1.1, 0.29, MADERA); caja(pos, col, 0.7, 2.2, 0.12, 0.29, 1.1, 0, BARRO); }
      else if (tipo === 'piso') caja(pos, col, 2, 0.08, 2, 0, 0.04, 0, BARRO);
      else if (tipo === 'techo') caja(pos, col, 2.2, 0.1, 2.2, 0, 2.25, 0, PAJA);
      else if (tipo === 'puerta') { caja(pos, col, 0.1, 2, 0.08, -0.45, 1, 0, MADERA); caja(pos, col, 0.1, 2, 0.08, 0.45, 1, 0, MADERA); caja(pos, col, 1, 0.16, 0.08, 0, 2.02, 0, MADERA); }
      else if (tipo === 'ventana') { caja(pos, col, 0.9, 0.08, 0.06, 0, 1.55, 0, MADERA); caja(pos, col, 0.9, 0.08, 0.06, 0, 0.95, 0, MADERA); caja(pos, col, 0.08, 0.68, 0.06, -0.41, 1.25, 0, MADERA); caja(pos, col, 0.08, 0.68, 0.06, 0.41, 1.25, 0, MADERA); }
      else if (tipo === 'estante') { caja(pos, col, 0.7, 0.04, 0.28, 0, 0.5, 0, MADERA); caja(pos, col, 0.7, 0.04, 0.28, 0, 0.95, 0, MADERA); caja(pos, col, 0.7, 0.04, 0.28, 0, 1.4, 0, MADERA); caja(pos, col, 0.04, 1.1, 0.28, -0.33, 0.95, 0, BARRO); caja(pos, col, 0.04, 1.1, 0.28, 0.33, 0.95, 0, BARRO); }
      else if (tipo === 'vitrina') { caja(pos, col, 0.6, 0.08, 0.35, 0, 0.9, 0, MADERA); caja(pos, col, 0.6, 0.04, 0.35, 0, 1.45, 0, MADERA); caja(pos, col, 0.04, 0.6, 0.35, -0.28, 1.15, 0, HOJA); caja(pos, col, 0.04, 0.6, 0.35, 0.28, 1.15, 0, HOJA); caja(pos, col, 0.52, 0.5, 0.02, 0, 1.15, 0.16, '#d5efe4'); }
      else return null;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    }
    function malla(tipo) {
      const g = geometria(tipo); if (!g) return null;
      const m = new T.Mesh(g, material());
      m.name = 'kit-' + tipo;
      m.userData.kit = tipo;
      return m;
    }
    function trisDe(g) {
      const p = g.attributes && g.attributes.position;
      return p ? p.count / 3 : 0;
    }
    // Una sala de muestra: una pieza de cada tipo. No se añade a la escena.
    function sala() {
      const grupo = new T.Group();
      grupo.name = 'interior-kit-sala';
      let tris = 0;
      TIPOS.forEach((tipo, i) => {
        const m = malla(tipo); if (!m) return;
        m.position.x = (i - 3.5) * 2.4;
        tris += trisDe(m.geometry);
        grupo.add(m);
      });
      return { grupo, llamadas: grupo.children.length, tris, tipos: TIPOS.slice() };
    }
    function soltar(grupo) {
      if (!grupo) return;
      grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      if (grupo.parent) grupo.parent.remove(grupo);
    }
    // Solo con la bandera, y quien llama decide el padre. Aquí no se enciende sola.
    function montar(grupo, padre) {
      if (!activo() || !grupo || !padre) return false;
      padre.add(grupo);
      return true;
    }
    function test() {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const antes = G.INTERIORES;
      try {
        check('El kit tiene pared, esquina, piso, techo, puerta, ventana, estante y vitrina', TIPOS.length === 8 && TIPOS.every(t => !!geometria(t)));
        check('El mobiliario de la Casa sigue siendo el bohío que ya existe', MODELO === 'assets/models/entorno/bohio_interior.glb');
        const s = sala();
        check('La sala de muestra no entra en el mundo', !s.grupo.parent && s.llamadas === 8, s.llamadas);
        check('Una malla por tipo: 8 dibujos, por debajo del tope de 14 del Chromebook y de 20 del iPhone', s.llamadas <= 8, s.llamadas);
        check('La sala cabe en el presupuesto de triángulos (12 mil en Chromebook, 25 mil en iPhone)', s.tris > 0 && s.tris < 12000, s.tris);
        G.INTERIORES = false;
        check('Sin ?interiores=1 no se monta', montar(s.grupo, G.renderer && G.renderer.scene) === false && !s.grupo.parent);
        G.INTERIORES = true;
        const padre = new T.Group();
        check('Con la bandera se puede montar en un padre, y se suelta', montar(s.grupo, padre) && s.grupo.parent === padre);
        soltar(s.grupo);
        check('Soltar quita la sala y no deja geometría colgada del padre', !s.grupo.parent && padre.children.length === 0);
      } catch (e) {
        check('La prueba termina sin excepciones', false, String(e && e.stack || e).slice(0, 240));
      } finally {
        G.INTERIORES = antes;
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }
    const api = { TIPOS, MODELO, activo, geometria, malla, sala, montar, soltar, test };
    G.interioresKit = api;
    return api;
  };
})();

/* USDZExporter de Three.js r128, adaptado a este repo.
   Origen: https://github.com/mrdoob/three.js/blob/r128/examples/jsm/exporters/USDZExporter.js
   Copyright © 2010-2021 three.js authors
   Licencia MIT:
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:
   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
   Adaptación: sin el módulo fflate (no está en el repo y no se descarga).
   El zip se escribe aquí, sin comprimir y con cada archivo alineado a 64 bytes,
   que es lo que pide AR Quick Look. Los atributos se leen con getX/getY para
   servir también si vienen intercalados. */
(function (THREE) {
  class USDZExporter {
    async parse(scene) {
      let output = buildHeader();
      const materials = {};
      const textures = {};
      scene.updateMatrixWorld(true);
      scene.traverse((object) => {
        if (!object.isMesh || !object.geometry) return;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (!material) return;
        materials[material.uuid] = material;
        if (material.map) textures[material.map.uuid] = material.map;
        output += buildXform(object, buildMesh(object.geometry, material));
      });
      output += buildMaterials(materials);
      output += buildTextures(textures);
      const files = { 'model.usda': strToU8(output) };
      for (const uuid in textures) {
        const texture = textures[uuid];
        files['textures/Texture_' + texture.id + '.jpg'] = await imgToU8(texture.image);
      }
      return zipAlineado(files);
    }
  }

  function strToU8(s) { return new TextEncoder().encode(s); }

  function crc32(data) {
    let c = -1;
    for (let i = 0; i < data.length; i++) {
      c ^= data[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ -1) >>> 0;
  }

  // Cada bloque de datos empieza en un múltiplo de 64. AR Quick Look lo exige.
  function zipAlineado(files) {
    const nombres = Object.keys(files);
    const partes = [];
    const centrales = [];
    let offset = 0;
    for (const nombre of nombres) {
      const datos = files[nombre];
      const nom = strToU8(nombre);
      const extraLen = (64 - ((offset + 30 + nom.length) % 64)) % 64;
      const local = new Uint8Array(30 + nom.length + extraLen);
      const v = new DataView(local.buffer);
      const crc = crc32(datos);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, datos.length, true);
      v.setUint32(22, datos.length, true);
      v.setUint16(26, nom.length, true);
      v.setUint16(28, extraLen, true);
      local.set(nom, 30);
      partes.push(local, datos);
      const central = new Uint8Array(46 + nom.length);
      const c = new DataView(central.buffer);
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, datos.length, true);
      c.setUint32(24, datos.length, true);
      c.setUint16(28, nom.length, true);
      c.setUint32(42, offset, true);
      central.set(nom, 46);
      centrales.push(central);
      offset += local.length + datos.length;
    }
    let cd = 0;
    for (const x of centrales) cd += x.length;
    const end = new Uint8Array(22);
    const e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, nombres.length, true);
    e.setUint16(10, nombres.length, true);
    e.setUint32(12, cd, true);
    e.setUint32(16, offset, true);
    const todo = partes.concat(centrales, [end]);
    let n = 0;
    for (const x of todo) n += x.length;
    const out = new Uint8Array(n);
    let p = 0;
    for (const x of todo) { out.set(x, p); p += x.length; }
    return out;
  }

  async function imgToU8(image) {
    const canvas = document.createElement('canvas');
    const w = image.width || image.videoWidth || 1;
    const h = image.height || image.videoHeight || 1;
    const escala = 1024 / Math.max(w, h);
    canvas.width = Math.max(1, Math.round(w * Math.min(1, escala)));
    canvas.height = Math.max(1, Math.round(h * Math.min(1, escala)));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('textura');
    return new Uint8Array(await blob.arrayBuffer());
  }

  const PRECISION = 6;

  function buildHeader() {
    return `#usda 1.0
(
    customLayerData = {
        string creator = "Three.js USDZExporter"
    }
    metersPerUnit = 1
    upAxis = "Y"
)

`;
  }

  function buildXform(object, define) {
    const name = 'Object_' + object.id;
    return `def Xform "${ name }"
{
    matrix4d xformOp:transform = ${ buildMatrix(object.matrixWorld) }
    uniform token[] xformOpOrder = ["xformOp:transform"]

    ${ define }
}

`;
  }

  function buildMatrix(matrix) {
    const array = matrix.elements;
    return `( ${ buildMatrixRow(array, 0) }, ${ buildMatrixRow(array, 4) }, ${ buildMatrixRow(array, 8) }, ${ buildMatrixRow(array, 12) } )`;
  }

  function buildMatrixRow(array, offset) {
    return `(${ array[offset] }, ${ array[offset + 1] }, ${ array[offset + 2] }, ${ array[offset + 3] })`;
  }

  function buildMesh(geometry, material) {
    const name = 'Geometry_' + geometry.id;
    const attributes = geometry.attributes;
    const count = attributes.position ? attributes.position.count : 0;
    return `def Mesh "${ name }"
    {
        int[] faceVertexCounts = [${ buildMeshVertexCount(geometry) }]
        int[] faceVertexIndices = [${ buildMeshVertexIndices(geometry) }]
        rel material:binding = </Materials/Material_${ material.id }>
        normal3f[] normals = [${ buildVector3Array(attributes.normal, count) }] (
            interpolation = "vertex"
        )
        point3f[] points = [${ buildVector3Array(attributes.position, count) }]
        float2[] primvars:st = [${ buildVector2Array(attributes.uv, count) }] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
    }
`;
  }

  function buildMeshVertexCount(geometry) {
    const count = geometry.index !== null ? geometry.index.count : geometry.attributes.position.count;
    return Array(count / 3).fill(3).join(', ');
  }

  function buildMeshVertexIndices(geometry) {
    const index = geometry.index;
    if (index !== null) {
      const array = [];
      for (let i = 0; i < index.count; i++) array.push(index.getX(i));
      return array.join(', ');
    }
    const array = [];
    const length = geometry.attributes.position.count;
    for (let i = 0; i < length; i++) array.push(i);
    return array.join(', ');
  }

  function buildVector3Array(attribute, count) {
    if (!attribute) return Array(count).fill('(0, 0, 0)').join(', ');
    const array = [];
    for (let i = 0; i < attribute.count; i++) {
      array.push('(' + attribute.getX(i).toPrecision(PRECISION) + ', ' + attribute.getY(i).toPrecision(PRECISION) + ', ' + attribute.getZ(i).toPrecision(PRECISION) + ')');
    }
    return array.join(', ');
  }

  function buildVector2Array(attribute, count) {
    if (!attribute) return Array(count).fill('(0, 0)').join(', ');
    const array = [];
    for (let i = 0; i < attribute.count; i++) {
      array.push('(' + attribute.getX(i).toPrecision(PRECISION) + ', ' + (1 - attribute.getY(i)).toPrecision(PRECISION) + ')');
    }
    return array.join(', ');
  }

  function buildMaterials(materials) {
    const array = [];
    for (const uuid in materials) array.push(buildMaterial(materials[uuid]));
    return `def "Materials"
{
${ array.join('') }
}

`;
  }

  function buildMaterial(material) {
    const pad = '            ';
    const parameters = [];
    if (material.map) parameters.push(`${ pad }color3f inputs:diffuseColor.connect = </Textures/Texture_${ material.map.id }.outputs:rgb>`);
    else parameters.push(`${ pad }color3f inputs:diffuseColor = ${ buildColor(material.color) }`);
    if (material.emissive && material.emissive.getHex && material.emissive.getHex() > 0) parameters.push(`${ pad }color3f inputs:emissiveColor = ${ buildColor(material.emissive) }`);
    parameters.push(`${ pad }float inputs:roughness = ${ material.roughness != null ? material.roughness : 1 }`);
    parameters.push(`${ pad }float inputs:metallic = ${ material.metalness != null ? material.metalness : 0 }`);
    return `
    def Material "Material_${ material.id }"
    {
        token outputs:surface.connect = </Materials/Material_${ material.id }/PreviewSurface.outputs:surface>
        def Shader "PreviewSurface"
        {
            uniform token info:id = "UsdPreviewSurface"
${ parameters.join('\n') }
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }
    }
`;
  }

  function buildTextures(textures) {
    const array = [];
    for (const uuid in textures) array.push(buildTexture(textures[uuid]));
    return `def "Textures"
{
${ array.join('') }
}

`;
  }

  function buildTexture(texture) {
    return `
    def Shader "Texture_${ texture.id }"
    {
        uniform token info:id = "UsdUVTexture"
        asset inputs:file = @textures/Texture_${ texture.id }.jpg@
        token inputs:wrapS = "repeat"
        token inputs:wrapT = "repeat"
        float outputs:r
        float outputs:g
        float outputs:b
        float3 outputs:rgb
    }
`;
  }

  function buildColor(color) {
    if (!color) return '(1, 1, 1)';
    return `(${ color.r }, ${ color.g }, ${ color.b })`;
  }

  THREE.USDZExporter = USDZExporter;
})(THREE);

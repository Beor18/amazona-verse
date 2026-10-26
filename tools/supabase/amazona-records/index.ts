// Amazona Verse · récords públicos de los minijuegos (top por reto).
// Esquema privado «amazona» (no expuesto por REST); conexión directa con SUPABASE_DB_URL.
// Seguridad: sin datos personales (alias de lista fija; dispositivo e IP como SHA-256 con sal),
// límites de verosimilitud por reto, límite de envíos por dispositivo e IP, CORS solo para los dominios del juego.
import postgres from 'npm:postgres@3.4.4';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 2, prepare: false });
const SAL = 'amazona-verse-records-v1';
const ORIGENES = [/^https:\/\/(www\.)?amazonaverse\.com$/, /^https:\/\/amazona-verse[a-z0-9-]*\.vercel\.app$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/];

// Cada reto: si gana el menor (tiempo en ms) o el mayor (puntos), y límites de verosimilitud.
const RETOS: Record<string, { menor: boolean; min: number; max: number; ok?: (v: number, d: number) => boolean }> = {
  carrera: { menor: true, min: 25000, max: 900000, ok: (v, d) => d >= v * 0.9 },
  rio: { menor: true, min: 25000, max: 900000, ok: (v, d) => d >= v * 0.9 },
  tormenta: { menor: false, min: 0, max: 5000, ok: (v, d) => d <= 200000 && v <= Math.max(50, d / 1000 * 60) },
  banquete: { menor: false, min: 0, max: 3000, ok: (v, d) => d <= 180000 && v <= Math.max(50, d / 1000 * 40) },
  flight: { menor: false, min: 0, max: 2000, ok: (v, d) => v <= d / 1000 * 1.3 + 2 },
  maze: { menor: false, min: 0, max: 5000, ok: (v, d) => d <= 600000 && v <= Math.max(50, d / 1000 * 60) },
  rio_rush: { menor: false, min: 0, max: 5000, ok: (v, d) => d <= 600000 && v <= Math.max(50, d / 1000 * 60) },
};
// Alias: «Animal Adjetivo NN» de listas fijas (sin texto libre: nada de nombres reales).
const ANIMALES = ['Cotorra', 'Coquí', 'Guaraguao', 'Colibrí', 'Iguaca', 'Tinglar', 'Manatí', 'Reinita', 'Múcaro', 'Lagartijo'];
const ADJETIVOS = ['Veloz', 'Valiente', 'Curioso', 'Brillante', 'Alegre', 'Audaz', 'Sabio', 'Feliz', 'Ágil', 'Sereno'];
const ALIAS = new RegExp('^(' + ANIMALES.join('|') + ') (' + ADJETIVOS.join('|') + ') ([1-9][0-9]?)$');

async function hash(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SAL + ':' + s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function cors(origen: string | null) {
  const ok = origen && ORIGENES.some(r => r.test(origen));
  return { 'Access-Control-Allow-Origin': ok ? origen! : 'https://www.amazonaverse.com', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin', 'Content-Type': 'application/json' };
}
const resp = (h: Record<string, string>, cuerpo: unknown, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: h });
const dia = (d: unknown) => { const t = new Date(d as string); return isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10); };

async function top(reto: string, n: number) {
  const R = RETOS[reto];
  const filas = R.menor
    ? await sql`select alias, valor, creado from (select distinct on (dispositivo) alias, valor, creado from amazona.records where reto = ${reto} and not oculto order by dispositivo, valor asc, creado asc) t order by valor asc, creado asc limit ${n}`
    : await sql`select alias, valor, creado from (select distinct on (dispositivo) alias, valor, creado from amazona.records where reto = ${reto} and not oculto order by dispositivo, valor desc, creado asc) t order by valor desc, creado asc limit ${n}`;
  return filas.map((f, i) => ({ puesto: i + 1, alias: f.alias, valor: f.valor, fecha: dia(f.creado) }));
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  try {
    const url = new URL(req.url);
    if (req.method === 'GET') {
      const reto = url.searchParams.get('reto');
      const n = Math.min(20, Math.max(1, Number(url.searchParams.get('n')) || 10));
      if (reto) { if (!RETOS[reto]) return resp(h, { error: 'reto' }, 400); return resp({ ...h, 'Cache-Control': 'public, max-age=30' }, { reto, menor: RETOS[reto].menor, top: await top(reto, n) }); }
      const todos: Record<string, unknown> = {};
      for (const r of Object.keys(RETOS)) todos[r] = { menor: RETOS[r].menor, top: await top(r, n) };
      return resp({ ...h, 'Cache-Control': 'public, max-age=30' }, todos);
    }
    if (req.method !== 'POST') return resp(h, { error: 'metodo' }, 405);
    const len = Number(req.headers.get('content-length') || 0); if (len > 2000) return resp(h, { error: 'grande' }, 413);
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return resp(h, { error: 'json' }, 400);
    const reto = String(b.reto || ''), valor = Math.round(Number(b.valor)), dur = Math.round(Number(b.dur_ms)), alias = String(b.alias || ''), disp = String(b.dispositivo || '');
    const R = RETOS[reto];
    if (!R) return resp(h, { error: 'reto' }, 400);
    if (!Number.isFinite(valor) || !Number.isFinite(dur) || valor < R.min || valor > R.max || dur < 0 || dur > 3600000 || (R.ok && !R.ok(valor, dur))) return resp(h, { error: 'inverosimil' }, 422);
    if (!ALIAS.test(alias)) return resp(h, { error: 'alias' }, 400);
    if (!/^[A-Za-z0-9-]{16,64}$/.test(disp)) return resp(h, { error: 'dispositivo' }, 400);
    const ipCruda = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sin-ip';
    const dh = await hash('d:' + disp), ih = await hash('i:' + ipCruda);
    const [c] = await sql`select (select count(*) from amazona.records where dispositivo = ${dh} and creado > now() - interval '1 hour')::int as d, (select count(*) from amazona.records where ip = ${ih} and creado > now() - interval '1 hour')::int as i`;
    if (c.d >= 20 || c.i >= 60) return resp(h, { error: 'espera' }, 429);
    await sql`insert into amazona.records (reto, valor, dur_ms, alias, dispositivo, ip) values (${reto}, ${valor}, ${dur}, ${alias}, ${dh}, ${ih})`;
    const lista = await top(reto, 20);
    const puesto = lista.findIndex(f => f.alias === alias && f.valor === valor) + 1;
    return resp(h, { ok: true, puesto: puesto || null, top: lista.slice(0, 10) });
  } catch (e) {
    console.error(e);
    return resp(h, { error: 'servidor' }, 500);
  }
});

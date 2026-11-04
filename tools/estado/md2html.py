import re,sys,html
src,dst=sys.argv[1],sys.argv[2]
L=open(src,encoding='utf-8').read().split('\n')
# Versión pública: fuera licencias de terceros, riesgos de seguridad concretos y rutas internas sensibles
SKIP_SECC=('## 7. Modelos, recursos y licencias','## 8. Trabajo de los agentes y costos','## Anexo')
BAD=re.compile(r'KitBash|Archmodels|sin puerta de adulto|licencias? del 3D|sin documentar|kits 3D|COPPA|torrent|límites de gasto|crédito de (la )?API|limites\.json|gasto',re.I)
out=[];skip=False
for l in L:
    if l.startswith('## '): skip=l.startswith(SKIP_SECC)
    if skip or BAD.search(l): continue
    out.append(l)
def inl(t):
    t=html.escape(t,quote=False)
    t=re.sub(r'`([^`]+)`',r'<code>\1</code>',t)
    t=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',t)
    t=re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)',r'<em>\1</em>',t)
    t=re.sub(r'\[(Comprobado[^\]]*)\]',r'<span class="t ok">\1</span>',t)
    t=re.sub(r'\[(Reportado[^\]]*)\]',r'<span class="t rep">\1</span>',t)
    t=re.sub(r'\[(No verificado[^\]]*)\]',r'<span class="t no">\1</span>',t)
    return t
H=[];i=0;inlist=[];para=[]
def flushp():
    global para
    if para: H.append('<p>'+inl(' '.join(para))+'</p>'); para=[]
def closelists(n=0):
    while len(inlist)>n: H.append('</%s>'%inlist.pop())
while i<len(out):
    l=out[i]
    if l.strip().startswith('|') and i+1<len(out) and re.match(r'^\s*\|[\s:|-]+\|\s*$',out[i+1]):
        flushp();closelists()
        hdr=[c.strip() for c in l.strip().strip('|').split('|')];i+=2
        H.append('<div class="tw"><table><thead><tr>'+''.join('<th>%s</th>'%inl(c) for c in hdr)+'</tr></thead><tbody>')
        while i<len(out) and out[i].strip().startswith('|'):
            cs=[c.strip() for c in out[i].strip().strip('|').split('|')]
            H.append('<tr>'+''.join('<td>%s</td>'%inl(c) for c in cs)+'</tr>');i+=1
        H.append('</tbody></table></div>');continue
    m=re.match(r'^(#{1,4}) (.*)',l)
    if m:
        flushp();closelists();n=len(m.group(1));H.append('<h%d>%s</h%d>'%(n,inl(m.group(2)),n));i+=1;continue
    m=re.match(r'^(\s*)([-*]|\d+\.) (.*)',l)
    if m:
        flushp();depth=len(m.group(1))//2+1;tag='ol' if m.group(2)[0].isdigit() else 'ul'
        while len(inlist)<depth: H.append('<%s>'%tag);inlist.append(tag)
        closelists(depth);H.append('<li>'+inl(m.group(3))+'</li>');i+=1;continue
    if l.startswith('>'):
        flushp();closelists();H.append('<blockquote>'+inl(l.lstrip('> '))+'</blockquote>');i+=1;continue
    if l.strip()=='---': flushp();closelists();H.append('<hr>');i+=1;continue
    if not l.strip(): flushp();closelists();i+=1;continue
    closelists();para.append(l.strip());i+=1
flushp();closelists()
perfiles=open(sys.argv[3],encoding='utf-8').read()
page='''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Amazona Verse · Estado real</title>
<style>:root{--bg:#f7f4ec;--tx:#1f2a1f;--mu:#5b6b5b;--ac:#2e7d32;--bd:#d9d2c0;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#121712;--tx:#e8efe6;--mu:#9fb09f;--ac:#7bd37f;--bd:#2c372c;--card:#1a221a}}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:920px;margin:0 auto;padding:24px 16px 80px}h1{font-size:1.8rem;margin:.2em 0}h2{margin-top:2em;border-bottom:2px solid var(--bd);padding-bottom:.2em;color:var(--ac)}
h3{margin-top:1.5em}code{background:var(--card);border:1px solid var(--bd);border-radius:4px;padding:0 4px;font-size:.88em;word-break:break-word}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:.8em 0;background:var(--card)}th,td{border:1px solid var(--bd);padding:6px 8px;text-align:left;vertical-align:top;font-size:.92em}
blockquote{margin:.6em 0;padding:.4em 1em;border-left:4px solid var(--ac);background:var(--card)}.t{font-size:.75em;padding:1px 6px;border-radius:9px;white-space:nowrap}
.ok{background:#2e7d3222;color:var(--ac)}.rep{background:#b0882022;color:#b08820}.no{background:#c6282822;color:#c62828}.meta{color:var(--mu);font-size:.9em}</style></head>
<body><main><p class="meta">Página interna de trabajo (no aparece en el menú). Se actualiza sola desde el repositorio. Sin datos privados ni legales.</p>
'''+'\n'.join(H)+perfiles+'</main></body></html>'
open(dst,'w',encoding='utf-8').write(page)
print(len(out),'líneas públicas de',len(L))

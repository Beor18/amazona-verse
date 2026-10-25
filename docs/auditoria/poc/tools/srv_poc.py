"""Servidor de la PoC web: sirve una carpeta y acepta POST /__result (result.json) y /__result?captura (captura_three.png).
Uso: python -I srv_poc.py <dir> <puerto>"""
import sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=os.path.abspath(sys.argv[1]); PORT=int(sys.argv[2])
class H(SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def end_headers(s): s.send_header('Cache-Control','no-store'); super().end_headers()
    def do_POST(s):
        path,_,q=s.path.partition('?')
        if path!='/__result': s.send_error(404); return
        n=int(s.headers.get('Content-Length','0')); body=s.rfile.read(min(n,20_000_000))
        name='captura_three.png' if q.startswith('captura') else 'result.json'
        open(os.path.join(ROOT,name),'wb').write(body); s.send_response(204); s.end_headers()
    def log_message(s,*a): pass
ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()

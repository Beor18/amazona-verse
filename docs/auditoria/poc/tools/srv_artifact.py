"""Servidor de auditoría: sirve el repo como lo vería el artifact (sin .glb: 404), sin caché. Uso: python -I srv_artifact.py <dir> <puerto>"""
import sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=os.path.abspath(sys.argv[1]); PORT=int(sys.argv[2])
class H(SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def end_headers(s):
        s.send_header('Cache-Control','no-store'); super().end_headers()
    def do_GET(s):
        if s.path.split('?')[0].endswith('.glb'): s.send_error(404,'sin glb (artifact)'); return
        super().do_GET()
    def log_message(s,*a): pass
ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()

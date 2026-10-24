"""Servidor local de desarrollo y pruebas de Amazona Verse.

Sirve la carpeta del juego y acepta POST /__save?name=archivo para guardar en tests/out/
los archivos que exporta AV.selfTest({saveFiles: true}), así se pueden inspeccionar.
Uso: python3 tests/server.py [puerto]
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tests', 'out')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        name = parse_qs(url.query).get('name', [''])[0]
        if url.path != '/__save' or not re.fullmatch(r'[\w.-]{1,64}', name):
            self.send_error(400, 'nombre no valido')
            return
        size = int(self.headers.get('Content-Length', 0))
        if size > 30 * 1024 * 1024:
            self.send_error(413, 'archivo demasiado grande')
            return
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(self.rfile.read(size))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()

"""Servidor local de desarrollo y pruebas de Amazona Verse.

Sirve la carpeta del juego y acepta POST /__save?name=archivo para guardar en tests/out/
los archivos que exporta AV.selfTest({saveFiles: true}) y el informe de tests/qa/qa.js, así se pueden inspeccionar.
Con ?qa=1 en la URL de index.html inyecta tests/qa/qa.js en <head>, justo tras <meta charset> (la batería corre sola);
index.html no se toca en disco.
Uso: <python> tests/server.py [puerto]
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tests', 'out')
QA_TAG = b'<script src="tests/qa/qa.js" charset="utf-8"></script>'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path in ('/', '/index.html') and parse_qs(url.query).get('qa', [''])[0] == '1':
            try:
                with open(os.path.join(ROOT, 'index.html'), 'rb') as f:
                    html = f.read()
            except OSError:
                self.send_error(404, 'sin index.html')
                return
            # Tras <meta charset>, <head>, <html> o el doctype (nunca antes del doctype: pasaría a modo quirks)
            for pat in (rb'<meta\s+charset[^>]*>', rb'<head[^>]*>', rb'<html[^>]*>', rb'<!doctype[^>]*>'):
                html, n = re.subn(pat, lambda m: m.group(0) + QA_TAG, html, count=1, flags=re.I)
                if n:
                    break
            else:
                html = QA_TAG + html
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return
        super().do_GET()

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

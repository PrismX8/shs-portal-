import http.server
import mimetypes
import socketserver
from functools import partial
from pathlib import Path


mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/wasm", ".wasm")

PORT = 3000
BASE_DIR = Path(__file__).resolve().parent
Handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(BASE_DIR))

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    httpd.serve_forever()

#!/usr/bin/env python3
"""Dev server: serves static files + proxies API calls to fal.ai, Gemini, Grok."""
import json, urllib.request, sys, os
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Load .env from same directory
def load_env():
    env_path = os.path.join(os.path.dirname(__file__) or '.', '.env')
    keys = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    keys[k.strip()] = v.strip().strip('"').strip("'")
    return keys

ENV = load_env()

def get_key(name):
    return ENV.get(name) or os.environ.get(name)

class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode() if isinstance(body, dict) else body)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))

        # ── fal.ai proxy ──
        if self.path == '/api/fal':
            endpoint = body.pop('_endpoint', '')
            fal_key = get_key('FAL_API_KEY')
            if not fal_key:
                return self._respond(500, {'error': 'FAL_API_KEY not set in .env'})
            req = urllib.request.Request(
                f'https://fal.run/{endpoint}',
                data=json.dumps(body).encode(),
                headers={'Authorization': f'Key {fal_key}', 'Content-Type': 'application/json'}
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    self._respond(200, json.loads(resp.read()))
            except urllib.error.HTTPError as e:
                err = e.read().decode() if e.fp else str(e)
                self._respond(e.code, {'error': err})
            except Exception as e:
                self._respond(500, {'error': str(e)})

        # ── Gemini proxy ──
        elif self.path == '/api/gemini':
            model = body.pop('_model', 'gemini-3.1-flash-image-preview')
            gemini_key = get_key('GEMINI_API_KEY')
            if not gemini_key:
                return self._respond(500, {'error': 'GEMINI_API_KEY not set in .env'})
            req = urllib.request.Request(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                data=json.dumps(body).encode(),
                headers={'x-goog-api-key': gemini_key, 'Content-Type': 'application/json'}
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    self._respond(200, json.loads(resp.read()))
            except urllib.error.HTTPError as e:
                err = e.read().decode() if e.fp else str(e)
                self._respond(e.code, {'error': err})
            except Exception as e:
                self._respond(500, {'error': str(e)})

        # ── Grok proxy ──
        elif self.path == '/api/grok':
            grok_key = get_key('GROK_API_KEY')
            if not grok_key:
                return self._respond(500, {'error': 'GROK_API_KEY not set in .env'})
            req = urllib.request.Request(
                'https://api.x.ai/v1/chat/completions',
                data=json.dumps(body).encode(),
                headers={'Authorization': f'Bearer {grok_key}', 'Content-Type': 'application/json'}
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    self._respond(200, json.loads(resp.read()))
            except urllib.error.HTTPError as e:
                err = e.read().decode() if e.fp else str(e)
                self._respond(e.code, {'error': err})
            except Exception as e:
                self._respond(500, {'error': str(e)})

        else:
            self.send_error(404)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
missing = [k for k in ['FAL_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY'] if not get_key(k)]
print(f'\n  Serving prototype at http://localhost:{port}/workspace-v1.html')
if missing:
    print(f'  Missing keys in .env: {", ".join(missing)}')
print()
HTTPServer(('', port), Handler).serve_forever()

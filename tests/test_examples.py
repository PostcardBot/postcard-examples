import base64
import hashlib
import hmac
import importlib.util
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
os.environ['WEBHOOK_SECRET'] = 'whsec_offline_fixture'
spec = importlib.util.spec_from_file_location('receiver', ROOT / 'python/webhooks_server.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)

def signed(body, timestamp=None):
    timestamp = str(int(time.time()) if timestamp is None else timestamp)
    digest = hmac.new(os.environ['WEBHOOK_SECRET'].encode(), timestamp.encode() + b'.' + body, hashlib.sha256).digest()
    return f't={timestamp},v1={base64.b64encode(digest).decode()}'

class Examples(unittest.TestCase):
    def test_webhook_signatures_and_envelope(self):
        raw = json.dumps({'event': 'postcard.sent', 'data': {'postcard_id': 'api_fixture', 'message': 'Hello 🌊'}}, ensure_ascii=False).encode()
        self.assertTrue(receiver.verify_signature(raw, signed(raw)))
        for header in ['', 't=NaN,v1=x', signed(raw)[:-3], signed(raw) + ',v1=bad', signed(raw, int(time.time())-301), signed(raw, int(time.time()*1000))]:
            self.assertFalse(receiver.verify_signature(raw, header))
        self.assertFalse(receiver.verify_signature(b'changed', signed(raw)))
        client = receiver.app.test_client()
        self.assertEqual(client.post('/webhooks', data=raw, content_type='application/json', headers={'X-PostcardBot-Signature': signed(raw)}).status_code, 200)
        bulk = json.dumps({'event': 'postcard.sent', 'data': {'is_bulk': True, 'bulk_id': 'bulk_fixture'}}).encode()
        self.assertEqual(client.post('/webhooks', data=bulk, content_type='application/json', headers={'X-PostcardBot-Signature': signed(bulk)}).status_code, 200)
        self.assertEqual(client.post('/webhooks', data=b'{invalid', content_type='application/json', headers={'X-PostcardBot-Signature': signed(b'{invalid')}).status_code, 400)
        self.assertEqual(client.post('/webhooks', data=raw, content_type='application/json', headers={'X-PostcardBot-Signature': 't=NaN,v1=x'}).status_code, 401)

    def test_cli_against_local_api(self):
        calls = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def respond(self):
                body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
                calls.append((self.path, json.loads(body) if body else None))
                status = 200
                if self.path.endswith('/preview'): data = {'will_send': False, 'price': 1.99}
                elif self.path == '/api/v1/postcards':
                    status = 202
                    data = {'id': 'api_fixture', 'status': 'pending_review', 'price': 1.99, 'balance_remaining': 8.01}
                elif self.path == '/api/v1/postcards/bulk': data = {'bulk_id': 'bulk_fixture', 'total': 1, 'total_cost': 1.99, 'status': 'queued'}
                elif self.path.endswith('/bulk_fixture'): data = {'bulk_id': 'bulk_fixture', 'status': 'processing', 'total': 1, 'processed': 1, 'succeeded': 0, 'failed': 0}
                elif self.path.endswith('/missing'):
                    status = 404
                    data = {'error': 'Postcard not found'}
                elif self.path == '/api/v1/balance': data = {'balance': 10, 'current_pricing': {'usa': 1.99, 'international': 2.79}}
                elif self.path == '/api/v1/pricing': data = {'postcards': {'usa': {'price': 2.99}}}
                elif self.path.startswith('/api/v1/webhooks'): data = {'id': 'wh_fixture', 'secret': 'whsec_fixture'}
                else: data = {'id': 'api_fixture', 'status': 'failed', 'error': 'Invalid recipient address', 'refund': {'amount': 1.99}, 'to': {}}
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
            do_POST = respond
            do_GET = respond
            do_DELETE = respond
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        env = {**os.environ, 'POSTCARDBOT_API_KEY': 'pk_live_fixture', 'POSTCARDBOT_API_URL': f'http://127.0.0.1:{server.server_port}'}
        def run(file, *args):
            return subprocess.run([sys.executable, str(ROOT / 'python' / file), *map(str, args)], env=env, capture_output=True, text=True, timeout=10)
        try:
            self.assertIn('Preview only', run('preview_postcard.py').stdout)
            self.assertEqual(calls[-1][0], '/api/v1/postcards/preview')
            self.assertIn('pending_review', run('send_postcard.py').stdout)
            self.assertEqual(calls[-1][1]['from']['country'], 'US')
            self.assertIn('bulk_fixture', run('bulk_send.py', ROOT / 'tests/quoted.csv').stdout)
            self.assertEqual(calls[-1][1]['recipients'][0]['name'], 'Example, Inc.')
            self.assertIn('bulk_fixture', run('check_status.py', 'bulk_fixture').stdout)
            self.assertIn('Invalid recipient address', run('check_status.py', 'api_fixture').stdout)
            self.assertIn('current_pricing', run('check_balance.py').stdout)
            self.assertNotEqual(run('check_status.py', 'missing').returncode, 0)
            bash = 'C:/Program Files/Git/bin/bash.exe' if os.name == 'nt' else shutil.which('bash')
            if bash and Path(bash).exists():
                def shell(file, *args):
                    # Pass values through the environment so Windows/MSYS argv
                    # quoting does not alter embedded quotes before Bash sees them.
                    script_env = {**env, 'PYTHON': sys.executable, 'SCRIPT': (ROOT / 'curl' / file).as_posix()}
                    script_env.update({f'ARG{i}': value for i, value in enumerate(args)})
                    command = 'exec bash "$SCRIPT"' + ''.join(f' "$ARG{i}"' for i in range(len(args)))
                    return subprocess.run([bash, '-c', command], env=script_env, capture_output=True, text=True, timeout=15)
                for file, expected in [('preview-postcard.sh', '/api/v1/postcards/preview'), ('send-postcard.sh', '/api/v1/postcards'), ('bulk-send.sh', '/api/v1/postcards/bulk'), ('check-balance.sh', '/api/v1/balance'), ('check-pricing.sh', '/api/v1/pricing')]:
                    result = shell(file)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(calls[-1][0], expected)
                self.assertEqual(shell('check-status.sh', 'bulk_fixture').returncode, 0)
                self.assertNotEqual(shell('check-status.sh', 'missing').returncode, 0)
                for args in [('list',), ('create', 'https://example.invalid/webhooks?label="quoted"'), ('delete', 'wh_fixture')]:
                    result = shell('webhooks.sh', *args)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    if args[0] == 'create':
                        self.assertEqual(calls[-1][1]['url'], args[1])
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

if __name__ == '__main__':
    unittest.main()

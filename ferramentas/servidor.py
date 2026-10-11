import http.server, os, sys, urllib.parse
ROOT = sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_POST(s):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(s.path).query)
        name = os.path.basename(q['name'][0])
        data = s.rfile.read(int(s.headers['Content-Length']))
        open(os.path.join(ROOT, name), 'wb').write(data)
        s.send_response(200); s.end_headers(); s.wfile.write(str(len(data)).encode())
http.server.ThreadingHTTPServer(('127.0.0.1', 8770), H).serve_forever()

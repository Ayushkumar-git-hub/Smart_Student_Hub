"""Run the single-student edition using Python's standard library."""
import argparse
import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "www"
DATABASE = ROOT / "student_hub.sqlite3"
MAX_BYTES = 1_500_000


def init_db(path):
    with sqlite3.connect(path) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS workspace (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                revision INTEGER NOT NULL,
                body TEXT NOT NULL
            )
        """)


def read_workspace(path):
    with sqlite3.connect(path) as db:
        row = db.execute("SELECT revision, body FROM workspace WHERE id = 1").fetchone()
    if row is None:
        return {"revision": 0, "state": None}
    return {"revision": row[0], "state": json.loads(row[1])}


def write_workspace(path, version, state):
    """A stale write returns None so the client can reapply its single change."""
    text = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    with sqlite3.connect(path, timeout=10) as db:
        if version == 0:
            cursor = db.execute("INSERT OR IGNORE INTO workspace VALUES (1, 1, ?)", (text,))
        else:
            cursor = db.execute(
                "UPDATE workspace SET revision = revision + 1, body = ? WHERE id = 1 AND revision = ?",
                (text, version),
            )
        if cursor.rowcount != 1:
            return None
    return version + 1


def valid_packet(packet):
    if not isinstance(packet, dict):
        return False
    revision, state = packet.get("revision"), packet.get("state")
    if type(revision) is not int or revision < 0 or not isinstance(state, dict):
        return False
    profile = state.get("profile")
    return (
        isinstance(profile, dict) and isinstance(profile.get("name"), str)
        and bool(profile["name"].strip())
        and all(isinstance(state.get(k), list) for k in ("items", "goals", "notices"))
        and isinstance(state.get("dismissed"), dict)
    )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def json_response(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "private, no-store")
        self.end_headers()
        self.wfile.write(body)

    def valid_host(self):
        try:
            return urlsplit("//" + self.headers.get("Host", "")).hostname in ("localhost", "127.0.0.1", "::1")
        except ValueError:
            return False

    def do_GET(self):
        if not self.valid_host():
            return self.json_response(403, {"error": "Open this project on localhost."})
        if urlsplit(self.path).path == "/api/workspace":
            return self.json_response(200, read_workspace(DATABASE))
        return super().do_GET()

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/workspace":
            return self.json_response(404, {"error": "Unknown route."})
        origin = self.headers.get("Origin")
        if not self.valid_host() or (origin and urlsplit(origin).netloc != self.headers.get("Host")):
            return self.json_response(403, {"error": "Use the local project address."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = -1
        if not 0 < size <= MAX_BYTES:
            return self.json_response(413, {"error": "Invalid request size."})
        try:
            packet = json.loads(self.rfile.read(size))
        except (ValueError, UnicodeError):
            return self.json_response(400, {"error": "Invalid JSON."})
        if not valid_packet(packet):
            return self.json_response(400, {"error": "Invalid workspace."})
        revision = write_workspace(DATABASE, packet["revision"], packet["state"])
        if revision is None:
            return self.json_response(409, {"error": "The workspace changed in another tab."})
        self.json_response(200, {"revision": revision})

    def list_directory(self, path):
        self.send_error(404)
        return None


def main():
    parser = argparse.ArgumentParser(description="Start your local Smart Student Hub")
    parser.add_argument("--port", type=int, default=8000, help="local port (default 8000)")
    args = parser.parse_args()
    if not (PUBLIC / "index.html").is_file():
        parser.exit(1, "Extract the complete ZIP and keep the www folder next to run.py.\n")
    init_db(DATABASE)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as exc:
        parser.exit(1, "Could not start: " + str(exc) + ". Try python3 run.py --port 8001\n")
    print("Smart Student Hub is running at http://127.0.0.1:" + str(server.server_address[1]), flush=True)
    print("Press Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

"""Run Smart Student Hub using Python's standard library."""
import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "www"
DATA_DIR = Path(os.environ.get("HUB_DATA_DIR", ROOT))
DATABASE = DATA_DIR / "student_hub.sqlite3"
MAX_BYTES = 1_500_000
PASSWORD_ROUNDS = 310_000
SESSION_SECONDS = 14 * 24 * 60 * 60
INVITE_SECONDS = 7 * 24 * 60 * 60


def init_db(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS workspace (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                revision INTEGER NOT NULL,
                body TEXT NOT NULL
            )
        """)
        db.executescript("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS account_invites (
                id INTEGER PRIMARY KEY,
                code_hash TEXT NOT NULL UNIQUE,
                created_by INTEGER NOT NULL REFERENCES accounts(id),
                expires_at INTEGER NOT NULL,
                used_at INTEGER,
                used_by INTEGER REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS auth_sessions_expiry
                ON auth_sessions(expires_at);
            CREATE TABLE IF NOT EXISTS user_workspace (
                user_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
                revision INTEGER NOT NULL,
                body TEXT NOT NULL
            );
        """)


def read_user_workspace(path, user_id):
    with sqlite3.connect(path) as db:
        row = db.execute(
            "SELECT revision, body FROM user_workspace WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        return {"revision": 0, "state": None}
    return {"revision": row[0], "state": json.loads(row[1])}


def write_user_workspace(path, user_id, version, state):
    text = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    with sqlite3.connect(path, timeout=10) as db:
        if version == 0:
            cursor = db.execute(
                "INSERT OR IGNORE INTO user_workspace VALUES (?, 1, ?)",
                (user_id, text),
            )
        else:
            cursor = db.execute(
                """UPDATE user_workspace SET revision = revision + 1, body = ?
                   WHERE user_id = ? AND revision = ?""",
                (text, user_id, version),
            )
        if cursor.rowcount != 1:
            return None
    return version + 1


def password_digest(password, salt):
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ROUNDS
    ).hex()


def valid_username(value):
    return isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9._-]{3,32}", value) is not None


def valid_password(value):
    return isinstance(value, str) and 12 <= len(value) <= 256


def token_digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def create_session(path, account_id):
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + SESSION_SECONDS
    with sqlite3.connect(path) as db:
        db.execute(
            "INSERT INTO auth_sessions VALUES (?, ?, ?)",
            (token_digest(token), account_id, expires_at),
        )
        db.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (int(time.time()),))
    return token, expires_at


def create_account(path, username, password, is_admin=False, invite=None):
    username = username.lower()
    salt = secrets.token_hex(16)
    digest = password_digest(password, salt)
    now = int(time.time())
    with sqlite3.connect(path, timeout=10) as db:
        db.execute("BEGIN IMMEDIATE")
        if is_admin:
            if db.execute("SELECT 1 FROM accounts LIMIT 1").fetchone():
                return None
        elif invite is not None:
            row = db.execute(
                """SELECT id FROM account_invites
                   WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?""",
                (token_digest(invite), now),
            ).fetchone()
            if row is None:
                return None
        elif db.execute("SELECT 1 FROM accounts WHERE is_admin = 1 LIMIT 1").fetchone() is None:
            return None
        try:
            cursor = db.execute(
                """INSERT INTO accounts
                   (username, password_hash, salt, is_admin, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (username, digest, salt, int(is_admin), now),
            )
        except sqlite3.IntegrityError:
            return None
        account_id = cursor.lastrowid
        if not is_admin and invite is not None:
            changed = db.execute(
                """UPDATE account_invites SET used_at = ?, used_by = ?
                   WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?""",
                (now, account_id, token_digest(invite), now),
            ).rowcount
            if changed != 1:
                return None
        elif is_admin and db.execute("SELECT 1 FROM workspace WHERE id = 1").fetchone():
            revision, body = db.execute(
                "SELECT revision, body FROM workspace WHERE id = 1"
            ).fetchone()
            db.execute(
                "INSERT INTO user_workspace VALUES (?, ?, ?)",
                (account_id, revision, body),
            )
    return account_id


def make_invite(path, account_id):
    code = secrets.token_urlsafe(24)
    with sqlite3.connect(path) as db:
        db.execute(
            "INSERT INTO account_invites (code_hash, created_by, expires_at) VALUES (?, ?, ?)",
            (token_digest(code), account_id, int(time.time()) + INVITE_SECONDS),
        )
    return code


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

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Content-Security-Policy", (
            "default-src 'self'; base-uri 'self'; form-action 'self'; "
            "frame-ancestors 'none'; object-src 'none'; "
            "style-src 'self' 'unsafe-inline'; script-src 'self'; "
            "connect-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self'"
        ))
        if urlsplit(self.path).path in ("/accounts", "/accounts.html", "/accounts.js"):
            self.send_header("Cache-Control", "private, no-store")
        super().end_headers()

    def json_response(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "private, no-store")
        self.end_headers()
        self.wfile.write(body)

    def secure_request(self):
        return (
            self.headers.get("X-Forwarded-Proto", "").lower() == "https"
            or not os.environ.get("RAILWAY_ENVIRONMENT")
        )

    def valid_origin(self):
        origin = self.headers.get("Origin")
        try:
            return (
                origin is not None
                and urlsplit(origin).scheme in ("http", "https")
                and urlsplit(origin).netloc.lower() == self.headers.get("Host", "").lower()
            )
        except ValueError:
            return False

    def request_json(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = -1
        if not 0 < size <= MAX_BYTES:
            self.json_response(413, {"error": "Invalid request size."})
            return None
        try:
            packet = json.loads(self.rfile.read(size))
        except (ValueError, UnicodeError):
            self.json_response(400, {"error": "Invalid JSON."})
            return None
        if not isinstance(packet, dict):
            self.json_response(400, {"error": "Invalid request."})
            return None
        return packet

    def account(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
            token = cookie["hub_session"].value
        except (CookieError, KeyError, ValueError):
            return None
        with sqlite3.connect(DATABASE) as db:
            row = db.execute(
                """SELECT accounts.id, accounts.username, accounts.is_admin
                   FROM auth_sessions JOIN accounts ON accounts.id = auth_sessions.account_id
                   WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?""",
                (token_digest(token), int(time.time())),
            ).fetchone()
        return {"id": row[0], "username": row[1], "is_admin": bool(row[2])} if row else None

    def mutation_allowed(self):
        if not self.valid_origin():
            self.json_response(403, {"error": "Invalid request origin."})
            return False
        if not self.secure_request():
            self.json_response(400, {"error": "Use a secure HTTPS connection."})
            return False
        return True

    def set_session_cookie(self, token):
        secure = (
            self.headers.get("X-Forwarded-Proto", "").lower() == "https"
            or bool(os.environ.get("RAILWAY_ENVIRONMENT"))
        )
        value = (
            "hub_session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age="
            + str(SESSION_SECONDS)
        )
        if secure:
            value += "; Secure"
        self.send_header("Set-Cookie", value)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/accounts":
            self.path = "/accounts.html"
            return super().do_GET()
        if path == "/api/auth/status":
            with sqlite3.connect(DATABASE) as db:
                has_accounts = db.execute("SELECT 1 FROM accounts LIMIT 1").fetchone() is not None
            account = self.account()
            return self.json_response(200, {
                "setupRequired": not has_accounts,
                "setupEnabled": bool(os.environ.get("HUB_SETUP_KEY")),
                "authenticated": account is not None,
                "username": account["username"] if account else None,
                "isAdmin": account["is_admin"] if account else False,
            })
        if path == "/api/workspace":
            account = self.account()
            if not account:
                return self.json_response(401, {"error": "Sign in to open your workspace."})
            return self.json_response(200, read_user_workspace(DATABASE, account["id"]))
        return super().do_GET()

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/workspace":
            return self.json_response(404, {"error": "Unknown route."})
        if not self.mutation_allowed():
            return
        account = self.account()
        if not account:
            return self.json_response(401, {"error": "Sign in to save your workspace."})
        packet = self.request_json()
        if packet is None:
            return
        if not valid_packet(packet):
            return self.json_response(400, {"error": "Invalid workspace."})
        revision = write_user_workspace(
            DATABASE, account["id"], packet["revision"], packet["state"]
        )
        if revision is None:
            return self.json_response(409, {"error": "The workspace changed in another tab."})
        self.json_response(200, {"revision": revision})

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in (
            "/api/auth/setup", "/api/auth/login", "/api/auth/register",
            "/api/auth/logout", "/api/admin/invites",
        ):
            return self.json_response(404, {"error": "Unknown route."})
        if not self.mutation_allowed():
            return
        packet = self.request_json()
        if packet is None:
            return
        if path == "/api/auth/logout":
            account = self.account()
            if account:
                try:
                    cookie = SimpleCookie()
                    cookie.load(self.headers.get("Cookie", ""))
                    token = cookie["hub_session"].value
                    with sqlite3.connect(DATABASE) as db:
                        db.execute(
                            "DELETE FROM auth_sessions WHERE token_hash = ?",
                            (token_digest(token),),
                        )
                except (CookieError, KeyError, ValueError):
                    pass
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "private, no-store")
            self.send_header(
                "Set-Cookie",
                "hub_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
                + ("; Secure" if os.environ.get("RAILWAY_ENVIRONMENT") else ""),
            )
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        if path == "/api/auth/status":
            return self.json_response(404, {"error": "Unknown route."})
        if path == "/api/auth/setup":
            return self.create_admin(packet)
        if path == "/api/auth/login":
            return self.login(packet)
        if path == "/api/auth/register":
            return self.register(packet)
        if path == "/api/admin/invites":
            account = self.account()
            if not account:
                return self.json_response(401, {"error": "Sign in first."})
            if not account["is_admin"]:
                return self.json_response(403, {"error": "Administrator access is required."})
            return self.json_response(201, {"invite": make_invite(DATABASE, account["id"])})

    def create_admin(self, packet):
        expected = os.environ.get("HUB_SETUP_KEY", "")
        setup_key = packet.get("setupKey", "")
        username, password = packet.get("username"), packet.get("password")
        if not expected:
            return self.json_response(503, {"error": "Administrator setup is not enabled."})
        if not isinstance(setup_key, str) or not hmac.compare_digest(setup_key, expected):
            return self.json_response(403, {"error": "Invalid setup key."})
        if not valid_username(username) or not valid_password(password):
            return self.json_response(
                400, {"error": "Use a 3–32 character username and a 12–256 character password."}
            )
        account_id = create_account(DATABASE, username, password, is_admin=True)
        if account_id is None:
            return self.json_response(409, {"error": "Administrator setup is already complete."})
        os.environ.pop("HUB_SETUP_KEY", None)
        return self.login({"username": username, "password": password})

    def login(self, packet):
        username, password = packet.get("username"), packet.get("password")
        if not isinstance(username, str) or not isinstance(password, str):
            return self.json_response(400, {"error": "Enter your username and password."})
        with sqlite3.connect(DATABASE) as db:
            row = db.execute(
                "SELECT id, password_hash, salt FROM accounts WHERE username = ?",
                (username.lower(),),
            ).fetchone()
        candidate = password_digest(password, row[2] if row else "00" * 16)
        if not row or not hmac.compare_digest(candidate, row[1]):
            return self.json_response(401, {"error": "Username or password is incorrect."})
        token, _ = create_session(DATABASE, row[0])
        body = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "private, no-store")
        self.set_session_cookie(token)
        self.end_headers()
        self.wfile.write(body)

    def register(self, packet):
        username, password, invite = (
            packet.get("username"), packet.get("password"), packet.get("invite")
        )
        if not valid_username(username) or not valid_password(password) or (
            invite is not None and not isinstance(invite, str)
        ):
            return self.json_response(
                400, {"error": "Enter a 3–32 character username and a 12–256 character password."}
            )
        account_id = create_account(DATABASE, username, password, invite=invite)
        if account_id is None:
            return self.json_response(
                400, {"error": "Account could not be created. Check the username and invite if provided."}
            )
        return self.login({"username": username, "password": password})

    def list_directory(self, path):
        self.send_error(404)
        return None


def main():
    parser = argparse.ArgumentParser(description="Start Smart Student Hub")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    args = parser.parse_args()
    if not (PUBLIC / "index.html").is_file():
        parser.exit(1, "Extract the complete ZIP and keep the www folder next to run.py.\n")
    init_db(DATABASE)
    try:
        host = "0.0.0.0" if os.environ.get("RAILWAY_ENVIRONMENT") else "127.0.0.1"
        server = ThreadingHTTPServer((host, args.port), Handler)
    except OSError as exc:
        parser.exit(1, "Could not start: " + str(exc) + ". Try python3 run.py --port 8001\n")
    print("Smart Student Hub is running on port " + str(server.server_address[1]), flush=True)
    print("Press Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

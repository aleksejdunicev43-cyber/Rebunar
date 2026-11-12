"""Explicit, backed-up SQLite migrations for Webtoon tables only."""
import hashlib
import re
import sqlite3
import time
from pathlib import Path
from .config import BACKUP_DIR, MIGRATIONS_DIR

NAME = re.compile(r"^(\d{3})_[a-z0-9_]+\.sql$")

class MigrationError(RuntimeError):
    pass

def discover():
    return [(int(m.group(1)), p) for p in sorted(MIGRATIONS_DIR.glob("*.sql")) if (m := NAME.match(p.name))]

def _open(db):
    path = Path(db)
    if not path.is_file():
        raise MigrationError(f"Database file not found: {path}")
    con = sqlite3.connect(path, timeout=30)
    con.execute("PRAGMA foreign_keys = ON")
    return con

def _applied(con):
    exists = con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='wt_schema_migrations'").fetchone()
    if not exists:
        return {}
    return {int(v): (n, checksum) for v, n, checksum in con.execute(
        "SELECT version, name, checksum FROM wt_schema_migrations"
    )}

def status(db):
    items = discover()
    con = _open(db)
    try:
        applied = _applied(con)
        return {
            "applied": sorted(applied),
            "pending": [v for v, _ in items if v not in applied],
            "current": max(applied) if applied else 0,
            "latest": items[-1][0] if items else 0,
        }
    finally:
        con.close()

def _backup(db):
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    target = BACKUP_DIR / f"rebunar-pre-webtoon-{time.strftime('%Y%m%d-%H%M%S')}.db"
    src = sqlite3.connect(db)
    dst = sqlite3.connect(target)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    return str(target)

def up(db, make_backup=True):
    items = discover()
    con = _open(db)
    try:
        if not con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").fetchone():
            raise MigrationError("The existing Rebunar users table was not found")
        applied = _applied(con)
        for version, path in items:
            if version in applied:
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if applied[version][1] != digest:
                    raise MigrationError(f"Applied migration was modified: {path.name}")
        pending = [(v, p) for v, p in items if v not in applied]
        if not pending:
            return {"applied_now": [], "backup": None}
        con.close()
        backup = _backup(db) if make_backup else None
        con = _open(db)
        con.execute("""CREATE TABLE IF NOT EXISTS wt_schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            checksum TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        done = []
        for version, path in pending:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            name = path.stem[4:]
            sql = path.read_text(encoding="utf-8")
            try:
                con.executescript(
                    "BEGIN;\n" + sql +
                    f"\nINSERT INTO wt_schema_migrations(version,name,checksum) "
                    f"VALUES({version},'{name}','{digest}');\nCOMMIT;"
                )
            except Exception as exc:
                try:
                    con.rollback()
                except sqlite3.Error:
                    pass
                raise MigrationError(f"{path.name} failed and was rolled back: {exc}") from exc
            done.append(version)
        violations = con.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise MigrationError(f"Foreign-key check failed: {len(violations)} violation(s)")
        return {"applied_now": done, "backup": backup}
    finally:
        con.close()

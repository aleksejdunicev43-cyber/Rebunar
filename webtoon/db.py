import sqlite3
from pathlib import Path

_path_getter = None

def configure(path_getter):
    global _path_getter
    _path_getter = path_getter

def db_path():
    if _path_getter is None:
        raise RuntimeError("Webtoon: database path is not configured")
    return Path(_path_getter())

def connect():
    con = sqlite3.connect(db_path(), timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

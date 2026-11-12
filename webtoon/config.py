from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
BACKUP_DIR = BASE / "backups"

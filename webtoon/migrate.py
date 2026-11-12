"""Run: python -m webtoon.migrate status|up [--db PATH] [--no-backup]"""
import argparse
import json
from pathlib import Path
from . import migrations
from .config import BASE

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("status", "up"))
    parser.add_argument("--db", default=str(BASE / "rebunar.db"))
    parser.add_argument("--no-backup", action="store_true")
    args = parser.parse_args()
    try:
        result = migrations.status(args.db) if args.command == "status" else migrations.up(
            args.db, make_backup=not args.no_backup
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except migrations.MigrationError as exc:
        parser.exit(1, f"Webtoon migration error: {exc}\n")

if __name__ == "__main__":
    raise SystemExit(main())

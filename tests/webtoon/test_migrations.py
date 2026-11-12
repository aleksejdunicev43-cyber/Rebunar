import sqlite3
import tempfile
import unittest
from pathlib import Path

from webtoon import migrations


class WebtoonMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "rebunar-test.db"
        with sqlite3.connect(self.db) as con:
            con.execute(
                "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE)"
            )
            con.execute("INSERT INTO users(username) VALUES ('existing-account')")

    def tearDown(self):
        self.temp.cleanup()

    def test_migrations_create_webtoon_tables_without_replacing_accounts(self):
        result = migrations.up(self.db, make_backup=False)
        self.assertEqual(result["applied_now"], [1, 2, 3, 4])
        state = migrations.status(self.db)
        self.assertEqual(state["pending"], [])
        self.assertEqual(state["current"], 4)

        with sqlite3.connect(self.db) as con:
            self.assertEqual(con.execute("SELECT username FROM users").fetchone()[0], "existing-account")
            tables = {
                row[0] for row in con.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'wt_%'"
                )
            }
            self.assertIn("wt_works", tables)
            self.assertIn("wt_genres", tables)
            self.assertIn("wt_library", tables)
            self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_running_migrations_twice_is_safe(self):
        migrations.up(self.db, make_backup=False)
        second = migrations.up(self.db, make_backup=False)
        self.assertEqual(second["applied_now"], [])

    def test_migration_requires_existing_rebunar_users_table(self):
        empty_db = Path(self.temp.name) / "empty.db"
        sqlite3.connect(empty_db).close()
        with self.assertRaises(migrations.MigrationError):
            migrations.up(empty_db, make_backup=False)


if __name__ == "__main__":
    unittest.main()

import sqlite3
import tempfile
import unittest
from pathlib import Path

from flask import Flask

from reader_helpers import reader_user_required, reader_work_dict
from reader_library_routes import register_reader_library_routes


class ReaderLibraryRoutesTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "reader-test.db"
        self.app = Flask(__name__)
        self.app.secret_key = "reader-library-test"

        def connect():
            return sqlite3.connect(self.db_path)

        def ensure_reader_tables():
            with connect() as con:
                con.executescript("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY,
                        username TEXT NOT NULL,
                        display_name TEXT
                    );
                    CREATE TABLE IF NOT EXISTS reader_works (
                        id INTEGER PRIMARY KEY,
                        author_id INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL DEFAULT '',
                        category TEXT NOT NULL,
                        cover_path TEXT,
                        status TEXT NOT NULL,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        published_at TEXT
                    );
                    CREATE TABLE IF NOT EXISTS reader_library (
                        user_id INTEGER NOT NULL,
                        work_id INTEGER NOT NULL,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY(user_id, work_id)
                    );
                """)

        self.connect = connect
        self.ensure_reader_tables = ensure_reader_tables
        ensure_reader_tables()
        with connect() as con:
            con.execute(
                "INSERT INTO users (id, username, display_name) VALUES (1, 'reader', 'Reader')"
            )
            con.execute("""
                INSERT INTO reader_works
                    (id, author_id, title, description, category, status)
                VALUES
                    (10, 1, 'Published story', 'Description', 'novel', 'published'),
                    (11, 1, 'Draft story', '', 'webtoon', 'draft')
            """)

        register_reader_library_routes(
            self.app,
            connect,
            ensure_reader_tables,
            reader_user_required,
            reader_work_dict,
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def sign_in(self):
        with self.client.session_transaction() as session:
            session["user_id"] = 1

    def test_library_requires_login(self):
        response = self.client.get("/api/reader/library")
        self.assertEqual(response.status_code, 401)

    def test_add_list_and_remove_published_work(self):
        self.sign_in()
        added = self.client.post("/api/reader/works/10/library")
        self.assertEqual(added.status_code, 200)
        self.assertTrue(added.get_json()["saved"])

        listed = self.client.get("/api/reader/library")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([item["id"] for item in listed.get_json()], [10])

        removed = self.client.delete("/api/reader/works/10/library")
        self.assertEqual(removed.status_code, 200)
        self.assertFalse(removed.get_json()["saved"])
        self.assertEqual(self.client.get("/api/reader/library").get_json(), [])

    def test_draft_cannot_be_added(self):
        self.sign_in()
        response = self.client.post("/api/reader/works/11/library")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()

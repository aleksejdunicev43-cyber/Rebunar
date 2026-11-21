import sqlite3
import tempfile
import unittest
from pathlib import Path

from flask import Flask

from reader_helpers import reader_user_required
from reader_studio_edit_routes import register_reader_studio_edit_routes


class ReaderStudioEditRoutesTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "reader-studio.db"
        self.app = Flask(__name__)
        self.app.secret_key = "reader-studio-test"

        def connect():
            return sqlite3.connect(self.db_path)

        def ensure_reader_tables():
            with connect() as con:
                con.executescript("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY,
                        username TEXT NOT NULL
                    );
                    CREATE TABLE IF NOT EXISTS reader_works (
                        id INTEGER PRIMARY KEY,
                        author_id INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL DEFAULT '',
                        category TEXT NOT NULL,
                        status TEXT NOT NULL,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS reader_chapters (
                        id INTEGER PRIMARY KEY,
                        work_id INTEGER NOT NULL,
                        chapter_number INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL DEFAULT '',
                        status TEXT NOT NULL DEFAULT 'draft',
                        published_at TEXT
                    );
                    CREATE TABLE IF NOT EXISTS reader_pages (
                        id INTEGER PRIMARY KEY,
                        chapter_id INTEGER NOT NULL,
                        page_number INTEGER NOT NULL,
                        image_path TEXT NOT NULL
                    );
                """)

        self.connect = connect
        self.ensure_reader_tables = ensure_reader_tables
        ensure_reader_tables()
        with connect() as con:
            con.executemany(
                "INSERT INTO users (id, username) VALUES (?, ?)",
                [(1, "author"), (2, "other")],
            )
            con.executemany("""
                INSERT INTO reader_works (id, author_id, title, description, category, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, [
                (10, 1, "My novel", "Old description", "novel", "published"),
                (20, 2, "Other work", "", "novel", "draft"),
                (30, 1, "My webtoon", "", "webtoon", "published"),
            ])
            con.executemany("""
                INSERT INTO reader_chapters
                    (id, work_id, chapter_number, title, content, status, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                (100, 10, 1, "First", "Old text", "published", "2026-01-01"),
                (200, 20, 1, "Private", "Secret", "draft", None),
                (300, 30, 1, "Episode", "", "published", "2026-01-01"),
            ])
            con.execute(
                "INSERT INTO reader_pages (id, chapter_id, page_number, image_path) VALUES (1, 300, 1, '/page.webp')"
            )

        register_reader_studio_edit_routes(
            self.app, connect, ensure_reader_tables, reader_user_required
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def sign_in(self):
        with self.client.session_transaction() as session:
            session["user_id"] = 1

    def test_edit_work_metadata(self):
        self.sign_in()
        response = self.client.put("/api/reader/works/10", json={
            "title": "Updated title", "description": "Updated description"
        })
        self.assertEqual(response.status_code, 200)
        with self.connect() as con:
            row = con.execute("SELECT title, description FROM reader_works WHERE id = 10").fetchone()
        self.assertEqual(row, ("Updated title", "Updated description"))

    def test_cannot_edit_another_authors_work(self):
        self.sign_in()
        response = self.client.put("/api/reader/works/20", json={
            "title": "Intrusion", "description": ""
        })
        self.assertEqual(response.status_code, 404)

    def test_edit_published_novel_preserves_publication(self):
        self.sign_in()
        response = self.client.put("/api/reader/chapters/100", json={
            "title": "Revised title", "content": "Revised text"
        })
        self.assertEqual(response.status_code, 200)
        with self.connect() as con:
            row = con.execute(
                "SELECT title, content, status, published_at FROM reader_chapters WHERE id = 100"
            ).fetchone()
        self.assertEqual(row, ("Revised title", "Revised text", "published", "2026-01-01"))

    def test_webtoon_title_edit_keeps_existing_pages(self):
        self.sign_in()
        response = self.client.put("/api/reader/chapters/300", json={
            "title": "Updated episode", "content": ""
        })
        self.assertEqual(response.status_code, 200)
        with self.connect() as con:
            title = con.execute("SELECT title FROM reader_chapters WHERE id = 300").fetchone()[0]
            pages = con.execute("SELECT COUNT(*) FROM reader_pages WHERE chapter_id = 300").fetchone()[0]
        self.assertEqual(title, "Updated episode")
        self.assertEqual(pages, 1)

    def test_chapter_detail_requires_ownership(self):
        self.sign_in()
        response = self.client.get("/api/reader/studio/chapters/200")
        self.assertEqual(response.status_code, 404)

    def test_edit_requires_login(self):
        response = self.client.put("/api/reader/works/10", json={"title": "No", "description": ""})
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()

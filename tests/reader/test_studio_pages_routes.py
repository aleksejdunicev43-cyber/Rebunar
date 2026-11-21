import io
import sqlite3
import tempfile
import unittest
from pathlib import Path

from flask import Flask
from PIL import Image

from reader_helpers import reader_user_required, remove_reader_media
from reader_studio_pages_routes import register_reader_studio_pages_routes


class ReaderStudioPagesRoutesTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.db_path = self.root / "pages.db"
        self.storage = self.root / "uploads"
        self.app = Flask(__name__)
        self.app.secret_key = "pages-test"

        def connect():
            return sqlite3.connect(self.db_path)

        def ensure_reader_tables():
            with connect() as con:
                con.executescript("""
                    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT);
                    CREATE TABLE IF NOT EXISTS reader_works (
                        id INTEGER PRIMARY KEY, author_id INTEGER, category TEXT
                    );
                    CREATE TABLE IF NOT EXISTS reader_chapters (
                        id INTEGER PRIMARY KEY, work_id INTEGER, status TEXT
                    );
                    CREATE TABLE IF NOT EXISTS reader_pages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        chapter_id INTEGER NOT NULL,
                        page_number INTEGER NOT NULL,
                        image_path TEXT NOT NULL,
                        UNIQUE(chapter_id, page_number)
                    );
                """)

        self.connect = connect
        self.ensure_reader_tables = ensure_reader_tables
        ensure_reader_tables()
        self.storage.mkdir(parents=True, exist_ok=True)
        (self.storage / "webtoons").mkdir()
        for name in ("one.webp", "two.webp", "three.webp"):
            (self.storage / "webtoons" / name).write_bytes(b"old-image")
        with connect() as con:
            con.execute("INSERT INTO reader_works VALUES (10, 1, 'webtoon')")
            con.execute("INSERT INTO reader_works VALUES (20, 2, 'webtoon')")
            con.execute("INSERT INTO reader_chapters VALUES (100, 10, 'published')")
            con.execute("INSERT INTO reader_chapters VALUES (200, 20, 'draft')")
            con.executemany(
                "INSERT INTO reader_pages (id, chapter_id, page_number, image_path) VALUES (?, 100, ?, ?)",
                [(1, 1, "webtoons/one.webp"), (2, 2, "webtoons/two.webp"), (3, 3, "webtoons/three.webp")],
            )

        register_reader_studio_pages_routes(
            self.app, connect, ensure_reader_tables, reader_user_required,
            self.storage, remove_reader_media,
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def sign_in(self, user_id=1):
        with self.client.session_transaction() as session:
            session["user_id"] = user_id

    def test_list_pages_requires_owner(self):
        self.sign_in(2)
        response = self.client.get("/api/reader/studio/chapters/100/pages")
        self.assertEqual(response.status_code, 404)

    def test_list_pages_returns_ordered_pages(self):
        self.sign_in()
        response = self.client.get("/api/reader/studio/chapters/100/pages")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p["id"] for p in response.json], [1, 2, 3])

    def test_add_page_to_published_chapter(self):
        self.sign_in()
        image = Image.new("RGB", (24, 32), "blue")
        stream = io.BytesIO()
        image.save(stream, format="PNG")
        response = self.client.post(
            "/api/reader/chapters/100/pages/add",
            data={"image": (io.BytesIO(stream.getvalue()), "new-page.png")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 201)
        with self.connect() as con:
            rows = con.execute(
                "SELECT page_number, image_path FROM reader_pages WHERE chapter_id = 100 ORDER BY page_number"
            ).fetchall()
        self.assertEqual([row[0] for row in rows], [1, 2, 3, 4])
        self.assertTrue((self.storage / rows[-1][1]).exists())

    def test_reorder_pages(self):
        self.sign_in()
        response = self.client.put(
            "/api/reader/chapters/100/pages/order",
            json={"page_ids": [3, 1, 2]},
        )
        self.assertEqual(response.status_code, 200)
        with self.connect() as con:
            rows = con.execute(
                "SELECT id, page_number FROM reader_pages WHERE chapter_id = 100 ORDER BY page_number"
            ).fetchall()
        self.assertEqual(rows, [(3, 1), (1, 2), (2, 3)])

    def test_reorder_rejects_foreign_or_missing_page_ids(self):
        self.sign_in()
        response = self.client.put(
            "/api/reader/chapters/100/pages/order",
            json={"page_ids": [1, 2, 999]},
        )
        self.assertEqual(response.status_code, 409)

    def test_delete_page_keeps_one_page_and_renumbers(self):
        self.sign_in()
        response = self.client.delete("/api/reader/pages/2")
        self.assertEqual(response.status_code, 200)
        with self.connect() as con:
            rows = con.execute(
                "SELECT id, page_number FROM reader_pages WHERE chapter_id = 100 ORDER BY page_number"
            ).fetchall()
        self.assertEqual(rows, [(1, 1), (3, 2)])
        self.assertFalse((self.storage / "webtoons/two.webp").exists())

    def test_cannot_delete_last_page(self):
        self.sign_in()
        with self.connect() as con:
            con.execute("DELETE FROM reader_pages WHERE id IN (2, 3)")
        response = self.client.delete("/api/reader/pages/1")
        self.assertEqual(response.status_code, 400)

    def test_replace_page_keeps_page_number_and_changes_image(self):
        self.sign_in()
        image = Image.new("RGB", (24, 32), "red")
        stream = io.BytesIO()
        image.save(stream, format="PNG")
        response = self.client.post(
            "/api/reader/pages/1/replace",
            data={"image": (io.BytesIO(stream.getvalue()), "replacement.png")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        with self.connect() as con:
            row = con.execute(
                "SELECT page_number, image_path FROM reader_pages WHERE id = 1"
            ).fetchone()
        self.assertEqual(row[0], 1)
        self.assertNotEqual(row[1], "webtoons/one.webp")
        self.assertFalse((self.storage / "webtoons/one.webp").exists())
        self.assertTrue((self.storage / row[1]).exists())

    def test_mutations_require_login(self):
        response = self.client.put(
            "/api/reader/chapters/100/pages/order",
            json={"page_ids": [1, 2, 3]},
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()

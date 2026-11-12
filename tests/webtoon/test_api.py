import sqlite3
from io import BytesIO
import tempfile
import unittest
from pathlib import Path

from flask import Flask
from PIL import Image

from webtoon import migrations, register_webtoon


class WebtoonApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "rebunar-test.db"
        with sqlite3.connect(self.db) as con:
            con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, display_name TEXT)")
            con.execute("INSERT INTO users(username,display_name) VALUES ('author','Author')")
            con.execute("INSERT INTO users(username,display_name) VALUES ('reader','Reader')")
        migrations.up(self.db, make_backup=False)
        self.app = Flask(__name__)
        self.app.secret_key = "test-secret"
        register_webtoon(self.app, lambda: self.db)
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp.cleanup()

    def login(self, user_id):
        with self.client.session_transaction() as sess:
            sess["user_id"] = user_id

    def test_catalog_requires_rebunar_login(self):
        response = self.client.get("/api/webtoon/works")
        self.assertEqual(response.status_code, 401)

    def test_author_can_create_work_chapter_and_publish(self):
        self.login(1)
        response = self.client.post("/api/webtoon/works", json={
            "title": "Тестовая история",
            "description": "Описание",
            "format": "webtoon",
            "serial_status": "ongoing",
            "genres": [1, 2]
        })
        self.assertEqual(response.status_code, 201)
        work_id = response.get_json()["work_id"]

        chapter = self.client.post(f"/api/webtoon/works/{work_id}/chapters", json={
            "position": 1, "title": "Начало"
        })
        self.assertEqual(chapter.status_code, 201)
        chapter_id = chapter.get_json()["chapter_id"]

        image = Image.new("RGB", (80, 120), "white")
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        uploaded = self.client.post(
            f"/api/webtoon/chapters/{chapter_id}/pages",
            data={"page": (buffer, "page.png")},
            content_type="multipart/form-data"
        )
        self.assertEqual(uploaded.status_code, 201)

        chapter_detail = self.client.get(f"/api/webtoon/chapters/{chapter_id}")
        self.assertEqual(chapter_detail.status_code, 200)
        self.assertEqual(len(chapter_detail.get_json()["chapter"]["pages"]), 1)
        self.assertEqual(self.client.post(f"/api/webtoon/chapters/{chapter_id}/publish").status_code, 200)

        detail = self.client.get(f"/api/webtoon/works/{work_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.get_json()["work"]["is_owner"])
        self.assertEqual(len(detail.get_json()["work"]["chapters"]), 1)

        published = self.client.post(f"/api/webtoon/works/{work_id}/publish", json={})
        self.assertEqual(published.status_code, 200)
        page_id = chapter_detail.get_json()["chapter"]["pages"][0]["id"]
        self.assertEqual(self.client.get(f"/api/webtoon/pages/{page_id}").status_code, 200)

        self.login(2)
        public_detail = self.client.get(f"/api/webtoon/works/{work_id}")
        self.assertEqual(public_detail.status_code, 200)
        self.assertFalse(public_detail.get_json()["work"]["is_owner"])

    def test_non_owner_cannot_add_chapters(self):
        self.login(1)
        work_id = self.client.post("/api/webtoon/works", json={"title": "Авторская работа"}).get_json()["work_id"]
        self.login(2)
        response = self.client.post(f"/api/webtoon/works/{work_id}/chapters", json={"position": 1})
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()

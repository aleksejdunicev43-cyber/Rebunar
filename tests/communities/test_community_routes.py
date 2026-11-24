import sqlite3
import tempfile
import unittest
from pathlib import Path

from flask import Flask

from community_routes import register_community_routes


class CommunityRoutesTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "community-test.db"
        self.app = Flask(__name__)
        self.app.secret_key = "community-test-secret"

        def connect():
            return sqlite3.connect(self.db_path)

        self.connect = connect
        with connect() as con:
            con.executescript("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    username TEXT NOT NULL,
                    avatar TEXT
                );
                CREATE TABLE communities (
                    id INTEGER PRIMARY KEY,
                    slug TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT ''
                );
                CREATE TABLE memberships (
                    user_id INTEGER NOT NULL,
                    community_id INTEGER NOT NULL,
                    UNIQUE(user_id, community_id)
                );
                CREATE TABLE posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER,
                    community_id INTEGER
                );
                INSERT INTO users (id, username) VALUES (1, 'author');
                INSERT INTO communities (id, slug, name, description)
                    VALUES (10, 'indie-games', 'Инди-игры', 'Независимые игры');
            """)

        register_community_routes(self.app, connect, self.temp_dir.name)
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def sign_in(self):
        with self.client.session_transaction() as session:
            session["user_id"] = 1
            session["username"] = "author"

    def test_communities_and_posts_are_public(self):
        communities = self.client.get("/api/communities")
        self.assertEqual(communities.status_code, 200)
        self.assertEqual(communities.get_json()[0]["slug"], "indie-games")

        posts = self.client.get("/api/posts")
        self.assertEqual(posts.status_code, 200)
        self.assertEqual(posts.get_json(), [])

    def test_post_creation_requires_login(self):
        response = self.client.post(
            "/api/posts",
            json={"title": "Новая работа", "text": "Описание"}
        )
        self.assertEqual(response.status_code, 401)

    def test_empty_post_is_rejected(self):
        self.sign_in()
        response = self.client.post("/api/posts", json={"title": " ", "text": ""})
        self.assertEqual(response.status_code, 400)

    def test_authenticated_user_can_create_and_read_post(self):
        self.sign_in()
        created = self.client.post(
            "/api/posts",
            json={
                "title": "Моя игра",
                "text": "Первый дневник разработки",
                "community_id": 10,
            },
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.get_json()["author"], "author")

        all_posts = self.client.get("/api/posts")
        self.assertEqual(len(all_posts.get_json()), 1)
        self.assertEqual(all_posts.get_json()[0]["community_slug"], "indie-games")

        group_posts = self.client.get("/api/posts?community=indie-games")
        self.assertEqual(len(group_posts.get_json()), 1)
        self.assertEqual(group_posts.get_json()[0]["title"], "Моя игра")

        other_group = self.client.get("/api/posts?community=anime")
        self.assertEqual(other_group.get_json(), [])

    def test_membership_join_is_idempotent_and_leave_works(self):
        self.sign_in()

        joined = self.client.post("/api/join/indie-games")
        self.assertEqual(joined.status_code, 200)
        self.assertTrue(joined.get_json()["joined"])
        self.assertEqual(joined.get_json()["count"], 1)

        joined_again = self.client.post("/api/join/indie-games")
        self.assertEqual(joined_again.status_code, 200)
        self.assertEqual(joined_again.get_json()["count"], 1)

        left = self.client.post("/api/leave/indie-games")
        self.assertEqual(left.status_code, 200)
        self.assertFalse(left.get_json()["joined"])
        self.assertEqual(left.get_json()["count"], 0)

    def test_membership_changes_require_login(self):
        self.assertEqual(self.client.post("/api/join/indie-games").status_code, 401)
        self.assertEqual(self.client.post("/api/leave/indie-games").status_code, 401)


if __name__ == "__main__":
    unittest.main()

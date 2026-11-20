import sqlite3

from flask import jsonify, request, send_from_directory, session


def register_community_routes(app, connect, base):
    """Register community, membership, and publication routes."""

    @app.get("/api/communities")
    def get_communities():
        with connect() as con:
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT id, slug, name, description
                FROM communities
                ORDER BY id
            """).fetchall()
        return jsonify([dict(row) for row in rows])

    @app.get("/api/posts")
    def get_posts():
        slug = request.args.get("community")
        sql = """
            SELECT posts.id, posts.title, posts.body, posts.created_at,
                   users.username AS author,
                   users.avatar AS avatar,
                   communities.slug AS community_slug,
                   communities.name AS community_name
            FROM posts
            LEFT JOIN users ON users.id = posts.user_id
            LEFT JOIN communities ON communities.id = posts.community_id
        """
        params = []
        if slug:
            sql += " WHERE communities.slug = ?"
            params.append(slug)
        sql += " ORDER BY posts.id DESC LIMIT 100"
        with connect() as con:
            con.row_factory = sqlite3.Row
            rows = con.execute(sql, params).fetchall()
            return jsonify([dict(r) for r in rows])

    @app.post("/api/posts")
    def create_post():
        if "user_id" not in session:
            return jsonify({"error": "Войди в аккаунт, чтобы публиковать"}), 401

        data = request.get_json(silent=True) or {}
        title = str(data.get("title", "")).strip()[:200]
        body = str(data.get("text", "")).strip()[:10000]
        community_id = data.get("community_id")

        if not title and not body:
            return jsonify({"error": "Публикация пустая"}), 400

        with connect() as con:
            if community_id is not None:
                ok = con.execute(
                    "SELECT 1 FROM communities WHERE id = ?", (community_id,)
                ).fetchone()
                if not ok:
                    return jsonify({"error": "Такого сообщества нет"}), 400

            cur = con.execute(
                "INSERT INTO posts (title, body, user_id, community_id) VALUES (?, ?, ?, ?)",
                (title, body, session["user_id"], community_id)
            )
            post_id = cur.lastrowid

        return jsonify({
            "id": post_id,
            "title": title,
            "text": body,
            "author": session["username"]
        }), 201

    @app.get("/communities.js")
    def communities_js():
        return send_from_directory(base, "communities.js")

    @app.get("/api/membership/<slug>")
    def membership_info(slug):
        with connect() as con:
            community = con.execute(
                "SELECT id FROM communities WHERE slug = ?", (slug,)
            ).fetchone()
            if not community:
                return jsonify({"error": "Нет такого сообщества"}), 404

            community_id = community[0]
            count = con.execute(
                "SELECT COUNT(*) FROM memberships WHERE community_id = ?",
                (community_id,)
            ).fetchone()[0]
            joined = False
            if "user_id" in session:
                joined = con.execute(
                    "SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?",
                    (session["user_id"], community_id)
                ).fetchone() is not None

        return jsonify({"count": count, "joined": joined})

    @app.post("/api/join/<slug>")
    def join_community(slug):
        if "user_id" not in session:
            return jsonify({"error": "Войди в аккаунт, чтобы вступить"}), 401

        with connect() as con:
            community = con.execute(
                "SELECT id FROM communities WHERE slug = ?", (slug,)
            ).fetchone()
            if not community:
                return jsonify({"error": "Нет такого сообщества"}), 404

            con.execute(
                "INSERT OR IGNORE INTO memberships (user_id, community_id) VALUES (?, ?)",
                (session["user_id"], community[0])
            )

        return membership_info(slug)

    @app.post("/api/leave/<slug>")
    def leave_community(slug):
        if "user_id" not in session:
            return jsonify({"error": "Войди в аккаунт"}), 401

        with connect() as con:
            community = con.execute(
                "SELECT id FROM communities WHERE slug = ?", (slug,)
            ).fetchone()
            if not community:
                return jsonify({"error": "Нет такого сообщества"}), 404

            con.execute(
                "DELETE FROM memberships WHERE user_id = ? AND community_id = ?",
                (session["user_id"], community[0])
            )

        return membership_info(slug)

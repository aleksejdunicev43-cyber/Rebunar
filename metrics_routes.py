import uuid

from flask import jsonify, session


def register_metrics_routes(app, connect):
    """Register health, user statistics, and online-presence API routes."""

    @app.get("/api/statistics/summary")
    def statistics_summary():
        with connect() as con:
            total = con.execute(
                "SELECT COUNT(*) FROM users"
            ).fetchone()[0]

            online = con.execute("""
                SELECT COUNT(DISTINCT user_id)
                FROM user_presence
                WHERE last_seen >= datetime('now', '-2 minutes')
            """).fetchone()[0]

        return jsonify({
            "total_users": total,
            "online_users": online
        })

    @app.get("/api/statistics/history")
    def statistics_history():
        with connect() as con:
            rows = con.execute("""
                WITH daily AS (
                    SELECT date(recorded_at) AS day, SUM(delta) AS delta
                    FROM account_count_events
                    GROUP BY date(recorded_at)
                )
                SELECT
                    day,
                    delta,
                    SUM(delta) OVER (
                        ORDER BY day
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    ) AS total
                FROM daily
                ORDER BY day ASC
            """).fetchall()
            current_total = con.execute(
                "SELECT COUNT(*) FROM users"
            ).fetchone()[0]

        return jsonify({
            "current_total": current_total,
            "points": [
                {"date": row[0], "delta": row[1], "total": row[2]}
                for row in rows
            ]
        })

    @app.post("/api/presence/heartbeat")
    def presence_heartbeat():
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Требуется авторизация"}), 401

        presence_id = session.get("presence_id")
        if not presence_id:
            presence_id = str(uuid.uuid4())
            session["presence_id"] = presence_id

        with connect() as con:
            con.execute("""
                INSERT INTO user_presence (presence_id, user_id, last_seen)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(presence_id) DO UPDATE SET
                    user_id = excluded.user_id,
                    last_seen = CURRENT_TIMESTAMP
            """, (presence_id, user_id))

            con.execute("""
                DELETE FROM user_presence
                WHERE last_seen < datetime('now', '-1 day')
            """)

        return jsonify({"ok": True}), 200

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "Rebunar API"})

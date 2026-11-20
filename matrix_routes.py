import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import jsonify, request, session


def register_matrix_routes(app, connect):
    @app.get("/api/matrix/status")
    def matrix_account_status():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401
    
        with connect() as con:
            row = con.execute(
                "SELECT matrix_user_id, device_id FROM matrix_accounts WHERE user_id = ?",
                (session["user_id"],)
            ).fetchone()
    
        if not row:
            return jsonify({
                "linked": False,
                "matrix_user_id": None,
                "device_id": None
            }), 200
    
        return jsonify({
            "linked": True,
            "matrix_user_id": row[0],
            "device_id": row[1]
        }), 200
    
    
    @app.delete("/api/matrix/link")
    def unlink_matrix_account():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401
    
        origin = request.headers.get("Origin")
        if not origin or origin.rstrip("/") != request.host_url.rstrip("/"):
            return jsonify({"error": "Недопустимый источник запроса"}), 403
    
        with connect() as con:
            cursor = con.execute(
                "DELETE FROM matrix_accounts WHERE user_id = ?",
                (session["user_id"],)
            )
    
        return jsonify({
            "ok": True,
            "unlinked": cursor.rowcount > 0
        }), 200
    
    
    @app.post("/api/matrix/link")
    def link_matrix_account():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401
    
        origin = request.headers.get("Origin")
        if not origin or origin.rstrip("/") != request.host_url.rstrip("/"):
            return jsonify({"error": "Недопустимый источник запроса"}), 403
    
        data = request.get_json(silent=True)
    
        if not isinstance(data, dict):
            return jsonify({"error": "Ожидается JSON-объект"}), 400
    
        access_token = data.get("access_token")
        expected_user_id = data.get("matrix_user_id")
        device_id = data.get("device_id")
    
        if not isinstance(access_token, str):
            return jsonify({"error": "Некорректный токен Matrix"}), 400
    
        if not isinstance(expected_user_id, str):
            return jsonify({"error": "Некорректный Matrix ID"}), 400
    
        if device_id is not None and not isinstance(device_id, str):
            return jsonify({"error": "Некорректный ID устройства"}), 400
    
        access_token = access_token.strip()
        expected_user_id = expected_user_id.strip()
        device_id = device_id.strip() if device_id else None
    
        if not access_token or len(access_token) > 8192:
            return jsonify({"error": "Некорректный токен Matrix"}), 400
    
        if not expected_user_id or len(expected_user_id) > 255:
            return jsonify({"error": "Некорректный Matrix ID"}), 400
    
        matrix_request = Request(
            "https://matrix.org/_matrix/client/v3/account/whoami",
            headers={"Authorization": "Bearer " + access_token},
            method="GET"
        )
    
        try:
            with urlopen(matrix_request, timeout=10) as response:
                identity = json.loads(response.read(16384).decode("utf-8"))
        except HTTPError as exc:
            if exc.code in (401, 403):
                return jsonify({"error": "Matrix не подтвердил этот токен"}), 401
            return jsonify({"error": "Ошибка проверки Matrix"}), 502
        except (URLError, TimeoutError, OSError, ValueError):
            return jsonify({"error": "Не удалось проверить аккаунт Matrix"}), 502
    
        if not isinstance(identity, dict):
            return jsonify({"error": "Matrix вернул некорректный ответ"}), 502
    
        confirmed_user_id = identity.get("user_id")
        confirmed_device_id = identity.get("device_id")
    
        if identity.get("is_guest") or not confirmed_user_id:
            return jsonify({"error": "Гостевой или неподтверждённый Matrix-аккаунт"}), 403
    
        if confirmed_user_id != expected_user_id:
            return jsonify({"error": "Matrix ID не совпадает с подтверждённым аккаунтом"}), 403
    
        if device_id and confirmed_device_id and device_id != confirmed_device_id:
            return jsonify({"error": "ID устройства Matrix не совпадает"}), 403
    
        with connect() as con:
            existing_user = con.execute(
                "SELECT matrix_user_id FROM matrix_accounts WHERE user_id = ?",
                (session["user_id"],)
            ).fetchone()
    
            existing_matrix = con.execute(
                "SELECT user_id FROM matrix_accounts WHERE matrix_user_id = ?",
                (confirmed_user_id,)
            ).fetchone()
    
            if existing_user and existing_user[0] != confirmed_user_id:
                return jsonify({"error": "Сначала отвяжите предыдущий Matrix-аккаунт"}), 409
    
            if existing_matrix and existing_matrix[0] != session["user_id"]:
                return jsonify({"error": "Этот Matrix-аккаунт уже привязан к другому пользователю"}), 409
    
            con.execute(
                """
                INSERT INTO matrix_accounts (user_id, matrix_user_id, device_id)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    device_id = excluded.device_id
                """,
                (session["user_id"], confirmed_user_id, confirmed_device_id or device_id)
            )
    
        return jsonify({
            "ok": True,
            "matrix_user_id": confirmed_user_id,
            "device_id": confirmed_device_id or device_id
        }), 200
    
    

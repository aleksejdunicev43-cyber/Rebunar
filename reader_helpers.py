from pathlib import Path

from flask import jsonify, session


def reader_user_required():
    if not session.get("user_id"):
        return jsonify({"error": "Войди в аккаунт, чтобы пользоваться студией автора"}), 401
    return None


def reader_work_dict(row):
    return {
        "id": row["id"], "title": row["title"],
        "description": row["description"] or "",
        "category": row["category"], "cover_url": row["cover_path"] or "",
        "status": row["status"], "author": row["author_name"],
        "author_id": row["author_id"], "created_at": row["created_at"]
    }


def remove_reader_media(paths, storage):
    root = Path(storage).resolve()
    for stored_path in paths:
        if not stored_path:
            continue
        relative = str(stored_path)
        if relative.startswith("/reader-media/"):
            relative = relative[len("/reader-media/"):]
        target = (root / relative).resolve()
        try:
            target.relative_to(root)
        except ValueError:
            continue
        try:
            if target.is_file():
                target.unlink()
        except OSError:
            # A stale media file must not prevent the database deletion.
            pass

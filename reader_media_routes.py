from flask import send_from_directory


def register_reader_media_routes(app, storage):
    """Register safe delivery of uploaded reader covers and page images."""

    @app.get("/reader-media/<path:filename>")
    def reader_media(filename):
        # send_from_directory prevents path traversal outside the persistent media folder.
        return send_from_directory(storage, filename)

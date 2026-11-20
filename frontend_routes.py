from flask import send_from_directory


def register_frontend_routes(app, base):
    """Register the legacy root page and the built frontend entry points."""
    @app.get("/")
    def home():
        return send_from_directory(base, "index.html")
    
    @app.get("/new")
    def new_frontend():
        build_dir = base / "frontend" / "build"
        if (build_dir / "index.html").is_file():
            return send_from_directory(build_dir, "index.html")
        return send_from_directory(base / "frontend", "index.html")
    
    @app.get("/new/<path:filename>")
    def new_frontend_file(filename):
        build_dir = base / "frontend" / "build"
        if (build_dir / filename).is_file():
            return send_from_directory(build_dir, filename)
        return send_from_directory(base / "frontend", filename)
    
    
    # Reader content lives outside the application source directory. Deploying code
    # must never overwrite uploaded stories, covers, or webtoon pages.

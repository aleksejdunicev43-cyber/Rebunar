from flask import send_from_directory


def register_static_routes(app, base):
    """Register legacy static asset endpoints."""
    @app.get("/rebunar.css")
    def rebunar_css():
        return send_from_directory(base, "rebunar.css")

    @app.get("/rebunar-blood.css")
    def rebunar_blood_css():
        return send_from_directory(base, "rebunar-blood.css")

    @app.get("/rebunar-home.js")
    def rebunar_home_js():
        return send_from_directory(base, "rebunar-home.js")

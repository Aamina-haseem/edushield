from flask import Flask

from app.routes import bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(bp)
    return app


app = create_app()

if __name__ == '__main__':
    # Internal-only service — bind to localhost, not 0.0.0.0. Express is the sole caller.
    app.run(host='127.0.0.1', port=8001, debug=False)

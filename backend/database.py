from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models here to ensure they're known to Flask-Migrate
    from models.user import User
    from models.match import Match

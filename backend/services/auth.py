from flask_login import LoginManager
from typing import Optional, Tuple
from models.user import User
from database import db
import re

login_manager = LoginManager()


@login_manager.user_loader
def load_user(user_id: str) -> Optional[User]:
    return User.query.get(int(user_id))


class AuthService:
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, str]:
        """
        Validate password strength
        Returns: (is_valid, error_message)
        """
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r"\d", password):
            return False, "Password must contain at least one number"
        return True, ""

    @staticmethod
    def validate_email(email: str) -> Tuple[bool, str]:
        """
        Validate email format
        Returns: (is_valid, error_message)
        """
        email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_regex, email):
            return False, "Invalid email format"
        return True, ""

    @staticmethod
    def register(
        username: str, email: str, password: str, display_name: Optional[str] = None
    ) -> Tuple[Optional[User], str]:
        """
        Register a new user
        Returns: (user, error_message)
        """
        # Validate input
        if User.get_by_username(username):
            return None, "Username already exists"
        if User.get_by_email(email):
            return None, "Email already exists"

        password_valid, password_error = AuthService.validate_password(password)
        if not password_valid:
            return None, password_error

        email_valid, email_error = AuthService.validate_email(email)
        if not email_valid:
            return None, email_error

        # Create user
        try:
            user = User(
                username=username,
                email=email,
                password=password,
                display_name=display_name,
            )
            db.session.add(user)
            db.session.commit()
            return user, ""
        except Exception as e:
            db.session.rollback()
            return None, f"Registration failed: {str(e)}"

    @staticmethod
    def login(username_or_email: str, password: str) -> Tuple[Optional[User], str]:
        """
        Login a user
        Returns: (user, error_message)
        """
        # Try to find user by username or email
        user = User.get_by_username(username_or_email)
        if not user:
            user = User.get_by_email(username_or_email)

        if not user:
            return None, "Invalid username/email or password"

        if not user.check_password(password):
            return None, "Invalid username/email or password"

        if not user.is_active:
            return None, "Account is inactive"

        return user, ""

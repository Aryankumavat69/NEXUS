from fastapi import Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models.user import User


def require_roles(*allowed_roles: str):

    def role_checker(
        current_user: User = Depends(get_current_user),
    ):
        role_name = current_user.role_id

        # Role verification is performed against the database
        # in the endpoint layer rather than trusting JWT alone.

        from app.db.database import SessionLocal
        from app.models.role import Role

        db = SessionLocal()

        try:
            role = (
                db.query(Role)
                .filter(Role.id == role_name)
                .first()
            )

            if not role or role.name not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions.",
                )

            return current_user

        finally:
            db.close()

    return role_checker
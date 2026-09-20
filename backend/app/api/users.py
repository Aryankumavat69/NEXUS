from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.core.rbac import require_roles
from app.models.user import User


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "email_verified": current_user.email_verified,
        "phone_verified": current_user.phone_verified,
    }


@router.get(
    "/admin-only",
    dependencies=[
        Depends(
            require_roles(
                "SUPER_ADMIN",
                "ADMIN",
            )
        )
    ],
)
def admin_only():
    return {
        "message": "Admin access granted."
    }
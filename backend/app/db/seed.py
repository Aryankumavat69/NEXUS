from app.db.database import SessionLocal
from app.models.role import Role


def seed_roles():
    db = SessionLocal()

    roles = [
        "SUPER_ADMIN",
        "ADMIN",
        "FINANCE",
        "SALES",
        "PROCUREMENT",
        "LOGISTICS",
        "ANALYST",
        "CUSTOMER",
    ]

    try:
        for role_name in roles:
            exists = (
                db.query(Role)
                .filter(Role.name == role_name)
                .first()
            )

            if not exists:
                db.add(Role(name=role_name))

        db.commit()
        print("Roles seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
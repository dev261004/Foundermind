from django.core.management.base import BaseCommand

from apps.users.models import User
from apps.users.services import hash_password, verify_password


ADMIN_EMAIL = "dev@foundermind.ai"
ADMIN_PASSWORD = "dev@123"


class Command(BaseCommand):
    help = "Create or update the default Foundermind admin account."

    def handle(self, *args, **options):
        user = User.objects(email=ADMIN_EMAIL).first()

        if user:
            changed = False
            if user.role != "admin":
                user.role = "admin"
                changed = True
            if not verify_password(ADMIN_PASSWORD, user.password_hash):
                user.password_hash = hash_password(ADMIN_PASSWORD)
                changed = True
            if changed:
                user.save()
                self.stdout.write(self.style.SUCCESS("Admin account updated."))
            else:
                self.stdout.write(self.style.SUCCESS("Admin account already exists."))
            return

        User(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
        ).save()
        self.stdout.write(self.style.SUCCESS("Admin account created."))

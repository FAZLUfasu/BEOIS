from django.core.management.base import BaseCommand
from accounts.models import Role


ROLES = [
    {
        "name": "Super Administrator",
        "code": "SUPER_ADMINISTRATOR",
        "description": "Full system administrator with unrestricted access.",
    },
    {
        "name": "Administrator",
        "code": "ADMINISTRATOR",
        "description": "System administrator responsible for administration and operations.",
    },
    {
        "name": "HR Manager",
        "code": "HR_MANAGER",
        "description": "Manages HR and employee-related operations.",
    },
    {
        "name": "Finance Manager",
        "code": "FINANCE_MANAGER",
        "description": "Manages finance and accounting operations.",
    },
    {
        "name": "Admission Officer",
        "code": "ADMISSION_OFFICER",
        "description": "Handles student admissions and enrollment operations.",
    },
    {
        "name": "Academic Coordinator",
        "code": "ACADEMIC_COORDINATOR",
        "description": "Coordinates academic operations.",
    },
    {
        "name": "Counselor",
        "code": "COUNSELOR",
        "description": "Handles student counseling and admission follow-up.",
    },
    {
        "name": "Telecaller",
        "code": "TELECALLER",
        "description": "Handles lead calls and follow-up activities.",
    },
    {
        "name": "Marketing Executive",
        "code": "MARKETING_EXECUTIVE",
        "description": "Handles marketing and promotional activities.",
    },
    {
        "name": "Faculty",
        "code": "FACULTY",
        "description": "Academic teaching and student support role.",
    },
    {
        "name": "Student Support Executive",
        "code": "STUDENT_SUPPORT_EXECUTIVE",
        "description": "Handles student support and service requests.",
    },
]


class Command(BaseCommand):
    help = "Create the standard BEOIS roles."

    def handle(self, *args, **options):
        self.stdout.write("")
        self.stdout.write(
            self.style.MIGRATE_HEADING("BEOIS Role Setup")
        )
        self.stdout.write("")

        created_count = 0
        existing_count = 0

        for data in ROLES:
            role, created = Role.objects.get_or_create(
                code=data["code"],
                defaults={
                    "name": data["name"],
                    "description": data["description"],
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  CREATED: {role.name} ({role.code})"
                    )
                )
            else:
                existing_count += 1
                self.stdout.write(
                    f"  EXISTS:  {role.name} ({role.code})"
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.MIGRATE_HEADING("Summary")
        )
        self.stdout.write(f"Roles created : {created_count}")
        self.stdout.write(f"Roles existing: {existing_count}")
        self.stdout.write("")

        self.stdout.write(
            self.style.SUCCESS(
                "Role setup completed successfully."
            )
        )

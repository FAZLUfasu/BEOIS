from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admissions", "0010_remove_program_unique_institution_program_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AcademicMasterImportClaim",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "token_digest",
                    models.CharField(
                        editable=False,
                        max_length=64,
                        unique=True,
                    ),
                ),
                (
                    "claimed_at",
                    models.DateTimeField(
                        auto_now_add=True,
                    ),
                ),
            ],
            options={
                "db_table": "academic_master_import_claim",
            },
        ),
    ]

# Generated manually for the Academic Master Data hardening changes.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("admissions", "0005_program_data_status_program_verification_notes_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="programfeeinstallment",
            name="amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
            ),
        ),
    ]

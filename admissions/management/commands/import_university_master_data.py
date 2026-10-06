from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from admissions.master_data_import import import_data, read_workbook, validate


class Command(BaseCommand):
    help = "Preview or import the BEOIS university/course/fee master workbook."

    def add_arguments(self, parser):
        parser.add_argument("workbook")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        path = Path(options["workbook"]).expanduser().resolve()
        if not path.exists():
            raise CommandError(f"Workbook not found: {path}")
        try:
            data = read_workbook(path)
            report = validate(data)
        except Exception as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS("BEOIS ACADEMIC MASTER DATA IMPORT"))
        self.stdout.write(f"Mode: {'DRY RUN' if options['dry_run'] else 'IMPORT'}")
        for key, value in report["counts"].items():
            self.stdout.write(f"{key:28}: {value}")
        self.stdout.write(f"Errors: {len(report['errors'])}")
        self.stdout.write(f"Warnings: {len(report['warnings'])}")
        if report["errors"]:
            for error in report["errors"][:100]:
                self.stdout.write(self.style.ERROR(f"ERROR: {error['message']}"))
            raise CommandError("Validation failed. No database changes made.")
        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("DRY RUN COMPLETE — NO DATABASE CHANGES MADE."))
            return
        result = import_data(data)
        self.stdout.write(self.style.SUCCESS("IMPORT COMPLETE"))
        for key, value in result.items():
            self.stdout.write(f"{key:32}: {value}")

import uuid

from django.conf import settings as django_settings
from django.core.exceptions import ValidationError
from django.db import models


class SystemSettings(models.Model):
    """
    Singleton global configuration for BEOIS.

    Only one row is allowed. Operational master data such as
    branches, departments, institutions, financial accounts, etc.
    belongs to their respective applications and is intentionally
    not duplicated here.
    """

    class DateFormat(models.TextChoices):
        DD_MM_YYYY = "DD-MM-YYYY", "DD-MM-YYYY"
        DD_SLASH_MM_SLASH_YYYY = "DD/MM/YYYY", "DD/MM/YYYY"
        YYYY_MM_DD = "YYYY-MM-DD", "YYYY-MM-DD"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # ============================================================
    # GENERAL
    # ============================================================

    system_name = models.CharField(
        max_length=150,
        default="BEST Education Operations & Intelligence System",
    )

    system_short_name = models.CharField(
        max_length=50,
        default="BEOIS",
    )

    timezone = models.CharField(
        max_length=100,
        default="Asia/Kolkata",
    )

    currency_code = models.CharField(
        max_length=10,
        default="INR",
    )

    currency_symbol = models.CharField(
        max_length=10,
        default="₹",
    )

    date_format = models.CharField(
        max_length=30,
        choices=DateFormat.choices,
        default=DateFormat.DD_MM_YYYY,
    )

    # ============================================================
    # FINANCIAL YEAR
    # ============================================================

    financial_year_start_month = models.PositiveSmallIntegerField(
        default=4,
        help_text="1 = January, 4 = April, etc.",
    )

    # ============================================================
    # NUMBERING / IDENTIFIERS
    # ============================================================

    lead_prefix = models.CharField(
        max_length=10,
        default="LD",
    )

    credit_transfer_prefix = models.CharField(
        max_length=10,
        default="CT",
    )

    admission_prefix = models.CharField(
        max_length=10,
        default="AD",
    )

    student_prefix = models.CharField(
        max_length=10,
        default="ST",
    )

    partner_prefix = models.CharField(
        max_length=10,
        default="BPT",
    )
    partner_case_prefix = models.CharField(
        max_length=20,
        default="PC",
    )

    employee_prefix = models.CharField(
        max_length=10,
        default="EMP",
    )

    identifier_padding = models.PositiveSmallIntegerField(
        default=5,
        help_text="Number of digits after the prefix.",
    )

    # ============================================================
    # TELECALLING
    # ============================================================

    default_callback_days = models.PositiveSmallIntegerField(
        default=1,
    )

    default_follow_up_days = models.PositiveSmallIntegerField(
        default=7,
    )

    # ============================================================
    # ADMISSIONS
    # ============================================================

    default_academic_session = models.CharField(
        max_length=50,
        blank=True,
    )

    admission_document_reminder_days = models.PositiveSmallIntegerField(
        default=3,
    )

    admission_fee_reminder_days = models.PositiveSmallIntegerField(
        default=3,
    )

    # ============================================================
    # HR
    # ============================================================

    standard_working_minutes_per_day = models.PositiveIntegerField(
        default=480,
        help_text="Default: 480 minutes = 8 hours.",
    )

    attendance_grace_minutes = models.PositiveSmallIntegerField(
        default=15,
    )

    payroll_default_payment_method = models.CharField(
        max_length=50,
        default="BANK_TRANSFER",
    )

    # ============================================================
    # DOCUMENTS / RETENTION
    # ============================================================

    maximum_upload_size_mb = models.PositiveIntegerField(
        default=10,
    )

    document_retention_days = models.PositiveIntegerField(
        default=3650,
        help_text="Default: approximately 10 years.",
    )

    # ============================================================
    # NOTIFICATIONS
    # ============================================================

    enable_notifications = models.BooleanField(
        default=True,
    )

    reminder_days_before_due_date = models.PositiveSmallIntegerField(
        default=3,
    )

    # ============================================================
    # SECURITY / SESSION POLICY
    # ============================================================

    session_timeout_minutes = models.PositiveIntegerField(
        default=480,
        help_text="Administrative policy value. Authentication integration may use it later.",
    )

    require_mfa_for_management = models.BooleanField(
        default=False,
    )

    # ============================================================
    # STATUS / AUDIT
    # ============================================================

    is_active = models.BooleanField(
        default=True,
    )

    updated_by = models.ForeignKey(
    django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="system_settings_updates",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return self.system_short_name or "BEOIS Settings"

    def clean(self):
        super().clean()

        if not 1 <= self.financial_year_start_month <= 12:
            raise ValidationError(
                {
                    "financial_year_start_month":
                        "Financial year start month must be between 1 and 12."
                }
            )

        if not 3 <= self.identifier_padding <= 10:
            raise ValidationError(
                {
                    "identifier_padding":
                        "Identifier padding must be between 3 and 10."
                }
            )

        if self.standard_working_minutes_per_day <= 0:
            raise ValidationError(
                {
                    "standard_working_minutes_per_day":
                        "Standard working minutes must be greater than zero."
                }
            )

        if self.standard_working_minutes_per_day > 1440:
            raise ValidationError(
                {
                    "standard_working_minutes_per_day":
                        "Standard working minutes cannot exceed 1440 minutes."
                }
            )

        if self.maximum_upload_size_mb <= 0:
            raise ValidationError(
                {
                    "maximum_upload_size_mb":
                        "Maximum upload size must be greater than zero."
                }
            )

        if self.document_retention_days <= 0:
            raise ValidationError(
                {
                    "document_retention_days":
                        "Document retention days must be greater than zero."
                }
            )

        if self.session_timeout_minutes <= 0:
            raise ValidationError(
                {
                    "session_timeout_minutes":
                        "Session timeout must be greater than zero."
                }
            )

        prefix_fields = {
            "lead_prefix": self.lead_prefix,
            "credit_transfer_prefix": self.credit_transfer_prefix,
            "admission_prefix": self.admission_prefix,
            "student_prefix": self.student_prefix,
            "partner_prefix": self.partner_prefix,
            "partner_case_prefix": self.partner_case_prefix,
            "employee_prefix": self.employee_prefix,
        }

        for field_name, value in prefix_fields.items():
            cleaned = (value or "").strip().upper()

            if not cleaned:
                raise ValidationError(
                    {
                        field_name:
                            "Identifier prefix cannot be empty."
                    }
                )

            if not cleaned.replace("_", "").isalnum():
                raise ValidationError(
                    {
                        field_name:
                            "Prefix may contain only letters, numbers and underscore."
                    }
                )

            setattr(self, field_name, cleaned)

    def save(self, *args, **kwargs):
        """
        Enforce singleton behavior at the application layer.
        """

        self.full_clean()

        existing = SystemSettings.objects.exclude(
            pk=self.pk
        ).first()

        if existing:
            raise ValidationError(
                "Only one System Settings record may exist."
            )

        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """
        Return the singleton settings object.

        Creates it automatically when the database has not yet
        been initialized with a settings record.
        """

        settings_object = cls.objects.first()

        if settings_object:
            return settings_object

        return cls.objects.create()


class SystemSettingsAudit(models.Model):
    """
    Immutable audit trail for changes made through the
    System Settings API.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    settings = models.ForeignKey(
        SystemSettings,
        on_delete=models.CASCADE,
        related_name="audit_entries",
    )

    changed_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="system_settings_audit_entries",
    )

    changed_fields = models.JSONField(
        default=dict,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        user = self.changed_by or "System"

        return (
            f"System Settings changed by "
            f"{user} at {self.created_at}"
        )
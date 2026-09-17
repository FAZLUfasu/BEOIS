import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


# ================================================================
# LEAD
# ================================================================

class Lead(models.Model):

    class Vertical(models.TextChoices):
        REGULAR = "REGULAR", "Regular Distance Education"
        CREDIT_TRANSFER = "CREDIT_TRANSFER", "Credit Transfer"

    class Channel(models.TextChoices):
        DIRECT = "DIRECT", "BEST Direct"
        PARTNER = "PARTNER", "Partner"

    class Status(models.TextChoices):
        NEW = "NEW", "New"
        ASSIGNED = "ASSIGNED", "Assigned"
        CONTACTED = "CONTACTED", "Contacted"
        FOLLOW_UP = "FOLLOW_UP", "Follow Up"
        QUALIFIED = "QUALIFIED", "Qualified"
        CONVERTED = "CONVERTED", "Converted"
        NOT_INTERESTED = "NOT_INTERESTED", "Not Interested"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    lead_id = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
    )

    name = models.CharField(
        max_length=255,
    )

    phone_number = models.CharField(
        max_length=30,
        db_index=True,
    )

    alternate_phone = models.CharField(
        max_length=30,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
    )

    vertical = models.CharField(
        max_length=30,
        choices=Vertical.choices,
        default=Vertical.REGULAR,
        db_index=True,
    )

    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.DIRECT,
        db_index=True,
    )

    # ------------------------------------------------------------
    # PARTNER INTEGRATION
    # ------------------------------------------------------------

    partner = models.ForeignKey(
        "partners.Partner",
        on_delete=models.PROTECT,
        related_name="leads",
        null=True,
        blank=True,
    )

    partner_reference_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    # ------------------------------------------------------------
    # MARKETING / SOURCE
    # ------------------------------------------------------------

    source = models.CharField(
        max_length=100,
        blank=True,
    )

    campaign = models.CharField(
        max_length=150,
        blank=True,
    )

    interested_course = models.CharField(
        max_length=255,
        blank=True,
    )

    previous_course = models.CharField(
        max_length=255,
        blank=True,
    )

    # ------------------------------------------------------------
    # STATUS / ASSIGNMENT
    # ------------------------------------------------------------

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_leads",
        null=True,
        blank=True,
    )

    assigned_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    next_follow_up_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_leads",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    converted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["status", "assigned_to"],
            ),
            models.Index(
                fields=["vertical", "status"],
            ),
            models.Index(
                fields=["channel", "status"],
            ),
            models.Index(
                fields=["partner", "status"],
            ),
        ]

    def __str__(self):
        return f"{self.lead_id} - {self.name}"

    def clean(self):
        super().clean()

        if (
            self.channel == self.Channel.PARTNER
            and not self.partner_id
        ):
            raise ValidationError({
                "partner":
                    "Partner is required when the "
                    "lead channel is PARTNER."
            })

        if (
            self.channel == self.Channel.DIRECT
            and self.partner_id
        ):
            raise ValidationError({
                "partner":
                    "A DIRECT lead cannot be linked "
                    "to a partner."
            })

    def save(self, *args, **kwargs):

        if not self.lead_id:

            latest = (
                Lead.objects
                .exclude(lead_id="")
                .order_by("-created_at")
                .first()
            )

            next_number = 1

            if latest and latest.lead_id:
                try:
                    next_number = (
                        int(latest.lead_id.split("-")[-1]) + 1
                    )
                except (ValueError, IndexError):
                    next_number = 1

            self.lead_id = f"LD-{next_number:05d}"

        super().save(*args, **kwargs)


# ================================================================
# LEAD ACTIVITY
# ================================================================

class LeadActivity(models.Model):

    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Created"
        ASSIGNED = "ASSIGNED", "Assigned"
        CALL = "CALL", "Call"
        NOTE = "NOTE", "Note"
        FOLLOW_UP = "FOLLOW_UP", "Follow Up"
        STATUS_CHANGE = "STATUS_CHANGE", "Status Change"
        CONVERTED = "CONVERTED", "Converted"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="activities",
    )

    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
        db_index=True,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lead_activities",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.lead.lead_id} - "
            f"{self.get_activity_type_display()}"
        )


# ================================================================
# CALL LOG
# ================================================================

class CallLog(models.Model):

    class Outcome(models.TextChoices):
        INTERESTED = "INTERESTED", "Interested"
        NOT_INTERESTED = "NOT_INTERESTED", "Not Interested"
        CALLBACK = "CALLBACK", "Call Back"
        NO_ANSWER = "NO_ANSWER", "No Answer"
        BUSY = "BUSY", "Busy"
        WRONG_NUMBER = "WRONG_NUMBER", "Wrong Number"
        SWITCHED_OFF = "SWITCHED_OFF", "Switched Off"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="call_logs",
    )

    telecaller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lead_call_logs",
    )

    outcome = models.CharField(
        max_length=30,
        choices=Outcome.choices,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
    )

    called_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    follow_up_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-called_at"]

        indexes = [
            models.Index(
                fields=["lead", "called_at"],
            ),
            models.Index(
                fields=["telecaller", "called_at"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.lead.lead_id} - "
            f"{self.get_outcome_display()}"
        )

    def clean(self):
        super().clean()

        if (
            self.outcome == self.Outcome.CALLBACK
            and not self.follow_up_at
        ):
            raise ValidationError({
                "follow_up_at":
                    "Follow-up date/time is required "
                    "for a callback."
            })
# ================================================================
# MARKETING LEAD IMPORT BATCH
# ================================================================

class LeadImportBatch(models.Model):

    class Status(models.TextChoices):
        UPLOADED = "UPLOADED", "Uploaded"
        VALIDATED = "VALIDATED", "Validated"
        IMPORTING = "IMPORTING", "Importing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    file_name = models.CharField(
        max_length=255,
    )

    source = models.CharField(
        max_length=100,
        blank=True,
    )

    campaign = models.CharField(
        max_length=150,
        blank=True,
    )

    default_vertical = models.CharField(
        max_length=30,
        choices=Lead.Vertical.choices,
        default=Lead.Vertical.REGULAR,
    )

    default_channel = models.CharField(
        max_length=20,
        choices=Lead.Channel.choices,
        default=Lead.Channel.DIRECT,
    )

    total_rows = models.PositiveIntegerField(
        default=0,
    )

    valid_rows = models.PositiveIntegerField(
        default=0,
    )

    duplicate_rows = models.PositiveIntegerField(
        default=0,
    )

    invalid_rows = models.PositiveIntegerField(
        default=0,
    )

    imported_rows = models.PositiveIntegerField(
        default=0,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOADED,
        db_index=True,
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lead_import_batches",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.file_name} - "
            f"{self.get_status_display()}"
        )


# ================================================================
# MARKETING LEAD IMPORT ROW
# ================================================================

class LeadImportRow(models.Model):

    class Status(models.TextChoices):
        VALID = "VALID", "Valid"
        DUPLICATE = "DUPLICATE", "Duplicate"
        INVALID = "INVALID", "Invalid"
        IMPORTED = "IMPORTED", "Imported"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    batch = models.ForeignKey(
        LeadImportBatch,
        on_delete=models.CASCADE,
        related_name="rows",
    )

    row_number = models.PositiveIntegerField()

    name = models.CharField(
        max_length=255,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=30,
        blank=True,
        db_index=True,
    )

    email = models.EmailField(
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
    )

    interested_course = models.CharField(
        max_length=255,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        db_index=True,
    )

    error_message = models.TextField(
        blank=True,
    )

    existing_lead = models.ForeignKey(
        Lead,
        on_delete=models.SET_NULL,
        related_name="duplicate_import_rows",
        null=True,
        blank=True,
    )

    imported_lead = models.ForeignKey(
        Lead,
        on_delete=models.SET_NULL,
        related_name="import_rows",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["row_number"]

        constraints = [
            models.UniqueConstraint(
                fields=["batch", "row_number"],
                name="unique_lead_import_batch_row",
            )
        ]

    def __str__(self):
        return (
            f"{self.batch.file_name} "
            f"row {self.row_number}"
        )
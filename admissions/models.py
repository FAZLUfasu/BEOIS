import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


# ================================================================
# INSTITUTION
# ================================================================

class Institution(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=255,
        unique=True,
    )

    short_name = models.CharField(
        max_length=100,
        blank=True,
    )

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    website = models.URLField(
        blank=True,
    )

    contact_person = models.CharField(
        max_length=255,
        blank=True,
    )

    contact_phone = models.CharField(
        max_length=30,
        blank=True,
    )

    contact_email = models.EmailField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# ================================================================
# PROGRAM
# ================================================================

class Program(models.Model):

    class Level(models.TextChoices):
        UG = "UG", "Undergraduate"
        PG = "PG", "Postgraduate"
        DIPLOMA = "DIPLOMA", "Diploma"
        CERTIFICATE = "CERTIFICATE", "Certificate"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="programs",
    )

    name = models.CharField(
        max_length=255,
    )

    code = models.CharField(
        max_length=50,
        blank=True,
    )

    level = models.CharField(
        max_length=30,
        choices=Level.choices,
        default=Level.UG,
    )

    duration_years = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    duration_semesters = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    is_credit_transfer_available = models.BooleanField(
        default=False,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["institution", "name"]

        constraints = [
            models.UniqueConstraint(
                fields=["institution", "name"],
                name="unique_institution_program",
            ),
        ]

    def __str__(self):
        return f"{self.name} - {self.institution.name}"


# ================================================================
# ADMISSION
# ================================================================

class Admission(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        DOCUMENT_PENDING = "DOCUMENT_PENDING", "Document Pending"
        DOCUMENT_VERIFICATION = (
            "DOCUMENT_VERIFICATION",
            "Document Verification",
        )
        ELIGIBILITY_PENDING = (
            "ELIGIBILITY_PENDING",
            "Eligibility Pending",
        )
        ELIGIBLE = "ELIGIBLE", "Eligible"
        NOT_ELIGIBLE = "NOT_ELIGIBLE", "Not Eligible"
        FEE_PENDING = "FEE_PENDING", "Fee Pending"
        READY_TO_APPLY = "READY_TO_APPLY", "Ready to Apply"
        APPLIED = "APPLIED", "Applied"
        ENROLLMENT_PENDING = (
            "ENROLLMENT_PENDING",
            "Enrollment Pending",
        )
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class Vertical(models.TextChoices):
        REGULAR = "REGULAR", "Regular Distance Education"
        CREDIT_TRANSFER = "CREDIT_TRANSFER", "Credit Transfer"

    class Channel(models.TextChoices):
        DIRECT = "DIRECT", "BEST Direct"
        PARTNER = "PARTNER", "Partner"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    admission_id = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
    )

    lead = models.OneToOneField(
        "leads.Lead",
        on_delete=models.PROTECT,
        related_name="admission",
        null=True,
        blank=True,
    )

    # ------------------------------------------------------------
    # APPLICANT
    # ------------------------------------------------------------

    applicant_name = models.CharField(
        max_length=255,
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    gender = models.CharField(
        max_length=30,
        blank=True,
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

    address = models.TextField(
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

    postal_code = models.CharField(
        max_length=20,
        blank=True,
    )

    # ------------------------------------------------------------
    # ACADEMIC
    # ------------------------------------------------------------

    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="admissions",
    )

    program = models.ForeignKey(
        Program,
        on_delete=models.PROTECT,
        related_name="admissions",
    )

    academic_session = models.CharField(
        max_length=50,
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
    # PARTNER
    # ------------------------------------------------------------

    partner = models.ForeignKey(
        "partners.Partner",
        on_delete=models.PROTECT,
        related_name="admissions",
        null=True,
        blank=True,
    )

    # Retained for compatibility/reference purposes.
    partner_reference = models.CharField(
        max_length=100,
        blank=True,
    )

    # ------------------------------------------------------------
    # CREDIT TRANSFER
    # ------------------------------------------------------------

    previous_institution = models.CharField(
        max_length=255,
        blank=True,
    )

    previous_program = models.CharField(
        max_length=255,
        blank=True,
    )

    previous_registration_number = models.CharField(
        max_length=100,
        blank=True,
    )

    completed_years = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    completed_semesters = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    credit_transfer_notes = models.TextField(
        blank=True,
    )

    # ------------------------------------------------------------
    # UNIVERSITY
    # ------------------------------------------------------------

    university_application_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    enrollment_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    university_admission_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    applied_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # ------------------------------------------------------------
    # WORKFLOW
    # ------------------------------------------------------------

    status = models.CharField(
        max_length=40,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_admissions",
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_admissions",
        null=True,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["status", "assigned_to"],
            ),
            models.Index(
                fields=["institution", "status"],
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
        return f"{self.admission_id} - {self.applicant_name}"

    def clean(self):
        super().clean()

        if (
            self.program_id
            and self.institution_id
            and self.program.institution_id != self.institution_id
        ):
            raise ValidationError({
                "program":
                    "The selected program does not belong "
                    "to the selected institution."
            })

        if (
            self.vertical == self.Vertical.CREDIT_TRANSFER
            and self.program_id
            and not self.program.is_credit_transfer_available
        ):
            raise ValidationError({
                "program":
                    "Credit Transfer is not enabled "
                    "for this program."
            })

        if (
            self.channel == self.Channel.PARTNER
            and not self.partner_id
        ):
            raise ValidationError({
                "partner":
                    "Partner is required for a "
                    "PARTNER channel admission."
            })

        if (
            self.channel == self.Channel.DIRECT
            and self.partner_id
        ):
            raise ValidationError({
                "partner":
                    "A DIRECT admission cannot "
                    "be linked to a partner."
            })

        if (
            self.lead_id
            and self.lead.partner_id
            and self.partner_id
            and self.lead.partner_id != self.partner_id
        ):
            raise ValidationError({
                "partner":
                    "Admission partner must match "
                    "the partner linked to the lead."
            })

    def save(self, *args, **kwargs):

        if not self.admission_id:

            latest = (
                Admission.objects
                .exclude(admission_id="")
                .order_by("-created_at")
                .first()
            )

            next_number = 1

            if latest and latest.admission_id:
                try:
                    next_number = (
                        int(latest.admission_id.split("-")[-1]) + 1
                    )
                except (ValueError, IndexError):
                    next_number = 1

            self.admission_id = f"AD-{next_number:05d}"

        super().save(*args, **kwargs)


# ================================================================
# ADMISSION DOCUMENT
# ================================================================

class AdmissionDocument(models.Model):

    class DocumentType(models.TextChoices):
        PHOTO = "PHOTO", "Photo"
        AADHAAR = "AADHAAR", "Aadhaar"
        SSLC = "SSLC", "SSLC"
        PLUS_TWO = "PLUS_TWO", "Plus Two"
        UG_CERTIFICATE = "UG_CERTIFICATE", "UG Certificate"
        PG_CERTIFICATE = "PG_CERTIFICATE", "PG Certificate"
        TRANSFER_CERTIFICATE = (
            "TRANSFER_CERTIFICATE",
            "Transfer Certificate",
        )
        MIGRATION_CERTIFICATE = (
            "MIGRATION_CERTIFICATE",
            "Migration Certificate",
        )
        MARK_SHEET = "MARK_SHEET", "Mark Sheet"
        PREVIOUS_SEMESTER = (
            "PREVIOUS_SEMESTER",
            "Previous Semester Document",
        )
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RECEIVED = "RECEIVED", "Received"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document_type = models.CharField(
        max_length=40,
        choices=DocumentType.choices,
        db_index=True,
    )

    document_name = models.CharField(
        max_length=255,
        blank=True,
    )

    file = models.FileField(
        upload_to="admissions/documents/%Y/%m/",
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="verified_admission_documents",
        null=True,
        blank=True,
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.admission.admission_id} - "
            f"{self.get_document_type_display()}"
        )


# ================================================================
# ADMISSION FEE
# ================================================================

class AdmissionFee(models.Model):

    class FeeType(models.TextChoices):
        REGISTRATION = "REGISTRATION", "Registration"
        ADMISSION = "ADMISSION", "Admission"
        TUITION = "TUITION", "Tuition"
        EXAM = "EXAM", "Exam"
        UNIVERSITY = "UNIVERSITY", "University"
        PROJECT = "PROJECT", "Project"
        CERTIFICATE = "CERTIFICATE", "Certificate"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name="fees",
    )

    fee_type = models.CharField(
        max_length=30,
        choices=FeeType.choices,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return (
            f"{self.admission.admission_id} - "
            f"{self.get_fee_type_display()} - ₹{self.amount}"
        )


# ================================================================
# ADMISSION PAYMENT
# ================================================================

class AdmissionPayment(models.Model):

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
        CARD = "CARD", "Card"
        CHEQUE = "CHEQUE", "Cheque"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    admission = models.ForeignKey(
        Admission,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
    )

    reference_number = models.CharField(
        max_length=150,
        blank=True,
    )

    receipt_number = models.CharField(
        max_length=100,
        blank=True,
    )

    paid_at = models.DateTimeField()

    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_admission_payments",
        null=True,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self):
        return (
            f"{self.admission.admission_id} - "
            f"₹{self.amount}"
        )


# ================================================================
# ADMISSION ACTIVITY
# ================================================================

class AdmissionActivity(models.Model):

    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Created"
        STATUS_CHANGE = "STATUS_CHANGE", "Status Change"
        DOCUMENT = "DOCUMENT", "Document"
        ELIGIBILITY = "ELIGIBILITY", "Eligibility"
        PAYMENT = "PAYMENT", "Payment"
        UNIVERSITY_APPLICATION = (
            "UNIVERSITY_APPLICATION",
            "University Application",
        )
        ENROLLMENT = "ENROLLMENT", "Enrollment"
        NOTE = "NOTE", "Note"
        COMPLETED = "COMPLETED", "Completed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name="activities",
    )

    activity_type = models.CharField(
        max_length=40,
        choices=ActivityType.choices,
        db_index=True,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="admission_activities",
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
            f"{self.admission.admission_id} - "
            f"{self.get_activity_type_display()}"
        )
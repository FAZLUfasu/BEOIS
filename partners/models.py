import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from core.services import build_next_identifier
from admissions.models import Admission, Institution, Program


# ================================================================
# PARTNER MASTER
# ================================================================

class Partner(models.Model):

    class PartnerType(models.TextChoices):
        EDUCATION_CENTRE = "EDUCATION_CENTRE", "Education Centre"
        CONSULTANT = "CONSULTANT", "Education Consultant"
        INDIVIDUAL = "INDIVIDUAL", "Individual Partner"
        INSTITUTION = "INSTITUTION", "Institutional Partner"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PROSPECT = "PROSPECT", "Prospect"
        ONBOARDING = "ONBOARDING", "Onboarding"
        ACTIVE = "ACTIVE", "Active"
        ON_HOLD = "ON_HOLD", "On Hold"
        SUSPENDED = "SUSPENDED", "Suspended"
        INACTIVE = "INACTIVE", "Inactive"
        TERMINATED = "TERMINATED", "Terminated"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    partner_id = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
    )

    name = models.CharField(
        max_length=255,
        db_index=True,
    )

    partner_type = models.CharField(
        max_length=30,
        choices=PartnerType.choices,
        default=PartnerType.EDUCATION_CENTRE,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PROSPECT,
        db_index=True,
    )

    # ------------------------------------------------------------
    # CONTACT
    # ------------------------------------------------------------

    contact_person = models.CharField(
        max_length=255,
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

    email = models.EmailField(blank=True)

    # ------------------------------------------------------------
    # ADDRESS / TERRITORY
    # ------------------------------------------------------------

    address = models.TextField(blank=True)

    city = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    district = models.CharField(
        max_length=100,
        blank=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
    )

    territory = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )

    # ------------------------------------------------------------
    # BUSINESS / KYC
    # ------------------------------------------------------------

    organization_name = models.CharField(
        max_length=255,
        blank=True,
    )

    gst_number = models.CharField(
        max_length=30,
        blank=True,
    )

    pan_number = models.CharField(
        max_length=30,
        blank=True,
    )

    aadhaar_number = models.CharField(
        max_length=20,
        blank=True,
    )

    agreement_start_date = models.DateField(
        null=True,
        blank=True,
    )

    agreement_end_date = models.DateField(
        null=True,
        blank=True,
    )

    # ------------------------------------------------------------
    # MANAGEMENT
    # ------------------------------------------------------------

    relationship_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="managed_partners",
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_partners",
        null=True,
        blank=True,
    )

    notes = models.TextField(blank=True)

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
                fields=["status", "relationship_manager"],
            ),
            models.Index(
                fields=["state", "city"],
            ),
        ]

    def __str__(self):
        return f"{self.partner_id} - {self.name}"

    def clean(self):
        super().clean()

        if (
            self.agreement_start_date
            and self.agreement_end_date
            and self.agreement_end_date < self.agreement_start_date
        ):
            raise ValidationError({
                "agreement_end_date":
                    "Agreement end date cannot be before "
                    "agreement start date."
            })

    def save(self, *args, **kwargs):

        if not self.partner_id:
            with transaction.atomic():

                self.partner_id = build_next_identifier(
                    Partner.objects.all(),
                    "partner_id",
                    "partner",
                )

                super().save(
                    *args,
                    **kwargs,
                )
        else:
            super().save(
                *args,
                **kwargs,
            )


# ================================================================
# PARTNER DOCUMENTS
# ================================================================

class PartnerDocument(models.Model):

    class DocumentType(models.TextChoices):
        AADHAAR = "AADHAAR", "Aadhaar"
        PAN = "PAN", "PAN Card"
        GST = "GST", "GST Certificate"
        BUSINESS_PROOF = "BUSINESS_PROOF", "Business Proof"
        ADDRESS_PROOF = "ADDRESS_PROOF", "Address Proof"
        BANK_PROOF = "BANK_PROOF", "Bank Proof"
        AGREEMENT = "AGREEMENT", "Agreement"
        PHOTO = "PHOTO", "Photo"
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

    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        db_index=True,
    )

    title = models.CharField(
        max_length=255,
        blank=True,
    )

    file = models.FileField(
        upload_to="partners/documents/%Y/%m/",
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
        related_name="verified_partner_documents",
        null=True,
        blank=True,
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.partner.partner_id} - "
            f"{self.get_document_type_display()}"
        )


# ================================================================
# PARTNER PROGRAM ACCESS
# ================================================================

class PartnerProgramAccess(models.Model):
    """
    Defines which institution/program combinations
    a partner is authorized to promote or submit.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name="program_access",
    )

    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="partner_access",
    )

    program = models.ForeignKey(
        Program,
        on_delete=models.PROTECT,
        related_name="partner_access",
    )

    is_active = models.BooleanField(default=True)

    effective_from = models.DateField(
        null=True,
        blank=True,
    )

    effective_to = models.DateField(
        null=True,
        blank=True,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["partner", "institution", "program"]

        constraints = [
            models.UniqueConstraint(
                fields=["partner", "institution", "program"],
                name="unique_partner_program_access",
            ),
        ]

    def __str__(self):
        return (
            f"{self.partner.partner_id} - "
            f"{self.institution.name} - "
            f"{self.program.name}"
        )

    def clean(self):
        super().clean()

        if (
            self.program_id
            and self.institution_id
            and self.program.institution_id != self.institution_id
        ):
            raise ValidationError({
                "program":
                    "Program does not belong to "
                    "the selected institution."
            })

        if (
            self.effective_from
            and self.effective_to
            and self.effective_to < self.effective_from
        ):
            raise ValidationError({
                "effective_to":
                    "Effective-to date cannot be before "
                    "effective-from date."
            })


# ================================================================
# PARTNER STUDENT / ADMISSION CASE
# ================================================================

class PartnerCase(models.Model):

    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        ADMISSION_CREATED = "ADMISSION_CREATED", "Admission Created"
        ENROLLED = "ENROLLED", "Enrolled"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    case_id = models.CharField(
        max_length=25,
        unique=True,
        blank=True,
        editable=False,
    )

    partner = models.ForeignKey(
        Partner,
        on_delete=models.PROTECT,
        related_name="cases",
    )

    admission = models.OneToOneField(
        Admission,
        on_delete=models.PROTECT,
        related_name="partner_case",
        null=True,
        blank=True,
    )

    applicant_name = models.CharField(max_length=255)

    phone_number = models.CharField(
        max_length=30,
        db_index=True,
    )

    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="partner_cases",
        null=True,
        blank=True,
    )

    program = models.ForeignKey(
        Program,
        on_delete=models.PROTECT,
        related_name="partner_cases",
        null=True,
        blank=True,
    )

    vertical = models.CharField(
        max_length=30,
        choices=Admission.Vertical.choices,
        default=Admission.Vertical.REGULAR,
        db_index=True,
    )

    partner_reference_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.RECEIVED,
        db_index=True,
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_partner_cases",
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_partner_cases",
        null=True,
        blank=True,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["partner", "status"],
            ),
            models.Index(
                fields=["status", "assigned_to"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.case_id} - "
            f"{self.applicant_name}"
        )

    def clean(self):
        super().clean()

        if (
            self.program_id
            and self.institution_id
            and self.program.institution_id != self.institution_id
        ):
            raise ValidationError({
                "program":
                    "Program does not belong to "
                    "the selected institution."
            })

        if (
            self.admission_id
            and self.admission.channel != Admission.Channel.PARTNER
        ):
            raise ValidationError({
                "admission":
                    "A partner case must be linked to "
                    "a PARTNER channel admission."
            })

    def save(self, *args, **kwargs):

        if not self.case_id:
            with transaction.atomic():

                self.case_id = build_next_identifier(
                    PartnerCase.objects.all(),
                    "case_id",
                    "partner_case",
                )

                super().save(
                    *args,
                    **kwargs,
                )
        else:
            super().save(
                *args,
                **kwargs,
            )

# ================================================================
# PARTNER COMMISSION RULE
# ================================================================

class CommissionRule(models.Model):

    class CommissionType(models.TextChoices):
        FIXED = "FIXED", "Fixed Amount"
        PERCENTAGE = "PERCENTAGE", "Percentage"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name="commission_rules",
    )

    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="partner_commission_rules",
        null=True,
        blank=True,
    )

    program = models.ForeignKey(
        Program,
        on_delete=models.PROTECT,
        related_name="partner_commission_rules",
        null=True,
        blank=True,
    )

    vertical = models.CharField(
        max_length=30,
        choices=Admission.Vertical.choices,
        blank=True,
        db_index=True,
    )

    commission_type = models.CharField(
        max_length=20,
        choices=CommissionType.choices,
    )

    value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    effective_from = models.DateField(
        null=True,
        blank=True,
    )

    effective_to = models.DateField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["partner", "is_active"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.partner.partner_id} - "
            f"{self.get_commission_type_display()} "
            f"{self.value}"
        )

    def clean(self):
        super().clean()

        if self.value is not None and self.value <= Decimal("0"):
            raise ValidationError({
                "value":
                    "Commission value must be greater than zero."
            })

        if (
            self.commission_type
            == self.CommissionType.PERCENTAGE
            and self.value is not None
            and self.value > Decimal("100")
        ):
            raise ValidationError({
                "value":
                    "Percentage commission cannot exceed 100%."
            })

        if (
            self.program_id
            and self.institution_id
            and self.program.institution_id != self.institution_id
        ):
            raise ValidationError({
                "program":
                    "Program does not belong to "
                    "the selected institution."
            })

        if (
            self.effective_from
            and self.effective_to
            and self.effective_to < self.effective_from
        ):
            raise ValidationError({
                "effective_to":
                    "Effective-to date cannot be before "
                    "effective-from date."
            })


# ================================================================
# COMMISSION TRANSACTION
# ================================================================

class CommissionTransaction(models.Model):

    class Status(models.TextChoices):
        EARNED = "EARNED", "Earned"
        APPROVED = "APPROVED", "Approved"
        PAYABLE = "PAYABLE", "Payable"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    partner = models.ForeignKey(
        Partner,
        on_delete=models.PROTECT,
        related_name="commission_transactions",
    )

    partner_case = models.ForeignKey(
        PartnerCase,
        on_delete=models.PROTECT,
        related_name="commission_transactions",
        null=True,
        blank=True,
    )

    admission = models.ForeignKey(
        Admission,
        on_delete=models.PROTECT,
        related_name="partner_commissions",
        null=True,
        blank=True,
    )

    rule = models.ForeignKey(
        CommissionRule,
        on_delete=models.PROTECT,
        related_name="transactions",
        null=True,
        blank=True,
    )

    base_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.EARNED,
        db_index=True,
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="approved_partner_commissions",
        null=True,
        blank=True,
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    payment_reference = models.CharField(
        max_length=150,
        blank=True,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["partner", "status"],
            ),
            models.Index(
                fields=["status", "created_at"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.partner.partner_id} - "
            f"₹{self.commission_amount} - "
            f"{self.status}"
        )

    def clean(self):
        super().clean()

        if (
            self.commission_amount is not None
            and self.commission_amount < Decimal("0")
        ):
            raise ValidationError({
                "commission_amount":
                    "Commission amount cannot be negative."
            })

        if (
            self.partner_case_id
            and self.partner_case.partner_id != self.partner_id
        ):
            raise ValidationError({
                "partner_case":
                    "Partner case belongs to a different partner."
            })


# ================================================================
# PARTNER ISSUE / SUPPORT
# ================================================================

class PartnerIssue(models.Model):

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        WAITING = "WAITING", "Waiting"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name="issues",
    )

    partner_case = models.ForeignKey(
        PartnerCase,
        on_delete=models.SET_NULL,
        related_name="issues",
        null=True,
        blank=True,
    )

    subject = models.CharField(max_length=255)

    description = models.TextField()

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_partner_issues",
        null=True,
        blank=True,
    )

    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["status", "priority"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.partner.partner_id} - "
            f"{self.subject}"
        )

    def clean(self):
        super().clean()

        if (
            self.partner_case_id
            and self.partner_case.partner_id != self.partner_id
        ):
            raise ValidationError({
                "partner_case":
                    "The selected case belongs "
                    "to a different partner."
            })


# ================================================================
# PARTNER ACTIVITY / AUDIT TIMELINE
# ================================================================

class PartnerActivity(models.Model):

    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Partner Created"
        STATUS_CHANGE = "STATUS_CHANGE", "Status Change"
        DOCUMENT = "DOCUMENT", "Document"
        AGREEMENT = "AGREEMENT", "Agreement"
        PROGRAM_ACCESS = "PROGRAM_ACCESS", "Program Access"
        CASE = "CASE", "Student Case"
        COMMISSION = "COMMISSION", "Commission"
        PAYMENT = "PAYMENT", "Payment"
        ISSUE = "ISSUE", "Issue"
        NOTE = "NOTE", "Note"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    partner = models.ForeignKey(
        Partner,
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
        related_name="partner_activities",
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
            f"{self.partner.partner_id} - "
            f"{self.get_activity_type_display()}"
        )
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from leads.models import Lead
from leads.services import change_lead_status

from .models import (
    Admission,
    AdmissionActivity,
    AdmissionDocument,
    AdmissionFee,
    AdmissionPayment,
)


def _log_activity(
    admission,
    activity_type,
    description,
    performed_by=None,
):
    return AdmissionActivity.objects.create(
        admission=admission,
        activity_type=activity_type,
        description=description,
        performed_by=performed_by,
    )


# ================================================================
# CREATE ADMISSION FROM LEAD
# ================================================================

@transaction.atomic
def create_admission_from_lead(
    lead,
    institution,
    program,
    created_by=None,
    assigned_to=None,
    academic_session="",
):
    if not isinstance(lead, Lead):
        raise ValidationError(
            "A valid Lead instance is required."
        )

    if lead.status != Lead.Status.QUALIFIED:
        raise ValidationError(
            "Only QUALIFIED leads can be converted "
            "to admission."
        )

    if hasattr(lead, "admission"):
        raise ValidationError(
            "An admission already exists for this lead."
        )

    if not institution.is_active:
        raise ValidationError(
            "Selected institution is inactive."
        )

    if not program.is_active:
        raise ValidationError(
            "Selected program is inactive."
        )

    if program.institution_id != institution.id:
        raise ValidationError(
            "Program does not belong to "
            "the selected institution."
        )

    if (
        lead.vertical == Lead.Vertical.CREDIT_TRANSFER
        and not program.is_credit_transfer_available
    ):
        raise ValidationError(
            "Credit Transfer is not available "
            "for this program."
        )

    if (
        lead.channel == Lead.Channel.PARTNER
        and not lead.partner_id
    ):
        raise ValidationError(
            "Partner lead does not have "
            "a partner assigned."
        )

    admission = Admission(
        lead=lead,

        applicant_name=lead.name,
        phone_number=lead.phone_number,
        alternate_phone=lead.alternate_phone,
        email=lead.email,

        city=lead.city,
        state=lead.state,

        institution=institution,
        program=program,
        academic_session=academic_session,

        vertical=lead.vertical,
        channel=lead.channel,

        partner=lead.partner,
        partner_reference=lead.partner_reference_number,

        previous_program=lead.previous_course,

        status=Admission.Status.DRAFT,

        assigned_to=assigned_to,
        created_by=created_by,

        notes=lead.notes,
    )

    admission.full_clean()
    admission.save()

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.CREATED,
        (
            f"Admission {admission.admission_id} "
            f"created from lead {lead.lead_id}."
        ),
        created_by,
    )

    change_lead_status(
        lead,
        Lead.Status.CONVERTED,
        performed_by=created_by,
        notes=(
            f"Converted to admission "
            f"{admission.admission_id}."
        ),
    )

    return admission


# ================================================================
# CHANGE ADMISSION STATUS
# ================================================================

@transaction.atomic
def change_admission_status(
    admission,
    status,
    performed_by=None,
    notes="",
):
    valid_statuses = {
        value for value, _ in Admission.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError(
            "Invalid admission status."
        )

    previous_status = admission.status

    if previous_status == status:
        return admission

    if status == Admission.Status.APPLIED:
        admission.applied_at = timezone.now()

    if status == Admission.Status.COMPLETED:

        if not admission.enrollment_number:
            raise ValidationError(
                "Enrollment number is required "
                "before completing admission."
            )

        admission.completed_at = timezone.now()

    elif previous_status == Admission.Status.COMPLETED:
        admission.completed_at = None

    admission.status = status

    admission.full_clean()
    admission.save()

    activity_type = (
        AdmissionActivity.ActivityType.COMPLETED
        if status == Admission.Status.COMPLETED
        else AdmissionActivity.ActivityType.STATUS_CHANGE
    )

    description = (
        f"Admission status changed from "
        f"{previous_status} to {status}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_activity(
        admission,
        activity_type,
        description,
        performed_by,
    )

    return admission


# ================================================================
# NOTE
# ================================================================

@transaction.atomic
def add_admission_note(
    admission,
    description,
    performed_by=None,
):
    description = description.strip()

    if not description:
        raise ValidationError(
            "Note cannot be empty."
        )

    return _log_activity(
        admission,
        AdmissionActivity.ActivityType.NOTE,
        description,
        performed_by,
    )


# ================================================================
# DOCUMENT
# ================================================================

@transaction.atomic
def add_admission_document(
    admission,
    document_type,
    document_name="",
    file=None,
    notes="",
    performed_by=None,
):
    valid_types = {
        value
        for value, _
        in AdmissionDocument.DocumentType.choices
    }

    if document_type not in valid_types:
        raise ValidationError(
            "Invalid admission document type."
        )

    document = AdmissionDocument(
        admission=admission,
        document_type=document_type,
        document_name=document_name.strip(),
        file=file,
        status=(
            AdmissionDocument.Status.RECEIVED
            if file
            else AdmissionDocument.Status.PENDING
        ),
        notes=notes.strip(),
    )

    document.full_clean()
    document.save()

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.DOCUMENT,
        (
            f"{document.get_document_type_display()} "
            f"document added."
        ),
        performed_by,
    )

    return document


@transaction.atomic
def verify_admission_document(
    document,
    verified_by=None,
    notes="",
):
    document.status = AdmissionDocument.Status.VERIFIED
    document.verified_by = verified_by
    document.verified_at = timezone.now()
    document.rejection_reason = ""

    if notes.strip():
        document.notes = notes.strip()

    document.full_clean()
    document.save()

    _log_activity(
        document.admission,
        AdmissionActivity.ActivityType.DOCUMENT,
        (
            f"{document.get_document_type_display()} "
            f"verified."
        ),
        verified_by,
    )

    return document


@transaction.atomic
def reject_admission_document(
    document,
    reason,
    performed_by=None,
):
    reason = reason.strip()

    if not reason:
        raise ValidationError(
            "Rejection reason is required."
        )

    document.status = AdmissionDocument.Status.REJECTED
    document.rejection_reason = reason
    document.verified_by = None
    document.verified_at = None

    document.full_clean()
    document.save()

    _log_activity(
        document.admission,
        AdmissionActivity.ActivityType.DOCUMENT,
        (
            f"{document.get_document_type_display()} "
            f"rejected. {reason}"
        ),
        performed_by,
    )

    return document


# ================================================================
# ELIGIBILITY
# ================================================================

@transaction.atomic
def mark_admission_eligible(
    admission,
    performed_by=None,
    notes="",
):
    previous_status = admission.status

    admission.status = Admission.Status.ELIGIBLE
    admission.full_clean()
    admission.save()

    description = (
        f"Eligibility approved. "
        f"Previous status: {previous_status}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.ELIGIBILITY,
        description,
        performed_by,
    )

    return admission


@transaction.atomic
def mark_admission_not_eligible(
    admission,
    reason,
    performed_by=None,
):
    reason = reason.strip()

    if not reason:
        raise ValidationError(
            "Reason is required."
        )

    admission.status = Admission.Status.NOT_ELIGIBLE
    admission.full_clean()
    admission.save()

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.ELIGIBILITY,
        f"Admission marked not eligible. {reason}",
        performed_by,
    )

    return admission


# ================================================================
# FEES
# ================================================================

@transaction.atomic
def add_admission_fee(
    admission,
    fee_type,
    amount,
    description="",
    due_date=None,
):
    valid_types = {
        value for value, _ in AdmissionFee.FeeType.choices
    }

    if fee_type not in valid_types:
        raise ValidationError(
            "Invalid fee type."
        )

    amount = Decimal(str(amount))

    if amount <= Decimal("0"):
        raise ValidationError(
            "Fee amount must be greater than zero."
        )

    fee = AdmissionFee(
        admission=admission,
        fee_type=fee_type,
        description=description.strip(),
        amount=amount,
        due_date=due_date,
    )

    fee.full_clean()
    fee.save()

    return fee


# ================================================================
# PAYMENT
# ================================================================

@transaction.atomic
def record_admission_payment(
    admission,
    amount,
    payment_method,
    received_by=None,
    reference_number="",
    receipt_number="",
    notes="",
):
    amount = Decimal(str(amount))

    if amount <= Decimal("0"):
        raise ValidationError(
            "Payment amount must be greater than zero."
        )

    valid_methods = {
        value
        for value, _
        in AdmissionPayment.PaymentMethod.choices
    }

    if payment_method not in valid_methods:
        raise ValidationError(
            "Invalid payment method."
        )

    payment = AdmissionPayment(
        admission=admission,
        amount=amount,
        payment_method=payment_method,
        reference_number=reference_number.strip(),
        receipt_number=receipt_number.strip(),
        paid_at=timezone.now(),
        received_by=received_by,
        notes=notes.strip(),
    )

    payment.full_clean()
    payment.save()

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.PAYMENT,
        (
            f"Payment received: ₹{amount} "
            f"via {payment_method}."
        ),
        received_by,
    )

    return payment


# ================================================================
# FEE SUMMARY
# ================================================================

def get_admission_fee_summary(admission):

    total_fee = (
        admission.fees.aggregate(
            total=Sum("amount")
        )["total"]
        or Decimal("0.00")
    )

    total_paid = (
        admission.payments.aggregate(
            total=Sum("amount")
        )["total"]
        or Decimal("0.00")
    )

    return {
        "total_fee": total_fee,
        "total_paid": total_paid,
        "balance": total_fee - total_paid,
    }


# ================================================================
# UNIVERSITY APPLICATION
# ================================================================

@transaction.atomic
def submit_university_application(
    admission,
    application_number,
    performed_by=None,
):
    application_number = application_number.strip()

    if not application_number:
        raise ValidationError(
            "University application number is required."
        )

    admission.university_application_number = (
        application_number
    )

    admission.applied_at = timezone.now()
    admission.status = Admission.Status.APPLIED

    admission.full_clean()
    admission.save()

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.UNIVERSITY_APPLICATION,
        (
            f"Application submitted to "
            f"{admission.institution.name}. "
            f"Application No: {application_number}."
        ),
        performed_by,
    )

    return admission


# ================================================================
# ENROLLMENT
# ================================================================

@transaction.atomic
def record_enrollment(
    admission,
    enrollment_number,
    performed_by=None,
    university_admission_number="",
):
    enrollment_number = enrollment_number.strip()

    if not enrollment_number:
        raise ValidationError(
            "Enrollment number is required."
        )

    admission.enrollment_number = enrollment_number

    admission.university_admission_number = (
        university_admission_number.strip()
    )

    admission.status = Admission.Status.ENROLLMENT_PENDING

    admission.full_clean()
    admission.save()

    description = (
        f"Enrollment number received: "
        f"{enrollment_number}."
    )

    if university_admission_number.strip():
        description += (
            f" University Admission No: "
            f"{university_admission_number.strip()}."
        )

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.ENROLLMENT,
        description,
        performed_by,
    )

    return admission


# ================================================================
# COMPLETE ADMISSION
# ================================================================

@transaction.atomic
def complete_admission(
    admission,
    performed_by=None,
    notes="",
):
    if not admission.enrollment_number:
        raise ValidationError(
            "Enrollment number is required "
            "before completing admission."
        )

    admission.status = Admission.Status.COMPLETED
    admission.completed_at = timezone.now()

    admission.full_clean()
    admission.save()

    description = (
        f"Admission {admission.admission_id} completed."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_activity(
        admission,
        AdmissionActivity.ActivityType.COMPLETED,
        description,
        performed_by,
    )

    return admission


# ================================================================
# QUEUES
# ================================================================

def get_pending_admissions():
    return Admission.objects.exclude(
        status__in=[
            Admission.Status.COMPLETED,
            Admission.Status.CANCELLED,
            Admission.Status.NOT_ELIGIBLE,
        ]
    ).order_by("-updated_at")


def get_my_admissions(user):
    return Admission.objects.filter(
        assigned_to=user,
    ).exclude(
        status__in=[
            Admission.Status.COMPLETED,
            Admission.Status.CANCELLED,
        ]
    ).order_by("-updated_at")


def get_document_pending_admissions():
    return Admission.objects.filter(
        status__in=[
            Admission.Status.DOCUMENT_PENDING,
            Admission.Status.DOCUMENT_VERIFICATION,
        ]
    ).order_by("-updated_at")


def get_fee_pending_admissions():
    return Admission.objects.filter(
        status=Admission.Status.FEE_PENDING,
    ).order_by("-updated_at")


def get_enrollment_pending_admissions():
    return Admission.objects.filter(
        status=Admission.Status.ENROLLMENT_PENDING,
    ).order_by("-updated_at")
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from admissions.models import Admission
from leads.models import Lead, LeadActivity

from .models import (
    CommissionRule,
    CommissionTransaction,
    Partner,
    PartnerActivity,
    PartnerCase,
    PartnerDocument,
    PartnerIssue,
    PartnerProgramAccess,
)


def _log_partner_activity(partner, activity_type, description, performed_by=None):
    return PartnerActivity.objects.create(
        partner=partner,
        activity_type=activity_type,
        description=description,
        performed_by=performed_by,
    )


# ================================================================
# PARTNER CREATION
# ================================================================

@transaction.atomic
def create_partner(
    name,
    phone_number,
    partner_type=Partner.PartnerType.EDUCATION_CENTRE,
    contact_person="",
    email="",
    city="",
    district="",
    state="",
    territory="",
    organization_name="",
    relationship_manager=None,
    created_by=None,
    notes="",
):
    name = name.strip()
    phone_number = phone_number.strip()

    if not name:
        raise ValidationError("Partner name is required.")

    if not phone_number:
        raise ValidationError("Partner phone number is required.")

    valid_types = {value for value, _ in Partner.PartnerType.choices}

    if partner_type not in valid_types:
        raise ValidationError("Invalid partner type.")

    partner = Partner(
        name=name,
        phone_number=phone_number,
        partner_type=partner_type,
        status=Partner.Status.PROSPECT,
        contact_person=contact_person.strip(),
        email=email.strip(),
        city=city.strip(),
        district=district.strip(),
        state=state.strip(),
        territory=territory.strip(),
        organization_name=organization_name.strip(),
        relationship_manager=relationship_manager,
        created_by=created_by,
        notes=notes.strip(),
    )

    partner.full_clean()
    partner.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.CREATED,
        f"Partner {partner.partner_id} created.",
        created_by,
    )

    return partner

# ================================================================
# PARTNER CASE -> LEAD
# ================================================================

@transaction.atomic
def create_lead_from_partner_case(
    case,
    created_by=None,
):
    """
    Convert a PartnerCase into the standard BEOIS Lead workflow.
    """

    if case.partner.status != Partner.Status.ACTIVE:
        raise ValidationError(
            "Partner must be ACTIVE before creating a lead."
        )

    existing_lead = Lead.objects.filter(
        partner=case.partner,
        partner_reference_number=case.case_id,
    ).first()

    if existing_lead:
        raise ValidationError(
            f"Lead {existing_lead.lead_id} already exists "
            f"for partner case {case.case_id}."
        )

    if case.program and case.institution:
        has_access = PartnerProgramAccess.objects.filter(
            partner=case.partner,
            institution=case.institution,
            program=case.program,
            is_active=True,
        ).exists()

        if not has_access:
            raise ValidationError(
                "Partner does not have active access "
                "to the selected program."
            )

    lead = Lead(
        name=case.applicant_name,
        phone_number=case.phone_number,

        vertical=case.vertical,
        channel=Lead.Channel.PARTNER,

        partner=case.partner,
        partner_reference_number=case.case_id,

        source="Partner Network",

        interested_course=(
            case.program.name
            if case.program
            else ""
        ),

        assigned_to=case.assigned_to,

        assigned_at=(
            timezone.now()
            if case.assigned_to
            else None
        ),

        created_by=created_by,

        status=(
            Lead.Status.ASSIGNED
            if case.assigned_to
            else Lead.Status.NEW
        ),

        notes=(
            f"Created from partner case "
            f"{case.case_id}. {case.notes}"
        ).strip(),
    )

    lead.full_clean()
    lead.save()

    LeadActivity.objects.create(
        lead=lead,
        activity_type=LeadActivity.ActivityType.CREATED,
        description=(
            f"Lead {lead.lead_id} created from "
            f"partner case {case.case_id}."
        ),
        performed_by=created_by,
    )

    if case.assigned_to:
        LeadActivity.objects.create(
            lead=lead,
            activity_type=LeadActivity.ActivityType.ASSIGNED,
            description=(
                f"Lead assigned to "
                f"{case.assigned_to.username} "
                f"from partner case {case.case_id}."
            ),
            performed_by=created_by,
        )

    _log_partner_activity(
        case.partner,
        PartnerActivity.ActivityType.CASE,
        (
            f"Partner case {case.case_id} converted "
            f"to lead {lead.lead_id}."
        ),
        created_by,
    )

    return lead
# ================================================================
# PARTNER STATUS
# ================================================================

@transaction.atomic
def change_partner_status(partner, status, performed_by=None, notes=""):
    valid_statuses = {value for value, _ in Partner.Status.choices}

    if status not in valid_statuses:
        raise ValidationError("Invalid partner status.")

    previous_status = partner.status

    if previous_status == status:
        return partner

    partner.status = status
    partner.full_clean()
    partner.save()

    description = (
        f"Partner status changed from {previous_status} to {status}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.STATUS_CHANGE,
        description,
        performed_by,
    )

    return partner


# ================================================================
# PARTNER DOCUMENT
# ================================================================

@transaction.atomic
def add_partner_document(
    partner,
    document_type,
    title="",
    file=None,
    notes="",
    performed_by=None,
):
    valid_types = {
        value for value, _ in PartnerDocument.DocumentType.choices
    }

    if document_type not in valid_types:
        raise ValidationError("Invalid partner document type.")

    document = PartnerDocument(
        partner=partner,
        document_type=document_type,
        title=title.strip(),
        file=file,
        status=(
            PartnerDocument.Status.RECEIVED
            if file
            else PartnerDocument.Status.PENDING
        ),
        notes=notes.strip(),
    )

    document.full_clean()
    document.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.DOCUMENT,
        f"{document.get_document_type_display()} document added.",
        performed_by,
    )

    return document


@transaction.atomic
def verify_partner_document(document, verified_by=None, notes=""):
    document.status = PartnerDocument.Status.VERIFIED
    document.verified_by = verified_by
    document.verified_at = timezone.now()
    document.rejection_reason = ""

    if notes.strip():
        document.notes = notes.strip()

    document.full_clean()
    document.save()

    _log_partner_activity(
        document.partner,
        PartnerActivity.ActivityType.DOCUMENT,
        f"{document.get_document_type_display()} document verified.",
        verified_by,
    )

    return document


@transaction.atomic
def reject_partner_document(document, reason, performed_by=None):
    reason = reason.strip()

    if not reason:
        raise ValidationError("Rejection reason is required.")

    document.status = PartnerDocument.Status.REJECTED
    document.rejection_reason = reason
    document.verified_by = None
    document.verified_at = None

    document.full_clean()
    document.save()

    _log_partner_activity(
        document.partner,
        PartnerActivity.ActivityType.DOCUMENT,
        (
            f"{document.get_document_type_display()} document rejected. "
            f"{reason}"
        ),
        performed_by,
    )

    return document


# ================================================================
# PROGRAM ACCESS
# ================================================================

@transaction.atomic
def grant_program_access(
    partner,
    institution,
    program,
    effective_from=None,
    effective_to=None,
    notes="",
    performed_by=None,
):
    if program.institution_id != institution.id:
        raise ValidationError(
            "Program does not belong to the selected institution."
        )

    access, created = PartnerProgramAccess.objects.get_or_create(
        partner=partner,
        institution=institution,
        program=program,
        defaults={
            "effective_from": effective_from,
            "effective_to": effective_to,
            "is_active": True,
            "notes": notes.strip(),
        },
    )

    if not created:
        access.is_active = True

        if effective_from is not None:
            access.effective_from = effective_from

        if effective_to is not None:
            access.effective_to = effective_to

        if notes.strip():
            access.notes = notes.strip()

        access.full_clean()
        access.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.PROGRAM_ACCESS,
        (
            f"Program access granted: "
            f"{institution.name} / {program.name}."
        ),
        performed_by,
    )

    return access


# ================================================================
# PARTNER CASE
# ================================================================

@transaction.atomic
def create_partner_case(
    partner,
    applicant_name,
    phone_number,
    institution=None,
    program=None,
    vertical=Admission.Vertical.REGULAR,
    partner_reference_number="",
    assigned_to=None,
    created_by=None,
    notes="",
):
    if partner.status != Partner.Status.ACTIVE:
        raise ValidationError(
            "Only ACTIVE partners can submit student cases."
        )

    applicant_name = applicant_name.strip()
    phone_number = phone_number.strip()

    if not applicant_name:
        raise ValidationError("Applicant name is required.")

    if not phone_number:
        raise ValidationError("Applicant phone number is required.")

    if program and institution:
        if program.institution_id != institution.id:
            raise ValidationError(
                "Program does not belong to the selected institution."
            )

        has_access = PartnerProgramAccess.objects.filter(
            partner=partner,
            institution=institution,
            program=program,
            is_active=True,
        ).exists()

        if not has_access:
            raise ValidationError(
                "Partner does not have active access to this program."
            )

    case = PartnerCase(
        partner=partner,
        applicant_name=applicant_name,
        phone_number=phone_number,
        institution=institution,
        program=program,
        vertical=vertical,
        partner_reference_number=partner_reference_number.strip(),
        status=PartnerCase.Status.RECEIVED,
        assigned_to=assigned_to,
        created_by=created_by,
        notes=notes.strip(),
    )

    case.full_clean()
    case.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.CASE,
        (
            f"Partner case {case.case_id} created for "
            f"{case.applicant_name}."
        ),
        created_by,
    )

    return case


@transaction.atomic
def change_partner_case_status(
    case,
    status,
    performed_by=None,
    notes="",
):
    valid_statuses = {
        value for value, _ in PartnerCase.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError("Invalid partner case status.")

    previous_status = case.status

    if previous_status == status:
        return case

    case.status = status
    case.full_clean()
    case.save()

    description = (
        f"Partner case {case.case_id} changed "
        f"from {previous_status} to {status}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_partner_activity(
        case.partner,
        PartnerActivity.ActivityType.CASE,
        description,
        performed_by,
    )

    return case


# ================================================================
# LINK CASE TO ADMISSION
# ================================================================

@transaction.atomic
def link_case_to_admission(case, admission, performed_by=None):
    if admission.channel != Admission.Channel.PARTNER:
        raise ValidationError(
            "Admission must use the PARTNER channel."
        )

    existing = PartnerCase.objects.filter(
        admission=admission
    ).exclude(pk=case.pk)

    if existing.exists():
        raise ValidationError(
            "This admission is already linked to another partner case."
        )

    case.admission = admission
    case.status = PartnerCase.Status.ADMISSION_CREATED
    case.full_clean()
    case.save()

    _log_partner_activity(
        case.partner,
        PartnerActivity.ActivityType.CASE,
        (
            f"Partner case {case.case_id} linked to "
            f"admission {admission.admission_id}."
        ),
        performed_by,
    )

    return case


# ================================================================
# COMMISSION RULE
# ================================================================

@transaction.atomic
def create_commission_rule(
    partner,
    commission_type,
    value,
    institution=None,
    program=None,
    vertical="",
    effective_from=None,
    effective_to=None,
    notes="",
    performed_by=None,
):
    value = Decimal(str(value))

    valid_types = {
        item for item, _ in CommissionRule.CommissionType.choices
    }

    if commission_type not in valid_types:
        raise ValidationError("Invalid commission type.")

    rule = CommissionRule(
        partner=partner,
        institution=institution,
        program=program,
        vertical=vertical,
        commission_type=commission_type,
        value=value,
        effective_from=effective_from,
        effective_to=effective_to,
        is_active=True,
        notes=notes.strip(),
    )

    rule.full_clean()
    rule.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.COMMISSION,
        (
            f"Commission rule created: "
            f"{rule.get_commission_type_display()} {rule.value}."
        ),
        performed_by,
    )

    return rule


# ================================================================
# CALCULATE COMMISSION
# ================================================================

def calculate_commission(rule, base_amount):
    base_amount = Decimal(str(base_amount))

    if base_amount < Decimal("0"):
        raise ValidationError(
            "Base amount cannot be negative."
        )

    if rule.commission_type == CommissionRule.CommissionType.FIXED:
        return rule.value.quantize(Decimal("0.01"))

    if (
        rule.commission_type
        == CommissionRule.CommissionType.PERCENTAGE
    ):
        amount = (
            base_amount * rule.value / Decimal("100")
        )
        return amount.quantize(Decimal("0.01"))

    raise ValidationError("Unsupported commission type.")


# ================================================================
# CREATE COMMISSION TRANSACTION
# ================================================================

@transaction.atomic
def create_commission_transaction(
    partner,
    rule,
    base_amount,
    partner_case=None,
    admission=None,
    notes="",
    performed_by=None,
):
    if rule.partner_id != partner.id:
        raise ValidationError(
            "Commission rule belongs to another partner."
        )

    if not rule.is_active:
        raise ValidationError(
            "Commission rule is inactive."
        )

    if (
        partner_case is not None
        and partner_case.partner_id != partner.id
    ):
        raise ValidationError(
            "Partner case belongs to another partner."
        )

    commission_amount = calculate_commission(
        rule,
        base_amount,
    )

    transaction_obj = CommissionTransaction(
        partner=partner,
        partner_case=partner_case,
        admission=admission,
        rule=rule,
        base_amount=Decimal(str(base_amount)),
        commission_amount=commission_amount,
        status=CommissionTransaction.Status.EARNED,
        notes=notes.strip(),
    )

    transaction_obj.full_clean()
    transaction_obj.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.COMMISSION,
        (
            f"Commission earned: ₹{commission_amount} "
            f"on base amount ₹{transaction_obj.base_amount}."
        ),
        performed_by,
    )

    return transaction_obj


# ================================================================
# COMMISSION APPROVAL
# ================================================================

@transaction.atomic
def approve_commission(transaction_obj, approved_by=None, notes=""):
    if transaction_obj.status != CommissionTransaction.Status.EARNED:
        raise ValidationError(
            "Only EARNED commissions can be approved."
        )

    transaction_obj.status = CommissionTransaction.Status.APPROVED
    transaction_obj.approved_by = approved_by
    transaction_obj.approved_at = timezone.now()

    if notes.strip():
        transaction_obj.notes = notes.strip()

    transaction_obj.full_clean()
    transaction_obj.save()

    _log_partner_activity(
        transaction_obj.partner,
        PartnerActivity.ActivityType.COMMISSION,
        (
            f"Commission ₹{transaction_obj.commission_amount} "
            f"approved."
        ),
        approved_by,
    )

    return transaction_obj


@transaction.atomic
def mark_commission_payable(transaction_obj, performed_by=None):
    if transaction_obj.status != CommissionTransaction.Status.APPROVED:
        raise ValidationError(
            "Only APPROVED commissions can become payable."
        )

    transaction_obj.status = CommissionTransaction.Status.PAYABLE
    transaction_obj.full_clean()
    transaction_obj.save()

    _log_partner_activity(
        transaction_obj.partner,
        PartnerActivity.ActivityType.COMMISSION,
        (
            f"Commission ₹{transaction_obj.commission_amount} "
            f"marked payable."
        ),
        performed_by,
    )

    return transaction_obj


@transaction.atomic
def mark_commission_paid(
    transaction_obj,
    payment_reference,
    performed_by=None,
):
    if transaction_obj.status != CommissionTransaction.Status.PAYABLE:
        raise ValidationError(
            "Only PAYABLE commissions can be marked paid."
        )

    payment_reference = payment_reference.strip()

    if not payment_reference:
        raise ValidationError(
            "Payment reference is required."
        )

    transaction_obj.status = CommissionTransaction.Status.PAID
    transaction_obj.paid_at = timezone.now()
    transaction_obj.payment_reference = payment_reference

    transaction_obj.full_clean()
    transaction_obj.save()

    _log_partner_activity(
        transaction_obj.partner,
        PartnerActivity.ActivityType.PAYMENT,
        (
            f"Commission ₹{transaction_obj.commission_amount} "
            f"paid. Reference: {payment_reference}."
        ),
        performed_by,
    )

    return transaction_obj


# ================================================================
# PARTNER ISSUE
# ================================================================

@transaction.atomic
def create_partner_issue(
    partner,
    subject,
    description,
    priority=PartnerIssue.Priority.MEDIUM,
    partner_case=None,
    assigned_to=None,
    performed_by=None,
):
    if not subject.strip():
        raise ValidationError("Issue subject is required.")

    if not description.strip():
        raise ValidationError("Issue description is required.")

    issue = PartnerIssue(
        partner=partner,
        partner_case=partner_case,
        subject=subject.strip(),
        description=description.strip(),
        priority=priority,
        status=PartnerIssue.Status.OPEN,
        assigned_to=assigned_to,
    )

    issue.full_clean()
    issue.save()

    _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.ISSUE,
        f"Partner issue created: {issue.subject}.",
        performed_by,
    )

    return issue

# ================================================================
# PARTNER ISSUE STATUS
# ================================================================

@transaction.atomic
def change_partner_issue_status(
    issue,
    status,
    performed_by=None,
    notes="",
):
    valid_statuses = {
        value for value, _ in PartnerIssue.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError("Invalid partner issue status.")

    previous_status = issue.status

    if previous_status == status:
        return issue

    issue.status = status

    if status in [
        PartnerIssue.Status.RESOLVED,
        PartnerIssue.Status.CLOSED,
    ]:
        if issue.resolved_at is None:
            issue.resolved_at = timezone.now()
    else:
        issue.resolved_at = None

    issue.full_clean()
    issue.save()

    description = (
        f"Partner issue '{issue.subject}' changed "
        f"from {previous_status} to {status}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_partner_activity(
        issue.partner,
        PartnerActivity.ActivityType.ISSUE,
        description,
        performed_by,
    )

    return issue


# ================================================================
# PARTNER PROGRAM ACCESS STATUS
# ================================================================

@transaction.atomic
def change_program_access_status(
    access,
    is_active,
    performed_by=None,
    notes="",
):
    previous_status = access.is_active

    if previous_status == is_active:
        return access

    access.is_active = is_active

    if notes.strip():
        access.notes = notes.strip()

    access.full_clean()
    access.save()

    action = "activated" if is_active else "deactivated"

    _log_partner_activity(
        access.partner,
        PartnerActivity.ActivityType.PROGRAM_ACCESS,
        (
            f"Program access {action}: "
            f"{access.institution.name} / "
            f"{access.program.name}."
        ),
        performed_by,
    )

    return access
# ================================================================
# NOTES
# ================================================================

@transaction.atomic
def add_partner_note(partner, description, performed_by=None):
    description = description.strip()

    if not description:
        raise ValidationError("Note cannot be empty.")

    return _log_partner_activity(
        partner,
        PartnerActivity.ActivityType.NOTE,
        description,
        performed_by,
    )


# ================================================================
# QUEUES
# ================================================================

def get_active_partners():
    return Partner.objects.filter(
        status=Partner.Status.ACTIVE,
    ).order_by("-updated_at")


def get_my_partners(user):
    return Partner.objects.filter(
        relationship_manager=user,
    ).exclude(
        status__in=[
            Partner.Status.INACTIVE,
            Partner.Status.TERMINATED,
        ]
    ).order_by("-updated_at")


def get_open_partner_cases(user=None):
    queryset = PartnerCase.objects.exclude(
        status__in=[
            PartnerCase.Status.COMPLETED,
            PartnerCase.Status.REJECTED,
            PartnerCase.Status.CANCELLED,
        ]
    )

    if user is not None:
        queryset = queryset.filter(assigned_to=user)

    return queryset.order_by("-updated_at")


def get_pending_commissions():
    return CommissionTransaction.objects.filter(
        status__in=[
            CommissionTransaction.Status.EARNED,
            CommissionTransaction.Status.APPROVED,
            CommissionTransaction.Status.PAYABLE,
        ]
    ).order_by("-created_at")


def get_open_partner_issues(user=None):
    queryset = PartnerIssue.objects.exclude(
        status__in=[
            PartnerIssue.Status.RESOLVED,
            PartnerIssue.Status.CLOSED,
        ]
    )

    if user is not None:
        queryset = queryset.filter(assigned_to=user)

    return queryset.order_by("-created_at")
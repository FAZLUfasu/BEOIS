from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import CallLog, Lead, LeadActivity


@transaction.atomic
def assign_lead(lead, user, performed_by=None):
    """
    Assign a lead to a telecaller/staff member.
    """

    if not user.is_active:
        raise ValidationError("Cannot assign a lead to an inactive user.")

    previous_user = lead.assigned_to

    lead.assigned_to = user
    lead.assigned_at = timezone.now()
    lead.status = Lead.Status.ASSIGNED
    lead.save(
        update_fields=[
            "assigned_to",
            "assigned_at",
            "status",
            "updated_at",
        ]
    )

    if previous_user:
        description = (
            f"Lead reassigned from {previous_user} to {user}."
        )
    else:
        description = f"Lead assigned to {user}."

    LeadActivity.objects.create(
        lead=lead,
        activity_type=LeadActivity.ActivityType.ASSIGNED,
        description=description,
        performed_by=performed_by,
    )

    return lead


@transaction.atomic
def record_call(
    lead,
    telecaller,
    outcome,
    notes="",
    follow_up_at=None,
    duration_seconds=None,
):
    """
    Record a manual telecalling attempt and update the lead.
    """

    if lead.assigned_to_id and lead.assigned_to_id != telecaller.id:
        raise ValidationError(
            "This lead is assigned to another user."
        )

    if (
        outcome == CallLog.Outcome.CALLBACK
        and not follow_up_at
    ):
        raise ValidationError(
            "Follow-up date and time is required for Call Back."
        )

    call_log = CallLog(
        lead=lead,
        telecaller=telecaller,
        outcome=outcome,
        notes=notes,
        follow_up_at=follow_up_at,
        duration_seconds=duration_seconds,
    )

    call_log.full_clean()
    call_log.save()

    if outcome == CallLog.Outcome.INTERESTED:
        lead.status = Lead.Status.QUALIFIED
        lead.next_follow_up_at = follow_up_at

    elif outcome == CallLog.Outcome.NOT_INTERESTED:
        lead.status = Lead.Status.NOT_INTERESTED
        lead.next_follow_up_at = None

    elif outcome == CallLog.Outcome.CALLBACK:
        lead.status = Lead.Status.FOLLOW_UP
        lead.next_follow_up_at = follow_up_at

    elif outcome in {
        CallLog.Outcome.NO_ANSWER,
        CallLog.Outcome.BUSY,
        CallLog.Outcome.SWITCHED_OFF,
    }:
        lead.status = Lead.Status.CONTACTED
        lead.next_follow_up_at = follow_up_at

    elif outcome == CallLog.Outcome.WRONG_NUMBER:
        lead.status = Lead.Status.CLOSED
        lead.next_follow_up_at = None

    else:
        lead.status = Lead.Status.CONTACTED
        lead.next_follow_up_at = follow_up_at

    lead.save(
        update_fields=[
            "status",
            "next_follow_up_at",
            "updated_at",
        ]
    )

    LeadActivity.objects.create(
        lead=lead,
        activity_type=LeadActivity.ActivityType.CALL,
        description=(
            f"Call outcome: {call_log.get_outcome_display()}. "
            f"{notes}".strip()
        ),
        performed_by=telecaller,
    )

    return call_log


@transaction.atomic
def change_lead_status(
    lead,
    status,
    performed_by=None,
    notes="",
):
    """
    Change lead status and maintain activity history.
    """

    valid_statuses = {
        value
        for value, label in Lead.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError("Invalid lead status.")

    previous_status = lead.status

    lead.status = status

    if status == Lead.Status.CONVERTED:
        lead.converted_at = timezone.now()

    elif previous_status == Lead.Status.CONVERTED:
        lead.converted_at = None

    lead.save(
        update_fields=[
            "status",
            "converted_at",
            "updated_at",
        ]
    )

    LeadActivity.objects.create(
        lead=lead,
        activity_type=(
            LeadActivity.ActivityType.CONVERTED
            if status == Lead.Status.CONVERTED
            else LeadActivity.ActivityType.STATUS_CHANGE
        ),
        description=(
            f"Status changed from "
            f"{previous_status} to {status}. "
            f"{notes}".strip()
        ),
        performed_by=performed_by,
    )

    return lead


@transaction.atomic
def add_lead_note(
    lead,
    description,
    performed_by=None,
):
    """
    Add a permanent timeline note to a lead.
    """

    if not description.strip():
        raise ValidationError("Note cannot be empty.")

    return LeadActivity.objects.create(
        lead=lead,
        activity_type=LeadActivity.ActivityType.NOTE,
        description=description.strip(),
        performed_by=performed_by,
    )
def get_unassigned_leads():
    """
    Leads waiting for allocation to a telecaller.
    """

    return Lead.objects.filter(
        assigned_to__isnull=True,
        status=Lead.Status.NEW,
    ).order_by("created_at")


def get_my_leads(user):
    """
    Active leads assigned to a particular user.
    """

    return Lead.objects.filter(
        assigned_to=user,
    ).exclude(
        status__in=[
            Lead.Status.CONVERTED,
            Lead.Status.CLOSED,
            Lead.Status.NOT_INTERESTED,
        ]
    ).order_by("-updated_at")


def get_follow_up_leads(user=None):
    """
    Leads with scheduled follow-ups.
    Can optionally be restricted to one user.
    """

    queryset = Lead.objects.filter(
        status=Lead.Status.FOLLOW_UP,
        next_follow_up_at__isnull=False,
    )

    if user is not None:
        queryset = queryset.filter(
            assigned_to=user
        )

    return queryset.order_by(
        "next_follow_up_at"
    )


def get_due_follow_ups(user=None):
    """
    Follow-ups that are due now or overdue.
    """

    queryset = Lead.objects.filter(
        status=Lead.Status.FOLLOW_UP,
        next_follow_up_at__lte=timezone.now(),
    )

    if user is not None:
        queryset = queryset.filter(
            assigned_to=user
        )

    return queryset.order_by(
        "next_follow_up_at"
    )


def get_qualified_leads():
    """
    Qualified leads waiting for conversion/admission handoff.
    """

    return Lead.objects.filter(
        status=Lead.Status.QUALIFIED,
    ).order_by(
        "-updated_at"
    )


def get_converted_leads():
    """
    Successfully converted leads.
    """

    return Lead.objects.filter(
        status=Lead.Status.CONVERTED,
    ).order_by(
        "-converted_at"
    )
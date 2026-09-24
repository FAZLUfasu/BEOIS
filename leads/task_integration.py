from datetime import timedelta

from django.utils import timezone

from notifications.integration import (
    cancel_linked_task,
    complete_linked_task,
    sync_linked_task,
)
from notifications.models import Task

from .models import (
    Lead,
    LeadAppointment,
)


LABEL = "Lead Follow-up"
APPOINTMENT_LABEL = "College Visit"


def sync_lead_follow_up_task(
    lead,
    assigned_by=None,
):
    if (
        not lead.assigned_to_id
        or not lead.next_follow_up_at
        or lead.status
        != Lead.Status.FOLLOW_UP
    ):
        return cancel_lead_follow_up_task(
            lead
        )

    return sync_linked_task(
        source_module=Task.SourceModule.LEADS,
        source_object_id=lead.pk,
        source_label=LABEL,
        assigned_to=lead.assigned_to,
        assigned_by=assigned_by,
        title=(
            f"Follow up lead: {lead.name}"
        ),
        description=(
            "Telecalling follow-up scheduled "
            "for this lead."
        ),
        due_at=lead.next_follow_up_at,
        reminder_at=lead.next_follow_up_at,
        priority=Task.Priority.HIGH,
    )


def complete_lead_follow_up_task(lead):
    return complete_linked_task(
        source_module=Task.SourceModule.LEADS,
        source_object_id=lead.pk,
        source_label=LABEL,
    )


def cancel_lead_follow_up_task(lead):
    return cancel_linked_task(
        source_module=Task.SourceModule.LEADS,
        source_object_id=lead.pk,
        source_label=LABEL,
    )


def sync_lead_appointment_task(
    appointment,
    assigned_by=None,
):
    """
    Keep one linked task in sync with an optional college visit.
    """

    active_statuses = {
        LeadAppointment.Status.SCHEDULED,
        LeadAppointment.Status.CONFIRMED,
        LeadAppointment.Status.RESCHEDULED,
    }

    completed_statuses = {
        LeadAppointment.Status.ARRIVED,
        LeadAppointment.Status.COMPLETED,
    }

    if (
        appointment.status
        in completed_statuses
    ):
        return complete_linked_task(
            source_module=Task.SourceModule.LEADS,
            source_object_id=appointment.pk,
            source_label=APPOINTMENT_LABEL,
        )

    if (
        appointment.status
        not in active_statuses
    ):
        return cancel_linked_task(
            source_module=Task.SourceModule.LEADS,
            source_object_id=appointment.pk,
            source_label=APPOINTMENT_LABEL,
        )

    assignee = (
        appointment.assigned_counsellor
        or appointment.lead.assigned_to
    )

    if not assignee:
        return cancel_linked_task(
            source_module=Task.SourceModule.LEADS,
            source_object_id=appointment.pk,
            source_label=APPOINTMENT_LABEL,
        )

    reminder_at = (
        appointment.scheduled_at
        - timedelta(hours=2)
    )

    if reminder_at <= timezone.now():
        reminder_at = timezone.now()

    return sync_linked_task(
        source_module=Task.SourceModule.LEADS,
        source_object_id=appointment.pk,
        source_label=APPOINTMENT_LABEL,
        assigned_to=assignee,
        assigned_by=assigned_by,
        title=(
            "College visit: "
            f"{appointment.lead.name}"
        ),
        description=(
            f"{appointment.get_purpose_display()} "
            f"visit at {appointment.branch.name}."
        ),
        due_at=appointment.scheduled_at,
        reminder_at=reminder_at,
        priority=Task.Priority.HIGH,
    )

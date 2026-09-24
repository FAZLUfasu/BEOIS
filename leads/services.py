from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    CallLog,
    Lead,
    LeadActivity,
    LeadAppointment,
    LeadAppointmentHistory,
    LeadQualification,
)
from .task_integration import (
    sync_lead_appointment_task,
    sync_lead_follow_up_task,
)


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

    sync_lead_follow_up_task(lead, assigned_by=performed_by)

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
        lead.status = Lead.Status.INTERESTED
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

    sync_lead_follow_up_task(lead, assigned_by=telecaller)

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

    sync_lead_follow_up_task(lead, assigned_by=performed_by)

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
# ================================================================
# QUALIFICATION / COUNSELLING
# ================================================================

QUALIFICATION_RANK = {
    LeadQualification.QualificationLevel.SSLC: 1,
    LeadQualification.QualificationLevel.PLUS_TWO: 2,
    LeadQualification.QualificationLevel.DIPLOMA: 2,
    LeadQualification.QualificationLevel.UG: 3,
    LeadQualification.QualificationLevel.PG: 4,
}


def _normalize_stream(value):
    return " ".join(
        (value or "")
        .replace("&", "and")
        .replace("/", " ")
        .replace("-", " ")
        .lower()
        .split()
    )


def evaluate_program_eligibility(
    qualification,
    program,
):
    """
    Conservative structured eligibility matching.

    Missing/ambiguous master data is never treated as eligible.
    """

    review = (
        LeadQualification
        .EligibilityStatus
        .REVIEW_REQUIRED
    )

    eligible = (
        LeadQualification
        .EligibilityStatus
        .ELIGIBLE
    )

    not_eligible = (
        LeadQualification
        .EligibilityStatus
        .NOT_ELIGIBLE
    )

    required = program.minimum_qualification
    highest = qualification.highest_qualification

    if (
        program.eligibility_review_required
        or required in {
            "UNSPECIFIED",
            "OTHER",
        }
    ):
        return (
            review,
            (
                "Eligibility needs manual confirmation "
                "for this program."
            ),
        )

    if highest in {
        LeadQualification
        .QualificationLevel
        .UNSPECIFIED,
        LeadQualification
        .QualificationLevel
        .OTHER,
    }:
        return (
            review,
            (
                "Student qualification is not structured "
                "enough for automatic matching."
            ),
        )

    required_rank = QUALIFICATION_RANK.get(
        required
    )

    highest_rank = QUALIFICATION_RANK.get(
        highest
    )

    if (
        required_rank is None
        or highest_rank is None
    ):
        return (
            review,
            (
                "Qualification mapping requires "
                "manual confirmation."
            ),
        )

    if highest_rank < required_rank:
        return (
            not_eligible,
            (
                "Student qualification is below "
                "the program minimum requirement."
            ),
        )

    required_stream = (
        program.required_stream or ""
    ).strip()

    if required_stream:
        student_stream = _normalize_stream(
            qualification.stream
        )

        if not student_stream:
            return (
                review,
                (
                    "Student stream is required to "
                    "confirm eligibility."
                ),
            )

        accepted_streams = {
            _normalize_stream(item)
            for item in required_stream
            .replace("|", ",")
            .split(",")
            if item.strip()
        }

        if (
            accepted_streams
            and student_stream
            not in accepted_streams
        ):
            return (
                review,
                (
                    "Program has a stream requirement "
                    "that needs manual confirmation."
                ),
            )

    return (
        eligible,
        "Structured eligibility requirements are satisfied.",
    )


@transaction.atomic
def save_lead_qualification(
    lead,
    performed_by=None,
    **validated_data,
):
    qualification, _ = (
        LeadQualification.objects
        .select_for_update()
        .get_or_create(
            lead=lead,
        )
    )

    selected_program_supplied = (
        "selected_program"
        in validated_data
    )

    selected_program = validated_data.pop(
        "selected_program",
        None,
    )

    for field, value in validated_data.items():
        setattr(
            qualification,
            field,
            value,
        )

    if selected_program_supplied:
        qualification.selected_program = (
            selected_program
        )

        qualification.selected_institution = (
            selected_program.institution
            if selected_program
            else None
        )

    qualification.qualified_by = None
    qualification.qualified_at = None

    if qualification.selected_program_id:
        (
            qualification.eligibility_status,
            qualification.eligibility_notes,
        ) = evaluate_program_eligibility(
            qualification,
            qualification.selected_program,
        )
    else:
        qualification.eligibility_status = (
            LeadQualification
            .EligibilityStatus
            .PENDING
        )
        qualification.eligibility_notes = (
            "Select a program to evaluate eligibility."
        )

    qualification.full_clean()
    qualification.save()

    LeadActivity.objects.create(
        lead=lead,
        activity_type=(
            LeadActivity
            .ActivityType
            .QUALIFICATION
        ),
        description=(
            "Qualification/counselling details updated. "
            f"Eligibility: "
            f"{qualification.get_eligibility_status_display()}."
        ),
        performed_by=performed_by,
    )

    return qualification


@transaction.atomic
def mark_lead_qualified(
    lead,
    performed_by=None,
):
    try:
        qualification = (
            lead.qualification
        )
    except LeadQualification.DoesNotExist:
        raise ValidationError(
            "Qualification details are required "
            "before marking this lead QUALIFIED."
        )

    if not qualification.selected_program_id:
        raise ValidationError(
            "Select a program before qualifying the lead."
        )

    if (
        qualification.eligibility_status
        != LeadQualification
        .EligibilityStatus
        .ELIGIBLE
    ):
        raise ValidationError(
            "The selected program must be confirmed "
            "ELIGIBLE before qualifying the lead."
        )

    qualification.qualified_by = performed_by
    qualification.qualified_at = timezone.now()
    qualification.save(
        update_fields=[
            "qualified_by",
            "qualified_at",
            "updated_at",
        ]
    )

    return change_lead_status(
        lead=lead,
        status=Lead.Status.QUALIFIED,
        performed_by=performed_by,
        notes=(
            "Qualification confirmed for "
            f"{qualification.selected_program}."
        ),
    )


# ================================================================
# OPTIONAL COLLEGE VISITS
# ================================================================

@transaction.atomic
def schedule_lead_appointment(
    lead,
    branch,
    scheduled_at,
    performed_by=None,
    purpose=(
        LeadAppointment.Purpose
        .ADMISSION_COUNSELLING
    ),
    number_of_visitors=1,
    notes="",
):
    allowed_statuses = {
        Lead.Status.INTERESTED,
        Lead.Status.FOLLOW_UP,
        Lead.Status.QUALIFIED,
        Lead.Status.CONVERTED,
    }

    if lead.status not in allowed_statuses:
        raise ValidationError(
            "College visits can be scheduled only "
            "for interested, follow-up, qualified, "
            "or converted leads."
        )

    appointment = LeadAppointment(
        lead=lead,
        purpose=purpose,
        scheduled_at=scheduled_at,
        branch=branch,
        assigned_counsellor=(
            lead.assigned_to
            or performed_by
        ),
        number_of_visitors=number_of_visitors,
        notes=notes.strip(),
        created_by=performed_by,
    )

    appointment.full_clean()
    appointment.save()

    LeadAppointmentHistory.objects.create(
        appointment=appointment,
        event_type=(
            LeadAppointmentHistory
            .EventType
            .CREATED
        ),
        new_status=appointment.status,
        new_scheduled_at=(
            appointment.scheduled_at
        ),
        notes=appointment.notes,
        performed_by=performed_by,
    )

    LeadActivity.objects.create(
        lead=lead,
        activity_type=(
            LeadActivity
            .ActivityType
            .APPOINTMENT
        ),
        description=(
            "College visit scheduled for "
            f"{appointment.scheduled_at} at "
            f"{appointment.branch.name}."
        ),
        performed_by=performed_by,
    )

    sync_lead_appointment_task(
        appointment,
        assigned_by=performed_by,
    )

    return appointment


@transaction.atomic
def change_lead_appointment_status(
    appointment,
    status,
    performed_by=None,
    scheduled_at=None,
    notes="",
):
    valid_statuses = {
        value
        for value, _
        in LeadAppointment.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError(
            "Invalid appointment status."
        )

    previous_status = appointment.status
    previous_scheduled_at = (
        appointment.scheduled_at
    )

    is_reschedule = (
        status
        == LeadAppointment.Status.RESCHEDULED
    )

    if (
        is_reschedule
        and scheduled_at is None
    ):
        raise ValidationError(
            "A new date/time is required "
            "when rescheduling."
        )

    appointment.status = status

    if scheduled_at is not None:
        appointment.scheduled_at = (
            scheduled_at
        )

    if notes.strip():
        appointment.notes = notes.strip()

    appointment.full_clean()
    appointment.save()

    LeadAppointmentHistory.objects.create(
        appointment=appointment,
        event_type=(
            LeadAppointmentHistory
            .EventType
            .RESCHEDULED
            if is_reschedule
            else (
                LeadAppointmentHistory
                .EventType
                .STATUS_CHANGE
            )
        ),
        previous_status=previous_status,
        new_status=appointment.status,
        previous_scheduled_at=(
            previous_scheduled_at
        ),
        new_scheduled_at=(
            appointment.scheduled_at
        ),
        notes=notes.strip(),
        performed_by=performed_by,
    )

    if is_reschedule:
        description = (
            "College visit rescheduled from "
            f"{previous_scheduled_at} to "
            f"{appointment.scheduled_at}."
        )
    else:
        description = (
            "Appointment status changed from "
            f"{previous_status} to {status}."
        )

    if notes.strip():
        description += f" {notes.strip()}"

    LeadActivity.objects.create(
        lead=appointment.lead,
        activity_type=(
            LeadActivity
            .ActivityType
            .APPOINTMENT
        ),
        description=description,
        performed_by=performed_by,
    )

    sync_lead_appointment_task(
        appointment,
        assigned_by=performed_by,
    )

    return appointment


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

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from admissions.models import Admission

from .models import (
    Student,
    StudentActivity,
    StudentDocument,
    StudentProcess,
)


# ================================================================
# CREATE STUDENT)
from .task_integration import sync_student_process_task


# ================================================================
# CREATE STUDENT FROM COMPLETED ADMISSION
# ================================================================

@transaction.atomic
def create_student_from_admission(
    admission,
    created_by=None,
    assigned_coordinator=None,
):
    """
    Convert a COMPLETED admission into a permanent Student record.

    Existing admission information is copied into Student Master
    so staff do not have to re-enter the same information.
    """

    if not isinstance(admission, Admission):
        raise ValidationError(
            "A valid Admission instance is required."
        )

    if admission.status != Admission.Status.COMPLETED:
        raise ValidationError(
            "Only COMPLETED admissions can be converted "
            "into Student Master."
        )

    if hasattr(admission, "student"):
        raise ValidationError(
            "A student record already exists for this admission."
        )

    if not admission.enrollment_number:
        raise ValidationError(
            "Enrollment number is required before "
            "creating Student Master."
        )

    student = Student(
        admission=admission,

        name=admission.applicant_name,
        date_of_birth=admission.date_of_birth,
        gender=admission.gender,

        phone_number=admission.phone_number,
        alternate_phone=admission.alternate_phone,
        email=admission.email,

        address=admission.address,
        city=admission.city,
        state=admission.state,
        postal_code=admission.postal_code,

        institution=admission.institution,
        program=admission.program,
        academic_session=admission.academic_session,

        enrollment_number=admission.enrollment_number,

        university_admission_number=(
            admission.university_admission_number
        ),

        vertical=admission.vertical,
        channel=admission.channel,

        current_year=1,
        current_semester=1,

        status=Student.Status.ACTIVE,

        assigned_coordinator=assigned_coordinator,
        created_by=created_by,

        notes=admission.notes,
    )

    student.full_clean()
    student.save()

    StudentActivity.objects.create(
        student=student,
        activity_type=StudentActivity.ActivityType.CREATED,
        description=(
            f"Student {student.student_id} created "
            f"from admission {admission.admission_id}."
        ),
        performed_by=created_by,
    )

    return student


# ================================================================
# CREATE EDUCATION PROCESS
# ================================================================

@transaction.atomic
def create_student_process(
    student,
    process_type,
    title="",
    academic_year=None,
    semester=None,
    due_date=None,
    assigned_to=None,
    notes="",
    performed_by=None,
):
    """
    Create an education-process task for a student.
    """

    valid_types = {
        value
        for value, label
        in StudentProcess.ProcessType.choices
    }

    if process_type not in valid_types:
        raise ValidationError(
            "Invalid student process type."
        )

    process = StudentProcess(
        student=student,
        process_type=process_type,
        title=title,
        academic_year=academic_year,
        semester=semester,
        due_date=due_date,
        assigned_to=assigned_to,
        notes=notes,
        status=StudentProcess.Status.NOT_STARTED,
    )

    process.full_clean()
    process.save()

    StudentActivity.objects.create(
        student=student,
        activity_type=StudentActivity.ActivityType.PROCESS,
        description=(
            f"{process.get_process_type_display()} "
            f"process created."
        ),
        performed_by=performed_by,
    )

    sync_student_process_task(process, performed_by=performed_by)

    return process


# ================================================================
# INITIALIZE STANDARD STUDENT PROCESSES
# ================================================================

@transaction.atomic
def initialize_student_processes(
    student,
    assigned_to=None,
    performed_by=None,
):
    """
    Create the standard Education Process workflow for
    the student's current semester/year.

    Existing matching processes are not duplicated.
    """

    process_types = [
        StudentProcess.ProcessType.EXAM,
        StudentProcess.ProcessType.SEMINAR,
        StudentProcess.ProcessType.PROJECT,
        StudentProcess.ProcessType.RESULT,
        StudentProcess.ProcessType.MARK_SHEET,
        StudentProcess.ProcessType.CERTIFICATE,
    ]

    created_processes = []

    for process_type in process_types:

        process, created = StudentProcess.objects.get_or_create(
            student=student,
            process_type=process_type,
            academic_year=student.current_year,
            semester=student.current_semester,
            defaults={
                "assigned_to": assigned_to,
                "status": StudentProcess.Status.NOT_STARTED,
            },
        )

        if created:
            created_processes.append(process)

            StudentActivity.objects.create(
                student=student,
                activity_type=StudentActivity.ActivityType.PROCESS,
                description=(
                    f"{process.get_process_type_display()} "
                    f"process initialized for "
                    f"Year {student.current_year}, "
                    f"Semester {student.current_semester}."
                ),
                performed_by=performed_by,
            )

    for process in created_processes:
        sync_student_process_task(process, performed_by=performed_by)

    return created_processes


# ================================================================
# CHANGE PROCESS STATUS
# ================================================================

@transaction.atomic
def change_student_process_status(
    process,
    status,
    performed_by=None,
    notes="",
):
    """
    Change an education-process status and write the change
    to the permanent Student timeline.
    """

    valid_statuses = {
        value
        for value, label
        in StudentProcess.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError(
            "Invalid process status."
        )

    previous_status = process.status

    if previous_status == status:
        return process

    process.status = status

    if status == StudentProcess.Status.SUBMITTED:
        process.submitted_at = timezone.now()

    if status == StudentProcess.Status.COMPLETED:
        process.completed_at = timezone.now()

    elif previous_status == StudentProcess.Status.COMPLETED:
        process.completed_at = None

    process.full_clean()
    process.save()

    description = (
        f"{process.get_process_type_display()} status changed "
        f"from {previous_status} to {status}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    StudentActivity.objects.create(
        student=process.student,
        activity_type=_activity_type_for_process(
            process.process_type
        ),
        description=description,
        performed_by=performed_by,
    )

    sync_student_process_task(process, performed_by=performed_by)

    return process


# ================================================================
# PROCESS TYPE -> ACTIVITY TYPE
# ================================================================

def _activity_type_for_process(process_type):

    mapping = {
        StudentProcess.ProcessType.EXAM:
            StudentActivity.ActivityType.EXAM,

        StudentProcess.ProcessType.SEMINAR:
            StudentActivity.ActivityType.SEMINAR,

        StudentProcess.ProcessType.PROJECT:
            StudentActivity.ActivityType.PROJECT,

        StudentProcess.ProcessType.RESULT:
            StudentActivity.ActivityType.RESULT,

        StudentProcess.ProcessType.MARK_SHEET:
            StudentActivity.ActivityType.MARK_SHEET,

        StudentProcess.ProcessType.CERTIFICATE:
            StudentActivity.ActivityType.CERTIFICATE,
    }

    return mapping.get(
        process_type,
        StudentActivity.ActivityType.PROCESS,
    )


# ================================================================
# ADD STUDENT DOCUMENT
# ================================================================

@transaction.atomic
def add_student_document(
    student,
    document_type,
    title="",
    file=None,
    process=None,
    reference_number="",
    issued_date=None,
    received_date=None,
    notes="",
    performed_by=None,
):
    """
    Store a student's education-process document.
    """

    valid_types = {
        value
        for value, label
        in StudentDocument.DocumentType.choices
    }

    if document_type not in valid_types:
        raise ValidationError(
            "Invalid student document type."
        )

    if (
        process is not None
        and process.student_id != student.id
    ):
        raise ValidationError(
            "The selected process belongs "
            "to a different student."
        )

    document = StudentDocument(
        student=student,
        process=process,
        document_type=document_type,
        title=title,
        file=file,
        reference_number=reference_number,
        issued_date=issued_date,
        received_date=received_date,
        notes=notes,
    )

    document.full_clean()
    document.save()

    StudentActivity.objects.create(
        student=student,
        activity_type=StudentActivity.ActivityType.DOCUMENT,
        description=(
            f"{document.get_document_type_display()} "
            f"document added."
        ),
        performed_by=performed_by,
    )

    return document


# ================================================================
# VERIFY STUDENT DOCUMENT
# ================================================================

@transaction.atomic
def verify_student_document(
    document,
    verified_by=None,
    notes="",
):
    """
    Verify an education-process document.
    """

    document.verified = True
    document.verified_by = verified_by

    if notes.strip():
        document.notes = notes.strip()

    document.full_clean()
    document.save()

    StudentActivity.objects.create(
        student=document.student,
        activity_type=StudentActivity.ActivityType.DOCUMENT,
        description=(
            f"{document.get_document_type_display()} "
            f"document verified."
        ),
        performed_by=verified_by,
    )

    return document


# ================================================================
# ADD STUDENT NOTE
# ================================================================

@transaction.atomic
def add_student_note(
    student,
    description,
    performed_by=None,
):
    """
    Add a permanent note to Student timeline.
    """

    description = description.strip()

    if not description:
        raise ValidationError(
            "Note cannot be empty."
        )

    return StudentActivity.objects.create(
        student=student,
        activity_type=StudentActivity.ActivityType.NOTE,
        description=description,
        performed_by=performed_by,
    )


# ================================================================
# UPDATE STUDENT ACADEMIC PROGRESS
# ================================================================

@transaction.atomic
def update_student_progress(
    student,
    current_year=None,
    current_semester=None,
    performed_by=None,
    notes="",
):
    """
    Update student's current academic year / semester.
    """

    previous_year = student.current_year
    previous_semester = student.current_semester

    if current_year is not None:
        student.current_year = current_year

    if current_semester is not None:
        student.current_semester = current_semester

    student.full_clean()
    student.save()

    description = (
        f"Academic progress updated from "
        f"Year {previous_year}, Semester {previous_semester} "
        f"to Year {student.current_year}, "
        f"Semester {student.current_semester}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    StudentActivity.objects.create(
        student=student,
        activity_type=StudentActivity.ActivityType.STATUS_CHANGE,
        description=description,
        performed_by=performed_by,
    )

    return student


# ================================================================
# COMPLETE COURSE
# ================================================================

@transaction.atomic
def complete_student_course(
    student,
    performed_by=None,
    notes="",
):
    """
    Mark the student's entire course as completed.
    """

    incomplete_processes = student.processes.exclude(
        status__in=[
            StudentProcess.Status.COMPLETED,
            StudentProcess.Status.NOT_APPLICABLE,
            StudentProcess.Status.CANCELLED,
        ]
    )

    if incomplete_processes.exists():
        raise ValidationError(
            "Cannot complete the course while "
            "education processes are still pending."
        )

    student.status = Student.Status.COMPLETED
    student.course_completed_at = timezone.localdate()

    student.full_clean()
    student.save()

    description = (
        f"Course completed for student "
        f"{student.student_id}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    StudentActivity.objects.create(
        student=student,
        activity_type=(
            StudentActivity.ActivityType.COURSE_COMPLETED
        ),
        description=description,
        performed_by=performed_by,
    )

    return student


# ================================================================
# STUDENT QUEUES
# ================================================================

def get_active_students():
    return Student.objects.filter(
        status=Student.Status.ACTIVE,
    ).order_by("-updated_at")


def get_my_students(user):
    return Student.objects.filter(
        assigned_coordinator=user,
        status=Student.Status.ACTIVE,
    ).order_by("-updated_at")


def get_pending_student_processes(user=None):
    queryset = StudentProcess.objects.filter(
        status__in=[
            StudentProcess.Status.NOT_STARTED,
            StudentProcess.Status.PENDING,
            StudentProcess.Status.IN_PROGRESS,
            StudentProcess.Status.SUBMITTED,
        ]
    )

    if user is not None:
        queryset = queryset.filter(
            assigned_to=user
        )

    return queryset.order_by(
        "due_date",
        "created_at",
    )


def get_overdue_student_processes(user=None):
    queryset = StudentProcess.objects.filter(
        due_date__lt=timezone.localdate(),
    ).exclude(
        status__in=[
            StudentProcess.Status.COMPLETED,
            StudentProcess.Status.NOT_APPLICABLE,
            StudentProcess.Status.CANCELLED,
        ]
    )

    if user is not None:
        queryset = queryset.filter(
            assigned_to=user
        )

    return queryset.order_by("due_date")

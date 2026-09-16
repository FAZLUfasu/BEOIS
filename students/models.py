import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from admissions.models import Admission, Institution, Program


# ================================================================
# STUDENT MASTER
# ================================================================

class Student(models.Model):

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ON_HOLD = "ON_HOLD", "On Hold"
        COMPLETED = "COMPLETED", "Course Completed"
        DISCONTINUED = "DISCONTINUED", "Discontinued"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    student_id = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
    )

    admission = models.OneToOneField(
        Admission,
        on_delete=models.PROTECT,
        related_name="student",
    )

    # ------------------------------------------------------------
    # PERSONAL INFORMATION
    # ------------------------------------------------------------

    name = models.CharField(max_length=255)

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

    email = models.EmailField(blank=True)

    address = models.TextField(blank=True)

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
    # ACADEMIC INFORMATION
    # ------------------------------------------------------------

    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="students",
    )

    program = models.ForeignKey(
        Program,
        on_delete=models.PROTECT,
        related_name="students",
    )

    academic_session = models.CharField(
        max_length=50,
        blank=True,
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

    vertical = models.CharField(
        max_length=30,
        choices=Admission.Vertical.choices,
        db_index=True,
    )

    channel = models.CharField(
        max_length=20,
        choices=Admission.Channel.choices,
        db_index=True,
    )

    # ------------------------------------------------------------
    # COURSE PROGRESS
    # ------------------------------------------------------------

    current_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    current_semester = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    course_started_at = models.DateField(
        null=True,
        blank=True,
    )

    course_completed_at = models.DateField(
        null=True,
        blank=True,
    )

    # ------------------------------------------------------------
    # RESPONSIBILITY
    # ------------------------------------------------------------

    assigned_coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="coordinated_students",
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_students",
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
                fields=["status", "assigned_coordinator"],
            ),
            models.Index(
                fields=["institution", "status"],
            ),
            models.Index(
                fields=["program", "status"],
            ),
        ]

    def __str__(self):
        return f"{self.student_id} - {self.name}"

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
            self.current_semester
            and self.program_id
            and self.program.duration_semesters
            and self.current_semester > self.program.duration_semesters
        ):
            raise ValidationError({
                "current_semester":
                    "Current semester cannot exceed "
                    "the program duration."
            })

        if (
            self.current_year
            and self.program_id
            and self.program.duration_years
            and self.current_year > self.program.duration_years
        ):
            raise ValidationError({
                "current_year":
                    "Current year cannot exceed "
                    "the program duration."
            })

    def save(self, *args, **kwargs):

        if not self.student_id:

            latest = (
                Student.objects
                .exclude(student_id="")
                .order_by("-created_at")
                .first()
            )

            next_number = 1

            if latest and latest.student_id:
                try:
                    next_number = (
                        int(latest.student_id.split("-")[-1]) + 1
                    )
                except (ValueError, IndexError):
                    next_number = 1

            self.student_id = f"ST-{next_number:05d}"

        super().save(*args, **kwargs)


# ================================================================
# EDUCATION PROCESS
# ================================================================

class StudentProcess(models.Model):

    class ProcessType(models.TextChoices):
        EXAM = "EXAM", "Exam"
        SEMINAR = "SEMINAR", "Seminar"
        PROJECT = "PROJECT", "Project"
        RESULT = "RESULT", "Result"
        MARK_SHEET = "MARK_SHEET", "Mark Sheet"
        CERTIFICATE = "CERTIFICATE", "Certificate"

    class Status(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not Started"
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        SUBMITTED = "SUBMITTED", "Submitted"
        COMPLETED = "COMPLETED", "Completed"
        NOT_APPLICABLE = "NOT_APPLICABLE", "Not Applicable"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="processes",
    )

    process_type = models.CharField(
        max_length=30,
        choices=ProcessType.choices,
        db_index=True,
    )

    title = models.CharField(
        max_length=255,
        blank=True,
    )

    academic_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    semester = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NOT_STARTED,
        db_index=True,
    )

    due_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_student_processes",
        null=True,
        blank=True,
    )

    reference_number = models.CharField(
        max_length=150,
        blank=True,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "academic_year",
            "semester",
            "process_type",
        ]

        indexes = [
            models.Index(
                fields=["process_type", "status"],
            ),
            models.Index(
                fields=["student", "status"],
            ),
            models.Index(
                fields=["assigned_to", "status"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.student.student_id} - "
            f"{self.get_process_type_display()}"
        )

    def clean(self):
        super().clean()

        if (
            self.semester
            and self.student_id
            and self.student.program.duration_semesters
            and self.semester > self.student.program.duration_semesters
        ):
            raise ValidationError({
                "semester":
                    "Semester exceeds the program duration."
            })

        if (
            self.academic_year
            and self.student_id
            and self.student.program.duration_years
            and self.academic_year > self.student.program.duration_years
        ):
            raise ValidationError({
                "academic_year":
                    "Academic year exceeds the program duration."
            })


# ================================================================
# STUDENT DOCUMENT
# ================================================================

class StudentDocument(models.Model):

    class DocumentType(models.TextChoices):
        EXAM_APPLICATION = (
            "EXAM_APPLICATION",
            "Exam Application",
        )
        HALL_TICKET = "HALL_TICKET", "Hall Ticket"
        SEMINAR = "SEMINAR", "Seminar Document"
        PROJECT = "PROJECT", "Project Document"
        RESULT = "RESULT", "Result"
        MARK_SHEET = "MARK_SHEET", "Mark Sheet"
        PROVISIONAL = (
            "PROVISIONAL",
            "Provisional Certificate",
        )
        DEGREE_CERTIFICATE = (
            "DEGREE_CERTIFICATE",
            "Degree Certificate",
        )
        TRANSFER_CERTIFICATE = (
            "TRANSFER_CERTIFICATE",
            "Transfer Certificate",
        )
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    process = models.ForeignKey(
        StudentProcess,
        on_delete=models.SET_NULL,
        related_name="documents",
        null=True,
        blank=True,
    )

    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        db_index=True,
    )

    title = models.CharField(
        max_length=255,
        blank=True,
    )

    file = models.FileField(
        upload_to="students/documents/%Y/%m/",
        null=True,
        blank=True,
    )

    reference_number = models.CharField(
        max_length=150,
        blank=True,
    )

    issued_date = models.DateField(
        null=True,
        blank=True,
    )

    received_date = models.DateField(
        null=True,
        blank=True,
    )

    verified = models.BooleanField(
        default=False,
    )

    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="verified_student_documents",
        null=True,
        blank=True,
    )

    notes = models.TextField(blank=True)

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
            f"{self.student.student_id} - "
            f"{self.get_document_type_display()}"
        )

    def clean(self):
        super().clean()

        if (
            self.process_id
            and self.student_id
            and self.process.student_id != self.student_id
        ):
            raise ValidationError({
                "process":
                    "The selected process belongs "
                    "to a different student."
            })


# ================================================================
# STUDENT ACTIVITY / AUDIT TIMELINE
# ================================================================

class StudentActivity(models.Model):

    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Student Created"
        PROCESS = "PROCESS", "Education Process"
        STATUS_CHANGE = "STATUS_CHANGE", "Status Change"
        DOCUMENT = "DOCUMENT", "Document"
        EXAM = "EXAM", "Exam"
        SEMINAR = "SEMINAR", "Seminar"
        PROJECT = "PROJECT", "Project"
        RESULT = "RESULT", "Result"
        MARK_SHEET = "MARK_SHEET", "Mark Sheet"
        CERTIFICATE = "CERTIFICATE", "Certificate"
        NOTE = "NOTE", "Note"
        COURSE_COMPLETED = (
            "COURSE_COMPLETED",
            "Course Completed",
        )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    student = models.ForeignKey(
        Student,
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
        related_name="student_activities",
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
            f"{self.student.student_id} - "
            f"{self.get_activity_type_display()}"
        )
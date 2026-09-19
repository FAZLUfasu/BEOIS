from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from accounts.models import UserRole
from admissions.models import Admission
from dashboard.selectors import get_scoped_employee_ids
from hr.models import Employee

from .models import (
    Student,
    StudentDocument,
    StudentProcess,
)
from .permissions import (
    CanAccessStudents,
    CanManageStudents,
)
from .serializers import (
    AddStudentDocumentSerializer,
    CompleteStudentCourseSerializer,
    CreateStudentProcessSerializer,
    StudentActivitySerializer,
    StudentDetailSerializer,
    StudentDocumentSerializer,
    StudentFromAdmissionSerializer,
    StudentListSerializer,
    StudentNoteSerializer,
    StudentProcessSerializer,
    StudentProcessStatusSerializer,
    StudentProgressSerializer,
    VerifyStudentDocumentSerializer,
    CompletedAdmissionHandoffSerializer,
)
from .services import (
    add_student_document,
    add_student_note,
    change_student_process_status,
    complete_student_course,
    create_student_from_admission,
    create_student_process,
    initialize_student_processes,
    update_student_progress,
    verify_student_document,
)


User = get_user_model()


def _validation_error_response(exc):
    if hasattr(exc, "message_dict"):
        detail = exc.message_dict
    elif hasattr(exc, "messages"):
        detail = exc.messages
    else:
        detail = str(exc)

    return Response(
        {"detail": detail},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _user_can_receive_assignment(
    request_user,
    target_user,
):
    if request_user.is_superuser:
        return True

    if request_user.id == target_user.id:
        return True

    assignments = UserRole.objects.filter(
        user=request_user,
        is_active=True,
    )

    if assignments.filter(
        scope_type=UserRole.ScopeType.ORGANIZATION
    ).exists():
        return True

    target_employee = Employee.objects.filter(
        user=target_user,
        employment_status="ACTIVE",
    ).first()

    if not target_employee:
        return False

    allowed_employee_ids = set(
        get_scoped_employee_ids(request_user)
    )

    return target_employee.id in allowed_employee_ids


def _scoped_students(user):
    if (
        not user
        or not user.is_authenticated
        or not user.is_active
    ):
        return Student.objects.none()

    if user.is_superuser:
        return Student.objects.all()

    assignments = UserRole.objects.filter(
        user=user,
        is_active=True,
    )

    if not assignments.exists():
        return Student.objects.none()

    if assignments.filter(
        scope_type=UserRole.ScopeType.ORGANIZATION
    ).exists():
        return Student.objects.all()

    employee_ids = set(
        get_scoped_employee_ids(user)
    )

    allowed_user_ids = set(
        Employee.objects.filter(
            id__in=employee_ids,
            user__isnull=False,
        ).values_list(
            "user_id",
            flat=True,
        )
    )

    allowed_user_ids.add(user.id)

    return Student.objects.filter(
        assigned_coordinator_id__in=allowed_user_ids
    )


class StudentViewSet(ReadOnlyModelViewSet):
    permission_classes = [
        IsAuthenticated,
        CanAccessStudents,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    def get_queryset(self):
        queryset = (
            _scoped_students(self.request.user)
            .select_related(
                "admission",
                "institution",
                "program",
                "assigned_coordinator",
                "created_by",
            )
            .prefetch_related(
                "processes",
                "documents",
                "activities",
            )
        )

        search = self.request.query_params.get(
            "search"
        )
        student_status = self.request.query_params.get(
            "status"
        )
        institution = self.request.query_params.get(
            "institution"
        )
        program = self.request.query_params.get(
            "program"
        )
        vertical = self.request.query_params.get(
            "vertical"
        )
        channel = self.request.query_params.get(
            "channel"
        )
        coordinator = self.request.query_params.get(
            "assigned_coordinator"
        )

        if search:
            queryset = queryset.filter(
                Q(student_id__icontains=search)
                | Q(name__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(email__icontains=search)
                | Q(
                    enrollment_number__icontains=search
                )
            )

        if student_status:
            queryset = queryset.filter(
                status=student_status
            )

        if institution:
            queryset = queryset.filter(
                institution_id=institution
            )

        if program:
            queryset = queryset.filter(
                program_id=program
            )

        if vertical:
            queryset = queryset.filter(
                vertical=vertical
            )

        if channel:
            queryset = queryset.filter(
                channel=channel
            )

        if coordinator:
            queryset = queryset.filter(
                assigned_coordinator_id=coordinator
            )

        return queryset.order_by("-updated_at")

    def get_serializer_class(self):
        if self.action == "list":
            return StudentListSerializer

        return StudentDetailSerializer
        # ============================================================
    # COMPLETED ADMISSION HANDOFF
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="completed-admissions",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def completed_admissions(
        self,
        request,
    ):
        queryset = (
            Admission.objects
            .filter(
                status=Admission.Status.COMPLETED,
                student__isnull=True,
            )
            .select_related(
                "institution",
                "program",
                "assigned_to",
            )
        )

        search = request.query_params.get(
            "search",
            "",
        ).strip()

        if search:
            queryset = queryset.filter(
                Q(admission_id__icontains=search)
                | Q(applicant_name__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(email__icontains=search)
                | Q(
                    enrollment_number__icontains=search
                )
            )

        institution = request.query_params.get(
            "institution",
            "",
        ).strip()

        if institution:
            queryset = queryset.filter(
                institution_id=institution
            )

        program = request.query_params.get(
            "program",
            "",
        ).strip()

        if program:
            queryset = queryset.filter(
                program_id=program
            )

        vertical = request.query_params.get(
            "vertical",
            "",
        ).strip()

        if vertical:
            queryset = queryset.filter(
                vertical=vertical
            )

        channel = request.query_params.get(
            "channel",
            "",
        ).strip()

        if channel:
            queryset = queryset.filter(
                channel=channel
            )

        queryset = queryset.order_by(
            "-completed_at",
            "-updated_at",
        )

        return Response(
            CompletedAdmissionHandoffSerializer(
                queryset,
                many=True,
                context={
                    "request": request
                },
            ).data
        )
    # ============================================================
    # CREATE FROM COMPLETED ADMISSION
    # ============================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="create-from-admission",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def create_from_admission(
        self,
        request,
    ):
        serializer = StudentFromAdmissionSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        admission_id = serializer.validated_data[
            "admission_id"
        ]

        try:
            admission = Admission.objects.get(
                id=admission_id
            )
        except Admission.DoesNotExist:
            return Response(
                {"detail": "Admission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if admission.status != Admission.Status.COMPLETED:
            return Response(
                {
                    "detail":
                        "Only COMPLETED admissions can "
                        "be converted to Student Master."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Student.objects.filter(
            admission=admission
        ).exists():
            return Response(
                {
                    "detail":
                        "Student already exists for "
                        "this admission."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        coordinator_id = serializer.validated_data.get(
            "assigned_coordinator_id"
        )

        coordinator = request.user

        if coordinator_id:
            try:
                coordinator = User.objects.get(
                    id=coordinator_id,
                    is_active=True,
                )
            except User.DoesNotExist:
                return Response(
                    {
                        "detail":
                            "Assigned coordinator "
                            "not found."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not _user_can_receive_assignment(
            request.user,
            coordinator,
        ):
            return Response(
                {
                    "detail":
                        "You cannot assign this student "
                        "to the selected coordinator."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not request.user.is_superuser:
            if not Employee.objects.filter(
                user=coordinator,
                employment_status="ACTIVE",
            ).exists():
                return Response(
                    {
                        "detail":
                            "Assigned coordinator must "
                            "be an active employee."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            student = create_student_from_admission(
                admission=admission,
                created_by=request.user,
                assigned_coordinator=coordinator,
            )

            if serializer.validated_data.get(
                "initialize_processes",
                True,
            ):
                initialize_student_processes(
                    student=student,
                    assigned_to=coordinator,
                    performed_by=request.user,
                )

        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentDetailSerializer(
                student,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # NOTE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="note",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def note(self, request, pk=None):
        student = self.get_object()

        serializer = StudentNoteSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        try:
            activity = add_student_note(
                student=student,
                description=(
                    serializer.validated_data[
                        "description"
                    ]
                ),
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentActivitySerializer(
                activity
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # PROCESSES
    # ============================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="processes",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def processes(self, request, pk=None):
        student = self.get_object()

        if request.method == "GET":
            queryset = student.processes.all()

            return Response(
                StudentProcessSerializer(
                    queryset,
                    many=True,
                ).data
            )

        serializer = CreateStudentProcessSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        assigned_to = None

        assigned_to_id = serializer.validated_data.get(
            "assigned_to_id"
        )

        if assigned_to_id:
            try:
                assigned_to = User.objects.get(
                    id=assigned_to_id,
                    is_active=True,
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Assigned user not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not _user_can_receive_assignment(
                request.user,
                assigned_to,
            ):
                return Response(
                    {
                        "detail":
                            "You cannot assign this "
                            "process to that user."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            process = create_student_process(
                student=student,
                process_type=(
                    serializer.validated_data[
                        "process_type"
                    ]
                ),
                title=serializer.validated_data.get(
                    "title",
                    "",
                ),
                academic_year=(
                    serializer.validated_data.get(
                        "academic_year"
                    )
                ),
                semester=serializer.validated_data.get(
                    "semester"
                ),
                due_date=serializer.validated_data.get(
                    "due_date"
                ),
                assigned_to=assigned_to,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentProcessSerializer(
                process
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # INITIALIZE STANDARD PROCESSES
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="initialize-processes",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def initialize_processes_action(
        self,
        request,
        pk=None,
    ):
        student = self.get_object()

        created = initialize_student_processes(
            student=student,
            assigned_to=student.assigned_coordinator,
            performed_by=request.user,
        )

        return Response(
            {
                "created_count": len(created),
                "processes": (
                    StudentProcessSerializer(
                        student.processes.all(),
                        many=True,
                    ).data
                ),
            },
            status=status.HTTP_200_OK,
        )

    # ============================================================
    # PROCESS STATUS
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"processes/"
            r"(?P<process_id>[^/.]+)/status"
        ),
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def process_status(
        self,
        request,
        pk=None,
        process_id=None,
    ):
        student = self.get_object()

        try:
            process = student.processes.get(
                id=process_id
            )
        except StudentProcess.DoesNotExist:
            return Response(
                {"detail": "Process not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = StudentProcessStatusSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        try:
            process = change_student_process_status(
                process=process,
                status=serializer.validated_data[
                    "status"
                ],
                performed_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentProcessSerializer(
                process
            ).data
        )

    # ============================================================
    # DOCUMENTS
    # ============================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="documents",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def documents(self, request, pk=None):
        student = self.get_object()

        if request.method == "GET":
            return Response(
                StudentDocumentSerializer(
                    student.documents.all(),
                    many=True,
                    context={
                        "request": request
                    },
                ).data
            )

        serializer = AddStudentDocumentSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        process = None
        process_id = serializer.validated_data.get(
            "process_id"
        )

        if process_id:
            try:
                process = student.processes.get(
                    id=process_id
                )
            except StudentProcess.DoesNotExist:
                return Response(
                    {
                        "detail":
                            "Process not found for "
                            "this student."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            document = add_student_document(
                student=student,
                document_type=(
                    serializer.validated_data[
                        "document_type"
                    ]
                ),
                title=serializer.validated_data.get(
                    "title",
                    "",
                ),
                file=serializer.validated_data.get(
                    "file"
                ),
                process=process,
                reference_number=(
                    serializer.validated_data.get(
                        "reference_number",
                        "",
                    )
                ),
                issued_date=(
                    serializer.validated_data.get(
                        "issued_date"
                    )
                ),
                received_date=(
                    serializer.validated_data.get(
                        "received_date"
                    )
                ),
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentDocumentSerializer(
                document,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # VERIFY DOCUMENT
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"documents/"
            r"(?P<document_id>[^/.]+)/verify"
        ),
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def verify_document(
        self,
        request,
        pk=None,
        document_id=None,
    ):
        student = self.get_object()

        try:
            document = student.documents.get(
                id=document_id
            )
        except StudentDocument.DoesNotExist:
            return Response(
                {"detail": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = VerifyStudentDocumentSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        try:
            document = verify_student_document(
                document=document,
                verified_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentDocumentSerializer(
                document,
                context={
                    "request": request
                },
            ).data
        )

    # ============================================================
    # ACADEMIC PROGRESS
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="progress",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def progress(self, request, pk=None):
        student = self.get_object()

        serializer = StudentProgressSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        try:
            student = update_student_progress(
                student=student,
                current_year=(
                    serializer.validated_data.get(
                        "current_year"
                    )
                ),
                current_semester=(
                    serializer.validated_data.get(
                        "current_semester"
                    )
                ),
                performed_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentDetailSerializer(
                student,
                context={
                    "request": request
                },
            ).data
        )

    # ============================================================
    # COMPLETE COURSE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="complete-course",
        permission_classes=[
            IsAuthenticated,
            CanAccessStudents,
            CanManageStudents,
        ],
    )
    def complete_course(
        self,
        request,
        pk=None,
    ):
        student = self.get_object()

        serializer = CompleteStudentCourseSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        try:
            student = complete_student_course(
                student=student,
                performed_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            StudentDetailSerializer(
                student,
                context={
                    "request": request
                },
            ).data
        )

    # ============================================================
    # ACTIVITY TIMELINE
    # ============================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="activities",
    )
    def activities(self, request, pk=None):
        student = self.get_object()

        return Response(
            StudentActivitySerializer(
                student.activities.all(),
                many=True,
            ).data
        )
    # ============================================================
    # ACTIVE STUDENTS
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="active",
    )
    def active_students(self, request):
        queryset = (
            self.get_queryset()
            .filter(
                status=Student.Status.ACTIVE,
            )
        )

        return Response(
            StudentListSerializer(
                queryset,
                many=True,
                context={
                    "request": request,
                },
            ).data
        )
    # ============================================================
    # EDUCATION PROCESS QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="process-queue",
    )
    def process_queue(self, request):

        # Use the raw scoped Student queryset here.
        # Do not use self.get_queryset(), because that queryset is
        # designed for Student list/detail retrieval and includes
        # Student-specific filtering/prefetch behaviour.
        scoped_students = _scoped_students(
            request.user
        )

        queryset = (
            StudentProcess.objects
            .filter(
                student__in=scoped_students,
            )
            .select_related(
                "student",
                "assigned_to",
            )
        )

        process_type_filter = request.query_params.get(
            "process_type",
            "",
        ).strip()

        process_status_filter = request.query_params.get(
            "status",
            "",
        ).strip()

        search_filter = request.query_params.get(
            "search",
            "",
        ).strip()

        overdue_filter = request.query_params.get(
            "overdue",
            "",
        ).strip().lower()

        # --------------------------------------------------------
        # PROCESS TYPE
        # --------------------------------------------------------

        if process_type_filter:
            valid_types = {
                value
                for value, label
                in StudentProcess.ProcessType.choices
            }

            if process_type_filter not in valid_types:
                return Response(
                    {
                        "detail":
                            "Invalid process_type."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(
                process_type=process_type_filter
            )

        # --------------------------------------------------------
        # STATUS
        # --------------------------------------------------------

        if process_status_filter:
            valid_statuses = {
                value
                for value, label
                in StudentProcess.Status.choices
            }

            if process_status_filter not in valid_statuses:
                return Response(
                    {
                        "detail":
                            "Invalid status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(
                status=process_status_filter
            )

        # --------------------------------------------------------
        # SEARCH
        # --------------------------------------------------------

        if search_filter:
            queryset = queryset.filter(
                Q(
                    title__icontains=search_filter
                )
                | Q(
                    reference_number__icontains=search_filter
                )
                | Q(
                    student__student_id__icontains=search_filter
                )
                | Q(
                    student__name__icontains=search_filter
                )
                | Q(
                    student__phone_number__icontains=search_filter
                )
                | Q(
                    student__enrollment_number__icontains=search_filter
                )
            )

        # --------------------------------------------------------
        # OVERDUE
        # --------------------------------------------------------

        if overdue_filter in {
            "true",
            "1",
            "yes",
        }:
            from django.utils import timezone

            queryset = queryset.filter(
                due_date__lt=timezone.localdate(),
            ).exclude(
                status__in=[
                    StudentProcess.Status.COMPLETED,
                    StudentProcess.Status.NOT_APPLICABLE,
                    StudentProcess.Status.CANCELLED,
                ]
            )

        queryset = queryset.order_by(
            "due_date",
            "created_at",
        )

        return Response(
            StudentProcessSerializer(
                queryset,
                many=True,
            ).data
        )
    # ============================================================
    # PENDING PROCESSES
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="pending-processes",
    )
    def pending_processes(self, request):
        students = self.get_queryset()

        queryset = StudentProcess.objects.filter(
            student__in=students,
            status__in=[
                StudentProcess.Status.NOT_STARTED,
                StudentProcess.Status.PENDING,
                StudentProcess.Status.IN_PROGRESS,
                StudentProcess.Status.SUBMITTED,
            ],
        ).select_related(
            "student",
            "assigned_to",
        ).order_by(
            "due_date",
            "created_at",
        )

        return Response(
            StudentProcessSerializer(
                queryset,
                many=True,
            ).data
        )

    # ============================================================
    # OVERDUE PROCESSES
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="overdue-processes",
    )
    def overdue_processes(self, request):
        from django.utils import timezone

        students = self.get_queryset()

        queryset = StudentProcess.objects.filter(
            student__in=students,
            due_date__lt=timezone.localdate(),
        ).exclude(
            status__in=[
                StudentProcess.Status.COMPLETED,
                StudentProcess.Status.NOT_APPLICABLE,
                StudentProcess.Status.CANCELLED,
            ]
        ).select_related(
            "student",
            "assigned_to",
        ).order_by(
            "due_date"
        )

        return Response(
            StudentProcessSerializer(
                queryset,
                many=True,
            ).data
        )
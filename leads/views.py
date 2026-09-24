from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from admissions.models import Program
from dashboard.selectors import get_scoped_leads
from organization.models import Branch

from .distribution_services import (
    bulk_assign_leads,
    distribute_leads,
    get_assignment_workload,
)
from .import_services import (
    confirm_import,
    create_import_preview,
)
from .models import (
    Lead,
    LeadAppointment,
    LeadImportBatch,
)
from .permissions import (
    CanAccessLeads,
    CanImportMarketingLeads,
    CanManageLeadAssignment,
)
from .serializers import (
    BulkLeadAssignmentSerializer,
    LeadActivitySerializer,
    LeadAssignmentSerializer,
    LeadCreateSerializer,
    LeadDetailSerializer,
    LeadDistributionSerializer,
    LeadImportBatchDetailSerializer,
    LeadImportBatchSerializer,
    LeadImportUploadSerializer,
    LeadListSerializer,
    LeadNoteSerializer,
    LeadStatusSerializer,
    LeadUpdateSerializer,
    RecordCallSerializer,
    LeadAppointmentCreateSerializer,
    LeadAppointmentSerializer,
    LeadAppointmentStatusSerializer,
    LeadCourseOptionSerializer,
    LeadQualificationSerializer,
    LeadQualificationUpdateSerializer,
    VisitBranchSerializer,
)
from .services import (
    add_lead_note,
    assign_lead,
    change_lead_appointment_status,
    change_lead_status,
    mark_lead_qualified,
    record_call,
    save_lead_qualification,
    schedule_lead_appointment,
)


User = get_user_model()


# ================================================================
# LEADS
# ================================================================


class LeadViewSet(ModelViewSet):
    permission_classes = [
        IsAuthenticated,
        CanAccessLeads,
    ]

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]

    # ============================================================
    # QUERYSET / FILTERING
    # ============================================================

    def get_queryset(self):
        assigned_to_filter = (
            self.request.query_params.get(
                "assigned_to"
            )
        )

        if (
            assigned_to_filter == "unassigned"
            and CanManageLeadAssignment().has_permission(
                self.request,
                self,
            )
        ):
            queryset = Lead.objects.filter(
                assigned_to__isnull=True
            )
        else:
            queryset = get_scoped_leads(
                self.request.user
            )

        queryset = queryset.select_related(
            "assigned_to",
            "created_by",
            "partner",
        )

        search = self.request.query_params.get(
            "search"
        )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(
                    phone_number__icontains=search
                )
                | Q(
                    email__icontains=search
                )
                | Q(
                    lead_id__icontains=search
                )
            )

        lead_status = (
            self.request.query_params.get(
                "status"
            )
        )

        if lead_status:
            queryset = queryset.filter(
                status=lead_status
            )

        vertical = (
            self.request.query_params.get(
                "vertical"
            )
        )

        if vertical:
            queryset = queryset.filter(
                vertical=vertical
            )

        channel = (
            self.request.query_params.get(
                "channel"
            )
        )

        if channel:
            queryset = queryset.filter(
                channel=channel
            )

        if assigned_to_filter:
            if assigned_to_filter == "unassigned":
                queryset = queryset.filter(
                    assigned_to__isnull=True
                )
            else:
                queryset = queryset.filter(
                    assigned_to_id=assigned_to_filter
                )

        return queryset.order_by(
            "-updated_at"
        )

    # ============================================================
    # SERIALIZER SELECTION
    # ============================================================

    def get_serializer_class(self):
        if self.action == "list":
            return LeadListSerializer

        if self.action == "retrieve":
            return LeadDetailSerializer

        if self.action == "create":
            return LeadCreateSerializer

        if self.action in {
            "partial_update",
            "update",
        }:
            return LeadUpdateSerializer

        return LeadDetailSerializer

    # ============================================================
    # CREATE LEAD
    # ============================================================

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = LeadCreateSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        lead = serializer.save(
            created_by=request.user
        )

        lead.full_clean()

        from .models import LeadActivity

        LeadActivity.objects.create(
            lead=lead,
            activity_type=(
                LeadActivity
                .ActivityType
                .CREATED
            ),
            description=(
                "Lead created through "
                "BEOIS API."
            ),
            performed_by=request.user,
        )

        output = LeadDetailSerializer(
            lead,
            context={
                "request": request
            },
        )

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # UPDATE LEAD
    # ============================================================

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        lead = self.get_object()

        serializer = LeadUpdateSerializer(
            lead,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        updated_lead = serializer.save()

        try:
            updated_lead.full_clean()

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.message_dict
                        if hasattr(
                            exc,
                            "message_dict",
                        )
                        else exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadDetailSerializer(
                updated_lead
            ).data
        )

    # ============================================================
    # BULK LEAD ASSIGNMENT
    # POST /api/leads/bulk-assign/
    # ============================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-assign",
        url_name="bulk-assignment",
        permission_classes=[
            IsAuthenticated,
            CanAccessLeads,
            CanManageLeadAssignment,
        ],
    )
    def bulk_assign(
        self,
        request,
    ):
        serializer = BulkLeadAssignmentSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        lead_ids = serializer.validated_data[
            "lead_ids"
        ]

        user_id = serializer.validated_data[
            "user_id"
        ]

        # --------------------------------------------------------
        # TARGET USER
        # --------------------------------------------------------

        try:
            target_user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "The selected user "
                        "does not exist."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if not target_user.is_active:
            return Response(
                {
                    "detail": (
                        "Cannot assign leads to "
                        "an inactive user."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        # --------------------------------------------------------
        # LEAD SCOPE SECURITY
        # --------------------------------------------------------

        accessible_leads = self.get_queryset()

        unassigned_leads = Lead.objects.filter(
            assigned_to__isnull=True,
        )

        leads = list(
            (
                accessible_leads
                | unassigned_leads
            )
            .filter(
                id__in=lead_ids
            )
            .distinct()
            .order_by(
                "created_at",
                "id",
            )
        )

        if len(leads) != len(lead_ids):
            return Response(
                {
                    "detail": (
                        "One or more selected leads "
                        "do not exist or are outside "
                        "your permitted lead scope."
                    )
                },
                status=(
                    status.HTTP_403_FORBIDDEN
                ),
            )

        # --------------------------------------------------------
        # ASSIGN
        # --------------------------------------------------------

        try:
            assigned_leads = bulk_assign_leads(
                leads=leads,
                target_user=target_user,
                performed_by=request.user,
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.message_dict
                        if hasattr(
                            exc,
                            "message_dict",
                        )
                        else exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            {
                "message": (
                    f"{len(assigned_leads)} "
                    "lead(s) assigned successfully."
                ),
                "assigned_count": len(
                    assigned_leads
                ),
                "assigned_to": {
                    "id": str(
                        target_user.id
                    ),
                    "username": (
                        target_user.username
                    ),
                    "email": (
                        target_user.email
                    ),
                },
                "leads": LeadListSerializer(
                    assigned_leads,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    # ============================================================
    # EQUAL / ROUND-ROBIN DISTRIBUTION
    # POST /api/leads/distribute/
    # ============================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="distribute",
        url_name="lead-distribution",
        permission_classes=[
            IsAuthenticated,
            CanAccessLeads,
            CanManageLeadAssignment,
        ],
    )
    def distribute(
        self,
        request,
    ):
        serializer = LeadDistributionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        lead_ids = serializer.validated_data[
            "lead_ids"
        ]

        user_ids = serializer.validated_data[
            "user_ids"
        ]

        # --------------------------------------------------------
        # RESOLVE TARGET USERS
        # Preserve the order supplied by the frontend.
        # --------------------------------------------------------

        users_by_id = {
            str(user.id): user
            for user in User.objects.filter(
                id__in=user_ids,
                is_active=True,
            )
        }

        target_users = []

        for user_id in user_ids:
            target_user = users_by_id.get(
                str(user_id)
            )

            if not target_user:
                return Response(
                    {
                        "detail": (
                            "One or more selected "
                            "users do not exist "
                            "or are inactive."
                        )
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

            target_users.append(
                target_user
            )

        # --------------------------------------------------------
        # LEAD SCOPE SECURITY
        # --------------------------------------------------------

        accessible_leads = self.get_queryset()

        unassigned_leads = Lead.objects.filter(
            assigned_to__isnull=True,
        )

        leads = list(
            (
                accessible_leads
                | unassigned_leads
            )
            .filter(
                id__in=lead_ids
            )
            .distinct()
            .order_by(
                "created_at",
                "id",
            )
        )

        if len(leads) != len(lead_ids):
            return Response(
                {
                    "detail": (
                        "One or more selected leads "
                        "do not exist or are outside "
                        "your permitted lead scope."
                    )
                },
                status=(
                    status.HTTP_403_FORBIDDEN
                ),
            )

        # --------------------------------------------------------
        # DISTRIBUTE
        # --------------------------------------------------------

        try:
            (
                distributed_leads,
                distribution,
            ) = distribute_leads(
                leads=leads,
                target_users=target_users,
                performed_by=request.user,
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.message_dict
                        if hasattr(
                            exc,
                            "message_dict",
                        )
                        else exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        distribution_result = []

        for item in distribution.values():
            user = item["user"]

            distribution_result.append(
                {
                    "user_id": str(
                        user.id
                    ),
                    "username": (
                        user.username
                    ),
                    "email": (
                        user.email
                    ),
                    "assigned_count": (
                        item[
                            "assigned_count"
                        ]
                    ),
                }
            )

        return Response(
            {
                "message": (
                    f"{len(distributed_leads)} "
                    "lead(s) distributed successfully."
                ),
                "distributed_count": len(
                    distributed_leads
                ),
                "employee_count": len(
                    target_users
                ),
                "distribution": (
                    distribution_result
                ),
                "leads": LeadListSerializer(
                    distributed_leads,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    # ============================================================
    # STAFF / TELECALLER WORKLOAD
    # GET /api/leads/workload/
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="workload",
        url_name="assignment-workload",
        permission_classes=[
            IsAuthenticated,
            CanAccessLeads,
            CanManageLeadAssignment,
        ],
    )
    def workload(
        self,
        request,
    ):
        data = get_assignment_workload(
            performed_by=request.user,
            lead_queryset=get_scoped_leads(
                request.user
            ),
        )

        return Response(
            {
                "count": len(data),
                "employees": data,
            },
            status=status.HTTP_200_OK,
        )

    # ============================================================
    # SINGLE LEAD ASSIGNMENT
    # POST /api/leads/{id}/assign/
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="assign",
        permission_classes=[
            IsAuthenticated,
            CanAccessLeads,
            CanManageLeadAssignment,
        ],
    )
    def assign(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        serializer = LeadAssignmentSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = User.objects.get(
            id=serializer.validated_data[
                "user_id"
            ]
        )

        # ========================================================
        # TARGET USER ASSIGNMENT SECURITY
        # ========================================================

        if not request.user.is_superuser:

            from accounts.models import UserRole
            from hr.models import Employee

            try:
                target_employee = (
                    Employee.objects
                    .select_related(
                        "branch",
                        "branch__business_unit",
                        "department",
                    )
                    .get(
                        user=user
                    )
                )

            except Employee.DoesNotExist:
                return Response(
                    {
                        "detail": (
                            "The selected user does "
                            "not have an employee "
                            "profile."
                        )
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

            assignments = (
                UserRole.objects
                .filter(
                    user=request.user,
                    is_active=True,
                )
                .select_related(
                    "business_unit",
                    "branch",
                    "department",
                )
            )

            target_allowed = False

            for assignment in assignments:

                scope_type = (
                    assignment.scope_type
                )

                # ----------------------------------------------
                # ORGANIZATION
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole
                    .ScopeType
                    .ORGANIZATION
                ):
                    target_allowed = True
                    break

                # ----------------------------------------------
                # BUSINESS UNIT
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole
                    .ScopeType
                    .BUSINESS_UNIT
                    and assignment.business_unit_id
                    and target_employee.branch_id
                    and (
                        target_employee
                        .branch
                        .business_unit_id
                        == assignment.business_unit_id
                    )
                ):
                    target_allowed = True
                    break

                # ----------------------------------------------
                # BRANCH
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole
                    .ScopeType
                    .BRANCH
                    and assignment.branch_id
                    and (
                        target_employee.branch_id
                        == assignment.branch_id
                    )
                ):
                    target_allowed = True
                    break

                # ----------------------------------------------
                # DEPARTMENT
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole
                    .ScopeType
                    .DEPARTMENT
                    and assignment.department_id
                    and (
                        target_employee.department_id
                        == assignment.department_id
                    )
                ):
                    if (
                        assignment.department
                        and (
                            assignment
                            .department
                            .branch_id
                        )
                    ):
                        if (
                            target_employee.branch_id
                            != (
                                assignment
                                .department
                                .branch_id
                            )
                        ):
                            continue

                    target_allowed = True
                    break

                # ----------------------------------------------
                # TEAM
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole
                    .ScopeType
                    .TEAM
                ):
                    try:
                        requester_employee = (
                            Employee.objects.get(
                                user=request.user
                            )
                        )

                    except Employee.DoesNotExist:
                        requester_employee = None

                    if requester_employee:
                        if (
                            target_employee.id
                            == requester_employee.id
                            or (
                                target_employee
                                .reporting_manager_id
                                == requester_employee.id
                            )
                        ):
                            target_allowed = True
                            break

                # ----------------------------------------------
                # OWN
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole
                    .ScopeType
                    .OWN
                    and (
                        user.id
                        == request.user.id
                    )
                ):
                    target_allowed = True
                    break

            if not target_allowed:
                return Response(
                    {
                        "detail": (
                            "The selected user is "
                            "outside your permitted "
                            "employee scope."
                        )
                    },
                    status=(
                        status.HTTP_403_FORBIDDEN
                    ),
                )

        # --------------------------------------------------------
        # EXISTING ASSIGNMENT SERVICE
        # --------------------------------------------------------

        try:
            lead = assign_lead(
                lead=lead,
                user=user,
                performed_by=request.user,
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadDetailSerializer(
                lead
            ).data
        )

    # ============================================================
    # RECORD CALL
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="call",
        permission_classes=[
            IsAuthenticated,
            CanAccessLeads,
        ],
    )
    def call(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        serializer = RecordCallSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            call_log = record_call(
                lead=lead,
                telecaller=request.user,
                outcome=(
                    serializer.validated_data[
                        "outcome"
                    ]
                ),
                notes=(
                    serializer.validated_data.get(
                        "notes",
                        "",
                    )
                ),
                follow_up_at=(
                    serializer.validated_data.get(
                        "follow_up_at"
                    )
                ),
                duration_seconds=(
                    serializer.validated_data.get(
                        "duration_seconds"
                    )
                ),
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            {
                "message": (
                    "Call recorded successfully."
                ),
                "call_id": str(
                    call_log.id
                ),
                "lead": LeadDetailSerializer(
                    lead
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # CHANGE STATUS
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="status",
    )
    def change_status(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        serializer = LeadStatusSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            lead = change_lead_status(
                lead=lead,
                status=(
                    serializer.validated_data[
                        "status"
                    ]
                ),
                performed_by=request.user,
                notes=(
                    serializer.validated_data.get(
                        "notes",
                        "",
                    )
                ),
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadDetailSerializer(
                lead
            ).data
        )

    # ============================================================
    # ADD NOTE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="note",
    )
    def note(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        serializer = LeadNoteSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            activity = add_lead_note(
                lead=lead,
                description=(
                    serializer.validated_data[
                        "description"
                    ]
                ),
                performed_by=request.user,
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": (
                        exc.messages
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadActivitySerializer(
                activity
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # ACTIVITY TIMELINE
    # ============================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="activities",
    )
    def activities(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        activities = (
            lead.activities
            .select_related(
                "performed_by"
            )
            .all()
        )

        return Response(
            LeadActivitySerializer(
                activities,
                many=True,
            ).data
        )

    # ============================================================
    # QUALIFICATION / COUNSELLING
    # GET/POST/PATCH /api/leads/{id}/qualification/
    # ============================================================

    @action(
        detail=True,
        methods=["get", "post", "patch"],
        url_path="qualification",
    )
    def qualification(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        if request.method == "GET":
            qualification = getattr(
                lead,
                "qualification",
                None,
            )

            if qualification is None:
                return Response(
                    {
                        "qualification": None,
                    }
                )

            return Response(
                LeadQualificationSerializer(
                    qualification
                ).data
            )

        serializer = (
            LeadQualificationUpdateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            qualification = (
                save_lead_qualification(
                    lead=lead,
                    performed_by=request.user,
                    **serializer.validated_data,
                )
            )

        except ValidationError as exc:
            detail = (
                exc.message_dict
                if hasattr(
                    exc,
                    "message_dict",
                )
                else exc.messages
            )

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadQualificationSerializer(
                qualification
            ).data
        )

    # ============================================================
    # SAFE COURSE FINDER
    # GET /api/leads/{id}/course-options/
    #
    # This endpoint intentionally exposes student-facing fee data
    # only. ProgramInternalFinance / center fee is never serialized.
    # ============================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="course-options",
    )
    def course_options(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        qualification = getattr(
            lead,
            "qualification",
            None,
        )

        if qualification is None:
            return Response(
                {
                    "detail": (
                        "Save qualification details "
                        "before finding eligible courses."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        queryset = (
            Program.objects
            .filter(
                is_active=True,
                institution__is_active=True,
            )
            .select_related(
                "institution"
            )
            .prefetch_related(
                "fee_plans",
                "fee_plans__installments",
            )
        )

        if (
            lead.vertical
            == Lead.Vertical.CREDIT_TRANSFER
        ):
            queryset = queryset.filter(
                is_credit_transfer_available=True
            )

        institution = (
            request.query_params.get(
                "institution"
            )
        )

        if institution:
            queryset = queryset.filter(
                institution_id=institution
            )

        level = (
            request.query_params.get(
                "level"
            )
            or qualification.required_level
        )

        if level and level != "OTHER":
            queryset = queryset.filter(
                level=level
            )

        study_mode = (
            request.query_params.get(
                "study_mode"
            )
        )

        if study_mode:
            queryset = queryset.filter(
                study_mode=study_mode
            )

        search = (
            request.query_params.get(
                "search",
                "",
            )
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    name__icontains=search
                )
                | Q(
                    code__icontains=search
                )
                | Q(
                    specialization__icontains=search
                )
                | Q(
                    institution__name__icontains=search
                )
            )

        queryset = queryset.order_by(
            "institution__name",
            "name",
        )[:100]

        return Response(
            LeadCourseOptionSerializer(
                queryset,
                many=True,
                context={
                    "qualification":
                        qualification,
                },
            ).data
        )

    # ============================================================
    # MARK QUALIFIED
    # POST /api/leads/{id}/qualify/
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="qualify",
    )
    def qualify(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        try:
            lead = mark_lead_qualified(
                lead=lead,
                performed_by=request.user,
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": exc.messages,
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadDetailSerializer(
                lead
            ).data
        )

    # ============================================================
    # OPTIONAL COLLEGE VISITS
    # GET/POST /api/leads/{id}/appointments/
    # ============================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="appointments",
    )
    def appointments(
        self,
        request,
        pk=None,
    ):
        lead = self.get_object()

        if request.method == "GET":
            appointments = (
                lead.appointments
                .select_related(
                    "branch",
                    "assigned_counsellor",
                    "created_by",
                )
                .all()
            )

            return Response(
                LeadAppointmentSerializer(
                    appointments,
                    many=True,
                ).data
            )

        if (
            lead.status
            not in {
                Lead.Status.QUALIFIED,
                Lead.Status.CONVERTED,
            }
        ):
            return Response(
                {
                    "detail": (
                        "College visits can be scheduled "
                        "after the lead is QUALIFIED."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        serializer = (
            LeadAppointmentCreateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            appointment = (
                schedule_lead_appointment(
                    lead=lead,
                    performed_by=request.user,
                    **serializer.validated_data,
                )
            )

        except ValidationError as exc:
            detail = (
                exc.message_dict
                if hasattr(
                    exc,
                    "message_dict",
                )
                else exc.messages
            )

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadAppointmentSerializer(
                appointment
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"appointments/"
            r"(?P<appointment_id>[^/.]+)/status"
        ),
    )
    def appointment_status(
        self,
        request,
        pk=None,
        appointment_id=None,
    ):
        lead = self.get_object()

        try:
            appointment = (
                lead.appointments
                .select_related(
                    "branch",
                    "assigned_counsellor",
                )
                .get(
                    id=appointment_id
                )
            )

        except LeadAppointment.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Appointment not found."
                    )
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        serializer = (
            LeadAppointmentStatusSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            appointment = (
                change_lead_appointment_status(
                    appointment=appointment,
                    performed_by=request.user,
                    **serializer.validated_data,
                )
            )

        except ValidationError as exc:
            detail = (
                exc.message_dict
                if hasattr(
                    exc,
                    "message_dict",
                )
                else exc.messages
            )

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadAppointmentSerializer(
                appointment
            ).data
        )

    # ============================================================
    # ACTIVE VISIT BRANCHES
    # GET /api/leads/visit-branches/
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="visit-branches",
    )
    def visit_branches(
        self,
        request,
    ):
        branches = (
            Branch.objects
            .filter(
                is_active=True
            )
            .order_by(
                "-is_head_office",
                "name",
            )
        )

        return Response(
            VisitBranchSerializer(
                branches,
                many=True,
            ).data
        )

    # ============================================================
    # FOLLOW-UP QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="follow-ups",
    )
    def follow_ups(
        self,
        request,
    ):
        queryset = (
            self.get_queryset()
            .filter(
                status=Lead.Status.FOLLOW_UP,
                next_follow_up_at__isnull=False,
            )
            .order_by(
                "next_follow_up_at"
            )
        )

        return Response(
            LeadListSerializer(
                queryset,
                many=True,
            ).data
        )

    # ============================================================
    # OVERDUE QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="overdue",
    )
    def overdue(
        self,
        request,
    ):
        queryset = (
            self.get_queryset()
            .filter(
                status=Lead.Status.FOLLOW_UP,
                next_follow_up_at__lte=(
                    timezone.now()
                ),
            )
            .order_by(
                "next_follow_up_at"
            )
        )

        return Response(
            LeadListSerializer(
                queryset,
                many=True,
            ).data
        )


# ================================================================
# MARKETING LEAD IMPORT
# ================================================================


class LeadImportBatchViewSet(
    ModelViewSet
):
    """
    Marketing-owned Excel / CSV lead ingestion.

    Upload does not immediately create Lead records.

    Step 1:
        POST /api/leads/imports/preview/

    Step 2:
        Review validation results.

    Step 3:
        POST /api/leads/imports/{id}/confirm/
    """

    permission_classes = [
        IsAuthenticated,
        CanImportMarketingLeads,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    queryset = (
        LeadImportBatch.objects
        .select_related(
            "uploaded_by"
        )
        .prefetch_related(
            "rows",
            "rows__existing_lead",
            "rows__imported_lead",
        )
        .all()
    )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return (
                LeadImportBatchDetailSerializer
            )

        return LeadImportBatchSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        user = self.request.user

        if user.is_superuser:
            return queryset

        # Marketing staff see their own uploaded batches.
        # Management roles can see all batches.

        if (
            user.has_role(
                "SUPER_ADMIN"
            )
            or user.has_role(
                "GENERAL_MANAGER"
            )
            or user.has_role(
                "MANAGER"
            )
            or user.has_role(
                "DEPARTMENT_HEAD"
            )
        ):
            return queryset

        return queryset.filter(
            uploaded_by=user
        )

    # ============================================================
    # IMPORT PREVIEW
    # ============================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="preview",
    )
    def preview(
        self,
        request,
    ):
        serializer = LeadImportUploadSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            batch = create_import_preview(
                uploaded_file=(
                    serializer.validated_data[
                        "file"
                    ]
                ),
                source=(
                    serializer.validated_data[
                        "source"
                    ]
                ),
                campaign=(
                    serializer.validated_data.get(
                        "campaign",
                        "",
                    )
                ),
                default_vertical=(
                    serializer.validated_data[
                        "default_vertical"
                    ]
                ),
                default_channel=(
                    serializer.validated_data[
                        "default_channel"
                    ]
                ),
                uploaded_by=request.user,
            )

        except ValueError as exc:
            return Response(
                {
                    "detail": str(
                        exc
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadImportBatchDetailSerializer(
                batch
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # CONFIRM IMPORT
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm",
    )
    def confirm(
        self,
        request,
        pk=None,
    ):
        batch = self.get_object()

        try:
            batch = confirm_import(
                batch=batch,
                performed_by=request.user,
            )

        except ValueError as exc:
            return Response(
                {
                    "detail": str(
                        exc
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            LeadImportBatchDetailSerializer(
                batch
            ).data,
            status=status.HTTP_200_OK,
        )

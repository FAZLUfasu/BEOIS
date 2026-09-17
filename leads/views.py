from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)

from .models import LeadImportBatch

from .permissions import (
    CanAccessLeads,
    CanManageLeadAssignment,
    CanImportMarketingLeads,
)

from .serializers import (
    LeadImportBatchSerializer,
    LeadImportBatchDetailSerializer,
    LeadImportUploadSerializer,
)

from .import_services import (
    create_import_preview,
    confirm_import,
)

from dashboard.selectors import (
    get_scoped_leads,
)

from .models import Lead
from .permissions import (
    CanAccessLeads,
    CanManageLeadAssignment,
)
from .serializers import (
    LeadListSerializer,
    LeadDetailSerializer,
    LeadCreateSerializer,
    LeadUpdateSerializer,
    LeadAssignmentSerializer,
    RecordCallSerializer,
    LeadStatusSerializer,
    LeadNoteSerializer,
    LeadActivitySerializer,
)
from .services import (
    assign_lead,
    record_call,
    change_lead_status,
    add_lead_note,
)


User = get_user_model()


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

    def get_queryset(self):
        queryset = (
            get_scoped_leads(
                self.request.user
            )
            .select_related(
                "assigned_to",
                "created_by",
                "partner",
            )
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

        assigned_to = (
            self.request.query_params.get(
                "assigned_to"
            )
        )

        if assigned_to:
            queryset = queryset.filter(
                assigned_to_id=assigned_to
            )

        return queryset.order_by(
            "-updated_at"
        )

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
        #
        # Access to a lead and permission to assign a lead are
        # separate concerns.
        #
        # A manager/HOD must not be able to assign an accessible
        # lead to an employee outside their organizational scope.
        #
        # Superusers bypass this restriction.
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
                    .get(user=user)
                )

            except Employee.DoesNotExist:
                return Response(
                    {
                        "detail": (
                            "The selected user does not "
                            "have an employee profile."
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

                scope_type = assignment.scope_type

                # ----------------------------------------------
                # Entire organization
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole.ScopeType.ORGANIZATION
                ):
                    target_allowed = True
                    break

                # ----------------------------------------------
                # Business unit
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole.ScopeType.BUSINESS_UNIT
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
                # Branch
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole.ScopeType.BRANCH
                    and assignment.branch_id
                    and (
                        target_employee.branch_id
                        == assignment.branch_id
                    )
                ):
                    target_allowed = True
                    break

                # ----------------------------------------------
                # Department
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole.ScopeType.DEPARTMENT
                    and assignment.department_id
                    and (
                        target_employee.department_id
                        == assignment.department_id
                    )
                ):
                    # If the scoped department itself belongs to
                    # a branch, the employee must also belong to
                    # that same branch.
                    #
                    # Shared departments have branch=None and
                    # therefore may contain employees from
                    # multiple branches.

                    if assignment.department.branch_id:

                        if (
                            target_employee.branch_id
                            != assignment.department.branch_id
                        ):
                            continue

                    target_allowed = True
                    break

                # ----------------------------------------------
                # Team
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole.ScopeType.TEAM
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
                # Own
                # ----------------------------------------------

                if (
                    scope_type
                    == UserRole.ScopeType.OWN
                    and user.id == request.user.id
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

        # ========================================================
        # EXISTING BUSINESS SERVICE
        # ========================================================

        try:
            lead = assign_lead(
                lead=lead,
                user=user,
                performed_by=request.user,
            )

        except ValidationError as exc:
            return Response(
                {
                    "detail": exc.messages
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
                    "detail": exc.messages
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
                    "detail": exc.messages
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
                    "detail": exc.messages
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
        .select_related("uploaded_by")
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

        # V1 privacy rule:
        # Marketing staff see their own uploaded batches.
        # Management roles can see all batches.
        if (
            user.has_role("SUPER_ADMIN")
            or user.has_role("GENERAL_MANAGER")
            or user.has_role("MANAGER")
            or user.has_role("DEPARTMENT_HEAD")
        ):
            return queryset

        return queryset.filter(
            uploaded_by=user
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="preview",
    )
    def preview(self, request):

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
                    "detail": str(exc)
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

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm",
    )
    def confirm(self, request, pk=None):

        batch = self.get_object()

        try:
            batch = confirm_import(
                batch=batch,
                performed_by=request.user,
            )

        except ValueError as exc:
            return Response(
                {
                    "detail": str(exc)
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
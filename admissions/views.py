from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import (
    ModelViewSet,
    ReadOnlyModelViewSet,
)

from accounts.models import UserRole
from dashboard.selectors import (
    get_scoped_admissions,
    get_scoped_employee_ids,
)
from hr.models import Employee
from leads.models import Lead

from .models import (
    Institution,
    Program,
    Admission,
    AdmissionDocument,
)
from .permissions import (
    CanAccessAdmissions,
    CanManageAdmissions,
    CanManageAdmissionFinance,
)
from .serializers import (
    InstitutionSerializer,
    ProgramSerializer,
    AdmissionListSerializer,
    AdmissionDetailSerializer,
    AdmissionDocumentSerializer,
    QualifiedLeadHandoffSerializer,
    AdmissionFeeSerializer,
    AdmissionPaymentSerializer,
    AdmissionActivitySerializer,
    AdmissionFromLeadSerializer,
    AdmissionStatusSerializer,
    AdmissionNoteSerializer,
    AddAdmissionDocumentSerializer,
    VerifyAdmissionDocumentSerializer,
    RejectAdmissionDocumentSerializer,
    AdmissionEligibleSerializer,
    AdmissionNotEligibleSerializer,
    AddAdmissionFeeSerializer,
    RecordAdmissionPaymentSerializer,
    UniversityApplicationSerializer,
    EnrollmentSerializer,
    CompleteAdmissionSerializer,
    
)
from .services import (
    create_admission_from_lead,
    change_admission_status,
    add_admission_note,
    add_admission_document,
    verify_admission_document,
    reject_admission_document,
    mark_admission_eligible,
    mark_admission_not_eligible,
    add_admission_fee,
    record_admission_payment,
    get_admission_fee_summary,
    submit_university_application,
    record_enrollment,
    complete_admission,
)


User = get_user_model()


# ================================================================
# HELPERS
# ================================================================


def _validation_error_response(exc):
    """
    Convert Django ValidationError into a consistent
    REST API 400 response.
    """

    if hasattr(exc, "message_dict"):
        detail = exc.message_dict
    else:
        detail = exc.messages

    return Response(
        {
            "detail": detail,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def _user_can_receive_assignment(
    request_user,
    target_user,
):
    """
    Check whether target_user falls inside request_user's
    organizational employee scope.

    Superusers and ORGANIZATION-scoped users may assign
    to any active employee user.
    """

    if request_user.is_superuser:
        return True

    assignments = (
        UserRole.objects
        .filter(
            user=request_user,
            is_active=True,
            role__is_active=True,
        )
    )

    if assignments.filter(
        scope_type=UserRole.ScopeType.ORGANIZATION,
    ).exists():
        return True

    target_employee = (
        Employee.objects
        .filter(
            user=target_user,
        )
        .first()
    )

    if not target_employee:
        return False

    allowed_employee_ids = set(
        get_scoped_employee_ids(
            request_user
        )
    )

    return (
        target_employee.id
        in allowed_employee_ids
    )


# ================================================================
# INSTITUTIONS
# ================================================================


class InstitutionViewSet(
    ReadOnlyModelViewSet
):
    """
    Read-only institution master data for the
    Admissions interface.
    """

    serializer_class = InstitutionSerializer

    permission_classes = [
        IsAuthenticated,
        CanAccessAdmissions,
    ]

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    def get_queryset(self):
        queryset = Institution.objects.all()

        active = self.request.query_params.get(
            "active"
        )

        if active is not None:
            active_value = active.lower()

            if active_value in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active_value in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        search = self.request.query_params.get(
            "search"
        )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(
                    short_name__icontains=search
                )
                | Q(
                    code__icontains=search
                )
            )

        return queryset.order_by(
            "name"
        )


# ================================================================
# PROGRAMS
# ================================================================


class ProgramViewSet(
    ReadOnlyModelViewSet
):
    """
    Read-only program master data for the
    Admissions interface.
    """

    serializer_class = ProgramSerializer

    permission_classes = [
        IsAuthenticated,
        CanAccessAdmissions,
    ]

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    def get_queryset(self):
        queryset = (
            Program.objects
            .select_related(
                "institution"
            )
            .prefetch_related(
                "fee_plans",
                "fee_plans__installments",
            )
            .all()
        )

        institution_id = (
            self.request
            .query_params
            .get(
                "institution"
            )
        )

        if institution_id:
            queryset = queryset.filter(
                institution_id=(
                    institution_id
                )
            )

        level = (
            self.request
            .query_params
            .get(
                "level"
            )
        )

        if level:
            queryset = queryset.filter(
                level=level
            )

        active = (
            self.request
            .query_params
            .get(
                "active"
            )
        )

        if active is not None:
            active_value = active.lower()

            if active_value in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active_value in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        credit_transfer = (
            self.request
            .query_params
            .get(
                "credit_transfer"
            )
        )

        if credit_transfer is not None:
            value = credit_transfer.lower()

            if value in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_credit_transfer_available=True
                )

            elif value in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_credit_transfer_available=False
                )

        search = (
            self.request
            .query_params
            .get(
                "search"
            )
        )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(
                    code__icontains=search
                )
                | Q(
                    institution__name__icontains=search
                )
            )

        return queryset.order_by(
            "institution__name",
            "name",
        )


# ================================================================
# ADMISSIONS
# ================================================================


class AdmissionViewSet(
    ModelViewSet
):

    permission_classes = [
        IsAuthenticated,
        CanAccessAdmissions,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    # ------------------------------------------------------------
    # QUERYSET
    # ------------------------------------------------------------

    def get_queryset(self):

        queryset = (
            get_scoped_admissions(
                self.request.user
            )
            .select_related(
                "lead",
                "institution",
                "program",
                "partner",
                "assigned_to",
                "created_by",
            )
            .prefetch_related(
                "documents",
                "fees",
                "payments",
                "activities",
            )
        )

        search = (
            self.request
            .query_params
            .get(
                "search"
            )
        )

        if search:
            queryset = queryset.filter(
                Q(
                    admission_id__icontains=search
                )
                | Q(
                    applicant_name__icontains=search
                )
                | Q(
                    phone_number__icontains=search
                )
                | Q(
                    email__icontains=search
                )
                | Q(
                    enrollment_number__icontains=search
                )
                | Q(
                    university_application_number__icontains=search
                )
            )

        admission_status = (
            self.request
            .query_params
            .get(
                "status"
            )
        )

        if admission_status:
            queryset = queryset.filter(
                status=admission_status
            )

        institution = (
            self.request
            .query_params
            .get(
                "institution"
            )
        )

        if institution:
            queryset = queryset.filter(
                institution_id=institution
            )

        program = (
            self.request
            .query_params
            .get(
                "program"
            )
        )

        if program:
            queryset = queryset.filter(
                program_id=program
            )

        vertical = (
            self.request
            .query_params
            .get(
                "vertical"
            )
        )

        if vertical:
            queryset = queryset.filter(
                vertical=vertical
            )

        channel = (
            self.request
            .query_params
            .get(
                "channel"
            )
        )

        if channel:
            queryset = queryset.filter(
                channel=channel
            )

        assigned_to = (
            self.request
            .query_params
            .get(
                "assigned_to"
            )
        )

        if assigned_to:
            queryset = queryset.filter(
                assigned_to_id=assigned_to
            )

        partner = (
            self.request
            .query_params
            .get(
                "partner"
            )
        )

        if partner:
            queryset = queryset.filter(
                partner_id=partner
            )

        return queryset.order_by(
            "-updated_at"
        )

    # ------------------------------------------------------------
    # SERIALIZER
    # ------------------------------------------------------------

    def get_serializer_class(self):

        if self.action == "list":
            return AdmissionListSerializer

        return AdmissionDetailSerializer
    # ============================================================
    # QUALIFIED LEAD HANDOFF QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="qualified-leads",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def qualified_leads(
        self,
        request,
    ):
        """
        Secure Admissions handoff queue.

        This endpoint intentionally does not use the normal
        Leads API. It exposes only QUALIFIED leads that have
        not yet been converted into an Admission.
        """

        queryset = (
            Lead.objects
            .filter(
                status=Lead.Status.QUALIFIED,
                admission__isnull=True,
            )
            .select_related(
                "assigned_to",
                "partner",
            )
        )

        # --------------------------------------------------------
        # SEARCH
        # --------------------------------------------------------

        search = (
            request.query_params
            .get(
                "search",
                "",
            )
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    lead_id__icontains=search
                )
                | Q(
                    name__icontains=search
                )
                | Q(
                    phone_number__icontains=search
                )
                | Q(
                    email__icontains=search
                )
                | Q(
                    interested_course__icontains=search
                )
            )

        # --------------------------------------------------------
        # VERTICAL
        # --------------------------------------------------------

        vertical = (
            request.query_params
            .get(
                "vertical",
                "",
            )
            .strip()
        )

        if vertical:
            queryset = queryset.filter(
                vertical=vertical
            )

        # --------------------------------------------------------
        # CHANNEL
        # --------------------------------------------------------

        channel = (
            request.query_params
            .get(
                "channel",
                "",
            )
            .strip()
        )

        if channel:
            queryset = queryset.filter(
                channel=channel
            )

        # --------------------------------------------------------
        # SOURCE
        # --------------------------------------------------------

        source = (
            request.query_params
            .get(
                "source",
                "",
            )
            .strip()
        )

        if source:
            queryset = queryset.filter(
                source__iexact=source
            )

        # --------------------------------------------------------
        # CAMPAIGN
        # --------------------------------------------------------

        campaign = (
            request.query_params
            .get(
                "campaign",
                "",
            )
            .strip()
        )

        if campaign:
            queryset = queryset.filter(
                campaign__iexact=campaign
            )

        queryset = queryset.order_by(
            "-updated_at"
        )

        return Response(
            QualifiedLeadHandoffSerializer(
                queryset,
                many=True,
                context={
                    "request": request,
                },
            ).data
        )
    # ============================================================
    # CONVERT QUALIFIED LEAD
    # ============================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="convert-from-lead",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def convert_from_lead(
        self,
        request,
    ):

        serializer = (
            AdmissionFromLeadSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            lead = Lead.objects.get(
                id=data["lead_id"]
            )

        except Lead.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Lead does not exist."
                    )
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        # --------------------------------------------------------
        # HANDOFF SECURITY
        # --------------------------------------------------------
        #
        # Admission users do not need general Marketing /
        # Telecalling lead visibility.
        #
        # Only a QUALIFIED lead may enter the Admissions
        # workflow.
        # --------------------------------------------------------

        if (
            lead.status
            != Lead.Status.QUALIFIED
        ):
            return Response(
                {
                    "detail": (
                        "Only QUALIFIED leads "
                        "can be converted to "
                        "admission."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if Admission.objects.filter(
            lead=lead
        ).exists():
            return Response(
                {
                    "detail": (
                        "An admission already "
                        "exists for this lead."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        institution = (
            Institution.objects
            .filter(
                id=data["institution_id"],
                is_active=True,
            )
            .first()
        )

        if not institution:
            return Response(
                {
                    "detail": (
                        "Active institution "
                        "does not exist."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        program = (
            Program.objects
            .filter(
                id=data["program_id"],
                is_active=True,
            )
            .first()
        )

        if not program:
            return Response(
                {
                    "detail": (
                        "Active program "
                        "does not exist."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        # --------------------------------------------------------
        # ASSIGNEE
        # --------------------------------------------------------

        assigned_to_id = data.get(
            "assigned_to_id"
        )

        if assigned_to_id:

            assigned_to = (
                User.objects
                .filter(
                    id=assigned_to_id,
                    is_active=True,
                )
                .first()
            )

            if not assigned_to:
                return Response(
                    {
                        "detail": (
                            "Selected admission "
                            "assignee does not exist "
                            "or is inactive."
                        )
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

        else:
            # Default ownership is the Admission
            # user performing the conversion.
            assigned_to = request.user

        # Target user must have an employee profile.
        target_employee = (
            Employee.objects
            .filter(
                user=assigned_to
            )
            .first()
        )

        if (
            not target_employee
            and not assigned_to.is_superuser
        ):
            return Response(
                {
                    "detail": (
                        "Selected admission "
                        "assignee does not have "
                        "an employee profile."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if not _user_can_receive_assignment(
            request.user,
            assigned_to,
        ):
            return Response(
                {
                    "detail": (
                        "The selected admission "
                        "assignee is outside your "
                        "permitted employee scope."
                    )
                },
                status=(
                    status.HTTP_403_FORBIDDEN
                ),
            )

        try:
            admission = (
                create_admission_from_lead(
                    lead=lead,
                    institution=institution,
                    program=program,
                    created_by=request.user,
                    assigned_to=assigned_to,
                    academic_session=(
                        data.get(
                            "academic_session",
                            "",
                        )
                    ),
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission,
                context={
                    "request": request,
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # CHANGE STATUS
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="status",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def change_status(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = (
            AdmissionStatusSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            admission = (
                change_admission_status(
                    admission=admission,
                    status=(
                        serializer
                        .validated_data[
                            "status"
                        ]
                    ),
                    performed_by=(
                        request.user
                    ),
                    notes=(
                        serializer
                        .validated_data
                        .get(
                            "notes",
                            "",
                        )
                    ),
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission
            ).data
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
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def note(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = (
            AdmissionNoteSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            activity = add_admission_note(
                admission=admission,
                description=(
                    serializer
                    .validated_data[
                        "description"
                    ]
                ),
                performed_by=request.user,
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionActivitySerializer(
                activity
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # ACTIVITIES
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

        admission = self.get_object()

        activities = (
            admission.activities
            .select_related(
                "performed_by"
            )
            .all()
        )

        return Response(
            AdmissionActivitySerializer(
                activities,
                many=True,
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
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def documents(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        if request.method == "GET":

            documents = (
                admission.documents
                .select_related(
                    "verified_by"
                )
                .all()
            )

            return Response(
                AdmissionDocumentSerializer(
                    documents,
                    many=True,
                    context={
                        "request": request
                    },
                ).data
            )

        serializer = (
            AddAdmissionDocumentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            document = (
                add_admission_document(
                    admission=admission,
                    document_type=(
                        serializer
                        .validated_data[
                            "document_type"
                        ]
                    ),
                    document_name=(
                        serializer
                        .validated_data
                        .get(
                            "document_name",
                            "",
                        )
                    ),
                    file=(
                        serializer
                        .validated_data
                        .get(
                            "file"
                        )
                    ),
                    notes=(
                        serializer
                        .validated_data
                        .get(
                            "notes",
                            "",
                        )
                    ),
                    performed_by=(
                        request.user
                    ),
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDocumentSerializer(
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
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def verify_document(
        self,
        request,
        pk=None,
        document_id=None,
    ):

        admission = self.get_object()

        try:
            document = (
                AdmissionDocument.objects
                .get(
                    id=document_id,
                    admission=admission,
                )
            )

        except (
            AdmissionDocument.DoesNotExist
        ):
            return Response(
                {
                    "detail": (
                        "Admission document "
                        "not found."
                    )
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        serializer = (
            VerifyAdmissionDocumentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            document = (
                verify_admission_document(
                    document=document,
                    verified_by=request.user,
                    notes=(
                        serializer
                        .validated_data
                        .get(
                            "notes",
                            "",
                        )
                    ),
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDocumentSerializer(
                document,
                context={
                    "request": request
                },
            ).data
        )

    # ============================================================
    # REJECT DOCUMENT
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"documents/"
            r"(?P<document_id>[^/.]+)/reject"
        ),
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def reject_document(
        self,
        request,
        pk=None,
        document_id=None,
    ):

        admission = self.get_object()

        try:
            document = (
                AdmissionDocument.objects
                .get(
                    id=document_id,
                    admission=admission,
                )
            )

        except (
            AdmissionDocument.DoesNotExist
        ):
            return Response(
                {
                    "detail": (
                        "Admission document "
                        "not found."
                    )
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        serializer = (
            RejectAdmissionDocumentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            document = (
                reject_admission_document(
                    document=document,
                    reason=(
                        serializer
                        .validated_data[
                            "reason"
                        ]
                    ),
                    performed_by=request.user,
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDocumentSerializer(
                document,
                context={
                    "request": request
                },
            ).data
        )

    # ============================================================
    # ELIGIBLE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="eligible",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def eligible(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = (
            AdmissionEligibleSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            admission = (
                mark_admission_eligible(
                    admission=admission,
                    performed_by=request.user,
                    notes=(
                        serializer
                        .validated_data
                        .get(
                            "notes",
                            "",
                        )
                    ),
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission
            ).data
        )

    # ============================================================
    # NOT ELIGIBLE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="not-eligible",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def not_eligible(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = (
            AdmissionNotEligibleSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            admission = (
                mark_admission_not_eligible(
                    admission=admission,
                    reason=(
                        serializer
                        .validated_data[
                            "reason"
                        ]
                    ),
                    performed_by=request.user,
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission
            ).data
        )

    # ============================================================
    # FEES
    # ============================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="fees",
        permission_classes=[
            IsAuthenticated,
            CanManageAdmissionFinance,
        ],
    )
    def fees(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        if request.method == "GET":

            fees = admission.fees.all()

            return Response(
                AdmissionFeeSerializer(
                    fees,
                    many=True,
                ).data
            )

        serializer = (
            AddAdmissionFeeSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            fee = add_admission_fee(
                admission=admission,
                fee_type=(
                    serializer
                    .validated_data[
                        "fee_type"
                    ]
                ),
                amount=(
                    serializer
                    .validated_data[
                        "amount"
                    ]
                ),
                description=(
                    serializer
                    .validated_data
                    .get(
                        "description",
                        "",
                    )
                ),
                due_date=(
                    serializer
                    .validated_data
                    .get(
                        "due_date"
                    )
                ),
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionFeeSerializer(
                fee
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # PAYMENTS
    # ============================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="payments",
        permission_classes=[
            IsAuthenticated,
            CanManageAdmissionFinance,
        ],
    )
    def payments(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        if request.method == "GET":

            payments = (
                admission.payments
                .select_related(
                    "received_by"
                )
                .all()
            )

            return Response(
                AdmissionPaymentSerializer(
                    payments,
                    many=True,
                ).data
            )

        serializer = (
            RecordAdmissionPaymentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            payment = (
                record_admission_payment(
                    admission=admission,
                    amount=(
                        serializer
                        .validated_data[
                            "amount"
                        ]
                    ),
                    payment_method=(
                        serializer
                        .validated_data[
                            "payment_method"
                        ]
                    ),
                    received_by=(
                        request.user
                    ),
                    reference_number=(
                        serializer
                        .validated_data
                        .get(
                            "reference_number",
                            "",
                        )
                    ),
                    receipt_number=(
                        serializer
                        .validated_data
                        .get(
                            "receipt_number",
                            "",
                        )
                    ),
                    notes=(
                        serializer
                        .validated_data
                        .get(
                            "notes",
                            "",
                        )
                    ),
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionPaymentSerializer(
                payment
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # FEE SUMMARY
    # ============================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="fee-summary",
        permission_classes=[
            IsAuthenticated,
            CanManageAdmissionFinance,
        ],
    )
    def fee_summary(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        summary = get_admission_fee_summary(
            admission
        )

        return Response({
            "admission_id": (
                admission.admission_id
            ),
            "total_fee": summary[
                "total_fee"
            ],
            "total_paid": summary[
                "total_paid"
            ],
            "balance": summary[
                "balance"
            ],
        })

    # ============================================================
    # UNIVERSITY APPLICATION
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="university-application",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def university_application(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = (
            UniversityApplicationSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            admission = (
                submit_university_application(
                    admission=admission,
                    application_number=(
                        serializer
                        .validated_data[
                            "application_number"
                        ]
                    ),
                    performed_by=request.user,
                )
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission
            ).data
        )

    # ============================================================
    # ENROLLMENT
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="enrollment",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def enrollment(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = EnrollmentSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            admission = record_enrollment(
                admission=admission,
                enrollment_number=(
                    serializer
                    .validated_data[
                        "enrollment_number"
                    ]
                ),
                performed_by=request.user,
                university_admission_number=(
                    serializer
                    .validated_data
                    .get(
                        "university_admission_number",
                        "",
                    )
                ),
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission
            ).data
        )

    # ============================================================
    # COMPLETE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="complete",
        permission_classes=[
            IsAuthenticated,
            CanAccessAdmissions,
            CanManageAdmissions,
        ],
    )
    def complete(
        self,
        request,
        pk=None,
    ):

        admission = self.get_object()

        serializer = (
            CompleteAdmissionSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            admission = complete_admission(
                admission=admission,
                performed_by=request.user,
                notes=(
                    serializer
                    .validated_data
                    .get(
                        "notes",
                        "",
                    )
                ),
            )

        except ValidationError as exc:
            return _validation_error_response(
                exc
            )

        return Response(
            AdmissionDetailSerializer(
                admission
            ).data
        )

    # ============================================================
    # PENDING QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="pending",
    )
    def pending(
        self,
        request,
    ):

        queryset = (
            self.get_queryset()
            .exclude(
                status__in=[
                    Admission.Status.COMPLETED,
                    Admission.Status.CANCELLED,
                    Admission.Status.NOT_ELIGIBLE,
                ]
            )
            .order_by(
                "-updated_at"
            )
        )

        return Response(
            AdmissionListSerializer(
                queryset,
                many=True,
            ).data
        )

    # ============================================================
    # DOCUMENT PENDING QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="document-pending",
    )
    def document_pending(
        self,
        request,
    ):

        queryset = (
            self.get_queryset()
            .filter(
                status__in=[
                    Admission.Status.DOCUMENT_PENDING,
                    Admission.Status.DOCUMENT_VERIFICATION,
                ]
            )
            .order_by(
                "-updated_at"
            )
        )

        return Response(
            AdmissionListSerializer(
                queryset,
                many=True,
            ).data
        )

    # ============================================================
    # FEE PENDING QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="fee-pending",
    )
    def fee_pending(
        self,
        request,
    ):

        queryset = (
            self.get_queryset()
            .filter(
                status=(
                    Admission.Status.FEE_PENDING
                )
            )
            .order_by(
                "-updated_at"
            )
        )

        return Response(
            AdmissionListSerializer(
                queryset,
                many=True,
            ).data
        )

    # ============================================================
    # ENROLLMENT PENDING QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="enrollment-pending",
    )
    def enrollment_pending(
        self,
        request,
    ):

        queryset = (
            self.get_queryset()
            .filter(
                status=(
                    Admission.Status.ENROLLMENT_PENDING
                )
            )
            .order_by(
                "-updated_at"
            )
        )

        return Response(
            AdmissionListSerializer(
                queryset,
                many=True,
            ).data
        )

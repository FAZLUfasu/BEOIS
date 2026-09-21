from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from admissions.models import Admission, Institution, Program
from dashboard.selectors import (
    get_scoped_employee_ids,
    get_scoped_partners,
)
from hr.models import Employee

from .models import (
    CommissionRule,
    CommissionTransaction,
    Partner,
    PartnerCase,
    PartnerDocument,
    PartnerIssue,
    PartnerProgramAccess,
)
from .permissions import (
    CanAccessPartners,
    CanManagePartnerCommissions,
    CanManagePartners,
)
from .serializers import (
    AddPartnerDocumentSerializer,
    CommissionActionSerializer,
    CommissionRuleSerializer,
    CommissionTransactionSerializer,
    CreateCommissionRuleSerializer,
    CreateCommissionTransactionSerializer,
    CreatePartnerCaseSerializer,
    CreatePartnerIssueSerializer,
    CreatePartnerSerializer,
    GrantProgramAccessSerializer,
    LinkAdmissionSerializer,
    MarkCommissionPaidSerializer,
    PartnerActivitySerializer,
    PartnerCaseSerializer,
    PartnerCaseStatusSerializer,
    PartnerDetailSerializer,
    PartnerDocumentSerializer,
    PartnerIssueSerializer,
    PartnerListSerializer,
    PartnerNoteSerializer,
    PartnerProgramAccessSerializer,
    PartnerStatusSerializer,
    RejectPartnerDocumentSerializer,
    VerifyPartnerDocumentSerializer,
    PartnerIssueStatusSerializer,
    PartnerProgramAccessStatusSerializer,
)
from .services import (
    add_partner_document,
    add_partner_note,
    approve_commission,
    change_partner_case_status,
    change_partner_status,
    create_commission_rule,
    create_commission_transaction,
    create_lead_from_partner_case,
    create_partner,
    create_partner_case,
    create_partner_issue,
    grant_program_access,
    link_case_to_admission,
    mark_commission_paid,
    mark_commission_payable,
    reject_partner_document,
    verify_partner_document,
    change_partner_issue_status,
    change_program_access_status,
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


def _user_can_receive_assignment(request_user, target_user):
    if request_user.is_superuser:
        return True

    if request_user.id == target_user.id:
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


class PartnerViewSet(ModelViewSet):
    permission_classes = [
        IsAuthenticated,
        CanAccessPartners,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    def get_queryset(self):
        queryset = (
            get_scoped_partners(self.request.user)
            .select_related(
                "relationship_manager",
                "created_by",
            )
        )

        search = self.request.query_params.get("search")
        partner_status = self.request.query_params.get("status")
        partner_type = self.request.query_params.get("partner_type")
        state = self.request.query_params.get("state")
        territory = self.request.query_params.get("territory")
        manager = self.request.query_params.get(
            "relationship_manager"
        )

        if search:
            queryset = queryset.filter(
                Q(partner_id__icontains=search)
                | Q(name__icontains=search)
                | Q(contact_person__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(email__icontains=search)
                | Q(organization_name__icontains=search)
            )

        if partner_status:
            queryset = queryset.filter(status=partner_status)

        if partner_type:
            queryset = queryset.filter(partner_type=partner_type)

        if state:
            queryset = queryset.filter(state__iexact=state)

        if territory:
            queryset = queryset.filter(
                territory__icontains=territory
            )

        if manager:
            queryset = queryset.filter(
                relationship_manager_id=manager
            )

        return queryset.order_by("-updated_at")

    def get_serializer_class(self):
        if self.action == "list":
            return PartnerListSerializer

        return PartnerDetailSerializer

    def create(self, request, *args, **kwargs):
        permission = CanManagePartners()

        if not permission.has_permission(request, self):
            return Response(
                {"detail": "You do not have permission."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreatePartnerSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        manager = request.user

        manager_id = serializer.validated_data.get(
            "relationship_manager_id"
        )

        if manager_id:
            try:
                manager = User.objects.get(
                    id=manager_id,
                    is_active=True,
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Relationship manager not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not _user_can_receive_assignment(
            request.user,
            manager,
        ):
            return Response(
                {
                    "detail":
                        "You cannot assign this partner "
                        "to the selected relationship manager."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            partner = create_partner(
                name=serializer.validated_data["name"],
                phone_number=serializer.validated_data[
                    "phone_number"
                ],
                partner_type=serializer.validated_data.get(
                    "partner_type",
                    Partner.PartnerType.EDUCATION_CENTRE,
                ),
                contact_person=serializer.validated_data.get(
                    "contact_person",
                    "",
                ),
                email=serializer.validated_data.get(
                    "email",
                    "",
                ),
                city=serializer.validated_data.get(
                    "city",
                    "",
                ),
                district=serializer.validated_data.get(
                    "district",
                    "",
                ),
                state=serializer.validated_data.get(
                    "state",
                    "",
                ),
                territory=serializer.validated_data.get(
                    "territory",
                    "",
                ),
                organization_name=serializer.validated_data.get(
                    "organization_name",
                    "",
                ),
                relationship_manager=manager,
                created_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerDetailSerializer(partner).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="status",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def change_status(self, request, pk=None):
        partner = self.get_object()

        serializer = PartnerStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            partner = change_partner_status(
                partner=partner,
                status=serializer.validated_data["status"],
                performed_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerDetailSerializer(partner).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="note",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def note(self, request, pk=None):
        partner = self.get_object()

        serializer = PartnerNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            activity = add_partner_note(
                partner,
                serializer.validated_data["description"],
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerActivitySerializer(activity).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="activities",
    )
    def activities(self, request, pk=None):
        partner = self.get_object()

        return Response(
            PartnerActivitySerializer(
                partner.activities.all(),
                many=True,
            ).data
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="documents",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def documents(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            return Response(
                PartnerDocumentSerializer(
                    partner.documents.all(),
                    many=True,
                    context={"request": request},
                ).data
            )

        serializer = AddPartnerDocumentSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            document = add_partner_document(
                partner=partner,
                document_type=serializer.validated_data[
                    "document_type"
                ],
                title=serializer.validated_data.get(
                    "title",
                    "",
                ),
                file=serializer.validated_data.get("file"),
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerDocumentSerializer(
                document,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"documents/(?P<document_id>[^/.]+)/verify",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def verify_document(
        self,
        request,
        pk=None,
        document_id=None,
    ):
        partner = self.get_object()

        try:
            document = partner.documents.get(id=document_id)
        except PartnerDocument.DoesNotExist:
            return Response(
                {"detail": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = VerifyPartnerDocumentSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            document = verify_partner_document(
                document,
                verified_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerDocumentSerializer(
                document,
                context={"request": request},
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"documents/(?P<document_id>[^/.]+)/reject",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def reject_document(
        self,
        request,
        pk=None,
        document_id=None,
    ):
        partner = self.get_object()

        try:
            document = partner.documents.get(id=document_id)
        except PartnerDocument.DoesNotExist:
            return Response(
                {"detail": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = RejectPartnerDocumentSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            document = reject_partner_document(
                document,
                reason=serializer.validated_data["reason"],
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerDocumentSerializer(document).data
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="program-access",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def program_access(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            return Response(
                PartnerProgramAccessSerializer(
                    partner.program_access.all(),
                    many=True,
                ).data
            )

        serializer = GrantProgramAccessSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            institution = Institution.objects.get(
                id=serializer.validated_data["institution_id"],
                is_active=True,
            )
            program = Program.objects.get(
                id=serializer.validated_data["program_id"],
                is_active=True,
            )
        except (Institution.DoesNotExist, Program.DoesNotExist):
            return Response(
                {"detail": "Institution or program not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            access = grant_program_access(
                partner=partner,
                institution=institution,
                program=program,
                effective_from=serializer.validated_data.get(
                    "effective_from"
                ),
                effective_to=serializer.validated_data.get(
                    "effective_to"
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
            PartnerProgramAccessSerializer(access).data,
            status=status.HTTP_201_CREATED,
        )


    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"program-access/"
            r"(?P<access_id>[^/.]+)/status"
        ),
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def program_access_status(
        self,
        request,
        pk=None,
        access_id=None,
    ):
        partner = self.get_object()

        try:
            access = partner.program_access.get(
                id=access_id
            )
        except PartnerProgramAccess.DoesNotExist:
            return Response(
                {"detail": "Program access not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PartnerProgramAccessStatusSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            access = change_program_access_status(
                access=access,
                is_active=serializer.validated_data[
                    "is_active"
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
            PartnerProgramAccessSerializer(access).data
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="cases",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def cases(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            return Response(
                PartnerCaseSerializer(
                    partner.cases.all(),
                    many=True,
                ).data
            )

        serializer = CreatePartnerCaseSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        institution = None
        program = None
        assigned_to = None

        institution_id = serializer.validated_data.get(
            "institution_id"
        )
        program_id = serializer.validated_data.get(
            "program_id"
        )

        if institution_id:
            try:
                institution = Institution.objects.get(
                    id=institution_id,
                    is_active=True,
                )
            except Institution.DoesNotExist:
                return Response(
                    {"detail": "Institution not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if program_id:
            try:
                program = Program.objects.get(
                    id=program_id,
                    is_active=True,
                )
            except Program.DoesNotExist:
                return Response(
                    {"detail": "Program not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

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
                            "You cannot assign this case "
                            "to the selected user."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            case = create_partner_case(
                partner=partner,
                applicant_name=serializer.validated_data[
                    "applicant_name"
                ],
                phone_number=serializer.validated_data[
                    "phone_number"
                ],
                institution=institution,
                program=program,
                vertical=serializer.validated_data.get(
                    "vertical",
                    Admission.Vertical.REGULAR,
                ),
                partner_reference_number=(
                    serializer.validated_data.get(
                        "partner_reference_number",
                        "",
                    )
                ),
                assigned_to=assigned_to,
                created_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerCaseSerializer(case).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"cases/(?P<case_id>[^/.]+)/status",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def case_status(
        self,
        request,
        pk=None,
        case_id=None,
    ):
        partner = self.get_object()

        try:
            case = partner.cases.get(id=case_id)
        except PartnerCase.DoesNotExist:
            return Response(
                {"detail": "Partner case not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PartnerCaseStatusSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            case = change_partner_case_status(
                case,
                serializer.validated_data["status"],
                performed_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerCaseSerializer(case).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"cases/(?P<case_id>[^/.]+)/create-lead",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def case_create_lead(
        self,
        request,
        pk=None,
        case_id=None,
    ):
        partner = self.get_object()

        try:
            case = partner.cases.get(id=case_id)
        except PartnerCase.DoesNotExist:
            return Response(
                {"detail": "Partner case not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            lead = create_lead_from_partner_case(
                case,
                created_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            {
                "id": str(lead.id),
                "lead_id": lead.lead_id,
                "name": lead.name,
                "status": lead.status,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"cases/(?P<case_id>[^/.]+)/link-admission",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def case_link_admission(
        self,
        request,
        pk=None,
        case_id=None,
    ):
        partner = self.get_object()

        try:
            case = partner.cases.get(id=case_id)
        except PartnerCase.DoesNotExist:
            return Response(
                {"detail": "Partner case not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = LinkAdmissionSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            admission = Admission.objects.get(
                id=serializer.validated_data["admission_id"]
            )
        except Admission.DoesNotExist:
            return Response(
                {"detail": "Admission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Important cross-partner protection.
        if admission.partner_id != partner.id:
            return Response(
                {
                    "detail":
                        "Admission belongs to a different partner."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            case = link_case_to_admission(
                case,
                admission,
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerCaseSerializer(case).data
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="commission-rules",
        permission_classes=[
            IsAuthenticated,
            CanManagePartnerCommissions,
        ],
    )
    def commission_rules(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            return Response(
                CommissionRuleSerializer(
                    partner.commission_rules.all(),
                    many=True,
                ).data
            )

        serializer = CreateCommissionRuleSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        institution = None
        program = None

        institution_id = serializer.validated_data.get(
            "institution_id"
        )
        program_id = serializer.validated_data.get(
            "program_id"
        )

        if institution_id:
            try:
                institution = Institution.objects.get(
                    id=institution_id
                )
            except Institution.DoesNotExist:
                return Response(
                    {"detail": "Institution not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if program_id:
            try:
                program = Program.objects.get(
                    id=program_id
                )
            except Program.DoesNotExist:
                return Response(
                    {"detail": "Program not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            rule = create_commission_rule(
                partner=partner,
                commission_type=serializer.validated_data[
                    "commission_type"
                ],
                value=serializer.validated_data["value"],
                institution=institution,
                program=program,
                vertical=serializer.validated_data.get(
                    "vertical",
                    "",
                ),
                effective_from=serializer.validated_data.get(
                    "effective_from"
                ),
                effective_to=serializer.validated_data.get(
                    "effective_to"
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
            CommissionRuleSerializer(rule).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="commissions",
        permission_classes=[
            IsAuthenticated,
            CanManagePartnerCommissions,
        ],
    )
    def commissions(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            return Response(
                CommissionTransactionSerializer(
                    partner.commission_transactions.all(),
                    many=True,
                ).data
            )

        serializer = CreateCommissionTransactionSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            rule = partner.commission_rules.get(
                id=serializer.validated_data["rule_id"]
            )
        except CommissionRule.DoesNotExist:
            return Response(
                {"detail": "Commission rule not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        partner_case = None
        admission = None

        partner_case_id = serializer.validated_data.get(
            "partner_case_id"
        )

        if partner_case_id:
            try:
                partner_case = partner.cases.get(
                    id=partner_case_id
                )
            except PartnerCase.DoesNotExist:
                return Response(
                    {"detail": "Partner case not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        admission_id = serializer.validated_data.get(
            "admission_id"
        )

        if admission_id:
            try:
                admission = Admission.objects.get(
                    id=admission_id,
                    partner=partner,
                )
            except Admission.DoesNotExist:
                return Response(
                    {
                        "detail":
                            "Partner admission not found."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            transaction_obj = create_commission_transaction(
                partner=partner,
                rule=rule,
                base_amount=serializer.validated_data[
                    "base_amount"
                ],
                partner_case=partner_case,
                admission=admission,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            CommissionTransactionSerializer(
                transaction_obj
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def _get_partner_commission(
        self,
        partner,
        commission_id,
    ):
        try:
            return partner.commission_transactions.get(
                id=commission_id
            )
        except CommissionTransaction.DoesNotExist:
            return None

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"commissions/"
            r"(?P<commission_id>[^/.]+)/approve"
        ),
        permission_classes=[
            IsAuthenticated,
            CanManagePartnerCommissions,
        ],
    )
    def approve_commission_action(
        self,
        request,
        pk=None,
        commission_id=None,
    ):
        partner = self.get_object()
        transaction_obj = self._get_partner_commission(
            partner,
            commission_id,
        )

        if transaction_obj is None:
            return Response(
                {"detail": "Commission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CommissionActionSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            transaction_obj = approve_commission(
                transaction_obj,
                approved_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            CommissionTransactionSerializer(
                transaction_obj
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"commissions/"
            r"(?P<commission_id>[^/.]+)/payable"
        ),
        permission_classes=[
            IsAuthenticated,
            CanManagePartnerCommissions,
        ],
    )
    def payable_commission(
        self,
        request,
        pk=None,
        commission_id=None,
    ):
        partner = self.get_object()
        transaction_obj = self._get_partner_commission(
            partner,
            commission_id,
        )

        if transaction_obj is None:
            return Response(
                {"detail": "Commission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            transaction_obj = mark_commission_payable(
                transaction_obj,
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            CommissionTransactionSerializer(
                transaction_obj
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"commissions/"
            r"(?P<commission_id>[^/.]+)/paid"
        ),
        permission_classes=[
            IsAuthenticated,
            CanManagePartnerCommissions,
        ],
    )
    def paid_commission(
        self,
        request,
        pk=None,
        commission_id=None,
    ):
        partner = self.get_object()
        transaction_obj = self._get_partner_commission(
            partner,
            commission_id,
        )

        if transaction_obj is None:
            return Response(
                {"detail": "Commission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MarkCommissionPaidSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            transaction_obj = mark_commission_paid(
                transaction_obj,
                payment_reference=(
                    serializer.validated_data[
                        "payment_reference"
                    ]
                ),
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            CommissionTransactionSerializer(
                transaction_obj
            ).data
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="issues",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def issues(self, request, pk=None):
        partner = self.get_object()

        if request.method == "GET":
            return Response(
                PartnerIssueSerializer(
                    partner.issues.all(),
                    many=True,
                ).data
            )

        serializer = CreatePartnerIssueSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        partner_case = None
        assigned_to = None

        partner_case_id = serializer.validated_data.get(
            "partner_case_id"
        )

        if partner_case_id:
            try:
                partner_case = partner.cases.get(
                    id=partner_case_id
                )
            except PartnerCase.DoesNotExist:
                return Response(
                    {"detail": "Partner case not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

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
                            "You cannot assign this issue "
                            "to the selected user."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            issue = create_partner_issue(
                partner=partner,
                subject=serializer.validated_data["subject"],
                description=serializer.validated_data[
                    "description"
                ],
                priority=serializer.validated_data.get(
                    "priority",
                    PartnerIssue.Priority.MEDIUM,
                ),
                partner_case=partner_case,
                assigned_to=assigned_to,
                performed_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerIssueSerializer(issue).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=(
            r"issues/"
            r"(?P<issue_id>[^/.]+)/status"
        ),
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartners,
        ],
    )
    def issue_status(
        self,
        request,
        pk=None,
        issue_id=None,
    ):
        partner = self.get_object()

        try:
            issue = partner.issues.get(
                id=issue_id
            )
        except PartnerIssue.DoesNotExist:
            return Response(
                {"detail": "Partner issue not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PartnerIssueStatusSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            issue = change_partner_issue_status(
                issue=issue,
                status=serializer.validated_data["status"],
                performed_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(
            PartnerIssueSerializer(issue).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="summary",
    )
    def summary(self, request):
        partners = self.get_queryset()

        partner_ids = partners.values_list(
            "id",
            flat=True,
        )

        cases = PartnerCase.objects.filter(
            partner_id__in=partner_ids,
        )

        issues = PartnerIssue.objects.filter(
            partner_id__in=partner_ids,
        )

        commissions = CommissionTransaction.objects.filter(
            partner_id__in=partner_ids,
        )

        partner_status_counts = {
            item["status"]: item["count"]
            for item in partners.values("status").annotate(
                count=Count("id")
            )
        }

        case_status_counts = {
            item["status"]: item["count"]
            for item in cases.values("status").annotate(
                count=Count("id")
            )
        }

        commission_status_counts = {
            item["status"]: item["count"]
            for item in commissions.values("status").annotate(
                count=Count("id")
            )
        }

        open_cases = cases.exclude(
            status__in=[
                PartnerCase.Status.COMPLETED,
                PartnerCase.Status.REJECTED,
                PartnerCase.Status.CANCELLED,
            ]
        )

        open_issues = issues.exclude(
            status__in=[
                PartnerIssue.Status.RESOLVED,
                PartnerIssue.Status.CLOSED,
            ]
        )

        pending_commissions = commissions.filter(
            status__in=[
                CommissionTransaction.Status.EARNED,
                CommissionTransaction.Status.APPROVED,
                CommissionTransaction.Status.PAYABLE,
            ]
        )

        paid_commissions = commissions.filter(
            status=CommissionTransaction.Status.PAID,
        )

        pending_amount = pending_commissions.aggregate(
            total=Coalesce(
                Sum("commission_amount"),
                Decimal("0.00"),
            )
        )["total"]

        paid_amount = paid_commissions.aggregate(
            total=Coalesce(
                Sum("commission_amount"),
                Decimal("0.00"),
            )
        )["total"]

        return Response({
            "partners": {
                "total": partners.count(),
                "active": partners.filter(
                    status=Partner.Status.ACTIVE
                ).count(),
                "prospects": partners.filter(
                    status=Partner.Status.PROSPECT
                ).count(),
                "onboarding": partners.filter(
                    status=Partner.Status.ONBOARDING
                ).count(),
                "status_counts": partner_status_counts,
            },
            "cases": {
                "total": cases.count(),
                "open": open_cases.count(),
                "status_counts": case_status_counts,
            },
            "issues": {
                "total": issues.count(),
                "open": open_issues.count(),
                "urgent_open": open_issues.filter(
                    priority=PartnerIssue.Priority.URGENT
                ).count(),
            },
            "commissions": {
                "total": commissions.count(),
                "pending": pending_commissions.count(),
                "paid": paid_commissions.count(),
                "pending_amount": str(pending_amount),
                "paid_amount": str(paid_amount),
                "status_counts": commission_status_counts,
            },
        })

    @action(
        detail=False,
        methods=["get"],
        url_path="commission-queue",
        permission_classes=[
            IsAuthenticated,
            CanAccessPartners,
            CanManagePartnerCommissions,
        ],
    )
    def commission_queue(self, request):
        scoped_partners = get_scoped_partners(
            request.user
        )

        queryset = (
            CommissionTransaction.objects
            .filter(
                partner__in=scoped_partners,
                status__in=[
                    CommissionTransaction.Status.EARNED,
                    CommissionTransaction.Status.APPROVED,
                    CommissionTransaction.Status.PAYABLE,
                ],
            )
            .select_related(
                "partner",
                "partner_case",
                "admission",
                "rule",
                "approved_by",
            )
            .order_by("-created_at")
        )

        commission_status = request.query_params.get(
            "status"
        )

        partner_id = request.query_params.get(
            "partner"
        )

        if commission_status:
            pending_statuses = {
                CommissionTransaction.Status.EARNED,
                CommissionTransaction.Status.APPROVED,
                CommissionTransaction.Status.PAYABLE,
            }

            if commission_status not in pending_statuses:
                return Response(
                    {
                        "detail":
                            "Invalid pending commission status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(
                status=commission_status
            )

        if partner_id:
            queryset = queryset.filter(
                partner_id=partner_id
            )

        return Response(
            CommissionTransactionSerializer(
                queryset,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="active",
    )
    def active(self, request):
        queryset = self.get_queryset().filter(
            status=Partner.Status.ACTIVE
        )

        return Response(
            PartnerListSerializer(
                queryset,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="open-cases",
    )
    def open_cases(self, request):
        partners = self.get_queryset()

        queryset = PartnerCase.objects.filter(
            partner__in=partners,
        ).exclude(
            status__in=[
                PartnerCase.Status.COMPLETED,
                PartnerCase.Status.REJECTED,
                PartnerCase.Status.CANCELLED,
            ]
        ).select_related(
            "partner",
            "institution",
            "program",
            "assigned_to",
        ).order_by("-updated_at")

        return Response(
            PartnerCaseSerializer(
                queryset,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="open-issues",
    )
    def open_issues(self, request):
        partners = self.get_queryset()

        queryset = PartnerIssue.objects.filter(
            partner__in=partners,
        ).exclude(
            status__in=[
                PartnerIssue.Status.RESOLVED,
                PartnerIssue.Status.CLOSED,
            ]
        ).select_related(
            "partner",
            "partner_case",
            "assigned_to",
        ).order_by("-created_at")

        return Response(
            PartnerIssueSerializer(
                queryset,
                many=True,
            ).data
        )
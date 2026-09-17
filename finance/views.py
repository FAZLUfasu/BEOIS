from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from admissions.models import (
    Admission,
    AdmissionPayment,
    Institution,
)
from hr.models import Payroll
from organization.models import Branch, BusinessUnit
from partners.models import CommissionTransaction

from .models import (
    Expense,
    FinanceActivity,
    FinancialAccount,
    FinancialTransaction,
    TransactionCategory,
    UniversityPayable,
)

from .permissions import (
    CanApproveFinance,
    CanMakeFinancePayment,
    CanManageFinance,
    HasFinanceAccess,
)

from .serializers import (
    ExpenseCreateSerializer,
    ExpensePaymentInputSerializer,
    ExpenseSerializer,
    FinanceActivitySerializer,
    FinanceSyncSerializer,
    FinancialAccountSerializer,
    FinancialTransactionSerializer,
    ManualTransactionSerializer,
    TransactionCategorySerializer,
    UniversityPayableCreateSerializer,
    UniversityPayableSerializer,
    UniversityPaymentInputSerializer,
)

from .services import (
    approve_expense,
    create_expense,
    create_financial_account,
    create_manual_expense_transaction,
    create_manual_income,
    create_university_payable,
    get_account_balance,
    get_admission_financial_summary,
    get_finance_summary,
    get_outstanding_finance_summary,
    initialize_finance_categories,
    pay_expense,
    pay_university_payable,
    post_financial_transaction,
    submit_expense,
    sync_admission_payment,
    sync_paid_partner_commission,
    sync_paid_payroll,
)


# ================================================================
# HELPERS
# ================================================================


def validation_error_response(exc):
    """
    Convert Django ValidationError into a DRF 400 response.
    """

    if hasattr(exc, "message_dict"):
        data = exc.message_dict
    elif hasattr(exc, "messages"):
        data = {
            "detail": exc.messages
        }
    else:
        data = {
            "detail": str(exc)
        }

    return Response(
        data,
        status=status.HTTP_400_BAD_REQUEST,
    )


def get_optional_business_unit(value):
    if not value:
        return None

    return get_object_or_404(
        BusinessUnit,
        pk=value,
    )


def get_optional_branch(value):
    if not value:
        return None

    return get_object_or_404(
        Branch,
        pk=value,
    )


# ================================================================
# FINANCIAL ACCOUNTS
# ================================================================


class FinancialAccountViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasFinanceAccess,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    queryset = (
        FinancialAccount.objects
        .select_related(
            "business_unit",
            "branch",
        )
        .all()
    )

    serializer_class = FinancialAccountSerializer

    def create(self, request, *args, **kwargs):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to create financial accounts."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            account = create_financial_account(
                name=data["name"],
                code=data["code"],
                account_type=data["account_type"],
                opening_balance=data.get(
                    "opening_balance",
                    0,
                ),
                opening_balance_date=data.get(
                    "opening_balance_date"
                ),
                business_unit=data.get(
                    "business_unit"
                ),
                branch=data.get("branch"),
                bank_name=data.get(
                    "bank_name",
                    "",
                ),
                account_number=data.get(
                    "account_number",
                    "",
                ),
                ifsc_code=data.get(
                    "ifsc_code",
                    "",
                ),
                upi_id=data.get(
                    "upi_id",
                    "",
                ),
                notes=data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        output = self.get_serializer(account)

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="balance",
    )
    def balance(self, request, pk=None):
        account = self.get_object()

        as_of_date = request.query_params.get(
            "as_of_date"
        )

        if as_of_date:
            from datetime import date

            try:
                as_of_date = date.fromisoformat(
                    as_of_date
                )
            except ValueError:
                return Response(
                    {
                        "as_of_date": (
                            "Use YYYY-MM-DD format."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        balance = get_account_balance(
            account,
            as_of_date=as_of_date,
        )

        return Response(
            {
                "account_id": account.id,
                "account_code": account.code,
                "account_name": account.name,
                "as_of_date": as_of_date,
                "balance": balance,
            }
        )


# ================================================================
# TRANSACTION CATEGORIES
# ================================================================


class TransactionCategoryViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
        HasFinanceAccess,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    queryset = (
        TransactionCategory.objects
        .all()
    )

    serializer_class = (
        TransactionCategorySerializer
    )

    def create(self, request, *args, **kwargs):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to create transaction categories."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().create(
            request,
            *args,
            **kwargs,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="initialize-system",
    )
    def initialize_system(self, request):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to initialize Finance categories."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        categories = initialize_finance_categories()

        serializer = self.get_serializer(
            categories,
            many=True,
        )

        return Response(serializer.data)


# ================================================================
# FINANCIAL TRANSACTIONS
# ================================================================


class FinancialTransactionViewSet(
    viewsets.ReadOnlyModelViewSet
):

    permission_classes = [
        HasFinanceAccess,
    ]

    serializer_class = (
        FinancialTransactionSerializer
    )

    queryset = (
        FinancialTransaction.objects
        .select_related(
            "account",
            "category",
            "business_unit",
            "branch",
            "admission",
            "institution",
            "partner",
            "created_by",
            "posted_by",
        )
        .all()
    )

    def get_queryset(self):
        queryset = super().get_queryset()

        transaction_type = (
            self.request.query_params.get(
                "transaction_type"
            )
        )

        source_type = (
            self.request.query_params.get(
                "source_type"
            )
        )

        transaction_status = (
            self.request.query_params.get(
                "status"
            )
        )

        account = (
            self.request.query_params.get(
                "account"
            )
        )

        branch = (
            self.request.query_params.get(
                "branch"
            )
        )

        start_date = (
            self.request.query_params.get(
                "start_date"
            )
        )

        end_date = (
            self.request.query_params.get(
                "end_date"
            )
        )

        search = (
            self.request.query_params.get(
                "search"
            )
        )

        if transaction_type:
            queryset = queryset.filter(
                transaction_type=transaction_type
            )

        if source_type:
            queryset = queryset.filter(
                source_type=source_type
            )

        if transaction_status:
            queryset = queryset.filter(
                status=transaction_status
            )

        if account:
            queryset = queryset.filter(
                account_id=account
            )

        if branch:
            queryset = queryset.filter(
                branch_id=branch
            )

        if start_date:
            queryset = queryset.filter(
                transaction_date__gte=start_date
            )

        if end_date:
            queryset = queryset.filter(
                transaction_date__lte=end_date
            )

        if search:
            queryset = queryset.filter(
                Q(
                    transaction_number__icontains=search
                )
                | Q(
                    reference_number__icontains=search
                )
                | Q(
                    description__icontains=search
                )
            )

        return queryset

    @action(
        detail=False,
        methods=["post"],
        url_path="manual-income",
    )
    def manual_income(self, request):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ManualTransactionSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        business_unit = (
            get_optional_business_unit(
                data.get("business_unit")
            )
        )

        branch = get_optional_branch(
            data.get("branch")
        )

        try:
            transaction = create_manual_income(
                account=data["account"],
                category=data["category"],
                amount=data["amount"],
                transaction_date=(
                    data["transaction_date"]
                ),
                description=data["description"],
                payment_method=data.get(
                    "payment_method",
                    "",
                ),
                reference_number=data.get(
                    "reference_number",
                    "",
                ),
                business_unit=business_unit,
                branch=branch,
                created_by=request.user,
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            FinancialTransactionSerializer(
                transaction
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="manual-expense",
    )
    def manual_expense(self, request):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ManualTransactionSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        business_unit = (
            get_optional_business_unit(
                data.get("business_unit")
            )
        )

        branch = get_optional_branch(
            data.get("branch")
        )

        try:
            transaction = (
                create_manual_expense_transaction(
                    account=data["account"],
                    category=data["category"],
                    amount=data["amount"],
                    transaction_date=(
                        data["transaction_date"]
                    ),
                    description=(
                        data["description"]
                    ),
                    payment_method=data.get(
                        "payment_method",
                        "",
                    ),
                    reference_number=data.get(
                        "reference_number",
                        "",
                    ),
                    business_unit=business_unit,
                    branch=branch,
                    created_by=request.user,
                )
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            FinancialTransactionSerializer(
                transaction
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="post",
    )
    def post_transaction(self, request, pk=None):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        transaction = self.get_object()

        try:
            transaction = (
                post_financial_transaction(
                    transaction,
                    posted_by=request.user,
                )
            )
        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            self.get_serializer(
                transaction
            ).data
        )


# ================================================================
# EXPENSES
# ================================================================


class ExpenseViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasFinanceAccess,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    serializer_class = ExpenseSerializer

    queryset = (
        Expense.objects
        .select_related(
            "category",
            "business_unit",
            "branch",
            "requested_by",
            "approved_by",
        )
        .prefetch_related(
            "payments",
        )
        .all()
    )

    def get_queryset(self):
        queryset = super().get_queryset()

        expense_status = (
            self.request.query_params.get(
                "status"
            )
        )

        branch = (
            self.request.query_params.get(
                "branch"
            )
        )

        if expense_status:
            queryset = queryset.filter(
                status=expense_status
            )

        if branch:
            queryset = queryset.filter(
                branch_id=branch
            )

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return ExpenseCreateSerializer

        return ExpenseSerializer

    def create(self, request, *args, **kwargs):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ExpenseCreateSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        business_unit = (
            get_optional_business_unit(
                data.get("business_unit")
            )
        )

        branch = get_optional_branch(
            data.get("branch")
        )

        try:
            expense = create_expense(
                category=data["category"],
                description=data["description"],
                amount=data["amount"],
                expense_date=data["expense_date"],
                vendor_name=data.get(
                    "vendor_name",
                    "",
                ),
                bill_number=data.get(
                    "bill_number",
                    "",
                ),
                bill_date=data.get("bill_date"),
                due_date=data.get("due_date"),
                business_unit=business_unit,
                branch=branch,
                requested_by=request.user,
                notes=data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            ExpenseSerializer(expense).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def submit(self, request, pk=None):
        expense = self.get_object()

        try:
            expense = submit_expense(
                expense,
                performed_by=request.user,
            )
        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            ExpenseSerializer(expense).data
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(self, request, pk=None):
        if not CanApproveFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        expense = self.get_object()

        try:
            expense = approve_expense(
                expense,
                approved_by=request.user,
            )
        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            ExpenseSerializer(expense).data
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def pay(self, request, pk=None):
        if not CanMakeFinancePayment().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        expense = self.get_object()

        serializer = ExpensePaymentInputSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            expense = pay_expense(
                expense=expense,
                account=data["account"],
                amount=data["amount"],
                payment_method=(
                    data["payment_method"]
                ),
                reference_number=data.get(
                    "reference_number",
                    "",
                ),
                paid_by=request.user,
                paid_at=data.get("paid_at"),
                notes=data.get("notes", ""),
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            ExpenseSerializer(expense).data
        )


# ================================================================
# UNIVERSITY PAYABLES
# ================================================================


class UniversityPayableViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
        HasFinanceAccess,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    serializer_class = (
        UniversityPayableSerializer
    )

    queryset = (
        UniversityPayable.objects
        .select_related(
            "institution",
            "admission",
            "created_by",
        )
        .prefetch_related(
            "payments",
        )
        .all()
    )

    def get_serializer_class(self):
        if self.action == "create":
            return (
                UniversityPayableCreateSerializer
            )

        return UniversityPayableSerializer

    def create(self, request, *args, **kwargs):
        if not CanManageFinance().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = (
            UniversityPayableCreateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        institution = get_object_or_404(
            Institution,
            pk=data["institution"],
        )

        admission = None

        if data.get("admission"):
            admission = get_object_or_404(
                Admission,
                pk=data["admission"],
            )

        try:
            payable = create_university_payable(
                institution=institution,
                admission=admission,
                description=data["description"],
                amount=data["amount"],
                payable_date=data["payable_date"],
                due_date=data.get("due_date"),
                created_by=request.user,
                notes=data.get("notes", ""),
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            UniversityPayableSerializer(
                payable
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def pay(self, request, pk=None):
        if not CanMakeFinancePayment().has_permission(
            request,
            self,
        ):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payable = self.get_object()

        serializer = (
            UniversityPaymentInputSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            payable = pay_university_payable(
                payable=payable,
                account=data["account"],
                amount=data["amount"],
                payment_method=(
                    data["payment_method"]
                ),
                reference_number=data.get(
                    "reference_number",
                    "",
                ),
                paid_by=request.user,
                paid_at=data.get("paid_at"),
                notes=data.get("notes", ""),
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            UniversityPayableSerializer(
                payable
            ).data
        )


# ================================================================
# SOURCE SYNCHRONIZATION
# ================================================================


class AdmissionPaymentSyncView(APIView):

    permission_classes = [
        CanManageFinance,
    ]

    def post(self, request, pk):
        serializer = FinanceSyncSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        payment = get_object_or_404(
            AdmissionPayment,
            pk=pk,
        )

        try:
            transaction = sync_admission_payment(
                admission_payment=payment,
                account=(
                    serializer.validated_data[
                        "account"
                    ]
                ),
                performed_by=request.user,
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            FinancialTransactionSerializer(
                transaction
            ).data
        )


class PayrollSyncView(APIView):

    permission_classes = [
        CanManageFinance,
    ]

    def post(self, request, pk):
        serializer = FinanceSyncSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        payroll = get_object_or_404(
            Payroll,
            pk=pk,
        )

        try:
            transaction = sync_paid_payroll(
                payroll=payroll,
                account=(
                    serializer.validated_data[
                        "account"
                    ]
                ),
                performed_by=request.user,
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            FinancialTransactionSerializer(
                transaction
            ).data
        )


class PartnerCommissionSyncView(APIView):

    permission_classes = [
        CanManageFinance,
    ]

    def post(self, request, pk):
        serializer = FinanceSyncSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        commission = get_object_or_404(
            CommissionTransaction,
            pk=pk,
        )

        try:
            transaction = (
                sync_paid_partner_commission(
                    commission=commission,
                    account=(
                        serializer.validated_data[
                            "account"
                        ]
                    ),
                    performed_by=request.user,
                )
            )

        except DjangoValidationError as exc:
            return validation_error_response(exc)

        return Response(
            FinancialTransactionSerializer(
                transaction
            ).data
        )


# ================================================================
# FINANCE REPORTS
# ================================================================


class FinanceSummaryView(APIView):

    permission_classes = [
        HasFinanceAccess,
    ]

    def get(self, request):
        start_date = request.query_params.get(
            "start_date"
        )
        end_date = request.query_params.get(
            "end_date"
        )

        branch = None
        business_unit = None

        branch_id = request.query_params.get(
            "branch"
        )

        business_unit_id = (
            request.query_params.get(
                "business_unit"
            )
        )

        if branch_id:
            branch = get_object_or_404(
                Branch,
                pk=branch_id,
            )

        if business_unit_id:
            business_unit = get_object_or_404(
                BusinessUnit,
                pk=business_unit_id,
            )

        from datetime import date

        try:
            if start_date:
                start_date = date.fromisoformat(
                    start_date
                )

            if end_date:
                end_date = date.fromisoformat(
                    end_date
                )

        except ValueError:
            return Response(
                {
                    "detail": (
                        "Dates must use YYYY-MM-DD."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = get_finance_summary(
            start_date=start_date,
            end_date=end_date,
            branch=branch,
            business_unit=business_unit,
        )

        return Response(result)


class OutstandingFinanceSummaryView(APIView):

    permission_classes = [
        HasFinanceAccess,
    ]

    def get(self, request):
        return Response(
            get_outstanding_finance_summary()
        )


class AdmissionFinancialSummaryView(APIView):

    permission_classes = [
        HasFinanceAccess,
    ]

    def get(self, request, pk):
        admission = get_object_or_404(
            Admission,
            pk=pk,
        )

        return Response(
            get_admission_financial_summary(
                admission
            )
        )


# ================================================================
# FINANCE AUDIT
# ================================================================


class FinanceActivityViewSet(
    viewsets.ReadOnlyModelViewSet
):

    permission_classes = [
        HasFinanceAccess,
    ]

    serializer_class = (
        FinanceActivitySerializer
    )

    queryset = (
        FinanceActivity.objects
        .select_related(
            "financial_transaction",
            "expense",
            "university_payable",
            "performed_by",
        )
        .all()
    )
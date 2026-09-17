
from decimal import Decimal
from rest_framework import serializers

from .models import (
    Expense,
    ExpensePayment,
    FinanceActivity,
    FinancialAccount,
    FinancialTransaction,
    TransactionCategory,
    UniversityPayable,
    UniversityPayment,
)


# ================================================================
# FINANCIAL ACCOUNT
# ================================================================


class FinancialAccountSerializer(
    serializers.ModelSerializer
):

    current_balance = serializers.SerializerMethodField()

    class Meta:
        model = FinancialAccount

        fields = [
            "id",
            "name",
            "code",
            "account_type",
            "business_unit",
            "branch",
            "bank_name",
            "account_number",
            "ifsc_code",
            "upi_id",
            "opening_balance",
            "opening_balance_date",
            "current_balance",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "current_balance",
            "created_at",
            "updated_at",
        ]

    def get_current_balance(self, obj):
        from .services import get_account_balance

        return get_account_balance(obj)


# ================================================================
# TRANSACTION CATEGORY
# ================================================================


class TransactionCategorySerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = TransactionCategory

        fields = [
            "id",
            "name",
            "code",
            "category_type",
            "description",
            "is_system",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "is_system",
            "created_at",
            "updated_at",
        ]


# ================================================================
# FINANCIAL TRANSACTION
# ================================================================


class FinancialTransactionSerializer(
    serializers.ModelSerializer
):

    account_name = serializers.CharField(
        source="account.name",
        read_only=True,
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    admission_number = serializers.CharField(
        source="admission.admission_id",
        read_only=True,
        allow_null=True,
    )

    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
        allow_null=True,
    )

    partner_number = serializers.CharField(
        source="partner.partner_id",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = FinancialTransaction

        fields = [
            "id",
            "transaction_number",
            "transaction_type",
            "account",
            "account_name",
            "category",
            "category_name",
            "amount",
            "transaction_date",
            "payment_method",
            "reference_number",
            "description",
            "status",
            "source_type",
            "business_unit",
            "branch",
            "admission",
            "admission_number",
            "institution",
            "institution_name",
            "partner",
            "partner_number",
            "admission_payment",
            "commission_transaction",
            "payroll",
            "created_by",
            "posted_by",
            "posted_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# ================================================================
# MANUAL TRANSACTION INPUT
# ================================================================


class ManualTransactionSerializer(
    serializers.Serializer
):

    account = serializers.PrimaryKeyRelatedField(
        queryset=FinancialAccount.objects.filter(
            is_active=True
        )
    )

    category = serializers.PrimaryKeyRelatedField(
        queryset=TransactionCategory.objects.filter(
            is_active=True
        )
    )

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    transaction_date = serializers.DateField()

    description = serializers.CharField()

    payment_method = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    reference_number = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    business_unit = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    branch = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


# ================================================================
# EXPENSE PAYMENT
# ================================================================


class ExpensePaymentSerializer(
    serializers.ModelSerializer
):

    account_name = serializers.CharField(
        source="account.name",
        read_only=True,
    )

    class Meta:
        model = ExpensePayment

        fields = [
            "id",
            "expense",
            "account",
            "account_name",
            "amount",
            "paid_at",
            "payment_method",
            "reference_number",
            "finance_transaction",
            "paid_by",
            "notes",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# EXPENSE
# ================================================================


class ExpenseSerializer(
    serializers.ModelSerializer
):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    outstanding_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    payments = ExpensePaymentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Expense

        fields = [
            "id",
            "expense_number",
            "category",
            "category_name",
            "business_unit",
            "branch",
            "vendor_name",
            "description",
            "bill_number",
            "bill_date",
            "expense_date",
            "due_date",
            "amount",
            "paid_amount",
            "outstanding_amount",
            "status",
            "requested_by",
            "approved_by",
            "approved_at",
            "notes",
            "payments",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "expense_number",
            "paid_amount",
            "outstanding_amount",
            "status",
            "requested_by",
            "approved_by",
            "approved_at",
            "payments",
            "created_at",
            "updated_at",
        ]


class ExpenseCreateSerializer(
    serializers.Serializer
):

    category = serializers.PrimaryKeyRelatedField(
        queryset=TransactionCategory.objects.filter(
            is_active=True,
            category_type=(
                TransactionCategory.CategoryType.EXPENSE
            ),
        )
    )

    description = serializers.CharField()

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    expense_date = serializers.DateField()

    vendor_name = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    bill_number = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    bill_date = serializers.DateField(
        required=False,
        allow_null=True,
    )

    due_date = serializers.DateField(
        required=False,
        allow_null=True,
    )

    business_unit = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    branch = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class ExpensePaymentInputSerializer(
    serializers.Serializer
):

    account = serializers.PrimaryKeyRelatedField(
        queryset=FinancialAccount.objects.filter(
            is_active=True
        )
    )

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    payment_method = serializers.CharField()

    reference_number = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    paid_at = serializers.DateTimeField(
        required=False,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ================================================================
# UNIVERSITY PAYMENT
# ================================================================


class UniversityPaymentSerializer(
    serializers.ModelSerializer
):

    account_name = serializers.CharField(
        source="account.name",
        read_only=True,
    )

    class Meta:
        model = UniversityPayment

        fields = [
            "id",
            "payable",
            "account",
            "account_name",
            "amount",
            "paid_at",
            "payment_method",
            "reference_number",
            "finance_transaction",
            "paid_by",
            "notes",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# UNIVERSITY PAYABLE
# ================================================================


class UniversityPayableSerializer(
    serializers.ModelSerializer
):

    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )

    admission_number = serializers.CharField(
        source="admission.admission_id",
        read_only=True,
        allow_null=True,
    )

    outstanding_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    payments = UniversityPaymentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = UniversityPayable

        fields = [
            "id",
            "payable_number",
            "institution",
            "institution_name",
            "admission",
            "admission_number",
            "description",
            "amount",
            "paid_amount",
            "outstanding_amount",
            "payable_date",
            "due_date",
            "status",
            "created_by",
            "notes",
            "payments",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "payable_number",
            "paid_amount",
            "outstanding_amount",
            "status",
            "created_by",
            "payments",
            "created_at",
            "updated_at",
        ]


class UniversityPayableCreateSerializer(
    serializers.Serializer
):

    institution = serializers.UUIDField()

    admission = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    description = serializers.CharField()

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    payable_date = serializers.DateField()

    due_date = serializers.DateField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class UniversityPaymentInputSerializer(
    serializers.Serializer
):

    account = serializers.PrimaryKeyRelatedField(
        queryset=FinancialAccount.objects.filter(
            is_active=True
        )
    )

    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    payment_method = serializers.CharField()

    reference_number = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    paid_at = serializers.DateTimeField(
        required=False,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ================================================================
# SOURCE SYNCHRONIZATION
# ================================================================


class FinanceSyncSerializer(
    serializers.Serializer
):

    account = serializers.PrimaryKeyRelatedField(
        queryset=FinancialAccount.objects.filter(
            is_active=True
        )
    )


# ================================================================
# FINANCE ACTIVITY
# ================================================================


class FinanceActivitySerializer(
    serializers.ModelSerializer
):

    performed_by_email = serializers.EmailField(
        source="performed_by.email",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = FinanceActivity

        fields = [
            "id",
            "activity_type",
            "financial_transaction",
            "expense",
            "university_payable",
            "description",
            "performed_by",
            "performed_by_email",
            "created_at",
        ]

        read_only_fields = fields
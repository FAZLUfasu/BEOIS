import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


# ================================================================
# FINANCIAL ACCOUNT
# ================================================================


class FinancialAccount(models.Model):

    class AccountType(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank"
        UPI = "UPI", "UPI"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=150,
        unique=True,
    )

    code = models.CharField(
        max_length=30,
        unique=True,
    )

    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
    )

    business_unit = models.ForeignKey(
        "organization.BusinessUnit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_accounts",
    )

    branch = models.ForeignKey(
        "organization.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_accounts",
    )

    bank_name = models.CharField(
        max_length=150,
        blank=True,
    )

    account_number = models.CharField(
        max_length=100,
        blank=True,
    )

    ifsc_code = models.CharField(
        max_length=30,
        blank=True,
    )

    upi_id = models.CharField(
        max_length=150,
        blank=True,
    )

    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    opening_balance_date = models.DateField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(
                fields=["account_type", "is_active"],
                name="fin_account_type_idx",
            ),
            models.Index(
                fields=["branch", "is_active"],
                name="fin_account_branch_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if (
            self.branch_id
            and self.business_unit_id
            and self.branch.business_unit_id != self.business_unit_id
        ):
            raise ValidationError(
                {
                    "branch": (
                        "Selected branch does not belong "
                        "to the selected business unit."
                    )
                }
            )

    def __str__(self):
        return f"{self.code} - {self.name}"


# ================================================================
# TRANSACTION CATEGORY
# ================================================================


class TransactionCategory(models.Model):

    class CategoryType(models.TextChoices):
        INCOME = "INCOME", "Income"
        EXPENSE = "EXPENSE", "Expense"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=150,
    )

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    category_type = models.CharField(
        max_length=20,
        choices=CategoryType.choices,
    )

    description = models.TextField(
        blank=True,
    )

    is_system = models.BooleanField(
        default=False,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "category_type",
            "name",
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


# ================================================================
# FINANCIAL TRANSACTION
# ================================================================


class FinancialTransaction(models.Model):

    class TransactionType(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        DEBIT = "DEBIT", "Debit"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        CANCELLED = "CANCELLED", "Cancelled"

    class SourceType(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        ADMISSION_PAYMENT = (
            "ADMISSION_PAYMENT",
            "Admission Payment",
        )
        UNIVERSITY_PAYMENT = (
            "UNIVERSITY_PAYMENT",
            "University Payment",
        )
        PARTNER_COMMISSION = (
            "PARTNER_COMMISSION",
            "Partner Commission",
        )
        PAYROLL = "PAYROLL", "Payroll"
        EXPENSE = "EXPENSE", "Operational Expense"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    transaction_number = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices,
    )

    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.PROTECT,
        related_name="transactions",
    )

    category = models.ForeignKey(
        TransactionCategory,
        on_delete=models.PROTECT,
        related_name="transactions",
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    transaction_date = models.DateField()

    payment_method = models.CharField(
        max_length=50,
        blank=True,
    )

    reference_number = models.CharField(
        max_length=150,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    source_type = models.CharField(
        max_length=30,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
    )

    # ------------------------------------------------------------
    # ORGANIZATION DIMENSIONS
    # ------------------------------------------------------------

    business_unit = models.ForeignKey(
        "organization.BusinessUnit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )

    branch = models.ForeignKey(
        "organization.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )

    # ------------------------------------------------------------
    # BUSINESS DIMENSIONS
    # ------------------------------------------------------------

    admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )

    institution = models.ForeignKey(
        "admissions.Institution",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )

    partner = models.ForeignKey(
        "partners.Partner",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )

    # ------------------------------------------------------------
    # SOURCE LINKS
    #
    # One-to-one source links prevent the same business event
    # from being posted twice into Finance.
    # ------------------------------------------------------------

    admission_payment = models.OneToOneField(
        "admissions.AdmissionPayment",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="finance_transaction",
    )

    commission_transaction = models.OneToOneField(
        "partners.CommissionTransaction",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="finance_transaction",
    )

    payroll = models.OneToOneField(
        "hr.Payroll",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="finance_transaction",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_transactions_created",
    )

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_transactions_posted",
    )

    posted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-transaction_date",
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "transaction_date",
                    "transaction_type",
                ],
                name="fin_txn_date_type_idx",
            ),
            models.Index(
                fields=["account", "status"],
                name="fin_txn_account_idx",
            ),
            models.Index(
                fields=["source_type", "status"],
                name="fin_txn_source_idx",
            ),
            models.Index(
                fields=["branch", "transaction_date"],
                name="fin_txn_branch_idx",
            ),
            models.Index(
                fields=["admission", "transaction_date"],
                name="fin_txn_admission_idx",
            ),
            models.Index(
                fields=["partner", "transaction_date"],
                name="fin_txn_partner_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if self.amount is not None and self.amount <= 0:
            raise ValidationError(
                {"amount": "Transaction amount must be greater than zero."}
            )

        if self.category_id:
            if (
                self.transaction_type == self.TransactionType.CREDIT
                and self.category.category_type
                != TransactionCategory.CategoryType.INCOME
            ):
                raise ValidationError(
                    {
                        "category": (
                            "Credit transactions require "
                            "an income category."
                        )
                    }
                )

            if (
                self.transaction_type == self.TransactionType.DEBIT
                and self.category.category_type
                != TransactionCategory.CategoryType.EXPENSE
            ):
                raise ValidationError(
                    {
                        "category": (
                            "Debit transactions require "
                            "an expense category."
                        )
                    }
                )

        if (
            self.branch_id
            and self.business_unit_id
            and self.branch.business_unit_id != self.business_unit_id
        ):
            raise ValidationError(
                {
                    "branch": (
                        "Selected branch does not belong "
                        "to the selected business unit."
                    )
                }
            )

        source_links = [
            self.admission_payment_id,
            self.commission_transaction_id,
            self.payroll_id,
        ]

        linked_sources = sum(
            1 for value in source_links if value
        )

        if linked_sources > 1:
            raise ValidationError(
                "A finance transaction can have only one primary source record."
            )

    def __str__(self):
        number = self.transaction_number or "UNNUMBERED"
        return (
            f"{number} - "
            f"{self.get_transaction_type_display()} "
            f"₹{self.amount}"
        )


# ================================================================
# OPERATIONAL EXPENSE
# ================================================================


class Expense(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        PARTIALLY_PAID = (
            "PARTIALLY_PAID",
            "Partially Paid",
        )
        PAID = "PAID", "Paid"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    expense_number = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
    )

    category = models.ForeignKey(
        TransactionCategory,
        on_delete=models.PROTECT,
        related_name="expenses",
    )

    business_unit = models.ForeignKey(
        "organization.BusinessUnit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
    )

    branch = models.ForeignKey(
        "organization.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
    )

    vendor_name = models.CharField(
        max_length=200,
        blank=True,
    )

    description = models.TextField()

    bill_number = models.CharField(
        max_length=100,
        blank=True,
    )

    bill_date = models.DateField(
        null=True,
        blank=True,
    )

    expense_date = models.DateField()

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_expenses_requested",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_expenses_approved",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-expense_date",
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=["status", "expense_date"],
                name="fin_exp_status_idx",
            ),
            models.Index(
                fields=["branch", "expense_date"],
                name="fin_exp_branch_idx",
            ),
            models.Index(
                fields=["due_date", "status"],
                name="fin_exp_due_idx",
            ),
        ]

    @property
    def outstanding_amount(self):
        return max(
            self.amount - self.paid_amount,
            Decimal("0.00"),
        )

    def clean(self):
        super().clean()

        if self.amount is not None and self.amount <= 0:
            raise ValidationError(
                {"amount": "Expense amount must be greater than zero."}
            )

        if self.paid_amount is not None and self.paid_amount < 0:
            raise ValidationError(
                {"paid_amount": "Paid amount cannot be negative."}
            )

        if (
            self.amount is not None
            and self.paid_amount is not None
            and self.paid_amount > self.amount
        ):
            raise ValidationError(
                {
                    "paid_amount": (
                        "Paid amount cannot exceed "
                        "the expense amount."
                    )
                }
            )

        if (
            self.category_id
            and self.category.category_type
            != TransactionCategory.CategoryType.EXPENSE
        ):
            raise ValidationError(
                {
                    "category": (
                        "Operational expenses require "
                        "an expense category."
                    )
                }
            )

        if (
            self.branch_id
            and self.business_unit_id
            and self.branch.business_unit_id != self.business_unit_id
        ):
            raise ValidationError(
                {
                    "branch": (
                        "Selected branch does not belong "
                        "to the selected business unit."
                    )
                }
            )

    def __str__(self):
        number = self.expense_number or "UNNUMBERED"
        return f"{number} - ₹{self.amount}"


# ================================================================
# EXPENSE PAYMENT
# ================================================================


class ExpensePayment(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    expense = models.ForeignKey(
        Expense,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.PROTECT,
        related_name="expense_payments",
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    paid_at = models.DateTimeField()

    payment_method = models.CharField(
        max_length=50,
    )

    reference_number = models.CharField(
        max_length=150,
        blank=True,
    )

    finance_transaction = models.OneToOneField(
        FinancialTransaction,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expense_payment",
    )

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_expense_payments",
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-paid_at"]

    def clean(self):
        super().clean()

        if self.amount is not None and self.amount <= 0:
            raise ValidationError(
                {"amount": "Payment amount must be greater than zero."}
            )

    def __str__(self):
        return f"{self.expense} - ₹{self.amount}"


# ================================================================
# UNIVERSITY PAYABLE
# ================================================================


class UniversityPayable(models.Model):

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PARTIALLY_PAID = (
            "PARTIALLY_PAID",
            "Partially Paid",
        )
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    payable_number = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
    )

    institution = models.ForeignKey(
        "admissions.Institution",
        on_delete=models.PROTECT,
        related_name="finance_payables",
    )

    admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="university_payables",
    )

    description = models.CharField(
        max_length=250,
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    payable_date = models.DateField()

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="university_payables_created",
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-payable_date",
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=["institution", "status"],
                name="fin_univ_inst_idx",
            ),
            models.Index(
                fields=["admission", "status"],
                name="fin_univ_adm_idx",
            ),
            models.Index(
                fields=["due_date", "status"],
                name="fin_univ_due_idx",
            ),
        ]

    @property
    def outstanding_amount(self):
        return max(
            self.amount - self.paid_amount,
            Decimal("0.00"),
        )

    def clean(self):
        super().clean()

        if self.amount is not None and self.amount <= 0:
            raise ValidationError(
                {"amount": "Payable amount must be greater than zero."}
            )

        if self.paid_amount is not None and self.paid_amount < 0:
            raise ValidationError(
                {"paid_amount": "Paid amount cannot be negative."}
            )

        if (
            self.amount is not None
            and self.paid_amount is not None
            and self.paid_amount > self.amount
        ):
            raise ValidationError(
                {
                    "paid_amount": (
                        "Paid amount cannot exceed "
                        "the university payable amount."
                    )
                }
            )

        if (
            self.admission_id
            and self.admission.institution_id
            != self.institution_id
        ):
            raise ValidationError(
                {
                    "institution": (
                        "Institution must match the "
                        "admission institution."
                    )
                }
            )

    def __str__(self):
        number = self.payable_number or "UNNUMBERED"
        return (
            f"{number} - {self.institution} - "
            f"₹{self.amount}"
        )


# ================================================================
# UNIVERSITY PAYMENT
# ================================================================


class UniversityPayment(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    payable = models.ForeignKey(
        UniversityPayable,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.PROTECT,
        related_name="university_payments",
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    paid_at = models.DateTimeField()

    payment_method = models.CharField(
        max_length=50,
    )

    reference_number = models.CharField(
        max_length=150,
        blank=True,
    )

    finance_transaction = models.OneToOneField(
        FinancialTransaction,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="university_payment",
    )

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="university_payments_made",
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-paid_at"]

    def clean(self):
        super().clean()

        if self.amount is not None and self.amount <= 0:
            raise ValidationError(
                {"amount": "Payment amount must be greater than zero."}
            )

    def __str__(self):
        return (
            f"{self.payable.payable_number or self.payable_id} "
            f"- ₹{self.amount}"
        )


# ================================================================
# FINANCE ACTIVITY / AUDIT
# ================================================================


class FinanceActivity(models.Model):

    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Created"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        POSTED = "POSTED", "Posted"
        PAYMENT = "PAYMENT", "Payment"
        PARTIAL_PAYMENT = (
            "PARTIAL_PAYMENT",
            "Partial Payment",
        )
        CANCELLED = "CANCELLED", "Cancelled"
        REJECTED = "REJECTED", "Rejected"
        NOTE = "NOTE", "Note"
        SYNC = "SYNC", "Source Sync"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
    )

    financial_transaction = models.ForeignKey(
        FinancialTransaction,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activities",
    )

    expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activities",
    )

    university_payable = models.ForeignKey(
        UniversityPayable,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activities",
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_activities",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=[
                    "financial_transaction",
                    "created_at",
                ],
                name="fin_act_txn_idx",
            ),
            models.Index(
                fields=["expense", "created_at"],
                name="fin_act_exp_idx",
            ),
            models.Index(
                fields=[
                    "university_payable",
                    "created_at",
                ],
                name="fin_act_univ_idx",
            ),
        ]

    def clean(self):
        super().clean()

        linked_objects = [
            self.financial_transaction_id,
            self.expense_id,
            self.university_payable_id,
        ]

        if sum(1 for value in linked_objects if value) != 1:
            raise ValidationError(
                (
                    "Finance activity must belong to exactly "
                    "one finance record."
                )
            )

    def __str__(self):
        return (
            f"{self.get_activity_type_display()} "
            f"- {self.created_at}"
        )
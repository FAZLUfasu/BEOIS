from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from admissions.models import Admission, AdmissionPayment
from hr.models import Payroll
from partners.models import CommissionTransaction

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

from .task_integration import (
    sync_expense_task,
    sync_university_payable_task,
)


ZERO = Decimal("0.00")


# ================================================================
# MONEY / NUMBER HELPERS
# ================================================================


def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _next_number(model, field_name, prefix):
    """
    Generate human-readable sequential numbers.

    Examples:
        FT-000001
        EXP-000001
        UP-000001
    """

    with transaction.atomic():
        values = (
            model.objects.select_for_update()
            .exclude(**{field_name: ""})
            .values_list(field_name, flat=True)
        )

        maximum = 0

        for value in values:
            if not value:
                continue

            try:
                number = int(str(value).split("-")[-1])
                maximum = max(maximum, number)
            except (ValueError, TypeError):
                continue

        return f"{prefix}-{maximum + 1:06d}"


def _transaction_number():
    return _next_number(
        FinancialTransaction,
        "transaction_number",
        "FT",
    )


def _expense_number():
    return _next_number(
        Expense,
        "expense_number",
        "EXP",
    )


def _payable_number():
    return _next_number(
        UniversityPayable,
        "payable_number",
        "UP",
    )


# ================================================================
# AUDIT
# ================================================================


def _log_finance_activity(
    activity_type,
    description,
    performed_by=None,
    financial_transaction=None,
    expense=None,
    university_payable=None,
):
    activity = FinanceActivity(
        activity_type=activity_type,
        description=description,
        performed_by=performed_by,
        financial_transaction=financial_transaction,
        expense=expense,
        university_payable=university_payable,
    )

    activity.full_clean()
    activity.save()

    return activity


# ================================================================
# SYSTEM CATEGORIES
# ================================================================


SYSTEM_CATEGORIES = [
    (
        "STUDENT_FEE",
        "Student Fee Collection",
        TransactionCategory.CategoryType.INCOME,
    ),
    (
        "OTHER_INCOME",
        "Other Income",
        TransactionCategory.CategoryType.INCOME,
    ),
    (
        "SALARY",
        "Salary & Payroll",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "PARTNER_COMMISSION",
        "Partner Commission",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "UNIVERSITY_PAYMENT",
        "University Payment",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "RENT",
        "Rent",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "MARKETING",
        "Marketing & Advertising",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "UTILITIES",
        "Utilities",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "OFFICE_EXPENSE",
        "Office Expense",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "TRAVEL",
        "Travel Expense",
        TransactionCategory.CategoryType.EXPENSE,
    ),
    (
        "OTHER_EXPENSE",
        "Other Expense",
        TransactionCategory.CategoryType.EXPENSE,
    ),
]


@transaction.atomic
def initialize_finance_categories():
    created_categories = []

    for code, name, category_type in SYSTEM_CATEGORIES:
        category, _ = TransactionCategory.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "category_type": category_type,
                "is_system": True,
                "is_active": True,
            },
        )

        created_categories.append(category)

    return created_categories


def get_category(code):
    try:
        return TransactionCategory.objects.get(
            code=code,
            is_active=True,
        )
    except TransactionCategory.DoesNotExist:
        raise ValidationError(
            f"Finance category '{code}' does not exist."
        )


# ================================================================
# FINANCIAL ACCOUNTS
# ================================================================


@transaction.atomic
def create_financial_account(
    name,
    code,
    account_type,
    opening_balance=0,
    opening_balance_date=None,
    business_unit=None,
    branch=None,
    bank_name="",
    account_number="",
    ifsc_code="",
    upi_id="",
    notes="",
):
    account = FinancialAccount(
        name=name.strip(),
        code=code.strip().upper(),
        account_type=account_type,
        opening_balance=_money(opening_balance),
        opening_balance_date=opening_balance_date,
        business_unit=business_unit,
        branch=branch,
        bank_name=bank_name.strip(),
        account_number=account_number.strip(),
        ifsc_code=ifsc_code.strip(),
        upi_id=upi_id.strip(),
        notes=notes.strip(),
        is_active=True,
    )

    account.full_clean()
    account.save()

    return account


def get_account_balance(account, as_of_date=None):
    transactions = account.transactions.filter(
        status=FinancialTransaction.Status.POSTED
    )

    if as_of_date:
        transactions = transactions.filter(
            transaction_date__lte=as_of_date
        )

    credits = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.CREDIT
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    debits = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.DEBIT
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    return _money(
        account.opening_balance + credits - debits
    )


# ================================================================
# GENERIC FINANCIAL TRANSACTION
# ================================================================


@transaction.atomic
def create_financial_transaction(
    transaction_type,
    account,
    category,
    amount,
    transaction_date,
    payment_method="",
    reference_number="",
    description="",
    source_type=FinancialTransaction.SourceType.MANUAL,
    business_unit=None,
    branch=None,
    admission=None,
    institution=None,
    partner=None,
    admission_payment=None,
    commission_transaction=None,
    payroll=None,
    created_by=None,
    auto_post=False,
):
    if not account.is_active:
        raise ValidationError(
            "Selected financial account is inactive."
        )

    amount = _money(amount)

    if amount <= 0:
        raise ValidationError(
            "Transaction amount must be greater than zero."
        )

    finance_transaction = FinancialTransaction(
        transaction_number=_transaction_number(),
        transaction_type=transaction_type,
        account=account,
        category=category,
        amount=amount,
        transaction_date=transaction_date,
        payment_method=payment_method.strip(),
        reference_number=reference_number.strip(),
        description=description.strip(),
        status=FinancialTransaction.Status.DRAFT,
        source_type=source_type,
        business_unit=business_unit,
        branch=branch,
        admission=admission,
        institution=institution,
        partner=partner,
        admission_payment=admission_payment,
        commission_transaction=commission_transaction,
        payroll=payroll,
        created_by=created_by,
    )

    finance_transaction.full_clean()
    finance_transaction.save()

    _log_finance_activity(
        FinanceActivity.ActivityType.CREATED,
        (
            f"Finance transaction "
            f"{finance_transaction.transaction_number} created."
        ),
        performed_by=created_by,
        financial_transaction=finance_transaction,
    )

    if auto_post:
        post_financial_transaction(
            finance_transaction,
            posted_by=created_by,
        )

    return finance_transaction


@transaction.atomic
def post_financial_transaction(
    finance_transaction,
    posted_by=None,
):
    finance_transaction = (
        FinancialTransaction.objects.select_for_update()
        .get(pk=finance_transaction.pk)
    )

    if finance_transaction.status == (
        FinancialTransaction.Status.POSTED
    ):
        return finance_transaction

    if finance_transaction.status == (
        FinancialTransaction.Status.CANCELLED
    ):
        raise ValidationError(
            "Cancelled transactions cannot be posted."
        )

    finance_transaction.status = (
        FinancialTransaction.Status.POSTED
    )
    finance_transaction.posted_by = posted_by
    finance_transaction.posted_at = timezone.now()

    finance_transaction.full_clean()
    finance_transaction.save()

    _log_finance_activity(
        FinanceActivity.ActivityType.POSTED,
        (
            f"{finance_transaction.transaction_number} posted "
            f"for Ã¢â€šÂ¹{finance_transaction.amount}."
        ),
        performed_by=posted_by,
        financial_transaction=finance_transaction,
    )

    return finance_transaction


# ================================================================
# ADMISSION PAYMENT Ã¢â€ â€™ FINANCE
# ================================================================


@transaction.atomic
def sync_admission_payment(
    admission_payment,
    account,
    performed_by=None,
):
    existing = FinancialTransaction.objects.filter(
        admission_payment=admission_payment
    ).first()

    if existing:
        return existing

    admission = admission_payment.admission

    category = get_category("STUDENT_FEE")

    transaction_date = (
        admission_payment.paid_at.date()
        if admission_payment.paid_at
        else timezone.localdate()
    )

    return create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.CREDIT,
        account=account,
        category=category,
        amount=admission_payment.amount,
        transaction_date=transaction_date,
        payment_method=admission_payment.payment_method,
        reference_number=(
            admission_payment.reference_number
            or admission_payment.receipt_number
        ),
        description=(
            f"Student fee received - "
            f"{admission.admission_id} - "
            f"{admission.applicant_name}"
        ),
        source_type=(
            FinancialTransaction.SourceType.ADMISSION_PAYMENT
        ),
        admission=admission,
        institution=admission.institution,
        partner=admission.partner,
        admission_payment=admission_payment,
        created_by=performed_by,
        auto_post=True,
    )


# ================================================================
# PAYROLL Ã¢â€ â€™ FINANCE
# ================================================================


@transaction.atomic
def sync_paid_payroll(
    payroll,
    account,
    performed_by=None,
):
    payroll = Payroll.objects.select_related(
        "employee",
        "period",
    ).get(pk=payroll.pk)

    if payroll.status != Payroll.Status.PAID:
        raise ValidationError(
            "Only PAID payroll can be posted to Finance."
        )

    existing = FinancialTransaction.objects.filter(
        payroll=payroll
    ).first()

    if existing:
        return existing

    category = get_category("SALARY")

    transaction_date = (
        payroll.paid_at.date()
        if payroll.paid_at
        else timezone.localdate()
    )

    branch = payroll.employee.branch

    business_unit = (
        branch.business_unit
        if branch
        else None
    )

    return create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.DEBIT,
        account=account,
        category=category,
        amount=payroll.net_salary,
        transaction_date=transaction_date,
        payment_method=payroll.payment_method,
        reference_number=payroll.payment_reference,
        description=(
            f"Salary payment - "
            f"{payroll.employee.employee_id} - "
            f"{payroll.employee.employee_name} - "
            f"{payroll.period}"
        ),
        source_type=FinancialTransaction.SourceType.PAYROLL,
        business_unit=business_unit,
        branch=branch,
        payroll=payroll,
        created_by=performed_by,
        auto_post=True,
    )


# ================================================================
# PARTNER COMMISSION Ã¢â€ â€™ FINANCE
# ================================================================


@transaction.atomic
def sync_paid_partner_commission(
    commission,
    account,
    performed_by=None,
):
    commission = CommissionTransaction.objects.select_related(
        "partner",
        "admission",
    ).get(pk=commission.pk)

    if commission.status != CommissionTransaction.Status.PAID:
        raise ValidationError(
            "Only PAID partner commission can be posted to Finance."
        )

    existing = FinancialTransaction.objects.filter(
        commission_transaction=commission
    ).first()

    if existing:
        return existing

    category = get_category(
        "PARTNER_COMMISSION"
    )

    transaction_date = (
        commission.paid_at.date()
        if commission.paid_at
        else timezone.localdate()
    )

    admission = commission.admission

    return create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.DEBIT,
        account=account,
        category=category,
        amount=commission.commission_amount,
        transaction_date=transaction_date,
        reference_number=commission.payment_reference,
        description=(
            f"Partner commission - "
            f"{commission.partner.partner_id} - "
            f"{commission.partner.name}"
        ),
        source_type=(
            FinancialTransaction.SourceType.PARTNER_COMMISSION
        ),
        admission=admission,
        institution=(
            admission.institution
            if admission
            else None
        ),
        partner=commission.partner,
        commission_transaction=commission,
        created_by=performed_by,
        auto_post=True,
    )


# ================================================================
# OPERATIONAL EXPENSE
# ================================================================


@transaction.atomic
def create_expense(
    category,
    description,
    amount,
    expense_date,
    vendor_name="",
    bill_number="",
    bill_date=None,
    due_date=None,
    business_unit=None,
    branch=None,
    requested_by=None,
    notes="",
):
    if category.category_type != (
        TransactionCategory.CategoryType.EXPENSE
    ):
        raise ValidationError(
            "Expense requires an expense category."
        )

    expense = Expense(
        expense_number=_expense_number(),
        category=category,
        business_unit=business_unit,
        branch=branch,
        vendor_name=vendor_name.strip(),
        description=description.strip(),
        bill_number=bill_number.strip(),
        bill_date=bill_date,
        expense_date=expense_date,
        due_date=due_date,
        amount=_money(amount),
        paid_amount=ZERO,
        status=Expense.Status.DRAFT,
        requested_by=requested_by,
        notes=notes.strip(),
    )

    expense.full_clean()
    expense.save()

    _log_finance_activity(
        FinanceActivity.ActivityType.CREATED,
        (
            f"Expense {expense.expense_number} "
            f"created for Ã¢â€šÂ¹{expense.amount}."
        ),
        performed_by=requested_by,
        expense=expense,
    )

    return expense


@transaction.atomic
def submit_expense(
    expense,
    performed_by=None,
):
    if expense.status != Expense.Status.DRAFT:
        raise ValidationError(
            "Only DRAFT expenses can be submitted."
        )

    expense.status = Expense.Status.SUBMITTED
    expense.save(update_fields=[
        "status",
        "updated_at",
    ])

    _log_finance_activity(
        FinanceActivity.ActivityType.SUBMITTED,
        f"{expense.expense_number} submitted.",
        performed_by=performed_by,
        expense=expense,
    )

    return expense


@transaction.atomic
def approve_expense(
    expense,
    approved_by=None,
):
    expense = Expense.objects.select_for_update().get(
        pk=expense.pk
    )

    if expense.status != Expense.Status.SUBMITTED:
        raise ValidationError(
            "Only SUBMITTED expenses can be approved."
        )

    expense.status = Expense.Status.APPROVED
    expense.approved_by = approved_by
    expense.approved_at = timezone.now()

    expense.full_clean()
    expense.save()

    _log_finance_activity(
        FinanceActivity.ActivityType.APPROVED,
        f"{expense.expense_number} approved.",
        performed_by=approved_by,
        expense=expense,
    )

    return expense


@transaction.atomic
def pay_expense(
    expense,
    account,
    amount,
    payment_method,
    reference_number="",
    paid_by=None,
    paid_at=None,
    notes="",
):
    expense = Expense.objects.select_for_update().get(
        pk=expense.pk
    )

    if expense.status not in [
        Expense.Status.APPROVED,
        Expense.Status.PARTIALLY_PAID,
    ]:
        raise ValidationError(
            "Only approved expenses can be paid."
        )

    amount = _money(amount)

    if amount <= 0:
        raise ValidationError(
            "Payment amount must be greater than zero."
        )

    if amount > expense.outstanding_amount:
        raise ValidationError(
            "Payment exceeds the outstanding expense amount."
        )

    paid_at = paid_at or timezone.now()

    finance_transaction = create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.DEBIT,
        account=account,
        category=expense.category,
        amount=amount,
        transaction_date=paid_at.date(),
        payment_method=payment_method,
        reference_number=reference_number,
        description=(
            f"Expense payment - "
            f"{expense.expense_number} - "
            f"{expense.description}"
        ),
        source_type=FinancialTransaction.SourceType.EXPENSE,
        business_unit=expense.business_unit,
        branch=expense.branch,
        created_by=paid_by,
        auto_post=True,
    )

    ExpensePayment.objects.create(
        expense=expense,
        account=account,
        amount=amount,
        paid_at=paid_at,
        payment_method=payment_method,
        reference_number=reference_number,
        finance_transaction=finance_transaction,
        paid_by=paid_by,
        notes=notes,
    )

    expense.paid_amount = _money(
        expense.paid_amount + amount
    )

    if expense.paid_amount >= expense.amount:
        expense.status = Expense.Status.PAID
        activity_type = FinanceActivity.ActivityType.PAYMENT
    else:
        expense.status = Expense.Status.PARTIALLY_PAID
        activity_type = (
            FinanceActivity.ActivityType.PARTIAL_PAYMENT
        )

    expense.full_clean()
    expense.save()

    _log_finance_activity(
        activity_type,
        (
            f"Ã¢â€šÂ¹{amount} paid against "
            f"{expense.expense_number}. "
            f"Outstanding Ã¢â€šÂ¹{expense.outstanding_amount}."
        ),
        performed_by=paid_by,
        expense=expense,
    )

    sync_expense_task(expense, performed_by=paid_by)

    sync_expense_task(expense, performed_by=paid_by)

    return expense


# ================================================================
# UNIVERSITY PAYABLE
# ================================================================


@transaction.atomic
def create_university_payable(
    institution,
    description,
    amount,
    payable_date,
    admission=None,
    due_date=None,
    created_by=None,
    notes="",
):
    if (
        admission
        and admission.institution_id != institution.id
    ):
        raise ValidationError(
            "Admission institution does not match payable institution."
        )

    payable = UniversityPayable(
        payable_number=_payable_number(),
        institution=institution,
        admission=admission,
        description=description.strip(),
        amount=_money(amount),
        paid_amount=ZERO,
        payable_date=payable_date,
        due_date=due_date,
        status=UniversityPayable.Status.OPEN,
        created_by=created_by,
        notes=notes.strip(),
    )

    payable.full_clean()
    payable.save()

    _log_finance_activity(
        FinanceActivity.ActivityType.CREATED,
        (
            f"University payable "
            f"{payable.payable_number} created "
            f"for Ã¢â€šÂ¹{payable.amount}."
        ),
        performed_by=created_by,
        university_payable=payable,
    )

    return payable


@transaction.atomic
def pay_university_payable(
    payable,
    account,
    amount,
    payment_method,
    reference_number="",
    paid_by=None,
    paid_at=None,
    notes="",
):
    payable = UniversityPayable.objects.select_for_update().get(
        pk=payable.pk
    )

    if payable.status not in [
        UniversityPayable.Status.OPEN,
        UniversityPayable.Status.PARTIALLY_PAID,
    ]:
        raise ValidationError(
            "This university payable cannot be paid."
        )

    amount = _money(amount)

    if amount <= 0:
        raise ValidationError(
            "Payment amount must be greater than zero."
        )

    if amount > payable.outstanding_amount:
        raise ValidationError(
            "Payment exceeds university outstanding amount."
        )

    paid_at = paid_at or timezone.now()

    category = get_category(
        "UNIVERSITY_PAYMENT"
    )

    admission = payable.admission

    finance_transaction = create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.DEBIT,
        account=account,
        category=category,
        amount=amount,
        transaction_date=paid_at.date(),
        payment_method=payment_method,
        reference_number=reference_number,
        description=(
            f"University payment - "
            f"{payable.payable_number} - "
            f"{payable.institution.name}"
        ),
        source_type=(
            FinancialTransaction.SourceType.UNIVERSITY_PAYMENT
        ),
        admission=admission,
        institution=payable.institution,
        partner=(
            admission.partner
            if admission
            else None
        ),
        created_by=paid_by,
        auto_post=True,
    )

    UniversityPayment.objects.create(
        payable=payable,
        account=account,
        amount=amount,
        paid_at=paid_at,
        payment_method=payment_method,
        reference_number=reference_number,
        finance_transaction=finance_transaction,
        paid_by=paid_by,
        notes=notes,
    )

    payable.paid_amount = _money(
        payable.paid_amount + amount
    )

    if payable.paid_amount >= payable.amount:
        payable.status = UniversityPayable.Status.PAID
        activity_type = FinanceActivity.ActivityType.PAYMENT
    else:
        payable.status = (
            UniversityPayable.Status.PARTIALLY_PAID
        )
        activity_type = (
            FinanceActivity.ActivityType.PARTIAL_PAYMENT
        )

    payable.full_clean()
    payable.save()

    _log_finance_activity(
        activity_type,
        (
            f"Ã¢â€šÂ¹{amount} paid against "
            f"{payable.payable_number}. "
            f"Outstanding Ã¢â€šÂ¹{payable.outstanding_amount}."
        ),
        performed_by=paid_by,
        university_payable=payable,
    )

    sync_university_payable_task(payable, performed_by=paid_by)

    sync_university_payable_task(payable, performed_by=paid_by)

    return payable


# ================================================================
# MANUAL CREDIT / DEBIT
# ================================================================


def create_manual_income(
    account,
    category,
    amount,
    transaction_date,
    description,
    payment_method="",
    reference_number="",
    business_unit=None,
    branch=None,
    created_by=None,
):
    if category.category_type != (
        TransactionCategory.CategoryType.INCOME
    ):
        raise ValidationError(
            "Manual income requires an income category."
        )

    return create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.CREDIT,
        account=account,
        category=category,
        amount=amount,
        transaction_date=transaction_date,
        payment_method=payment_method,
        reference_number=reference_number,
        description=description,
        source_type=FinancialTransaction.SourceType.MANUAL,
        business_unit=business_unit,
        branch=branch,
        created_by=created_by,
        auto_post=True,
    )


def create_manual_expense_transaction(
    account,
    category,
    amount,
    transaction_date,
    description,
    payment_method="",
    reference_number="",
    business_unit=None,
    branch=None,
    created_by=None,
):
    if category.category_type != (
        TransactionCategory.CategoryType.EXPENSE
    ):
        raise ValidationError(
            "Manual debit requires an expense category."
        )

    return create_financial_transaction(
        transaction_type=FinancialTransaction.TransactionType.DEBIT,
        account=account,
        category=category,
        amount=amount,
        transaction_date=transaction_date,
        payment_method=payment_method,
        reference_number=reference_number,
        description=description,
        source_type=FinancialTransaction.SourceType.MANUAL,
        business_unit=business_unit,
        branch=branch,
        created_by=created_by,
        auto_post=True,
    )


# ================================================================
# FINANCE SUMMARY
# ================================================================


def get_finance_summary(
    start_date=None,
    end_date=None,
    branch=None,
    business_unit=None,
):
    transactions = FinancialTransaction.objects.filter(
        status=FinancialTransaction.Status.POSTED
    )

    if start_date:
        transactions = transactions.filter(
            transaction_date__gte=start_date
        )

    if end_date:
        transactions = transactions.filter(
            transaction_date__lte=end_date
        )

    if branch:
        transactions = transactions.filter(
            branch=branch
        )

    if business_unit:
        transactions = transactions.filter(
            business_unit=business_unit
        )

    income = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.CREDIT
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    expenses = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.DEBIT
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    return {
        "income": _money(income),
        "expenses": _money(expenses),
        "net": _money(income - expenses),
        "transactions": transactions.count(),
    }


# ================================================================
# OUTSTANDING SUMMARY
# ================================================================


def get_outstanding_finance_summary():
    university_payables = UniversityPayable.objects.exclude(
        status__in=[
            UniversityPayable.Status.PAID,
            UniversityPayable.Status.CANCELLED,
        ]
    )

    expenses = Expense.objects.exclude(
        status__in=[
            Expense.Status.PAID,
            Expense.Status.REJECTED,
            Expense.Status.CANCELLED,
        ]
    )

    university_outstanding = sum(
        (
            item.outstanding_amount
            for item in university_payables
        ),
        ZERO,
    )

    expense_outstanding = sum(
        (
            item.outstanding_amount
            for item in expenses
        ),
        ZERO,
    )

    return {
        "university_outstanding": _money(
            university_outstanding
        ),
        "operational_expense_outstanding": _money(
            expense_outstanding
        ),
        "total_outstanding": _money(
            university_outstanding
            + expense_outstanding
        ),
    }


# ================================================================
# ADMISSION FINANCIAL SUMMARY / CONTRIBUTION
# ================================================================


def get_admission_financial_summary(admission):
    transactions = FinancialTransaction.objects.filter(
        admission=admission,
        status=FinancialTransaction.Status.POSTED,
    )

    student_collections = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.CREDIT,
            source_type=FinancialTransaction.SourceType.ADMISSION_PAYMENT,
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    university_paid = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.DEBIT,
            source_type=FinancialTransaction.SourceType.UNIVERSITY_PAYMENT,
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    partner_commission = (
        transactions.filter(
            transaction_type=FinancialTransaction.TransactionType.DEBIT,
            source_type=FinancialTransaction.SourceType.PARTNER_COMMISSION,
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    direct_costs = (
        university_paid
        + partner_commission
    )

    contribution = (
        student_collections
        - direct_costs
    )

    university_payables = admission.university_payables.exclude(
        status=UniversityPayable.Status.CANCELLED
    )

    university_liability = sum(
        (
            item.amount
            for item in university_payables
        ),
        ZERO,
    )

    university_outstanding = sum(
        (
            item.outstanding_amount
            for item in university_payables
        ),
        ZERO,
    )

    return {
        "admission_id": admission.admission_id,
        "student": admission.applicant_name,
        "student_collections": _money(
            student_collections
        ),
        "university_paid": _money(
            university_paid
        ),
        "university_liability": _money(
            university_liability
        ),
        "university_outstanding": _money(
            university_outstanding
        ),
        "partner_commission_paid": _money(
            partner_commission
        ),
        "realized_direct_costs": _money(
            direct_costs
        ),
        "realized_contribution": _money(
            contribution
        ),
    }

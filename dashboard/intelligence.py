from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from leads.models import Lead, CallLog
from admissions.models import (
    Admission,
    AdmissionFee,
    AdmissionPayment,
)
from students.models import StudentProcess
from partners.models import (
    PartnerCase,
    PartnerIssue,
    CommissionTransaction,
)
from hr.models import Payroll
from finance.models import (
    FinancialTransaction,
    Expense,
    UniversityPayable,
)

from dashboard.selectors import (
    get_scoped_leads,
    get_scoped_calls,
    get_scoped_admissions,
    get_scoped_students,
    get_scoped_student_processes,
    get_scoped_partners,
    get_scoped_partner_cases,
    get_scoped_partner_issues,
    get_scoped_employees,
    get_scoped_payroll,
    get_scoped_financial_transactions,
    get_scoped_expenses,
)


ZERO = Decimal("0.00")


# ============================================================
# COMMON HELPERS
# ============================================================


def _sum(queryset, field):
    value = queryset.aggregate(
        total=Sum(field)
    )["total"]

    return value or ZERO


def _percentage(part, total):
    if not total:
        return 0.0

    return round(
        (float(part) / float(total)) * 100,
        2,
    )


def _change_percentage(current, previous):
    current = float(current or 0)
    previous = float(previous or 0)

    if previous == 0:
        if current == 0:
            return 0.0

        return None

    return round(
        ((current - previous) / previous) * 100,
        2,
    )


def _normalize_dates(
    start_date=None,
    end_date=None,
):
    today = timezone.localdate()

    if start_date is None:
        start_date = today.replace(day=1)

    if end_date is None:
        end_date = today

    if start_date > end_date:
        start_date, end_date = (
            end_date,
            start_date,
        )

    return start_date, end_date


def _previous_period(
    start_date,
    end_date,
):
    number_of_days = (
        end_date - start_date
    ).days + 1

    previous_end = (
        start_date - timedelta(days=1)
    )

    previous_start = (
        previous_end
        - timedelta(
            days=number_of_days - 1
        )
    )

    return previous_start, previous_end


def _period_payload(
    start_date,
    end_date,
):
    previous_start, previous_end = (
        _previous_period(
            start_date,
            end_date,
        )
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "previous_start_date": (
            previous_start
        ),
        "previous_end_date": (
            previous_end
        ),
    }


def _money_outstanding(
    amount,
    paid_amount,
):
    return max(
        (amount or ZERO)
        - (paid_amount or ZERO),
        ZERO,
    )


def _employee_name(employee):
    if not employee:
        return ""

    user = employee.user

    if user:
        full_name = (
            user.get_full_name() or ""
        ).strip()

        if full_name:
            return full_name

        if user.username:
            return user.username

        if user.email:
            return user.email

    return employee.employee_id


# ============================================================
# EXECUTIVE OVERVIEW
# ============================================================


def get_intelligence_overview(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    previous_start, previous_end = (
        _previous_period(
            start_date,
            end_date,
        )
    )

    scoped_leads = get_scoped_leads(user)
    scoped_admissions = (
        get_scoped_admissions(user)
    )
    scoped_students = (
        get_scoped_students(user)
    )
    scoped_partners = (
        get_scoped_partners(user)
    )
    scoped_employees = (
        get_scoped_employees(user)
    )

    current_leads = scoped_leads.filter(
        created_at__date__range=(
            start_date,
            end_date,
        )
    )

    previous_leads = scoped_leads.filter(
        created_at__date__range=(
            previous_start,
            previous_end,
        )
    )

    current_admissions = (
        scoped_admissions.filter(
            created_at__date__range=(
                start_date,
                end_date,
            )
        )
    )

    previous_admissions = (
        scoped_admissions.filter(
            created_at__date__range=(
                previous_start,
                previous_end,
            )
        )
    )

    current_payments = (
        AdmissionPayment.objects.filter(
            admission__in=scoped_admissions,
            paid_at__date__range=(
                start_date,
                end_date,
            ),
        )
    )

    previous_payments = (
        AdmissionPayment.objects.filter(
            admission__in=scoped_admissions,
            paid_at__date__range=(
                previous_start,
                previous_end,
            ),
        )
    )

    current_collections = _sum(
        current_payments,
        "amount",
    )

    previous_collections = _sum(
        previous_payments,
        "amount",
    )

    current_converted = (
        current_leads.filter(
            status="CONVERTED"
        ).count()
    )

    previous_converted = (
        previous_leads.filter(
            status="CONVERTED"
        ).count()
    )

    current_conversion_rate = _percentage(
        current_converted,
        current_leads.count(),
    )

    previous_conversion_rate = _percentage(
        previous_converted,
        previous_leads.count(),
    )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),

        "kpis": {
            "leads": {
                "current": (
                    current_leads.count()
                ),
                "previous": (
                    previous_leads.count()
                ),
                "change_percentage": (
                    _change_percentage(
                        current_leads.count(),
                        previous_leads.count(),
                    )
                ),
            },

            "lead_conversion_rate": {
                "current": (
                    current_conversion_rate
                ),
                "previous": (
                    previous_conversion_rate
                ),
                "change_percentage_points": (
                    round(
                        current_conversion_rate
                        - previous_conversion_rate,
                        2,
                    )
                ),
            },

            "admissions": {
                "current": (
                    current_admissions.count()
                ),
                "previous": (
                    previous_admissions.count()
                ),
                "change_percentage": (
                    _change_percentage(
                        current_admissions.count(),
                        previous_admissions.count(),
                    )
                ),
            },

            "collections": {
                "current": (
                    current_collections
                ),
                "previous": (
                    previous_collections
                ),
                "change_percentage": (
                    _change_percentage(
                        current_collections,
                        previous_collections,
                    )
                ),
            },
        },

        "organization": {
            "active_students": (
                scoped_students.filter(
                    status="ACTIVE"
                ).count()
            ),
            "active_partners": (
                scoped_partners.filter(
                    status="ACTIVE"
                ).count()
            ),
            "active_employees": (
                scoped_employees.filter(
                    employment_status="ACTIVE"
                ).count()
            ),
        },
    }


# ============================================================
# TREND INTELLIGENCE
# ============================================================


def get_intelligence_trends(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    scoped_leads = get_scoped_leads(user)
    scoped_admissions = (
        get_scoped_admissions(user)
    )

    leads = (
        scoped_leads
        .filter(
            created_at__date__range=(
                start_date,
                end_date,
            )
        )
        .annotate(
            trend_date=TruncDate(
                "created_at"
            )
        )
        .values("trend_date")
        .annotate(
            total=Count("id"),
            converted=Count(
                "id",
                filter=Q(
                    status="CONVERTED"
                ),
            ),
        )
        .order_by("trend_date")
    )

    admissions = (
        scoped_admissions
        .filter(
            created_at__date__range=(
                start_date,
                end_date,
            )
        )
        .annotate(
            trend_date=TruncDate(
                "created_at"
            )
        )
        .values("trend_date")
        .annotate(
            total=Count("id"),
            completed=Count(
                "id",
                filter=Q(
                    status="COMPLETED"
                ),
            ),
        )
        .order_by("trend_date")
    )

    payments = (
        AdmissionPayment.objects
        .filter(
            admission__in=(
                scoped_admissions
            ),
            paid_at__date__range=(
                start_date,
                end_date,
            ),
        )
        .annotate(
            trend_date=TruncDate(
                "paid_at"
            )
        )
        .values("trend_date")
        .annotate(
            amount=Sum("amount")
        )
        .order_by("trend_date")
    )

    transactions = (
        get_scoped_financial_transactions(
            user
        )
        .filter(
            status="POSTED",
            transaction_date__range=(
                start_date,
                end_date,
            ),
        )
        .values("transaction_date")
        .annotate(
            income=Sum(
                "amount",
                filter=Q(
                    transaction_type="CREDIT"
                ),
            ),
            expense=Sum(
                "amount",
                filter=Q(
                    transaction_type="DEBIT"
                ),
            ),
        )
        .order_by(
            "transaction_date"
        )
    )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),

        "lead_trend": [
            {
                "date": row["trend_date"],
                "leads": row["total"],
                "converted": (
                    row["converted"]
                ),
            }
            for row in leads
        ],

        "admission_trend": [
            {
                "date": row["trend_date"],
                "admissions": row["total"],
                "completed": (
                    row["completed"]
                ),
            }
            for row in admissions
        ],

        "collection_trend": [
            {
                "date": row["trend_date"],
                "amount": (
                    row["amount"] or ZERO
                ),
            }
            for row in payments
        ],

        "cash_flow_trend": [
            {
                "date": (
                    row[
                        "transaction_date"
                    ]
                ),
                "income": (
                    row["income"] or ZERO
                ),
                "expense": (
                    row["expense"] or ZERO
                ),
                "net": (
                    (row["income"] or ZERO)
                    - (
                        row["expense"]
                        or ZERO
                    )
                ),
            }
            for row in transactions
        ],
    }


# ============================================================
# INSTITUTION INTELLIGENCE
# ============================================================


def get_institution_intelligence(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    scoped_admissions = (
        get_scoped_admissions(user)
    )

    period_admissions = (
        scoped_admissions.filter(
            created_at__date__range=(
                start_date,
                end_date,
            )
        )
    )

    institution_rows = (
        period_admissions
        .values(
            "institution_id",
            "institution__name",
            "institution__code",
        )
        .annotate(
            admissions=Count("id"),
            completed=Count(
                "id",
                filter=Q(
                    status="COMPLETED"
                ),
            ),
        )
        .order_by(
            "-admissions",
            "institution__name",
        )
    )

    results = []

    for row in institution_rows:
        institution_id = (
            row["institution_id"]
        )

        admissions_for_institution = (
            scoped_admissions.filter(
                institution_id=(
                    institution_id
                )
            )
        )

        period_admissions_for_institution = (
            period_admissions.filter(
                institution_id=(
                    institution_id
                )
            )
        )

        fees = (
            AdmissionFee.objects.filter(
                admission__in=(
                    admissions_for_institution
                )
            )
        )

        payments = (
            AdmissionPayment.objects.filter(
                admission__in=(
                    admissions_for_institution
                )
            )
        )

        period_payments = (
            payments.filter(
                paid_at__date__range=(
                    start_date,
                    end_date,
                )
            )
        )

        booked_fees = _sum(
            fees,
            "amount",
        )

        collected_total = _sum(
            payments,
            "amount",
        )

        receivable = max(
            booked_fees
            - collected_total,
            ZERO,
        )

        university_payables = (
            UniversityPayable.objects
            .filter(
                admission__in=(
                    admissions_for_institution
                )
            )
            .exclude(
                status__in=[
                    "PAID",
                    "CANCELLED",
                ]
            )
        )

        university_outstanding = ZERO

        for payable in university_payables:
            university_outstanding += (
                _money_outstanding(
                    payable.amount,
                    payable.paid_amount,
                )
            )

        results.append(
            {
                "institution_id": str(
                    institution_id
                ),
                "institution_name": (
                    row[
                        "institution__name"
                    ]
                ),
                "institution_code": (
                    row[
                        "institution__code"
                    ]
                ),
                "admissions_in_period": (
                    period_admissions_for_institution
                    .count()
                ),
                "completed_in_period": (
                    row["completed"]
                ),
                "collections_in_period": (
                    _sum(
                        period_payments,
                        "amount",
                    )
                ),
                "booked_fees_total": (
                    booked_fees
                ),
                "collections_total": (
                    collected_total
                ),
                "student_receivable": (
                    receivable
                ),
                "university_outstanding": (
                    university_outstanding
                ),
            }
        )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),
        "institutions": results,
    }


# ============================================================
# PARTNER PERFORMANCE
# ============================================================


def get_partner_intelligence(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    partners = get_scoped_partners(user)

    results = []

    for partner in partners.order_by(
        "name"
    ):
        cases = (
            PartnerCase.objects.filter(
                partner=partner,
                created_at__date__range=(
                    start_date,
                    end_date,
                ),
            )
        )

        admissions = (
            get_scoped_admissions(user)
            .filter(
                partner=partner,
                created_at__date__range=(
                    start_date,
                    end_date,
                ),
            )
        )

        all_partner_admissions = (
            get_scoped_admissions(user)
            .filter(
                partner=partner
            )
        )

        payments = (
            AdmissionPayment.objects
            .filter(
                admission__in=(
                    all_partner_admissions
                ),
                paid_at__date__range=(
                    start_date,
                    end_date,
                ),
            )
        )

        commissions = (
            CommissionTransaction.objects
            .filter(
                partner=partner,
                created_at__date__range=(
                    start_date,
                    end_date,
                ),
            )
        )

        earned = _sum(
            commissions.exclude(
                status="CANCELLED"
            ),
            "commission_amount",
        )

        approved_payable = _sum(
            commissions.filter(
                status__in=[
                    "APPROVED",
                    "PAYABLE",
                ]
            ),
            "commission_amount",
        )

        paid = _sum(
            commissions.filter(
                status="PAID"
            ),
            "commission_amount",
        )

        open_issues = (
            PartnerIssue.objects.filter(
                partner=partner,
                status__in=[
                    "OPEN",
                    "IN_PROGRESS",
                    "WAITING",
                ],
            ).count()
        )

        results.append(
            {
                "partner_id": (
                    partner.partner_id
                ),
                "name": partner.name,
                "status": partner.status,
                "cases_in_period": (
                    cases.count()
                ),
                "admissions_in_period": (
                    admissions.count()
                ),
                "completed_cases": (
                    cases.filter(
                        status="COMPLETED"
                    ).count()
                ),
                "collections_in_period": (
                    _sum(
                        payments,
                        "amount",
                    )
                ),
                "commission_earned": (
                    earned
                ),
                "commission_payable": (
                    approved_payable
                ),
                "commission_paid": paid,
                "open_issues": (
                    open_issues
                ),
            }
        )

    results.sort(
        key=lambda item: (
            item["admissions_in_period"],
            item["cases_in_period"],
        ),
        reverse=True,
    )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),
        "partners": results,
    }


# ============================================================
# STAFF PERFORMANCE
# ============================================================


def get_staff_intelligence(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    employees = (
        get_scoped_employees(user)
        .select_related(
            "user",
            "branch",
            "department",
        )
    )

    scoped_leads = get_scoped_leads(user)
    scoped_calls = get_scoped_calls(user)
    scoped_admissions = (
        get_scoped_admissions(user)
    )

    results = []

    for employee in employees:
        if not employee.user_id:
            continue

        staff_user_id = (
            employee.user_id
        )

        leads = scoped_leads.filter(
            assigned_to_id=staff_user_id,
            created_at__date__range=(
                start_date,
                end_date,
            ),
        )

        calls = scoped_calls.filter(
            telecaller_id=staff_user_id,
            called_at__date__range=(
                start_date,
                end_date,
            ),
        )

        admissions = (
            scoped_admissions.filter(
                assigned_to_id=(
                    staff_user_id
                ),
                created_at__date__range=(
                    start_date,
                    end_date,
                ),
            )
        )

        converted = leads.filter(
            status="CONVERTED"
        ).count()

        results.append(
            {
                "employee_id": (
                    employee.employee_id
                ),
                "name": (
                    _employee_name(
                        employee
                    )
                ),
                "department": (
                    employee.department.name
                    if employee.department
                    else None
                ),
                "branch": (
                    employee.branch.name
                    if employee.branch
                    else None
                ),
                "leads_assigned": (
                    leads.count()
                ),
                "calls": calls.count(),
                "converted_leads": (
                    converted
                ),
                "conversion_rate": (
                    _percentage(
                        converted,
                        leads.count(),
                    )
                ),
                "admissions": (
                    admissions.count()
                ),
                "completed_admissions": (
                    admissions.filter(
                        status="COMPLETED"
                    ).count()
                ),
            }
        )

    results.sort(
        key=lambda item: (
            item["converted_leads"],
            item["admissions"],
            item["calls"],
        ),
        reverse=True,
    )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),
        "staff": results,
    }


# ============================================================
# FINANCIAL INTELLIGENCE
# ============================================================


def get_financial_intelligence(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    transactions = (
        get_scoped_financial_transactions(
            user
        )
    )

    period_transactions = (
        transactions.filter(
            status="POSTED",
            transaction_date__range=(
                start_date,
                end_date,
            ),
        )
    )

    income = _sum(
        period_transactions.filter(
            transaction_type="CREDIT"
        ),
        "amount",
    )

    cash_outflow = _sum(
        period_transactions.filter(
            transaction_type="DEBIT"
        ),
        "amount",
    )

    scoped_admissions = (
        get_scoped_admissions(user)
    )

    fees = AdmissionFee.objects.filter(
        admission__in=scoped_admissions
    )

    payments = (
        AdmissionPayment.objects.filter(
            admission__in=(
                scoped_admissions
            )
        )
    )

    booked_fees = _sum(
        fees,
        "amount",
    )

    collections_total = _sum(
        payments,
        "amount",
    )

    collections_in_period = _sum(
        payments.filter(
            paid_at__date__range=(
                start_date,
                end_date,
            )
        ),
        "amount",
    )

    student_receivable = max(
        booked_fees
        - collections_total,
        ZERO,
    )

    university_outstanding = ZERO

    university_payables = (
        UniversityPayable.objects
        .filter(
            admission__in=(
                scoped_admissions
            )
        )
        .exclude(
            status__in=[
                "PAID",
                "CANCELLED",
            ]
        )
    )

    for payable in university_payables:
        university_outstanding += (
            _money_outstanding(
                payable.amount,
                payable.paid_amount,
            )
        )

    partners = get_scoped_partners(user)

    commissions = (
        CommissionTransaction.objects
        .filter(
            partner__in=partners
        )
    )

    partner_commission_outstanding = (
        _sum(
            commissions.filter(
                status__in=[
                    "APPROVED",
                    "PAYABLE",
                ]
            ),
            "commission_amount",
        )
    )

    operational_outstanding = ZERO

    expenses = get_scoped_expenses(user)

    for expense in expenses.exclude(
        status__in=[
            "PAID",
            "REJECTED",
            "CANCELLED",
        ]
    ):
        operational_outstanding += (
            _money_outstanding(
                expense.amount,
                expense.paid_amount,
            )
        )

    payrolls = get_scoped_payroll(user)

    payroll_in_period = payrolls.filter(
        created_at__date__range=(
            start_date,
            end_date,
        )
    ).exclude(
        status="CANCELLED"
    )

    payroll_total = _sum(
        payroll_in_period,
        "net_salary",
    )

    payroll_paid = _sum(
        payroll_in_period.filter(
            status="PAID"
        ),
        "net_salary",
    )

    payroll_outstanding = _sum(
        payroll_in_period.filter(
            status__in=[
                "CALCULATED",
                "APPROVED",
            ]
        ),
        "net_salary",
    )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),

        "cash_flow": {
            "income": income,
            "outflow": cash_outflow,
            "net": (
                income - cash_outflow
            ),
        },

        "student_finance": {
            "booked_fees": (
                booked_fees
            ),
            "collections_total": (
                collections_total
            ),
            "collections_in_period": (
                collections_in_period
            ),
            "receivable": (
                student_receivable
            ),
            "collection_rate": (
                _percentage(
                    collections_total,
                    booked_fees,
                )
            ),
        },

        "obligations": {
            "university_outstanding": (
                university_outstanding
            ),
            "partner_commission_outstanding": (
                partner_commission_outstanding
            ),
            "operational_expense_outstanding": (
                operational_outstanding
            ),
            "payroll_outstanding": (
                payroll_outstanding
            ),
        },

        "payroll": {
            "period_total": (
                payroll_total
            ),
            "period_paid": (
                payroll_paid
            ),
            "period_outstanding": (
                payroll_outstanding
            ),
        },

        "note": (
            "These are operational financial "
            "indicators and cash-flow metrics, "
            "not statutory accounting profit."
        ),
    }


# ============================================================
# EXCEPTION / ATTENTION CENTRE
# ============================================================


def get_exception_intelligence(
    user,
    start_date=None,
    end_date=None,
):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    today = timezone.localdate()
    now = timezone.now()

    active_leads = (
        get_scoped_leads(user)
        .exclude(
            status__in=[
                "CONVERTED",
                "NOT_INTERESTED",
                "CLOSED",
            ]
        )
    )

    overdue_followups = (
        active_leads.filter(
            next_follow_up_at__lt=now
        )
        .order_by(
            "next_follow_up_at"
        )
    )

    processes = (
        get_scoped_student_processes(
            user
        )
    )

    overdue_processes = (
        processes.filter(
            due_date__lt=today
        )
        .exclude(
            status__in=[
                "COMPLETED",
                "NOT_APPLICABLE",
                "CANCELLED",
            ]
        )
        .select_related(
            "student",
            "assigned_to",
        )
        .order_by("due_date")
    )

    urgent_partner_issues = (
        get_scoped_partner_issues(user)
        .filter(
            priority="URGENT",
        )
        .exclude(
            status__in=[
                "RESOLVED",
                "CLOSED",
            ]
        )
        .select_related(
            "partner"
        )
        .order_by("created_at")
    )

    scoped_admissions = (
        get_scoped_admissions(user)
    )

    university_payables = (
        UniversityPayable.objects
        .filter(
            admission__in=(
                scoped_admissions
            )
        )
        .exclude(
            status__in=[
                "PAID",
                "CANCELLED",
            ]
        )
        .select_related(
            "institution",
            "admission",
        )
        .order_by(
            "due_date",
            "created_at",
        )
    )

    outstanding_expenses = (
        get_scoped_expenses(user)
        .exclude(
            status__in=[
                "PAID",
                "REJECTED",
                "CANCELLED",
            ]
        )
        .order_by(
            "due_date",
            "created_at",
        )
    )

    followup_items = []

    for lead in overdue_followups[:25]:
        followup_items.append(
            {
                "lead_id": (
                    lead.lead_id
                ),
                "name": lead.name,
                "status": lead.status,
                "next_follow_up_at": (
                    lead.next_follow_up_at
                ),
            }
        )

    process_items = []

    for process in overdue_processes[:25]:
        process_items.append(
            {
                "student_id": (
                    process.student.student_id
                ),
                "student_name": (
                    process.student.name
                ),
                "process_type": (
                    process.process_type
                ),
                "title": (
                    process.title
                ),
                "status": (
                    process.status
                ),
                "due_date": (
                    process.due_date
                ),
            }
        )

    issue_items = []

    for issue in urgent_partner_issues[:25]:
        issue_items.append(
            {
                "partner_id": (
                    issue.partner.partner_id
                ),
                "partner_name": (
                    issue.partner.name
                ),
                "subject": (
                    issue.subject
                ),
                "status": (
                    issue.status
                ),
                "priority": (
                    issue.priority
                ),
                "created_at": (
                    issue.created_at
                ),
            }
        )

    university_items = []
    university_total = ZERO

    for payable in university_payables:
        outstanding = (
            _money_outstanding(
                payable.amount,
                payable.paid_amount,
            )
        )

        university_total += outstanding

        if len(university_items) < 25:
            university_items.append(
                {
                    "payable_number": (
                        payable.payable_number
                    ),
                    "institution": (
                        payable.institution.name
                    ),
                    "admission_id": (
                        payable.admission.admission_id
                    ),
                    "due_date": (
                        payable.due_date
                    ),
                    "status": (
                        payable.status
                    ),
                    "outstanding": (
                        outstanding
                    ),
                }
            )

    expense_items = []
    expense_total = ZERO

    for expense in outstanding_expenses:
        outstanding = (
            _money_outstanding(
                expense.amount,
                expense.paid_amount,
            )
        )

        expense_total += outstanding

        if len(expense_items) < 25:
            expense_items.append(
                {
                    "expense_number": (
                        expense.expense_number
                    ),
                    "vendor_name": (
                        expense.vendor_name
                    ),
                    "description": (
                        expense.description
                    ),
                    "due_date": (
                        expense.due_date
                    ),
                    "status": (
                        expense.status
                    ),
                    "outstanding": (
                        outstanding
                    ),
                }
            )

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),

        "summary": {
            "overdue_followups": (
                overdue_followups.count()
            ),
            "overdue_education_processes": (
                overdue_processes.count()
            ),
            "urgent_partner_issues": (
                urgent_partner_issues.count()
            ),
            "university_payables": (
                university_payables.count()
            ),
            "university_outstanding": (
                university_total
            ),
            "operational_expenses": (
                outstanding_expenses.count()
            ),
            "operational_expense_outstanding": (
                expense_total
            ),
        },

        "queues": {
            "overdue_followups": (
                followup_items
            ),
            "overdue_education_processes": (
                process_items
            ),
            "urgent_partner_issues": (
                issue_items
            ),
            "university_payables": (
                university_items
            ),
            "operational_expenses": (
                expense_items
            ),
        },
    }


# ============================================================
# BLOCK 5A — MANAGEMENT TASK INTELLIGENCE
# ============================================================


def get_task_intelligence(
    user,
    start_date=None,
    end_date=None,
):
    from notifications.models import Task
    from dashboard.selectors import get_scoped_tasks

    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    now = timezone.now()
    today = timezone.localdate()

    open_statuses = (
        Task.Status.PENDING,
        Task.Status.IN_PROGRESS,
    )

    tasks = get_scoped_tasks(user)

    open_tasks = tasks.filter(
        status__in=open_statuses
    )

    overdue_tasks = open_tasks.filter(
        due_at__lt=now
    )

    due_next_7_days = open_tasks.filter(
        due_at__gte=now,
        due_at__lte=(
            now + timedelta(days=7)
        ),
    )

    period_created = tasks.filter(
        created_at__date__range=(
            start_date,
            end_date,
        )
    )

    period_completed = tasks.filter(
        status=Task.Status.COMPLETED,
        completed_at__date__range=(
            start_date,
            end_date,
        ),
    )

    created_cohort = period_created.exclude(
        status=Task.Status.CANCELLED
    )

    created_cohort_completed = (
        created_cohort.filter(
            status=Task.Status.COMPLETED
        )
    )

    status_labels = dict(
        Task.Status.choices
    )
    priority_labels = dict(
        Task.Priority.choices
    )
    module_labels = dict(
        Task.SourceModule.choices
    )

    status_rows = (
        tasks.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    priority_rows = (
        open_tasks.values("priority")
        .annotate(count=Count("id"))
        .order_by("priority")
    )

    module_rows = (
        open_tasks
        .values("source_module")
        .annotate(
            open_tasks=Count("id"),
            overdue_tasks=Count(
                "id",
                filter=Q(
                    due_at__lt=now
                ),
            ),
            high_tasks=Count(
                "id",
                filter=Q(
                    priority=(
                        Task.Priority.HIGH
                    )
                ),
            ),
            urgent_tasks=Count(
                "id",
                filter=Q(
                    priority=(
                        Task.Priority.URGENT
                    )
                ),
            ),
        )
        .order_by(
            "-overdue_tasks",
            "-urgent_tasks",
            "-open_tasks",
            "source_module",
        )
    )

    department_field = (
        "assigned_to__employee_profile__"
        "department__name"
    )

    department_rows = (
        open_tasks
        .values(department_field)
        .annotate(
            open_tasks=Count("id"),
            overdue_tasks=Count(
                "id",
                filter=Q(
                    due_at__lt=now
                ),
            ),
            high_tasks=Count(
                "id",
                filter=Q(
                    priority=(
                        Task.Priority.HIGH
                    )
                ),
            ),
            urgent_tasks=Count(
                "id",
                filter=Q(
                    priority=(
                        Task.Priority.URGENT
                    )
                ),
            ),
        )
        .order_by(
            "-overdue_tasks",
            "-urgent_tasks",
            "-open_tasks",
            department_field,
        )
    )

    staff_rows = (
        tasks
        .values(
            "assigned_to_id",
            "assigned_to__username",
            "assigned_to__email",
            "assigned_to__first_name",
            "assigned_to__last_name",
            "assigned_to__employee_profile__employee_id",
            "assigned_to__employee_profile__department__name",
            "assigned_to__employee_profile__branch__name",
        )
        .annotate(
            open_tasks=Count(
                "id",
                filter=Q(
                    status__in=open_statuses
                ),
            ),
            overdue_tasks=Count(
                "id",
                filter=Q(
                    status__in=open_statuses,
                    due_at__lt=now,
                ),
            ),
            high_open=Count(
                "id",
                filter=Q(
                    status__in=open_statuses,
                    priority=Task.Priority.HIGH,
                ),
            ),
            urgent_open=Count(
                "id",
                filter=Q(
                    status__in=open_statuses,
                    priority=Task.Priority.URGENT,
                ),
            ),
            created_in_period=Count(
                "id",
                filter=Q(
                    created_at__date__range=(
                        start_date,
                        end_date,
                    )
                ),
            ),
            completed_in_period=Count(
                "id",
                filter=Q(
                    status=Task.Status.COMPLETED,
                    completed_at__date__range=(
                        start_date,
                        end_date,
                    ),
                ),
            ),
            cohort_total=Count(
                "id",
                filter=(
                    Q(
                        created_at__date__range=(
                            start_date,
                            end_date,
                        )
                    )
                    & ~Q(
                        status=Task.Status.CANCELLED
                    )
                ),
            ),
            cohort_completed=Count(
                "id",
                filter=Q(
                    created_at__date__range=(
                        start_date,
                        end_date,
                    ),
                    status=Task.Status.COMPLETED,
                ),
            ),
        )
        .filter(
            Q(open_tasks__gt=0)
            | Q(created_in_period__gt=0)
            | Q(completed_in_period__gt=0)
        )
        .order_by(
            "-overdue_tasks",
            "-urgent_open",
            "-open_tasks",
            "assigned_to__username",
        )
    )

    def assignee_name(row):
        full_name = (
            (
                row[
                    "assigned_to__first_name"
                ]
                or ""
            ).strip()
            + " "
            + (
                row[
                    "assigned_to__last_name"
                ]
                or ""
            ).strip()
        ).strip()

        return (
            full_name
            or row[
                "assigned_to__username"
            ]
            or row[
                "assigned_to__email"
            ]
            or str(
                row["assigned_to_id"]
            )
        )

    def task_assignee_name(task):
        assigned_to = task.assigned_to

        full_name = (
            assigned_to.get_full_name()
            or ""
        ).strip()

        return (
            full_name
            or assigned_to.username
            or assigned_to.email
            or str(assigned_to.pk)
        )

    def task_item(task):
        return {
            "task_id": str(task.id),
            "title": task.title,
            "status": task.status,
            "priority": task.priority,
            "source_module": (
                task.source_module
            ),
            "source_module_label": (
                module_labels.get(
                    task.source_module,
                    task.source_module,
                )
            ),
            "source_label": (
                task.source_label
            ),
            "assigned_to": {
                "id": str(
                    task.assigned_to_id
                ),
                "name": (
                    task_assignee_name(
                        task
                    )
                ),
            },
            "due_at": task.due_at,
            "created_at": task.created_at,
            "is_overdue": bool(
                task.due_at
                and task.due_at < now
                and task.status
                in open_statuses
            ),
            "action_url": (
                f"/tasks?task={task.id}"
            ),
        }

    upcoming_deadlines = (
        open_tasks
        .filter(
            due_at__gte=now
        )
        .select_related(
            "assigned_to"
        )
        .order_by(
            "due_at",
            "-priority",
        )[:25]
    )

    oldest_overdue = (
        overdue_tasks
        .select_related(
            "assigned_to"
        )
        .order_by(
            "due_at",
            "-priority",
        )[:25]
    )

    age_3 = now - timedelta(days=3)
    age_8 = now - timedelta(days=8)
    age_15 = now - timedelta(days=15)
    age_31 = now - timedelta(days=31)

    return {
        "period": _period_payload(
            start_date,
            end_date,
        ),

        "summary": {
            "open_tasks": (
                open_tasks.count()
            ),
            "overdue_tasks": (
                overdue_tasks.count()
            ),
            "due_today": (
                open_tasks.filter(
                    due_at__date=today
                ).count()
            ),
            "due_next_7_days": (
                due_next_7_days.count()
            ),
            "high_open": (
                open_tasks.filter(
                    priority=(
                        Task.Priority.HIGH
                    )
                ).count()
            ),
            "urgent_open": (
                open_tasks.filter(
                    priority=(
                        Task.Priority.URGENT
                    )
                ).count()
            ),
            "without_due_date": (
                open_tasks.filter(
                    due_at__isnull=True
                ).count()
            ),
        },

        "period_activity": {
            "created": (
                period_created.count()
            ),
            "completed": (
                period_completed.count()
            ),
            "created_cohort_total": (
                created_cohort.count()
            ),
            "created_cohort_completed": (
                created_cohort_completed
                .count()
            ),
            "created_cohort_completion_rate": (
                _percentage(
                    created_cohort_completed
                    .count(),
                    created_cohort.count(),
                )
            ),
        },

        "status_breakdown": [
            {
                "status": row["status"],
                "label": (
                    status_labels.get(
                        row["status"],
                        row["status"],
                    )
                ),
                "count": row["count"],
            }
            for row in status_rows
        ],

        "open_priority_breakdown": [
            {
                "priority": (
                    row["priority"]
                ),
                "label": (
                    priority_labels.get(
                        row["priority"],
                        row["priority"],
                    )
                ),
                "count": row["count"],
            }
            for row in priority_rows
        ],

        "module_workload": [
            {
                "module": (
                    row["source_module"]
                ),
                "label": (
                    module_labels.get(
                        row["source_module"],
                        row["source_module"],
                    )
                ),
                "open_tasks": (
                    row["open_tasks"]
                ),
                "overdue_tasks": (
                    row["overdue_tasks"]
                ),
                "high_tasks": (
                    row["high_tasks"]
                ),
                "urgent_tasks": (
                    row["urgent_tasks"]
                ),
            }
            for row in module_rows
        ],

        "department_workload": [
            {
                "department": (
                    row[
                        department_field
                    ]
                    or "Unassigned"
                ),
                "open_tasks": (
                    row["open_tasks"]
                ),
                "overdue_tasks": (
                    row["overdue_tasks"]
                ),
                "high_tasks": (
                    row["high_tasks"]
                ),
                "urgent_tasks": (
                    row["urgent_tasks"]
                ),
            }
            for row in department_rows
        ],

        "staff_workload": [
            {
                "user_id": str(
                    row["assigned_to_id"]
                ),
                "employee_id": (
                    row[
                        "assigned_to__employee_profile__employee_id"
                    ]
                ),
                "name": (
                    assignee_name(row)
                ),
                "department": (
                    row[
                        "assigned_to__employee_profile__department__name"
                    ]
                ),
                "branch": (
                    row[
                        "assigned_to__employee_profile__branch__name"
                    ]
                ),
                "open_tasks": (
                    row["open_tasks"]
                ),
                "overdue_tasks": (
                    row["overdue_tasks"]
                ),
                "high_open": (
                    row["high_open"]
                ),
                "urgent_open": (
                    row["urgent_open"]
                ),
                "created_in_period": (
                    row[
                        "created_in_period"
                    ]
                ),
                "completed_in_period": (
                    row[
                        "completed_in_period"
                    ]
                ),
                "created_cohort_completion_rate": (
                    _percentage(
                        row[
                            "cohort_completed"
                        ],
                        row[
                            "cohort_total"
                        ],
                    )
                ),
            }
            for row in staff_rows
        ],

        "aging": {
            "0_2_days": (
                open_tasks.filter(
                    created_at__gt=age_3
                ).count()
            ),
            "3_7_days": (
                open_tasks.filter(
                    created_at__lte=age_3,
                    created_at__gt=age_8,
                ).count()
            ),
            "8_14_days": (
                open_tasks.filter(
                    created_at__lte=age_8,
                    created_at__gt=age_15,
                ).count()
            ),
            "15_30_days": (
                open_tasks.filter(
                    created_at__lte=age_15,
                    created_at__gt=age_31,
                ).count()
            ),
            "31_plus_days": (
                open_tasks.filter(
                    created_at__lte=age_31
                ).count()
            ),
        },

        "upcoming_deadlines": [
            task_item(task)
            for task in upcoming_deadlines
        ],

        "oldest_overdue": [
            task_item(task)
            for task in oldest_overdue
        ],

        "attention": {
            "urgent_overdue": (
                overdue_tasks.filter(
                    priority=(
                        Task.Priority.URGENT
                    )
                ).count()
            ),
            "overdue_7_plus_days": (
                overdue_tasks.filter(
                    due_at__lte=(
                        now
                        - timedelta(days=7)
                    )
                ).count()
            ),
            "due_next_24_hours": (
                open_tasks.filter(
                    due_at__gte=now,
                    due_at__lte=(
                        now
                        + timedelta(hours=24)
                    ),
                ).count()
            ),
        },
    }

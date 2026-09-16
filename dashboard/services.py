from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Q
from django.utils import timezone

from leads.models import Lead
from admissions.models import Admission, AdmissionFee, AdmissionPayment
from students.models import StudentProcess
from partners.models import CommissionTransaction
from hr.models import SalaryAdvance
from finance.models import FinancialAccount, UniversityPayable

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
    get_scoped_attendance,
    get_scoped_leave_requests,
    get_scoped_payroll,
    get_scoped_financial_transactions,
    get_scoped_expenses,
)


ZERO = Decimal("0.00")


# ============================================================
# COMMON HELPERS
# ============================================================


def _sum(queryset, field):
    value = queryset.aggregate(total=Sum(field))["total"]
    return value or ZERO


def _count_by(queryset, field):
    rows = (
        queryset.values(field)
        .annotate(count=Count("id"))
        .order_by(field)
    )

    return {
        row[field]: row["count"]
        for row in rows
    }


def _percentage(part, total):
    if not total:
        return 0.0

    return round((part / total) * 100, 2)


def get_default_date_range():
    today = timezone.localdate()

    return {
        "start_date": today.replace(day=1),
        "end_date": today,
    }


def _normalize_dates(start_date=None, end_date=None):
    defaults = get_default_date_range()

    start_date = start_date or defaults["start_date"]
    end_date = end_date or defaults["end_date"]

    if start_date > end_date:
        start_date, end_date = end_date, start_date

    return start_date, end_date


# ============================================================
# MARKETING
# ============================================================


def get_marketing_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    leads = get_scoped_leads(user).filter(
        created_at__date__range=(start_date, end_date)
    )

    total_leads = leads.count()
    converted = leads.filter(status="CONVERTED").count()

    source_performance = list(
        leads.values("source")
        .annotate(
            leads=Count("id"),
            converted=Count(
                "id",
                filter=Q(status="CONVERTED"),
            ),
        )
        .order_by("-leads")
    )

    campaign_performance = list(
        leads.exclude(campaign="")
        .values("campaign")
        .annotate(
            leads=Count("id"),
            converted=Count(
                "id",
                filter=Q(status="CONVERTED"),
            ),
        )
        .order_by("-leads")
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "total_leads": total_leads,
        "converted_leads": converted,
        "conversion_rate": _percentage(
            converted,
            total_leads,
        ),
        "channel": {
            "direct": leads.filter(
                channel="DIRECT"
            ).count(),
            "partner": leads.filter(
                channel="PARTNER"
            ).count(),
        },
        "vertical": {
            "regular": leads.filter(
                vertical="REGULAR"
            ).count(),
            "credit_transfer": leads.filter(
                vertical="CREDIT_TRANSFER"
            ).count(),
        },
        "status_breakdown": _count_by(
            leads,
            "status",
        ),
        "source_performance": source_performance,
        "campaign_performance": campaign_performance,
    }


# ============================================================
# TELECALLING
# ============================================================


def get_telecalling_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    today = timezone.localdate()
    now = timezone.now()

    scoped_leads = get_scoped_leads(user)

    calls = get_scoped_calls(user).filter(
        called_at__date__range=(start_date, end_date)
    )

    active_leads = scoped_leads.exclude(
        status__in=[
            "CONVERTED",
            "NOT_INTERESTED",
            "CLOSED",
        ]
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "total_calls": calls.count(),
        "call_outcomes": _count_by(
            calls,
            "outcome",
        ),
        "active_leads": active_leads.count(),
        "follow_up_due_today": active_leads.filter(
            next_follow_up_at__date=today
        ).count(),
        "overdue_follow_up": active_leads.filter(
            next_follow_up_at__lt=now
        ).count(),
        "unassigned_leads": active_leads.filter(
            assigned_to__isnull=True
        ).count(),
        "qualified_leads": scoped_leads.filter(
            status="QUALIFIED"
        ).count(),
        "converted_leads": scoped_leads.filter(
            status="CONVERTED"
        ).count(),
    }


# ============================================================
# ADMISSIONS
# ============================================================


def get_admission_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    admissions = get_scoped_admissions(user).filter(
        created_at__date__range=(start_date, end_date)
    )

    fees = AdmissionFee.objects.filter(
        admission__in=admissions
    )

    payments = AdmissionPayment.objects.filter(
        admission__in=admissions
    )

    booked_fees = _sum(fees, "amount")
    collections = _sum(payments, "amount")

    receivable = max(
        booked_fees - collections,
        ZERO,
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "total_admissions": admissions.count(),
        "completed_admissions": admissions.filter(
            status="COMPLETED"
        ).count(),
        "status_breakdown": _count_by(
            admissions,
            "status",
        ),
        "channel_breakdown": _count_by(
            admissions,
            "channel",
        ),
        "vertical_breakdown": _count_by(
            admissions,
            "vertical",
        ),
        "booked_fees": booked_fees,
        "collections": collections,
        "receivable": receivable,
        "collection_rate": _percentage(
            collections,
            booked_fees,
        ),
    }


# ============================================================
# EDUCATION PROCESS
# ============================================================


def get_education_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    today = timezone.localdate()

    students = get_scoped_students(user)
    processes = get_scoped_student_processes(user)

    overdue = processes.filter(
        due_date__lt=today
    ).exclude(
        status__in=[
            "COMPLETED",
            "NOT_APPLICABLE",
            "CANCELLED",
        ]
    )

    due_soon = processes.filter(
        due_date__range=(
            today,
            today + timedelta(days=7),
        )
    ).exclude(
        status__in=[
            "COMPLETED",
            "NOT_APPLICABLE",
            "CANCELLED",
        ]
    )

    completed = processes.filter(
        completed_at__date__range=(
            start_date,
            end_date,
        ),
        status="COMPLETED",
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "total_students": students.count(),
        "active_students": students.filter(
            status="ACTIVE"
        ).count(),
        "student_status_breakdown": _count_by(
            students,
            "status",
        ),
        "process_status_breakdown": _count_by(
            processes,
            "status",
        ),
        "process_type_breakdown": _count_by(
            processes,
            "process_type",
        ),
        "overdue_processes": overdue.count(),
        "due_next_7_days": due_soon.count(),
        "completed_in_period": completed.count(),
    }


# ============================================================
# PARTNER NETWORK
# ============================================================


def get_partner_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    partners = get_scoped_partners(user)

    cases = get_scoped_partner_cases(user).filter(
        created_at__date__range=(
            start_date,
            end_date,
        )
    )

    issues = get_scoped_partner_issues(user)

    commissions = CommissionTransaction.objects.filter(
        partner__in=partners,
        created_at__date__range=(
            start_date,
            end_date,
        ),
    )

    earned = _sum(
        commissions.exclude(status="CANCELLED"),
        "commission_amount",
    )

    paid = _sum(
        commissions.filter(status="PAID"),
        "commission_amount",
    )

    payable = _sum(
        commissions.filter(
            status__in=[
                "APPROVED",
                "PAYABLE",
            ]
        ),
        "commission_amount",
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "total_partners": partners.count(),
        "active_partners": partners.filter(
            status="ACTIVE"
        ).count(),
        "partner_status_breakdown": _count_by(
            partners,
            "status",
        ),
        "cases_received": cases.count(),
        "case_status_breakdown": _count_by(
            cases,
            "status",
        ),
        "commission_earned": earned,
        "commission_payable": payable,
        "commission_paid": paid,
        "open_issues": issues.filter(
            status__in=[
                "OPEN",
                "IN_PROGRESS",
                "WAITING",
            ]
        ).count(),
        "urgent_issues": issues.filter(
            priority="URGENT",
        ).exclude(
            status__in=[
                "RESOLVED",
                "CLOSED",
            ]
        ).count(),
    }


# ============================================================
# HR / PAYROLL
# ============================================================


def get_hr_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    today = timezone.localdate()

    employees = get_scoped_employees(user)

    attendance = get_scoped_attendance(user).filter(
        date=today
    )

    leave_requests = get_scoped_leave_requests(user).filter(
        created_at__date__range=(
            start_date,
            end_date,
        )
    )

    payrolls = get_scoped_payroll(user).filter(
        created_at__date__range=(
            start_date,
            end_date,
        )
    )

    advances = SalaryAdvance.objects.filter(
        employee__in=employees
    )

    outstanding_advances = ZERO

    for advance in advances.exclude(
        status__in=[
            "REJECTED",
            "RECOVERED",
            "CANCELLED",
        ]
    ):
        outstanding_advances += max(
            (advance.approved_amount or ZERO)
            - (advance.recovered_amount or ZERO),
            ZERO,
        )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "total_employees": employees.count(),
        "active_employees": employees.filter(
            employment_status="ACTIVE"
        ).count(),
        "employment_status_breakdown": _count_by(
            employees,
            "employment_status",
        ),
        "attendance_today": _count_by(
            attendance,
            "status",
        ),
        "pending_leave_requests": (
            get_scoped_leave_requests(user)
            .filter(status="PENDING")
            .count()
        ),
        "leave_status_breakdown": _count_by(
            leave_requests,
            "status",
        ),
        "payroll_status_breakdown": _count_by(
            payrolls,
            "status",
        ),
        "payroll_total": _sum(
            payrolls.exclude(status="CANCELLED"),
            "net_salary",
        ),
        "payroll_paid": _sum(
            payrolls.filter(status="PAID"),
            "net_salary",
        ),
        "salary_advance_outstanding": (
            outstanding_advances
        ),
    }


# ============================================================
# FINANCE
# ============================================================


def get_finance_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    all_scoped_transactions = (
        get_scoped_financial_transactions(user)
    )

    posted = all_scoped_transactions.filter(
        status="POSTED",
        transaction_date__range=(
            start_date,
            end_date,
        ),
    )

    income = _sum(
        posted.filter(transaction_type="CREDIT"),
        "amount",
    )

    expenses_total = _sum(
        posted.filter(transaction_type="DEBIT"),
        "amount",
    )

    account_ids = all_scoped_transactions.values_list(
        "account_id",
        flat=True,
    ).distinct()

    accounts = FinancialAccount.objects.filter(
        id__in=account_ids,
        is_active=True,
    )

    account_balances = []
    total_balance = ZERO

    for account in accounts:
        account_transactions = (
            all_scoped_transactions.filter(
                account=account,
                status="POSTED",
            )
        )

        credits = _sum(
            account_transactions.filter(
                transaction_type="CREDIT"
            ),
            "amount",
        )

        debits = _sum(
            account_transactions.filter(
                transaction_type="DEBIT"
            ),
            "amount",
        )

        balance = (
            account.opening_balance
            + credits
            - debits
        )

        total_balance += balance

        account_balances.append(
            {
                "account_id": str(account.id),
                "code": account.code,
                "name": account.name,
                "type": account.account_type,
                "balance": balance,
            }
        )

    scoped_admissions = get_scoped_admissions(user)

    fees = AdmissionFee.objects.filter(
        admission__in=scoped_admissions
    )

    payments = AdmissionPayment.objects.filter(
        admission__in=scoped_admissions
    )

    student_receivables = max(
        _sum(fees, "amount")
        - _sum(payments, "amount"),
        ZERO,
    )

    university_outstanding = ZERO

    university_payables = UniversityPayable.objects.filter(
        admission__in=scoped_admissions
    ).exclude(
        status__in=[
            "PAID",
            "CANCELLED",
        ]
    )

    for payable in university_payables:
        university_outstanding += max(
            payable.amount - payable.paid_amount,
            ZERO,
        )

    operational_outstanding = ZERO

    for expense in get_scoped_expenses(user).exclude(
        status__in=[
            "PAID",
            "REJECTED",
            "CANCELLED",
        ]
    ):
        operational_outstanding += max(
            expense.amount - expense.paid_amount,
            ZERO,
        )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "period_income": income,
        "period_expenses": expenses_total,
        "period_net_cash_flow": (
            income - expenses_total
        ),
        "total_cash_and_bank_balance": total_balance,
        "account_balances": account_balances,
        "student_receivables": student_receivables,
        "university_outstanding": (
            university_outstanding
        ),
        "operational_expense_outstanding": (
            operational_outstanding
        ),
        "transaction_source_breakdown": _count_by(
            posted,
            "source_type",
        ),
    }


# ============================================================
# MANAGEMENT COMMAND CENTRE
# ============================================================


def get_management_dashboard(user, start_date=None, end_date=None):
    start_date, end_date = _normalize_dates(
        start_date,
        end_date,
    )

    marketing = get_marketing_dashboard(
        user,
        start_date,
        end_date,
    )

    telecalling = get_telecalling_dashboard(
        user,
        start_date,
        end_date,
    )

    admissions = get_admission_dashboard(
        user,
        start_date,
        end_date,
    )

    education = get_education_dashboard(
        user,
        start_date,
        end_date,
    )

    partners = get_partner_dashboard(
        user,
        start_date,
        end_date,
    )

    hr = get_hr_dashboard(
        user,
        start_date,
        end_date,
    )

    finance = get_finance_dashboard(
        user,
        start_date,
        end_date,
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },

        "organization": {
            "leads": marketing["total_leads"],
            "lead_conversion_rate": (
                marketing["conversion_rate"]
            ),
            "admissions": (
                admissions["total_admissions"]
            ),
            "completed_admissions": (
                admissions["completed_admissions"]
            ),
            "active_students": (
                education["active_students"]
            ),
            "active_partners": (
                partners["active_partners"]
            ),
            "active_employees": (
                hr["active_employees"]
            ),
        },

        "revenue": {
            "booked_fees": (
                admissions["booked_fees"]
            ),
            "collections": (
                admissions["collections"]
            ),
            "student_receivables": (
                finance["student_receivables"]
            ),
            "cash_and_bank_balance": (
                finance[
                    "total_cash_and_bank_balance"
                ]
            ),
            "period_income": (
                finance["period_income"]
            ),
            "period_expenses": (
                finance["period_expenses"]
            ),
            "period_net_cash_flow": (
                finance["period_net_cash_flow"]
            ),
        },

        "exceptions": {
            "telecalling_followups_overdue": (
                telecalling["overdue_follow_up"]
            ),
            "education_process_overdue": (
                education["overdue_processes"]
            ),
            "partner_urgent_issues": (
                partners["urgent_issues"]
            ),
            "pending_leave_requests": (
                hr["pending_leave_requests"]
            ),
            "university_outstanding": (
                finance["university_outstanding"]
            ),
            "operational_expense_outstanding": (
                finance[
                    "operational_expense_outstanding"
                ]
            ),
        },

        "marketing": marketing,
        "telecalling": telecalling,
        "admissions": admissions,
        "education": education,
        "partners": partners,
        "hr": hr,
        "finance": finance,
    }
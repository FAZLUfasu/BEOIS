from django.db.models import Q

from accounts.models import UserRole

from leads.models import Lead, CallLog
from admissions.models import Admission
from students.models import Student, StudentProcess
from partners.models import Partner, PartnerCase, PartnerIssue
from hr.models import Employee, Attendance, LeaveRequest, Payroll
from finance.models import FinancialTransaction, Expense


# ============================================================
# USER / ROLE HELPERS
# ============================================================


def _active_assignments(user):
    if not user or not user.is_authenticated or not user.is_active:
        return UserRole.objects.none()

    return (
        UserRole.objects
        .filter(
            user=user,
            is_active=True,
            role__is_active=True,
        )
        .select_related(
            "role",
            "business_unit",
            "branch",
            "department",
        )
    )


def _is_superuser(user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and user.is_superuser
    )


def get_role_codes(user):
    if _is_superuser(user):
        return {"SUPERUSER"}

    return set(
        _active_assignments(user)
        .values_list(
            "role__code",
            flat=True,
        )
    )


def has_any_role(user, *role_codes):
    if _is_superuser(user):
        return True

    roles = get_role_codes(user)

    return bool(
        roles.intersection(
            set(role_codes)
        )
    )


def _department_names(user):
    if _is_superuser(user):
        return set()

    return {
        name.strip().lower()
        for name in (
            _active_assignments(user)
            .exclude(department__isnull=True)
            .values_list(
                "department__name",
                flat=True,
            )
        )
        if name
    }


def _has_department(user, *names):
    departments = _department_names(user)

    expected = {
        name.strip().lower()
        for name in names
    }

    return bool(
        departments.intersection(expected)
    )


# ============================================================
# DASHBOARD ACCESS PERMISSIONS
# ============================================================


def can_view_management_dashboard(user):
    return has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
    )


def can_view_marketing_dashboard(user):
    if has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "MARKETING",
    ):
        return True

    if has_any_role(
        user,
        "DEPARTMENT_HEAD",
        "MANAGER",
    ):
        return _has_department(
            user,
            "Marketing",
        )

    return False


def can_view_telecalling_dashboard(user):
    if has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "TELECALLER",
    ):
        return True

    if has_any_role(
        user,
        "DEPARTMENT_HEAD",
        "MANAGER",
    ):
        return _has_department(
            user,
            "Marketing",
            "Telecalling",
        )

    return False


def can_view_admission_dashboard(user):
    if has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "ADMISSION",
    ):
        return True

    if has_any_role(
        user,
        "DEPARTMENT_HEAD",
        "MANAGER",
    ):
        return _has_department(
            user,
            "Admission Management",
        )

    return False


def can_view_education_dashboard(user):
    if has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "EDUCATION_PROCESS",
    ):
        return True

    if has_any_role(
        user,
        "DEPARTMENT_HEAD",
        "MANAGER",
    ):
        return _has_department(
            user,
            "Education Process Management",
        )

    return False


def can_view_partner_dashboard(user):
    if has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "PARTNER_NETWORK",
    ):
        return True

    if has_any_role(
        user,
        "DEPARTMENT_HEAD",
        "MANAGER",
    ):
        return _has_department(
            user,
            "Partner Network",
        )

    return False


def can_view_hr_dashboard(user):
    return has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "HR",
    )


def can_view_finance_dashboard(user):
    return has_any_role(
        user,
        "SUPER_ADMIN",
        "CHAIRMAN",
        "GENERAL_MANAGER",
        "FINANCE",
    )


# ============================================================
# EMPLOYEE HELPERS
# ============================================================


def get_user_employee(user):
    if not user or not user.is_authenticated:
        return None

    try:
        return user.employee_profile

    except (
        Employee.DoesNotExist,
        AttributeError,
    ):
        return (
            Employee.objects
            .filter(user=user)
            .first()
        )


def _employee_ids_for_assignment(
    assignment,
    user,
):
    employees = Employee.objects.all()

    scope = assignment.scope_type

    if scope == UserRole.ScopeType.ORGANIZATION:
        return employees.values_list(
            "id",
            flat=True,
        )

    if scope == UserRole.ScopeType.BUSINESS_UNIT:
        return (
            employees
            .filter(
                branch__business_unit=(
                    assignment.business_unit
                )
            )
            .values_list(
                "id",
                flat=True,
            )
        )

    if scope == UserRole.ScopeType.BRANCH:
        return (
            employees
            .filter(
                branch=assignment.branch
            )
            .values_list(
                "id",
                flat=True,
            )
        )

    if scope == UserRole.ScopeType.DEPARTMENT:
        qs = employees.filter(
            department=assignment.department
        )

        if assignment.branch_id:
            qs = qs.filter(
                branch=assignment.branch
            )

        if assignment.business_unit_id:
            qs = qs.filter(
                branch__business_unit=(
                    assignment.business_unit
                )
            )

        return qs.values_list(
            "id",
            flat=True,
        )

    employee = get_user_employee(user)

    if not employee:
        return (
            employees
            .none()
            .values_list(
                "id",
                flat=True,
            )
        )

    if scope == UserRole.ScopeType.TEAM:
        return (
            employees
            .filter(
                reporting_manager=employee
            )
            .values_list(
                "id",
                flat=True,
            )
        )

    if scope == UserRole.ScopeType.OWN:
        return (
            employees
            .filter(
                id=employee.id
            )
            .values_list(
                "id",
                flat=True,
            )
        )

    return (
        employees
        .none()
        .values_list(
            "id",
            flat=True,
        )
    )


def get_scoped_employee_ids(user):
    if _is_superuser(user):
        return Employee.objects.values_list(
            "id",
            flat=True,
        )

    assignments = _active_assignments(user)

    employee_ids = set()

    own_employee = get_user_employee(user)

    for assignment in assignments:
        ids = _employee_ids_for_assignment(
            assignment,
            user,
        )

        employee_ids.update(ids)

        if (
            assignment.scope_type
            == UserRole.ScopeType.TEAM
            and own_employee
        ):
            employee_ids.add(
                own_employee.id
            )

    return employee_ids


# ============================================================
# LEADS / CALLS
# ============================================================


def get_scoped_leads(user):
    if _is_superuser(user):
        return Lead.objects.all()

    assignments = _active_assignments(user)

    if not assignments.exists():
        return Lead.objects.none()

    allowed_user_ids = set()

    for assignment in assignments:
        scope = assignment.scope_type

        if scope == UserRole.ScopeType.ORGANIZATION:
            return Lead.objects.all()

        if scope == UserRole.ScopeType.BUSINESS_UNIT:
            employee_ids = (
                Employee.objects
                .filter(
                    branch__business_unit=(
                        assignment.business_unit
                    )
                )
                .exclude(
                    user__isnull=True
                )
                .values_list(
                    "user_id",
                    flat=True,
                )
            )

            allowed_user_ids.update(
                employee_ids
            )

        elif scope == UserRole.ScopeType.BRANCH:
            employee_ids = (
                Employee.objects
                .filter(
                    branch=assignment.branch
                )
                .exclude(
                    user__isnull=True
                )
                .values_list(
                    "user_id",
                    flat=True,
                )
            )

            allowed_user_ids.update(
                employee_ids
            )

        elif scope == UserRole.ScopeType.DEPARTMENT:
            employee_qs = (
                Employee.objects
                .filter(
                    department=(
                        assignment.department
                    )
                )
            )

            if assignment.branch_id:
                employee_qs = (
                    employee_qs.filter(
                        branch=assignment.branch
                    )
                )

            if assignment.business_unit_id:
                employee_qs = (
                    employee_qs.filter(
                        branch__business_unit=(
                            assignment.business_unit
                        )
                    )
                )

            allowed_user_ids.update(
                employee_qs
                .exclude(
                    user__isnull=True
                )
                .values_list(
                    "user_id",
                    flat=True,
                )
            )

        elif scope == UserRole.ScopeType.TEAM:
            employee = get_user_employee(
                user
            )

            if employee:
                allowed_user_ids.add(
                    user.id
                )

                allowed_user_ids.update(
                    Employee.objects
                    .filter(
                        reporting_manager=employee
                    )
                    .exclude(
                        user__isnull=True
                    )
                    .values_list(
                        "user_id",
                        flat=True,
                    )
                )

        elif scope == UserRole.ScopeType.OWN:
            allowed_user_ids.add(
                user.id
            )

    if not allowed_user_ids:
        return Lead.objects.none()

    return Lead.objects.filter(
        assigned_to_id__in=(
            allowed_user_ids
        )
    )


def get_scoped_calls(user):
    leads = get_scoped_leads(user)

    return CallLog.objects.filter(
        lead__in=leads
    )


# ============================================================
# ADMISSIONS
# ============================================================


def get_scoped_admissions(user):
    if _is_superuser(user):
        return Admission.objects.all()

    assignments = _active_assignments(user)

    if not assignments.exists():
        return Admission.objects.none()

    for assignment in assignments:
        if (
            assignment.scope_type
            == UserRole.ScopeType.ORGANIZATION
        ):
            return Admission.objects.all()

    allowed_user_ids = set()

    for employee_id in get_scoped_employee_ids(
        user
    ):
        employee = (
            Employee.objects
            .filter(
                id=employee_id
            )
            .first()
        )

        if (
            employee
            and employee.user_id
        ):
            allowed_user_ids.add(
                employee.user_id
            )

    if (
        user
        and user.is_authenticated
    ):
        allowed_user_ids.add(
            user.id
        )

    if not allowed_user_ids:
        return Admission.objects.none()

    return Admission.objects.filter(
        assigned_to_id__in=(
            allowed_user_ids
        )
    )


# ============================================================
# STUDENTS / EDUCATION PROCESS
# ============================================================


def get_scoped_students(user):
    if _is_superuser(user):
        return Student.objects.all()

    assignments = _active_assignments(user)

    for assignment in assignments:
        if (
            assignment.scope_type
            == UserRole.ScopeType.ORGANIZATION
        ):
            return Student.objects.all()

    employee_ids = get_scoped_employee_ids(
        user
    )

    user_ids = (
        Employee.objects
        .filter(
            id__in=employee_ids
        )
        .exclude(
            user__isnull=True
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

    return Student.objects.filter(
        assigned_coordinator_id__in=(
            user_ids
        )
    )


def get_scoped_student_processes(user):
    if _is_superuser(user):
        return StudentProcess.objects.all()

    students = get_scoped_students(user)

    employee_ids = get_scoped_employee_ids(
        user
    )

    user_ids = (
        Employee.objects
        .filter(
            id__in=employee_ids
        )
        .exclude(
            user__isnull=True
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

    return (
        StudentProcess.objects
        .filter(
            Q(
                student__in=students
            )
            | Q(
                assigned_to_id__in=user_ids
            )
        )
        .distinct()
    )


# ============================================================
# PARTNER NETWORK
# ============================================================


def get_scoped_partners(user):
    if _is_superuser(user):
        return Partner.objects.all()

    assignments = _active_assignments(user)

    for assignment in assignments:
        if (
            assignment.scope_type
            == UserRole.ScopeType.ORGANIZATION
        ):
            return Partner.objects.all()

    employee_ids = get_scoped_employee_ids(
        user
    )

    user_ids = (
        Employee.objects
        .filter(
            id__in=employee_ids
        )
        .exclude(
            user__isnull=True
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

    return Partner.objects.filter(
        relationship_manager_id__in=(
            user_ids
        )
    )


def get_scoped_partner_cases(user):
    partners = get_scoped_partners(user)

    return PartnerCase.objects.filter(
        partner__in=partners
    )


def get_scoped_partner_issues(user):
    partners = get_scoped_partners(user)

    return PartnerIssue.objects.filter(
        partner__in=partners
    )


# ============================================================
# HR
# ============================================================


def get_scoped_employees(user):
    if _is_superuser(user):
        return Employee.objects.all()

    return Employee.objects.filter(
        id__in=get_scoped_employee_ids(
            user
        )
    )


def get_scoped_attendance(user):
    return Attendance.objects.filter(
        employee__in=get_scoped_employees(
            user
        )
    )


def get_scoped_leave_requests(user):
    return LeaveRequest.objects.filter(
        employee__in=get_scoped_employees(
            user
        )
    )


def get_scoped_payroll(user):
    return Payroll.objects.filter(
        employee__in=get_scoped_employees(
            user
        )
    )


# ============================================================
# FINANCE
# ============================================================


def get_scoped_financial_transactions(
    user
):
    if _is_superuser(user):
        return (
            FinancialTransaction.objects
            .all()
        )

    assignments = _active_assignments(
        user
    )

    result = (
        FinancialTransaction.objects
        .none()
    )

    for assignment in assignments:
        scope = assignment.scope_type

        if (
            scope
            == UserRole.ScopeType.ORGANIZATION
        ):
            return (
                FinancialTransaction.objects
                .all()
            )

        if (
            scope
            == UserRole.ScopeType.BUSINESS_UNIT
        ):
            result = (
                result
                | FinancialTransaction.objects
                .filter(
                    business_unit=(
                        assignment.business_unit
                    )
                )
            )

        elif (
            scope
            == UserRole.ScopeType.BRANCH
        ):
            result = (
                result
                | FinancialTransaction.objects
                .filter(
                    branch=assignment.branch
                )
            )

    return result.distinct()


def get_scoped_expenses(user):
    if _is_superuser(user):
        return Expense.objects.all()

    assignments = _active_assignments(
        user
    )

    result = Expense.objects.none()

    for assignment in assignments:
        scope = assignment.scope_type

        if (
            scope
            == UserRole.ScopeType.ORGANIZATION
        ):
            return Expense.objects.all()

        if (
            scope
            == UserRole.ScopeType.BUSINESS_UNIT
        ):
            result = (
                result
                | Expense.objects
                .filter(
                    business_unit=(
                        assignment.business_unit
                    )
                )
            )

        elif (
            scope
            == UserRole.ScopeType.BRANCH
        ):
            result = (
                result
                | Expense.objects
                .filter(
                    branch=assignment.branch
                )
            )

    return result.distinct()
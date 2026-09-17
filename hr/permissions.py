from rest_framework.permissions import BasePermission


MANAGEMENT_ROLES = {
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
}

HR_ROLES = {
    "HR",
}

FINANCE_ROLES = {
    "FINANCE",
}


def _has_any_role(user, role_codes):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return any(
        user.has_role(code)
        for code in role_codes
    )


def is_management(user):
    return _has_any_role(
        user,
        MANAGEMENT_ROLES,
    )


def is_hr(user):
    return _has_any_role(
        user,
        HR_ROLES,
    )


def is_finance(user):
    return _has_any_role(
        user,
        FINANCE_ROLES,
    )


def is_hr_or_management(user):
    return (
        is_hr(user)
        or is_management(user)
    )


def is_payroll_manager(user):
    return (
        is_hr(user)
        or is_finance(user)
        or is_management(user)
    )


class IsHRUser(BasePermission):
    def has_permission(self, request, view):
        return is_hr_or_management(
            request.user
        )


class IsPayrollManager(BasePermission):
    def has_permission(self, request, view):
        return is_payroll_manager(
            request.user
        )
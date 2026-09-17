from rest_framework.permissions import BasePermission


# ================================================================
# FINANCE ROLE DEFINITIONS
# ================================================================

FINANCE_READ_ROLES = (
    "FINANCE",
    "SUPER_ADMIN",
    "GENERAL_MANAGER",
    "CHAIRMAN",
)

FINANCE_MANAGE_ROLES = (
    "FINANCE",
    "SUPER_ADMIN",
    "GENERAL_MANAGER",
)

FINANCE_APPROVAL_ROLES = (
    "FINANCE",
    "SUPER_ADMIN",
    "GENERAL_MANAGER",
)

FINANCE_PAYMENT_ROLES = (
    "FINANCE",
    "SUPER_ADMIN",
)


# ================================================================
# ROLE HELPERS
# ================================================================


def _authenticated_active_user(user):
    """
    Return True only for an authenticated and active user.
    """

    return bool(
        user
        and user.is_authenticated
        and user.is_active
    )


def _has_any_role(user, role_codes):
    """
    Check BEOIS roles through the custom User.has_role()
    helper already provided by the accounts app.

    Superusers always pass.
    """

    if not _authenticated_active_user(user):
        return False

    if user.is_superuser:
        return True

    for role_code in role_codes:
        try:
            if user.has_role(role_code):
                return True
        except (AttributeError, TypeError):
            return False

    return False


def has_finance_access(user):
    """
    Read access to Finance.

    Finance:
        Full Finance visibility.

    General Manager:
        Management/reporting visibility.

    Chairman:
        Review/reporting visibility.

    Super Admin:
        Full access.
    """

    return _has_any_role(
        user,
        FINANCE_READ_ROLES,
    )


def can_manage_finance(user):
    """
    Create/manage operational Finance records.

    Chairman is intentionally excluded from routine
    operational Finance work.
    """

    return _has_any_role(
        user,
        FINANCE_MANAGE_ROLES,
    )


def can_approve_finance(user):
    """
    Approve supported Finance workflows.
    """

    return _has_any_role(
        user,
        FINANCE_APPROVAL_ROLES,
    )


def can_make_finance_payment(user):
    """
    Execute actual Finance payment/posting operations.

    Restricted to Finance and Super Admin.
    """

    return _has_any_role(
        user,
        FINANCE_PAYMENT_ROLES,
    )


# ================================================================
# DRF PERMISSIONS
# ================================================================


class HasFinanceAccess(BasePermission):

    message = "You do not have access to Finance."

    def has_permission(self, request, view):
        return has_finance_access(
            request.user
        )


class CanManageFinance(BasePermission):

    message = (
        "You do not have permission "
        "to manage Finance."
    )

    def has_permission(self, request, view):
        return can_manage_finance(
            request.user
        )


class CanApproveFinance(BasePermission):

    message = (
        "You do not have permission "
        "to approve financial records."
    )

    def has_permission(self, request, view):
        return can_approve_finance(
            request.user
        )


class CanMakeFinancePayment(BasePermission):

    message = (
        "You do not have permission "
        "to execute financial payments."
    )

    def has_permission(self, request, view):
        return can_make_finance_payment(
            request.user
        )
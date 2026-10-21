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


def _has_saved_permission(user, *permission_names):
    """Check permissions assigned through active BEOIS roles."""
    if not _authenticated_active_user(user):
        return False
    if user.is_superuser:
        return True
    if not hasattr(user, "get_role_permissions"):
        return False
    saved = user.get_role_permissions()
    return any(name in saved for name in permission_names)


def has_finance_access(user):
    """Allow Finance visibility when a saved Finance view permission exists."""
    return _has_saved_permission(
        user,
        "finance.view_expense",
        "finance.view_expensepayment",
        "finance.view_financeactivity",
        "finance.view_financialaccount",
        "finance.view_financialtransaction",
        "finance.view_transactioncategory",
        "finance.view_universitypayable",
        "finance.view_universitypayment",
    )


def can_manage_finance(user):
    """Allow routine Finance management when a saved add/change permission exists."""
    return _has_saved_permission(
        user,
        "finance.add_expense",
        "finance.change_expense",
        "finance.add_financeactivity",
        "finance.change_financeactivity",
        "finance.add_financialaccount",
        "finance.change_financialaccount",
        "finance.add_financialtransaction",
        "finance.change_financialtransaction",
        "finance.add_transactioncategory",
        "finance.change_transactioncategory",
        "finance.add_universitypayable",
        "finance.change_universitypayable",
    )


def can_approve_finance(user):
    """Expense approval requires an explicit saved approval permission."""
    return _has_saved_permission(
        user,
        "finance.approve_expense",
    )


def can_make_finance_payment(user):
    """Payment actions require an appropriate saved payment permission."""
    return _has_saved_permission(
        user,
        "finance.add_expensepayment",
        "finance.add_universitypayment",
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
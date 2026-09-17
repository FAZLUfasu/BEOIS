from rest_framework.permissions import BasePermission

from dashboard.selectors import (
    can_view_marketing_dashboard,
    can_view_telecalling_dashboard,
)


class CanAccessLeads(BasePermission):
    message = (
        "You do not have permission "
        "to access leads."
    )

    def has_permission(self, request, view):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        return (
            can_view_marketing_dashboard(user)
            or can_view_telecalling_dashboard(user)
        )


class CanManageLeadAssignment(BasePermission):
    message = (
        "You do not have permission "
        "to assign leads."
    )

    def has_permission(self, request, view):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        if user.is_superuser:
            return True

        if hasattr(user, "has_role"):
            return (
                user.has_role("SUPER_ADMIN")
                or user.has_role("GENERAL_MANAGER")
                or user.has_role("MARKETING")
                or user.has_role("MANAGER")
                or user.has_role("DEPARTMENT_HEAD")
            )

        return False


class CanImportMarketingLeads(BasePermission):
    """
    Uploading marketing lead sheets belongs to Marketing.

    Management roles may also perform imports when required.
    Telecallers can work with imported leads through the normal
    Lead API but do not automatically receive import permission.
    """

    message = (
        "You do not have permission "
        "to import marketing leads."
    )

    def has_permission(self, request, view):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        if user.is_superuser:
            return True

        if not hasattr(user, "has_role"):
            return False

        return (
            user.has_role("SUPER_ADMIN")
            or user.has_role("GENERAL_MANAGER")
            or user.has_role("MARKETING")
            or user.has_role("MANAGER")
            or user.has_role("DEPARTMENT_HEAD")
        )
from rest_framework.permissions import BasePermission

from dashboard.selectors import (
    can_view_marketing_dashboard,
    can_view_telecalling_dashboard,
)


class CanAccessLeads(BasePermission):
    message = "You do not have permission to access leads."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_superuser:
            return True
        if not hasattr(user, "get_role_permissions"):
            return False
        permissions = user.get_role_permissions()
        return (
            can_view_marketing_dashboard(user)
            or can_view_telecalling_dashboard(user)
            or any(
                permission in permissions
                for permission in (
                    "leads.view_lead",
                    "leads.view_calllog",
                    "leads.view_leadactivity",
                    "leads.view_leadappointment",
                    "leads.view_leadimportbatch",
                    "leads.view_leadimportrow",
                    "leads.view_leadqualification",
                )
            )
        )


class CanDeleteLead(BasePermission):
    message = (
        "You do not have permission "
        "to delete leads."
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

        if not hasattr(user, "get_role_permissions"):
            return False

        return (
            "leads.delete_lead"
            in user.get_role_permissions()
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

        if not hasattr(user, "has_role_permission"):
            return False

        return user.has_role_permission(
            "leads.change_lead"
        )


class CanImportMarketingLeads(BasePermission):
    """Require saved permissions for lead-import operations."""

    message = "You do not have permission to import marketing leads."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_superuser:
            return True
        if not hasattr(user, "get_role_permissions"):
            return False

        permissions = user.get_role_permissions()
        return (
            "leads.add_leadimportbatch" in permissions
            or "leads.add_leadimportrow" in permissions
        )

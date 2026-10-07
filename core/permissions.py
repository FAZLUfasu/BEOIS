from rest_framework.permissions import BasePermission, SAFE_METHODS


MANAGEMENT_ROLES = {
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
}


class SystemSettingsPermission(BasePermission):
    """
    System Settings access.

    View:
        SUPER_ADMIN
        CHAIRMAN
        GENERAL_MANAGER
        Django superuser

    Modify:
        SUPER_ADMIN
        Django superuser

    Other authenticated users:
        No access.
    """

    message = (
        "You do not have permission to access system settings."
    )

    def has_permission(self, request, view):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        # Django superuser has unrestricted access.
        if user.is_superuser:
            return True

        # System settings are restricted to management roles.
        if not any(
            user.has_role(role_code)
            for role_code in MANAGEMENT_ROLES
        ):
            return False

        # SUPER_ADMIN may modify settings.
        if request.method not in SAFE_METHODS:
            return user.has_role("SUPER_ADMIN")

        # Management users may view settings.
        return True
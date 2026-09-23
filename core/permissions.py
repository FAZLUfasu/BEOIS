from rest_framework.permissions import BasePermission, SAFE_METHODS


MANAGEMENT_ROLES = {
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
}


class SystemSettingsPermission(BasePermission):
    """
    Any authenticated user may read system settings.

    Only management roles or Django superusers may modify them.
    """

    message = (
        "Only authorized management users can modify system settings."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        if user.is_superuser:
            return True

        role = getattr(user, "role", None)

        return role in MANAGEMENT_ROLES
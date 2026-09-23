from rest_framework.permissions import BasePermission


MANAGEMENT_ROLES = {
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
}


def is_management_user(user):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return user.role_assignments.filter(
        role__code__in=MANAGEMENT_ROLES,
        role__is_active=True,
        is_active=True,
    ).exists()


class CanManageTasks(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in {
            "GET",
            "HEAD",
            "OPTIONS",
        }:
            return True

        return is_management_user(request.user)
    
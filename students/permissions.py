from rest_framework.permissions import BasePermission

from dashboard.selectors import (
    can_view_education_dashboard,
)


class CanAccessStudents(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return can_view_education_dashboard(user)


class CanManageStudents(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not hasattr(user, "has_role"):
            return False

        return (
            user.has_role("SUPER_ADMIN")
            or user.has_role("CHAIRMAN")
            or user.has_role("GENERAL_MANAGER")
            or user.has_role("EDUCATION_PROCESS")
            or user.has_role("MANAGER")
            or user.has_role("DEPARTMENT_HEAD")
        )
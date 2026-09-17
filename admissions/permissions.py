
from rest_framework.permissions import BasePermission

from dashboard.selectors import (
    can_view_admission_dashboard,
    can_view_finance_dashboard,
)


# ================================================================
# GENERAL ADMISSION ACCESS
# ================================================================


class CanAccessAdmissions(BasePermission):

    message = (
        "You do not have permission "
        "to access admissions."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        return can_view_admission_dashboard(
            user
        )


# ================================================================
# ADMISSION MANAGEMENT ACTIONS
# ================================================================


class CanManageAdmissions(BasePermission):

    message = (
        "You do not have permission "
        "to manage admissions."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        if user.is_superuser:
            return True

        if not hasattr(
            user,
            "has_role",
        ):
            return False

        return (
            user.has_role("SUPER_ADMIN")
            or user.has_role("CHAIRMAN")
            or user.has_role("GENERAL_MANAGER")
            or user.has_role("ADMISSION")
            or user.has_role("MANAGER")
            or user.has_role("DEPARTMENT_HEAD")
        )


# ================================================================
# FINANCIAL ADMISSION ACTIONS
# ================================================================


class CanManageAdmissionFinance(
    BasePermission
):

    message = (
        "You do not have permission "
        "to manage admission fees or payments."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        if (
            not user
            or not user.is_authenticated
            or not user.is_active
        ):
            return False

        if user.is_superuser:
            return True

        # Finance department / top management.
        if can_view_finance_dashboard(
            user
        ):
            return True

        # Admission staff must be able to operate
        # the admission fee collection workflow.
        if hasattr(
            user,
            "has_role",
        ):
            return (
                user.has_role("ADMISSION")
                or user.has_role("GENERAL_MANAGER")
                or user.has_role("SUPER_ADMIN")
            )

        return False
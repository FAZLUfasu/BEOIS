
from rest_framework.permissions import BasePermission

from dashboard.selectors import (
    can_view_admission_dashboard,
    can_view_finance_dashboard,
)


# ================================================================
# GENERAL ADMISSION ACCESS
# ================================================================


class CanAccessAdmissions(BasePermission):
    message = "You do not have permission to access admissions."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        if user.is_superuser:
            return True

        # Explicit permission for viewing the admissions workspace.
        if (
            hasattr(user, "has_role_permission")
            and user.has_role_permission("admissions.view_admission")
        ):
            return True

        # Preserve existing access for legacy admissions roles.
        return can_view_admission_dashboard(user)


# ================================================================
# ADMISSION MANAGEMENT ACTIONS
# ================================================================


class CanViewAcademicMasterData(BasePermission):
    message = (
        "You do not have permission "
        "to view academic master data."
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

        # Prefer assigned Django model permissions for academic data.
        if hasattr(user, "get_role_permissions"):
            permissions = user.get_role_permissions()
            if any(permission in permissions for permission in (
                "admissions.view_institution",
                "admissions.view_program",
                "admissions.view_programfeeplan",
                "admissions.view_programfeeinstallment",
                "admissions.view_programinternalfinance",
            )):
                return True

        # Keep the legacy role fallback for existing admissions workflows.
        if not hasattr(user, "has_role"):
            return False

        return (
            user.has_role("SUPER_ADMIN")
            or user.has_role("FULL_ACCESS")
            or user.has_role("CHAIRMAN")
            or user.has_role("GENERAL_MANAGER")
            or user.has_role("ADMISSION")
            or user.has_role("MANAGER")
            or user.has_role("DEPARTMENT_HEAD")
            or user.has_role("TELECALLER")
            or user.has_role("COUNSELOR")
        )




class CanManageAdmissions(BasePermission):
    message = "You do not have permission to manage admissions."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        if user.is_superuser:
            return True

        # Explicit permissions; do not grant management from view access alone.
        if hasattr(user, "has_role_permission") and any(
            user.has_role_permission(permission)
            for permission in (
                "admissions.add_admission",
                "admissions.change_admission",
            )
        ):
            return True

        # Backward compatibility for established operational roles.
        if not hasattr(user, "has_role"):
            return False

        return any(
            user.has_role(role)
            for role in (
                "SUPER_ADMIN",
                "FULL_ACCESS",
                "CHAIRMAN",
                "GENERAL_MANAGER",
                "ADMISSION",
                "MANAGER",
                "DEPARTMENT_HEAD",
            )
        )


class CanManageAcademicMasterData(BasePermission):
    """
    Require add and change permissions for every model written by the
    Academic Master Data importer.
    """

    message = (
        "You do not have permission "
        "to manage academic master data."
    )

    required_permissions = tuple(
        f"admissions.{action}_{model}"
        for model in (
            "institution",
            "program",
            "programfeeplan",
            "programfeeinstallment",
            "programinternalfinance",
        )
        for action in ("add", "change")
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

        return all(
            user.has_role_permission(permission)
            for permission in self.required_permissions
        )


# ================================================================
# FINANCIAL ADMISSION ACTIONS
# ================================================================


class CanManageAdmissionFinance(BasePermission):
    message = (
        "You do not have permission "
        "to manage admission fees or payments."
    )

    ACTION_PERMISSIONS = {
        ("fees", "GET"): ("admissions.view_admissionfee",),
        ("fees", "HEAD"): ("admissions.view_admissionfee",),
        ("fees", "OPTIONS"): ("admissions.view_admissionfee",),
        ("fees", "POST"): ("admissions.add_admissionfee",),
        ("payments", "GET"): ("admissions.view_admissionpayment",),
        ("payments", "HEAD"): ("admissions.view_admissionpayment",),
        ("payments", "OPTIONS"): ("admissions.view_admissionpayment",),
        ("payments", "POST"): ("admissions.add_admissionpayment",),
        ("fee_summary", "GET"): (
            "admissions.view_admissionfee",
            "admissions.view_admissionpayment",
        ),
        ("fee_summary", "HEAD"): (
            "admissions.view_admissionfee",
            "admissions.view_admissionpayment",
        ),
        ("fee_summary", "OPTIONS"): (
            "admissions.view_admissionfee",
            "admissions.view_admissionpayment",
        ),
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        if user.is_superuser:
            return True

        action = getattr(view, "action", None)
        method = request.method.upper()
        required_permissions = self.ACTION_PERMISSIONS.get((action, method))

        if not required_permissions:
            return False

        if not hasattr(user, "has_role_permission"):
            return False

        return all(
            user.has_role_permission(permission)
            for permission in required_permissions
        )

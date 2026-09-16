from rest_framework.permissions import BasePermission

from dashboard.selectors import (
    can_view_management_dashboard,
    can_view_marketing_dashboard,
    can_view_telecalling_dashboard,
    can_view_admission_dashboard,
    can_view_education_dashboard,
    can_view_partner_dashboard,
    can_view_hr_dashboard,
    can_view_finance_dashboard,
)


class DashboardPermission(BasePermission):
    dashboard_checker = None
    message = "You do not have permission to view this dashboard."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        checker = getattr(
            view,
            "dashboard_checker",
            self.dashboard_checker,
        )

        if checker is None:
            return False

        return checker(user)


class CanViewManagementDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_management_dashboard
    )


class CanViewMarketingDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_marketing_dashboard
    )


class CanViewTelecallingDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_telecalling_dashboard
    )


class CanViewAdmissionDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_admission_dashboard
    )


class CanViewEducationDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_education_dashboard
    )


class CanViewPartnerDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_partner_dashboard
    )


class CanViewHRDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_hr_dashboard
    )


class CanViewFinanceDashboard(DashboardPermission):
    dashboard_checker = staticmethod(
        can_view_finance_dashboard
    )
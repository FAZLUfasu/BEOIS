from datetime import datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.permissions import (
    CanViewManagementDashboard,
    CanViewMarketingDashboard,
    CanViewTelecallingDashboard,
    CanViewAdmissionDashboard,
    CanViewEducationDashboard,
    CanViewPartnerDashboard,
    CanViewHRDashboard,
    CanViewFinanceDashboard,
)

from dashboard.selectors import (
    get_role_codes,
    can_view_management_dashboard,
    can_view_marketing_dashboard,
    can_view_telecalling_dashboard,
    can_view_admission_dashboard,
    can_view_education_dashboard,
    can_view_partner_dashboard,
    can_view_hr_dashboard,
    can_view_finance_dashboard,
)

from dashboard.services import (
    get_management_dashboard,
    get_marketing_dashboard,
    get_telecalling_dashboard,
    get_admission_dashboard,
    get_education_dashboard,
    get_partner_dashboard,
    get_hr_dashboard,
    get_finance_dashboard,
)

from dashboard.intelligence import (
    get_intelligence_overview,
    get_intelligence_trends,
    get_institution_intelligence,
    get_partner_intelligence,
    get_staff_intelligence,
    get_financial_intelligence,
    get_exception_intelligence,
    get_task_intelligence,
)


# ============================================================
# DATE HELPERS
# ============================================================


def _parse_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        ).date()

    except ValueError as exc:
        raise ValueError(
            "Date must use YYYY-MM-DD format."
        ) from exc


def _get_date_range(request):
    try:
        start_date = _parse_date(
            request.query_params.get(
                "start_date"
            )
        )

        end_date = _parse_date(
            request.query_params.get(
                "end_date"
            )
        )

        return (
            start_date,
            end_date,
            None,
        )

    except ValueError as exc:
        return (
            None,
            None,
            Response(
                {
                    "detail": str(exc),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            ),
        )


# ============================================================
# COMMON DASHBOARD API VIEW
# ============================================================


class DashboardAPIView(APIView):
    service_function = None

    def get(self, request):
        (
            start_date,
            end_date,
            error,
        ) = _get_date_range(request)

        if error:
            return error

        data = self.service_function(
            request.user,
            start_date=start_date,
            end_date=end_date,
        )

        return Response(data)


# ============================================================
# MY DASHBOARD ACCESS
# ============================================================


class MyDashboardAccessView(APIView):
    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):
        user = request.user

        try:
            employee = (
                user.employee_profile
            )

        except Exception:
            employee = None

        employee_data = None

        if employee:
            employee_data = {
                "employee_id": (
                    employee.employee_id
                ),
                "name": (
                    employee.user.get_full_name()
                    or employee.user.username
                ),
                "designation": (
                    employee.current_designation
                ),
                "branch": (
                    employee.branch.name
                    if employee.branch
                    else None
                ),
                "department": (
                    employee.department.name
                    if employee.department
                    else None
                ),
            }

        return Response(
            {
                "user": {
                    "id": str(user.id),
                    "username": (
                        user.username
                    ),
                    "email": user.email,
                    "is_superuser": (
                        user.is_superuser
                    ),
                },

                "employee": employee_data,

                "roles": sorted(
                    get_role_codes(user)
                ),

                "dashboards": {
                    "management": (
                        can_view_management_dashboard(
                            user
                        )
                    ),
                    "marketing": (
                        can_view_marketing_dashboard(
                            user
                        )
                    ),
                    "telecalling": (
                        can_view_telecalling_dashboard(
                            user
                        )
                    ),
                    "admissions": (
                        can_view_admission_dashboard(
                            user
                        )
                    ),
                    "education": (
                        can_view_education_dashboard(
                            user
                        )
                    ),
                    "partners": (
                        can_view_partner_dashboard(
                            user
                        )
                    ),
                    "hr": (
                        can_view_hr_dashboard(
                            user
                        )
                    ),
                    "finance": (
                        can_view_finance_dashboard(
                            user
                        )
                    ),
                },
            }
        )


# ============================================================
# OPERATIONAL DASHBOARDS
# ============================================================


class ManagementDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewManagementDashboard
    ]

    service_function = staticmethod(
        get_management_dashboard
    )


class MarketingDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewMarketingDashboard
    ]

    service_function = staticmethod(
        get_marketing_dashboard
    )


class TelecallingDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewTelecallingDashboard
    ]

    service_function = staticmethod(
        get_telecalling_dashboard
    )


class AdmissionDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewAdmissionDashboard
    ]

    service_function = staticmethod(
        get_admission_dashboard
    )


class EducationDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewEducationDashboard
    ]

    service_function = staticmethod(
        get_education_dashboard
    )


class PartnerDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewPartnerDashboard
    ]

    service_function = staticmethod(
        get_partner_dashboard
    )


class HRDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewHRDashboard
    ]

    service_function = staticmethod(
        get_hr_dashboard
    )


class FinanceDashboardView(
    DashboardAPIView
):
    permission_classes = [
        CanViewFinanceDashboard
    ]

    service_function = staticmethod(
        get_finance_dashboard
    )


# ============================================================
# REPORTING & INTELLIGENCE V2
# ============================================================


class IntelligenceAPIView(
    DashboardAPIView
):
    """
    Management-level intelligence.

    These endpoints intentionally use the
    management dashboard permission rather
    than individual department permissions.
    """

    permission_classes = [
        CanViewManagementDashboard
    ]


class IntelligenceOverviewView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_intelligence_overview
    )


class IntelligenceTrendsView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_intelligence_trends
    )


class InstitutionIntelligenceView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_institution_intelligence
    )


class PartnerIntelligenceView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_partner_intelligence
    )


class StaffIntelligenceView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_staff_intelligence
    )


class FinancialIntelligenceView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_financial_intelligence
    )


class ExceptionIntelligenceView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_exception_intelligence
    )


class TaskIntelligenceView(
    IntelligenceAPIView
):
    service_function = staticmethod(
        get_task_intelligence
    )

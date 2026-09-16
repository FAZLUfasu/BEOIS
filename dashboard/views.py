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


def _parse_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        ).date()
    except ValueError:
        raise ValueError(
            "Date must use YYYY-MM-DD format."
        )


def _get_date_range(request):
    try:
        start_date = _parse_date(
            request.query_params.get("start_date")
        )

        end_date = _parse_date(
            request.query_params.get("end_date")
        )

        return start_date, end_date, None

    except ValueError as exc:
        return (
            None,
            None,
            Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )


class DashboardAPIView(APIView):
    service_function = None

    def get(self, request):
        start_date, end_date, error = _get_date_range(
            request
        )

        if error:
            return error

        data = self.service_function(
            request.user,
            start_date=start_date,
            end_date=end_date,
        )

        return Response(data)


class MyDashboardAccessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        employee = getattr(
            user,
            "employee_profile",
            None,
        )

        return Response(
            {
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "is_superuser": user.is_superuser,
                },

                "employee": (
                    {
                        "employee_id": employee.employee_id,
                        "name": employee.employee_name,
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
                    if employee
                    else None
                ),

                "roles": sorted(
                    get_role_codes(user)
                ),

                "dashboards": {
                    "management": (
                        can_view_management_dashboard(user)
                    ),
                    "marketing": (
                        can_view_marketing_dashboard(user)
                    ),
                    "telecalling": (
                        can_view_telecalling_dashboard(user)
                    ),
                    "admissions": (
                        can_view_admission_dashboard(user)
                    ),
                    "education": (
                        can_view_education_dashboard(user)
                    ),
                    "partners": (
                        can_view_partner_dashboard(user)
                    ),
                    "hr": (
                        can_view_hr_dashboard(user)
                    ),
                    "finance": (
                        can_view_finance_dashboard(user)
                    ),
                },
            }
        )


class ManagementDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewManagementDashboard,
    ]

    service_function = staticmethod(
        get_management_dashboard
    )


class MarketingDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewMarketingDashboard,
    ]

    service_function = staticmethod(
        get_marketing_dashboard
    )


class TelecallingDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewTelecallingDashboard,
    ]

    service_function = staticmethod(
        get_telecalling_dashboard
    )


class AdmissionDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewAdmissionDashboard,
    ]

    service_function = staticmethod(
        get_admission_dashboard
    )


class EducationDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewEducationDashboard,
    ]

    service_function = staticmethod(
        get_education_dashboard
    )


class PartnerDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewPartnerDashboard,
    ]

    service_function = staticmethod(
        get_partner_dashboard
    )


class HRDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewHRDashboard,
    ]

    service_function = staticmethod(
        get_hr_dashboard
    )


class FinanceDashboardView(DashboardAPIView):
    permission_classes = [
        IsAuthenticated,
        CanViewFinanceDashboard,
    ]

    service_function = staticmethod(
        get_finance_dashboard
    )
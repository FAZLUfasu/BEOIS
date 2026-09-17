from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceViewSet,
    DesignationViewSet,
    EmployeeViewSet,
    HRActivityViewSet,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    LeaveTypeViewSet,
    PayrollPeriodViewSet,
    PayrollViewSet,
    SalaryAdvanceViewSet,
    SalaryComponentViewSet,
    SalaryStructureViewSet,
)


router = DefaultRouter()

router.register(
    "designations",
    DesignationViewSet,
    basename="hr-designation",
)

router.register(
    "employees",
    EmployeeViewSet,
    basename="hr-employee",
)

router.register(
    "attendance",
    AttendanceViewSet,
    basename="hr-attendance",
)

router.register(
    "leave-types",
    LeaveTypeViewSet,
    basename="hr-leave-type",
)

router.register(
    "leave-balances",
    LeaveBalanceViewSet,
    basename="hr-leave-balance",
)

router.register(
    "leave-requests",
    LeaveRequestViewSet,
    basename="hr-leave-request",
)

router.register(
    "activities",
    HRActivityViewSet,
    basename="hr-activity",
)

router.register(
    "salary-components",
    SalaryComponentViewSet,
    basename="hr-salary-component",
)

router.register(
    "salary-structures",
    SalaryStructureViewSet,
    basename="hr-salary-structure",
)

router.register(
    "salary-advances",
    SalaryAdvanceViewSet,
    basename="hr-salary-advance",
)

router.register(
    "payroll-periods",
    PayrollPeriodViewSet,
    basename="hr-payroll-period",
)

router.register(
    "payrolls",
    PayrollViewSet,
    basename="hr-payroll",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]
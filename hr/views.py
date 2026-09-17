from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import (
    ModelViewSet,
    ReadOnlyModelViewSet,
)

from accounts.scopes import scope_employee_queryset

from .models import (
    Attendance,
    Designation,
    Employee,
    EmployeeLeaveBalance,
    EmployeeSalaryStructure,
    HRActivity,
    LeaveRequest,
    LeaveType,
    Payroll,
    PayrollPeriod,
    SalaryAdvance,
    SalaryComponent,
)

from .permissions import (
    is_finance,
    is_hr_or_management,
    is_management,
    is_payroll_manager,
)

from .serializers import (
    AddSalaryStructureComponentSerializer,
    AdjustAttendanceSerializer,
    AdjustLeaveBalanceSerializer,
    ApplyLeaveSerializer,
    ApproveLeaveSerializer,
    ApproveSalaryAdvanceSerializer,
    AttendanceSerializer,
    CancelLeaveSerializer,
    CheckInSerializer,
    CheckOutSerializer,
    CreatePayrollSerializer,
    DesignationSerializer,
    DisburseSalaryAdvanceSerializer,
    EmployeeLeaveBalanceSerializer,
    EmployeeSalaryStructureSerializer,
    EmployeeSerializer,
    HRActivitySerializer,
    InitializeLeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
    MarkAttendanceSerializer,
    PayPayrollSerializer,
    PayrollAdjustmentSerializer,
    PayrollAdvanceRecoverySerializer,
    PayrollPeriodSerializer,
    PayrollSerializer,
    RejectLeaveSerializer,
    RequestSalaryAdvanceSerializer,
    SalaryAdvanceSerializer,
    SalaryComponentSerializer,
)

from .services import (
    add_advance_recovery_to_payroll,
    add_payroll_bonus,
    add_payroll_deduction,
    add_payroll_incentive,
    add_salary_component,
    adjust_attendance,
    adjust_leave_balance,
    apply_leave,
    approve_leave,
    approve_payroll,
    approve_salary_advance,
    calculate_payroll,
    cancel_leave,
    check_in_employee,
    check_out_employee,
    close_payroll_period,
    create_employee_payroll,
    create_leave_type,
    create_payroll_period,
    create_salary_component,
    create_salary_structure,
    disburse_salary_advance,
    get_attendance_summary,
    get_payroll_summary,
    get_payslip_data,
    initialize_employee_leave_balances,
    initialize_leave_balance,
    mark_attendance,
    pay_payroll,
    reject_leave,
    request_salary_advance,
)


# ================================================================
# HELPERS
# ================================================================


def service_error_response(exc):
    if hasattr(exc, "message_dict"):
        data = exc.message_dict

    elif hasattr(exc, "messages"):
        data = {
            "detail": exc.messages
        }

    else:
        data = {
            "detail": str(exc)
        }

    return Response(
        data,
        status=status.HTTP_400_BAD_REQUEST,
    )


def scoped_employees(user):
    return scope_employee_queryset(
        user,
        Employee.objects.select_related(
            "user",
            "branch",
            "department",
            "designation_master",
            "reporting_manager",
        ),
    )


def get_request_employee(user):
    try:
        return user.employee_profile

    except Employee.DoesNotExist:
        return None


def employee_is_in_scope(user, employee):
    return scoped_employees(user).filter(
        pk=employee.pk
    ).exists()


def require_employee_scope(user, employee):
    if not employee_is_in_scope(
        user,
        employee,
    ):
        raise PermissionDenied(
            "Employee is outside your permitted scope."
        )


def resolve_self_or_requested_employee(
    request,
    employee=None,
):
    if employee is not None:
        if is_hr_or_management(request.user):
            require_employee_scope(
                request.user,
                employee,
            )
            return employee

        own_employee = get_request_employee(
            request.user
        )

        if (
            own_employee
            and own_employee.pk == employee.pk
        ):
            return employee

        raise PermissionDenied(
            "You can only perform this action for yourself."
        )

    own_employee = get_request_employee(
        request.user
    )

    if not own_employee:
        raise PermissionDenied(
            "No employee profile is linked to this user."
        )

    return own_employee


# ================================================================
# DESIGNATION
# ================================================================


class DesignationViewSet(ModelViewSet):

    serializer_class = DesignationSerializer
    permission_classes = [IsAuthenticated]

    queryset = Designation.objects.all()

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]

    def create(self, request, *args, **kwargs):
        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        return super().create(
            request,
            *args,
            **kwargs,
        )

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        return super().partial_update(
            request,
            *args,
            **kwargs,
        )


# ================================================================
# EMPLOYEE
# ================================================================


class EmployeeViewSet(ModelViewSet):

    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]

    def get_queryset(self):
        return scoped_employees(
            self.request.user
        )

    def create(self, request, *args, **kwargs):
        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        return super().create(
            request,
            *args,
            **kwargs,
        )

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        return super().partial_update(
            request,
            *args,
            **kwargs,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="me",
    )
    def me(self, request):

        employee = get_request_employee(
            request.user
        )

        if not employee:
            return Response(
                {
                    "detail": (
                        "No employee profile is linked "
                        "to this user."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            self.get_serializer(
                employee
            ).data
        )


# ================================================================
# ATTENDANCE
# ================================================================


class AttendanceViewSet(ReadOnlyModelViewSet):

    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        employees = scoped_employees(
            self.request.user
        )

        queryset = Attendance.objects.filter(
            employee__in=employees,
        ).select_related(
            "employee",
            "employee__user",
            "adjusted_by",
        )

        employee_id = self.request.query_params.get(
            "employee"
        )

        date_value = self.request.query_params.get(
            "date"
        )

        start_date = self.request.query_params.get(
            "start_date"
        )

        end_date = self.request.query_params.get(
            "end_date"
        )

        status_value = self.request.query_params.get(
            "status"
        )

        if employee_id:
            queryset = queryset.filter(
                employee_id=employee_id
            )

        if date_value:
            queryset = queryset.filter(
                date=date_value
            )

        if start_date:
            queryset = queryset.filter(
                date__gte=start_date
            )

        if end_date:
            queryset = queryset.filter(
                date__lte=end_date
            )

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        return queryset.order_by(
            "-date",
            "employee__employee_id",
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="mark",
    )
    def mark(self, request):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required "
                "to mark attendance manually."
            )

        serializer = MarkAttendanceSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = serializer.validated_data[
            "employee"
        ]

        require_employee_scope(
            request.user,
            employee,
        )

        try:
            attendance = mark_attendance(
                employee=employee,
                attendance_date=(
                    serializer.validated_data.get(
                        "date"
                    )
                ),
                status=serializer.validated_data.get(
                    "status",
                    Attendance.Status.PRESENT,
                ),
                check_in=serializer.validated_data.get(
                    "check_in"
                ),
                check_out=serializer.validated_data.get(
                    "check_out"
                ),
                remarks=serializer.validated_data.get(
                    "remarks",
                    "",
                ),
                performed_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            AttendanceSerializer(
                attendance
            ).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="check-in",
    )
    def check_in(self, request):

        serializer = CheckInSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = resolve_self_or_requested_employee(
            request,
            serializer.validated_data.get(
                "employee"
            ),
        )

        try:
            attendance = check_in_employee(
                employee=employee,
                check_in_time=(
                    serializer.validated_data.get(
                        "check_in_time"
                    )
                ),
                performed_by=request.user,
                remarks=serializer.validated_data.get(
                    "remarks",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            AttendanceSerializer(
                attendance
            ).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="check-out",
    )
    def check_out(self, request):

        serializer = CheckOutSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = resolve_self_or_requested_employee(
            request,
            serializer.validated_data.get(
                "employee"
            ),
        )

        try:
            attendance = check_out_employee(
                employee=employee,
                check_out_time=(
                    serializer.validated_data.get(
                        "check_out_time"
                    )
                ),
                performed_by=request.user,
                remarks=serializer.validated_data.get(
                    "remarks",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            AttendanceSerializer(
                attendance
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="adjust",
    )
    def adjust(self, request, pk=None):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        attendance = self.get_object()

        serializer = AdjustAttendanceSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            attendance = adjust_attendance(
                attendance=attendance,
                status=serializer.validated_data.get(
                    "status"
                ),
                check_in=serializer.validated_data.get(
                    "check_in"
                ),
                check_out=serializer.validated_data.get(
                    "check_out"
                ),
                remarks=serializer.validated_data.get(
                    "remarks",
                    "",
                ),
                performed_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            AttendanceSerializer(
                attendance
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="daily",
    )
    def daily(self, request):

        date_value = request.query_params.get(
            "date"
        )

        queryset = self.get_queryset()

        if date_value:
            queryset = queryset.filter(
                date=date_value
            )
        else:
            queryset = queryset.filter(
                date=timezone.localdate()
            )

        return Response(
            AttendanceSerializer(
                queryset,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="missing",
    )
    def missing(self, request):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        date_value = request.query_params.get(
            "date"
        )

        if date_value:
            from datetime import date

            try:
                attendance_date = (
                    date.fromisoformat(date_value)
                )
            except ValueError:
                return Response(
                    {
                        "detail": (
                            "Invalid date. "
                            "Use YYYY-MM-DD."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            attendance_date = timezone.localdate()

        employees = scoped_employees(
            request.user
        ).filter(
            employment_status=(
                Employee.EmploymentStatus.ACTIVE
            )
        )

        recorded_ids = Attendance.objects.filter(
            date=attendance_date,
        ).values_list(
            "employee_id",
            flat=True,
        )

        missing = employees.exclude(
            id__in=recorded_ids
        )

        return Response(
            EmployeeSerializer(
                missing,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="summary",
    )
    def summary(self, request):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        date_value = request.query_params.get(
            "date"
        )

        if not date_value:
            attendance_date = timezone.localdate()

        else:
            from datetime import date

            try:
                attendance_date = date.fromisoformat(
                    date_value
                )
            except ValueError:
                return Response(
                    {
                        "detail": "Invalid date."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        employees = scoped_employees(
            request.user
        )

        queryset = Attendance.objects.filter(
            employee__in=employees,
            date=attendance_date,
        )

        data = {
            "date": attendance_date,
        }

        for value, _ in Attendance.Status.choices:
            data[value.lower()] = queryset.filter(
                status=value
            ).count()

        return Response(data)


# ================================================================
# LEAVE TYPES
# ================================================================


class LeaveTypeViewSet(ModelViewSet):

    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]

    queryset = LeaveType.objects.all()

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]

    def create(self, request, *args, **kwargs):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            leave_type = create_leave_type(
                name=data["name"],
                code=data["code"],
                default_days_per_year=data.get(
                    "default_days_per_year",
                    0,
                ),
                is_paid=data.get(
                    "is_paid",
                    True,
                ),
                carry_forward_allowed=data.get(
                    "carry_forward_allowed",
                    False,
                ),
                maximum_carry_forward=data.get(
                    "maximum_carry_forward",
                    0,
                ),
                requires_approval=data.get(
                    "requires_approval",
                    True,
                ),
                description=data.get(
                    "description",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            self.get_serializer(
                leave_type
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        return super().partial_update(
            request,
            *args,
            **kwargs,
        )


# ================================================================
# LEAVE BALANCES
# ================================================================


class LeaveBalanceViewSet(ReadOnlyModelViewSet):

    serializer_class = (
        EmployeeLeaveBalanceSerializer
    )

    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        employees = scoped_employees(
            self.request.user
        )

        queryset = (
            EmployeeLeaveBalance.objects.filter(
                employee__in=employees
            )
            .select_related(
                "employee",
                "employee__user",
                "leave_type",
            )
        )

        employee_id = self.request.query_params.get(
            "employee"
        )

        year = self.request.query_params.get(
            "year"
        )

        if employee_id:
            queryset = queryset.filter(
                employee_id=employee_id
            )

        if year:
            queryset = queryset.filter(
                year=year
            )

        return queryset

    @action(
        detail=False,
        methods=["post"],
        url_path="initialize",
    )
    def initialize(self, request):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        serializer = InitializeLeaveBalanceSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        employee = data["employee"]

        require_employee_scope(
            request.user,
            employee,
        )

        try:
            if data.get("leave_type"):
                balance = initialize_leave_balance(
                    employee=employee,
                    leave_type=data["leave_type"],
                    year=data.get("year"),
                    opening_balance=data.get(
                        "opening_balance",
                        0,
                    ),
                    allocated_days=data.get(
                        "allocated_days"
                    ),
                    performed_by=request.user,
                )

                return Response(
                    EmployeeLeaveBalanceSerializer(
                        balance
                    ).data
                )

            balances = (
                initialize_employee_leave_balances(
                    employee=employee,
                    year=data.get("year"),
                    performed_by=request.user,
                )
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            EmployeeLeaveBalanceSerializer(
                balances,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="adjust",
    )
    def adjust(self, request):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        serializer = AdjustLeaveBalanceSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        require_employee_scope(
            request.user,
            data["employee"],
        )

        try:
            balance = adjust_leave_balance(
                employee=data["employee"],
                leave_type=data["leave_type"],
                adjustment=data["adjustment"],
                year=data.get("year"),
                reason=data.get(
                    "reason",
                    "",
                ),
                performed_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            EmployeeLeaveBalanceSerializer(
                balance
            ).data
        )


# ================================================================
# LEAVE REQUESTS
# ================================================================


class LeaveRequestViewSet(ReadOnlyModelViewSet):

    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        employees = scoped_employees(
            self.request.user
        )

        queryset = LeaveRequest.objects.filter(
            employee__in=employees,
        ).select_related(
            "employee",
            "employee__user",
            "leave_type",
            "applied_by",
            "approved_by",
        )

        status_value = self.request.query_params.get(
            "status"
        )

        employee_id = self.request.query_params.get(
            "employee"
        )

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        if employee_id:
            queryset = queryset.filter(
                employee_id=employee_id
            )

        return queryset

    @action(
        detail=False,
        methods=["post"],
        url_path="apply",
    )
    def apply(self, request):

        serializer = ApplyLeaveSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        employee = resolve_self_or_requested_employee(
            request,
            data.get("employee"),
        )

        try:
            leave_request = apply_leave(
                employee=employee,
                leave_type=data["leave_type"],
                start_date=data["start_date"],
                end_date=data["end_date"],
                reason=data["reason"],
                day_type=data.get(
                    "day_type",
                    LeaveRequest.DayType.FULL_DAY,
                ),
                applied_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            LeaveRequestSerializer(
                leave_request
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="approve",
    )
    def approve(self, request, pk=None):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        leave_request = self.get_object()

        serializer = ApproveLeaveSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            leave_request = approve_leave(
                leave_request,
                approved_by=request.user,
                notes=serializer.validated_data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            LeaveRequestSerializer(
                leave_request
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="reject",
    )
    def reject(self, request, pk=None):

        if not is_hr_or_management(request.user):
            raise PermissionDenied(
                "HR permission is required."
            )

        leave_request = self.get_object()

        serializer = RejectLeaveSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            leave_request = reject_leave(
                leave_request,
                reason=serializer.validated_data[
                    "reason"
                ],
                rejected_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            LeaveRequestSerializer(
                leave_request
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="cancel",
    )
    def cancel(self, request, pk=None):

        leave_request = self.get_object()

        own_employee = get_request_employee(
            request.user
        )

        if not is_hr_or_management(request.user):
            if (
                not own_employee
                or leave_request.employee_id
                != own_employee.id
            ):
                raise PermissionDenied(
                    "You cannot cancel this leave request."
                )

        serializer = CancelLeaveSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            leave_request = cancel_leave(
                leave_request,
                cancelled_by=request.user,
                reason=serializer.validated_data.get(
                    "reason",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            LeaveRequestSerializer(
                leave_request
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="pending",
    )
    def pending(self, request):

        queryset = self.get_queryset().filter(
            status=LeaveRequest.Status.PENDING
        )

        return Response(
            LeaveRequestSerializer(
                queryset,
                many=True,
            ).data
        )


# ================================================================
# HR ACTIVITIES
# ================================================================


class HRActivityViewSet(ReadOnlyModelViewSet):

    serializer_class = HRActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        employees = scoped_employees(
            self.request.user
        )

        queryset = HRActivity.objects.filter(
            employee__in=employees,
        ).select_related(
            "employee",
            "employee__user",
            "performed_by",
        )

        employee_id = self.request.query_params.get(
            "employee"
        )

        if employee_id:
            queryset = queryset.filter(
                employee_id=employee_id
            )

        return queryset


# ================================================================
# SALARY COMPONENT MASTER
# ================================================================


class SalaryComponentViewSet(ModelViewSet):

    serializer_class = SalaryComponentSerializer
    permission_classes = [IsAuthenticated]

    queryset = SalaryComponent.objects.all()

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]

    def list(self, request, *args, **kwargs):
        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        return super().list(
            request,
            *args,
            **kwargs,
        )

    def retrieve(self, request, *args, **kwargs):
        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        return super().retrieve(
            request,
            *args,
            **kwargs,
        )

    def create(self, request, *args, **kwargs):

        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            component = create_salary_component(
                name=data["name"],
                code=data["code"],
                component_type=data[
                    "component_type"
                ],
                calculation_type=data.get(
                    "calculation_type",
                    SalaryComponent.CalculationType.FIXED,
                ),
                is_taxable=data.get(
                    "is_taxable",
                    False,
                ),
                affects_gross_salary=data.get(
                    "affects_gross_salary",
                    True,
                ),
                description=data.get(
                    "description",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            self.get_serializer(
                component
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        return super().partial_update(
            request,
            *args,
            **kwargs,
        )


# ================================================================
# SALARY STRUCTURES
# ================================================================


class SalaryStructureViewSet(ModelViewSet):

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    serializer_class = (
        EmployeeSalaryStructureSerializer
    )

    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        if not is_payroll_manager(
            self.request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        employees = scoped_employees(
            self.request.user
        )

        return (
            EmployeeSalaryStructure.objects.filter(
                employee__in=employees
            )
            .select_related(
                "employee",
                "employee__user",
                "created_by",
            )
            .prefetch_related(
                "components",
                "components__component",
            )
        )

    def create(self, request):

        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        serializer = (
            EmployeeSalaryStructureSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        employee = data["employee"]

        require_employee_scope(
            request.user,
            employee,
        )

        try:
            structure = create_salary_structure(
                employee=employee,
                effective_from=data[
                    "effective_from"
                ],
                base_salary=data[
                    "base_salary"
                ],
                name=data.get(
                    "name",
                    "Standard Salary Structure",
                ),
                effective_to=data.get(
                    "effective_to"
                ),
                notes=data.get(
                    "notes",
                    "",
                ),
                created_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            self.get_serializer(
                structure
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="components",
    )
    def components(self, request, pk=None):

        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        structure = self.get_object()

        serializer = (
            AddSalaryStructureComponentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            add_salary_component(
                salary_structure=structure,
                component=data["component"],
                amount=data.get(
                    "amount",
                    0,
                ),
                percentage=data.get(
                    "percentage",
                    0,
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        structure.refresh_from_db()

        return Response(
            self.get_serializer(
                structure
            ).data
        )


# ================================================================
# SALARY ADVANCES
# ================================================================


class SalaryAdvanceViewSet(ModelViewSet):

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    serializer_class = SalaryAdvanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        employees = scoped_employees(
            self.request.user
        )

        return SalaryAdvance.objects.filter(
            employee__in=employees,
        ).select_related(
            "employee",
            "employee__user",
            "requested_by",
            "approved_by",
        )

    def create(self, request):

        serializer = RequestSalaryAdvanceSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        employee = resolve_self_or_requested_employee(
            request,
            data.get("employee"),
        )

        try:
            advance = request_salary_advance(
                employee=employee,
                amount=data["amount"],
                reason=data.get(
                    "reason",
                    "",
                ),
                requested_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            self.get_serializer(
                advance
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="approve",
    )
    def approve(self, request, pk=None):

        if not is_payroll_manager(request.user):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        advance = self.get_object()

        serializer = ApproveSalaryAdvanceSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            advance = approve_salary_advance(
                advance,
                approved_amount=(
                    serializer.validated_data[
                        "approved_amount"
                    ]
                ),
                monthly_recovery_amount=(
                    serializer.validated_data[
                        "monthly_recovery_amount"
                    ]
                ),
                approved_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            self.get_serializer(
                advance
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="disburse",
    )
    def disburse(self, request, pk=None):

        if not (
            is_finance(request.user)
            or is_management(request.user)
        ):
            raise PermissionDenied(
                "Finance permission is required "
                "to disburse salary advances."
            )

        advance = self.get_object()

        serializer = (
            DisburseSalaryAdvanceSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            advance = disburse_salary_advance(
                advance,
                payment_reference=(
                    serializer.validated_data.get(
                        "payment_reference",
                        "",
                    )
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(exc)

        return Response(
            self.get_serializer(
                advance
            ).data
        )

# ================================================================
# PAYROLL PERIODS
# ================================================================


class PayrollPeriodViewSet(ModelViewSet):

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsAuthenticated]

    queryset = PayrollPeriod.objects.all()

    def list(self, request, *args, **kwargs):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        return super().list(
            request,
            *args,
            **kwargs,
        )

    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        return super().retrieve(
            request,
            *args,
            **kwargs,
        )

    def create(self, request):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        serializer = PayrollPeriodSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            period = create_payroll_period(
                year=data["year"],
                month=data["month"],
                start_date=data["start_date"],
                end_date=data["end_date"],
                created_by=request.user,
                notes=data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        return Response(
            PayrollPeriodSerializer(
                period
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # PERIOD SUMMARY
    # ============================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="summary",
    )
    def summary(
        self,
        request,
        pk=None,
    ):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        period = self.get_object()

        try:
            data = get_payroll_summary(
                period
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        return Response(
            data
        )

    # ============================================================
    # CLOSE PERIOD
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="close",
    )
    def close(
        self,
        request,
        pk=None,
    ):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        period = self.get_object()

        try:
            period = close_payroll_period(
                period,
                closed_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        period.refresh_from_db()

        return Response(
            PayrollPeriodSerializer(
                period
            ).data
        )
# ================================================================
# PAYROLL PERIODS
# ================================================================


class PayrollViewSet(ModelViewSet):

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]

    # ============================================================
    # QUERYSET / SECURITY
    # ============================================================

    def get_queryset(self):

        if not is_payroll_manager(
            self.request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        employees = scoped_employees(
            self.request.user
        )

        queryset = Payroll.objects.filter(
            employee__in=employees,
        ).select_related(
            "employee",
            "employee__user",
            "period",
            "salary_structure",
            "calculated_by",
            "approved_by",
            "paid_by",
        ).prefetch_related(
            "components",
            "activities",
        )

        employee_id = (
            self.request.query_params.get(
                "employee"
            )
        )

        period_id = (
            self.request.query_params.get(
                "period"
            )
        )

        status_value = (
            self.request.query_params.get(
                "status"
            )
        )

        if employee_id:
            queryset = queryset.filter(
                employee_id=employee_id
            )

        if period_id:
            queryset = queryset.filter(
                period_id=period_id
            )

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        return queryset.order_by(
            "-period__year",
            "-period__month",
            "employee__employee_id",
        )

    # ============================================================
    # CREATE PAYROLL
    # ============================================================

    def create(self, request):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required."
            )

        serializer = CreatePayrollSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        require_employee_scope(
            request.user,
            data["employee"],
        )

        try:
            payroll = create_employee_payroll(
                employee=data["employee"],
                period=data["period"],
                payable_days=data.get(
                    "payable_days"
                ),
                lop_days=data.get(
                    "lop_days",
                    0,
                ),
                created_by=request.user,
            )

            if data.get("notes"):
                payroll.notes = data["notes"]

                payroll.save(
                    update_fields=[
                        "notes",
                        "updated_at",
                    ]
                )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # ============================================================
    # CALCULATE PAYROLL
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="calculate",
    )
    def calculate(
        self,
        request,
        pk=None,
    ):

        payroll = self.get_object()

        try:
            payroll = calculate_payroll(
                payroll,
                calculated_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # INCENTIVE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="incentive",
    )
    def incentive(
        self,
        request,
        pk=None,
    ):

        payroll = self.get_object()

        serializer = (
            PayrollAdjustmentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            add_payroll_incentive(
                payroll=payroll,
                amount=data["amount"],
                name=(
                    data.get("name")
                    or "Performance Incentive"
                ),
                performed_by=request.user,
                notes=data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        # IMPORTANT:
        # Do NOT call calculate_payroll() here.
        # The adjustment service already recalculates
        # payroll totals without deleting the adjustment.

        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # BONUS
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="bonus",
    )
    def bonus(
        self,
        request,
        pk=None,
    ):

        payroll = self.get_object()

        serializer = (
            PayrollAdjustmentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            add_payroll_bonus(
                payroll=payroll,
                amount=data["amount"],
                name=(
                    data.get("name")
                    or "Bonus"
                ),
                performed_by=request.user,
                notes=data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        # Do NOT call calculate_payroll().
        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # MANUAL DEDUCTION
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="deduction",
    )
    def deduction(
        self,
        request,
        pk=None,
    ):

        payroll = self.get_object()

        serializer = (
            PayrollAdjustmentSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            add_payroll_deduction(
                payroll=payroll,
                amount=data["amount"],
                name=(
                    data.get("name")
                    or "Other Deduction"
                ),
                performed_by=request.user,
                notes=data.get(
                    "notes",
                    "",
                ),
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        # Do NOT call calculate_payroll().
        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # ADVANCE RECOVERY
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="advance-recovery",
    )
    def advance_recovery(
        self,
        request,
        pk=None,
    ):

        payroll = self.get_object()

        serializer = (
            PayrollAdvanceRecoverySerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            add_advance_recovery_to_payroll(
                payroll=payroll,
                advance=data["advance"],
                amount=data.get(
                    "amount"
                ),
                performed_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        # IMPORTANT:
        # The service recalculates payroll totals.
        # Advance.recovered_amount is intentionally
        # NOT changed until payroll is actually PAID.
        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # APPROVE PAYROLL
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="approve",
    )
    def approve(
        self,
        request,
        pk=None,
    ):

        if not is_payroll_manager(
            request.user
        ):
            raise PermissionDenied(
                "Payroll permission is required "
                "to approve payroll."
            )

        payroll = self.get_object()

        try:
            payroll = approve_payroll(
                payroll,
                approved_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # PAY PAYROLL
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="pay",
    )
    def pay(
        self,
        request,
        pk=None,
    ):

        if not (
            is_finance(request.user)
            or is_management(request.user)
        ):
            raise PermissionDenied(
                "Finance permission is required "
                "to pay payroll."
            )

        payroll = self.get_object()

        serializer = PayPayrollSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            payroll = pay_payroll(
                payroll,
                payment_method=(
                    serializer.validated_data[
                        "payment_method"
                    ]
                ),
                payment_reference=(
                    serializer.validated_data[
                        "payment_reference"
                    ]
                ),
                paid_by=request.user,
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        payroll.refresh_from_db()

        return Response(
            PayrollSerializer(
                payroll
            ).data
        )

    # ============================================================
    # PAYSLIP
    # ============================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="payslip",
    )
    def payslip(
        self,
        request,
        pk=None,
    ):

        payroll = self.get_object()

        try:
            data = get_payslip_data(
                payroll
            )

        except DjangoValidationError as exc:
            return service_error_response(
                exc
            )

        return Response(
            data
        )
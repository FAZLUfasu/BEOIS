from rest_framework import serializers

from .models import (
    Attendance,
    Designation,
    Employee,
    EmployeeLeaveBalance,
    EmployeeSalaryComponent,
    EmployeeSalaryStructure,
    HRActivity,
    LeaveRequest,
    LeaveType,
    Payroll,
    PayrollActivity,
    PayrollComponent,
    PayrollPeriod,
    SalaryAdvance,
    SalaryComponent,
)


# ================================================================
# DESIGNATION
# ================================================================


class DesignationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Designation
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# ================================================================
# EMPLOYEE
# ================================================================


class EmployeeSerializer(serializers.ModelSerializer):

    employee_name = serializers.CharField(
        read_only=True,
    )

    current_designation = serializers.CharField(
        read_only=True,
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    designation_master_name = serializers.CharField(
        source="designation_master.name",
        read_only=True,
    )

    reporting_manager_employee_id = serializers.CharField(
        source="reporting_manager.employee_id",
        read_only=True,
    )

    class Meta:
        model = Employee

        fields = [
            "id",
            "employee_id",
            "user",
            "employee_name",

            "branch",
            "branch_name",

            "department",
            "department_name",

            "designation",
            "designation_master",
            "designation_master_name",
            "current_designation",

            "reporting_manager",
            "reporting_manager_employee_id",

            "employment_type",
            "employment_status",
            "date_of_joining",
            "date_of_exit",

            "phone_number",
            "alternate_phone_number",
            "personal_email",
            "address",

            "emergency_contact_name",
            "emergency_contact_number",

            "notes",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "employee_id",
            "employee_name",
            "current_designation",
            "created_at",
            "updated_at",
        ]


# ================================================================
# ATTENDANCE
# ================================================================


class AttendanceSerializer(serializers.ModelSerializer):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    adjusted_by_email = serializers.EmailField(
        source="adjusted_by.email",
        read_only=True,
    )

    class Meta:
        model = Attendance

        fields = [
            "id",
            "employee",
            "employee_id",
            "employee_name",
            "date",
            "status",
            "status_display",
            "check_in",
            "check_out",
            "working_minutes",
            "late_minutes",
            "overtime_minutes",
            "remarks",
            "is_manually_adjusted",
            "adjusted_by",
            "adjusted_by_email",
            "adjusted_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


class MarkAttendanceSerializer(serializers.Serializer):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
    )

    date = serializers.DateField(
        required=False,
    )

    status = serializers.ChoiceField(
        choices=Attendance.Status.choices,
        default=Attendance.Status.PRESENT,
    )

    check_in = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    check_out = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    remarks = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class CheckInSerializer(serializers.Serializer):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
    )

    check_in_time = serializers.DateTimeField(
        required=False,
    )

    remarks = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class CheckOutSerializer(serializers.Serializer):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
    )

    check_out_time = serializers.DateTimeField(
        required=False,
    )

    remarks = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class AdjustAttendanceSerializer(serializers.Serializer):

    status = serializers.ChoiceField(
        choices=Attendance.Status.choices,
        required=False,
    )

    check_in = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    check_out = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    remarks = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ================================================================
# LEAVE TYPE
# ================================================================


class LeaveTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = LeaveType

        fields = [
            "id",
            "name",
            "code",
            "description",
            "default_days_per_year",
            "is_paid",
            "carry_forward_allowed",
            "maximum_carry_forward",
            "requires_approval",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# ================================================================
# LEAVE BALANCE
# ================================================================


class EmployeeLeaveBalanceSerializer(
    serializers.ModelSerializer
):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    leave_type_name = serializers.CharField(
        source="leave_type.name",
        read_only=True,
    )

    leave_type_code = serializers.CharField(
        source="leave_type.code",
        read_only=True,
    )

    available_days = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = EmployeeLeaveBalance

        fields = [
            "id",
            "employee",
            "employee_id",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "leave_type_code",
            "year",
            "opening_balance",
            "allocated_days",
            "used_days",
            "adjusted_days",
            "available_days",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


class InitializeLeaveBalanceSerializer(
    serializers.Serializer
):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
    )

    leave_type = serializers.PrimaryKeyRelatedField(
        queryset=LeaveType.objects.filter(
            is_active=True,
        ),
        required=False,
    )

    year = serializers.IntegerField(
        required=False,
    )

    opening_balance = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
        default=0,
    )

    allocated_days = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
    )


class AdjustLeaveBalanceSerializer(
    serializers.Serializer
):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
    )

    leave_type = serializers.PrimaryKeyRelatedField(
        queryset=LeaveType.objects.all(),
    )

    adjustment = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
    )

    year = serializers.IntegerField(
        required=False,
    )

    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ================================================================
# LEAVE REQUEST
# ================================================================


class LeaveRequestSerializer(serializers.ModelSerializer):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    leave_type_name = serializers.CharField(
        source="leave_type.name",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = LeaveRequest

        fields = [
            "id",
            "employee",
            "employee_id",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "start_date",
            "end_date",
            "day_type",
            "requested_days",
            "reason",
            "status",
            "status_display",
            "applied_by",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "requested_days",
            "status",
            "applied_by",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]


class ApplyLeaveSerializer(serializers.Serializer):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
    )

    leave_type = serializers.PrimaryKeyRelatedField(
        queryset=LeaveType.objects.filter(
            is_active=True,
        ),
    )

    start_date = serializers.DateField()

    end_date = serializers.DateField()

    day_type = serializers.ChoiceField(
        choices=LeaveRequest.DayType.choices,
        default=LeaveRequest.DayType.FULL_DAY,
    )

    reason = serializers.CharField()


class ApproveLeaveSerializer(serializers.Serializer):

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class RejectLeaveSerializer(serializers.Serializer):

    reason = serializers.CharField()


class CancelLeaveSerializer(serializers.Serializer):

    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ================================================================
# HR ACTIVITY
# ================================================================


class HRActivitySerializer(serializers.ModelSerializer):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    performed_by_email = serializers.EmailField(
        source="performed_by.email",
        read_only=True,
    )

    activity_type_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    class Meta:
        model = HRActivity

        fields = [
            "id",
            "employee",
            "employee_id",
            "employee_name",
            "activity_type",
            "activity_type_display",
            "description",
            "performed_by",
            "performed_by_email",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# SALARY COMPONENT
# ================================================================


class SalaryComponentSerializer(serializers.ModelSerializer):

    class Meta:
        model = SalaryComponent

        fields = [
            "id",
            "name",
            "code",
            "component_type",
            "calculation_type",
            "is_taxable",
            "affects_gross_salary",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# ================================================================
# EMPLOYEE SALARY COMPONENT
# ================================================================


class EmployeeSalaryComponentSerializer(
    serializers.ModelSerializer
):

    component_name = serializers.CharField(
        source="component.name",
        read_only=True,
    )

    component_code = serializers.CharField(
        source="component.code",
        read_only=True,
    )

    component_type = serializers.CharField(
        source="component.component_type",
        read_only=True,
    )

    calculation_type = serializers.CharField(
        source="component.calculation_type",
        read_only=True,
    )

    class Meta:
        model = EmployeeSalaryComponent

        fields = [
            "id",
            "salary_structure",
            "component",
            "component_name",
            "component_code",
            "component_type",
            "calculation_type",
            "amount",
            "percentage",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "salary_structure",
            "component_name",
            "component_code",
            "component_type",
            "calculation_type",
            "created_at",
            "updated_at",
        ]


# ================================================================
# SALARY STRUCTURE
# ================================================================


class EmployeeSalaryStructureSerializer(
    serializers.ModelSerializer
):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    components = EmployeeSalaryComponentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = EmployeeSalaryStructure

        fields = [
            "id",
            "employee",
            "employee_id",
            "employee_name",
            "name",
            "effective_from",
            "effective_to",
            "base_salary",
            "is_active",
            "notes",
            "created_by",
            "components",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "components",
            "created_at",
            "updated_at",
        ]


class AddSalaryStructureComponentSerializer(
    serializers.Serializer
):

    component = serializers.PrimaryKeyRelatedField(
        queryset=SalaryComponent.objects.filter(
            is_active=True,
        ),
    )

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default=0,
    )

    percentage = serializers.DecimalField(
        max_digits=7,
        decimal_places=4,
        required=False,
        default=0,
    )


# ================================================================
# SALARY ADVANCE
# ================================================================


class SalaryAdvanceSerializer(serializers.ModelSerializer):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    outstanding_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = SalaryAdvance

        fields = [
            "id",
            "employee",
            "employee_id",
            "employee_name",
            "requested_amount",
            "approved_amount",
            "recovered_amount",
            "monthly_recovery_amount",
            "outstanding_amount",
            "reason",
            "status",
            "requested_by",
            "approved_by",
            "approved_at",
            "disbursed_at",
            "payment_reference",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "approved_amount",
            "recovered_amount",
            "monthly_recovery_amount",
            "status",
            "requested_by",
            "approved_by",
            "approved_at",
            "disbursed_at",
            "payment_reference",
            "created_at",
            "updated_at",
        ]


class RequestSalaryAdvanceSerializer(
    serializers.Serializer
):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
    )

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class ApproveSalaryAdvanceSerializer(
    serializers.Serializer
):

    approved_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    monthly_recovery_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )


class DisburseSalaryAdvanceSerializer(
    serializers.Serializer
):

    payment_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ================================================================
# PAYROLL PERIOD
# ================================================================


class PayrollPeriodSerializer(serializers.ModelSerializer):

    class Meta:
        model = PayrollPeriod

        fields = [
            "id",
            "year",
            "month",
            "start_date",
            "end_date",
            "status",
            "notes",
            "created_by",
            "closed_by",
            "closed_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_by",
            "closed_by",
            "closed_at",
            "created_at",
            "updated_at",
        ]


# ================================================================
# PAYROLL COMPONENT
# ================================================================


class PayrollComponentSerializer(serializers.ModelSerializer):

    class Meta:
        model = PayrollComponent

        fields = [
            "id",
            "payroll",
            "salary_component",
            "code",
            "name",
            "component_type",
            "source_type",
            "amount",
            "notes",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# PAYROLL ACTIVITY
# ================================================================


class PayrollActivitySerializer(serializers.ModelSerializer):

    performed_by_email = serializers.EmailField(
        source="performed_by.email",
        read_only=True,
    )

    class Meta:
        model = PayrollActivity

        fields = [
            "id",
            "payroll",
            "activity_type",
            "description",
            "performed_by",
            "performed_by_email",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# PAYROLL
# ================================================================


class PayrollSerializer(serializers.ModelSerializer):

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
    )

    period_display = serializers.CharField(
        source="period.__str__",
        read_only=True,
    )

    components = PayrollComponentSerializer(
        many=True,
        read_only=True,
    )

    activities = PayrollActivitySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Payroll

        fields = [
            "id",
            "period",
            "period_display",
            "employee",
            "employee_id",
            "employee_name",
            "salary_structure",
            "status",

            "calendar_days",
            "payable_days",
            "present_days",
            "paid_leave_days",
            "unpaid_leave_days",
            "lop_days",

            "base_salary",
            "gross_earnings",
            "total_deductions",
            "lop_deduction",
            "advance_recovery",
            "net_salary",

            "calculated_by",
            "calculated_at",
            "approved_by",
            "approved_at",
            "paid_by",
            "paid_at",

            "payment_method",
            "payment_reference",
            "notes",

            "components",
            "activities",

            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


class CreatePayrollSerializer(serializers.Serializer):

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
    )

    period = serializers.PrimaryKeyRelatedField(
        queryset=PayrollPeriod.objects.all(),
    )

    payable_days = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
    )

    lop_days = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
        default=0,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class PayrollAdjustmentSerializer(serializers.Serializer):

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    name = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class PayrollAdvanceRecoverySerializer(
    serializers.Serializer
):

    advance = serializers.PrimaryKeyRelatedField(
        queryset=SalaryAdvance.objects.all(),
    )

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )


class PayPayrollSerializer(serializers.Serializer):

    payment_method = serializers.CharField()

    payment_reference = serializers.CharField()
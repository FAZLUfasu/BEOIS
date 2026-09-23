import re
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db import models, transaction
from organization.models import Branch, Department
from core.services import build_next_identifier


class Designation(models.Model):
    """
    Central designation master.

    Examples:
    - Telecaller
    - Telecalling Manager
    - Admission Executive
    - HR Manager
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=150,
        unique=True,
    )

    code = models.CharField(
        max_length=30,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Employee(models.Model):

    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        RESIGNED = "RESIGNED", "Resigned"
        TERMINATED = "TERMINATED", "Terminated"
        ON_LEAVE = "ON_LEAVE", "On Leave"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", "Full Time"
        PART_TIME = "PART_TIME", "Part Time"
        CONTRACT = "CONTRACT", "Contract"
        INTERN = "INTERN", "Intern"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # ---------------------------------------------------------
    # EMPLOYEE ID
    # ---------------------------------------------------------

    employee_id = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        editable=False,
    )

    # ---------------------------------------------------------
    # LOGIN ACCOUNT
    # ---------------------------------------------------------

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )

    # ---------------------------------------------------------
    # ORGANIZATION
    # ---------------------------------------------------------

    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="employees",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="employees",
    )

    # ---------------------------------------------------------
    # DESIGNATION
    # ---------------------------------------------------------

    # Existing text designation is temporarily kept
    # so current employee records are not damaged.
    designation = models.CharField(
        max_length=150,
        blank=True,
    )

    # New structured designation master.
    designation_master = models.ForeignKey(
        Designation,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="employees",
    )

    # ---------------------------------------------------------
    # REPORTING STRUCTURE
    # ---------------------------------------------------------

    reporting_manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="team_members",
    )

    # ---------------------------------------------------------
    # EMPLOYMENT
    # ---------------------------------------------------------

    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )

    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )

    date_of_joining = models.DateField(
        null=True,
        blank=True,
    )

    date_of_exit = models.DateField(
        null=True,
        blank=True,
    )

    # ---------------------------------------------------------
    # CONTACT DETAILS
    # ---------------------------------------------------------

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    alternate_phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    personal_email = models.EmailField(
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    # ---------------------------------------------------------
    # EMERGENCY CONTACT
    # ---------------------------------------------------------

    emergency_contact_name = models.CharField(
        max_length=150,
        blank=True,
    )

    emergency_contact_number = models.CharField(
        max_length=20,
        blank=True,
    )

    # ---------------------------------------------------------
    # OTHER INFORMATION
    # ---------------------------------------------------------

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["employee_id"]

        indexes = [
            models.Index(
                fields=["employee_id"],
                name="hr_employee_empid_idx",
            ),
            models.Index(
                fields=["employment_status"],
                name="hr_employee_status_idx",
            ),
            models.Index(
                fields=["branch", "department"],
                name="hr_employee_org_idx",
            ),
        ]

    # ---------------------------------------------------------
    # DISPLAY
    # ---------------------------------------------------------

    def __str__(self):
        name = self.employee_name

        if name:
            return f"{self.employee_id} - {name}"

        return self.employee_id or "Employee"

    @property
    def employee_name(self):
        if self.user:
            full_name = self.user.get_full_name().strip()

            if full_name:
                return full_name

            return self.user.username

        return ""

    @property
    def current_designation(self):
        """
        New designation master takes priority.

        The old text designation remains as a fallback
        while existing records are being migrated.
        """

        if self.designation_master:
            return self.designation_master.name

        return self.designation or ""

    # ---------------------------------------------------------
    # VALIDATION
    # ---------------------------------------------------------

    def clean(self):
        super().clean()

        # Department must belong to selected branch.
        if (
            self.branch_id
            and self.department_id
            and self.department.branch_id
            and self.department.branch_id != self.branch_id
        ):
            raise ValidationError(
            {
                "department": (
                    "The selected department belongs to a different branch."
                )
            }
        )

        # Employee cannot report to himself/herself.
        if (
            self.pk
            and self.reporting_manager_id
            and self.reporting_manager_id == self.pk
        ):
            raise ValidationError(
                {
                    "reporting_manager": (
                        "An employee cannot be their own reporting manager."
                    )
                }
            )

        # Exit date cannot be before joining date.
        if (
            self.date_of_joining
            and self.date_of_exit
            and self.date_of_exit < self.date_of_joining
        ):
            raise ValidationError(
                {
                    "date_of_exit": (
                        "Date of exit cannot be before date of joining."
                    )
                }
            )

    # ---------------------------------------------------------
    # EMPLOYEE ID GENERATION
    # ---------------------------------------------------------

    @staticmethod
    def generate_employee_id():
        """
        Generate the next Employee ID using BEOIS System Settings.

        This method should be called from inside transaction.atomic()
        when creating a new employee.
        """

        return build_next_identifier(
            Employee.objects.all(),
            "employee_id",
            "employee",
        )

    def save(self, *args, **kwargs):
        """
        Automatically generate an Employee ID for new employees.

        Existing employee IDs are permanently preserved.
        """

        self.full_clean(
            exclude=["employee_id"]
            if not self.employee_id
            else None
        )

        if not self.employee_id:
            with transaction.atomic():

                self.employee_id = self.generate_employee_id()

                super().save(
                    *args,
                    **kwargs,
                )
        else:
            super().save(
                *args,
                **kwargs,
            )
# ================================================================
# ATTENDANCE
# ================================================================


class Attendance(models.Model):

    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        HALF_DAY = "HALF_DAY", "Half Day"
        LATE = "LATE", "Late"
        WORK_FROM_HOME = "WORK_FROM_HOME", "Work From Home"
        ON_LEAVE = "ON_LEAVE", "On Leave"
        HOLIDAY = "HOLIDAY", "Holiday"
        WEEK_OFF = "WEEK_OFF", "Week Off"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )

    date = models.DateField()

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PRESENT,
    )

    check_in = models.DateTimeField(
        null=True,
        blank=True,
    )

    check_out = models.DateTimeField(
        null=True,
        blank=True,
    )

    working_minutes = models.PositiveIntegerField(
        default=0,
    )

    late_minutes = models.PositiveIntegerField(
        default=0,
    )

    overtime_minutes = models.PositiveIntegerField(
        default=0,
    )

    remarks = models.TextField(
        blank=True,
    )

    is_manually_adjusted = models.BooleanField(
        default=False,
    )

    adjusted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_adjustments",
    )

    adjusted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-date", "employee__employee_id"]

        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date"],
                name="unique_employee_daily_attendance",
            )
        ]

        indexes = [
            models.Index(
                fields=["employee", "date"],
                name="hr_att_emp_date_idx",
            ),
            models.Index(
                fields=["date", "status"],
                name="hr_att_date_status_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.date} - "
            f"{self.get_status_display()}"
        )

    def clean(self):
        super().clean()

        if (
            self.check_in
            and self.check_out
            and self.check_out < self.check_in
        ):
            raise ValidationError(
                {
                    "check_out": (
                        "Check-out cannot be before check-in."
                    )
                }
            )


# ================================================================
# LEAVE TYPE
# ================================================================


class LeaveType(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    code = models.CharField(
        max_length=30,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    default_days_per_year = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    is_paid = models.BooleanField(
        default=True,
    )

    carry_forward_allowed = models.BooleanField(
        default=False,
    )

    maximum_carry_forward = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    requires_approval = models.BooleanField(
        default=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()

        if self.default_days_per_year < 0:
            raise ValidationError(
                {
                    "default_days_per_year": (
                        "Default leave days cannot be negative."
                    )
                }
            )

        if self.maximum_carry_forward < 0:
            raise ValidationError(
                {
                    "maximum_carry_forward": (
                        "Maximum carry forward cannot be negative."
                    )
                }
            )


# ================================================================
# EMPLOYEE LEAVE BALANCE
# ================================================================


class EmployeeLeaveBalance(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )

    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="employee_balances",
    )

    year = models.PositiveIntegerField()

    opening_balance = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    allocated_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    used_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    adjusted_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-year",
            "employee__employee_id",
            "leave_type__name",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "employee",
                    "leave_type",
                    "year",
                ],
                name="unique_employee_leave_balance",
            )
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.leave_type.code} - "
            f"{self.year}"
        )

    @property
    def available_days(self):
        return (
            self.opening_balance
            + self.allocated_days
            + self.adjusted_days
            - self.used_days
        )


# ================================================================
# LEAVE REQUEST
# ================================================================


class LeaveRequest(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    class DayType(models.TextChoices):
        FULL_DAY = "FULL_DAY", "Full Day"
        FIRST_HALF = "FIRST_HALF", "First Half"
        SECOND_HALF = "SECOND_HALF", "Second Half"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )

    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="leave_requests",
    )

    start_date = models.DateField()

    end_date = models.DateField()

    day_type = models.CharField(
        max_length=20,
        choices=DayType.choices,
        default=DayType.FULL_DAY,
    )

    requested_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    reason = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_leave_requests",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_leave_requests",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        blank=True,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["employee", "status"],
                name="hr_leave_emp_status_idx",
            ),
            models.Index(
                fields=["start_date", "end_date"],
                name="hr_leave_dates_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.leave_type.code} - "
            f"{self.start_date}"
        )

    def clean(self):
        super().clean()

        if self.end_date < self.start_date:
            raise ValidationError(
                {
                    "end_date": (
                        "Leave end date cannot be before start date."
                    )
                }
            )

        if (
            self.day_type != self.DayType.FULL_DAY
            and self.start_date != self.end_date
        ):
            raise ValidationError(
                {
                    "day_type": (
                        "Half-day leave can only be requested "
                        "for a single date."
                    )
                }
            )

        if self.requested_days < 0:
            raise ValidationError(
                {
                    "requested_days": (
                        "Requested leave days cannot be negative."
                    )
                }
            )


# ================================================================
# HR ACTIVITY / AUDIT LOG
# ================================================================


class HRActivity(models.Model):

    class ActivityType(models.TextChoices):
        ATTENDANCE = "ATTENDANCE", "Attendance"
        ATTENDANCE_ADJUSTMENT = (
            "ATTENDANCE_ADJUSTMENT",
            "Attendance Adjustment",
        )
        LEAVE_REQUEST = "LEAVE_REQUEST", "Leave Request"
        LEAVE_APPROVED = "LEAVE_APPROVED", "Leave Approved"
        LEAVE_REJECTED = "LEAVE_REJECTED", "Leave Rejected"
        LEAVE_CANCELLED = "LEAVE_CANCELLED", "Leave Cancelled"
        LEAVE_BALANCE = "LEAVE_BALANCE", "Leave Balance"
        NOTE = "NOTE", "Note"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="hr_activities",
    )

    activity_type = models.CharField(
        max_length=40,
        choices=ActivityType.choices,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_hr_activities",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["employee", "created_at"],
                name="hr_activity_emp_idx",
            )
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.get_activity_type_display()}"
        )

# ================================================================
# SALARY COMPONENT MASTER
# ================================================================


class SalaryComponent(models.Model):

    class ComponentType(models.TextChoices):
        EARNING = "EARNING", "Earning"
        DEDUCTION = "DEDUCTION", "Deduction"

    class CalculationType(models.TextChoices):
        FIXED = "FIXED", "Fixed Amount"
        PERCENTAGE = "PERCENTAGE", "Percentage"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=150,
        unique=True,
    )

    code = models.CharField(
        max_length=30,
        unique=True,
    )

    component_type = models.CharField(
        max_length=20,
        choices=ComponentType.choices,
    )

    calculation_type = models.CharField(
        max_length=20,
        choices=CalculationType.choices,
        default=CalculationType.FIXED,
    )

    is_taxable = models.BooleanField(
        default=False,
    )

    affects_gross_salary = models.BooleanField(
        default=True,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "component_type",
            "name",
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


# ================================================================
# EMPLOYEE SALARY STRUCTURE
# ================================================================


class EmployeeSalaryStructure(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="salary_structures",
    )

    name = models.CharField(
        max_length=150,
        default="Standard Salary Structure",
    )

    effective_from = models.DateField()

    effective_to = models.DateField(
        null=True,
        blank=True,
    )

    base_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_salary_structures",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "employee__employee_id",
            "-effective_from",
        ]

        indexes = [
            models.Index(
                fields=[
                    "employee",
                    "is_active",
                    "effective_from",
                ],
                name="hr_salary_struct_emp_idx",
            )
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.name} - "
            f"{self.effective_from}"
        )

    def clean(self):
        super().clean()

        if self.base_salary < 0:
            raise ValidationError(
                {
                    "base_salary": (
                        "Base salary cannot be negative."
                    )
                }
            )

        if (
            self.effective_to
            and self.effective_to < self.effective_from
        ):
            raise ValidationError(
                {
                    "effective_to": (
                        "Effective-to date cannot be before "
                        "effective-from date."
                    )
                }
            )


# ================================================================
# EMPLOYEE SALARY COMPONENT
# ================================================================


class EmployeeSalaryComponent(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    salary_structure = models.ForeignKey(
        EmployeeSalaryStructure,
        on_delete=models.CASCADE,
        related_name="components",
    )

    component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.PROTECT,
        related_name="employee_salary_components",
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    percentage = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "component__component_type",
            "component__name",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "salary_structure",
                    "component",
                ],
                name="unique_salary_structure_component",
            )
        ]

    def __str__(self):
        return (
            f"{self.salary_structure.employee.employee_id} - "
            f"{self.component.code}"
        )

    def clean(self):
        super().clean()

        if self.amount < 0:
            raise ValidationError(
                {
                    "amount": (
                        "Salary component amount cannot be negative."
                    )
                }
            )

        if self.percentage < 0:
            raise ValidationError(
                {
                    "percentage": (
                        "Salary component percentage "
                        "cannot be negative."
                    )
                }
            )

        if (
            self.component_id
            and self.component.calculation_type
            == SalaryComponent.CalculationType.PERCENTAGE
            and self.percentage <= 0
        ):
            raise ValidationError(
                {
                    "percentage": (
                        "Percentage must be greater than zero "
                        "for percentage-based components."
                    )
                }
            )


# ================================================================
# SALARY ADVANCE
# ================================================================


class SalaryAdvance(models.Model):

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        DISBURSED = "DISBURSED", "Disbursed"
        PARTIALLY_RECOVERED = (
            "PARTIALLY_RECOVERED",
            "Partially Recovered",
        )
        RECOVERED = "RECOVERED", "Recovered"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="salary_advances",
    )

    requested_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    approved_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    recovered_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    monthly_recovery_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    reason = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.REQUESTED,
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_salary_advances",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_salary_advances",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    disbursed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    payment_reference = models.CharField(
        max_length=150,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["employee", "status"],
                name="hr_advance_emp_status_idx",
            )
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"₹{self.requested_amount} - "
            f"{self.status}"
        )

    @property
    def outstanding_amount(self):
        return max(
            self.approved_amount - self.recovered_amount,
            0,
        )

    def clean(self):
        super().clean()

        if self.requested_amount <= 0:
            raise ValidationError(
                {
                    "requested_amount": (
                        "Requested advance must be greater than zero."
                    )
                }
            )

        if self.approved_amount < 0:
            raise ValidationError(
                {
                    "approved_amount": (
                        "Approved amount cannot be negative."
                    )
                }
            )

        if self.recovered_amount < 0:
            raise ValidationError(
                {
                    "recovered_amount": (
                        "Recovered amount cannot be negative."
                    )
                }
            )

        if (
            self.approved_amount
            and self.recovered_amount > self.approved_amount
        ):
            raise ValidationError(
                {
                    "recovered_amount": (
                        "Recovered amount cannot exceed "
                        "approved amount."
                    )
                }
            )


# ================================================================
# PAYROLL PERIOD
# ================================================================


class PayrollPeriod(models.Model):

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PROCESSING = "PROCESSING", "Processing"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    year = models.PositiveIntegerField()

    month = models.PositiveSmallIntegerField()

    start_date = models.DateField()

    end_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    notes = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payroll_periods",
    )

    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_payroll_periods",
    )

    closed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-year",
            "-month",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["year", "month"],
                name="unique_payroll_year_month",
            )
        ]

    def __str__(self):
        return f"{self.year}-{self.month:02d}"

    def clean(self):
        super().clean()

        if self.month < 1 or self.month > 12:
            raise ValidationError(
                {
                    "month": (
                        "Payroll month must be between 1 and 12."
                    )
                }
            )

        if self.end_date < self.start_date:
            raise ValidationError(
                {
                    "end_date": (
                        "Payroll end date cannot be before "
                        "start date."
                    )
                }
            )


# ================================================================
# PAYROLL
# ================================================================


class Payroll(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        CALCULATED = "CALCULATED", "Calculated"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.PROTECT,
        related_name="payrolls",
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="payrolls",
    )

    salary_structure = models.ForeignKey(
        EmployeeSalaryStructure,
        on_delete=models.PROTECT,
        related_name="payrolls",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    # ---------------------------------------------------------
    # ATTENDANCE SNAPSHOT
    # ---------------------------------------------------------

    calendar_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    payable_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    present_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    paid_leave_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    unpaid_leave_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    lop_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    # ---------------------------------------------------------
    # SALARY SNAPSHOT
    # ---------------------------------------------------------

    base_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    gross_earnings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    total_deductions = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    lop_deduction = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    advance_recovery = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    net_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # ---------------------------------------------------------
    # WORKFLOW
    # ---------------------------------------------------------

    calculated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calculated_payrolls",
    )

    calculated_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payrolls",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="paid_payrolls",
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    payment_method = models.CharField(
        max_length=50,
        blank=True,
    )

    payment_reference = models.CharField(
        max_length=150,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-period__year",
            "-period__month",
            "employee__employee_id",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["period", "employee"],
                name="unique_employee_period_payroll",
            )
        ]

        indexes = [
            models.Index(
                fields=["employee", "status"],
                name="hr_payroll_emp_status_idx",
            ),
            models.Index(
                fields=["period", "status"],
                name="hr_payroll_period_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.period} - "
            f"{self.status}"
        )

    def clean(self):
        super().clean()

        decimal_fields = {
            "calendar_days": self.calendar_days,
            "payable_days": self.payable_days,
            "present_days": self.present_days,
            "paid_leave_days": self.paid_leave_days,
            "unpaid_leave_days": self.unpaid_leave_days,
            "lop_days": self.lop_days,
            "base_salary": self.base_salary,
            "gross_earnings": self.gross_earnings,
            "total_deductions": self.total_deductions,
            "lop_deduction": self.lop_deduction,
            "advance_recovery": self.advance_recovery,
            "net_salary": self.net_salary,
        }

        for field_name, value in decimal_fields.items():
            if value < 0:
                raise ValidationError(
                    {
                        field_name: (
                            f"{field_name.replace('_', ' ').title()} "
                            "cannot be negative."
                        )
                    }
                )


# ================================================================
# PAYROLL COMPONENT SNAPSHOT
# ================================================================


class PayrollComponent(models.Model):

    class ComponentType(models.TextChoices):
        EARNING = "EARNING", "Earning"
        DEDUCTION = "DEDUCTION", "Deduction"

    class SourceType(models.TextChoices):
        SALARY_STRUCTURE = (
            "SALARY_STRUCTURE",
            "Salary Structure",
        )
        INCENTIVE = "INCENTIVE", "Incentive"
        BONUS = "BONUS", "Bonus"
        MANUAL = "MANUAL", "Manual Adjustment"
        LOP = "LOP", "Loss of Pay"
        ADVANCE = "ADVANCE", "Advance Recovery"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    payroll = models.ForeignKey(
        Payroll,
        on_delete=models.CASCADE,
        related_name="components",
    )

    salary_component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_components",
    )

    code = models.CharField(
        max_length=30,
    )

    name = models.CharField(
        max_length=150,
    )

    component_type = models.CharField(
        max_length=20,
        choices=ComponentType.choices,
    )

    source_type = models.CharField(
        max_length=30,
        choices=SourceType.choices,
        default=SourceType.SALARY_STRUCTURE,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "component_type",
            "code",
        ]

        indexes = [
            models.Index(
                fields=["payroll", "component_type"],
                name="hr_paycomp_type_idx",
            )
        ]

    def __str__(self):
        return (
            f"{self.payroll.employee.employee_id} - "
            f"{self.code} - ₹{self.amount}"
        )

    def clean(self):
        super().clean()

        if self.amount < 0:
            raise ValidationError(
                {
                    "amount": (
                        "Payroll component amount cannot be negative."
                    )
                }
            )


# ================================================================
# PAYROLL ACTIVITY / AUDIT
# ================================================================


class PayrollActivity(models.Model):

    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Created"
        CALCULATED = "CALCULATED", "Calculated"
        RECALCULATED = "RECALCULATED", "Recalculated"
        COMPONENT_ADDED = (
            "COMPONENT_ADDED",
            "Component Added",
        )
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"
        ADVANCE_RECOVERY = (
            "ADVANCE_RECOVERY",
            "Advance Recovery",
        )
        NOTE = "NOTE", "Note"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    payroll = models.ForeignKey(
        Payroll,
        on_delete=models.CASCADE,
        related_name="activities",
    )

    activity_type = models.CharField(
        max_length=40,
        choices=ActivityType.choices,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_payroll_activities",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["payroll", "created_at"],
                name="hr_payactivity_idx",
            )
        ]

    def __str__(self):
        return (
            f"{self.payroll.employee.employee_id} - "
            f"{self.get_activity_type_display()}"
        )
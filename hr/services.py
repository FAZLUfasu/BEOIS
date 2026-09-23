from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import (
    Attendance,
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
# HELPERS
# ================================================================

from .task_integration import (
    notify_leave_approved,
    notify_leave_rejected,
    notify_payroll_paid,
    notify_salary_advance_approved,
    notify_salary_advance_disbursed,
)


def _log_hr_activity(
    employee,
    activity_type,
    description,
    performed_by=None,
):
    """
    Create an HR audit/activity record.
    """

    return HRActivity.objects.create(
        employee=employee,
        activity_type=activity_type,
        description=description,
        performed_by=performed_by,
    )


def _validate_active_employee(employee):
    """
    Operational HR actions should normally only be performed
    for active employees.
    """

    if employee.employment_status not in [
        Employee.EmploymentStatus.ACTIVE,
        Employee.EmploymentStatus.ON_LEAVE,
    ]:
        raise ValidationError(
            f"Employee {employee.employee_id} is not active."
        )


def _make_aware_datetime(date_value, time_value):
    """
    Combine a date and time using the Django current timezone.
    """

    dt = datetime.combine(
        date_value,
        time_value,
    )

    if timezone.is_naive(dt):
        dt = timezone.make_aware(
            dt,
            timezone.get_current_timezone(),
        )

    return dt


# ================================================================
# ATTENDANCE
# ================================================================


@transaction.atomic
def mark_attendance(
    employee,
    attendance_date=None,
    status=Attendance.Status.PRESENT,
    check_in=None,
    check_out=None,
    remarks="",
    performed_by=None,
):
    """
    Create or update an employee's daily attendance.

    Only one attendance record is allowed per employee per day.
    """

    _validate_active_employee(employee)

    if attendance_date is None:
        attendance_date = timezone.localdate()

    valid_statuses = {
        value
        for value, _ in Attendance.Status.choices
    }

    if status not in valid_statuses:
        raise ValidationError(
            "Invalid attendance status."
        )

    attendance, created = Attendance.objects.get_or_create(
        employee=employee,
        date=attendance_date,
        defaults={
            "status": status,
            "check_in": check_in,
            "check_out": check_out,
            "remarks": remarks.strip(),
        },
    )

    if not created:
        attendance.status = status

        if check_in is not None:
            attendance.check_in = check_in

        if check_out is not None:
            attendance.check_out = check_out

        if remarks.strip():
            attendance.remarks = remarks.strip()

        attendance.is_manually_adjusted = True
        attendance.adjusted_by = performed_by
        attendance.adjusted_at = timezone.now()

    _calculate_attendance_time(attendance)

    attendance.full_clean()
    attendance.save()

    action = (
        "created"
        if created
        else "updated"
    )

    _log_hr_activity(
        employee,
        (
            HRActivity.ActivityType.ATTENDANCE
            if created
            else HRActivity.ActivityType.ATTENDANCE_ADJUSTMENT
        ),
        (
            f"Attendance {action} for "
            f"{attendance_date}: "
            f"{attendance.get_status_display()}."
        ),
        performed_by,
    )

    return attendance


# ================================================================
# CHECK IN
# ================================================================


@transaction.atomic
def check_in_employee(
    employee,
    check_in_time=None,
    performed_by=None,
    remarks="",
):
    """
    Check an employee in for the current day.
    """

    _validate_active_employee(employee)

    if check_in_time is None:
        check_in_time = timezone.now()

    attendance_date = timezone.localtime(
        check_in_time
    ).date()

    attendance, created = Attendance.objects.get_or_create(
        employee=employee,
        date=attendance_date,
        defaults={
            "status": Attendance.Status.PRESENT,
            "check_in": check_in_time,
            "remarks": remarks.strip(),
        },
    )

    if not created:
        if attendance.check_in:
            raise ValidationError(
                f"{employee.employee_id} has already "
                f"checked in today."
            )

        if attendance.status in [
            Attendance.Status.ABSENT,
            Attendance.Status.ON_LEAVE,
            Attendance.Status.HOLIDAY,
            Attendance.Status.WEEK_OFF,
        ]:
            raise ValidationError(
                (
                    "Check-in is not allowed while attendance "
                    f"status is {attendance.get_status_display()}."
                )
            )

        attendance.check_in = check_in_time

        if remarks.strip():
            attendance.remarks = remarks.strip()

    attendance.full_clean()
    attendance.save()

    _log_hr_activity(
        employee,
        HRActivity.ActivityType.ATTENDANCE,
        (
            f"Employee checked in at "
            f"{timezone.localtime(check_in_time).strftime('%I:%M %p')}."
        ),
        performed_by,
    )

    return attendance


# ================================================================
# CHECK OUT
# ================================================================


@transaction.atomic
def check_out_employee(
    employee,
    check_out_time=None,
    performed_by=None,
    remarks="",
):
    """
    Check an employee out and calculate working minutes.
    """

    _validate_active_employee(employee)

    if check_out_time is None:
        check_out_time = timezone.now()

    attendance_date = timezone.localtime(
        check_out_time
    ).date()

    try:
        attendance = Attendance.objects.get(
            employee=employee,
            date=attendance_date,
        )

    except Attendance.DoesNotExist:
        raise ValidationError(
            (
                f"No attendance/check-in record exists for "
                f"{employee.employee_id} today."
            )
        )

    if not attendance.check_in:
        raise ValidationError(
            "Employee must check in before checking out."
        )

    if attendance.check_out:
        raise ValidationError(
            f"{employee.employee_id} has already checked out."
        )

    if check_out_time < attendance.check_in:
        raise ValidationError(
            "Check-out cannot be before check-in."
        )

    attendance.check_out = check_out_time

    if remarks.strip():
        attendance.remarks = remarks.strip()

    _calculate_attendance_time(attendance)

    attendance.full_clean()
    attendance.save()

    _log_hr_activity(
        employee,
        HRActivity.ActivityType.ATTENDANCE,
        (
            f"Employee checked out at "
            f"{timezone.localtime(check_out_time).strftime('%I:%M %p')}. "
            f"Working minutes: {attendance.working_minutes}."
        ),
        performed_by,
    )

    return attendance


# ================================================================
# ATTENDANCE TIME CALCULATION
# ================================================================


def _calculate_attendance_time(attendance):
    """
    Calculate total working minutes from check-in/check-out.

    Late/overtime policy will later be configurable.
    For now:
        standard start = 09:30
        standard work = 8 hours
    """

    if not attendance.check_in:
        attendance.working_minutes = 0
        attendance.late_minutes = 0
        attendance.overtime_minutes = 0
        return attendance

    local_check_in = timezone.localtime(
        attendance.check_in
    )

    standard_start = _make_aware_datetime(
        attendance.date,
        time(9, 30),
    )

    if local_check_in > standard_start:
        late_delta = (
            local_check_in - standard_start
        )

        attendance.late_minutes = max(
            0,
            int(late_delta.total_seconds() // 60),
        )

    else:
        attendance.late_minutes = 0

    if attendance.check_out:
        working_delta = (
            attendance.check_out
            - attendance.check_in
        )

        working_minutes = max(
            0,
            int(
                working_delta.total_seconds()
                // 60
            ),
        )

        attendance.working_minutes = working_minutes

        standard_work_minutes = 8 * 60

        attendance.overtime_minutes = max(
            0,
            working_minutes - standard_work_minutes,
        )

    else:
        attendance.working_minutes = 0
        attendance.overtime_minutes = 0

    return attendance


# ================================================================
# MANUAL ATTENDANCE ADJUSTMENT
# ================================================================


@transaction.atomic
def adjust_attendance(
    attendance,
    status=None,
    check_in=None,
    check_out=None,
    remarks="",
    performed_by=None,
):
    """
    HR/manager manual attendance correction.
    """

    if status is not None:
        valid_statuses = {
            value
            for value, _ in Attendance.Status.choices
        }

        if status not in valid_statuses:
            raise ValidationError(
                "Invalid attendance status."
            )

        attendance.status = status

    if check_in is not None:
        attendance.check_in = check_in

    if check_out is not None:
        attendance.check_out = check_out

    if remarks.strip():
        attendance.remarks = remarks.strip()

    attendance.is_manually_adjusted = True
    attendance.adjusted_by = performed_by
    attendance.adjusted_at = timezone.now()

    _calculate_attendance_time(attendance)

    attendance.full_clean()
    attendance.save()

    _log_hr_activity(
        attendance.employee,
        HRActivity.ActivityType.ATTENDANCE_ADJUSTMENT,
        (
            f"Attendance manually adjusted for "
            f"{attendance.date}. "
            f"Status: {attendance.get_status_display()}."
        ),
        performed_by,
    )

    return attendance


# ================================================================
# LEAVE TYPE
# ================================================================


@transaction.atomic
def create_leave_type(
    name,
    code,
    default_days_per_year=0,
    is_paid=True,
    carry_forward_allowed=False,
    maximum_carry_forward=0,
    requires_approval=True,
    description="",
):
    """
    Create a master leave type.
    """

    name = name.strip()
    code = code.strip().upper()

    if not name:
        raise ValidationError(
            "Leave type name is required."
        )

    if not code:
        raise ValidationError(
            "Leave type code is required."
        )

    leave_type = LeaveType(
        name=name,
        code=code,
        description=description.strip(),
        default_days_per_year=Decimal(
            str(default_days_per_year)
        ),
        is_paid=is_paid,
        carry_forward_allowed=carry_forward_allowed,
        maximum_carry_forward=Decimal(
            str(maximum_carry_forward)
        ),
        requires_approval=requires_approval,
        is_active=True,
    )

    leave_type.full_clean()
    leave_type.save()

    return leave_type


# ================================================================
# LEAVE BALANCE INITIALIZATION
# ================================================================


@transaction.atomic
def initialize_leave_balance(
    employee,
    leave_type,
    year=None,
    opening_balance=0,
    allocated_days=None,
    performed_by=None,
):
    """
    Initialize or retrieve an employee leave balance.
    """

    if year is None:
        year = timezone.localdate().year

    if allocated_days is None:
        allocated_days = (
            leave_type.default_days_per_year
        )

    opening_balance = Decimal(
        str(opening_balance)
    )

    allocated_days = Decimal(
        str(allocated_days)
    )

    balance, created = (
        EmployeeLeaveBalance.objects.get_or_create(
            employee=employee,
            leave_type=leave_type,
            year=year,
            defaults={
                "opening_balance": opening_balance,
                "allocated_days": allocated_days,
                "used_days": Decimal("0"),
                "adjusted_days": Decimal("0"),
            },
        )
    )

    if created:
        _log_hr_activity(
            employee,
            HRActivity.ActivityType.LEAVE_BALANCE,
            (
                f"{leave_type.name} leave balance "
                f"initialized for {year}. "
                f"Available: {balance.available_days} days."
            ),
            performed_by,
        )

    return balance


# ================================================================
# INITIALIZE ALL LEAVE TYPES
# ================================================================


@transaction.atomic
def initialize_employee_leave_balances(
    employee,
    year=None,
    performed_by=None,
):
    """
    Initialize all active leave types for an employee.
    """

    if year is None:
        year = timezone.localdate().year

    balances = []

    leave_types = LeaveType.objects.filter(
        is_active=True,
    )

    for leave_type in leave_types:
        balance = initialize_leave_balance(
            employee=employee,
            leave_type=leave_type,
            year=year,
            performed_by=performed_by,
        )

        balances.append(balance)

    return balances


# ================================================================
# LEAVE DAY CALCULATION
# ================================================================


def calculate_leave_days(
    start_date,
    end_date,
    day_type=LeaveRequest.DayType.FULL_DAY,
):
    """
    Calculate requested leave days.

    Current version counts calendar days.

    Weekend/holiday exclusion will later move to the
    organization working-calendar configuration.
    """

    if end_date < start_date:
        raise ValidationError(
            "Leave end date cannot be before start date."
        )

    if day_type != LeaveRequest.DayType.FULL_DAY:
        if start_date != end_date:
            raise ValidationError(
                (
                    "Half-day leave can only be requested "
                    "for one date."
                )
            )

        return Decimal("0.50")

    total_days = (
        end_date - start_date
    ).days + 1

    return Decimal(str(total_days))


# ================================================================
# LEAVE REQUEST
# ================================================================


@transaction.atomic
def apply_leave(
    employee,
    leave_type,
    start_date,
    end_date,
    reason,
    day_type=LeaveRequest.DayType.FULL_DAY,
    applied_by=None,
):
    """
    Submit a leave request.
    """

    _validate_active_employee(employee)

    if not leave_type.is_active:
        raise ValidationError(
            "Selected leave type is inactive."
        )

    reason = reason.strip()

    if not reason:
        raise ValidationError(
            "Leave reason is required."
        )

    requested_days = calculate_leave_days(
        start_date,
        end_date,
        day_type,
    )

    overlapping = LeaveRequest.objects.filter(
        employee=employee,
        status__in=[
            LeaveRequest.Status.PENDING,
            LeaveRequest.Status.APPROVED,
        ],
        start_date__lte=end_date,
        end_date__gte=start_date,
    )

    if overlapping.exists():
        raise ValidationError(
            (
                "Employee already has a pending or "
                "approved leave request during this period."
            )
        )

    balance = initialize_leave_balance(
        employee=employee,
        leave_type=leave_type,
        year=start_date.year,
        performed_by=applied_by,
    )

    if (
        leave_type.is_paid
        and balance.available_days < requested_days
    ):
        raise ValidationError(
            (
                f"Insufficient {leave_type.name} balance. "
                f"Available: {balance.available_days} days. "
                f"Requested: {requested_days} days."
            )
        )

    leave_request = LeaveRequest(
        employee=employee,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        day_type=day_type,
        requested_days=requested_days,
        reason=reason,
        status=LeaveRequest.Status.PENDING,
        applied_by=applied_by,
    )

    leave_request.full_clean()
    leave_request.save()

    _log_hr_activity(
        employee,
        HRActivity.ActivityType.LEAVE_REQUEST,
        (
            f"{leave_type.name} leave requested from "
            f"{start_date} to {end_date}. "
            f"Days: {requested_days}."
        ),
        applied_by,
    )

    # Leave types that do not require approval
    # can be approved automatically.
    if not leave_type.requires_approval:
        approve_leave(
            leave_request,
            approved_by=applied_by,
        )

    return leave_request


# ================================================================
# APPROVE LEAVE
# ================================================================


@transaction.atomic
def approve_leave(
    leave_request,
    approved_by=None,
    notes="",
):
    """
    Approve leave and deduct leave balance.

    Also marks attendance as ON_LEAVE.
    """

    if leave_request.status != LeaveRequest.Status.PENDING:
        raise ValidationError(
            "Only PENDING leave requests can be approved."
        )

    balance = initialize_leave_balance(
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        year=leave_request.start_date.year,
        performed_by=approved_by,
    )

    if (
        leave_request.leave_type.is_paid
        and balance.available_days
        < leave_request.requested_days
    ):
        raise ValidationError(
            (
                "Insufficient leave balance. "
                f"Available: {balance.available_days}. "
                f"Required: {leave_request.requested_days}."
            )
        )

    leave_request.status = (
        LeaveRequest.Status.APPROVED
    )

    leave_request.approved_by = approved_by
    leave_request.approved_at = timezone.now()
    leave_request.rejection_reason = ""

    leave_request.full_clean()
    leave_request.save()

    if leave_request.leave_type.is_paid:
        balance.used_days += (
            leave_request.requested_days
        )

        balance.full_clean()
        balance.save()

    _mark_leave_attendance(
        leave_request,
        performed_by=approved_by,
    )

    description = (
        f"{leave_request.leave_type.name} leave approved "
        f"for {leave_request.start_date} to "
        f"{leave_request.end_date}. "
        f"Days: {leave_request.requested_days}."
    )

    if notes.strip():
        description += f" {notes.strip()}"

    _log_hr_activity(
        leave_request.employee,
        HRActivity.ActivityType.LEAVE_APPROVED,
        description,
        approved_by,
    )

    notify_leave_approved(leave_request)

    return leave_request


# ================================================================
# MARK ATTENDANCE FOR APPROVED LEAVE
# ================================================================


def _mark_leave_attendance(
    leave_request,
    performed_by=None,
):
    """
    Mark all dates covered by approved leave as ON_LEAVE.

    For half-day leave the attendance record is HALF_DAY.
    """

    current_date = leave_request.start_date

    while current_date <= leave_request.end_date:

        status = Attendance.Status.ON_LEAVE

        if (
            leave_request.day_type
            != LeaveRequest.DayType.FULL_DAY
        ):
            status = Attendance.Status.HALF_DAY

        attendance, created = (
            Attendance.objects.get_or_create(
                employee=leave_request.employee,
                date=current_date,
                defaults={
                    "status": status,
                    "remarks": (
                        f"Approved "
                        f"{leave_request.leave_type.name} leave."
                    ),
                },
            )
        )

        if not created:
            # Do not silently overwrite an attendance record
            # containing actual check-in/check-out data.
            if (
                attendance.check_in
                or attendance.check_out
            ):
                raise ValidationError(
                    (
                        f"Attendance already contains check-in/"
                        f"check-out data for {current_date}. "
                        f"Resolve attendance before approving leave."
                    )
                )

            attendance.status = status
            attendance.remarks = (
                f"Approved "
                f"{leave_request.leave_type.name} leave."
            )

            attendance.is_manually_adjusted = True
            attendance.adjusted_by = performed_by
            attendance.adjusted_at = timezone.now()

            attendance.full_clean()
            attendance.save()

        current_date += timedelta(days=1)


# ================================================================
# REJECT LEAVE
# ================================================================


@transaction.atomic
def reject_leave(
    leave_request,
    reason,
    rejected_by=None,
):
    """
    Reject a pending leave request.
    """

    if leave_request.status != LeaveRequest.Status.PENDING:
        raise ValidationError(
            "Only PENDING leave requests can be rejected."
        )

    reason = reason.strip()

    if not reason:
        raise ValidationError(
            "Rejection reason is required."
        )

    leave_request.status = (
        LeaveRequest.Status.REJECTED
    )

    leave_request.rejection_reason = reason
    leave_request.approved_by = rejected_by
    leave_request.approved_at = timezone.now()

    leave_request.full_clean()
    leave_request.save()

    _log_hr_activity(
        leave_request.employee,
        HRActivity.ActivityType.LEAVE_REJECTED,
        (
            f"{leave_request.leave_type.name} leave "
            f"request rejected. Reason: {reason}"
        ),
        rejected_by,
    )

    return leave_request


# ================================================================
# CANCEL LEAVE
# ================================================================


@transaction.atomic
def cancel_leave(
    leave_request,
    cancelled_by=None,
    reason="",
):
    """
    Cancel a pending or approved leave request.

    Approved paid leave restores the leave balance.
    """

    if leave_request.status not in [
        LeaveRequest.Status.PENDING,
        LeaveRequest.Status.APPROVED,
    ]:
        raise ValidationError(
            (
                "Only PENDING or APPROVED leave requests "
                "can be cancelled."
            )
        )

    was_approved = (
        leave_request.status
        == LeaveRequest.Status.APPROVED
    )

    if (
        was_approved
        and leave_request.leave_type.is_paid
    ):
        try:
            balance = (
                EmployeeLeaveBalance.objects.get(
                    employee=leave_request.employee,
                    leave_type=leave_request.leave_type,
                    year=leave_request.start_date.year,
                )
            )

        except EmployeeLeaveBalance.DoesNotExist:
            raise ValidationError(
                (
                    "Leave balance record could not be found. "
                    "Cancellation cannot continue safely."
                )
            )

        if balance.used_days < leave_request.requested_days:
            raise ValidationError(
                (
                    "Leave balance is inconsistent. "
                    "Cancellation cannot continue safely."
                )
            )

        balance.used_days -= (
            leave_request.requested_days
        )

        balance.full_clean()
        balance.save()

    if was_approved:
        _remove_leave_attendance(
            leave_request
        )

    leave_request.status = (
        LeaveRequest.Status.CANCELLED
    )

    leave_request.cancelled_at = timezone.now()

    leave_request.full_clean()
    leave_request.save()

    description = (
        f"{leave_request.leave_type.name} leave "
        f"cancelled for {leave_request.start_date} "
        f"to {leave_request.end_date}."
    )

    if reason.strip():
        description += (
            f" Reason: {reason.strip()}"
        )

    _log_hr_activity(
        leave_request.employee,
        HRActivity.ActivityType.LEAVE_CANCELLED,
        description,
        cancelled_by,
    )

    notify_leave_rejected(leave_request)

    return leave_request


# ================================================================
# REMOVE LEAVE ATTENDANCE
# ================================================================


def _remove_leave_attendance(
    leave_request,
):
    """
    Remove attendance records created only because of
    an approved leave.

    Actual check-in/check-out records are preserved.
    """

    current_date = leave_request.start_date

    while current_date <= leave_request.end_date:

        attendance = Attendance.objects.filter(
            employee=leave_request.employee,
            date=current_date,
        ).first()

        if attendance:
            if (
                not attendance.check_in
                and not attendance.check_out
                and attendance.status
                in [
                    Attendance.Status.ON_LEAVE,
                    Attendance.Status.HALF_DAY,
                ]
            ):
                attendance.delete()

        current_date += timedelta(days=1)


# ================================================================
# LEAVE BALANCE ADJUSTMENT
# ================================================================


@transaction.atomic
def adjust_leave_balance(
    employee,
    leave_type,
    adjustment,
    year=None,
    reason="",
    performed_by=None,
):
    """
    HR manual leave balance adjustment.

    Positive:
        +2

    Negative:
        -1
    """

    if year is None:
        year = timezone.localdate().year

    adjustment = Decimal(
        str(adjustment)
    )

    balance = initialize_leave_balance(
        employee=employee,
        leave_type=leave_type,
        year=year,
        performed_by=performed_by,
    )

    resulting_available = (
        balance.available_days
        + adjustment
    )

    if resulting_available < 0:
        raise ValidationError(
            (
                "Adjustment would make available "
                "leave balance negative."
            )
        )

    balance.adjusted_days += adjustment

    balance.full_clean()
    balance.save()

    description = (
        f"{leave_type.name} leave balance adjusted "
        f"by {adjustment} days for {year}. "
        f"New available balance: "
        f"{balance.available_days}."
    )

    if reason.strip():
        description += (
            f" Reason: {reason.strip()}"
        )

    _log_hr_activity(
        employee,
        HRActivity.ActivityType.LEAVE_BALANCE,
        description,
        performed_by,
    )

    return balance


# ================================================================
# ATTENDANCE QUERIES
# ================================================================


def get_employee_attendance(
    employee,
    start_date=None,
    end_date=None,
):
    queryset = Attendance.objects.filter(
        employee=employee,
    )

    if start_date is not None:
        queryset = queryset.filter(
            date__gte=start_date,
        )

    if end_date is not None:
        queryset = queryset.filter(
            date__lte=end_date,
        )

    return queryset.order_by("-date")


def get_daily_attendance(
    attendance_date=None,
):
    if attendance_date is None:
        attendance_date = timezone.localdate()

    return Attendance.objects.filter(
        date=attendance_date,
    ).select_related(
        "employee",
        "employee__branch",
        "employee__department",
    ).order_by(
        "employee__employee_id"
    )


def get_missing_attendance(
    attendance_date=None,
):
    """
    Active employees without an attendance record.
    """

    if attendance_date is None:
        attendance_date = timezone.localdate()

    recorded_employee_ids = (
        Attendance.objects.filter(
            date=attendance_date,
        ).values_list(
            "employee_id",
            flat=True,
        )
    )

    return Employee.objects.filter(
        employment_status=Employee.EmploymentStatus.ACTIVE,
    ).exclude(
        id__in=recorded_employee_ids,
    ).order_by(
        "employee_id"
    )


# ================================================================
# LEAVE QUERIES
# ================================================================


def get_pending_leave_requests(
    employee=None,
):
    queryset = LeaveRequest.objects.filter(
        status=LeaveRequest.Status.PENDING,
    ).select_related(
        "employee",
        "leave_type",
    )

    if employee is not None:
        queryset = queryset.filter(
            employee=employee,
        )

    return queryset.order_by(
        "start_date"
    )


def get_employee_leave_requests(
    employee,
    year=None,
):
    queryset = LeaveRequest.objects.filter(
        employee=employee,
    ).select_related(
        "leave_type",
    )

    if year is not None:
        queryset = queryset.filter(
            Q(start_date__year=year)
            | Q(end_date__year=year)
        )

    return queryset.order_by(
        "-created_at"
    )


def get_employee_leave_balances(
    employee,
    year=None,
):
    if year is None:
        year = timezone.localdate().year

    return EmployeeLeaveBalance.objects.filter(
        employee=employee,
        year=year,
    ).select_related(
        "leave_type",
    ).order_by(
        "leave_type__name"
    )


# ================================================================
# HR DASHBOARD HELPERS
# ================================================================


def get_attendance_summary(
    attendance_date=None,
):
    """
    Basic daily attendance totals for future dashboard/API.
    """

    if attendance_date is None:
        attendance_date = timezone.localdate()

    queryset = Attendance.objects.filter(
        date=attendance_date,
    )

    return {
        "date": attendance_date,
        "present": queryset.filter(
            status=Attendance.Status.PRESENT
        ).count(),
        "absent": queryset.filter(
            status=Attendance.Status.ABSENT
        ).count(),
        "late": queryset.filter(
            status=Attendance.Status.LATE
        ).count(),
        "half_day": queryset.filter(
            status=Attendance.Status.HALF_DAY
        ).count(),
        "work_from_home": queryset.filter(
            status=Attendance.Status.WORK_FROM_HOME
        ).count(),
        "on_leave": queryset.filter(
            status=Attendance.Status.ON_LEAVE
        ).count(),
        "holiday": queryset.filter(
            status=Attendance.Status.HOLIDAY
        ).count(),
        "week_off": queryset.filter(
            status=Attendance.Status.WEEK_OFF
        ).count(),
    }
# ================================================================
# PAYROLL HELPERS
# ================================================================


MONEY_ZERO = Decimal("0.00")


def _money(value):
    """
    Normalize a value to two-decimal currency precision.
    """

    return Decimal(str(value or 0)).quantize(
        Decimal("0.01")
    )


def _log_payroll_activity(
    payroll,
    activity_type,
    description,
    performed_by=None,
):
    return PayrollActivity.objects.create(
        payroll=payroll,
        activity_type=activity_type,
        description=description,
        performed_by=performed_by,
    )


# ================================================================
# SALARY COMPONENT MASTER
# ================================================================


@transaction.atomic
def create_salary_component(
    name,
    code,
    component_type,
    calculation_type=SalaryComponent.CalculationType.FIXED,
    is_taxable=False,
    affects_gross_salary=True,
    description="",
):
    """
    Create a reusable salary component.

    Examples:
        BASIC
        HRA
        TRAVEL
        INCENTIVE
        PF
        ESI
        TDS
    """

    name = name.strip()
    code = code.strip().upper()

    if not name:
        raise ValidationError(
            "Salary component name is required."
        )

    if not code:
        raise ValidationError(
            "Salary component code is required."
        )

    valid_component_types = {
        value
        for value, _ in SalaryComponent.ComponentType.choices
    }

    if component_type not in valid_component_types:
        raise ValidationError(
            "Invalid salary component type."
        )

    valid_calculation_types = {
        value
        for value, _ in SalaryComponent.CalculationType.choices
    }

    if calculation_type not in valid_calculation_types:
        raise ValidationError(
            "Invalid salary calculation type."
        )

    component = SalaryComponent(
        name=name,
        code=code,
        component_type=component_type,
        calculation_type=calculation_type,
        is_taxable=is_taxable,
        affects_gross_salary=affects_gross_salary,
        description=description.strip(),
        is_active=True,
    )

    component.full_clean()
    component.save()

    return component


# ================================================================
# EMPLOYEE SALARY STRUCTURE
# ================================================================


@transaction.atomic
def create_salary_structure(
    employee,
    effective_from,
    base_salary,
    name="Standard Salary Structure",
    effective_to=None,
    notes="",
    created_by=None,
):
    """
    Create a salary structure for an employee.

    Any previously-active structure is closed before
    this structure starts.
    """

    _validate_active_employee(employee)

    base_salary = _money(base_salary)

    if base_salary < 0:
        raise ValidationError(
            "Base salary cannot be negative."
        )

    if effective_to and effective_to < effective_from:
        raise ValidationError(
            (
                "Effective-to date cannot be before "
                "effective-from date."
            )
        )

    previous_structures = (
        EmployeeSalaryStructure.objects.select_for_update()
        .filter(
            employee=employee,
            is_active=True,
        )
    )

    for previous in previous_structures:
        if previous.effective_from >= effective_from:
            raise ValidationError(
                (
                    "An active salary structure already starts "
                    "on or after the selected effective date."
                )
            )

        previous.effective_to = (
            effective_from - timedelta(days=1)
        )
        previous.is_active = False
        previous.full_clean()
        previous.save()

    structure = EmployeeSalaryStructure(
        employee=employee,
        name=name.strip() or "Standard Salary Structure",
        effective_from=effective_from,
        effective_to=effective_to,
        base_salary=base_salary,
        is_active=True,
        notes=notes.strip(),
        created_by=created_by,
    )

    structure.full_clean()
    structure.save()

    return structure


# ================================================================
# ADD COMPONENT TO SALARY STRUCTURE
# ================================================================


@transaction.atomic
def add_salary_component(
    salary_structure,
    component,
    amount=0,
    percentage=0,
):
    """
    Add or update a component in an employee salary structure.
    """

    if not component.is_active:
        raise ValidationError(
            "Selected salary component is inactive."
        )

    amount = _money(amount)
    percentage = Decimal(
        str(percentage or 0)
    )

    if component.calculation_type == (
        SalaryComponent.CalculationType.FIXED
    ):
        if amount < 0:
            raise ValidationError(
                "Component amount cannot be negative."
            )

        percentage = Decimal("0")

    else:
        if percentage <= 0:
            raise ValidationError(
                (
                    "Percentage must be greater than zero "
                    "for percentage-based components."
                )
            )

        amount = MONEY_ZERO

    item, _ = (
        EmployeeSalaryComponent.objects.update_or_create(
            salary_structure=salary_structure,
            component=component,
            defaults={
                "amount": amount,
                "percentage": percentage,
                "is_active": True,
            },
        )
    )

    item.full_clean()
    item.save()

    return item


# ================================================================
# SALARY STRUCTURE LOOKUP
# ================================================================


def get_salary_structure_for_date(
    employee,
    target_date,
):
    """
    Return the employee salary structure effective
    on target_date.
    """

    return (
        EmployeeSalaryStructure.objects.filter(
            employee=employee,
            effective_from__lte=target_date,
        )
        .filter(
            Q(effective_to__isnull=True)
            | Q(effective_to__gte=target_date)
        )
        .order_by("-effective_from")
        .first()
    )


# ================================================================
# SALARY COMPONENT CALCULATION
# ================================================================


def calculate_structure_component_amount(
    salary_structure,
    salary_component_item,
):
    """
    Calculate one salary structure component.

    Percentage components currently use base_salary
    as their calculation base.
    """

    component = salary_component_item.component

    if component.calculation_type == (
        SalaryComponent.CalculationType.FIXED
    ):
        return _money(
            salary_component_item.amount
        )

    amount = (
        salary_structure.base_salary
        * salary_component_item.percentage
        / Decimal("100")
    )

    return _money(amount)


# ================================================================
# SALARY ADVANCE
# ================================================================


@transaction.atomic
def request_salary_advance(
    employee,
    amount,
    reason="",
    requested_by=None,
):
    _validate_active_employee(employee)

    amount = _money(amount)

    if amount <= 0:
        raise ValidationError(
            "Advance amount must be greater than zero."
        )

    advance = SalaryAdvance(
        employee=employee,
        requested_amount=amount,
        reason=reason.strip(),
        status=SalaryAdvance.Status.REQUESTED,
        requested_by=requested_by,
    )

    advance.full_clean()
    advance.save()

    return advance


@transaction.atomic
def approve_salary_advance(
    advance,
    approved_amount,
    monthly_recovery_amount,
    approved_by=None,
):
    if advance.status != SalaryAdvance.Status.REQUESTED:
        raise ValidationError(
            "Only REQUESTED advances can be approved."
        )

    approved_amount = _money(
        approved_amount
    )

    monthly_recovery_amount = _money(
        monthly_recovery_amount
    )

    if approved_amount <= 0:
        raise ValidationError(
            "Approved amount must be greater than zero."
        )

    if approved_amount > advance.requested_amount:
        raise ValidationError(
            (
                "Approved amount cannot exceed "
                "requested amount."
            )
        )

    if monthly_recovery_amount <= 0:
        raise ValidationError(
            (
                "Monthly recovery amount must be "
                "greater than zero."
            )
        )

    advance.approved_amount = approved_amount
    advance.monthly_recovery_amount = (
        monthly_recovery_amount
    )
    advance.status = SalaryAdvance.Status.APPROVED
    advance.approved_by = approved_by
    advance.approved_at = timezone.now()

    advance.full_clean()
    advance.save()

    return advance


@transaction.atomic
def disburse_salary_advance(
    advance,
    payment_reference="",
):
    if advance.status != SalaryAdvance.Status.APPROVED:
        raise ValidationError(
            "Only APPROVED advances can be disbursed."
        )

    advance.status = SalaryAdvance.Status.DISBURSED
    advance.disbursed_at = timezone.now()
    advance.payment_reference = (
        payment_reference.strip()
    )

    advance.full_clean()
    advance.save()

    notify_salary_advance_approved(advance)

    notify_salary_advance_disbursed(advance)

    return advance


# ================================================================
# PAYROLL PERIOD
# ================================================================


@transaction.atomic
def create_payroll_period(
    year,
    month,
    start_date,
    end_date,
    created_by=None,
    notes="",
):
    if month < 1 or month > 12:
        raise ValidationError(
            "Payroll month must be between 1 and 12."
        )

    if end_date < start_date:
        raise ValidationError(
            "Payroll end date cannot be before start date."
        )

    period = PayrollPeriod(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
        status=PayrollPeriod.Status.OPEN,
        notes=notes.strip(),
        created_by=created_by,
    )

    period.full_clean()
    period.save()

    return period


# ================================================================
# CREATE EMPLOYEE PAYROLL
# ================================================================


@transaction.atomic
def create_employee_payroll(
    employee,
    period,
    payable_days=None,
    lop_days=0,
    created_by=None,
):
    """
    Create the monthly payroll draft.

    payable_days and lop_days are intentionally explicit
    until BEST's working-calendar rules are configured.
    """

    _validate_active_employee(employee)

    if period.status == PayrollPeriod.Status.CLOSED:
        raise ValidationError(
            "Payroll period is closed."
        )

    structure = get_salary_structure_for_date(
        employee,
        period.end_date,
    )

    if not structure:
        raise ValidationError(
            (
                f"No salary structure is effective for "
                f"{employee.employee_id} in {period}."
            )
        )

    if Payroll.objects.filter(
        employee=employee,
        period=period,
    ).exists():
        raise ValidationError(
            (
                f"Payroll already exists for "
                f"{employee.employee_id} in {period}."
            )
        )

    calendar_days = Decimal(
        str(
            (
                period.end_date
                - period.start_date
            ).days
            + 1
        )
    )

    lop_days = Decimal(
        str(lop_days or 0)
    )

    if payable_days is None:
        payable_days = (
            calendar_days - lop_days
        )
    else:
        payable_days = Decimal(
            str(payable_days)
        )

    if lop_days < 0:
        raise ValidationError(
            "LOP days cannot be negative."
        )

    if payable_days < 0:
        raise ValidationError(
            "Payable days cannot be negative."
        )

    if payable_days > calendar_days:
        raise ValidationError(
            "Payable days cannot exceed calendar days."
        )

    payroll = Payroll(
        period=period,
        employee=employee,
        salary_structure=structure,
        status=Payroll.Status.DRAFT,
        calendar_days=calendar_days,
        payable_days=payable_days,
        lop_days=lop_days,
        base_salary=structure.base_salary,
    )

    payroll.full_clean()
    payroll.save()

    _log_payroll_activity(
        payroll,
        PayrollActivity.ActivityType.CREATED,
        (
            f"Payroll created for {period}. "
            f"Payable days: {payable_days}; "
            f"LOP days: {lop_days}."
        ),
        created_by,
    )

    return payroll


# ================================================================
# PAYROLL ATTENDANCE SNAPSHOT
# ================================================================


def populate_payroll_attendance_snapshot(
    payroll,
):
    """
    Populate informational attendance values.

    Salary deduction remains based on explicit payroll.lop_days
    until working-calendar policy is configured.
    """

    records = Attendance.objects.filter(
        employee=payroll.employee,
        date__gte=payroll.period.start_date,
        date__lte=payroll.period.end_date,
    )

    present_days = Decimal("0")
    paid_leave_days = Decimal("0")
    unpaid_leave_days = Decimal("0")

    for attendance in records:

        if attendance.status in [
            Attendance.Status.PRESENT,
            Attendance.Status.LATE,
            Attendance.Status.WORK_FROM_HOME,
        ]:
            present_days += Decimal("1")

        elif attendance.status == Attendance.Status.HALF_DAY:
            present_days += Decimal("0.5")

        elif attendance.status == Attendance.Status.ON_LEAVE:

            leave = LeaveRequest.objects.filter(
                employee=payroll.employee,
                status=LeaveRequest.Status.APPROVED,
                start_date__lte=attendance.date,
                end_date__gte=attendance.date,
            ).select_related(
                "leave_type"
            ).first()

            if leave:
                if leave.leave_type.is_paid:
                    paid_leave_days += Decimal("1")
                else:
                    unpaid_leave_days += Decimal("1")

    payroll.present_days = present_days
    payroll.paid_leave_days = paid_leave_days
    payroll.unpaid_leave_days = unpaid_leave_days

    return payroll


# ================================================================
# CALCULATE PAYROLL
# ================================================================


@transaction.atomic
def calculate_payroll(
    payroll,
    calculated_by=None,
):
    """
    Calculate monthly payroll from salary structure.

    Existing calculated components are rebuilt so a DRAFT or
    CALCULATED payroll can safely be recalculated.
    """

    payroll = Payroll.objects.select_for_update().get(
        pk=payroll.pk
    )

    if payroll.status not in [
        Payroll.Status.DRAFT,
        Payroll.Status.CALCULATED,
    ]:
        raise ValidationError(
            (
                "Only DRAFT or CALCULATED payroll "
                "can be calculated."
            )
        )

    if payroll.period.status == PayrollPeriod.Status.CLOSED:
        raise ValidationError(
            "Payroll period is closed."
        )

    was_calculated = (
        payroll.status == Payroll.Status.CALCULATED
    )

    # Rebuild snapshot.
    payroll.components.all().delete()

    populate_payroll_attendance_snapshot(
        payroll
    )

    salary_structure = payroll.salary_structure

    gross_earnings = _money(
        salary_structure.base_salary
    )

    total_deductions = MONEY_ZERO

    # Base salary itself becomes a payroll snapshot component.
    PayrollComponent.objects.create(
        payroll=payroll,
        code="BASE",
        name="Base Salary",
        component_type=PayrollComponent.ComponentType.EARNING,
        source_type=PayrollComponent.SourceType.SALARY_STRUCTURE,
        amount=_money(
            salary_structure.base_salary
        ),
    )

    structure_components = (
        salary_structure.components.filter(
            is_active=True,
            component__is_active=True,
        )
        .select_related("component")
    )

    for item in structure_components:

        component = item.component

        amount = calculate_structure_component_amount(
            salary_structure,
            item,
        )

        if component.component_type == (
            SalaryComponent.ComponentType.EARNING
        ):
            gross_earnings += amount
            payroll_component_type = (
                PayrollComponent.ComponentType.EARNING
            )

        else:
            total_deductions += amount
            payroll_component_type = (
                PayrollComponent.ComponentType.DEDUCTION
            )

        PayrollComponent.objects.create(
            payroll=payroll,
            salary_component=component,
            code=component.code,
            name=component.name,
            component_type=payroll_component_type,
            source_type=(
                PayrollComponent.SourceType.SALARY_STRUCTURE
            ),
            amount=amount,
        )

    # ------------------------------------------------------------
    # LOSS OF PAY
    # ------------------------------------------------------------

    lop_deduction = MONEY_ZERO

    if (
        payroll.calendar_days > 0
        and payroll.lop_days > 0
    ):
        daily_salary = (
            salary_structure.base_salary
            / payroll.calendar_days
        )

        lop_deduction = _money(
            daily_salary * payroll.lop_days
        )

        if lop_deduction > 0:
            PayrollComponent.objects.create(
                payroll=payroll,
                code="LOP",
                name="Loss of Pay",
                component_type=(
                    PayrollComponent.ComponentType.DEDUCTION
                ),
                source_type=(
                    PayrollComponent.SourceType.LOP
                ),
                amount=lop_deduction,
            )

            total_deductions += lop_deduction

    payroll.base_salary = _money(
        salary_structure.base_salary
    )

    payroll.gross_earnings = _money(
        gross_earnings
    )

    payroll.lop_deduction = _money(
        lop_deduction
    )

    payroll.advance_recovery = MONEY_ZERO

    payroll.total_deductions = _money(
        total_deductions
    )

    payroll.net_salary = _money(
        max(
            payroll.gross_earnings
            - payroll.total_deductions,
            MONEY_ZERO,
        )
    )

    payroll.status = Payroll.Status.CALCULATED
    payroll.calculated_by = calculated_by
    payroll.calculated_at = timezone.now()

    payroll.full_clean()
    payroll.save()

    _log_payroll_activity(
        payroll,
        (
            PayrollActivity.ActivityType.RECALCULATED
            if was_calculated
            else PayrollActivity.ActivityType.CALCULATED
        ),
        (
            f"Payroll calculated. "
            f"Gross: â‚¹{payroll.gross_earnings}; "
            f"Deductions: â‚¹{payroll.total_deductions}; "
            f"Net: â‚¹{payroll.net_salary}."
        ),
        calculated_by,
    )

    return payroll


# ================================================================
# MANUAL PAYROLL COMPONENT
# ================================================================


@transaction.atomic
def add_payroll_adjustment(
    payroll,
    name,
    amount,
    component_type,
    source_type=PayrollComponent.SourceType.MANUAL,
    code="MANUAL",
    notes="",
    performed_by=None,
):
    """
    Add an incentive, bonus or manual deduction after
    initial payroll calculation.
    """

    if payroll.status != Payroll.Status.CALCULATED:
        raise ValidationError(
            (
                "Payroll adjustments can only be added "
                "to CALCULATED payroll."
            )
        )

    amount = _money(amount)

    if amount <= 0:
        raise ValidationError(
            "Adjustment amount must be greater than zero."
        )

    valid_types = {
        value
        for value, _ in PayrollComponent.ComponentType.choices
    }

    if component_type not in valid_types:
        raise ValidationError(
            "Invalid payroll component type."
        )

    valid_sources = {
        value
        for value, _ in PayrollComponent.SourceType.choices
    }

    if source_type not in valid_sources:
        raise ValidationError(
            "Invalid payroll component source."
        )

    component = PayrollComponent.objects.create(
        payroll=payroll,
        code=code.strip().upper() or "MANUAL",
        name=name.strip(),
        component_type=component_type,
        source_type=source_type,
        amount=amount,
        notes=notes.strip(),
    )

    _recalculate_payroll_totals(
        payroll
    )

    _log_payroll_activity(
        payroll,
        PayrollActivity.ActivityType.COMPONENT_ADDED,
        (
            f"{component.get_component_type_display()} "
            f"component added: {component.name} "
            f"â‚¹{component.amount}."
        ),
        performed_by,
    )

    return component


# ================================================================
# PAYROLL TOTALS
# ================================================================


def _recalculate_payroll_totals(
    payroll,
):
    """
    Recalculate payroll totals directly from the database.

    IMPORTANT:
    Do not use payroll.components.all() here because the Payroll
    instance may have been loaded with prefetch_related("components").
    In that situation Django can reuse a stale prefetched relation
    cache after a new PayrollComponent is created.

    Query PayrollComponent directly so every recalculation uses the
    current database state.
    """

    earnings = MONEY_ZERO
    deductions = MONEY_ZERO
    lop = MONEY_ZERO
    advance = MONEY_ZERO

    components = PayrollComponent.objects.filter(
        payroll_id=payroll.pk
    )

    for component in components:

        if (
            component.component_type
            == PayrollComponent.ComponentType.EARNING
        ):
            earnings += component.amount

        elif (
            component.component_type
            == PayrollComponent.ComponentType.DEDUCTION
        ):
            deductions += component.amount

        if (
            component.source_type
            == PayrollComponent.SourceType.LOP
        ):
            lop += component.amount

        if (
            component.source_type
            == PayrollComponent.SourceType.ADVANCE
        ):
            advance += component.amount

    payroll.gross_earnings = _money(
        earnings
    )

    payroll.total_deductions = _money(
        deductions
    )

    payroll.lop_deduction = _money(
        lop
    )

    payroll.advance_recovery = _money(
        advance
    )

    payroll.net_salary = _money(
        max(
            earnings - deductions,
            MONEY_ZERO,
        )
    )

    payroll.full_clean()

    payroll.save(
        update_fields=[
            "gross_earnings",
            "total_deductions",
            "lop_deduction",
            "advance_recovery",
            "net_salary",
            "updated_at",
        ]
    )

    return payroll

# ================================================================
# INCENTIVE
# ================================================================


def add_payroll_incentive(
    payroll,
    amount,
    name="Performance Incentive",
    performed_by=None,
    notes="",
):
    return add_payroll_adjustment(
        payroll=payroll,
        name=name,
        code="INCENTIVE",
        amount=amount,
        component_type=PayrollComponent.ComponentType.EARNING,
        source_type=PayrollComponent.SourceType.INCENTIVE,
        notes=notes,
        performed_by=performed_by,
    )


# ================================================================
# BONUS
# ================================================================


def add_payroll_bonus(
    payroll,
    amount,
    name="Bonus",
    performed_by=None,
    notes="",
):
    return add_payroll_adjustment(
        payroll=payroll,
        name=name,
        code="BONUS",
        amount=amount,
        component_type=PayrollComponent.ComponentType.EARNING,
        source_type=PayrollComponent.SourceType.BONUS,
        notes=notes,
        performed_by=performed_by,
    )


# ================================================================
# MANUAL DEDUCTION
# ================================================================


def add_payroll_deduction(
    payroll,
    amount,
    name="Other Deduction",
    performed_by=None,
    notes="",
):
    return add_payroll_adjustment(
        payroll=payroll,
        name=name,
        code="DEDUCTION",
        amount=amount,
        component_type=PayrollComponent.ComponentType.DEDUCTION,
        source_type=PayrollComponent.SourceType.MANUAL,
        notes=notes,
        performed_by=performed_by,
    )


# ================================================================
# ADVANCE RECOVERY
# ================================================================


@transaction.atomic
def add_advance_recovery_to_payroll(
    payroll,
    advance,
    amount=None,
    performed_by=None,
):
    """
    Add salary advance recovery to a calculated payroll.

    The advance's recovered_amount is updated only when
    payroll is actually PAID.
    """

    if payroll.status != Payroll.Status.CALCULATED:
        raise ValidationError(
            (
                "Advance recovery can only be added "
                "to CALCULATED payroll."
            )
        )

    if advance.employee_id != payroll.employee_id:
        raise ValidationError(
            "Advance belongs to another employee."
        )

    if advance.status not in [
        SalaryAdvance.Status.DISBURSED,
        SalaryAdvance.Status.PARTIALLY_RECOVERED,
    ]:
        raise ValidationError(
            (
                "Only DISBURSED or PARTIALLY_RECOVERED "
                "advances can be recovered."
            )
        )

    outstanding = _money(
        advance.outstanding_amount
    )

    if outstanding <= 0:
        raise ValidationError(
            "Salary advance is already fully recovered."
        )

    if amount is None:
        amount = advance.monthly_recovery_amount

    amount = _money(amount)

    if amount <= 0:
        raise ValidationError(
            "Recovery amount must be greater than zero."
        )

    amount = min(
        amount,
        outstanding,
    )

    existing_recovery = payroll.components.filter(
        source_type=PayrollComponent.SourceType.ADVANCE,
        code=f"ADV-{str(advance.id)[:8]}",
    ).exists()

    if existing_recovery:
        raise ValidationError(
            (
                "This salary advance is already included "
                "in the payroll."
            )
        )

    component = PayrollComponent.objects.create(
        payroll=payroll,
        code=f"ADV-{str(advance.id)[:8]}",
        name="Salary Advance Recovery",
        component_type=PayrollComponent.ComponentType.DEDUCTION,
        source_type=PayrollComponent.SourceType.ADVANCE,
        amount=amount,
        notes=f"SalaryAdvance:{advance.id}",
    )

    _recalculate_payroll_totals(
        payroll
    )

    _log_payroll_activity(
        payroll,
        PayrollActivity.ActivityType.ADVANCE_RECOVERY,
        (
            f"Salary advance recovery of "
            f"â‚¹{amount} added."
        ),
        performed_by,
    )

    return component


# ================================================================
# APPROVE PAYROLL
# ================================================================


@transaction.atomic
def approve_payroll(
    payroll,
    approved_by=None,
):
    payroll = Payroll.objects.select_for_update().get(
        pk=payroll.pk
    )

    if payroll.status != Payroll.Status.CALCULATED:
        raise ValidationError(
            "Only CALCULATED payroll can be approved."
        )

    payroll.status = Payroll.Status.APPROVED
    payroll.approved_by = approved_by
    payroll.approved_at = timezone.now()

    payroll.full_clean()
    payroll.save()

    _log_payroll_activity(
        payroll,
        PayrollActivity.ActivityType.APPROVED,
        (
            f"Payroll approved. "
            f"Net salary: â‚¹{payroll.net_salary}."
        ),
        approved_by,
    )

    return payroll


# ================================================================
# PAY PAYROLL
# ================================================================


@transaction.atomic
def pay_payroll(
    payroll,
    payment_method,
    payment_reference,
    paid_by=None,
):
    """
    Mark payroll as paid.

    Advance balances are recovered at this point rather
    than when payroll is merely calculated.
    """

    payroll = Payroll.objects.select_for_update().get(
        pk=payroll.pk
    )

    if payroll.status != Payroll.Status.APPROVED:
        raise ValidationError(
            "Only APPROVED payroll can be paid."
        )

    payment_method = payment_method.strip()
    payment_reference = payment_reference.strip()

    if not payment_method:
        raise ValidationError(
            "Payment method is required."
        )

    if not payment_reference:
        raise ValidationError(
            "Payment reference is required."
        )

    advance_components = payroll.components.filter(
        source_type=PayrollComponent.SourceType.ADVANCE,
    )

    for component in advance_components:

        prefix = "SalaryAdvance:"

        if not component.notes.startswith(prefix):
            raise ValidationError(
                (
                    "Advance recovery component does not contain "
                    "a valid advance reference."
                )
            )

        advance_id = component.notes[
            len(prefix):
        ].strip()

        advance = SalaryAdvance.objects.select_for_update().get(
            pk=advance_id
        )

        new_recovered = (
            advance.recovered_amount
            + component.amount
        )

        if new_recovered > advance.approved_amount:
            raise ValidationError(
                (
                    "Advance recovery would exceed "
                    "the approved advance amount."
                )
            )

        advance.recovered_amount = _money(
            new_recovered
        )

        if (
            advance.recovered_amount
            >= advance.approved_amount
        ):
            advance.status = SalaryAdvance.Status.RECOVERED
        else:
            advance.status = (
                SalaryAdvance.Status.PARTIALLY_RECOVERED
            )

        advance.full_clean()
        advance.save()

    payroll.status = Payroll.Status.PAID
    payroll.paid_by = paid_by
    payroll.paid_at = timezone.now()
    payroll.payment_method = payment_method
    payroll.payment_reference = payment_reference

    payroll.full_clean()
    payroll.save()

    _log_payroll_activity(
        payroll,
        PayrollActivity.ActivityType.PAID,
        (
            f"Payroll paid. Net salary: "
            f"â‚¹{payroll.net_salary}. "
            f"Reference: {payment_reference}."
        ),
        paid_by,
    )

    notify_payroll_paid(payroll)

    return payroll


# ================================================================
# CLOSE PAYROLL PERIOD
# ================================================================


@transaction.atomic
def close_payroll_period(
    period,
    closed_by=None,
):
    period = PayrollPeriod.objects.select_for_update().get(
        pk=period.pk
    )

    unfinished = period.payrolls.exclude(
        status__in=[
            Payroll.Status.PAID,
            Payroll.Status.CANCELLED,
        ]
    )

    if unfinished.exists():
        raise ValidationError(
            (
                "Payroll period cannot be closed while "
                "unfinished payroll records exist."
            )
        )

    period.status = PayrollPeriod.Status.CLOSED
    period.closed_by = closed_by
    period.closed_at = timezone.now()

    period.full_clean()
    period.save()

    return period


# ================================================================
# PAYSLIP DATA
# ================================================================


def get_payslip_data(
    payroll,
):
    """
    Structured data for the future PDF/Next.js payslip.
    """

    earnings = payroll.components.filter(
        component_type=PayrollComponent.ComponentType.EARNING,
    ).order_by(
        "code"
    )

    deductions = payroll.components.filter(
        component_type=PayrollComponent.ComponentType.DEDUCTION,
    ).order_by(
        "code"
    )

    return {
        "employee": {
            "employee_id": payroll.employee.employee_id,
            "name": payroll.employee.employee_name,
            "designation": payroll.employee.current_designation,
            "branch": str(payroll.employee.branch),
            "department": str(payroll.employee.department),
        },
        "period": {
            "year": payroll.period.year,
            "month": payroll.period.month,
            "start_date": payroll.period.start_date,
            "end_date": payroll.period.end_date,
        },
        "attendance": {
            "calendar_days": payroll.calendar_days,
            "payable_days": payroll.payable_days,
            "present_days": payroll.present_days,
            "paid_leave_days": payroll.paid_leave_days,
            "unpaid_leave_days": payroll.unpaid_leave_days,
            "lop_days": payroll.lop_days,
        },
        "earnings": [
            {
                "code": item.code,
                "name": item.name,
                "amount": item.amount,
            }
            for item in earnings
        ],
        "deductions": [
            {
                "code": item.code,
                "name": item.name,
                "amount": item.amount,
            }
            for item in deductions
        ],
        "summary": {
            "gross_earnings": payroll.gross_earnings,
            "total_deductions": payroll.total_deductions,
            "lop_deduction": payroll.lop_deduction,
            "advance_recovery": payroll.advance_recovery,
            "net_salary": payroll.net_salary,
        },
        "payment": {
            "status": payroll.status,
            "paid_at": payroll.paid_at,
            "payment_method": payroll.payment_method,
            "payment_reference": payroll.payment_reference,
        },
    }


# ================================================================
# PAYROLL QUERIES
# ================================================================


def get_employee_payrolls(
    employee,
):
    return Payroll.objects.filter(
        employee=employee,
    ).select_related(
        "period",
        "salary_structure",
    ).order_by(
        "-period__year",
        "-period__month",
    )


def get_period_payrolls(
    period,
):
    return Payroll.objects.filter(
        period=period,
    ).select_related(
        "employee",
        "salary_structure",
    ).order_by(
        "employee__employee_id"
    )


def get_payroll_summary(
    period,
):
    payrolls = Payroll.objects.filter(
        period=period,
    )

    gross = MONEY_ZERO
    deductions = MONEY_ZERO
    net = MONEY_ZERO

    for payroll in payrolls:
        gross += payroll.gross_earnings
        deductions += payroll.total_deductions
        net += payroll.net_salary

    return {
        "period": str(period),
        "employees": payrolls.count(),
        "gross_earnings": _money(gross),
        "total_deductions": _money(deductions),
        "net_payroll": _money(net),
        "draft": payrolls.filter(
            status=Payroll.Status.DRAFT
        ).count(),
        "calculated": payrolls.filter(
            status=Payroll.Status.CALCULATED
        ).count(),
        "approved": payrolls.filter(
            status=Payroll.Status.APPROVED
        ).count(),
        "paid": payrolls.filter(
            status=Payroll.Status.PAID
        ).count(),
    }

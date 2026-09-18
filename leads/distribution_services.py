from django.core.exceptions import (
    PermissionDenied,
    ValidationError,
)
from django.db import transaction
from django.db.models import Count

from accounts.models import UserRole
from hr.models import Employee

from .models import Lead
from .services import assign_lead


# ================================================================
# ACTIVE LEAD STATUSES USED FOR WORKLOAD
# ================================================================

ACTIVE_WORKLOAD_STATUSES = [
    Lead.Status.ASSIGNED,
    Lead.Status.CONTACTED,
    Lead.Status.FOLLOW_UP,
    Lead.Status.QUALIFIED,
]


# ================================================================
# TARGET EMPLOYEE VALIDATION
# ================================================================

def get_target_employee(user):
    """
    Return the active Employee profile connected to the selected user.

    Assignment is not allowed when:
    - the Django user is inactive;
    - no Employee profile exists;
    - the Employee record is not ACTIVE.
    """

    if not user.is_active:
        raise ValidationError(
            "Cannot assign leads to an inactive user."
        )

    try:
        employee = (
            Employee.objects
            .select_related(
                "user",
                "branch",
                "branch__business_unit",
                "department",
                "reporting_manager",
            )
            .get(
                user=user
            )
        )

    except Employee.DoesNotExist:
        raise ValidationError(
            "The selected user does not have "
            "an employee profile."
        )

    if (
        employee.employment_status
        != Employee.EmploymentStatus.ACTIVE
    ):
        raise ValidationError(
            "Cannot assign leads to "
            "an inactive employee."
        )

    return employee


# ================================================================
# EMPLOYEE SCOPE CHECK
# ================================================================

def target_employee_is_in_scope(
    performed_by,
    target_employee,
):
    """
    Check whether target_employee is inside the organizational
    scope of performed_by.
    """

    if performed_by.is_superuser:
        return True

    assignments = (
        UserRole.objects
        .filter(
            user=performed_by,
            is_active=True,
        )
        .select_related(
            "business_unit",
            "branch",
            "department",
        )
    )

    requester_employee = None

    for assignment in assignments:

        scope_type = assignment.scope_type

        # --------------------------------------------------------
        # ORGANIZATION
        # --------------------------------------------------------

        if (
            scope_type
            == UserRole.ScopeType.ORGANIZATION
        ):
            return True

        # --------------------------------------------------------
        # BUSINESS UNIT
        # --------------------------------------------------------

        if (
            scope_type
            == UserRole.ScopeType.BUSINESS_UNIT
            and assignment.business_unit_id
            and target_employee.branch_id
            and (
                target_employee
                .branch
                .business_unit_id
                == assignment.business_unit_id
            )
        ):
            return True

        # --------------------------------------------------------
        # BRANCH
        # --------------------------------------------------------

        if (
            scope_type
            == UserRole.ScopeType.BRANCH
            and assignment.branch_id
            and (
                target_employee.branch_id
                == assignment.branch_id
            )
        ):
            return True

        # --------------------------------------------------------
        # DEPARTMENT
        # --------------------------------------------------------

        if (
            scope_type
            == UserRole.ScopeType.DEPARTMENT
            and assignment.department_id
            and (
                target_employee.department_id
                == assignment.department_id
            )
        ):

            # If the department belongs to a branch,
            # target employee must also belong to that branch.

            if (
                assignment.department
                and assignment.department.branch_id
                and (
                    target_employee.branch_id
                    != assignment.department.branch_id
                )
            ):
                continue

            return True

        # --------------------------------------------------------
        # TEAM
        # --------------------------------------------------------

        if (
            scope_type
            == UserRole.ScopeType.TEAM
        ):

            if requester_employee is None:

                try:
                    requester_employee = (
                        Employee.objects.get(
                            user=performed_by
                        )
                    )

                except Employee.DoesNotExist:
                    requester_employee = False

            if requester_employee:

                if (
                    target_employee.id
                    == requester_employee.id
                    or (
                        target_employee
                        .reporting_manager_id
                        == requester_employee.id
                    )
                ):
                    return True

        # --------------------------------------------------------
        # OWN
        # --------------------------------------------------------

        if (
            scope_type
            == UserRole.ScopeType.OWN
            and (
                target_employee.user_id
                == performed_by.id
            )
        ):
            return True

    return False


# ================================================================
# VALIDATE ASSIGNMENT TARGET
# ================================================================

def validate_assignment_target(
    performed_by,
    target_user,
):
    """
    Validate that a selected user can receive leads.
    """

    target_employee = get_target_employee(
        target_user
    )

    if not target_employee_is_in_scope(
        performed_by,
        target_employee,
    ):
        raise PermissionDenied(
            "The selected user is outside "
            "your permitted employee scope."
        )

    return target_employee


# ================================================================
# BULK ASSIGNMENT
# ================================================================

@transaction.atomic
def bulk_assign_leads(
    *,
    leads,
    target_user,
    performed_by,
):
    """
    Assign multiple leads to one employee.

    Target validation happens before any lead is changed.
    """

    validate_assignment_target(
        performed_by,
        target_user,
    )

    lead_ids = [
        lead.id
        for lead in leads
    ]

    locked_leads = list(
        Lead.objects
        .select_for_update()
        .filter(
            id__in=lead_ids
        )
        .order_by(
            "created_at",
            "id",
        )
    )

    if len(locked_leads) != len(lead_ids):
        raise ValidationError(
            "One or more selected leads "
            "no longer exist."
        )

    for lead in locked_leads:

        assign_lead(
            lead=lead,
            user=target_user,
            performed_by=performed_by,
        )

    return locked_leads


# ================================================================
# ROUND-ROBIN DISTRIBUTION
# ================================================================

@transaction.atomic
def distribute_leads(
    *,
    leads,
    target_users,
    performed_by,
):
    """
    Distribute selected leads across selected employees
    using round-robin assignment.
    """

    if not target_users:
        raise ValidationError(
            "Select at least one employee."
        )

    # ------------------------------------------------------------
    # Validate ALL employees before assigning ANY lead.
    #
    # This prevents partial assignment if one selected employee
    # is invalid or outside the manager's scope.
    # ------------------------------------------------------------

    for target_user in target_users:

        validate_assignment_target(
            performed_by,
            target_user,
        )

    lead_ids = [
        lead.id
        for lead in leads
    ]

    locked_leads = list(
        Lead.objects
        .select_for_update()
        .filter(
            id__in=lead_ids
        )
        .order_by(
            "created_at",
            "id",
        )
    )

    if len(locked_leads) != len(lead_ids):
        raise ValidationError(
            "One or more selected leads "
            "no longer exist."
        )

    # Preserve selected employee order.

    distribution = {
        str(user.id): {
            "user": user,
            "assigned_count": 0,
        }
        for user in target_users
    }

    # ------------------------------------------------------------
    # ROUND ROBIN
    # ------------------------------------------------------------

    for index, lead in enumerate(
        locked_leads
    ):

        target_user = target_users[
            index % len(target_users)
        ]

        assign_lead(
            lead=lead,
            user=target_user,
            performed_by=performed_by,
        )

        distribution[
            str(target_user.id)
        ][
            "assigned_count"
        ] += 1

    return (
        locked_leads,
        distribution,
    )


# ================================================================
# TELECALLER / EMPLOYEE WORKLOAD
# ================================================================

def get_assignment_workload(
    *,
    performed_by,
    lead_queryset,
):
    """
    Return assignment workload for employees visible to
    performed_by.

    IMPORTANT:
    lead_queryset must already be scoped for performed_by.
    This prevents workload counts from exposing leads belonging
    to another organizational scope.
    """

    employees = (
        Employee.objects
        .filter(
            employment_status=(
                Employee
                .EmploymentStatus
                .ACTIVE
            ),
            user__isnull=False,
            user__is_active=True,
        )
        .select_related(
            "user",
            "branch",
            "branch__business_unit",
            "department",
            "reporting_manager",
        )
        .order_by(
            "user__first_name",
            "user__last_name",
            "employee_id",
        )
    )

    # ------------------------------------------------------------
    # EMPLOYEES VISIBLE TO REQUESTER
    # ------------------------------------------------------------

    eligible = [
        employee
        for employee in employees
        if target_employee_is_in_scope(
            performed_by,
            employee,
        )
    ]

    eligible_user_ids = [
        employee.user_id
        for employee in eligible
    ]

    # ------------------------------------------------------------
    # COUNT ONLY SCOPED ACTIVE LEADS
    # ------------------------------------------------------------

    workload_counts = {
        row["assigned_to"]: row["count"]
        for row in (
            lead_queryset
            .filter(
                assigned_to_id__in=(
                    eligible_user_ids
                ),
                status__in=(
                    ACTIVE_WORKLOAD_STATUSES
                ),
            )
            .values(
                "assigned_to"
            )
            .annotate(
                count=Count("id")
            )
        )
    }

    # ------------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------------

    result = []

    for employee in eligible:

        user = employee.user

        full_name = (
            user.get_full_name().strip()
            or user.username
        )

        result.append(
            {
                "employee_id": str(
                    employee.id
                ),

                "employee_code": (
                    employee.employee_id
                ),

                "user_id": str(
                    user.id
                ),

                "name": full_name,

                "username": (
                    user.username
                ),

                "department": (
                    employee.department.name
                    if employee.department
                    else None
                ),

                "branch": (
                    employee.branch.name
                    if employee.branch
                    else None
                ),

                "active_leads": (
                    workload_counts.get(
                        user.id,
                        0,
                    )
                ),
            }
        )

    return result
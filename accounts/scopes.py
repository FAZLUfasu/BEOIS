from django.db.models import Q

from accounts.models import UserRole
from hr.models import Employee
from leads.models import Lead


def scope_employee_queryset(user, queryset=None):
    """
    Restrict an Employee queryset according to the active
    BEOIS UserRole scope assignments of the logged-in user.

    Permission and data scope are separate:

        Permission -> What the user can do.
        Scope      -> Which records the user can access.
    """

    if queryset is None:
        queryset = Employee.objects.all()

    # Anonymous or inactive users receive no records.
    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    # Django superuser has unrestricted access.
    if user.is_superuser:
        return queryset

    assignments = (
        UserRole.objects
        .filter(
            user=user,
            is_active=True,
            role__is_active=True,
        )
        .select_related(
            "role",
            "business_unit",
            "branch",
            "department",
        )
    )

    scope_filter = Q()
    has_scope = False

    for assignment in assignments:

        # ---------------------------------------------------------
        # ORGANIZATION
        # ---------------------------------------------------------
        if assignment.scope_type == UserRole.ScopeType.ORGANIZATION:
            return queryset

        # ---------------------------------------------------------
        # BUSINESS UNIT
        # ---------------------------------------------------------
        if (
            assignment.scope_type == UserRole.ScopeType.BUSINESS_UNIT
            and assignment.business_unit_id
        ):
            scope_filter |= Q(
                branch__business_unit_id=assignment.business_unit_id
            )

            has_scope = True

        # ---------------------------------------------------------
        # BRANCH
        # ---------------------------------------------------------
        elif (
            assignment.scope_type == UserRole.ScopeType.BRANCH
            and assignment.branch_id
        ):
            scope_filter |= Q(
                branch_id=assignment.branch_id
            )

            has_scope = True

        # ---------------------------------------------------------
        # DEPARTMENT
        # ---------------------------------------------------------
        elif (
            assignment.scope_type == UserRole.ScopeType.DEPARTMENT
            and assignment.department_id
        ):
            department_filter = Q(
                department_id=assignment.department_id
            )

            # Optional branch restriction.
            if assignment.branch_id:
                department_filter &= Q(
                    branch_id=assignment.branch_id
                )

            # Optional business-unit restriction.
            if assignment.business_unit_id:
                department_filter &= Q(
                    branch__business_unit_id=assignment.business_unit_id
                )

            scope_filter |= department_filter

            has_scope = True

        # ---------------------------------------------------------
        # TEAM
        # ---------------------------------------------------------
        elif assignment.scope_type == UserRole.ScopeType.TEAM:

            manager_employee = Employee.objects.filter(
                user=user
            ).first()

            if manager_employee:
                scope_filter |= (
                    Q(reporting_manager=manager_employee)
                    | Q(pk=manager_employee.pk)
                )

                has_scope = True

        # ---------------------------------------------------------
        # OWN
        # ---------------------------------------------------------
        elif assignment.scope_type == UserRole.ScopeType.OWN:

            scope_filter |= Q(
                user=user
            )

            has_scope = True

    # User has no valid scope.
    if not has_scope:
        return queryset.none()

    return queryset.filter(
        scope_filter
    ).distinct()


# =================================================================
# LEAD DATA SCOPE
# =================================================================


def scope_lead_queryset(user, queryset=None):
    """
    Restrict Lead records according to the user's active
    BEOIS UserRole data-scope assignments.

    Examples:

        OWN
            -> Leads assigned directly to the logged-in user.

        TEAM
            -> Leads assigned to the logged-in manager
               and employees reporting to that manager.

        DEPARTMENT
            -> Leads assigned to employees belonging
               to the selected department.

        BRANCH
            -> Leads assigned to employees belonging
               to the selected branch.

        BUSINESS_UNIT
            -> Leads assigned to employees belonging
               to branches inside the selected business unit.

        ORGANIZATION
            -> All leads.

    Unassigned leads are intentionally NOT automatically exposed.
    A separate lead-pool / allocation mechanism can handle them.
    """

    if queryset is None:
        queryset = Lead.objects.all()

    # -------------------------------------------------------------
    # BASIC SECURITY
    # -------------------------------------------------------------

    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    # Django superuser receives unrestricted access.
    if user.is_superuser:
        return queryset

    # -------------------------------------------------------------
    # LOAD ACTIVE ROLE ASSIGNMENTS
    # -------------------------------------------------------------

    assignments = (
        UserRole.objects
        .filter(
            user=user,
            is_active=True,
            role__is_active=True,
        )
        .select_related(
            "role",
            "business_unit",
            "branch",
            "department",
        )
    )

    scope_filter = Q()
    has_scope = False

    # -------------------------------------------------------------
    # PROCESS EACH ACTIVE SCOPE
    # -------------------------------------------------------------

    for assignment in assignments:

        # =========================================================
        # ORGANIZATION
        # =========================================================

        if assignment.scope_type == UserRole.ScopeType.ORGANIZATION:
            return queryset

        # =========================================================
        # OWN
        # =========================================================

        if assignment.scope_type == UserRole.ScopeType.OWN:

            scope_filter |= Q(
                assigned_to=user
            )

            has_scope = True

        # =========================================================
        # TEAM
        # =========================================================

        elif assignment.scope_type == UserRole.ScopeType.TEAM:

            manager_employee = Employee.objects.filter(
                user=user
            ).first()

            if manager_employee:

                team_user_ids = Employee.objects.filter(
                    reporting_manager=manager_employee,
                    user__isnull=False,
                ).values_list(
                    "user_id",
                    flat=True,
                )

                team_filter = (
                    Q(assigned_to=user)
                    | Q(assigned_to_id__in=team_user_ids)
                )

                scope_filter |= team_filter

                has_scope = True

        # =========================================================
        # DEPARTMENT
        # =========================================================

        elif (
            assignment.scope_type == UserRole.ScopeType.DEPARTMENT
            and assignment.department_id
        ):

            department_employees = Employee.objects.filter(
                department_id=assignment.department_id,
                user__isnull=False,
            )

            # Optional branch restriction.
            if assignment.branch_id:
                department_employees = department_employees.filter(
                    branch_id=assignment.branch_id
                )

            # Optional business-unit restriction.
            if assignment.business_unit_id:
                department_employees = department_employees.filter(
                    branch__business_unit_id=assignment.business_unit_id
                )

            department_user_ids = (
                department_employees.values_list(
                    "user_id",
                    flat=True,
                )
            )

            scope_filter |= Q(
                assigned_to_id__in=department_user_ids
            )

            has_scope = True

        # =========================================================
        # BRANCH
        # =========================================================

        elif (
            assignment.scope_type == UserRole.ScopeType.BRANCH
            and assignment.branch_id
        ):

            branch_user_ids = Employee.objects.filter(
                branch_id=assignment.branch_id,
                user__isnull=False,
            ).values_list(
                "user_id",
                flat=True,
            )

            scope_filter |= Q(
                assigned_to_id__in=branch_user_ids
            )

            has_scope = True

        # =========================================================
        # BUSINESS UNIT
        # =========================================================

        elif (
            assignment.scope_type == UserRole.ScopeType.BUSINESS_UNIT
            and assignment.business_unit_id
        ):

            business_unit_user_ids = Employee.objects.filter(
                branch__business_unit_id=assignment.business_unit_id,
                user__isnull=False,
            ).values_list(
                "user_id",
                flat=True,
            )

            scope_filter |= Q(
                assigned_to_id__in=business_unit_user_ids
            )

            has_scope = True

    # -------------------------------------------------------------
    # NO VALID SCOPE
    # -------------------------------------------------------------

    if not has_scope:
        return queryset.none()

    # -------------------------------------------------------------
    # FINAL FILTERED QUERYSET
    # -------------------------------------------------------------

    return queryset.filter(
        scope_filter
    ).distinct()
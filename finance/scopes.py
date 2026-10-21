from django.db.models import Q

from accounts.models import UserRole
from finance.models import (
    Expense,
    FinancialAccount,
    FinancialTransaction,
    FinanceActivity,
    UniversityPayable,
)


def _active_assignments(user):
    if (
        not user
        or not user.is_authenticated
        or not user.is_active
    ):
        return UserRole.objects.none()

    return UserRole.objects.filter(
        user=user,
        is_active=True,
        role__is_active=True,
    ).select_related(
        "role",
        "business_unit",
        "branch",
        "department",
    )


def _organizational_filter(assignment, branch_path, unit_path):
    """
    Build a filter for records with branch/business-unit ownership.
    Return None when this assignment cannot safely scope the model.
    """
    scope = assignment.scope_type

    if scope == UserRole.ScopeType.ORGANIZATION:
        return Q()

    if (
        scope == UserRole.ScopeType.BRANCH
        and assignment.branch_id
    ):
        return Q(**{
            f"{branch_path}_id": assignment.branch_id
        })

    if (
        scope == UserRole.ScopeType.BUSINESS_UNIT
        and assignment.business_unit_id
    ):
        return Q(**{
            f"{unit_path}_id": assignment.business_unit_id
        })

    if scope == UserRole.ScopeType.DEPARTMENT:
        # Finance models do not expose a verified direct department
        # relationship. Department access must fail closed.
        return None

    return None


def scope_financial_accounts(user, queryset=None):
    queryset = (
        FinancialAccount.objects.all()
        if queryset is None
        else queryset
    )

    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    if user.is_superuser:
        return queryset

    assignments = _active_assignments(user)
    result = Q()
    has_scope = False

    for assignment in assignments:
        if assignment.scope_type == UserRole.ScopeType.ORGANIZATION:
            return queryset

        if assignment.scope_type == UserRole.ScopeType.BRANCH:
            if assignment.branch_id:
                result |= Q(branch_id=assignment.branch_id)
                has_scope = True

        elif assignment.scope_type == UserRole.ScopeType.BUSINESS_UNIT:
            if assignment.business_unit_id:
                result |= (
                    Q(business_unit_id=assignment.business_unit_id)
                    | Q(
                        business_unit__isnull=True,
                        branch__business_unit_id=assignment.business_unit_id,
                    )
                )
                has_scope = True

        elif assignment.scope_type == UserRole.ScopeType.DEPARTMENT:
            # No verified direct department relationship exists on
            # FinancialAccount. Do not widen department scope.
            continue

    return queryset.filter(result).distinct() if has_scope else queryset.none()


def scope_expenses(user, queryset=None):
    queryset = Expense.objects.all() if queryset is None else queryset

    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    if user.is_superuser:
        return queryset

    result = Q()
    has_scope = False

    for assignment in _active_assignments(user):
        if assignment.scope_type == UserRole.ScopeType.ORGANIZATION:
            return queryset

        if assignment.scope_type == UserRole.ScopeType.OWN:
            result |= Q(requested_by=user)
            has_scope = True

        elif assignment.scope_type == UserRole.ScopeType.TEAM:
            from hr.models import Employee

            manager = Employee.objects.filter(user=user).first()
            if manager:
                team_ids = Employee.objects.filter(
                    reporting_manager=manager,
                    user__isnull=False,
                ).values_list("user_id", flat=True)

                result |= (
                    Q(requested_by=user)
                    | Q(requested_by_id__in=team_ids)
                )
                has_scope = True

        else:
            branch_filter = _organizational_filter(
                assignment,
                "branch",
                "business_unit",
            )
            if branch_filter is not None:
                result |= branch_filter
                has_scope = True

    return queryset.filter(result).distinct() if has_scope else queryset.none()


def scope_financial_transactions(user, queryset=None):
    queryset = (
        FinancialTransaction.objects.all()
        if queryset is None
        else queryset
    )

    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    if user.is_superuser:
        return queryset

    result = Q()
    has_scope = False

    for assignment in _active_assignments(user):
        if assignment.scope_type == UserRole.ScopeType.ORGANIZATION:
            return queryset

        if assignment.scope_type == UserRole.ScopeType.OWN:
            result |= Q(created_by=user)
            has_scope = True
            continue

        if assignment.scope_type == UserRole.ScopeType.TEAM:
            from hr.models import Employee

            manager = Employee.objects.filter(user=user).first()
            if manager:
                team_ids = Employee.objects.filter(
                    reporting_manager=manager,
                    user__isnull=False,
                ).values_list("user_id", flat=True)

                result |= (
                    Q(created_by=user)
                    | Q(created_by_id__in=team_ids)
                )
                has_scope = True
            continue

        if assignment.scope_type == UserRole.ScopeType.BRANCH:
            if assignment.branch_id:
                result |= (
                    Q(branch_id=assignment.branch_id)
                    | Q(
                        branch__isnull=True,
                        account__branch_id=assignment.branch_id,
                    )
                )
                has_scope = True

        elif assignment.scope_type == UserRole.ScopeType.BUSINESS_UNIT:
            if assignment.business_unit_id:
                result |= (
                    Q(business_unit_id=assignment.business_unit_id)
                    | Q(
                        business_unit__isnull=True,
                        branch__isnull=True,
                        account__business_unit_id=assignment.business_unit_id,
                    )
                    | Q(
                        business_unit__isnull=True,
                        branch__business_unit_id=assignment.business_unit_id,
                    )
                )
                has_scope = True

        elif assignment.scope_type == UserRole.ScopeType.DEPARTMENT:
            # No verified direct department relationship exists on
            # FinancialTransaction. Do not widen department scope.
            continue

    return queryset.filter(result).distinct() if has_scope else queryset.none()


def scope_university_payables(user, queryset=None):
    queryset = (
        UniversityPayable.objects.all()
        if queryset is None
        else queryset
    )

    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    if user.is_superuser:
        return queryset

    result = Q()
    has_scope = False

    for assignment in _active_assignments(user):
        if assignment.scope_type == UserRole.ScopeType.ORGANIZATION:
            return queryset

        if assignment.scope_type == UserRole.ScopeType.OWN:
            result |= (
                Q(created_by=user)
                | Q(admission__created_by=user)
                | Q(admission__assigned_to=user)
                | Q(admission__lead__assigned_to=user)
            )
            has_scope = True

        elif assignment.scope_type == UserRole.ScopeType.TEAM:
            from hr.models import Employee

            manager = Employee.objects.filter(user=user).first()
            if manager:
                team_ids = Employee.objects.filter(
                    reporting_manager=manager,
                    user__isnull=False,
                ).values_list("user_id", flat=True)

                result |= (
                    Q(created_by=user)
                    | Q(created_by_id__in=team_ids)
                    | Q(admission__assigned_to_id__in=team_ids)
                    | Q(admission__lead__assigned_to_id__in=team_ids)
                )
                has_scope = True

        # Payables do not have direct branch/business-unit fields.
        # Until their organizational relationship is verified,
        # do not expose them to restricted organizational scopes.

    return queryset.filter(result).distinct() if has_scope else queryset.none()


def scope_finance_activity(user, queryset=None):
    queryset = (
        FinanceActivity.objects.all()
        if queryset is None
        else queryset
    )

    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()

    if user.is_superuser:
        return queryset

    return queryset.filter(
        Q(financial_transaction__in=scope_financial_transactions(
            user, FinancialTransaction.objects.all()
        ))
        | Q(expense__in=scope_expenses(
            user, Expense.objects.all()
        ))
        | Q(university_payable__in=scope_university_payables(
            user, UniversityPayable.objects.all()
        ))
    ).distinct()

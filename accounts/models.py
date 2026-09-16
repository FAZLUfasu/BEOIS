import uuid

from django.contrib.auth.models import AbstractUser, Permission
from django.core.exceptions import ValidationError
from django.db import models


# ============================================================
# USER
# ============================================================

class User(AbstractUser):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(
        unique=True,
    )

    phone_number = models.CharField(
        max_length=20,
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

    def __str__(self):
        full_name = self.get_full_name().strip()

        if full_name:
            return full_name

        return self.username

    # --------------------------------------------------------
    # BEOIS ROLE HELPERS
    # --------------------------------------------------------

    def has_role(self, role_code):
        if not self.is_active:
            return False

        if self.is_superuser:
            return True

        return self.role_assignments.filter(
            role__code=role_code,
            role__is_active=True,
            is_active=True,
        ).exists()

    @property
    def active_roles(self):
        if not self.is_active:
            return Role.objects.none()

        return Role.objects.filter(
            user_assignments__user=self,
            user_assignments__is_active=True,
            is_active=True,
        ).distinct()

    # --------------------------------------------------------
    # BEOIS ROLE PERMISSIONS
    # --------------------------------------------------------

    def get_role_permissions(self):
        if not self.is_active:
            return set()

        if self.is_superuser:
            permissions = Permission.objects.values_list(
                "content_type__app_label",
                "codename",
            )
        else:
            permissions = Permission.objects.filter(
                beois_roles__user_assignments__user=self,
                beois_roles__user_assignments__is_active=True,
                beois_roles__is_active=True,
            ).values_list(
                "content_type__app_label",
                "codename",
            ).distinct()

        return {
            f"{app_label}.{codename}"
            for app_label, codename in permissions
        }

    def has_role_permission(self, permission_name):
        if not self.is_active:
            return False

        if self.is_superuser:
            return True

        return permission_name in self.get_role_permissions()


# ============================================================
# ROLE
# ============================================================

class Role(models.Model):
    """
    BEOIS Role Master.

    Examples:
    - Chairman / Management
    - General Manager
    - Department Head
    - Telecaller
    - HR Staff
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
        max_length=50,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name="beois_roles",
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


# ============================================================
# USER ROLE + DATA SCOPE
# ============================================================

class UserRole(models.Model):
    """
    Connects a User with a BEOIS Role and defines
    the organizational scope of that role assignment.
    """

    class ScopeType(models.TextChoices):
        OWN = "OWN", "Own Records"
        TEAM = "TEAM", "Own Team"
        DEPARTMENT = "DEPARTMENT", "Department"
        BRANCH = "BRANCH", "Branch"
        BUSINESS_UNIT = "BUSINESS_UNIT", "Business Unit"
        ORGANIZATION = "ORGANIZATION", "Entire Organization"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="role_assignments",
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="user_assignments",
    )

    # --------------------------------------------------------
    # DATA SCOPE
    # --------------------------------------------------------

    scope_type = models.CharField(
        max_length=30,
        choices=ScopeType.choices,
        default=ScopeType.OWN,
    )

    business_unit = models.ForeignKey(
        "organization.BusinessUnit",
        on_delete=models.PROTECT,
        related_name="user_role_scopes",
        null=True,
        blank=True,
    )

    branch = models.ForeignKey(
        "organization.Branch",
        on_delete=models.PROTECT,
        related_name="user_role_scopes",
        null=True,
        blank=True,
    )

    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.PROTECT,
        related_name="user_role_scopes",
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
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
            "user__username",
            "role__name",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "role",
                ],
                name="unique_user_role",
            )
        ]

        indexes = [
            models.Index(
                fields=["user", "is_active"],
                name="accounts_userrole_user_idx",
            ),
            models.Index(
                fields=["role", "is_active"],
                name="accounts_userrole_role_idx",
            ),
            models.Index(
                fields=["scope_type"],
                name="accounts_userrole_scope_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} - {self.role} "
            f"({self.get_scope_type_display()})"
        )

    def clean(self):
        super().clean()

        errors = {}

        # ----------------------------------------------------
        # ROLE VALIDATION
        # ----------------------------------------------------

        if self.role_id and not self.role.is_active:
            errors["role"] = (
                "Inactive roles cannot be assigned to users."
            )

        # ----------------------------------------------------
        # REQUIRED SCOPE TARGETS
        # ----------------------------------------------------

        if (
            self.scope_type == self.ScopeType.BUSINESS_UNIT
            and not self.business_unit_id
        ):
            errors["business_unit"] = (
                "Select a business unit for Business Unit scope."
            )

        if (
            self.scope_type == self.ScopeType.BRANCH
            and not self.branch_id
        ):
            errors["branch"] = (
                "Select a branch for Branch scope."
            )

        if (
            self.scope_type == self.ScopeType.DEPARTMENT
            and not self.department_id
        ):
            errors["department"] = (
                "Select a department for Department scope."
            )

        # ----------------------------------------------------
        # BUSINESS UNIT / BRANCH CONSISTENCY
        # ----------------------------------------------------

        if self.branch_id and self.business_unit_id:
            if (
                self.branch.business_unit_id
                != self.business_unit_id
            ):
                errors["branch"] = (
                    "The selected branch does not belong to "
                    "the selected business unit."
                )

        # ----------------------------------------------------
        # DEPARTMENT / BRANCH CONSISTENCY
        # ----------------------------------------------------
        #
        # A shared department has department.branch = NULL,
        # so it is intentionally allowed with different
        # authorized branches.
        # ----------------------------------------------------

        if self.department_id and self.branch_id:
            if (
                self.department.branch_id
                and self.department.branch_id
                != self.branch_id
            ):
                errors["department"] = (
                    "The selected department belongs to "
                    "a different branch."
                )

        if errors:
            raise ValidationError(errors)
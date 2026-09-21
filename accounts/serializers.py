from rest_framework import serializers

from .models import User


class CurrentUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "is_superuser",
            "roles",
            "permissions",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return (
            obj.get_full_name().strip()
            or obj.username
        )

    def get_roles(self, obj):
        assignments = (
            obj.role_assignments
            .filter(
                is_active=True,
                role__is_active=True,
            )
            .select_related(
                "role",
                "business_unit",
                "branch",
                "department",
            )
            .order_by("role__name")
        )

        return [
            {
                "id": str(
                    assignment.role_id
                ),
                "code": assignment.role.code,
                "name": assignment.role.name,
                "scope_type": (
                    assignment.scope_type
                ),
                "scope_display": (
                    assignment
                    .get_scope_type_display()
                ),
                "business_unit": (
                    {
                        "id": str(
                            assignment.business_unit_id
                        ),
                        "name": str(
                            assignment.business_unit
                        ),
                    }
                    if assignment.business_unit_id
                    else None
                ),
                "branch": (
                    {
                        "id": str(
                            assignment.branch_id
                        ),
                        "name": str(
                            assignment.branch
                        ),
                    }
                    if assignment.branch_id
                    else None
                ),
                "department": (
                    {
                        "id": str(
                            assignment.department_id
                        ),
                        "name": str(
                            assignment.department
                        ),
                    }
                    if assignment.department_id
                    else None
                ),
            }
            for assignment in assignments
        ]

    def get_permissions(self, obj):
        return sorted(
            obj.get_role_permissions()
        )


class UserDirectorySerializer(
    serializers.ModelSerializer
):
    full_name = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    has_employee_profile = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "is_active",
            "employee_id",
            "has_employee_profile",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return (
            obj.get_full_name().strip()
            or obj.username
        )

    def get_employee_id(self, obj):
        employee = getattr(
            obj,
            "employee_profile",
            None,
        )

        if employee is None:
            return None

        return employee.employee_id

    def get_has_employee_profile(self, obj):
        return (
            getattr(
                obj,
                "employee_profile",
                None,
            )
            is not None
        )
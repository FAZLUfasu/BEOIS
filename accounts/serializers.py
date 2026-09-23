from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers

from organization.models import (
    Branch,
    BusinessUnit,
    Department,
)

from .models import (
    Role,
    User,
    UserRole,
)



class ProfilePictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "profile_picture",
        ]

    def validate_profile_picture(self, value):
        if not value:
            raise serializers.ValidationError(
                "Please select a profile picture."
            )

        max_size = 5 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Profile picture must not exceed 5 MB."
            )

        allowed_content_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        content_type = getattr(
            value,
            "content_type",
            "",
        )

        if (
            content_type
            and content_type not in allowed_content_types
        ):
            raise serializers.ValidationError(
                "Only JPG, PNG and WEBP images are allowed."
            )

        return value
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
            "profile_picture",
            "is_superuser",
            "roles",
            "permissions",
        ]
        read_only_fields = [
            "id",
            "username",
            "full_name",
            "profile_picture",
            "is_superuser",
            "roles",
            "permissions",
        ]

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Email address is required."
            )

        queryset = User.objects.filter(
            email__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )

        return value
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
            "profile_picture",
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
class AdminRoleReferenceSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
        ]
        read_only_fields = fields


class AdminUserRoleSerializer(
    serializers.ModelSerializer
):
    role_name = serializers.CharField(
        source="role.name",
        read_only=True,
    )
    role_code = serializers.CharField(
        source="role.code",
        read_only=True,
    )
    scope_display = serializers.CharField(
        source="get_scope_type_display",
        read_only=True,
    )

    class Meta:
        model = UserRole
        fields = [
            "id",
            "role",
            "role_name",
            "role_code",
            "scope_type",
            "scope_display",
            "business_unit",
            "branch",
            "department",
            "is_active",
            "notes",
        ]
        read_only_fields = [
            "id",
            "role_name",
            "role_code",
            "scope_display",
        ]

    def validate(self, attrs):
        instance = self.instance

        values = {
            "role": attrs.get(
                "role",
                getattr(instance, "role", None),
            ),
            "scope_type": attrs.get(
                "scope_type",
                getattr(
                    instance,
                    "scope_type",
                    UserRole.ScopeType.OWN,
                ),
            ),
            "business_unit": attrs.get(
                "business_unit",
                getattr(
                    instance,
                    "business_unit",
                    None,
                ),
            ),
            "branch": attrs.get(
                "branch",
                getattr(
                    instance,
                    "branch",
                    None,
                ),
            ),
            "department": attrs.get(
                "department",
                getattr(
                    instance,
                    "department",
                    None,
                ),
            ),
            "is_active": attrs.get(
                "is_active",
                getattr(instance, "is_active", True),
            ),
            "notes": attrs.get(
                "notes",
                getattr(instance, "notes", ""),
            ),
        }

        candidate = UserRole(
            user=(
                instance.user
                if instance
                else self.context["target_user"]
            ),
            **values,
        )

        try:
            candidate.clean()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(
                    exc.message_dict
                )

            raise serializers.ValidationError(
                exc.messages
            )

        return attrs

    def validate_role(self, value):
        if not value.is_active:
            raise serializers.ValidationError(
                "Inactive roles cannot be assigned."
            )

        return value


class AdminUserSerializer(
    serializers.ModelSerializer
):
    full_name = serializers.SerializerMethodField()
    roles = AdminUserRoleSerializer(
        source="role_assignments",
        many=True,
        read_only=True,
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
            "profile_picture",
            "is_active",
            "is_superuser",
            "date_joined",
            "last_login",
            "roles",
        ]
        read_only_fields = [
            "id",
            "full_name",
            "is_superuser",
            "date_joined",
            "last_login",
            "roles",
        ]

    def get_full_name(self, obj):
        return (
            obj.get_full_name().strip()
            or obj.username
        )

    def validate_username(self, value):
        value = value.strip()

        queryset = User.objects.filter(
            username__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Email address is required."
            )

        queryset = User.objects.filter(
            email__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )

        return value

    def validate_is_active(self, value):
        request = self.context.get("request")

        if (
            self.instance
            and request
            and self.instance.pk
            == request.user.pk
            and not value
        ):
            raise serializers.ValidationError(
                "You cannot deactivate your own account."
            )

        return value


class AdminUserCreateSerializer(
    AdminUserSerializer
):
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )

    class Meta(AdminUserSerializer.Meta):
        fields = (
            AdminUserSerializer.Meta.fields
            + [
                "password",
                "confirm_password",
            ]
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)

        password = attrs.get("password")
        confirm_password = attrs.get(
            "confirm_password"
        )

        if password != confirm_password:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        temporary_user = User(
            username=attrs.get("username", ""),
            email=attrs.get("email", ""),
            first_name=attrs.get(
                "first_name",
                "",
            ),
            last_name=attrs.get(
                "last_name",
                "",
            ),
        )

        try:
            validate_password(
                password,
                user=temporary_user,
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {
                    "password": list(
                        exc.messages
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop(
            "password"
        )
        validated_data.pop(
            "confirm_password"
        )

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


class AdminPasswordResetSerializer(
    serializers.Serializer
):
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )

    def validate(self, attrs):
        new_password = attrs[
            "new_password"
        ]

        if (
            new_password
            != attrs["confirm_password"]
        ):
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        target_user = self.context[
            "target_user"
        ]

        try:
            validate_password(
                new_password,
                user=target_user,
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {
                    "new_password": list(
                        exc.messages
                    )
                }
            )

        return attrs

    def save(self, **kwargs):
        target_user = self.context[
            "target_user"
        ]

        target_user.set_password(
            self.validated_data[
                "new_password"
            ]
        )
        target_user.save(
            update_fields=[
                "password",
            ]
        )

        return target_user
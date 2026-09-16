from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Role, User, UserRole


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0

    autocomplete_fields = (
        "role",
    )

    fields = (
        "role",
        "scope_type",
        "business_unit",
        "branch",
        "department",
        "is_active",
        "notes",
    )

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "username",
        "display_name",
        "email",
        "phone_number",
        "is_staff",
        "is_active",
    )

    search_fields = (
        "username",
        "first_name",
        "last_name",
        "email",
        "phone_number",
    )

    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
    )

    ordering = (
        "username",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "last_login",
        "date_joined",
    )

    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "BEOIS Information",
            {
                "fields": (
                    "id",
                    "phone_number",
                )
            },
        ),
        (
            "System Information",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (
            "BEOIS Information",
            {
                "fields": (
                    "email",
                    "phone_number",
                )
            },
        ),
    )

    inlines = [
        UserRoleInline,
    ]

    @admin.display(
        description="Name",
        ordering="first_name",
    )
    def display_name(self, obj):
        return obj.get_full_name().strip() or "-"


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "is_active",
        "user_count",
    )

    search_fields = (
        "name",
        "code",
    )

    list_filter = (
        "is_active",
    )

    filter_horizontal = (
        "permissions",
    )

    ordering = (
        "name",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Role Information",
            {
                "fields": (
                    "id",
                    "name",
                    "code",
                    "description",
                    "is_active",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "permissions",
                )
            },
        ),
        (
            "System Information",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    @admin.display(
        description="Users",
    )
    def user_count(self, obj):
        return obj.user_assignments.filter(
            is_active=True,
        ).count()

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "scope_type",
        "business_unit",
        "branch",
        "department",
        "is_active",
        "created_at",
    )

    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "role__name",
        "role__code",
    )

    list_filter = (
        "is_active",
        "role",
        "scope_type",
        "business_unit",
        "branch",
        "department",
    )

    autocomplete_fields = (
        "user",
        "role",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )
from django.contrib import admin

from .models import Branch, BusinessUnit, Department, Trust


@admin.register(Trust)
class TrustAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "short_name",
        "registration_number",
        "phone_number",
        "email",
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "short_name",
        "registration_number",
        "phone_number",
        "email",
    )

    list_filter = (
        "is_active",
        "created_at",
    )

    ordering = ("name",)

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Trust Information",
            {
                "fields": (
                    "id",
                    "name",
                    "short_name",
                    "registration_number",
                )
            },
        ),
        (
            "Contact Information",
            {
                "fields": (
                    "phone_number",
                    "email",
                    "address",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
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


@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "trust",
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "code",
        "trust__name",
    )

    list_filter = (
        "trust",
        "is_active",
        "created_at",
    )

    ordering = ("name",)

    autocomplete_fields = (
        "trust",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Business Unit",
            {
                "fields": (
                    "id",
                    "trust",
                    "name",
                    "code",
                    "description",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
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


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "business_unit",
        "city",
        "state",
        "is_head_office",
        "is_active",
    )

    search_fields = (
        "name",
        "code",
        "business_unit__name",
        "city",
        "state",
        "phone_number",
        "email",
    )

    list_filter = (
        "business_unit",
        "state",
        "is_head_office",
        "is_active",
    )

    ordering = ("name",)

    autocomplete_fields = (
        "business_unit",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Branch Information",
            {
                "fields": (
                    "id",
                    "business_unit",
                    "name",
                    "code",
                    "is_head_office",
                )
            },
        ),
        (
            "Contact Information",
            {
                "fields": (
                    "phone_number",
                    "email",
                    "address",
                    "city",
                    "state",
                    "pincode",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
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


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "branch",
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "code",
        "branch__name",
        "branch__business_unit__name",
    )

    list_filter = (
        "branch",
        "is_active",
    )

    ordering = (
        "branch__name",
        "name",
    )

    autocomplete_fields = (
        "branch",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Department Information",
            {
                "fields": (
                    "id",
                    "branch",
                    "name",
                    "code",
                    "description",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
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
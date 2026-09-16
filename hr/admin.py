from django.contrib import admin

from .models import Designation, Employee


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "code",
    )

    list_filter = (
        "is_active",
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
            "Designation Information",
            {
                "fields": (
                    "id",
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


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "employee_id",
        "employee_name_display",
        "designation_display",
        "department",
        "branch",
        "reporting_manager",
        "employment_type",
        "employment_status",
        "date_of_joining",
    )

    search_fields = (
        "employee_id",
        "user__username",
        "user__first_name",
        "user__last_name",
        "user__email",
        "phone_number",
        "personal_email",
        "designation",
        "designation_master__name",
    )

    list_filter = (
        "employment_status",
        "employment_type",
        "branch",
        "department",
        "designation_master",
        "date_of_joining",
    )

    ordering = (
        "employee_id",
    )

    autocomplete_fields = (
        "user",
        "branch",
        "department",
        "designation_master",
        "reporting_manager",
    )

    readonly_fields = (
        "id",
        "employee_id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Employee Identity",
            {
                "fields": (
                    "id",
                    "employee_id",
                    "user",
                )
            },
        ),
        (
            "Organization",
            {
                "fields": (
                    "branch",
                    "department",
                    "designation_master",
                    "designation",
                    "reporting_manager",
                )
            },
        ),
        (
            "Employment Information",
            {
                "fields": (
                    "employment_type",
                    "employment_status",
                    "date_of_joining",
                    "date_of_exit",
                )
            },
        ),
        (
            "Contact Information",
            {
                "fields": (
                    "phone_number",
                    "alternate_phone_number",
                    "personal_email",
                    "address",
                )
            },
        ),
        (
            "Emergency Contact",
            {
                "fields": (
                    "emergency_contact_name",
                    "emergency_contact_number",
                )
            },
        ),
        (
            "Additional Information",
            {
                "fields": (
                    "notes",
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
        description="Employee Name",
        ordering="user__first_name",
    )
    def employee_name_display(self, obj):
        return obj.employee_name or "-"

    @admin.display(
        description="Designation",
        ordering="designation_master__name",
    )
    def designation_display(self, obj):
        return obj.current_designation or "-"
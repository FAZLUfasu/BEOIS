from django.contrib import admin

from .models import (
    SystemSettings,
    SystemSettingsAudit,
)


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):

    list_display = [
        "system_short_name",
        "timezone",
        "currency_code",
        "updated_by",
        "updated_at",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "General",
            {
                "fields": [
                    "system_name",
                    "system_short_name",
                    "timezone",
                    "currency_code",
                    "currency_symbol",
                    "date_format",
                    "financial_year_start_month",
                ]
            },
        ),
        (
            "Identifiers",
            {
                "fields": [
                    "lead_prefix",
                    "credit_transfer_prefix",
                    "admission_prefix",
                    "student_prefix",
                    "partner_prefix",
                    "partner_case_prefix",
                    "employee_prefix",
                    "identifier_padding",
                ]
            },
        ),
        (
            "Telecalling",
            {
                "fields": [
                    "default_callback_days",
                    "default_follow_up_days",
                ]
            },
        ),
        (
            "Admissions",
            {
                "fields": [
                    "default_academic_session",
                    "admission_document_reminder_days",
                    "admission_fee_reminder_days",
                ]
            },
        ),
        (
            "HR",
            {
                "fields": [
                    "standard_working_minutes_per_day",
                    "attendance_grace_minutes",
                    "payroll_default_payment_method",
                ]
            },
        ),
        (
            "Documents",
            {
                "fields": [
                    "maximum_upload_size_mb",
                    "document_retention_days",
                ]
            },
        ),
        (
            "Notifications",
            {
                "fields": [
                    "enable_notifications",
                    "reminder_days_before_due_date",
                ]
            },
        ),
        (
            "Security",
            {
                "fields": [
                    "session_timeout_minutes",
                    "require_mfa_for_management",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "is_active",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


@admin.register(SystemSettingsAudit)
class SystemSettingsAuditAdmin(admin.ModelAdmin):

    list_display = [
        "changed_by",
        "created_at",
    ]

    readonly_fields = [
        "settings",
        "changed_by",
        "changed_fields",
        "created_at",
    ]

    def has_add_permission(
        self,
        request,
    ):
        return False

    def has_change_permission(
        self,
        request,
        obj=None,
    ):
        return False

    def has_delete_permission(
        self,
        request,
        obj=None,
    ):
        return False
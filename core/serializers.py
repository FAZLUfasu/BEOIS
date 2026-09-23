from rest_framework import serializers

from .models import SystemSettings, SystemSettingsAudit


class SystemSettingsSerializer(serializers.ModelSerializer):

    updated_by_name = serializers.SerializerMethodField(
        read_only=True,
    )

    class Meta:
        model = SystemSettings

        fields = [
            "id",

            "system_name",
            "system_short_name",
            "timezone",
            "currency_code",
            "currency_symbol",
            "date_format",

            "financial_year_start_month",

            "lead_prefix",
            "credit_transfer_prefix",
            "admission_prefix",
            "student_prefix",
            "partner_prefix",
            "partner_case_prefix",
            "employee_prefix",
            "identifier_padding",

            "default_callback_days",
            "default_follow_up_days",

            "default_academic_session",
            "admission_document_reminder_days",
            "admission_fee_reminder_days",

            "standard_working_minutes_per_day",
            "attendance_grace_minutes",
            "payroll_default_payment_method",

            "maximum_upload_size_mb",
            "document_retention_days",

            "enable_notifications",
            "reminder_days_before_due_date",

            "session_timeout_minutes",
            "require_mfa_for_management",

            "is_active",

            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        ]

    def get_updated_by_name(self, obj):
        if not obj.updated_by:
            return ""

        full_name = obj.updated_by.get_full_name().strip()

        return full_name or obj.updated_by.username

    def validate_currency_code(self, value):
        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "Currency code cannot be empty."
            )

        return value

    def validate_system_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "System name cannot be empty."
            )

        return value

    def validate_system_short_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "System short name cannot be empty."
            )

        return value


class SystemSettingsAuditSerializer(serializers.ModelSerializer):

    changed_by_name = serializers.SerializerMethodField(
        read_only=True,
    )

    class Meta:
        model = SystemSettingsAudit

        fields = [
            "id",
            "settings",
            "changed_by",
            "changed_by_name",
            "changed_fields",
            "created_at",
        ]

        read_only_fields = fields

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return "System"

        full_name = obj.changed_by.get_full_name().strip()

        return full_name or obj.changed_by.username
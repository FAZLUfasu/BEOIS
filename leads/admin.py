from django.contrib import admin

from .models import CallLog, Lead, LeadActivity


class CallLogInline(admin.TabularInline):
    model = CallLog
    extra = 0

    fields = (
        "telecaller",
        "outcome",
        "called_at",
        "follow_up_at",
        "duration_seconds",
        "notes",
    )

    readonly_fields = (
        "created_at",
    )

    ordering = (
        "-called_at",
    )


class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 0

    fields = (
        "activity_type",
        "description",
        "performed_by",
        "created_at",
    )

    readonly_fields = (
        "created_at",
    )

    ordering = (
        "-created_at",
    )


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        "lead_id",
        "name",
        "phone_number",
        "vertical",
        "channel",
        "status",
        "assigned_to",
        "next_follow_up_at",
        "created_at",
    )

    search_fields = (
        "lead_id",
        "name",
        "phone_number",
        "alternate_phone",
        "email",
        "interested_course",
    )

    list_filter = (
        "status",
        "vertical",
        "channel",
        "source",
        "created_at",
    )

    ordering = (
        "-created_at",
    )

    readonly_fields = (
        "id",
        "lead_id",
        "created_at",
        "updated_at",
        "converted_at",
    )

    autocomplete_fields = (
        "assigned_to",
        "created_by",
    )

    fieldsets = (
        (
            "Lead Information",
            {
                "fields": (
                    "id",
                    "lead_id",
                    "name",
                    "phone_number",
                    "alternate_phone",
                    "email",
                    "city",
                    "state",
                )
            },
        ),
        (
            "Business Classification",
            {
                "fields": (
                    "vertical",
                    "channel",
                    "interested_course",
                    "previous_course",
                )
            },
        ),
        (
            "Marketing Attribution",
            {
                "fields": (
                    "source",
                    "campaign",
                )
            },
        ),
        (
            "Telecalling",
            {
                "fields": (
                    "status",
                    "assigned_to",
                    "assigned_at",
                    "next_follow_up_at",
                    "notes",
                )
            },
        ),
        (
            "System Information",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_by",
                    "converted_at",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    inlines = (
        CallLogInline,
        LeadActivityInline,
    )


@admin.register(CallLog)
class CallLogAdmin(admin.ModelAdmin):
    list_display = (
        "lead",
        "telecaller",
        "outcome",
        "called_at",
        "follow_up_at",
        "duration_seconds",
    )

    search_fields = (
        "lead__lead_id",
        "lead__name",
        "lead__phone_number",
        "telecaller__username",
    )

    list_filter = (
        "outcome",
        "called_at",
        "follow_up_at",
    )

    autocomplete_fields = (
        "lead",
        "telecaller",
    )

    ordering = (
        "-called_at",
    )

    readonly_fields = (
        "id",
        "created_at",
    )


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = (
        "lead",
        "activity_type",
        "performed_by",
        "created_at",
    )

    search_fields = (
        "lead__lead_id",
        "lead__name",
        "performed_by__username",
        "description",
    )

    list_filter = (
        "activity_type",
        "created_at",
    )

    autocomplete_fields = (
        "lead",
        "performed_by",
    )

    ordering = (
        "-created_at",
    )

    readonly_fields = (
        "id",
        "created_at",
    )
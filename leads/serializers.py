from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Lead,
    LeadActivity,
    CallLog,
    LeadImportBatch,
    LeadImportRow,
)


User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
        ]


class LeadActivitySerializer(serializers.ModelSerializer):
    performed_by = UserMiniSerializer(
        read_only=True
    )

    activity_type_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    class Meta:
        model = LeadActivity
        fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "description",
            "performed_by",
            "created_at",
        ]


class CallLogSerializer(serializers.ModelSerializer):
    telecaller = UserMiniSerializer(
        read_only=True
    )

    outcome_display = serializers.CharField(
        source="get_outcome_display",
        read_only=True,
    )

    class Meta:
        model = CallLog
        fields = [
            "id",
            "outcome",
            "outcome_display",
            "notes",
            "called_at",
            "follow_up_at",
            "duration_seconds",
            "telecaller",
            "created_at",
        ]


class LeadListSerializer(serializers.ModelSerializer):
    assigned_to = UserMiniSerializer(
        read_only=True
    )

    vertical_display = serializers.CharField(
        source="get_vertical_display",
        read_only=True,
    )

    channel_display = serializers.CharField(
        source="get_channel_display",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    partner_name = serializers.CharField(
        source="partner.name",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Lead
        fields = [
            "id",
            "lead_id",
            "name",
            "phone_number",
            "email",
            "city",
            "state",
            "vertical",
            "vertical_display",
            "channel",
            "channel_display",
            "partner",
            "partner_name",
            "source",
            "campaign",
            "interested_course",
            "status",
            "status_display",
            "assigned_to",
            "next_follow_up_at",
            "created_at",
            "updated_at",
        ]


class LeadDetailSerializer(serializers.ModelSerializer):
    assigned_to = UserMiniSerializer(
        read_only=True
    )

    created_by = UserMiniSerializer(
        read_only=True
    )

    vertical_display = serializers.CharField(
        source="get_vertical_display",
        read_only=True,
    )

    channel_display = serializers.CharField(
        source="get_channel_display",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    activities = LeadActivitySerializer(
        many=True,
        read_only=True,
    )

    call_logs = CallLogSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Lead
        fields = [
            "id",
            "lead_id",
            "name",
            "phone_number",
            "alternate_phone",
            "email",
            "city",
            "state",
            "vertical",
            "vertical_display",
            "channel",
            "channel_display",
            "partner",
            "partner_reference_number",
            "source",
            "campaign",
            "interested_course",
            "previous_course",
            "status",
            "status_display",
            "assigned_to",
            "assigned_at",
            "next_follow_up_at",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
            "converted_at",
            "activities",
            "call_logs",
        ]


class LeadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "name",
            "phone_number",
            "alternate_phone",
            "email",
            "city",
            "state",
            "vertical",
            "channel",
            "partner",
            "partner_reference_number",
            "source",
            "campaign",
            "interested_course",
            "previous_course",
            "notes",
        ]

    def validate(self, attrs):
        channel = attrs.get(
            "channel",
            Lead.Channel.DIRECT,
        )

        partner = attrs.get("partner")

        if (
            channel == Lead.Channel.PARTNER
            and not partner
        ):
            raise serializers.ValidationError({
                "partner": (
                    "Partner is required when "
                    "channel is PARTNER."
                )
            })

        if (
            channel == Lead.Channel.DIRECT
            and partner
        ):
            raise serializers.ValidationError({
                "partner": (
                    "A DIRECT lead cannot be "
                    "linked to a partner."
                )
            })

        return attrs


class LeadUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "name",
            "phone_number",
            "alternate_phone",
            "email",
            "city",
            "state",
            "vertical",
            "channel",
            "partner",
            "partner_reference_number",
            "source",
            "campaign",
            "interested_course",
            "previous_course",
            "notes",
            "next_follow_up_at",
        ]

    def validate(self, attrs):
        instance = self.instance

        channel = attrs.get(
            "channel",
            instance.channel,
        )

        partner = attrs.get(
            "partner",
            instance.partner,
        )

        if (
            channel == Lead.Channel.PARTNER
            and not partner
        ):
            raise serializers.ValidationError({
                "partner": (
                    "Partner is required when "
                    "channel is PARTNER."
                )
            })

        if (
            channel == Lead.Channel.DIRECT
            and partner
        ):
            raise serializers.ValidationError({
                "partner": (
                    "A DIRECT lead cannot be "
                    "linked to a partner."
                )
            })

        return attrs


class LeadAssignmentSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()

    def validate_user_id(self, value):
        try:
            user = User.objects.get(
                id=value
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "User not found."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "Cannot assign to an inactive user."
            )

        return value


class RecordCallSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=CallLog.Outcome.choices
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    follow_up_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    duration_seconds = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )

    def validate(self, attrs):
        if (
            attrs["outcome"]
            == CallLog.Outcome.CALLBACK
            and not attrs.get("follow_up_at")
        ):
            raise serializers.ValidationError({
                "follow_up_at": (
                    "Follow-up date/time is "
                    "required for Call Back."
                )
            })

        return attrs


class LeadStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Lead.Status.choices
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class LeadNoteSerializer(serializers.Serializer):
    description = serializers.CharField()

    def validate_description(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Note cannot be empty."
            )

        return value
    from .models import (
    LeadImportBatch,
    LeadImportRow,
)


class LeadImportRowSerializer(
    serializers.ModelSerializer
):
    existing_lead_id = serializers.CharField(
        source="existing_lead.lead_id",
        read_only=True,
        default=None,
    )

    imported_lead_id = serializers.CharField(
        source="imported_lead.lead_id",
        read_only=True,
        default=None,
    )

    class Meta:
        model = LeadImportRow

        fields = [
            "id",
            "row_number",
            "name",
            "phone_number",
            "email",
            "city",
            "state",
            "interested_course",
            "status",
            "error_message",
            "existing_lead_id",
            "imported_lead_id",
        ]


class LeadImportBatchSerializer(
    serializers.ModelSerializer
):
    uploaded_by = UserMiniSerializer(
        read_only=True
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    vertical_display = serializers.CharField(
        source="get_default_vertical_display",
        read_only=True,
    )

    channel_display = serializers.CharField(
        source="get_default_channel_display",
        read_only=True,
    )

    class Meta:
        model = LeadImportBatch

        fields = [
            "id",
            "file_name",
            "source",
            "campaign",
            "default_vertical",
            "vertical_display",
            "default_channel",
            "channel_display",
            "total_rows",
            "valid_rows",
            "duplicate_rows",
            "invalid_rows",
            "imported_rows",
            "status",
            "status_display",
            "uploaded_by",
            "created_at",
            "completed_at",
        ]


class LeadImportBatchDetailSerializer(
    LeadImportBatchSerializer
):
    rows = LeadImportRowSerializer(
        many=True,
        read_only=True,
    )

    class Meta(
        LeadImportBatchSerializer.Meta
    ):
        fields = (
            LeadImportBatchSerializer
            .Meta
            .fields
            + ["rows"]
        )


class LeadImportUploadSerializer(
    serializers.Serializer
):
    file = serializers.FileField()

    source = serializers.CharField(
        max_length=100,
    )

    campaign = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    default_vertical = (
        serializers.ChoiceField(
            choices=Lead.Vertical.choices,
            default=Lead.Vertical.REGULAR,
        )
    )

    default_channel = (
        serializers.ChoiceField(
            choices=Lead.Channel.choices,
            default=Lead.Channel.DIRECT,
        )
    )

    def validate_file(self, value):
        name = value.name.lower()

        if not (
            name.endswith(".xlsx")
            or name.endswith(".csv")
        ):
            raise serializers.ValidationError(
                "Upload an .xlsx or .csv file."
            )

        # 10 MB safety limit.
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "The import file cannot exceed 10 MB."
            )

        return value

    def validate_default_channel(
        self,
        value,
    ):
        if value != Lead.Channel.DIRECT:
            raise serializers.ValidationError(
                "Marketing Lead Import V1 "
                "currently supports BEST Direct "
                "leads only."
            )

        return value
from django.contrib.auth import get_user_model
from rest_framework import serializers

from admissions.models import (
    Program,
    ProgramFeeInstallment,
    ProgramFeePlan,
)
from organization.models import Branch

from .models import (
    Lead,
    LeadActivity,
    CallLog,
    LeadQualification,
    LeadAppointment,
    LeadAppointmentHistory,
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


class LeadQualificationSerializer(serializers.ModelSerializer):
    selected_institution_name = serializers.CharField(
        source="selected_institution.name",
        read_only=True,
        default=None,
    )

    selected_program_name = serializers.CharField(
        source="selected_program.name",
        read_only=True,
        default=None,
    )

    selected_program_code = serializers.CharField(
        source="selected_program.code",
        read_only=True,
        default="",
    )

    highest_qualification_display = serializers.CharField(
        source="get_highest_qualification_display",
        read_only=True,
    )

    required_level_display = serializers.CharField(
        source="get_required_level_display",
        read_only=True,
    )

    eligibility_status_display = serializers.CharField(
        source="get_eligibility_status_display",
        read_only=True,
    )

    qualified_by = UserMiniSerializer(
        read_only=True,
    )

    class Meta:
        model = LeadQualification
        fields = [
            "id",
            "highest_qualification",
            "highest_qualification_display",
            "stream",
            "board_or_university",
            "year_of_passing",
            "percentage_or_grade",
            "required_level",
            "required_level_display",
            "interest_area",
            "selected_institution",
            "selected_institution_name",
            "selected_program",
            "selected_program_name",
            "selected_program_code",
            "customer_budget",
            "quoted_fee",
            "eligibility_status",
            "eligibility_status_display",
            "eligibility_notes",
            "qualified_by",
            "qualified_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class LeadQualificationUpdateSerializer(serializers.Serializer):
    highest_qualification = serializers.ChoiceField(
        choices=LeadQualification.QualificationLevel.choices,
    )

    stream = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
    )

    board_or_university = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    year_of_passing = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1950,
        max_value=2200,
    )

    percentage_or_grade = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
    )

    required_level = serializers.ChoiceField(
        choices=LeadQualification.RequiredLevel.choices,
    )

    interest_area = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    selected_program = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    customer_budget = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0,
    )

    quoted_fee = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0,
    )


class CourseFeeInstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramFeeInstallment
        fields = [
            "id",
            "installment_number",
            "label",
            "amount",
            "due_stage",
            "notes",
        ]
        read_only_fields = fields


class CourseFeePlanSerializer(serializers.ModelSerializer):
    installments = CourseFeeInstallmentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ProgramFeePlan
        fields = [
            "id",
            "name",
            "student_total_fee",
            "registration_fee",
            "exam_fee",
            "other_fee",
            "notes",
            "installments",
        ]
        read_only_fields = fields


class LeadCourseOptionSerializer(serializers.ModelSerializer):
    institution_id = serializers.UUIDField(
        source="institution.id",
        read_only=True,
    )

    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )

    level_display = serializers.CharField(
        source="get_level_display",
        read_only=True,
    )

    study_mode_display = serializers.CharField(
        source="get_study_mode_display",
        read_only=True,
    )

    minimum_qualification_display = serializers.CharField(
        source="get_minimum_qualification_display",
        read_only=True,
    )

    fee_plans = serializers.SerializerMethodField()
    eligibility_result = serializers.SerializerMethodField()
    eligibility_reason = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = [
            "id",
            "institution_id",
            "institution_name",
            "name",
            "code",
            "level",
            "level_display",
            "duration_years",
            "duration_semesters",
            "study_mode",
            "study_mode_display",
            "specialization",
            "eligibility_text",
            "minimum_qualification",
            "minimum_qualification_display",
            "required_stream",
            "eligibility_review_required",
            "is_credit_transfer_available",
            "fee_plans",
            "eligibility_result",
            "eligibility_reason",
        ]
        read_only_fields = fields

    def get_fee_plans(self, obj):
        plans = [
            plan
            for plan in obj.fee_plans.all()
            if plan.is_active
        ]
        return CourseFeePlanSerializer(
            plans,
            many=True,
        ).data

    def _eligibility(self, obj):
        from .services import evaluate_program_eligibility

        qualification = self.context.get("qualification")

        if not qualification:
            return (
                LeadQualification.EligibilityStatus.PENDING,
                "Save the student's qualification before evaluating courses.",
            )

        return evaluate_program_eligibility(
            qualification,
            obj,
        )

    def get_eligibility_result(self, obj):
        return self._eligibility(obj)[0]

    def get_eligibility_reason(self, obj):
        return self._eligibility(obj)[1]


class LeadAppointmentHistorySerializer(
    serializers.ModelSerializer
):
    event_type_display = serializers.CharField(
        source="get_event_type_display",
        read_only=True,
    )

    previous_status_display = serializers.CharField(
        source="get_previous_status_display",
        read_only=True,
    )

    new_status_display = serializers.CharField(
        source="get_new_status_display",
        read_only=True,
    )

    performed_by = UserMiniSerializer(
        read_only=True,
    )

    class Meta:
        model = LeadAppointmentHistory
        fields = [
            "id",
            "event_type",
            "event_type_display",
            "previous_status",
            "previous_status_display",
            "new_status",
            "new_status_display",
            "previous_scheduled_at",
            "new_scheduled_at",
            "notes",
            "performed_by",
            "created_at",
        ]
        read_only_fields = fields


class LeadAppointmentSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    purpose_display = serializers.CharField(
        source="get_purpose_display",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    assigned_counsellor = UserMiniSerializer(
        read_only=True,
    )

    created_by = UserMiniSerializer(
        read_only=True,
    )

    history = LeadAppointmentHistorySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = LeadAppointment
        fields = [
            "id",
            "purpose",
            "purpose_display",
            "scheduled_at",
            "branch",
            "branch_name",
            "assigned_counsellor",
            "number_of_visitors",
            "notes",
            "status",
            "status_display",
            "created_by",
            "history",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class LeadAppointmentCreateSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(
        choices=LeadAppointment.Purpose.choices,
        default=(
            LeadAppointment.Purpose
            .ADMISSION_COUNSELLING
        ),
    )

    scheduled_at = serializers.DateTimeField()

    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.filter(is_active=True),
    )

    number_of_visitors = serializers.IntegerField(
        min_value=1,
        max_value=20,
        default=1,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class LeadAppointmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=LeadAppointment.Status.choices,
    )

    scheduled_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        if (
            attrs["status"]
            == LeadAppointment.Status.RESCHEDULED
            and not attrs.get("scheduled_at")
        ):
            raise serializers.ValidationError({
                "scheduled_at": (
                    "A new date/time is required when rescheduling."
                )
            })

        return attrs


class VisitBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "code",
            "city",
            "state",
            "is_head_office",
        ]
        read_only_fields = fields


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

    qualification = LeadQualificationSerializer(
        read_only=True,
        default=None,
    )

    appointments = LeadAppointmentSerializer(
        many=True,
        read_only=True,
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
            "qualification",
            "appointments",
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
# ================================================================
# LEAD DISTRIBUTION
# ================================================================


class BulkLeadAssignmentSerializer(
    serializers.Serializer
):
    lead_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )

    user_id = serializers.UUIDField()

    def validate_lead_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate lead IDs are not allowed."
            )

        return value


class LeadDistributionSerializer(
    serializers.Serializer
):
    lead_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )

    user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )

    def validate_lead_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate lead IDs are not allowed."
            )

        return value

    def validate_user_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate employee/user IDs "
                "are not allowed."
            )

        return value

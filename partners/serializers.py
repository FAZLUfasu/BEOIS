from decimal import Decimal

from rest_framework import serializers

from .models import (
    CommissionRule,
    CommissionTransaction,
    Partner,
    PartnerActivity,
    PartnerCase,
    PartnerDocument,
    PartnerIssue,
    PartnerProgramAccess,
)


class SimpleUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class PartnerListSerializer(serializers.ModelSerializer):
    relationship_manager = SimpleUserSerializer(read_only=True)
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    partner_type_display = serializers.CharField(
        source="get_partner_type_display",
        read_only=True,
    )

    class Meta:
        model = Partner
        fields = [
            "id",
            "partner_id",
            "name",
            "partner_type",
            "partner_type_display",
            "status",
            "status_display",
            "contact_person",
            "phone_number",
            "email",
            "city",
            "district",
            "state",
            "territory",
            "organization_name",
            "relationship_manager",
            "created_at",
            "updated_at",
        ]


class PartnerDetailSerializer(serializers.ModelSerializer):
    relationship_manager = SimpleUserSerializer(read_only=True)
    created_by = SimpleUserSerializer(read_only=True)

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    partner_type_display = serializers.CharField(
        source="get_partner_type_display",
        read_only=True,
    )

    class Meta:
        model = Partner
        fields = [
            "id",
            "partner_id",
            "name",
            "partner_type",
            "partner_type_display",
            "status",
            "status_display",
            "contact_person",
            "phone_number",
            "alternate_phone",
            "email",
            "address",
            "city",
            "district",
            "state",
            "postal_code",
            "territory",
            "organization_name",
            "agreement_start_date",
            "agreement_end_date",
            "relationship_manager",
            "created_by",
            "notes",
            "created_at",
            "updated_at",
        ]


class PartnerDocumentSerializer(serializers.ModelSerializer):
    verified_by = SimpleUserSerializer(read_only=True)
    document_type_display = serializers.CharField(
        source="get_document_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = PartnerDocument
        fields = [
            "id",
            "document_type",
            "document_type_display",
            "title",
            "file",
            "status",
            "status_display",
            "verified_by",
            "verified_at",
            "rejection_reason",
            "notes",
            "created_at",
            "updated_at",
        ]


class PartnerProgramAccessSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )
    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )

    class Meta:
        model = PartnerProgramAccess
        fields = [
            "id",
            "institution",
            "institution_name",
            "program",
            "program_name",
            "is_active",
            "effective_from",
            "effective_to",
            "notes",
            "created_at",
            "updated_at",
        ]


class PartnerCaseSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )
    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )
    assigned_to = SimpleUserSerializer(read_only=True)
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = PartnerCase
        fields = [
            "id",
            "case_id",
            "partner",
            "admission",
            "applicant_name",
            "phone_number",
            "institution",
            "institution_name",
            "program",
            "program_name",
            "vertical",
            "partner_reference_number",
            "status",
            "status_display",
            "assigned_to",
            "notes",
            "created_at",
            "updated_at",
        ]


class CommissionRuleSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )
    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )
    commission_type_display = serializers.CharField(
        source="get_commission_type_display",
        read_only=True,
    )

    class Meta:
        model = CommissionRule
        fields = [
            "id",
            "institution",
            "institution_name",
            "program",
            "program_name",
            "vertical",
            "commission_type",
            "commission_type_display",
            "value",
            "effective_from",
            "effective_to",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]


class CommissionTransactionSerializer(serializers.ModelSerializer):
    approved_by = SimpleUserSerializer(read_only=True)
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = CommissionTransaction
        fields = [
            "id",
            "partner",
            "partner_case",
            "admission",
            "rule",
            "base_amount",
            "commission_amount",
            "status",
            "status_display",
            "approved_by",
            "approved_at",
            "paid_at",
            "payment_reference",
            "notes",
            "created_at",
            "updated_at",
        ]


class PartnerIssueSerializer(serializers.ModelSerializer):
    assigned_to = SimpleUserSerializer(read_only=True)
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = PartnerIssue
        fields = [
            "id",
            "partner_case",
            "subject",
            "description",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "assigned_to",
            "resolved_at",
            "created_at",
            "updated_at",
        ]


class PartnerActivitySerializer(serializers.ModelSerializer):
    performed_by = SimpleUserSerializer(read_only=True)
    activity_type_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    class Meta:
        model = PartnerActivity
        fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "description",
            "performed_by",
            "created_at",
        ]


# ================================================================
# INPUT SERIALIZERS
# ================================================================

class CreatePartnerSerializer(serializers.Serializer):
    name = serializers.CharField()
    phone_number = serializers.CharField()

    partner_type = serializers.ChoiceField(
        choices=Partner.PartnerType.choices,
        default=Partner.PartnerType.EDUCATION_CENTRE,
    )

    contact_person = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
    )
    city = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    district = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    state = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    territory = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    organization_name = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    relationship_manager_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class PartnerStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Partner.Status.choices,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class PartnerNoteSerializer(serializers.Serializer):
    description = serializers.CharField()

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Note cannot be empty."
            )
        return value


class AddPartnerDocumentSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(
        choices=PartnerDocument.DocumentType.choices,
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    file = serializers.FileField(
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class VerifyPartnerDocumentSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class RejectPartnerDocumentSerializer(serializers.Serializer):
    reason = serializers.CharField()

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Rejection reason is required."
            )
        return value


class GrantProgramAccessSerializer(serializers.Serializer):
    institution_id = serializers.UUIDField()
    program_id = serializers.UUIDField()

    effective_from = serializers.DateField(
        required=False,
        allow_null=True,
    )
    effective_to = serializers.DateField(
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class CreatePartnerCaseSerializer(serializers.Serializer):
    applicant_name = serializers.CharField()
    phone_number = serializers.CharField()

    institution_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    program_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    vertical = serializers.ChoiceField(
        choices=[
            ("REGULAR", "Regular"),
            ("CREDIT_TRANSFER", "Credit Transfer"),
        ],
        default="REGULAR",
    )

    partner_reference_number = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    assigned_to_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class PartnerCaseStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=PartnerCase.Status.choices,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class LinkAdmissionSerializer(serializers.Serializer):
    admission_id = serializers.UUIDField()


class CreateCommissionRuleSerializer(serializers.Serializer):
    commission_type = serializers.ChoiceField(
        choices=CommissionRule.CommissionType.choices,
    )

    value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    institution_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    program_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    vertical = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    effective_from = serializers.DateField(
        required=False,
        allow_null=True,
    )
    effective_to = serializers.DateField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class CreateCommissionTransactionSerializer(serializers.Serializer):
    rule_id = serializers.UUIDField()

    base_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )

    partner_case_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    admission_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class CommissionActionSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class MarkCommissionPaidSerializer(serializers.Serializer):
    payment_reference = serializers.CharField()

    def validate_payment_reference(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Payment reference is required."
            )
        return value


class CreatePartnerIssueSerializer(serializers.Serializer):
    subject = serializers.CharField()
    description = serializers.CharField()

    priority = serializers.ChoiceField(
        choices=PartnerIssue.Priority.choices,
        default=PartnerIssue.Priority.MEDIUM,
    )

    partner_case_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    assigned_to_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class PartnerIssueStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=PartnerIssue.Status.choices,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class PartnerProgramAccessStatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )
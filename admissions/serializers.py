from decimal import Decimal
from rest_framework import serializers
from leads.models import Lead, LeadQualification

from .models import (
    Institution,
    Program,
    ProgramFeePlan,
    ProgramFeeInstallment,
    Admission,
    AdmissionDocument,
    AdmissionFee,
    AdmissionPayment,
    AdmissionActivity,
)


# ================================================================
# SMALL USER REPRESENTATION
# ================================================================


class SimpleUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)


# ================================================================
# INSTITUTION
# ================================================================


class InstitutionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Institution

        fields = [
            "id",
            "name",
            "short_name",
            "code",
            "state",
            "city",
            "website",
            "contact_person",
            "contact_phone",
            "contact_email",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# ================================================================
# PROGRAM
# ================================================================


class ProgramFeeInstallmentSerializer(
    serializers.ModelSerializer
):

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


class ProgramFeePlanSerializer(
    serializers.ModelSerializer
):

    installments = ProgramFeeInstallmentSerializer(
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
            "is_active",
            "notes",
            "installments",
        ]
        read_only_fields = fields


class ProgramSerializer(serializers.ModelSerializer):

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

    def get_fee_plans(self, obj):
        plans = [
            plan
            for plan in obj.fee_plans.all()
            if plan.is_active
        ]

        return ProgramFeePlanSerializer(
            plans,
            many=True,
        ).data

    class Meta:
        model = Program

        fields = [
            "id",
            "institution",
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
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "institution_name",
            "level_display",
            "study_mode_display",
            "minimum_qualification_display",
            "fee_plans",
            "created_at",
            "updated_at",
        ]


# ================================================================
# ADMISSION DOCUMENT
# ================================================================


class AdmissionDocumentSerializer(
    serializers.ModelSerializer
):

    document_type_display = serializers.CharField(
        source="get_document_type_display",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    verified_by = SimpleUserSerializer(
        read_only=True,
    )

    class Meta:
        model = AdmissionDocument

        fields = [
            "id",
            "document_type",
            "document_type_display",
            "document_name",
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

        read_only_fields = [
            "id",
            "status",
            "status_display",
            "verified_by",
            "verified_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]


# ================================================================
# ADMISSION FEE
# ================================================================


class AdmissionFeeSerializer(
    serializers.ModelSerializer
):

    fee_type_display = serializers.CharField(
        source="get_fee_type_display",
        read_only=True,
    )

    class Meta:
        model = AdmissionFee

        fields = [
            "id",
            "fee_type",
            "fee_type_display",
            "description",
            "amount",
            "due_date",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "fee_type_display",
            "created_at",
            "updated_at",
        ]


# ================================================================
# ADMISSION PAYMENT
# ================================================================


class AdmissionPaymentSerializer(
    serializers.ModelSerializer
):

    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )

    received_by = SimpleUserSerializer(
        read_only=True,
    )

    class Meta:
        model = AdmissionPayment

        fields = [
            "id",
            "amount",
            "payment_method",
            "payment_method_display",
            "reference_number",
            "receipt_number",
            "paid_at",
            "received_by",
            "notes",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# ADMISSION ACTIVITY
# ================================================================


class AdmissionActivitySerializer(
    serializers.ModelSerializer
):

    activity_type_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    performed_by = SimpleUserSerializer(
        read_only=True,
    )

    class Meta:
        model = AdmissionActivity

        fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "description",
            "performed_by",
            "created_at",
        ]

        read_only_fields = fields


# ================================================================
# ADMISSION LIST
# ================================================================


class AdmissionListSerializer(
    serializers.ModelSerializer
):

    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )

    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    vertical_display = serializers.CharField(
        source="get_vertical_display",
        read_only=True,
    )

    channel_display = serializers.CharField(
        source="get_channel_display",
        read_only=True,
    )

    assigned_to = SimpleUserSerializer(
        read_only=True,
    )

    class Meta:
        model = Admission

        fields = [
            "id",
            "admission_id",
            "applicant_name",
            "phone_number",
            "email",
            "institution",
            "institution_name",
            "program",
            "program_name",
            "academic_session",
            "vertical",
            "vertical_display",
            "channel",
            "channel_display",
            "status",
            "status_display",
            "assigned_to",
            "created_at",
            "updated_at",
        ]


# ================================================================
# LEAD COUNSELLING HANDOFF
# ================================================================


class LeadCounsellingHandoffSerializer(
    serializers.ModelSerializer
):
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
            "qualified_at",
        ]
        read_only_fields = fields


# ================================================================
# ADMISSION DETAIL
# ================================================================


class AdmissionDetailSerializer(
    serializers.ModelSerializer
):

    institution = InstitutionSerializer(
        read_only=True,
    )

    program = ProgramSerializer(
        read_only=True,
    )

    assigned_to = SimpleUserSerializer(
        read_only=True,
    )

    created_by = SimpleUserSerializer(
        read_only=True,
    )

    documents = AdmissionDocumentSerializer(
        many=True,
        read_only=True,
    )

    fees = AdmissionFeeSerializer(
        many=True,
        read_only=True,
    )

    payments = AdmissionPaymentSerializer(
        many=True,
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    vertical_display = serializers.CharField(
        source="get_vertical_display",
        read_only=True,
    )

    channel_display = serializers.CharField(
        source="get_channel_display",
        read_only=True,
    )

    lead_id = serializers.CharField(
        source="lead.lead_id",
        read_only=True,
        allow_null=True,
    )

    lead_qualification = serializers.SerializerMethodField()

    def get_lead_qualification(self, obj):
        if not obj.lead_id:
            return None

        try:
            qualification = obj.lead.qualification
        except LeadQualification.DoesNotExist:
            return None

        return LeadCounsellingHandoffSerializer(
            qualification
        ).data

    partner_id = serializers.CharField(
        source="partner.partner_id",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Admission

        fields = [
            "id",
            "admission_id",

            "lead",
            "lead_id",
            "lead_qualification",

            "applicant_name",
            "date_of_birth",
            "gender",
            "phone_number",
            "alternate_phone",
            "email",
            "address",
            "city",
            "state",
            "postal_code",

            "institution",
            "program",
            "academic_session",

            "vertical",
            "vertical_display",
            "channel",
            "channel_display",

            "partner",
            "partner_id",
            "partner_reference",

            "previous_institution",
            "previous_program",
            "previous_registration_number",
            "completed_years",
            "completed_semesters",
            "credit_transfer_notes",

            "university_application_number",
            "enrollment_number",
            "university_admission_number",
            "applied_at",
            "completed_at",

            "status",
            "status_display",

            "assigned_to",
            "created_by",

            "notes",

            "documents",
            "fees",
            "payments",

            "created_at",
            "updated_at",
        ]

        read_only_fields = fields
# ================================================================
# QUALIFIED LEAD HANDOFF
# ================================================================


class QualifiedLeadHandoffSerializer(
    serializers.ModelSerializer
):

    vertical_display = serializers.CharField(
        source="get_vertical_display",
        read_only=True,
    )

    channel_display = serializers.CharField(
        source="get_channel_display",
        read_only=True,
    )

    assigned_to = SimpleUserSerializer(
        read_only=True,
    )

    qualification = LeadCounsellingHandoffSerializer(
        read_only=True,
        default=None,
    )

    partner_id = serializers.CharField(
        source="partner.partner_id",
        read_only=True,
        allow_null=True,
    )

    partner_name = serializers.CharField(
        source="partner.name",
        read_only=True,
        allow_null=True,
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

            "interested_course",

            "vertical",
            "vertical_display",

            "channel",
            "channel_display",

            "source",
            "campaign",

            "partner",
            "partner_id",
            "partner_name",
            "partner_reference_number",

            "previous_course",

            "assigned_to",
            "qualification",

            "notes",

            "created_at",
            "updated_at",
        ]

        read_only_fields = fields

# ================================================================
# CONVERT QUALIFIED LEAD TO ADMISSION
# ================================================================


class AdmissionFromLeadSerializer(
    serializers.Serializer
):

    lead_id = serializers.UUIDField()

    institution_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    program_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    assigned_to_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    academic_session = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
    )

    def validate_lead_id(self, value):

        if not Lead.objects.filter(
            id=value
        ).exists():
            raise serializers.ValidationError(
                "Lead does not exist."
            )

        return value

    def validate(self, attrs):
        institution_id = attrs.get(
            "institution_id"
        )
        program_id = attrs.get(
            "program_id"
        )

        if bool(institution_id) != bool(program_id):
            raise serializers.ValidationError({
                "detail": (
                    "Institution and program must be "
                    "provided together when overriding "
                    "the stored counselling selection."
                )
            })

        if not institution_id:
            return attrs

        institution = (
            Institution.objects
            .filter(
                id=institution_id,
                is_active=True,
            )
            .first()
        )

        if not institution:
            raise serializers.ValidationError({
                "institution_id": (
                    "Active institution does not exist."
                )
            })

        program = (
            Program.objects
            .filter(
                id=program_id,
                is_active=True,
            )
            .first()
        )

        if not program:
            raise serializers.ValidationError({
                "program_id": (
                    "Active program does not exist."
                )
            })

        if (
            program.institution_id
            != institution.id
        ):
            raise serializers.ValidationError({
                "program_id": (
                    "Program does not belong to "
                    "the selected institution."
                )
            })

        return attrs


# ================================================================
# STATUS CHANGE
# ================================================================


class AdmissionStatusSerializer(
    serializers.Serializer
):

    status = serializers.ChoiceField(
        choices=Admission.Status.choices,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


# ================================================================
# NOTE
# ================================================================


class AdmissionNoteSerializer(
    serializers.Serializer
):

    description = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )


# ================================================================
# ADD DOCUMENT
# ================================================================


class AddAdmissionDocumentSerializer(
    serializers.Serializer
):

    document_type = serializers.ChoiceField(
        choices=AdmissionDocument.DocumentType.choices,
    )

    document_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    file = serializers.FileField(
        required=False,
        allow_null=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


# ================================================================
# VERIFY DOCUMENT
# ================================================================


class VerifyAdmissionDocumentSerializer(
    serializers.Serializer
):

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


# ================================================================
# REJECT DOCUMENT
# ================================================================


class RejectAdmissionDocumentSerializer(
    serializers.Serializer
):

    reason = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )


# ================================================================
# ELIGIBILITY
# ================================================================


class AdmissionEligibleSerializer(
    serializers.Serializer
):

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class AdmissionNotEligibleSerializer(
    serializers.Serializer
):

    reason = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )


# ================================================================
# ADD FEE
# ================================================================


class AddAdmissionFeeSerializer(
    serializers.Serializer
):

    fee_type = serializers.ChoiceField(
        choices=AdmissionFee.FeeType.choices,
    )

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    due_date = serializers.DateField(
        required=False,
        allow_null=True,
    )


# ================================================================
# RECORD PAYMENT
# ================================================================


class RecordAdmissionPaymentSerializer(
    serializers.Serializer
):

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    payment_method = serializers.ChoiceField(
        choices=AdmissionPayment.PaymentMethod.choices,
    )

    reference_number = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
    )

    receipt_number = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


# ================================================================
# UNIVERSITY APPLICATION
# ================================================================


class UniversityApplicationSerializer(
    serializers.Serializer
):

    application_number = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
        max_length=100,
    )


# ================================================================
# ENROLLMENT
# ================================================================


class EnrollmentSerializer(
    serializers.Serializer
):

    enrollment_number = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
        max_length=100,
    )

    university_admission_number = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )


# ================================================================
# COMPLETE ADMISSION
# ================================================================


class CompleteAdmissionSerializer(
    serializers.Serializer
):

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )

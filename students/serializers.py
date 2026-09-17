from rest_framework import serializers

from admissions.models import Admission
from .models import (
    Student,
    StudentActivity,
    StudentDocument,
    StudentProcess,
)


class SimpleUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class StudentProcessSerializer(serializers.ModelSerializer):
    assigned_to = SimpleUserSerializer(read_only=True)
    process_type_display = serializers.CharField(
        source="get_process_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = StudentProcess
        fields = [
            "id",
            "process_type",
            "process_type_display",
            "title",
            "academic_year",
            "semester",
            "status",
            "status_display",
            "due_date",
            "submitted_at",
            "completed_at",
            "assigned_to",
            "reference_number",
            "notes",
            "created_at",
            "updated_at",
        ]


class StudentDocumentSerializer(serializers.ModelSerializer):
    verified_by = SimpleUserSerializer(read_only=True)
    document_type_display = serializers.CharField(
        source="get_document_type_display",
        read_only=True,
    )

    class Meta:
        model = StudentDocument
        fields = [
            "id",
            "process",
            "document_type",
            "document_type_display",
            "title",
            "file",
            "reference_number",
            "issued_date",
            "received_date",
            "verified",
            "verified_by",
            "notes",
            "created_at",
            "updated_at",
        ]


class StudentActivitySerializer(serializers.ModelSerializer):
    performed_by = SimpleUserSerializer(read_only=True)
    activity_type_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    class Meta:
        model = StudentActivity
        fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "description",
            "performed_by",
            "created_at",
        ]


class StudentListSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source="institution.name",
        read_only=True,
    )
    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )
    assigned_coordinator = SimpleUserSerializer(
        read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "name",
            "phone_number",
            "email",
            "institution",
            "institution_name",
            "program",
            "program_name",
            "academic_session",
            "enrollment_number",
            "vertical",
            "channel",
            "current_year",
            "current_semester",
            "status",
            "status_display",
            "assigned_coordinator",
            "created_at",
            "updated_at",
        ]


class StudentDetailSerializer(serializers.ModelSerializer):
    assigned_coordinator = SimpleUserSerializer(
        read_only=True
    )
    created_by = SimpleUserSerializer(read_only=True)

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

    processes = StudentProcessSerializer(
        many=True,
        read_only=True,
    )
    documents = StudentDocumentSerializer(
        many=True,
        read_only=True,
    )
    activities = StudentActivitySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "admission",
            "name",
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
            "institution_name",
            "program",
            "program_name",
            "academic_session",
            "enrollment_number",
            "university_admission_number",
            "vertical",
            "channel",
            "current_year",
            "current_semester",
            "status",
            "status_display",
            "course_started_at",
            "course_completed_at",
            "assigned_coordinator",
            "created_by",
            "notes",
            "processes",
            "documents",
            "activities",
            "created_at",
            "updated_at",
        ]


# ================================================================
# INPUT SERIALIZERS
# ================================================================

class StudentFromAdmissionSerializer(serializers.Serializer):
    admission_id = serializers.UUIDField()
    assigned_coordinator_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    initialize_processes = serializers.BooleanField(
        default=True,
    )


class CreateStudentProcessSerializer(serializers.Serializer):
    process_type = serializers.ChoiceField(
        choices=StudentProcess.ProcessType.choices,
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    academic_year = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )
    semester = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )
    due_date = serializers.DateField(
        required=False,
        allow_null=True,
    )
    assigned_to_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class StudentProcessStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=StudentProcess.Status.choices,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class StudentNoteSerializer(serializers.Serializer):
    description = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Note cannot be empty."
            )
        return value


class AddStudentDocumentSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(
        choices=StudentDocument.DocumentType.choices,
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    file = serializers.FileField(
        required=False,
        allow_null=True,
    )
    process_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    reference_number = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    issued_date = serializers.DateField(
        required=False,
        allow_null=True,
    )
    received_date = serializers.DateField(
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class VerifyStudentDocumentSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class StudentProgressSerializer(serializers.Serializer):
    current_year = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )
    current_semester = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        if (
            "current_year" not in attrs
            and "current_semester" not in attrs
        ):
            raise serializers.ValidationError(
                "Provide current_year or current_semester."
            )
        return attrs


class CompleteStudentCourseSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )
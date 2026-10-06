from decimal import Decimal

from django.db import IntegrityError
from django.utils import timezone
from django.db.models import Q

from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import (
    Institution,
    Program,
    ProgramFeePlan,
    ProgramFeeInstallment,
)
from .permissions import (
    CanManageAdmissions,
    CanViewAcademicMasterData,
)
from .serializers import InstitutionSerializer


class ProgramManagementSerializer(serializers.ModelSerializer):
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
    verified_by = serializers.SerializerMethodField()

    def get_verified_by(self, obj):
        user = obj.verified_by
        if not user:
            return None
        return {
            "id": str(user.pk),
            "username": user.username,
            "email": user.email,
            "display_name": user.get_full_name() or user.username,
        }

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
            "data_status",
            "verified_at",
            "verified_by",
            "verification_notes",
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
            "data_status",
            "verified_at",
            "verified_by",
            "verification_notes",
            "created_at",
            "updated_at",
        ]

    def get_fee_plans(self, obj):
        plans = [
            plan
            for plan in obj.fee_plans.all()
            if plan.is_active
        ]
        return ProgramFeePlanManagementSerializer(
            plans,
            many=True,
        ).data


class ProgramFeeInstallmentManagementSerializer(
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
        read_only_fields = ["id"]

    def validate_installment_number(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Installment number must be at least 1."
            )
        return value

    def validate_amount(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError(
                "Installment amount cannot be negative."
            )
        return value


class ProgramFeePlanManagementSerializer(
    serializers.ModelSerializer
):
    installments = ProgramFeeInstallmentManagementSerializer(
        many=True,
        required=False,
    )
    program_name = serializers.CharField(
        source="program.name",
        read_only=True,
    )
    institution_name = serializers.CharField(
        source="program.institution.name",
        read_only=True,
    )
    verified_by = serializers.SerializerMethodField()

    def get_verified_by(self, obj):
        user = obj.verified_by
        if not user:
            return None
        return {
            "id": str(user.pk),
            "username": user.username,
            "email": user.email,
            "display_name": user.get_full_name() or user.username,
        }

    class Meta:
        model = ProgramFeePlan
        fields = [
            "id",
            "program",
            "program_name",
            "institution_name",
            "name",
            "student_total_fee",
            "registration_fee",
            "exam_fee",
            "other_fee",
            "data_status",
            "verified_at",
            "verified_by",
            "verification_notes",
            "is_active",
            "notes",
            "installments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "program_name",
            "institution_name",
            "data_status",
            "verified_at",
            "verified_by",
            "verification_notes",
            "created_at",
            "updated_at",
        ]

    def validate_student_total_fee(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError(
                "Student total fee cannot be negative."
            )
        return value

    def validate_registration_fee(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError(
                "Registration fee cannot be negative."
            )
        return value

    def validate_exam_fee(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError(
                "Exam fee cannot be negative."
            )
        return value

    def validate_other_fee(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError(
                "Other fee cannot be negative."
            )
        return value

    def validate(self, attrs):
        installments = attrs.get("installments")

        if installments is not None:
            numbers = [
                item["installment_number"]
                for item in installments
            ]

            if len(numbers) != len(set(numbers)):
                raise serializers.ValidationError(
                    {
                        "installments": (
                            "Installment numbers "
                            "must be unique."
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        installments_data = validated_data.pop(
            "installments",
            [],
        )

        try:
            fee_plan = ProgramFeePlan.objects.create(
                **validated_data
            )

            self._create_installments(
                fee_plan,
                installments_data,
            )

        except IntegrityError as exc:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "A fee plan with this "
                        "name already exists "
                        "for this program."
                    )
                }
            ) from exc

        return fee_plan

    def update(self, instance, validated_data):
        installments_data = validated_data.pop(
            "installments",
            None,
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        try:
            instance.save()

            if installments_data is not None:
                instance.installments.all().delete()
                self._create_installments(
                    instance,
                    installments_data,
                )

        except IntegrityError as exc:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "A fee plan with this "
                        "name already exists "
                        "for this program."
                    )
                }
            ) from exc

        return instance

    def _create_installments(
        self,
        fee_plan,
        installments_data,
    ):
        for installment_data in installments_data:
            ProgramFeeInstallment.objects.create(
                fee_plan=fee_plan,
                **installment_data,
            )


class InstitutionManagementViewSet(ModelViewSet):
    serializer_class = InstitutionSerializer

    http_method_names = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "options",
    ]

    def get_permissions(self):
        if self.request.method in [
            "POST",
            "PUT",
            "PATCH",
        ]:
            return [
                IsAuthenticated(),
                CanManageAdmissions(),
            ]

        return [
            IsAuthenticated(),
            CanViewAcademicMasterData(),
        ]

    def get_queryset(self):
        queryset = Institution.objects.all()

        active = self.request.query_params.get("active")
        search = self.request.query_params.get("search")

        if active == "true":
            queryset = queryset.filter(is_active=True)
        elif active == "false":
            queryset = queryset.filter(is_active=False)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(short_name__icontains=search)
                | Q(code__icontains=search)
                | Q(city__icontains=search)
                | Q(state__icontains=search)
            )

        return queryset.order_by("name")


class ProgramManagementViewSet(ModelViewSet):
    http_method_names = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "options",
    ]

    def get_permissions(self):
        if self.request.method in [
            "POST",
            "PUT",
            "PATCH",
        ]:
            return [
                IsAuthenticated(),
                CanManageAdmissions(),
            ]

        return [
            IsAuthenticated(),
            CanViewAcademicMasterData(),
        ]

    def get_serializer_class(self):
        return ProgramManagementSerializer

    @action(detail=True, methods=["post"], url_path="verification")
    def verification(self, request, pk=None):
        program = self.get_object()
        data_status = str(request.data.get("data_status", "")).strip().upper()
        allowed = {choice for choice, _label in Program.DataStatus.choices}
        if data_status not in allowed:
            return Response(
                {"detail": "data_status must be NEEDS_REVIEW, PARTIAL, or VERIFIED."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if data_status == Program.DataStatus.VERIFIED:
            program.data_status = data_status
            program.verified_at = timezone.now()
            program.verified_by = request.user
            if "verification_notes" in request.data:
                program.verification_notes = str(request.data.get("verification_notes") or "").strip()
        else:
            program.data_status = data_status
            program.verified_at = None
            program.verified_by = None
            if "verification_notes" in request.data:
                program.verification_notes = str(request.data.get("verification_notes") or "").strip()
        program.save(update_fields=["data_status", "verified_at", "verified_by", "verification_notes", "updated_at"])
        return Response(self.get_serializer(program).data)

    def get_queryset(self):
        queryset = (
            Program.objects
            .select_related("institution")
            .prefetch_related(
                "fee_plans",
                "fee_plans__installments",
            )
        )

        institution = self.request.query_params.get(
            "institution"
        )
        level = self.request.query_params.get("level")
        active = self.request.query_params.get("active")
        credit_transfer = self.request.query_params.get(
            "credit_transfer"
        )
        search = self.request.query_params.get("search")

        if institution:
            queryset = queryset.filter(
                institution_id=institution
            )

        if level:
            queryset = queryset.filter(level=level)

        if active == "true":
            queryset = queryset.filter(is_active=True)
        elif active == "false":
            queryset = queryset.filter(is_active=False)

        if credit_transfer == "true":
            queryset = queryset.filter(
                is_credit_transfer_available=True
            )
        elif credit_transfer == "false":
            queryset = queryset.filter(
                is_credit_transfer_available=False
            )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
                | Q(
                    institution__name__icontains=search
                )
            )

        return queryset.order_by(
            "institution__name",
            "name",
        )


class ProgramFeePlanViewSet(ModelViewSet):
    serializer_class = ProgramFeePlanManagementSerializer

    http_method_names = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "options",
    ]

    def get_permissions(self):
        if self.request.method in [
            "POST",
            "PUT",
            "PATCH",
        ]:
            return [
                IsAuthenticated(),
                CanManageAdmissions(),
            ]

        return [
            IsAuthenticated(),
            CanViewAcademicMasterData(),
        ]

    @action(detail=True, methods=["post"], url_path="verification")
    def verification(self, request, pk=None):
        fee_plan = self.get_object()
        data_status = str(request.data.get("data_status", "")).strip().upper()
        allowed = {choice for choice, _label in ProgramFeePlan.DataStatus.choices}
        if data_status not in allowed:
            return Response(
                {"detail": "data_status must be NEEDS_REVIEW, PARTIAL, or VERIFIED."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if data_status == ProgramFeePlan.DataStatus.VERIFIED:
            fee_plan.data_status = data_status
            fee_plan.verified_at = timezone.now()
            fee_plan.verified_by = request.user
            if "verification_notes" in request.data:
                fee_plan.verification_notes = str(request.data.get("verification_notes") or "").strip()
        else:
            fee_plan.data_status = data_status
            fee_plan.verified_at = None
            fee_plan.verified_by = None
            if "verification_notes" in request.data:
                fee_plan.verification_notes = str(request.data.get("verification_notes") or "").strip()
        fee_plan.save(update_fields=["data_status", "verified_at", "verified_by", "verification_notes", "updated_at"])
        return Response(self.get_serializer(fee_plan).data)

    def get_queryset(self):
        queryset = (
            ProgramFeePlan.objects
            .select_related(
                "program",
                "program__institution",
            )
            .prefetch_related("installments")
        )

        program = self.request.query_params.get("program")
        institution = self.request.query_params.get(
            "institution"
        )
        active = self.request.query_params.get("active")
        search = self.request.query_params.get("search")

        if program:
            queryset = queryset.filter(
                program_id=program
            )

        if institution:
            queryset = queryset.filter(
                program__institution_id=institution
            )

        if active == "true":
            queryset = queryset.filter(is_active=True)
        elif active == "false":
            queryset = queryset.filter(is_active=False)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(program__name__icontains=search)
                | Q(program__code__icontains=search)
                | Q(
                    program__institution__name__icontains=search
                )
            )

        return queryset.order_by(
            "program__institution__name",
            "program__name",
            "name",
        )

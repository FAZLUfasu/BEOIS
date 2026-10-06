from decimal import Decimal

from django.db import IntegrityError
from django.db.models import Q

from rest_framework import serializers
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

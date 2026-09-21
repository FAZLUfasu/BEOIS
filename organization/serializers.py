from rest_framework import serializers

from .models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)


class TrustSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trust
        fields = [
            "id",
            "name",
            "short_name",
            "registration_number",
            "phone_number",
            "email",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BusinessUnitSerializer(serializers.ModelSerializer):
    trust_name = serializers.CharField(
        source="trust.name",
        read_only=True,
    )

    class Meta:
        model = BusinessUnit
        fields = [
            "id",
            "trust",
            "trust_name",
            "name",
            "code",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BranchSerializer(serializers.ModelSerializer):
    business_unit_name = serializers.CharField(
        source="business_unit.name",
        read_only=True,
    )

    trust = serializers.UUIDField(
        source="business_unit.trust_id",
        read_only=True,
    )

    trust_name = serializers.CharField(
        source="business_unit.trust.name",
        read_only=True,
    )

    class Meta:
        model = Branch
        fields = [
            "id",
            "business_unit",
            "business_unit_name",
            "trust",
            "trust_name",
            "name",
            "code",
            "phone_number",
            "email",
            "address",
            "city",
            "state",
            "pincode",
            "is_head_office",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DepartmentSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
        allow_null=True,
    )

    business_unit = serializers.UUIDField(
        source="branch.business_unit_id",
        read_only=True,
        allow_null=True,
    )

    business_unit_name = serializers.CharField(
        source="branch.business_unit.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Department
        fields = [
            "id",
            "branch",
            "branch_name",
            "business_unit",
            "business_unit_name",
            "name",
            "code",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
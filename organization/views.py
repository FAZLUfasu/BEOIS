from django.db.models import Q

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)

from .serializers import (
    BranchSerializer,
    BusinessUnitSerializer,
    DepartmentSerializer,
    TrustSerializer,
)


class TrustViewSet(ReadOnlyModelViewSet):
    serializer_class = TrustSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Trust.objects.all().order_by(
            "name"
        )

        active = self.request.query_params.get(
            "active"
        )

        search = self.request.query_params.get(
            "search"
        )

        if active is not None:
            if active.lower() in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active.lower() in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(short_name__icontains=search)
            )

        return queryset


class BusinessUnitViewSet(ReadOnlyModelViewSet):
    serializer_class = BusinessUnitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            BusinessUnit.objects
            .select_related("trust")
            .all()
            .order_by("name")
        )

        trust_id = self.request.query_params.get(
            "trust"
        )

        active = self.request.query_params.get(
            "active"
        )

        search = self.request.query_params.get(
            "search"
        )

        if trust_id:
            queryset = queryset.filter(
                trust_id=trust_id
            )

        if active is not None:
            if active.lower() in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active.lower() in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
            )

        return queryset


class BranchViewSet(ReadOnlyModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Branch.objects
            .select_related(
                "business_unit",
                "business_unit__trust",
            )
            .all()
            .order_by("name")
        )

        business_unit_id = (
            self.request.query_params.get(
                "business_unit"
            )
        )

        trust_id = self.request.query_params.get(
            "trust"
        )

        active = self.request.query_params.get(
            "active"
        )

        search = self.request.query_params.get(
            "search"
        )

        if business_unit_id:
            queryset = queryset.filter(
                business_unit_id=business_unit_id
            )

        if trust_id:
            queryset = queryset.filter(
                business_unit__trust_id=trust_id
            )

        if active is not None:
            if active.lower() in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active.lower() in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
                | Q(city__icontains=search)
                | Q(state__icontains=search)
            )

        return queryset


class DepartmentViewSet(ReadOnlyModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Department.objects
            .select_related(
                "branch",
                "branch__business_unit",
            )
            .all()
            .order_by("name")
        )

        branch_id = self.request.query_params.get(
            "branch"
        )

        business_unit_id = (
            self.request.query_params.get(
                "business_unit"
            )
        )

        active = self.request.query_params.get(
            "active"
        )

        shared = self.request.query_params.get(
            "shared"
        )

        search = self.request.query_params.get(
            "search"
        )

        if branch_id:
            queryset = queryset.filter(
                branch_id=branch_id
            )

        if business_unit_id:
            queryset = queryset.filter(
                branch__business_unit_id=(
                    business_unit_id
                )
            )

        if shared is not None:
            if shared.lower() in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    branch__isnull=True
                )

            elif shared.lower() in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    branch__isnull=False
                )

        if active is not None:
            if active.lower() in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active.lower() in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
            )

        return queryset
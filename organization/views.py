from django.db.models import Q
from django.db.models.deletion import ProtectedError

from rest_framework import status
from rest_framework.permissions import (
    BasePermission,
    IsAuthenticated,
    SAFE_METHODS,
)
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

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


MANAGEMENT_ROLES = {
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
}


class OrganizationAccessPermission(BasePermission):
    """
    Any authenticated BEOIS user may read organization masters.

    Only superusers and management roles may create,
    update, or delete organization records.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        if user.is_superuser:
            return True

        return user.role_assignments.filter(
            is_active=True,
            role__is_active=True,
            role__code__in=MANAGEMENT_ROLES,
        ).exists()


class OrganizationModelViewSet(ModelViewSet):
    """
    Base ViewSet for organization master data.

    DELETE is permitted for management users.

    If Django PROTECT prevents deletion because the record
    is already used elsewhere in BEOIS, return a readable
    409 response instead of deleting related operational data.
    """

    permission_classes = [
        IsAuthenticated,
        OrganizationAccessPermission,
    ]

    http_method_names = [
        "get",
        "post",
        "patch",
        "put",
        "delete",
        "head",
        "options",
    ]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        try:
            self.perform_destroy(instance)

        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "This record cannot be deleted because "
                        "it is already being used by other "
                        "records in BEOIS. Deactivate it instead."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class TrustViewSet(OrganizationModelViewSet):
    serializer_class = TrustSerializer

    def get_queryset(self):
        queryset = (
            Trust.objects
            .all()
            .order_by("name")
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
                Q(
                    name__icontains=search
                )
                |
                Q(
                    short_name__icontains=search
                )
            )

        return queryset


class BusinessUnitViewSet(
    OrganizationModelViewSet
):
    serializer_class = BusinessUnitSerializer

    def get_queryset(self):
        queryset = (
            BusinessUnit.objects
            .select_related("trust")
            .all()
            .order_by("name")
        )

        trust_id = (
            self.request
            .query_params
            .get("trust")
        )

        active = (
            self.request
            .query_params
            .get("active")
        )

        search = (
            self.request
            .query_params
            .get("search")
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
                Q(
                    name__icontains=search
                )
                |
                Q(
                    code__icontains=search
                )
            )

        return queryset


class BranchViewSet(
    OrganizationModelViewSet
):
    serializer_class = BranchSerializer

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
            self.request
            .query_params
            .get("business_unit")
        )

        trust_id = (
            self.request
            .query_params
            .get("trust")
        )

        active = (
            self.request
            .query_params
            .get("active")
        )

        search = (
            self.request
            .query_params
            .get("search")
        )

        if business_unit_id:
            queryset = queryset.filter(
                business_unit_id=(
                    business_unit_id
                )
            )

        if trust_id:
            queryset = queryset.filter(
                business_unit__trust_id=(
                    trust_id
                )
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
                Q(
                    name__icontains=search
                )
                |
                Q(
                    code__icontains=search
                )
                |
                Q(
                    city__icontains=search
                )
                |
                Q(
                    state__icontains=search
                )
            )

        return queryset


class DepartmentViewSet(
    OrganizationModelViewSet
):
    serializer_class = DepartmentSerializer

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

        branch_id = (
            self.request
            .query_params
            .get("branch")
        )

        business_unit_id = (
            self.request
            .query_params
            .get("business_unit")
        )

        active = (
            self.request
            .query_params
            .get("active")
        )

        shared = (
            self.request
            .query_params
            .get("shared")
        )

        search = (
            self.request
            .query_params
            .get("search")
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
                Q(
                    name__icontains=search
                )
                |
                Q(
                    code__icontains=search
                )
            )

        return queryset
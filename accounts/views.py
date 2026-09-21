from django.db.models import Q

from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from hr.permissions import IsHRUser

from .models import User
from .serializers import (
    CurrentUserSerializer,
    UserDirectorySerializer,
)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(
            request.user,
            context={
                "request": request,
            },
        )

        return Response(serializer.data)


class UserDirectoryQuerysetMixin:
    permission_classes = [
        IsAuthenticated,
        IsHRUser,
    ]

    def get_queryset(self):
        queryset = (
            User.objects
            .select_related(
                "employee_profile",
            )
            .all()
            .order_by(
                "first_name",
                "last_name",
                "username",
            )
        )

        active = self.request.query_params.get(
            "active"
        )

        unlinked = self.request.query_params.get(
            "unlinked"
        )

        search = self.request.query_params.get(
            "search"
        )

        if active is not None:
            active_value = active.lower()

            if active_value in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif active_value in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        if unlinked is not None:
            unlinked_value = unlinked.lower()

            if unlinked_value in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    employee_profile__isnull=True
                )

            elif unlinked_value in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    employee_profile__isnull=False
                )

        if search:
            queryset = queryset.filter(
                Q(
                    username__icontains=search
                )
                | Q(
                    email__icontains=search
                )
                | Q(
                    first_name__icontains=search
                )
                | Q(
                    last_name__icontains=search
                )
                | Q(
                    phone_number__icontains=search
                )
                | Q(
                    employee_profile__employee_id__icontains=search
                )
            )

        return queryset


class UserDirectoryListView(
    UserDirectoryQuerysetMixin,
    ListAPIView,
):
    serializer_class = UserDirectorySerializer


class UserDirectoryDetailView(
    UserDirectoryQuerysetMixin,
    RetrieveAPIView,
):
    serializer_class = UserDirectorySerializer
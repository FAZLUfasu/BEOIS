from django.db.models import Q

from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework import status
from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from hr.permissions import IsHRUser

from .models import (
    Role,
    User,
    UserRole,
)
from .permissions import IsSuperAdmin
from .serializers import (
    CurrentUserSerializer,
    UserDirectorySerializer,
    AdminPasswordResetSerializer,
    AdminRoleReferenceSerializer,
    AdminUserCreateSerializer,
    AdminUserRoleSerializer,
    AdminUserSerializer,
    ProfilePictureSerializer,
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

    def patch(self, request):
        serializer = CurrentUserSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(serializer.data)

class CurrentUserProfilePictureView(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def post(self, request):
        user = request.user

        serializer = ProfilePictureSerializer(
            user,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        old_picture = (
            user.profile_picture.name
            if user.profile_picture
            else None
        )

        serializer.save()

        if (
            old_picture
            and user.profile_picture
            and old_picture
            != user.profile_picture.name
        ):
            storage = user.profile_picture.storage

            if storage.exists(old_picture):
                storage.delete(old_picture)

        output = CurrentUserSerializer(
            user,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "profile_picture": (
                    output.data[
                        "profile_picture"
                    ]
                ),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        user = request.user

        if user.profile_picture:
            user.profile_picture.delete(
                save=False
            )

            user.profile_picture = None

            user.save(
                update_fields=[
                    "profile_picture",
                ]
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
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

class SuperAdminUserQuerysetMixin:
    permission_classes = [
        IsAuthenticated,
        IsSuperAdmin,
    ]

    def get_queryset(self):
        queryset = (
            User.objects
            .prefetch_related(
                "role_assignments__role",
                "role_assignments__business_unit",
                "role_assignments__branch",
                "role_assignments__department",
            )
            .all()
            .order_by(
                "first_name",
                "last_name",
                "username",
            )
        )

        search = self.request.query_params.get(
            "search"
        )
        active = self.request.query_params.get(
            "active"
        )

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone_number__icontains=search)
            )

        if active is not None:
            value = active.lower()

            if value in {
                "true",
                "1",
                "yes",
            }:
                queryset = queryset.filter(
                    is_active=True
                )

            elif value in {
                "false",
                "0",
                "no",
            }:
                queryset = queryset.filter(
                    is_active=False
                )

        return queryset


class SuperAdminUserListCreateView(
    SuperAdminUserQuerysetMixin,
    ListCreateAPIView,
):
    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminUserCreateSerializer

        return AdminUserSerializer


class SuperAdminUserDetailView(
    SuperAdminUserQuerysetMixin,
    RetrieveUpdateAPIView,
):
    serializer_class = AdminUserSerializer
    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]


class SuperAdminPasswordResetView(
    APIView
):
    permission_classes = [
        IsAuthenticated,
        IsSuperAdmin,
    ]

    def post(self, request, pk):
        target_user = User.objects.get(
            pk=pk
        )

        serializer = (
            AdminPasswordResetSerializer(
                data=request.data,
                context={
                    "target_user": (
                        target_user
                    ),
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )
        serializer.save()

        return Response(
            {
                "detail": (
                    "Password updated successfully."
                )
            },
            status=status.HTTP_200_OK,
        )


class SuperAdminRoleListView(
    ListAPIView
):
    permission_classes = [
        IsAuthenticated,
        IsSuperAdmin,
    ]
    serializer_class = (
        AdminRoleReferenceSerializer
    )

    def get_queryset(self):
        return Role.objects.filter(
            is_active=True
        ).order_by("name")


class SuperAdminUserRoleListCreateView(
    APIView
):
    permission_classes = [
        IsAuthenticated,
        IsSuperAdmin,
    ]

    def get_user(self, pk):
        return get_object_or_404(
                User,
                pk=pk,
            )

    def get(self, request, pk):
        target_user = self.get_user(pk)

        assignments = (
            target_user.role_assignments
            .select_related(
                "role",
                "business_unit",
                "branch",
                "department",
            )
            .order_by("role__name")
        )

        serializer = AdminUserRoleSerializer(
            assignments,
            many=True,
        )

        return Response(serializer.data)

    def post(self, request, pk):
        target_user = self.get_user(pk)

        serializer = AdminUserRoleSerializer(
            data=request.data,
            context={
                "target_user": target_user,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        assignment = serializer.save(
            user=target_user
        )

        output = AdminUserRoleSerializer(
            assignment
        )

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
        )


class SuperAdminUserRoleDetailView(
    APIView
):
    permission_classes = [
        IsAuthenticated,
        IsSuperAdmin,
    ]

    def get_assignment(
        self,
        user_pk,
        role_pk,
    ):
        return get_object_or_404(
            UserRole,
            pk=role_pk,
            user_id=user_pk,
        )

    def patch(
        self,
        request,
        user_pk,
        role_pk,
    ):
        assignment = self.get_assignment(
            user_pk,
            role_pk,
        )

        serializer = AdminUserRoleSerializer(
            assignment,
            data=request.data,
            partial=True,
            context={
                "target_user": (
                    assignment.user
                ),
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        assignment = serializer.save()

        return Response(
            AdminUserRoleSerializer(
                assignment
            ).data
        )

    def delete(
        self,
        request,
        user_pk,
        role_pk,
    ):
        assignment = self.get_assignment(
            user_pk,
            role_pk,
        )

        assignment.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class SuperAdminProfilePictureView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsSuperAdmin,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_user(self, pk):
        return get_object_or_404(
            User,
            pk=pk,
        )

    def post(self, request, pk):
        target_user = self.get_user(pk)

        serializer = ProfilePictureSerializer(
            target_user,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        old_picture = (
            target_user.profile_picture.name
            if target_user.profile_picture
            else None
        )

        serializer.save()

        if (
            old_picture
            and target_user.profile_picture
            and old_picture
            != target_user.profile_picture.name
        ):
            storage = (
                target_user
                .profile_picture
                .storage
            )

            if storage.exists(old_picture):
                storage.delete(old_picture)

        output = AdminUserSerializer(
            target_user,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "profile_picture": (
                    output.data[
                        "profile_picture"
                    ]
                ),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        target_user = self.get_user(pk)

        if target_user.profile_picture:
            target_user.profile_picture.delete(
                save=False
            )

            target_user.profile_picture = None

            target_user.save(
                update_fields=[
                    "profile_picture",
                ]
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
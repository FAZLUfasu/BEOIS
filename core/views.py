from django.db import transaction

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SystemSettings, SystemSettingsAudit
from .permissions import SystemSettingsPermission
from .serializers import (
    SystemSettingsAuditSerializer,
    SystemSettingsSerializer,
)


class SystemSettingsView(APIView):

    permission_classes = [
        SystemSettingsPermission,
    ]

    def get_object(self):
        return SystemSettings.get_settings()

    def get(self, request):
        instance = self.get_object()

        serializer = SystemSettingsSerializer(
            instance
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def patch(self, request):
        instance = (
            SystemSettings.objects
            .select_for_update()
            .get(
                pk=self.get_object().pk
            )
        )

        before = SystemSettingsSerializer(
            instance
        ).data

        serializer = SystemSettingsSerializer(
            instance,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        updated_instance = serializer.save(
            updated_by=request.user
        )

        after = SystemSettingsSerializer(
            updated_instance
        ).data

        changed_fields = {}

        ignored_fields = {
            "updated_by",
            "updated_by_name",
            "updated_at",
        }

        for field_name in after:
            if field_name in ignored_fields:
                continue

            old_value = before.get(
                field_name
            )

            new_value = after.get(
                field_name
            )

            if old_value != new_value:
                changed_fields[field_name] = {
                    "old": old_value,
                    "new": new_value,
                }

        if changed_fields:
            SystemSettingsAudit.objects.create(
                settings=updated_instance,
                changed_by=request.user,
                changed_fields=changed_fields,
            )

        response_serializer = (
            SystemSettingsSerializer(
                updated_instance
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        """
        We intentionally use PATCH for settings updates.

        Preventing PUT avoids accidental resetting of fields that
        were omitted by the frontend.
        """

        return Response(
            {
                "detail": (
                    "Use PATCH to update system settings."
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class SystemSettingsAuditListView(APIView):

    permission_classes = [
        SystemSettingsPermission,
    ]

    def get(self, request):
        queryset = (
            SystemSettingsAudit.objects
            .select_related(
                "changed_by",
                "settings",
            )
            .all()[:100]
        )

        serializer = SystemSettingsAuditSerializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
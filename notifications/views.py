from django.db.models import Q
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, Task
from .permissions import (
    CanManageTasks,
    is_management_user,
)
from .serializers import (
    MyTaskUpdateSerializer,
    NotificationSerializer,
    TaskSerializer,
)


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [
        IsAuthenticated,
        CanManageTasks,
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = Task.objects.select_related(
            "assigned_to",
            "assigned_by",
        )

        if not is_management_user(user):
            queryset = queryset.filter(
                Q(assigned_to=user)
                | Q(assigned_by=user)
            )

        status_value = self.request.query_params.get(
            "status"
        )

        priority = self.request.query_params.get(
            "priority"
        )

        source_module = self.request.query_params.get(
            "source_module"
        )

        assigned_to = self.request.query_params.get(
            "assigned_to"
        )

        overdue = self.request.query_params.get(
            "overdue"
        )

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        if priority:
            queryset = queryset.filter(
                priority=priority
            )

        if source_module:
            queryset = queryset.filter(
                source_module=source_module
            )

        if assigned_to:
            queryset = queryset.filter(
                assigned_to_id=assigned_to
            )

        if overdue == "true":
            queryset = queryset.filter(
                due_at__lt=timezone.now()
            ).exclude(
                status__in=[
                    Task.Status.COMPLETED,
                    Task.Status.CANCELLED,
                ]
            )

        return queryset


class TaskDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = TaskSerializer
    permission_classes = [
        IsAuthenticated,
        CanManageTasks,
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = Task.objects.select_related(
            "assigned_to",
            "assigned_by",
        )

        if is_management_user(user):
            return queryset

        return queryset.filter(
            Q(assigned_to=user)
            | Q(assigned_by=user)
        )


class MyTaskListView(generics.ListAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Task.objects.filter(
            assigned_to=self.request.user
        ).select_related(
            "assigned_to",
            "assigned_by",
        )

        status_value = self.request.query_params.get(
            "status"
        )

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        return queryset


class MyTaskStatusView(generics.UpdateAPIView):
    serializer_class = MyTaskUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            assigned_to=self.request.user
        )


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user
        ).select_related(
            "task"
        )

        unread = self.request.query_params.get(
            "unread"
        )

        if unread == "true":
            queryset = queryset.filter(
                is_read=False
            )

        return queryset


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()

        return Response(
            {
                "unread_count": count,
            }
        )


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk,
                recipient=request.user,
            )
        except Notification.DoesNotExist:
            return Response(
                {
                    "detail": "Notification not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.mark_read()

        return Response(
            NotificationSerializer(
                notification
            ).data
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()

        updated = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=now,
        )

        return Response(
            {
                "updated": updated,
            }
        )
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from accounts.models import Role
from dashboard.models import RoleDashboardWidget
from dashboard.dynamic_engine import WIDGETS, available_widgets, widget_value

class MyDynamicDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        widgets = available_widgets(request.user)
        return Response({"widgets": [{**w, "value": widget_value(request.user, w["key"])} for w in widgets]})

class RoleDashboardConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def _allowed(self, request):
        return request.user.is_active and request.user.is_superuser

    def get(self, request, role_id):
        if not self._allowed(request):
            return Response({"detail": "Superuser required."}, status=status.HTTP_403_FORBIDDEN)
        role = get_object_or_404(Role, pk=role_id)
        configured = list(RoleDashboardWidget.objects.filter(role=role))
        return Response({"role_id": str(role.id), "catalog": [{"key": k, **v} for k, v in WIDGETS.items()], "widgets": [{"key": w.widget_key, "position": w.position, "enabled": w.enabled} for w in configured]})

    def put(self, request, role_id):
        if not self._allowed(request):
            return Response({"detail": "Superuser required."}, status=status.HTTP_403_FORBIDDEN)
        role = get_object_or_404(Role, pk=role_id)
        widgets = request.data.get("widgets")
        if not isinstance(widgets, list) or len(widgets) > len(WIDGETS):
            return Response({"detail": "Invalid widgets list."}, status=400)
        keys = [w.get("key") for w in widgets if isinstance(w, dict)]
        if len(keys) != len(widgets) or len(set(keys)) != len(keys) or any(k not in WIDGETS for k in keys):
            return Response({"detail": "Invalid or duplicate widget key."}, status=400)
        if any(type(w.get("enabled", True)) is not bool for w in widgets):
            return Response({"detail": "enabled must be boolean."}, status=400)
        from django.db import transaction
        with transaction.atomic():
            RoleDashboardWidget.objects.filter(role=role).delete()
            RoleDashboardWidget.objects.bulk_create([RoleDashboardWidget(role=role, widget_key=w["key"], enabled=w.get("enabled", True), position=i) for i, w in enumerate(widgets)])
        return Response({"role_id": str(role.id), "widgets": widgets})

from django.urls import path

from .views import (
    SystemSettingsAuditListView,
    SystemSettingsView,
)


app_name = "core"


urlpatterns = [
    path(
        "",
        SystemSettingsView.as_view(),
        name="system-settings",
    ),
    path(
        "audit/",
        SystemSettingsAuditListView.as_view(),
        name="system-settings-audit",
    ),
]
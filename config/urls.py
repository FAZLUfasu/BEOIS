from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    # --------------------------------------------------------
    # AUTHENTICATION
    # --------------------------------------------------------

    path(
        "api/auth/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "api/auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path(
        "api/auth/",
        include("accounts.urls"),
    ),

    # --------------------------------------------------------
    # BEOIS APIs
    # --------------------------------------------------------

    path(
        "api/dashboard/",
        include("dashboard.urls"),
    ),

    path(
        "api/leads/",
        include("leads.urls"),
    ),

    path(
        "api/admissions/",
        include("admissions.urls"),
    ),

    path(
        "api/students/",
        include("students.urls"),
    ),

        path(
        "api/partners/",
        include("partners.urls"),
    ),

    path(
        "api/organization/",
        include("organization.urls"),
    ),

    path(
        "api/hr/",
        include("hr.urls"),
    ),

    path(
        "api/finance/",
        include("finance.urls"),
    ),

    path(
        "api/settings/",
        include("core.urls"),
    ),

]
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
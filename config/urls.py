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
        "api/hr/",
        include("hr.urls"),
    ),
    path(
        "api/finance/",
        include("finance.urls"),
    ),
]
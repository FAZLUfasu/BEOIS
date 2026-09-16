from django.urls import path

from dashboard.views import (
    MyDashboardAccessView,
    ManagementDashboardView,
    MarketingDashboardView,
    TelecallingDashboardView,
    AdmissionDashboardView,
    EducationDashboardView,
    PartnerDashboardView,
    HRDashboardView,
    FinanceDashboardView,
)


app_name = "dashboard"


urlpatterns = [
    path(
        "me/",
        MyDashboardAccessView.as_view(),
        name="me",
    ),

    path(
        "management/",
        ManagementDashboardView.as_view(),
        name="management",
    ),

    path(
        "marketing/",
        MarketingDashboardView.as_view(),
        name="marketing",
    ),

    path(
        "telecalling/",
        TelecallingDashboardView.as_view(),
        name="telecalling",
    ),

    path(
        "admissions/",
        AdmissionDashboardView.as_view(),
        name="admissions",
    ),

    path(
        "education/",
        EducationDashboardView.as_view(),
        name="education",
    ),

    path(
        "partners/",
        PartnerDashboardView.as_view(),
        name="partners",
    ),

    path(
        "hr/",
        HRDashboardView.as_view(),
        name="hr",
    ),

    path(
        "finance/",
        FinanceDashboardView.as_view(),
        name="finance",
    ),
]
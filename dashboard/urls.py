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
    IntelligenceOverviewView,
    IntelligenceTrendsView,
    InstitutionIntelligenceView,
    PartnerIntelligenceView,
    StaffIntelligenceView,
    FinancialIntelligenceView,
    ExceptionIntelligenceView,
    TaskIntelligenceView,
)


app_name = "dashboard"


urlpatterns = [
    # ========================================================
    # EXISTING DASHBOARDS
    # ========================================================

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

    # ========================================================
    # REPORTING & INTELLIGENCE V2
    # ========================================================

    path(
        "intelligence/overview/",
        IntelligenceOverviewView.as_view(),
        name="intelligence-overview",
    ),

    path(
        "intelligence/trends/",
        IntelligenceTrendsView.as_view(),
        name="intelligence-trends",
    ),

    path(
        "intelligence/institutions/",
        InstitutionIntelligenceView.as_view(),
        name="intelligence-institutions",
    ),

    path(
        "intelligence/partners/",
        PartnerIntelligenceView.as_view(),
        name="intelligence-partners",
    ),

    path(
        "intelligence/staff/",
        StaffIntelligenceView.as_view(),
        name="intelligence-staff",
    ),

    path(
        "intelligence/finance/",
        FinancialIntelligenceView.as_view(),
        name="intelligence-finance",
    ),

    path(
        "intelligence/exceptions/",
        ExceptionIntelligenceView.as_view(),
        name="intelligence-exceptions",
    ),

    path(
        "intelligence/tasks/",
        TaskIntelligenceView.as_view(),
        name="intelligence-tasks",
    ),
]

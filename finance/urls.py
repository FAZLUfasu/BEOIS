from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionFinancialSummaryView,
    AdmissionPaymentSyncView,
    ExpenseViewSet,
    FinanceActivityViewSet,
    FinanceSummaryView,
    FinancialAccountViewSet,
    FinancialTransactionViewSet,
    OutstandingFinanceSummaryView,
    PartnerCommissionSyncView,
    PayrollSyncView,
    TransactionCategoryViewSet,
    UniversityPayableViewSet,
)


router = DefaultRouter()

router.register(
    "accounts",
    FinancialAccountViewSet,
    basename="finance-account",
)

router.register(
    "categories",
    TransactionCategoryViewSet,
    basename="finance-category",
)

router.register(
    "transactions",
    FinancialTransactionViewSet,
    basename="finance-transaction",
)

router.register(
    "expenses",
    ExpenseViewSet,
    basename="finance-expense",
)

router.register(
    "university-payables",
    UniversityPayableViewSet,
    basename="finance-university-payable",
)

router.register(
    "activities",
    FinanceActivityViewSet,
    basename="finance-activity",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),

    path(
        "sync/admission-payment/<uuid:pk>/",
        AdmissionPaymentSyncView.as_view(),
        name="finance-sync-admission-payment",
    ),

    path(
        "sync/payroll/<uuid:pk>/",
        PayrollSyncView.as_view(),
        name="finance-sync-payroll",
    ),

    path(
        "sync/partner-commission/<uuid:pk>/",
        PartnerCommissionSyncView.as_view(),
        name="finance-sync-partner-commission",
    ),

    path(
        "reports/summary/",
        FinanceSummaryView.as_view(),
        name="finance-summary",
    ),

    path(
        "reports/outstanding/",
        OutstandingFinanceSummaryView.as_view(),
        name="finance-outstanding-summary",
    ),

    path(
        "reports/admission/<uuid:pk>/",
        AdmissionFinancialSummaryView.as_view(),
        name="finance-admission-summary",
    ),
]
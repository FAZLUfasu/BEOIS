from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionViewSet,
    InstitutionViewSet,
    ProgramViewSet,
)

from .master_data import (
    InstitutionManagementViewSet,
    ProgramManagementViewSet,
    ProgramFeePlanViewSet,
)

from .master_data_import_api import (
    AcademicMasterImportPreviewView,
    AcademicMasterImportConfirmView,
)


app_name = "admissions"


router = DefaultRouter()


# ================================================================
# ACADEMIC MASTER DATA
# ================================================================

router.register(
    "institutions",
    InstitutionManagementViewSet,
    basename="institution",
)

router.register(
    "programs",
    ProgramManagementViewSet,
    basename="program",
)

router.register(
    "fee-plans",
    ProgramFeePlanViewSet,
    basename="fee-plan",
)


# ================================================================
# EXISTING ADMISSIONS WORKFLOW
# ================================================================

router.register(
    "",
    AdmissionViewSet,
    basename="admission",
)


urlpatterns = [
    path(
        "import/preview/",
        AcademicMasterImportPreviewView.as_view(),
        name="academic-master-import-preview",
    ),
    path(
        "import/confirm/",
        AcademicMasterImportConfirmView.as_view(),
        name="academic-master-import-confirm",
    ),
    path(
        "",
        include(router.urls),
    ),
]

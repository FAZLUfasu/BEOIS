from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionViewSet,
    InstitutionViewSet,
    ProgramViewSet,
)


app_name = "admissions"


router = DefaultRouter()

router.register(
    "institutions",
    InstitutionViewSet,
    basename="institution",
)

router.register(
    "programs",
    ProgramViewSet,
    basename="program",
)

router.register(
    "",
    AdmissionViewSet,
    basename="admission",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]
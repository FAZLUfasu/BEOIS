from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    BranchViewSet,
    BusinessUnitViewSet,
    DepartmentViewSet,
    TrustViewSet,
)


router = DefaultRouter()

router.register(
    "trusts",
    TrustViewSet,
    basename="organization-trust",
)

router.register(
    "business-units",
    BusinessUnitViewSet,
    basename="organization-business-unit",
)

router.register(
    "branches",
    BranchViewSet,
    basename="organization-branch",
)

router.register(
    "departments",
    DepartmentViewSet,
    basename="organization-department",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]
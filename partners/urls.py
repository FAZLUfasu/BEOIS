from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PartnerViewSet


app_name = "partners"

router = DefaultRouter()

router.register(
    "",
    PartnerViewSet,
    basename="partner",
)

urlpatterns = [
    path("", include(router.urls)),
]
from rest_framework.routers import (
    DefaultRouter,
)

from .views import (
    LeadViewSet,
    LeadImportBatchViewSet,
)


router = DefaultRouter()

router.register(
    "imports",
    LeadImportBatchViewSet,
    basename="lead-import",
)

router.register(
    "",
    LeadViewSet,
    basename="lead",
)

urlpatterns = router.urls
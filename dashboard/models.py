from django.db import models

# Create your models here.

class RoleDashboardWidget(models.Model):
    """Widget choices for any BEOIS role, including roles created later."""
    role = models.ForeignKey("accounts.Role", on_delete=models.CASCADE, related_name="dashboard_widgets")
    widget_key = models.CharField(max_length=80)
    position = models.PositiveIntegerField(default=0)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["position", "widget_key"]
        constraints = [models.UniqueConstraint(fields=["role", "widget_key"], name="unique_role_dashboard_widget")]

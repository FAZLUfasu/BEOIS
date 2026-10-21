from django.contrib import admin

# Register your models here.



from dashboard.models import RoleDashboardWidget

@admin.register(RoleDashboardWidget)
class RoleDashboardWidgetAdmin(admin.ModelAdmin):
    list_display = ("role", "widget_key", "position", "enabled")
    list_filter = ("role", "enabled")

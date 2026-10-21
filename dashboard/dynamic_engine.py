"""Dynamic dashboard registry: permission checks and existing scoped selectors."""
from django.apps import apps
from dashboard import selectors
from dashboard.models import RoleDashboardWidget

# The registry is static; role selections are stored in the database.
WIDGETS = {
    'leads_total': {"title": 'Leads · Total leads', "permission": 'leads.view_lead', "module": 'leads', "selector": 'get_scoped_leads'},
    'leads_calls': {"title": 'Telecalling · Call logs', "permission": 'leads.view_calllog', "module": 'telecalling', "selector": 'get_scoped_calls'},
    'admissions_total': {"title": 'Admissions · Applications', "permission": 'admissions.view_admission', "module": 'admissions', "selector": 'get_scoped_admissions'},
    'students_total': {"title": 'Students · Student records', "permission": 'students.view_student', "module": 'students', "selector": 'get_scoped_students'},
    'students_processes': {"title": 'Students · Processes', "permission": 'students.view_studentprocess', "module": 'students', "selector": 'get_scoped_student_processes'},
    'partners_total': {"title": 'Partners · Partners', "permission": 'partners.view_partner', "module": 'partners', "selector": 'get_scoped_partners'},
    'partners_cases': {"title": 'Partners · Cases', "permission": 'partners.view_partnercase', "module": 'partners', "selector": 'get_scoped_partner_cases'},
    'partners_issues': {"title": 'Partners · Issues', "permission": 'partners.view_partnerissue', "module": 'partners', "selector": 'get_scoped_partner_issues'},
    'hr_employees': {"title": 'HR · Employees', "permission": 'hr.view_employee', "module": 'hr', "selector": 'get_scoped_employees'},
    'hr_attendance': {"title": 'HR · Attendance records', "permission": 'hr.view_attendance', "module": 'hr', "selector": 'get_scoped_attendance'},
    'hr_leave': {"title": 'HR · Leave requests', "permission": 'hr.view_leaverequest', "module": 'hr', "selector": 'get_scoped_leave_requests'},
    'hr_payroll': {"title": 'HR · Payroll records', "permission": 'hr.view_payroll', "module": 'hr', "selector": 'get_scoped_payroll'},
    'finance_transactions': {"title": 'Finance · Transactions', "permission": 'finance.view_financialtransaction', "module": 'finance', "selector": 'get_scoped_financial_transactions'},
    'finance_expenses': {"title": 'Finance · Expenses', "permission": 'finance.view_expense', "module": 'finance', "selector": 'get_scoped_expenses'},
    'marketing_leads': {"title": 'Marketing · Accessible leads', "permission": 'leads.view_lead', "module": 'marketing', "selector": 'get_scoped_leads'},
    'organization_branches': {"title": 'Organization · Branches', "permission": 'organization.view_branch', "module": 'organization', "model": 'organization.Branch', "superuser_only": True},
    'organization_departments': {"title": 'Organization · Departments', "permission": 'organization.view_department', "module": 'organization', "model": 'organization.Department', "superuser_only": True},
    'organization_business_units': {"title": 'Organization · Business units', "permission": 'organization.view_businessunit', "module": 'organization', "model": 'organization.BusinessUnit', "superuser_only": True},
    'administration_roles': {"title": 'Administration · Roles', "permission": 'accounts.view_role', "module": 'administration', "model": 'accounts.Role', "superuser_only": True},
    'administration_users': {"title": 'Administration · Users', "permission": 'accounts.view_user', "module": 'administration', "model": 'accounts.User', "superuser_only": True},
    'core_settings': {"title": 'Core · System settings', "permission": 'core.view_systemsettings', "module": 'core', "model": 'core.SystemSettings', "superuser_only": True},
}

def permitted(user, key):
    widget = WIDGETS.get(key)
    if not widget or not user or not user.is_authenticated or not user.is_active:
        return False
    if widget.get("superuser_only") and not user.is_superuser:
        return False
    return user.is_superuser or user.has_role_permission(widget["permission"])

def available_widgets(user):
    if not user or not user.is_authenticated or not user.is_active:
        return []
    role_ids = list(user.active_roles.values_list("id", flat=True))
    configured = list(RoleDashboardWidget.objects.filter(role_id__in=role_ids))
    if configured:
        enabled = [w for w in configured if w.enabled and w.widget_key in WIDGETS]
        keys = list(dict.fromkeys(w.widget_key for w in sorted(enabled, key=lambda w: (w.position, w.widget_key))))
    else:
        keys = list(WIDGETS)
    return [{"key": key, **{k:v for k,v in WIDGETS[key].items() if k not in ("selector", "model", "superuser_only")}} for key in keys if permitted(user, key)]

def widget_value(user, key):
    if not permitted(user, key):
        raise PermissionError("Widget permission denied")
    widget = WIDGETS[key]
    if "selector" in widget:
        # Existing dashboard selectors enforce the organizational data scope.
        return getattr(selectors, widget["selector"])(user).count()
    # Global administrative totals must never be returned to non-superusers.
    app_label, model_name = widget["model"].split(".")
    return apps.get_model(app_label, model_name).objects.count()

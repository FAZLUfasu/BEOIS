from notifications.integration import notify_business_event
from notifications.models import Notification, Task

def notify_employee(employee, *, title, message="", source_object_id="", notification_type=Notification.Type.INFO):
    user=getattr(employee,"user",None)
    if user is None: return None
    return notify_business_event(recipient=user,title=title,message=message,notification_type=notification_type,source_module=Task.SourceModule.HR,source_object_id=source_object_id,action_url="/hr")

def notify_leave_approved(leave_request): return notify_employee(leave_request.employee,title="Leave approved",message="Your leave request has been approved.",source_object_id=leave_request.pk,notification_type=Notification.Type.SUCCESS)
def notify_leave_rejected(leave_request): return notify_employee(leave_request.employee,title="Leave request rejected",message="Your leave request has been reviewed and rejected.",source_object_id=leave_request.pk,notification_type=Notification.Type.WARNING)
def notify_salary_advance_approved(advance): return notify_employee(advance.employee,title="Salary advance approved",message="Your salary advance request has been approved.",source_object_id=advance.pk,notification_type=Notification.Type.SUCCESS)
def notify_salary_advance_disbursed(advance): return notify_employee(advance.employee,title="Salary advance disbursed",message="Your approved salary advance has been disbursed.",source_object_id=advance.pk,notification_type=Notification.Type.SUCCESS)
def notify_payroll_paid(payroll): return notify_employee(payroll.employee,title="Salary payment processed",message="Your payroll has been marked as paid.",source_object_id=payroll.pk,notification_type=Notification.Type.SUCCESS)

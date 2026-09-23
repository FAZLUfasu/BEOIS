from notifications.integration import complete_linked_task, sync_linked_task
from notifications.models import Task

EXPENSE_LABEL="Expense Payment"
PAYABLE_LABEL="University Payable"

def sync_expense_task(expense, performed_by=None):
    if expense.status == "PAID":
        return complete_linked_task(source_module=Task.SourceModule.FINANCE,source_object_id=expense.pk,source_label=EXPENSE_LABEL)
    if expense.status not in {"APPROVED","PARTIALLY_PAID"}:
        return None
    assignee=performed_by or getattr(expense,"requested_by",None)
    if assignee is None: return None
    return sync_linked_task(source_module=Task.SourceModule.FINANCE,source_object_id=expense.pk,source_label=EXPENSE_LABEL,assigned_to=assignee,assigned_by=performed_by,title=f"Pay expense {expense.expense_number}",description=expense.description,due_at=expense.due_date,reminder_at=expense.due_date,priority=Task.Priority.HIGH)

def sync_university_payable_task(payable, performed_by=None):
    if payable.status == "PAID":
        return complete_linked_task(source_module=Task.SourceModule.FINANCE,source_object_id=payable.pk,source_label=PAYABLE_LABEL)
    if payable.status not in {"OPEN","PARTIALLY_PAID"}: return None
    assignee=performed_by or getattr(payable,"created_by",None)
    if assignee is None: return None
    return sync_linked_task(source_module=Task.SourceModule.FINANCE,source_object_id=payable.pk,source_label=PAYABLE_LABEL,assigned_to=assignee,assigned_by=performed_by,title=f"University payment {payable.payable_number}",description=payable.description,due_at=payable.due_date,reminder_at=payable.due_date,priority=Task.Priority.URGENT)

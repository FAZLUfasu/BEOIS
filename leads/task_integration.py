from notifications.integration import cancel_linked_task, complete_linked_task, sync_linked_task
from notifications.models import Task
from .models import Lead

LABEL = "Lead Follow-up"

def sync_lead_follow_up_task(lead, assigned_by=None):
    if not lead.assigned_to_id or not lead.next_follow_up_at or lead.status != Lead.Status.FOLLOW_UP:
        return cancel_lead_follow_up_task(lead)
    return sync_linked_task(source_module=Task.SourceModule.LEADS, source_object_id=lead.pk, source_label=LABEL, assigned_to=lead.assigned_to, assigned_by=assigned_by, title=f"Follow up lead: {lead.name}", description="Telecalling follow-up scheduled for this lead.", due_at=lead.next_follow_up_at, reminder_at=lead.next_follow_up_at, priority=Task.Priority.HIGH)

def complete_lead_follow_up_task(lead):
    return complete_linked_task(source_module=Task.SourceModule.LEADS, source_object_id=lead.pk, source_label=LABEL)

def cancel_lead_follow_up_task(lead):
    return cancel_linked_task(source_module=Task.SourceModule.LEADS, source_object_id=lead.pk, source_label=LABEL)

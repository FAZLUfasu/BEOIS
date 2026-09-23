from notifications.integration import complete_linked_task, sync_linked_task
from notifications.models import Task
LABEL_PREFIX="Education Process"

def process_label(process): return f"{LABEL_PREFIX}:{process.pk}"

def sync_student_process_task(process, performed_by=None):
    label=process_label(process)
    if process.status in {"COMPLETED","NOT_APPLICABLE","CANCELLED"}:
        return complete_linked_task(source_module=Task.SourceModule.EDUCATION,source_object_id=process.student_id,source_label=label)
    if not process.assigned_to_id: return None
    return sync_linked_task(source_module=Task.SourceModule.EDUCATION,source_object_id=process.student_id,source_label=label,assigned_to=process.assigned_to,assigned_by=performed_by,title=f"{process.get_process_type_display()} - student process",description="Complete the assigned education process for this student.",due_at=process.due_date,reminder_at=process.due_date,priority=Task.Priority.HIGH)

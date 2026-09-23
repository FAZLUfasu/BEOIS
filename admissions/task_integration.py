from notifications.integration import complete_linked_task, sync_linked_task
from notifications.models import Task
from .models import Admission

DOCUMENT_LABEL="Admission Documents"
FEE_LABEL="Admission Fee"
ENROLLMENT_LABEL="Admission Enrollment"

def _sync(admission, *, label, title, priority=Task.Priority.NORMAL, performed_by=None):
    if not admission.assigned_to_id:
        return None
    return sync_linked_task(source_module=Task.SourceModule.ADMISSIONS, source_object_id=admission.pk, source_label=label, assigned_to=admission.assigned_to, assigned_by=performed_by, title=title, description=f"Admission workflow action for {admission.admission_id}.", priority=priority)

def sync_admission_tasks(admission, performed_by=None):
    mapping=((Admission.Status.DOCUMENT_PENDING,DOCUMENT_LABEL,"Complete pending admission documents"),(Admission.Status.FEE_PENDING,FEE_LABEL,"Follow up pending admission fee"),(Admission.Status.ENROLLMENT_PENDING,ENROLLMENT_LABEL,"Complete university enrollment"))
    for status,label,title in mapping:
        if admission.status == status:
            _sync(admission,label=label,title=title,priority=Task.Priority.HIGH,performed_by=performed_by)
        else:
            complete_linked_task(source_module=Task.SourceModule.ADMISSIONS,source_object_id=admission.pk,source_label=label)

def complete_all_admission_tasks(admission):
    for label in (DOCUMENT_LABEL,FEE_LABEL,ENROLLMENT_LABEL):
        complete_linked_task(source_module=Task.SourceModule.ADMISSIONS,source_object_id=admission.pk,source_label=label)

from notifications.integration import complete_linked_task, sync_linked_task
from notifications.models import Task
CASE_PREFIX="Partner Case"
ISSUE_PREFIX="Partner Issue"

def sync_partner_case_task(case, performed_by=None):
    label=f"{CASE_PREFIX}:{case.pk}"
    if case.status in {"ADMISSION_CREATED","COMPLETED","CLOSED","CANCELLED"}:
        return complete_linked_task(source_module=Task.SourceModule.PARTNERS,source_object_id=case.pk,source_label=label)
    assignee=case.assigned_to or getattr(case.partner,"relationship_manager",None)
    if assignee is None: return None
    return sync_linked_task(source_module=Task.SourceModule.PARTNERS,source_object_id=case.pk,source_label=label,assigned_to=assignee,assigned_by=performed_by,title=f"Partner case: {case.applicant_name}",description=f"Follow up partner case {case.case_id}.",priority=Task.Priority.NORMAL)

def sync_partner_issue_task(issue, performed_by=None):
    label=f"{ISSUE_PREFIX}:{issue.pk}"
    if issue.status in {"RESOLVED","CLOSED"}:
        return complete_linked_task(source_module=Task.SourceModule.PARTNERS,source_object_id=issue.pk,source_label=label)
    assignee=issue.assigned_to or getattr(issue.partner,"relationship_manager",None)
    if assignee is None: return None
    return sync_linked_task(source_module=Task.SourceModule.PARTNERS,source_object_id=issue.pk,source_label=label,assigned_to=assignee,assigned_by=performed_by,title=f"Partner issue: {issue.subject}",description=issue.description,priority=Task.Priority.HIGH)

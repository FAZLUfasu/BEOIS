from .models import Notification, Task


def create_notification(
    *,
    recipient,
    title,
    message="",
    notification_type=Notification.Type.INFO,
    task=None,
    source_module=Task.SourceModule.GENERAL,
    source_object_id="",
    action_url="",
):
    """
    Central notification creation service.

    Existing BEOIS modules should use this function instead of
    creating Notification objects directly.
    """

    if recipient is None:
        return None

    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        task=task,
        source_module=source_module,
        source_object_id=str(source_object_id or ""),
        action_url=action_url,
    )


def notify_task_assigned(task):
    """
    Notify the employee when a task is assigned/reassigned.
    """

    if not task.assigned_to_id:
        return None

    return create_notification(
        recipient=task.assigned_to,
        notification_type=Notification.Type.TASK,
        title="New task assigned",
        message=task.title,
        task=task,
        source_module=task.source_module,
        source_object_id=task.source_object_id,
        action_url=f"/tasks?task={task.id}",
    )


def notify_task_completed(task):
    """
    Notify the assigning user when an employee completes a task.
    """

    if not task.assigned_by_id:
        return None

    # Avoid sending a notification back to the same user.
    if task.assigned_by_id == task.assigned_to_id:
        return None

    return create_notification(
        recipient=task.assigned_by,
        notification_type=Notification.Type.SUCCESS,
        title="Task completed",
        message=(
            f"{task.assigned_to} completed: {task.title}"
        ),
        task=task,
        source_module=task.source_module,
        source_object_id=task.source_object_id,
        action_url=f"/tasks?task={task.id}",
    )
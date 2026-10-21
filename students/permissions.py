from rest_framework.permissions import BasePermission


ACTION_PERMISSIONS = {
    "list": "students.view_student",
    "retrieve": "students.view_student",
    "active_students": "students.view_student",
    "completed_admissions": "students.view_student",
    "create_from_admission": "students.add_student",
    "note": "students.add_studentactivity",
    "initialize_processes_action": "students.add_studentprocess",
    "process_status": "students.change_studentprocess",
    "verify_document": "students.change_studentdocument",
    "progress": "students.change_student",
    "complete_course": "students.change_student",
    "activities": "students.view_studentactivity",
    "process_queue": "students.view_studentprocess",
    "pending_processes": "students.view_studentprocess",
    "overdue_processes": "students.view_studentprocess",
}


class CanAccessStudents(BasePermission):
    message = "You do not have the required Students permission."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        if user.is_superuser:
            return True

        action = getattr(view, "action", None)

        # Direct POST to the collection is unsupported.
        # DRF resolves it without a valid viewset action.
        # Let DRF return 405 rather than masking it with 403.
        if (
            action is None
            and request.method == "POST"
            and not getattr(view, "detail", False)
        ):
            return True

        if action == "processes":
            required = (
                "students.view_studentprocess"
                if request.method == "GET"
                else "students.add_studentprocess"
            )
        elif action == "documents":
            required = (
                "students.view_studentdocument"
                if request.method == "GET"
                else "students.add_studentdocument"
            )
        else:
            required = ACTION_PERMISSIONS.get(action)

        if required is None:
            return False

        return user.has_role_permission(required)


class CanManageStudents(CanAccessStudents):
    """
    Compatibility alias for existing view imports.

    Action-specific authorization is performed by CanAccessStudents.
    """

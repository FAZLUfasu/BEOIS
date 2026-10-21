from django.contrib.auth.models import Permission
from rest_framework import status

from .test_api import StudentsAPITests


class StudentsDynamicRBACTests(StudentsAPITests):
    """Test dynamic grants and revocation using existing fixtures."""

    def test_permission_revocation_blocks_student_list(self):
        self.authenticate(self.education_user)

        before = self.client.get("/api/students/")
        self.assertEqual(before.status_code, status.HTTP_200_OK)

        self.education_role.permissions.clear()

        after = self.client.get("/api/students/")
        self.assertEqual(
            after.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_view_only_role_cannot_change_student_progress(self):
        view_permission = Permission.objects.get(
            content_type__app_label="students",
            codename="view_student",
        )

        self.education_role.permissions.set([view_permission])
        self.authenticate(self.education_user)

        listing = self.client.get("/api/students/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)

        response = self.client.post(
            f"/api/students/{self.student.id}/progress/",
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_arbitrary_role_can_access_students_when_granted_permission(self):
        from accounts.models import Role, UserRole

        custom_role = Role.objects.create(
            name="Academic Coordinator RBAC Test",
            code="ACADEMIC_COORDINATOR_RBAC_TEST",
        )

        permission = Permission.objects.get(
            content_type__app_label="students",
            codename="view_student",
        )

        custom_role.permissions.add(permission)

        assignment = UserRole.objects.get(
            user=self.education_user,
            role=self.education_role,
        )

        assignment.role = custom_role
        assignment.save(update_fields=["role"])

        self.authenticate(self.education_user)

        response = self.client.get("/api/students/")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

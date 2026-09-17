from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role, UserRole
from admissions.models import (
    Admission,
    Institution,
    Program,
)
from hr.models import Employee
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)

from students.models import (
    Student,
    StudentActivity,
    StudentDocument,
    StudentProcess,
)
from students.services import (
    create_student_from_admission,
    initialize_student_processes,
)


User = get_user_model()


class StudentsAPITests(APITestCase):

    def setUp(self):

        # ========================================================
        # ORGANIZATION
        # ========================================================

        self.trust = Trust.objects.create(
            name="BEOIS Students API Test Trust",
        )

        self.business_unit = BusinessUnit.objects.create(
            trust=self.trust,
            name="BEST Students Test Unit",
        )

        self.branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="Students Head Office",
            code="STU-HO",
        )

        self.other_branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="Students Other Branch",
            code="STU-OTHER",
        )

        self.education_department = Department.objects.create(
            branch=None,
            name="Education Process Management",
        )

        self.other_department = Department.objects.create(
            branch=None,
            name="Students Test Other Department",
        )

        # ========================================================
        # ROLES
        # ========================================================

        self.education_role = Role.objects.create(
            name="Students Test Education Process",
            code="EDUCATION_PROCESS",
        )

        self.hod_role = Role.objects.create(
            name="Students Test Department Head",
            code="DEPARTMENT_HEAD",
        )

        # ========================================================
        # USERS
        # ========================================================

        self.education_user = User.objects.create_user(
            username="students_education_user",
            email="students.education@example.com",
            password="TestPassword123!",
        )

        self.education_hod = User.objects.create_user(
            username="students_education_hod",
            email="students.hod@example.com",
            password="TestPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="students_other_user",
            email="students.other@example.com",
            password="TestPassword123!",
        )

        self.superuser = User.objects.create_superuser(
            username="students_superuser",
            email="students.superuser@example.com",
            password="TestPassword123!",
        )

        # ========================================================
        # EMPLOYEES
        # ========================================================

        self.education_employee = Employee.objects.create(
            user=self.education_user,
            branch=self.branch,
            department=self.education_department,
            employment_status="ACTIVE",
        )

        self.hod_employee = Employee.objects.create(
            user=self.education_hod,
            branch=self.branch,
            department=self.education_department,
            employment_status="ACTIVE",
        )

        self.other_employee = Employee.objects.create(
            user=self.other_user,
            branch=self.other_branch,
            department=self.other_department,
            employment_status="ACTIVE",
        )

        # ========================================================
        # ROLE SCOPES
        # ========================================================

        UserRole.objects.create(
            user=self.education_user,
            role=self.education_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        UserRole.objects.create(
            user=self.education_hod,
            role=self.hod_role,
            scope_type=UserRole.ScopeType.DEPARTMENT,
            department=self.education_department,
        )

        UserRole.objects.create(
            user=self.other_user,
            role=self.education_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # INSTITUTION / PROGRAM
        # ========================================================

        self.institution = Institution.objects.create(
            name="Students Test University",
            short_name="STU",
            code="STU-TEST",
            is_active=True,
        )

        self.program = Program.objects.create(
            institution=self.institution,
            name="Bachelor of Commerce",
            code="BCOM-STU",
            level=Program.Level.UG,
            duration_years=3,
            duration_semesters=6,
            is_credit_transfer_available=True,
            is_active=True,
        )

        # ========================================================
        # COMPLETED ADMISSIONS
        # ========================================================

        self.completed_admission = Admission.objects.create(
            applicant_name="Student API One",
            phone_number="9100000101",
            email="student1@example.com",
            institution=self.institution,
            program=self.program,
            academic_session="2026-2029",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            enrollment_number="ENR-STU-001",
            university_admission_number="UNI-STU-001",
            status=Admission.Status.COMPLETED,
            assigned_to=self.education_user,
            created_by=self.superuser,
        )

        self.second_completed_admission = Admission.objects.create(
            applicant_name="Student API Two",
            phone_number="9100000102",
            email="student2@example.com",
            institution=self.institution,
            program=self.program,
            academic_session="2026-2029",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            enrollment_number="ENR-STU-002",
            university_admission_number="UNI-STU-002",
            status=Admission.Status.COMPLETED,
            assigned_to=self.other_user,
            created_by=self.superuser,
        )

        self.incomplete_admission = Admission.objects.create(
            applicant_name="Incomplete Admission",
            phone_number="9100000103",
            institution=self.institution,
            program=self.program,
            academic_session="2026-2029",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            enrollment_number="ENR-STU-003",
            status=Admission.Status.ENROLLMENT_PENDING,
            assigned_to=self.education_user,
            created_by=self.superuser,
        )

        # ========================================================
        # EXISTING STUDENTS
        # ========================================================

        self.student = create_student_from_admission(
            admission=self.completed_admission,
            created_by=self.superuser,
            assigned_coordinator=self.education_user,
        )

        self.other_student = create_student_from_admission(
            admission=self.second_completed_admission,
            created_by=self.superuser,
            assigned_coordinator=self.other_user,
        )

    # ============================================================
    # AUTH HELPER
    # ============================================================

    def authenticate(self, user):
        token = AccessToken.for_user(user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

    # ============================================================
    # SECURITY / SCOPE
    # ============================================================

    def test_anonymous_user_cannot_access_students(self):
        response = self.client.get(
            "/api/students/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_invalid_jwt_is_rejected(self):
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer invalid-token"
        )

        response = self.client.get(
            "/api/students/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_jwt_authentication_works(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            "/api/students/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_own_scope_user_sees_only_own_student(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            "/api/students/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertIn(
            str(self.student.id),
            ids,
        )

        self.assertNotIn(
            str(self.other_student.id),
            ids,
        )

    def test_own_scope_user_cannot_retrieve_other_student(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            f"/api/students/{self.other_student.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_superuser_sees_all_students(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            "/api/students/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertIn(
            str(self.student.id),
            ids,
        )

        self.assertIn(
            str(self.other_student.id),
            ids,
        )

    # ============================================================
    # ADMISSION -> STUDENT
    # ============================================================

    def test_direct_student_creation_endpoint_is_not_allowed(self):
        """
        Students must only be created through a completed Admission.

        POST /api/students/ must never allow direct Student creation.
        """

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            "/api/students/",
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_completed_admission_can_create_student(self):

        admission = Admission.objects.create(
            applicant_name="New Completed Admission",
            phone_number="9100000104",
            institution=self.institution,
            program=self.program,
            academic_session="2026-2029",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            enrollment_number="ENR-STU-004",
            status=Admission.Status.COMPLETED,
            assigned_to=self.education_user,
            created_by=self.superuser,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            "/api/students/create-from-admission/",
            {
                "admission_id": str(admission.id),
                "assigned_coordinator_id": str(
                    self.education_user.id
                ),
                "initialize_processes": True,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        student = Student.objects.get(
            admission=admission
        )

        self.assertEqual(
            student.assigned_coordinator,
            self.education_user,
        )

        self.assertEqual(
            student.processes.count(),
            6,
        )

    def test_incomplete_admission_cannot_create_student(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            "/api/students/create-from-admission/",
            {
                "admission_id": str(
                    self.incomplete_admission.id
                ),
                "assigned_coordinator_id": str(
                    self.education_user.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_duplicate_student_creation_is_rejected(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            "/api/students/create-from-admission/",
            {
                "admission_id": str(
                    self.completed_admission.id
                ),
                "assigned_coordinator_id": str(
                    self.education_user.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_hod_cannot_assign_student_outside_department_scope(self):

        admission = Admission.objects.create(
            applicant_name="Scope Test Admission",
            phone_number="9100000105",
            institution=self.institution,
            program=self.program,
            academic_session="2026-2029",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            enrollment_number="ENR-STU-005",
            status=Admission.Status.COMPLETED,
            created_by=self.superuser,
        )

        self.authenticate(
            self.education_hod
        )

        response = self.client.post(
            "/api/students/create-from-admission/",
            {
                "admission_id": str(admission.id),
                "assigned_coordinator_id": str(
                    self.other_user.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ============================================================
    # PROCESS INITIALIZATION
    # ============================================================

    def test_standard_processes_can_be_initialized(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/"
                f"{self.student.id}/"
                f"initialize-processes/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.student.processes.count(),
            6,
        )

    def test_process_initialization_is_idempotent(self):
        initialize_student_processes(
            student=self.student,
            assigned_to=self.education_user,
            performed_by=self.superuser,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/"
                f"{self.student.id}/"
                f"initialize-processes/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.json()["created_count"],
            0,
        )

        self.assertEqual(
            self.student.processes.count(),
            6,
        )

    # ============================================================
    # PROCESS CREATION / STATUS
    # ============================================================

    def test_custom_process_can_be_created(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            f"/api/students/{self.student.id}/processes/",
            {
                "process_type": "EXAM",
                "title": "Semester 1 Examination",
                "academic_year": 1,
                "semester": 1,
                "assigned_to_id": str(
                    self.education_user.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            StudentProcess.objects.filter(
                student=self.student,
                title="Semester 1 Examination",
            ).exists()
        )

    def test_process_status_can_be_changed(self):

        process = StudentProcess.objects.create(
            student=self.student,
            process_type=StudentProcess.ProcessType.EXAM,
            title="Status Test Exam",
            academic_year=1,
            semester=1,
            assigned_to=self.education_user,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/{self.student.id}/"
                f"processes/{process.id}/status/"
            ),
            {
                "status": StudentProcess.Status.IN_PROGRESS,
                "notes": "Exam preparation started.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        process.refresh_from_db()

        self.assertEqual(
            process.status,
            StudentProcess.Status.IN_PROGRESS,
        )

    def test_completed_process_sets_completed_at(self):

        process = StudentProcess.objects.create(
            student=self.student,
            process_type=StudentProcess.ProcessType.PROJECT,
            academic_year=1,
            semester=1,
            assigned_to=self.education_user,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/{self.student.id}/"
                f"processes/{process.id}/status/"
            ),
            {
                "status": StudentProcess.Status.COMPLETED,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        process.refresh_from_db()

        self.assertIsNotNone(
            process.completed_at
        )

    # ============================================================
    # NOTES / ACTIVITY
    # ============================================================

    def test_student_note_creates_activity(self):
        self.authenticate(
            self.education_user
        )

        before = self.student.activities.count()

        response = self.client.post(
            f"/api/students/{self.student.id}/note/",
            {
                "description":
                    "Student contacted regarding examination.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            self.student.activities.count(),
            before + 1,
        )

    def test_empty_student_note_is_rejected(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            f"/api/students/{self.student.id}/note/",
            {
                "description": "   ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_activity_timeline_is_available(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            f"/api/students/{self.student.id}/activities/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertGreaterEqual(
            len(response.json()),
            1,
        )

    # ============================================================
    # DOCUMENTS
    # ============================================================

    def test_student_document_can_be_added(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            f"/api/students/{self.student.id}/documents/",
            {
                "document_type":
                    StudentDocument.DocumentType.HALL_TICKET,
                "title": "Semester 1 Hall Ticket",
                "reference_number": "HT-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            StudentDocument.objects.filter(
                student=self.student,
                reference_number="HT-001",
            ).exists()
        )

    def test_student_document_can_be_verified(self):

        document = StudentDocument.objects.create(
            student=self.student,
            document_type=(
                StudentDocument.DocumentType.RESULT
            ),
            title="Semester Result",
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/{self.student.id}/"
                f"documents/{document.id}/verify/"
            ),
            {
                "notes": "Result verified.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        document.refresh_from_db()

        self.assertTrue(
            document.verified
        )

        self.assertEqual(
            document.verified_by,
            self.education_user,
        )

    # ============================================================
    # ACADEMIC PROGRESS
    # ============================================================

    def test_student_progress_can_be_updated(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            f"/api/students/{self.student.id}/progress/",
            {
                "current_year": 2,
                "current_semester": 3,
                "notes": "Promoted to next academic stage.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.student.refresh_from_db()

        self.assertEqual(
            self.student.current_year,
            2,
        )

        self.assertEqual(
            self.student.current_semester,
            3,
        )

    def test_student_progress_cannot_exceed_program_duration(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            f"/api/students/{self.student.id}/progress/",
            {
                "current_semester": 7,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # COURSE COMPLETION
    # ============================================================

    def test_course_cannot_complete_with_pending_processes(self):

        StudentProcess.objects.create(
            student=self.student,
            process_type=StudentProcess.ProcessType.EXAM,
            academic_year=1,
            semester=1,
            status=StudentProcess.Status.PENDING,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/"
                f"{self.student.id}/complete-course/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.student.refresh_from_db()

        self.assertNotEqual(
            self.student.status,
            Student.Status.COMPLETED,
        )

    def test_course_can_complete_when_all_processes_finished(self):

        initialize_student_processes(
            student=self.student,
            assigned_to=self.education_user,
            performed_by=self.superuser,
        )

        self.student.processes.update(
            status=StudentProcess.Status.COMPLETED,
            completed_at=timezone.now(),
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.post(
            (
                f"/api/students/"
                f"{self.student.id}/complete-course/"
            ),
            {
                "notes": "All academic requirements completed.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.student.refresh_from_db()

        self.assertEqual(
            self.student.status,
            Student.Status.COMPLETED,
        )

        self.assertIsNotNone(
            self.student.course_completed_at
        )

    # ============================================================
    # QUEUES
    # ============================================================

    def test_active_students_queue(self):
        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            "/api/students/active/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertIn(
            str(self.student.id),
            ids,
        )

    def test_pending_processes_queue(self):

        StudentProcess.objects.create(
            student=self.student,
            process_type=StudentProcess.ProcessType.EXAM,
            title="Pending Queue Exam",
            academic_year=1,
            semester=1,
            status=StudentProcess.Status.PENDING,
            assigned_to=self.education_user,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            "/api/students/pending-processes/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        titles = {
            item["title"]
            for item in response.json()
        }

        self.assertIn(
            "Pending Queue Exam",
            titles,
        )

    def test_overdue_processes_queue(self):

        StudentProcess.objects.create(
            student=self.student,
            process_type=StudentProcess.ProcessType.PROJECT,
            title="Overdue Project",
            academic_year=1,
            semester=1,
            status=StudentProcess.Status.IN_PROGRESS,
            due_date=(
                timezone.localdate()
                - timedelta(days=1)
            ),
            assigned_to=self.education_user,
        )

        self.authenticate(
            self.education_user
        )

        response = self.client.get(
            "/api/students/overdue-processes/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        titles = {
            item["title"]
            for item in response.json()
        }

        self.assertIn(
            "Overdue Project",
            titles,
        )
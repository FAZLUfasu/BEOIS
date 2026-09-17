from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role, UserRole

from hr.models import (
    Attendance,
    Employee,
    EmployeeLeaveBalance,
    EmployeeSalaryComponent,
    EmployeeSalaryStructure,
    HRActivity,
    LeaveRequest,
    LeaveType,
    Payroll,
    PayrollActivity,
    PayrollComponent,
    PayrollPeriod,
    SalaryAdvance,
    SalaryComponent,
)

from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)


User = get_user_model()


class HRAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):

        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="BEOIS HR API Test Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST HR Test Unit",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="HR Head Office",
            code="HR-TEST-HO",
        )

        cls.other_branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="HR Other Branch",
            code="HR-TEST-OTHER",
        )

        cls.hr_department = Department.objects.create(
            branch=None,
            name="HR Test Department",
        )

        cls.finance_department = Department.objects.create(
            branch=None,
            name="Finance Test Department",
        )

        cls.operations_department = Department.objects.create(
            branch=None,
            name="Operations Test Department",
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.hr_role = Role.objects.create(
            name="HR API Test Role",
            code="HR",
        )

        cls.finance_role = Role.objects.create(
            name="Finance API Test Role",
            code="FINANCE",
        )

        cls.staff_role = Role.objects.create(
            name="Staff API Test Role",
            code="STAFF",
        )

        # ========================================================
        # HR USER
        # ========================================================

        cls.hr_user = User.objects.create_user(
            username="hr_api_user",
            email="hr.api@test.local",
            password="TestPassword123!",
            first_name="HR",
            last_name="Manager",
        )

        cls.hr_employee = Employee.objects.create(
            user=cls.hr_user,
            branch=cls.branch,
            department=cls.hr_department,
            employment_status=Employee.EmploymentStatus.ACTIVE,
            designation="HR Manager",
        )

        UserRole.objects.create(
            user=cls.hr_user,
            role=cls.hr_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        # ========================================================
        # FINANCE USER
        # ========================================================

        cls.finance_user = User.objects.create_user(
            username="finance_api_user",
            email="finance.api@test.local",
            password="TestPassword123!",
            first_name="Finance",
            last_name="Manager",
        )

        cls.finance_employee = Employee.objects.create(
            user=cls.finance_user,
            branch=cls.branch,
            department=cls.finance_department,
            employment_status=Employee.EmploymentStatus.ACTIVE,
            designation="Finance Manager",
        )

        UserRole.objects.create(
            user=cls.finance_user,
            role=cls.finance_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        # ========================================================
        # ORDINARY STAFF USER
        # ========================================================

        cls.staff_user = User.objects.create_user(
            username="staff_api_user",
            email="staff.api@test.local",
            password="TestPassword123!",
            first_name="Test",
            last_name="Employee",
        )

        cls.staff_employee = Employee.objects.create(
            user=cls.staff_user,
            branch=cls.branch,
            department=cls.operations_department,
            employment_status=Employee.EmploymentStatus.ACTIVE,
            designation="Operations Executive",
            date_of_joining=date(2026, 1, 1),
        )

        UserRole.objects.create(
            user=cls.staff_user,
            role=cls.staff_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # SECOND STAFF USER
        # ========================================================

        cls.other_staff_user = User.objects.create_user(
            username="other_staff_api_user",
            email="other.staff.api@test.local",
            password="TestPassword123!",
            first_name="Other",
            last_name="Employee",
        )

        cls.other_staff_employee = Employee.objects.create(
            user=cls.other_staff_user,
            branch=cls.other_branch,
            department=cls.operations_department,
            employment_status=Employee.EmploymentStatus.ACTIVE,
            designation="Other Executive",
        )

        UserRole.objects.create(
            user=cls.other_staff_user,
            role=cls.staff_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # SUPERUSER
        # ========================================================

        cls.superuser = User.objects.create_superuser(
            username="hr_api_superuser",
            email="hr.superuser@test.local",
            password="TestPassword123!",
        )

        # ========================================================
        # LEAVE TYPE
        # ========================================================

        cls.casual_leave = LeaveType.objects.create(
            name="Casual Leave Test",
            code="CL-TEST",
            default_days_per_year=Decimal("12.00"),
            is_paid=True,
            carry_forward_allowed=False,
            maximum_carry_forward=Decimal("0.00"),
            requires_approval=True,
            is_active=True,
        )

        cls.unpaid_leave = LeaveType.objects.create(
            name="Unpaid Leave Test",
            code="UL-TEST",
            default_days_per_year=Decimal("0.00"),
            is_paid=False,
            requires_approval=True,
            is_active=True,
        )

        # ========================================================
        # LEAVE BALANCE
        # ========================================================

        cls.leave_balance = EmployeeLeaveBalance.objects.create(
            employee=cls.staff_employee,
            leave_type=cls.casual_leave,
            year=2026,
            opening_balance=Decimal("0.00"),
            allocated_days=Decimal("12.00"),
            used_days=Decimal("0.00"),
            adjusted_days=Decimal("0.00"),
        )

        # ========================================================
        # SALARY COMPONENT MASTER
        # ========================================================

        cls.hra_component = SalaryComponent.objects.create(
            name="House Rent Allowance Test",
            code="HRA-TEST",
            component_type=SalaryComponent.ComponentType.EARNING,
            calculation_type=SalaryComponent.CalculationType.FIXED,
            is_taxable=False,
            affects_gross_salary=True,
            is_active=True,
        )

        cls.pf_component = SalaryComponent.objects.create(
            name="Provident Fund Test",
            code="PF-TEST",
            component_type=SalaryComponent.ComponentType.DEDUCTION,
            calculation_type=SalaryComponent.CalculationType.FIXED,
            is_taxable=False,
            affects_gross_salary=True,
            is_active=True,
        )

        # ========================================================
        # SALARY STRUCTURE
        # ========================================================

        cls.salary_structure = (
            EmployeeSalaryStructure.objects.create(
                employee=cls.staff_employee,
                name="HR API Test Salary",
                effective_from=date(2026, 1, 1),
                base_salary=Decimal("30000.00"),
                is_active=True,
                created_by=cls.hr_user,
            )
        )

        EmployeeSalaryComponent.objects.create(
            salary_structure=cls.salary_structure,
            component=cls.hra_component,
            amount=Decimal("5000.00"),
            percentage=Decimal("0"),
            is_active=True,
        )

        EmployeeSalaryComponent.objects.create(
            salary_structure=cls.salary_structure,
            component=cls.pf_component,
            amount=Decimal("2000.00"),
            percentage=Decimal("0"),
            is_active=True,
        )

        # ========================================================
        # PAYROLL PERIOD
        # ========================================================

        cls.payroll_period = PayrollPeriod.objects.create(
            year=2026,
            month=9,
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 30),
            status=PayrollPeriod.Status.OPEN,
            created_by=cls.hr_user,
        )

        # ========================================================
        # SALARY ADVANCES
        # ========================================================

        cls.requested_advance = SalaryAdvance.objects.create(
            employee=cls.staff_employee,
            requested_amount=Decimal("10000.00"),
            approved_amount=Decimal("0.00"),
            recovered_amount=Decimal("0.00"),
            monthly_recovery_amount=Decimal("0.00"),
            reason="Requested advance test",
            status=SalaryAdvance.Status.REQUESTED,
            requested_by=cls.staff_user,
        )

        cls.approved_advance = SalaryAdvance.objects.create(
            employee=cls.staff_employee,
            requested_amount=Decimal("8000.00"),
            approved_amount=Decimal("8000.00"),
            recovered_amount=Decimal("0.00"),
            monthly_recovery_amount=Decimal("2000.00"),
            reason="Approved advance test",
            status=SalaryAdvance.Status.APPROVED,
            requested_by=cls.staff_user,
            approved_by=cls.hr_user,
            approved_at=timezone.now(),
        )

        cls.disbursed_advance = SalaryAdvance.objects.create(
            employee=cls.staff_employee,
            requested_amount=Decimal("10000.00"),
            approved_amount=Decimal("10000.00"),
            recovered_amount=Decimal("0.00"),
            monthly_recovery_amount=Decimal("2000.00"),
            reason="Disbursed advance test",
            status=SalaryAdvance.Status.DISBURSED,
            requested_by=cls.staff_user,
            approved_by=cls.hr_user,
            approved_at=timezone.now(),
            disbursed_at=timezone.now(),
            payment_reference="ADV-TEST-001",
        )

    # ============================================================
    # AUTH HELPERS
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user
        )

    def jwt_authenticate(self, user):
        token = AccessToken.for_user(user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(token)}"
        )

    def aware_datetime(
        self,
        year,
        month,
        day,
        hour,
        minute=0,
    ):
        value = datetime(
            year,
            month,
            day,
            hour,
            minute,
        )

        return timezone.make_aware(
            value,
            timezone.get_current_timezone(),
        )

    # ============================================================
    # AUTHENTICATION
    # ============================================================

    def test_anonymous_user_cannot_access_employees(self):

        response = self.client.get(
            "/api/hr/employees/"
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_invalid_jwt_is_rejected(self):

        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer invalid-token"
        )

        response = self.client.get(
            "/api/hr/employees/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_jwt_authentication_works(self):

        self.jwt_authenticate(
            self.staff_user
        )

        response = self.client.get(
            "/api/hr/employees/me/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["employee_id"],
            self.staff_employee.employee_id,
        )

    # ============================================================
    # EMPLOYEE SCOPE
    # ============================================================

    def test_own_scope_employee_sees_only_self(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.get(
            "/api/hr/employees/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(self.staff_employee.id),
            ids,
        )

        self.assertNotIn(
            str(self.other_staff_employee.id),
            ids,
        )

    def test_own_scope_employee_cannot_retrieve_other_employee(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.get(
            (
                f"/api/hr/employees/"
                f"{self.other_staff_employee.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_hr_organization_scope_sees_all_employees(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            "/api/hr/employees/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(self.staff_employee.id),
            ids,
        )

        self.assertIn(
            str(self.other_staff_employee.id),
            ids,
        )

    def test_superuser_sees_all_employees(self):

        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            "/api/hr/employees/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertGreaterEqual(
            len(response.data),
            4,
        )

    def test_staff_cannot_create_employee(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/employees/",
            {
                "branch": str(self.branch.id),
                "department": str(
                    self.operations_department.id
                ),
                "employment_status": "ACTIVE",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ============================================================
    # DESIGNATIONS
    # ============================================================

    def test_hr_can_create_designation(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            "/api/hr/designations/",
            {
                "name": "HR Test Executive",
                "code": "HR-EXEC-TEST",
                "description": "Test designation",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_staff_cannot_create_designation(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/designations/",
            {
                "name": "Unauthorized Designation",
                "code": "UNAUTH-DESIG",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ============================================================
    # ATTENDANCE
    # ============================================================

    def test_employee_can_check_in_self(self):

        self.authenticate(
            self.staff_user
        )

        check_in = self.aware_datetime(
            2026,
            9,
            17,
            9,
            15,
        )

        response = self.client.post(
            "/api/hr/attendance/check-in/",
            {
                "check_in_time": (
                    check_in.isoformat()
                ),
                "remarks": "API check-in",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            Attendance.objects.filter(
                employee=self.staff_employee,
                date=date(2026, 9, 17),
            ).exists()
        )

    def test_employee_cannot_check_in_other_employee(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/attendance/check-in/",
            {
                "employee": str(
                    self.other_staff_employee.id
                ),
                "check_in_time": (
                    self.aware_datetime(
                        2026,
                        9,
                        17,
                        9,
                        0,
                    ).isoformat()
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_employee_can_check_out_after_check_in(self):

        Attendance.objects.create(
            employee=self.staff_employee,
            date=date(2026, 9, 18),
            status=Attendance.Status.PRESENT,
            check_in=self.aware_datetime(
                2026,
                9,
                18,
                9,
                0,
            ),
        )

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/attendance/check-out/",
            {
                "check_out_time": (
                    self.aware_datetime(
                        2026,
                        9,
                        18,
                        17,
                        30,
                    ).isoformat()
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        attendance = Attendance.objects.get(
            employee=self.staff_employee,
            date=date(2026, 9, 18),
        )

        self.assertIsNotNone(
            attendance.check_out
        )

        self.assertGreater(
            attendance.working_minutes,
            0,
        )

    def test_check_out_without_check_in_is_rejected(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/attendance/check-out/",
            {
                "check_out_time": (
                    self.aware_datetime(
                        2026,
                        9,
                        19,
                        17,
                        0,
                    ).isoformat()
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_hr_can_mark_attendance_manually(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            "/api/hr/attendance/mark/",
            {
                "employee": str(
                    self.staff_employee.id
                ),
                "date": "2026-09-20",
                "status": "PRESENT",
                "remarks": "Manual attendance test",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            Attendance.objects.filter(
                employee=self.staff_employee,
                date=date(2026, 9, 20),
                status=Attendance.Status.PRESENT,
            ).exists()
        )

    def test_staff_cannot_mark_attendance_manually(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/attendance/mark/",
            {
                "employee": str(
                    self.staff_employee.id
                ),
                "date": "2026-09-20",
                "status": "PRESENT",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_can_adjust_attendance(self):

        attendance = Attendance.objects.create(
            employee=self.staff_employee,
            date=date(2026, 9, 21),
            status=Attendance.Status.ABSENT,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/attendance/"
                f"{attendance.id}/adjust/"
            ),
            {
                "status": "PRESENT",
                "remarks": "Corrected by HR",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        attendance.refresh_from_db()

        self.assertEqual(
            attendance.status,
            Attendance.Status.PRESENT,
        )

        self.assertTrue(
            attendance.is_manually_adjusted
        )

    def test_missing_attendance_queue(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            "/api/hr/attendance/missing/"
            "?date=2026-09-22"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(self.staff_employee.id),
            ids,
        )

    def test_attendance_summary(self):

        Attendance.objects.create(
            employee=self.staff_employee,
            date=date(2026, 9, 23),
            status=Attendance.Status.PRESENT,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            "/api/hr/attendance/summary/"
            "?date=2026-09-23"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["present"],
            1,
        )

    # ============================================================
    # LEAVE
    # ============================================================

    def test_employee_can_apply_leave(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/leave-requests/apply/",
            {
                "leave_type": str(
                    self.casual_leave.id
                ),
                "start_date": "2026-10-01",
                "end_date": "2026-10-02",
                "day_type": "FULL_DAY",
                "reason": "Personal work",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        leave_request = LeaveRequest.objects.get(
            employee=self.staff_employee,
            start_date=date(2026, 10, 1),
        )

        self.assertEqual(
            leave_request.status,
            LeaveRequest.Status.PENDING,
        )

        self.assertEqual(
            leave_request.requested_days,
            Decimal("2.00"),
        )

    def test_employee_cannot_apply_leave_for_other_employee(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/leave-requests/apply/",
            {
                "employee": str(
                    self.other_staff_employee.id
                ),
                "leave_type": str(
                    self.casual_leave.id
                ),
                "start_date": "2026-10-03",
                "end_date": "2026-10-03",
                "reason": "Unauthorized request",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_can_approve_leave(self):

        leave_request = LeaveRequest.objects.create(
            employee=self.staff_employee,
            leave_type=self.casual_leave,
            start_date=date(2026, 10, 5),
            end_date=date(2026, 10, 5),
            requested_days=Decimal("1.00"),
            reason="Approval test",
            status=LeaveRequest.Status.PENDING,
            applied_by=self.staff_user,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/leave-requests/"
                f"{leave_request.id}/approve/"
            ),
            {
                "notes": "Approved by HR",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        leave_request.refresh_from_db()
        self.leave_balance.refresh_from_db()

        self.assertEqual(
            leave_request.status,
            LeaveRequest.Status.APPROVED,
        )

        self.assertEqual(
            self.leave_balance.used_days,
            Decimal("1.00"),
        )

        self.assertTrue(
            Attendance.objects.filter(
                employee=self.staff_employee,
                date=date(2026, 10, 5),
                status=Attendance.Status.ON_LEAVE,
            ).exists()
        )

    def test_staff_cannot_approve_leave(self):

        leave_request = LeaveRequest.objects.create(
            employee=self.staff_employee,
            leave_type=self.casual_leave,
            start_date=date(2026, 10, 6),
            end_date=date(2026, 10, 6),
            requested_days=Decimal("1.00"),
            reason="Unauthorized approval",
            status=LeaveRequest.Status.PENDING,
            applied_by=self.staff_user,
        )

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            (
                f"/api/hr/leave-requests/"
                f"{leave_request.id}/approve/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_can_reject_leave(self):

        leave_request = LeaveRequest.objects.create(
            employee=self.staff_employee,
            leave_type=self.casual_leave,
            start_date=date(2026, 10, 7),
            end_date=date(2026, 10, 7),
            requested_days=Decimal("1.00"),
            reason="Reject test",
            status=LeaveRequest.Status.PENDING,
            applied_by=self.staff_user,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/leave-requests/"
                f"{leave_request.id}/reject/"
            ),
            {
                "reason": "Business requirement",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        leave_request.refresh_from_db()

        self.assertEqual(
            leave_request.status,
            LeaveRequest.Status.REJECTED,
        )

    def test_employee_can_cancel_own_pending_leave(self):

        leave_request = LeaveRequest.objects.create(
            employee=self.staff_employee,
            leave_type=self.casual_leave,
            start_date=date(2026, 10, 8),
            end_date=date(2026, 10, 8),
            requested_days=Decimal("1.00"),
            reason="Cancel test",
            status=LeaveRequest.Status.PENDING,
            applied_by=self.staff_user,
        )

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            (
                f"/api/hr/leave-requests/"
                f"{leave_request.id}/cancel/"
            ),
            {
                "reason": "Plans changed",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        leave_request.refresh_from_db()

        self.assertEqual(
            leave_request.status,
            LeaveRequest.Status.CANCELLED,
        )

    def test_hr_can_adjust_leave_balance(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            "/api/hr/leave-balances/adjust/",
            {
                "employee": str(
                    self.staff_employee.id
                ),
                "leave_type": str(
                    self.casual_leave.id
                ),
                "year": 2026,
                "adjustment": "2.00",
                "reason": "Special allocation",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.leave_balance.refresh_from_db()

        self.assertEqual(
            self.leave_balance.adjusted_days,
            Decimal("2.00"),
        )

    def test_pending_leave_queue(self):

        LeaveRequest.objects.create(
            employee=self.staff_employee,
            leave_type=self.casual_leave,
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 10),
            requested_days=Decimal("1.00"),
            reason="Pending queue test",
            status=LeaveRequest.Status.PENDING,
            applied_by=self.staff_user,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            "/api/hr/leave-requests/pending/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertGreaterEqual(
            len(response.data),
            1,
        )

    # ============================================================
    # HR ACTIVITY
    # ============================================================

    def test_hr_activity_timeline_is_available(self):

        HRActivity.objects.create(
            employee=self.staff_employee,
            activity_type=HRActivity.ActivityType.NOTE,
            description="HR API activity test",
            performed_by=self.hr_user,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            (
                "/api/hr/activities/"
                f"?employee={self.staff_employee.id}"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertGreaterEqual(
            len(response.data),
            1,
        )

    # ============================================================
    # SALARY COMPONENT
    # ============================================================

    def test_hr_can_create_salary_component(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            "/api/hr/salary-components/",
            {
                "name": "Travel Allowance API Test",
                "code": "TRAVEL-API",
                "component_type": "EARNING",
                "calculation_type": "FIXED",
                "is_taxable": False,
                "affects_gross_salary": True,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_staff_cannot_access_salary_components(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.get(
            "/api/hr/salary-components/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ============================================================
    # SALARY STRUCTURE
    # ============================================================

    def test_hr_can_view_salary_structure(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            "/api/hr/salary-structures/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertGreaterEqual(
            len(response.data),
            1,
        )

    def test_staff_cannot_view_salary_structure(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.get(
            "/api/hr/salary-structures/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_can_add_component_to_salary_structure(self):

        component = SalaryComponent.objects.create(
            name="Special Allowance API Test",
            code="SPECIAL-API",
            component_type=SalaryComponent.ComponentType.EARNING,
            calculation_type=SalaryComponent.CalculationType.FIXED,
            is_active=True,
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/salary-structures/"
                f"{self.salary_structure.id}/components/"
            ),
            {
                "component": str(component.id),
                "amount": "1500.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            EmployeeSalaryComponent.objects.filter(
                salary_structure=self.salary_structure,
                component=component,
            ).exists()
        )

    # ============================================================
    # SALARY ADVANCE
    # ============================================================

    def test_employee_can_request_salary_advance(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/salary-advances/",
            {
                "amount": "5000.00",
                "reason": "Emergency requirement",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            SalaryAdvance.objects.filter(
                employee=self.staff_employee,
                requested_amount=Decimal("5000.00"),
                status=SalaryAdvance.Status.REQUESTED,
            ).exists()
        )

    def test_employee_cannot_request_advance_for_other_employee(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            "/api/hr/salary-advances/",
            {
                "employee": str(
                    self.other_staff_employee.id
                ),
                "amount": "5000.00",
                "reason": "Unauthorized",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_can_approve_salary_advance(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/salary-advances/"
                f"{self.requested_advance.id}/approve/"
            ),
            {
                "approved_amount": "8000.00",
                "monthly_recovery_amount": "2000.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.requested_advance.refresh_from_db()

        self.assertEqual(
            self.requested_advance.status,
            SalaryAdvance.Status.APPROVED,
        )

        self.assertEqual(
            self.requested_advance.approved_amount,
            Decimal("8000.00"),
        )

    def test_staff_cannot_approve_salary_advance(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.post(
            (
                f"/api/hr/salary-advances/"
                f"{self.requested_advance.id}/approve/"
            ),
            {
                "approved_amount": "8000.00",
                "monthly_recovery_amount": "2000.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_finance_can_disburse_approved_advance(self):

        self.authenticate(
            self.finance_user
        )

        response = self.client.post(
            (
                f"/api/hr/salary-advances/"
                f"{self.approved_advance.id}/disburse/"
            ),
            {
                "payment_reference": "BANK-ADV-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.approved_advance.refresh_from_db()

        self.assertEqual(
            self.approved_advance.status,
            SalaryAdvance.Status.DISBURSED,
        )

    def test_hr_cannot_disburse_salary_advance(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/salary-advances/"
                f"{self.approved_advance.id}/disburse/"
            ),
            {
                "payment_reference": "UNAUTHORIZED",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ============================================================
    # PAYROLL PERIOD
    # ============================================================

    def test_hr_can_create_payroll_period(self):

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            "/api/hr/payroll-periods/",
            {
                "year": 2026,
                "month": 10,
                "start_date": "2026-10-01",
                "end_date": "2026-10-31",
                "notes": "October payroll",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            PayrollPeriod.objects.filter(
                year=2026,
                month=10,
            ).exists()
        )

    def test_staff_cannot_access_payroll_periods(self):

        self.authenticate(
            self.staff_user
        )

        response = self.client.get(
            "/api/hr/payroll-periods/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ============================================================
    # PAYROLL HELPERS
    # ============================================================

    def create_payroll_via_api(self, user=None):

        if user is None:
            user = self.hr_user

        self.authenticate(user)

        return self.client.post(
            "/api/hr/payrolls/",
            {
                "employee": str(
                    self.staff_employee.id
                ),
                "period": str(
                    self.payroll_period.id
                ),
                "payable_days": "30.00",
                "lop_days": "0.00",
                "notes": "API payroll test",
            },
            format="json",
        )

    def create_calculated_payroll(self):

        payroll = Payroll.objects.create(
            period=self.payroll_period,
            employee=self.staff_employee,
            salary_structure=self.salary_structure,
            status=Payroll.Status.DRAFT,
            calendar_days=Decimal("30.00"),
            payable_days=Decimal("30.00"),
            lop_days=Decimal("0.00"),
            base_salary=Decimal("30000.00"),
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/calculate/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        return payroll

    # ============================================================
    # PAYROLL
    # ============================================================

    def test_hr_can_create_employee_payroll(self):

        response = self.create_payroll_via_api()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        payroll = Payroll.objects.get(
            employee=self.staff_employee,
            period=self.payroll_period,
        )

        self.assertEqual(
            payroll.status,
            Payroll.Status.DRAFT,
        )

    def test_staff_cannot_create_payroll(self):

        response = self.create_payroll_via_api(
            self.staff_user
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_payroll_can_be_calculated(self):

        payroll = self.create_calculated_payroll()

        self.assertEqual(
            payroll.status,
            Payroll.Status.CALCULATED,
        )

        self.assertEqual(
            payroll.gross_earnings,
            Decimal("35000.00"),
        )

        self.assertEqual(
            payroll.total_deductions,
            Decimal("2000.00"),
        )

        self.assertEqual(
            payroll.net_salary,
            Decimal("33000.00"),
        )

        self.assertTrue(
            payroll.components.filter(
                code="BASE"
            ).exists()
        )

    def test_payroll_incentive_updates_net_salary(self):

        payroll = self.create_calculated_payroll()

        old_net = payroll.net_salary

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/incentive/"
            ),
            {
                "amount": "3000.00",
                "name": "Performance Incentive",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        self.assertEqual(
            payroll.net_salary,
            old_net + Decimal("3000.00"),
        )

    def test_payroll_bonus_updates_net_salary(self):

        payroll = self.create_calculated_payroll()

        old_net = payroll.net_salary

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/bonus/"
            ),
            {
                "amount": "2000.00",
                "name": "Festival Bonus",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        self.assertEqual(
            payroll.net_salary,
            old_net + Decimal("2000.00"),
        )

    def test_payroll_deduction_reduces_net_salary(self):

        payroll = self.create_calculated_payroll()

        old_net = payroll.net_salary

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/deduction/"
            ),
            {
                "amount": "1000.00",
                "name": "Other Deduction",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        self.assertEqual(
            payroll.net_salary,
            old_net - Decimal("1000.00"),
        )

    def test_advance_recovery_can_be_added_to_payroll(self):

        payroll = self.create_calculated_payroll()

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/advance-recovery/"
            ),
            {
                "advance": str(
                    self.disbursed_advance.id
                ),
                "amount": "2000.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        self.assertEqual(
            payroll.advance_recovery,
            Decimal("2000.00"),
        )

        self.disbursed_advance.refresh_from_db()

        # Recovery is not posted to the advance until payroll is paid.
        self.assertEqual(
            self.disbursed_advance.recovered_amount,
            Decimal("0.00"),
        )

    def test_payroll_can_be_approved_after_calculation(self):

        payroll = self.create_calculated_payroll()

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/approve/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        self.assertEqual(
            payroll.status,
            Payroll.Status.APPROVED,
        )

    def test_draft_payroll_cannot_be_approved(self):

        payroll = Payroll.objects.create(
            period=self.payroll_period,
            employee=self.staff_employee,
            salary_structure=self.salary_structure,
            status=Payroll.Status.DRAFT,
            calendar_days=Decimal("30.00"),
            payable_days=Decimal("30.00"),
            base_salary=Decimal("30000.00"),
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/approve/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_hr_cannot_pay_payroll(self):

        payroll = self.create_calculated_payroll()

        payroll.status = Payroll.Status.APPROVED
        payroll.save()

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/pay/"
            ),
            {
                "payment_method": "BANK_TRANSFER",
                "payment_reference": "PAY-HR-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_finance_can_pay_approved_payroll(self):

        payroll = self.create_calculated_payroll()

        payroll.status = Payroll.Status.APPROVED
        payroll.approved_by = self.hr_user
        payroll.approved_at = timezone.now()
        payroll.save()

        self.authenticate(
            self.finance_user
        )

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/pay/"
            ),
            {
                "payment_method": "BANK_TRANSFER",
                "payment_reference": "PAY-FIN-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payroll.refresh_from_db()

        self.assertEqual(
            payroll.status,
            Payroll.Status.PAID,
        )

        self.assertEqual(
            payroll.payment_reference,
            "PAY-FIN-001",
        )

    def test_advance_recovery_posts_when_payroll_is_paid(self):

        payroll = self.create_calculated_payroll()

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/advance-recovery/"
            ),
            {
                "advance": str(
                    self.disbursed_advance.id
                ),
                "amount": "2000.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/approve/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.authenticate(
            self.finance_user
        )

        response = self.client.post(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/pay/"
            ),
            {
                "payment_method": "BANK_TRANSFER",
                "payment_reference": "PAY-ADV-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.disbursed_advance.refresh_from_db()

        self.assertEqual(
            self.disbursed_advance.recovered_amount,
            Decimal("2000.00"),
        )

        self.assertEqual(
            self.disbursed_advance.status,
            SalaryAdvance.Status.PARTIALLY_RECOVERED,
        )

    def test_payslip_endpoint_returns_salary_data(self):

        payroll = self.create_calculated_payroll()

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/payslip/"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "employee",
            response.data,
        )

        self.assertIn(
            "earnings",
            response.data,
        )

        self.assertIn(
            "deductions",
            response.data,
        )

        self.assertIn(
            "summary",
            response.data,
        )

        self.assertEqual(
            Decimal(
                str(
                    response.data[
                        "summary"
                    ]["net_salary"]
                )
            ),
            Decimal("33000.00"),
        )

    def test_payroll_period_summary(self):

        payroll = self.create_calculated_payroll()

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            (
                f"/api/hr/payroll-periods/"
                f"{self.payroll_period.id}/summary/"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["employees"],
            1,
        )

        self.assertEqual(
            Decimal(
                str(
                    response.data[
                        "net_payroll"
                    ]
                )
            ),
            payroll.net_salary,
        )

    def test_period_cannot_close_with_unfinished_payroll(self):

        Payroll.objects.create(
            period=self.payroll_period,
            employee=self.staff_employee,
            salary_structure=self.salary_structure,
            status=Payroll.Status.DRAFT,
            calendar_days=Decimal("30.00"),
            payable_days=Decimal("30.00"),
            base_salary=Decimal("30000.00"),
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/payroll-periods/"
                f"{self.payroll_period.id}/close/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_period_can_close_when_all_payrolls_paid(self):

        payroll = Payroll.objects.create(
            period=self.payroll_period,
            employee=self.staff_employee,
            salary_structure=self.salary_structure,
            status=Payroll.Status.PAID,
            calendar_days=Decimal("30.00"),
            payable_days=Decimal("30.00"),
            base_salary=Decimal("30000.00"),
            gross_earnings=Decimal("35000.00"),
            total_deductions=Decimal("2000.00"),
            net_salary=Decimal("33000.00"),
            paid_by=self.finance_user,
            paid_at=timezone.now(),
            payment_method="BANK_TRANSFER",
            payment_reference="ALREADY-PAID-001",
        )

        self.authenticate(
            self.hr_user
        )

        response = self.client.post(
            (
                f"/api/hr/payroll-periods/"
                f"{self.payroll_period.id}/close/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.payroll_period.refresh_from_db()

        self.assertEqual(
            self.payroll_period.status,
            PayrollPeriod.Status.CLOSED,
        )

    # ============================================================
    # PAYROLL AUDIT
    # ============================================================

    def test_payroll_calculation_creates_audit_activity(self):

        payroll = self.create_calculated_payroll()

        self.assertTrue(
            PayrollActivity.objects.filter(
                payroll=payroll,
                activity_type=(
                    PayrollActivity.ActivityType.CALCULATED
                ),
            ).exists()
        )

    def test_payroll_components_are_exposed_read_only(self):

        payroll = self.create_calculated_payroll()

        self.authenticate(
            self.hr_user
        )

        response = self.client.get(
            (
                f"/api/hr/payrolls/"
                f"{payroll.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "components",
            response.data,
        )

        self.assertGreaterEqual(
            len(response.data["components"]),
            3,
        )
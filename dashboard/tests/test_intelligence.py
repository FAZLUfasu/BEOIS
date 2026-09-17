from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    User,
    Role,
    UserRole,
)
from organization.models import (
    Trust,
    BusinessUnit,
    Branch,
    Department,
)
from hr.models import Employee

from leads.models import (
    Lead,
    CallLog,
)
from admissions.models import (
    Institution,
    Program,
    Admission,
    AdmissionFee,
    AdmissionPayment,
)
from students.models import (
    Student,
    StudentProcess,
)
from partners.models import (
    Partner,
    PartnerCase,
    PartnerIssue,
    CommissionTransaction,
)
from finance.models import (
    FinancialAccount,
    TransactionCategory,
    FinancialTransaction,
    Expense,
    UniversityPayable,
)


class IntelligenceAPITests(APITestCase):
    """
    Reporting & Intelligence V2 tests.

    These tests verify:
    - authentication
    - management-only authorization
    - all seven intelligence endpoints
    - period/date validation
    - overview KPIs
    - institution intelligence
    - partner performance
    - staff performance
    - staff/payroll privacy boundary
    - financial intelligence
    - exception centre
    """

    @classmethod
    def setUpTestData(cls):
        cls.today = timezone.localdate()
        cls.now = timezone.now()

        # ====================================================
        # ORGANIZATION
        # ====================================================

        cls.trust = Trust.objects.create(
            name="Brainstorm Educational Service Trust",
            short_name="BEST",
        )

        cls.business_unit = (
            BusinessUnit.objects.create(
                trust=cls.trust,
                name="BEST College",
                code="BEST",
            )
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="BEST Head Office",
            code="BEST-HO",
            city="Chennai",
            state="Tamil Nadu",
            is_head_office=True,
        )

        cls.management_department = (
            Department.objects.create(
                branch=cls.branch,
                name="Management",
                code="MGMT",
            )
        )

        cls.marketing_department = (
            Department.objects.create(
                branch=cls.branch,
                name="Marketing",
                code="MKT",
            )
        )

        cls.telecalling_department = (
            Department.objects.create(
                branch=cls.branch,
                name="Telecalling",
                code="TEL",
            )
        )

        # ====================================================
        # ROLES
        # ====================================================

        cls.general_manager_role = (
            Role.objects.create(
                name="General Manager",
                code="GENERAL_MANAGER",
            )
        )

        cls.marketing_role = (
            Role.objects.create(
                name="Marketing",
                code="MARKETING",
            )
        )

        cls.telecaller_role = (
            Role.objects.create(
                name="Telecaller",
                code="TELECALLER",
            )
        )

        # ====================================================
        # USERS
        # ====================================================

        cls.management_user = (
            User.objects.create_user(
                username="intelligence_manager",
                email="manager@example.com",
                password="StrongTestPass123!",
            )
        )

        cls.marketing_user = (
            User.objects.create_user(
                username="marketing_user",
                email="marketing@example.com",
                password="StrongTestPass123!",
            )
        )

        cls.telecaller_user = (
            User.objects.create_user(
                username="telecaller_user",
                email="telecaller@example.com",
                password="StrongTestPass123!",
                first_name="Test",
                last_name="Telecaller",
            )
        )

        cls.superuser = (
            User.objects.create_superuser(
                username="intelligence_admin",
                email="admin@example.com",
                password="StrongTestPass123!",
            )
        )

        # ====================================================
        # ROLE ASSIGNMENTS
        # ====================================================

        UserRole.objects.create(
            user=cls.management_user,
            role=cls.general_manager_role,
            scope_type="ORGANIZATION",
            business_unit=cls.business_unit,
        )

        UserRole.objects.create(
            user=cls.marketing_user,
            role=cls.marketing_role,
            scope_type="ORGANIZATION",
            business_unit=cls.business_unit,
        )

        UserRole.objects.create(
            user=cls.telecaller_user,
            role=cls.telecaller_role,
            scope_type="ORGANIZATION",
            business_unit=cls.business_unit,
        )

        # ====================================================
        # EMPLOYEE
        # ====================================================

        cls.telecaller_employee = (
            Employee.objects.create(
                user=cls.telecaller_user,
                branch=cls.branch,
                department=(
                    cls.telecalling_department
                ),
                designation="Telecaller",
                employment_type="FULL_TIME",
                employment_status="ACTIVE",
                date_of_joining=cls.today,
            )
        )

        # ====================================================
        # INSTITUTION / PROGRAM
        # ====================================================

        cls.institution = (
            Institution.objects.create(
                name="BEST Test University",
                short_name="BTU",
                code="BTU",
                state="Tamil Nadu",
                city="Chennai",
            )
        )

        cls.program = Program.objects.create(
            institution=cls.institution,
            name="Bachelor of Commerce",
            code="BCOM",
            level="UG",
            duration_years=3,
            duration_semesters=6,
            is_credit_transfer_available=True,
        )

        # ====================================================
        # PARTNER
        # ====================================================

        cls.partner = Partner.objects.create(
            name="BEST Test Education Centre",
            partner_type="EDUCATION_CENTRE",
            status="ACTIVE",
            phone_number="9000000001",
            city="Chennai",
            state="Tamil Nadu",
            created_by=cls.management_user,
        )

        # ====================================================
        # LEADS
        # ====================================================

        cls.converted_lead = (
            Lead.objects.create(
                name="Converted Student",
                phone_number="9000000002",
                vertical="REGULAR",
                channel="DIRECT",
                source="Meta Ads",
                campaign="September Campaign",
                interested_course="B.Com",
                status="CONVERTED",
                assigned_to=cls.telecaller_user,
                created_by=cls.management_user,
                converted_at=cls.now,
            )
        )

        cls.followup_lead = (
            Lead.objects.create(
                name="Follow Up Student",
                phone_number="9000000003",
                vertical="CREDIT_TRANSFER",
                channel="PARTNER",
                partner=cls.partner,
                source="Partner",
                interested_course="B.Com",
                status="FOLLOW_UP",
                assigned_to=cls.telecaller_user,
                next_follow_up_at=(
                    cls.now
                    - timedelta(days=1)
                ),
                created_by=cls.management_user,
            )
        )

        # ====================================================
        # CALL LOG
        # ====================================================

        cls.call = CallLog.objects.create(
            lead=cls.converted_lead,
            telecaller=cls.telecaller_user,
            outcome="INTERESTED",
            notes="Student interested.",
            called_at=cls.now,
            duration_seconds=120,
        )

        # ====================================================
        # ADMISSION
        # ====================================================

        cls.admission = Admission.objects.create(
            lead=cls.converted_lead,
            applicant_name="Converted Student",
            phone_number="9000000002",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            vertical="REGULAR",
            channel="DIRECT",
            status="COMPLETED",
            assigned_to=cls.telecaller_user,
            created_by=cls.management_user,
            completed_at=cls.now,
        )

        # ====================================================
        # ADMISSION FINANCE
        # ====================================================

        cls.admission_fee = (
            AdmissionFee.objects.create(
                admission=cls.admission,
                fee_type="TUITION",
                description="Tuition Fee",
                amount=Decimal("50000.00"),
                due_date=cls.today,
            )
        )

        cls.admission_payment = (
            AdmissionPayment.objects.create(
                admission=cls.admission,
                amount=Decimal("30000.00"),
                payment_method="UPI",
                reference_number="PAY-TEST-001",
                receipt_number="REC-TEST-001",
                paid_at=cls.now,
                received_by=cls.management_user,
            )
        )

        # ====================================================
        # STUDENT
        # ====================================================

        cls.student = Student.objects.create(
            admission=cls.admission,
            name="Converted Student",
            phone_number="9000000002",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            enrollment_number="ENR-TEST-001",
            vertical="REGULAR",
            channel="DIRECT",
            current_year=1,
            current_semester=1,
            status="ACTIVE",
            assigned_coordinator=(
                cls.telecaller_user
            ),
            created_by=cls.management_user,
        )

        # ====================================================
        # OVERDUE EDUCATION PROCESS
        # ====================================================

        cls.student_process = (
            StudentProcess.objects.create(
                student=cls.student,
                process_type="EXAM",
                title="Semester Examination",
                academic_year="2026",
                semester=1,
                status="PENDING",
                due_date=(
                    cls.today
                    - timedelta(days=2)
                ),
                assigned_to=cls.telecaller_user,
            )
        )

        # ====================================================
        # PARTNER CASE
        # ====================================================

        cls.partner_case = (
            PartnerCase.objects.create(
                partner=cls.partner,
                admission=cls.admission,
                applicant_name=(
                    cls.admission.applicant_name
                ),
                phone_number=(
                    cls.admission.phone_number
                ),
                institution=cls.institution,
                program=cls.program,
                vertical="REGULAR",
                partner_reference_number=(
                    "PARTNER-REF-001"
                ),
                status="COMPLETED",
                assigned_to=cls.telecaller_user,
                created_by=cls.management_user,
            )
        )

        # ====================================================
        # URGENT PARTNER ISSUE
        # ====================================================

        cls.partner_issue = (
            PartnerIssue.objects.create(
                partner=cls.partner,
                partner_case=cls.partner_case,
                subject="Urgent document issue",
                description=(
                    "University document requires "
                    "immediate clarification."
                ),
                priority="URGENT",
                status="OPEN",
                assigned_to=cls.telecaller_user,
            )
        )

        # ====================================================
        # PARTNER COMMISSION
        # ====================================================

        cls.commission = (
            CommissionTransaction.objects.create(
                partner=cls.partner,
                partner_case=cls.partner_case,
                admission=cls.admission,
                base_amount=Decimal(
                    "30000.00"
                ),
                commission_amount=Decimal(
                    "5000.00"
                ),
                status="PAYABLE",
                approved_by=cls.management_user,
                approved_at=cls.now,
            )
        )

        # ====================================================
        # FINANCIAL ACCOUNT
        # ====================================================

        cls.financial_account = (
            FinancialAccount.objects.create(
                name="BEST Main Bank",
                code="BEST-BANK",
                account_type="BANK",
                business_unit=(
                    cls.business_unit
                ),
                branch=cls.branch,
                opening_balance=Decimal(
                    "10000.00"
                ),
                opening_balance_date=(
                    cls.today
                ),
            )
        )

        # ====================================================
        # TRANSACTION CATEGORIES
        # ====================================================

        cls.income_category = (
            TransactionCategory.objects.create(
                name="Student Fee Income",
                code="TEST-STUDENT-INCOME",
                category_type="INCOME",
            )
        )

        cls.expense_category = (
            TransactionCategory.objects.create(
                name="Office Expense",
                code="TEST-OFFICE-EXPENSE",
                category_type="EXPENSE",
            )
        )

        # ====================================================
        # POSTED INCOME
        # ====================================================

        cls.income_transaction = (
            FinancialTransaction.objects.create(
                transaction_number="FT-INT-00001",
                transaction_type="CREDIT",
                account=cls.financial_account,
                category=cls.income_category,
                amount=Decimal("30000.00"),
                transaction_date=cls.today,
                payment_method="UPI",
                reference_number="TX-IN-001",
                description="Student fee income",
                status="POSTED",
                source_type="MANUAL",
                business_unit=cls.business_unit,
                branch=cls.branch,
                admission=cls.admission,
                institution=cls.institution,
                created_by=cls.management_user,
                posted_by=cls.management_user,
                posted_at=cls.now,
            )
        )
        # ====================================================
        # POSTED EXPENSE
        # ====================================================

        cls.expense_transaction = (
            FinancialTransaction.objects.create(
                transaction_number="FT-INT-00002",
                transaction_type="DEBIT",
                account=cls.financial_account,
                category=cls.expense_category,
                amount=Decimal("4000.00"),
                transaction_date=cls.today,
                payment_method="BANK_TRANSFER",
                reference_number="TX-OUT-001",
                description="Office expense",
                status="POSTED",
                source_type="MANUAL",
                business_unit=cls.business_unit,
                branch=cls.branch,
                created_by=cls.management_user,
                posted_by=cls.management_user,
                posted_at=cls.now,
            )
        )
        # ====================================================
        # OPERATIONAL EXPENSE
        # ====================================================

        cls.expense = Expense.objects.create(
            category=cls.expense_category,
            business_unit=cls.business_unit,
            branch=cls.branch,
            vendor_name="Test Vendor",
            description="Office equipment",
            expense_date=cls.today,
            due_date=(
                cls.today
                - timedelta(days=1)
            ),
            amount=Decimal("10000.00"),
            paid_amount=Decimal("2500.00"),
            status="PARTIALLY_PAID",
            requested_by=cls.management_user,
            approved_by=cls.management_user,
            approved_at=cls.now,
        )

        # ====================================================
        # UNIVERSITY PAYABLE
        # ====================================================

        cls.university_payable = (
            UniversityPayable.objects.create(
                institution=cls.institution,
                admission=cls.admission,
                description=(
                    "University admission fee"
                ),
                amount=Decimal("15000.00"),
                paid_amount=Decimal("5000.00"),
                payable_date=cls.today,
                due_date=(
                    cls.today
                    - timedelta(days=1)
                ),
                status="PARTIALLY_PAID",
                created_by=cls.management_user,
            )
        )

    # ========================================================
    # HELPERS
    # ========================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user
        )

    def intelligence_url(self, endpoint):
        return (
            f"/api/dashboard/"
            f"intelligence/{endpoint}/"
        )

    def date_url(self, endpoint):
        return (
            self.intelligence_url(endpoint)
            + f"?start_date={self.today.isoformat()}"
            + f"&end_date={self.today.isoformat()}"
        )

    # ========================================================
    # SECURITY
    # ========================================================

    def test_anonymous_user_cannot_access_intelligence(self):
        response = self.client.get(
            self.intelligence_url(
                "overview"
            )
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_marketing_user_cannot_access_management_intelligence(self):
        self.authenticate(
            self.marketing_user
        )

        response = self.client.get(
            self.intelligence_url(
                "overview"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_management_user_can_access_intelligence(self):
        self.authenticate(
            self.management_user
        )

        response = self.client.get(
            self.date_url("overview")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_superuser_can_access_intelligence(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url("overview")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    # ========================================================
    # ALL SEVEN ENDPOINTS
    # ========================================================

    def test_all_intelligence_endpoints_return_200_for_superuser(self):
        self.authenticate(
            self.superuser
        )

        endpoints = [
            "overview",
            "trends",
            "institutions",
            "partners",
            "staff",
            "finance",
            "exceptions",
        ]

        for endpoint in endpoints:
            with self.subTest(
                endpoint=endpoint
            ):
                response = self.client.get(
                    self.date_url(
                        endpoint
                    )
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_200_OK,
                )

    # ========================================================
    # DATE VALIDATION
    # ========================================================

    def test_invalid_start_date_returns_400(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.intelligence_url(
                "overview"
            )
            + "?start_date=17-09-2026"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "YYYY-MM-DD",
            response.data["detail"],
        )

    # ========================================================
    # OVERVIEW
    # ========================================================

    def test_overview_contains_expected_kpis(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url("overview")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.data

        self.assertIn("period", data)
        self.assertIn("kpis", data)
        self.assertIn(
            "organization",
            data,
        )

        self.assertEqual(
            data["kpis"]["leads"][
                "current"
            ],
            2,
        )

        self.assertEqual(
            data["kpis"]["admissions"][
                "current"
            ],
            1,
        )

        self.assertEqual(
            Decimal(
                str(
                    data["kpis"][
                        "collections"
                    ]["current"]
                )
            ),
            Decimal("30000.00"),
        )

        self.assertEqual(
            data["organization"][
                "active_students"
            ],
            1,
        )

        self.assertEqual(
            data["organization"][
                "active_partners"
            ],
            1,
        )

        self.assertEqual(
            data["organization"][
                "active_employees"
            ],
            1,
        )

    # ========================================================
    # TRENDS
    # ========================================================

    def test_trends_contains_operational_and_cash_flow_data(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url("trends")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "lead_trend",
            response.data,
        )

        self.assertIn(
            "admission_trend",
            response.data,
        )

        self.assertIn(
            "collection_trend",
            response.data,
        )

        self.assertIn(
            "cash_flow_trend",
            response.data,
        )

        self.assertGreaterEqual(
            len(
                response.data[
                    "lead_trend"
                ]
            ),
            1,
        )

        self.assertGreaterEqual(
            len(
                response.data[
                    "cash_flow_trend"
                ]
            ),
            1,
        )

    # ========================================================
    # INSTITUTION INTELLIGENCE
    # ========================================================

    def test_institution_intelligence_calculates_receivables(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url(
                "institutions"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        institutions = (
            response.data[
                "institutions"
            ]
        )

        self.assertEqual(
            len(institutions),
            1,
        )

        row = institutions[0]

        self.assertEqual(
            row["institution_code"],
            "BTU",
        )

        self.assertEqual(
            row["admissions_in_period"],
            1,
        )

        self.assertEqual(
            Decimal(
                str(
                    row[
                        "collections_in_period"
                    ]
                )
            ),
            Decimal("30000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    row[
                        "student_receivable"
                    ]
                )
            ),
            Decimal("20000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    row[
                        "university_outstanding"
                    ]
                )
            ),
            Decimal("10000.00"),
        )

    # ========================================================
    # PARTNER INTELLIGENCE
    # ========================================================

    def test_partner_intelligence_reports_partner_performance(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url(
                "partners"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        partners = (
            response.data["partners"]
        )

        self.assertEqual(
            len(partners),
            1,
        )

        row = partners[0]

        self.assertEqual(
            row["name"],
            "BEST Test Education Centre",
        )

        self.assertEqual(
            row["cases_in_period"],
            1,
        )

        self.assertEqual(
            Decimal(
                str(
                    row[
                        "commission_payable"
                    ]
                )
            ),
            Decimal("5000.00"),
        )

        self.assertEqual(
            row["open_issues"],
            1,
        )

    # ========================================================
    # STAFF INTELLIGENCE + PRIVACY
    # ========================================================

    def test_staff_intelligence_reports_performance_without_salary_data(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url("staff")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        staff = response.data["staff"]

        self.assertGreaterEqual(
            len(staff),
            1,
        )

        row = next(
            item
            for item in staff
            if item["employee_id"]
            == self.telecaller_employee.employee_id
        )

        self.assertEqual(
            row["leads_assigned"],
            2,
        )

        self.assertEqual(
            row["calls"],
            1,
        )

        self.assertEqual(
            row["converted_leads"],
            1,
        )

        self.assertEqual(
            row["admissions"],
            1,
        )

        # Privacy boundary:
        # operational staff intelligence must
        # not expose payroll/salary fields.
        forbidden_fields = {
            "salary",
            "base_salary",
            "gross_earnings",
            "net_salary",
            "payroll",
            "total_deductions",
            "advance_recovery",
        }

        self.assertTrue(
            forbidden_fields.isdisjoint(
                set(row.keys())
            )
        )

    # ========================================================
    # FINANCIAL INTELLIGENCE
    # ========================================================

    def test_financial_intelligence_calculates_cash_flow_and_obligations(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url("finance")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.data

        self.assertEqual(
            Decimal(
                str(
                    data["cash_flow"][
                        "income"
                    ]
                )
            ),
            Decimal("30000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    data["cash_flow"][
                        "outflow"
                    ]
                )
            ),
            Decimal("4000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    data["cash_flow"][
                        "net"
                    ]
                )
            ),
            Decimal("26000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    data[
                        "student_finance"
                    ]["receivable"]
                )
            ),
            Decimal("20000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    data["obligations"][
                        "university_outstanding"
                    ]
                )
            ),
            Decimal("10000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    data["obligations"][
                        "partner_commission_outstanding"
                    ]
                )
            ),
            Decimal("5000.00"),
        )

        self.assertEqual(
            Decimal(
                str(
                    data["obligations"][
                        "operational_expense_outstanding"
                    ]
                )
            ),
            Decimal("7500.00"),
        )

        self.assertIn(
            "not statutory accounting profit",
            data["note"],
        )

    # ========================================================
    # EXCEPTION CENTRE
    # ========================================================

    def test_exception_centre_detects_attention_items(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            self.date_url(
                "exceptions"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        summary = (
            response.data["summary"]
        )

        self.assertEqual(
            summary[
                "overdue_followups"
            ],
            1,
        )

        self.assertEqual(
            summary[
                "overdue_education_processes"
            ],
            1,
        )

        self.assertEqual(
            summary[
                "urgent_partner_issues"
            ],
            1,
        )

        self.assertEqual(
            summary[
                "university_payables"
            ],
            1,
        )

        self.assertEqual(
            Decimal(
                str(
                    summary[
                        "university_outstanding"
                    ]
                )
            ),
            Decimal("10000.00"),
        )

        self.assertEqual(
            summary[
                "operational_expenses"
            ],
            1,
        )

        self.assertEqual(
            Decimal(
                str(
                    summary[
                        "operational_expense_outstanding"
                    ]
                )
            ),
            Decimal("7500.00"),
        )

        queues = response.data[
            "queues"
        ]

        self.assertEqual(
            len(
                queues[
                    "overdue_followups"
                ]
            ),
            1,
        )

        self.assertEqual(
            len(
                queues[
                    "overdue_education_processes"
                ]
            ),
            1,
        )

        self.assertEqual(
            len(
                queues[
                    "urgent_partner_issues"
                ]
            ),
            1,
        )

    # ========================================================
    # REVERSED DATE RANGE
    # ========================================================

    def test_reversed_date_range_is_normalized(self):
        self.authenticate(
            self.superuser
        )

        later = self.today
        earlier = (
            self.today
            - timedelta(days=2)
        )

        response = self.client.get(
            self.intelligence_url(
                "overview"
            )
            + (
                f"?start_date="
                f"{later.isoformat()}"
            )
            + (
                f"&end_date="
                f"{earlier.isoformat()}"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            str(
                response.data[
                    "period"
                ]["start_date"]
            ),
            earlier.isoformat(),
        )

        self.assertEqual(
            str(
                response.data[
                    "period"
                ]["end_date"]
            ),
            later.isoformat(),
        )
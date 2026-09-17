from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role, UserRole
from admissions.models import (
    Admission,
    AdmissionPayment,
    Institution,
    Program,
)
from finance.models import (
    Expense,
    FinanceActivity,
    FinancialAccount,
    FinancialTransaction,
    TransactionCategory,
    UniversityPayable,
)
from finance.services import initialize_finance_categories
from hr.models import (
    Employee,
    EmployeeSalaryStructure,
    Payroll,
    PayrollPeriod,
)
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)
from partners.models import (
    CommissionRule,
    CommissionTransaction,
    Partner,
)


User = get_user_model()


class FinanceAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):

        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="BEOIS Finance API Test Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST Finance Test Unit",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Finance Head Office",
            code="FIN-TEST-HO",
        )

        cls.finance_department = Department.objects.create(
            branch=None,
            name="Finance Test Department",
        )

        cls.operations_department = Department.objects.create(
            branch=None,
            name="Operations Finance Test Department",
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.finance_role = Role.objects.create(
            name="Finance API Role",
            code="FINANCE",
        )

        cls.staff_role = Role.objects.create(
            name="Finance Staff Role",
            code="STAFF",
        )

        # ========================================================
        # FINANCE USER
        # ========================================================

        cls.finance_user = User.objects.create_user(
            username="finance_test_user",
            email="finance.test@test.local",
            password="TestPassword123!",
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
        # ORDINARY STAFF
        # ========================================================

        cls.staff_user = User.objects.create_user(
            username="finance_staff_test",
            email="finance.staff@test.local",
            password="TestPassword123!",
        )

        cls.staff_employee = Employee.objects.create(
            user=cls.staff_user,
            branch=cls.branch,
            department=cls.operations_department,
            employment_status=Employee.EmploymentStatus.ACTIVE,
            designation="Operations Executive",
        )

        UserRole.objects.create(
            user=cls.staff_user,
            role=cls.staff_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # SUPERUSER
        # ========================================================

        cls.superuser = User.objects.create_superuser(
            username="finance_superuser_test",
            email="finance.super@test.local",
            password="TestPassword123!",
        )

        # ========================================================
        # FINANCE CATEGORIES
        # ========================================================

        initialize_finance_categories()

        cls.student_fee_category = (
            TransactionCategory.objects.get(
                code="STUDENT_FEE"
            )
        )

        cls.other_income_category = (
            TransactionCategory.objects.get(
                code="OTHER_INCOME"
            )
        )

        cls.office_expense_category = (
            TransactionCategory.objects.get(
                code="OFFICE_EXPENSE"
            )
        )

        # ========================================================
        # FINANCIAL ACCOUNT
        # ========================================================

        cls.account = FinancialAccount.objects.create(
            name="Finance Test Bank Account",
            code="FIN-BANK-TEST",
            account_type=FinancialAccount.AccountType.BANK,
            business_unit=cls.business_unit,
            branch=cls.branch,
            bank_name="Test Bank",
            account_number="1234567890",
            ifsc_code="TEST0000001",
            opening_balance=Decimal("10000.00"),
            opening_balance_date=date(2026, 1, 1),
            is_active=True,
        )

        # ========================================================
        # INSTITUTION / PROGRAM
        # ========================================================

        cls.institution = Institution.objects.create(
            name="Finance Test University",
            short_name="FTU",
            code="FTU-TEST",
            state="Tamil Nadu",
            city="Chennai",
            is_active=True,
        )

        cls.program = Program.objects.create(
            institution=cls.institution,
            name="Finance Test B.Com",
            code="FIN-BCOM",
            level=Program.Level.UG,
            duration_years=3,
            duration_semesters=6,
            is_credit_transfer_available=True,
            is_active=True,
        )

        # ========================================================
        # PARTNER
        # ========================================================

        cls.partner = Partner.objects.create(
            name="Finance Test Partner",
            partner_type=Partner.PartnerType.EDUCATION_CENTRE,
            status=Partner.Status.ACTIVE,
            contact_person="Finance Partner Contact",
            phone_number="9800000001",
            city="Chennai",
            state="Tamil Nadu",
            relationship_manager=cls.staff_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # ADMISSION
        # ========================================================

        cls.admission = Admission.objects.create(
            applicant_name="Finance Test Student",
            phone_number="9800000002",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.PARTNER,
            partner=cls.partner,
            status=Admission.Status.FEE_PENDING,
            assigned_to=cls.staff_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # ADMISSION PAYMENT
        # ========================================================

        cls.admission_payment = AdmissionPayment.objects.create(
            admission=cls.admission,
            amount=Decimal("5000.00"),
            payment_method=AdmissionPayment.PaymentMethod.UPI,
            reference_number="FIN-ADMISSION-PAY-001",
            paid_at=timezone.now(),
            received_by=cls.finance_user,
        )

        # ========================================================
        # PAYROLL
        # ========================================================

        cls.salary_structure = (
            EmployeeSalaryStructure.objects.create(
                employee=cls.staff_employee,
                name="Finance Test Salary",
                effective_from=date(2026, 1, 1),
                base_salary=Decimal("30000.00"),
                is_active=True,
                created_by=cls.superuser,
            )
        )

        cls.finance_salary_structure = (
            EmployeeSalaryStructure.objects.create(
                employee=cls.finance_employee,
                name="Finance Manager Test Salary",
                effective_from=date(2026, 1, 1),
                base_salary=Decimal("25000.00"),
                is_active=True,
                created_by=cls.superuser,
            )
        )

        cls.payroll_period = PayrollPeriod.objects.create(
            year=2026,
            month=8,
            start_date=date(2026, 8, 1),
            end_date=date(2026, 8, 31),
            status=PayrollPeriod.Status.OPEN,
            created_by=cls.superuser,
        )

        cls.paid_payroll = Payroll.objects.create(
            period=cls.payroll_period,
            employee=cls.staff_employee,
            salary_structure=cls.salary_structure,
            status=Payroll.Status.PAID,
            calendar_days=Decimal("31.00"),
            payable_days=Decimal("31.00"),
            lop_days=Decimal("0.00"),
            base_salary=Decimal("30000.00"),
            gross_earnings=Decimal("30000.00"),
            total_deductions=Decimal("0.00"),
            net_salary=Decimal("30000.00"),
            paid_by=cls.finance_user,
            paid_at=timezone.now(),
            payment_method="BANK_TRANSFER",
            payment_reference="FIN-PAYROLL-001",
        )

        cls.unpaid_payroll = Payroll.objects.create(
            period=cls.payroll_period,
            employee=cls.finance_employee,
            salary_structure=cls.finance_salary_structure,
            status=Payroll.Status.DRAFT,
            calendar_days=Decimal("31.00"),
            payable_days=Decimal("31.00"),
            lop_days=Decimal("0.00"),
            base_salary=Decimal("25000.00"),
        )
        # ========================================================
        # COMMISSION RULE
        # ========================================================

        cls.commission_rule = CommissionRule.objects.create(
            partner=cls.partner,
            institution=cls.institution,
            program=cls.program,
            vertical=Admission.Vertical.REGULAR,
            commission_type=CommissionRule.CommissionType.FIXED,
            value=Decimal("3000.00"),
            is_active=True,
        )

        # ========================================================
        # PAID COMMISSION
        # ========================================================

        cls.paid_commission = CommissionTransaction.objects.create(
            partner=cls.partner,
            rule=cls.commission_rule,
            admission=cls.admission,
            base_amount=Decimal("25000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.PAID,
            paid_at=timezone.now(),
            payment_reference="FIN-COMMISSION-001",
        )

        cls.unpaid_commission = CommissionTransaction.objects.create(
            partner=cls.partner,
            rule=cls.commission_rule,
            base_amount=Decimal("20000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.EARNED,
        )

    # ============================================================
    # HELPERS
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    # ============================================================
    # SECURITY
    # ============================================================

    def test_anonymous_user_cannot_access_finance(self):
        response = self.client.get(
            "/api/finance/accounts/"
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_ordinary_staff_cannot_access_finance(self):
        self.authenticate(self.staff_user)

        response = self.client.get(
            "/api/finance/accounts/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_finance_user_can_access_finance(self):
        self.authenticate(self.finance_user)

        response = self.client.get(
            "/api/finance/accounts/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_superuser_can_access_finance(self):
        self.authenticate(self.superuser)

        response = self.client.get(
            "/api/finance/accounts/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    # ============================================================
    # ACCOUNT
    # ============================================================

    def test_finance_user_can_create_account(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            "/api/finance/accounts/",
            {
                "name": "Finance Test Cash Account",
                "code": "FIN-CASH-001",
                "account_type": "CASH",
                "business_unit": str(
                    self.business_unit.id
                ),
                "branch": str(self.branch.id),
                "opening_balance": "5000.00",
                "opening_balance_date": "2026-01-01",
                "notes": "Finance API test account",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            FinancialAccount.objects.filter(
                code="FIN-CASH-001"
            ).exists()
        )

    def test_account_balance_includes_posted_transactions(self):
        FinancialTransaction.objects.create(
            transaction_number="FT-BALANCE-001",
            transaction_type=(
                FinancialTransaction.TransactionType.CREDIT
            ),
            account=self.account,
            category=self.other_income_category,
            amount=Decimal("5000.00"),
            transaction_date=date(2026, 9, 1),
            description="Balance test income",
            status=FinancialTransaction.Status.POSTED,
            source_type=FinancialTransaction.SourceType.MANUAL,
            created_by=self.finance_user,
            posted_by=self.finance_user,
            posted_at=timezone.now(),
        )

        FinancialTransaction.objects.create(
            transaction_number="FT-BALANCE-002",
            transaction_type=(
                FinancialTransaction.TransactionType.DEBIT
            ),
            account=self.account,
            category=self.office_expense_category,
            amount=Decimal("2000.00"),
            transaction_date=date(2026, 9, 2),
            description="Balance test expense",
            status=FinancialTransaction.Status.POSTED,
            source_type=FinancialTransaction.SourceType.MANUAL,
            created_by=self.finance_user,
            posted_by=self.finance_user,
            posted_at=timezone.now(),
        )

        self.authenticate(self.finance_user)

        response = self.client.get(
            f"/api/finance/accounts/{self.account.id}/balance/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            Decimal(str(response.data["balance"])),
            Decimal("13000.00"),
        )

    # ============================================================
    # CATEGORIES
    # ============================================================

    def test_system_categories_are_available(self):
        self.authenticate(self.finance_user)

        response = self.client.get(
            "/api/finance/categories/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        codes = {
            item["code"]
            for item in response.data
        }

        self.assertIn("STUDENT_FEE", codes)
        self.assertIn("SALARY", codes)
        self.assertIn("PARTNER_COMMISSION", codes)
        self.assertIn("UNIVERSITY_PAYMENT", codes)

    # ============================================================
    # MANUAL TRANSACTIONS
    # ============================================================

    def test_manual_income_can_be_created(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            "/api/finance/transactions/manual-income/",
            {
                "account": str(self.account.id),
                "category": str(
                    self.other_income_category.id
                ),
                "amount": "2500.00",
                "transaction_date": "2026-09-10",
                "description": "Other income",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "MANUAL-INCOME-001",
                "business_unit": str(
                    self.business_unit.id
                ),
                "branch": str(self.branch.id),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        transaction = FinancialTransaction.objects.get(
            reference_number="MANUAL-INCOME-001"
        )

        self.assertEqual(
            transaction.transaction_type,
            FinancialTransaction.TransactionType.CREDIT,
        )

        self.assertEqual(
            transaction.status,
            FinancialTransaction.Status.POSTED,
        )

    def test_manual_expense_can_be_created(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            "/api/finance/transactions/manual-expense/",
            {
                "account": str(self.account.id),
                "category": str(
                    self.office_expense_category.id
                ),
                "amount": "1000.00",
                "transaction_date": "2026-09-11",
                "description": "Office purchase",
                "payment_method": "UPI",
                "reference_number": "MANUAL-EXPENSE-001",
                "business_unit": str(
                    self.business_unit.id
                ),
                "branch": str(self.branch.id),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        transaction = FinancialTransaction.objects.get(
            reference_number="MANUAL-EXPENSE-001"
        )

        self.assertEqual(
            transaction.transaction_type,
            FinancialTransaction.TransactionType.DEBIT,
        )

        self.assertEqual(
            transaction.status,
            FinancialTransaction.Status.POSTED,
        )

    def test_income_rejects_expense_category(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            "/api/finance/transactions/manual-income/",
            {
                "account": str(self.account.id),
                "category": str(
                    self.office_expense_category.id
                ),
                "amount": "1000.00",
                "transaction_date": "2026-09-12",
                "description": "Invalid category",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # EXPENSE WORKFLOW
    # ============================================================

    def create_expense(self, amount="10000.00"):
        self.authenticate(self.finance_user)

        return self.client.post(
            "/api/finance/expenses/",
            {
                "category": str(
                    self.office_expense_category.id
                ),
                "business_unit": str(
                    self.business_unit.id
                ),
                "branch": str(self.branch.id),
                "vendor_name": "Finance Test Vendor",
                "description": "Office equipment",
                "expense_date": "2026-09-13",
                "due_date": "2026-09-30",
                "amount": amount,
                "notes": "Finance API expense",
            },
            format="json",
        )

    def test_expense_can_be_created(self):
        response = self.create_expense()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        expense = Expense.objects.get(
            description="Office equipment"
        )

        self.assertEqual(
            expense.status,
            Expense.Status.DRAFT,
        )

        self.assertTrue(
            FinanceActivity.objects.filter(
                expense=expense
            ).exists()
        )

    def test_expense_full_workflow(self):
        response = self.create_expense(
            amount="10000.00"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        expense = Expense.objects.get(
            description="Office equipment"
        )

        response = self.client.post(
            f"/api/finance/expenses/{expense.id}/submit/",
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        expense.refresh_from_db()

        self.assertEqual(
            expense.status,
            Expense.Status.SUBMITTED,
        )

        response = self.client.post(
            f"/api/finance/expenses/{expense.id}/approve/",
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        expense.refresh_from_db()

        self.assertEqual(
            expense.status,
            Expense.Status.APPROVED,
        )

        response = self.client.post(
            f"/api/finance/expenses/{expense.id}/pay/",
            {
                "account": str(self.account.id),
                "amount": "4000.00",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "EXP-PART-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        expense.refresh_from_db()

        self.assertEqual(
            expense.status,
            Expense.Status.PARTIALLY_PAID,
        )

        self.assertEqual(
            expense.paid_amount,
            Decimal("4000.00"),
        )

        response = self.client.post(
            f"/api/finance/expenses/{expense.id}/pay/",
            {
                "account": str(self.account.id),
                "amount": "6000.00",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "EXP-FINAL-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        expense.refresh_from_db()

        self.assertEqual(
            expense.status,
            Expense.Status.PAID,
        )

        self.assertEqual(
            expense.paid_amount,
            Decimal("10000.00"),
        )

    def test_expense_overpayment_is_rejected(self):
        response = self.create_expense(
            amount="5000.00"
        )

        expense = Expense.objects.get(
            description="Office equipment"
        )

        self.client.post(
            f"/api/finance/expenses/{expense.id}/submit/",
            {},
            format="json",
        )

        self.client.post(
            f"/api/finance/expenses/{expense.id}/approve/",
            {},
            format="json",
        )

        response = self.client.post(
            f"/api/finance/expenses/{expense.id}/pay/",
            {
                "account": str(self.account.id),
                "amount": "6000.00",
                "payment_method": "BANK_TRANSFER",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # UNIVERSITY PAYABLE
    # ============================================================

    def test_university_payable_full_workflow(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            "/api/finance/university-payables/",
            {
                "institution": str(
                    self.institution.id
                ),
                "admission": str(
                    self.admission.id
                ),
                "description": "University course fee",
                "amount": "12000.00",
                "payable_date": "2026-09-15",
                "due_date": "2026-09-30",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        payable = UniversityPayable.objects.get(
            admission=self.admission
        )

        self.assertEqual(
            payable.status,
            UniversityPayable.Status.OPEN,
        )

        response = self.client.post(
            (
                "/api/finance/university-payables/"
                f"{payable.id}/pay/"
            ),
            {
                "account": str(self.account.id),
                "amount": "5000.00",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "UNI-PART-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payable.refresh_from_db()

        self.assertEqual(
            payable.status,
            UniversityPayable.Status.PARTIALLY_PAID,
        )

        response = self.client.post(
            (
                "/api/finance/university-payables/"
                f"{payable.id}/pay/"
            ),
            {
                "account": str(self.account.id),
                "amount": "7000.00",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "UNI-FINAL-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        payable.refresh_from_db()

        self.assertEqual(
            payable.status,
            UniversityPayable.Status.PAID,
        )

    # ============================================================
    # ADMISSION PAYMENT -> FINANCE
    # ============================================================

    def test_admission_payment_can_sync_to_finance(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            (
                "/api/finance/sync/admission-payment/"
                f"{self.admission_payment.id}/"
            ),
            {
                "account": str(self.account.id)
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        transaction = FinancialTransaction.objects.get(
            admission_payment=self.admission_payment
        )

        self.assertEqual(
            transaction.transaction_type,
            FinancialTransaction.TransactionType.CREDIT,
        )

        self.assertEqual(
            transaction.amount,
            Decimal("5000.00"),
        )

        self.assertEqual(
            transaction.status,
            FinancialTransaction.Status.POSTED,
        )

    def test_duplicate_admission_payment_sync_is_idempotent(self):
        self.authenticate(self.finance_user)

        url = (
            "/api/finance/sync/admission-payment/"
            f"{self.admission_payment.id}/"
        )

        first = self.client.post(
            url,
            {"account": str(self.account.id)},
            format="json",
        )

        second = self.client.post(
            url,
            {"account": str(self.account.id)},
            format="json",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)

        self.assertEqual(
            FinancialTransaction.objects.filter(
                admission_payment=self.admission_payment
            ).count(),
            1,
        )

    # ============================================================
    # PAYROLL -> FINANCE
    # ============================================================

    def test_paid_payroll_can_sync_to_finance(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            (
                "/api/finance/sync/payroll/"
                f"{self.paid_payroll.id}/"
            ),
            {
                "account": str(self.account.id)
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        transaction = FinancialTransaction.objects.get(
            payroll=self.paid_payroll
        )

        self.assertEqual(
            transaction.transaction_type,
            FinancialTransaction.TransactionType.DEBIT,
        )

        self.assertEqual(
            transaction.amount,
            Decimal("30000.00"),
        )

    def test_unpaid_payroll_cannot_sync(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            (
                "/api/finance/sync/payroll/"
                f"{self.unpaid_payroll.id}/"
            ),
            {
                "account": str(self.account.id)
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # PARTNER COMMISSION -> FINANCE
    # ============================================================

    def test_paid_partner_commission_can_sync(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            (
                "/api/finance/sync/partner-commission/"
                f"{self.paid_commission.id}/"
            ),
            {
                "account": str(self.account.id)
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        transaction = FinancialTransaction.objects.get(
            commission_transaction=self.paid_commission
        )

        self.assertEqual(
            transaction.transaction_type,
            FinancialTransaction.TransactionType.DEBIT,
        )

        self.assertEqual(
            transaction.amount,
            Decimal("3000.00"),
        )

    def test_unpaid_partner_commission_cannot_sync(self):
        self.authenticate(self.finance_user)

        response = self.client.post(
            (
                "/api/finance/sync/partner-commission/"
                f"{self.unpaid_commission.id}/"
            ),
            {
                "account": str(self.account.id)
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # REPORTING
    # ============================================================

    def test_finance_summary_reports_income_expense_and_net(self):
        FinancialTransaction.objects.create(
            transaction_number="FT-REPORT-001",
            transaction_type=(
                FinancialTransaction.TransactionType.CREDIT
            ),
            account=self.account,
            category=self.other_income_category,
            amount=Decimal("10000.00"),
            transaction_date=date(2026, 9, 1),
            description="Report income",
            status=FinancialTransaction.Status.POSTED,
            source_type=FinancialTransaction.SourceType.MANUAL,
            branch=self.branch,
            business_unit=self.business_unit,
            created_by=self.finance_user,
            posted_by=self.finance_user,
            posted_at=timezone.now(),
        )

        FinancialTransaction.objects.create(
            transaction_number="FT-REPORT-002",
            transaction_type=(
                FinancialTransaction.TransactionType.DEBIT
            ),
            account=self.account,
            category=self.office_expense_category,
            amount=Decimal("2500.00"),
            transaction_date=date(2026, 9, 2),
            description="Report expense",
            status=FinancialTransaction.Status.POSTED,
            source_type=FinancialTransaction.SourceType.MANUAL,
            branch=self.branch,
            business_unit=self.business_unit,
            created_by=self.finance_user,
            posted_by=self.finance_user,
            posted_at=timezone.now(),
        )

        self.authenticate(self.finance_user)

        response = self.client.get(
            (
                "/api/finance/reports/summary/"
                "?start_date=2026-09-01"
                "&end_date=2026-09-30"
                f"&branch={self.branch.id}"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            Decimal(str(response.data["income"])),
            Decimal("10000.00"),
        )

        self.assertEqual(
            Decimal(str(response.data["expenses"])),
            Decimal("2500.00"),
        )

        self.assertEqual(
            Decimal(str(response.data["net"])),
            Decimal("7500.00"),
        )

    def test_admission_financial_summary_endpoint(self):
        self.authenticate(self.finance_user)

        response = self.client.get(
            (
                "/api/finance/reports/admission/"
                f"{self.admission.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "student_collections",
            response.data,
        )

        self.assertIn(
            "university_outstanding",
            response.data,
        )

        self.assertIn(
            "realized_contribution",
            response.data,
        )

    # ============================================================
    # AUDIT
    # ============================================================

    def test_finance_activity_endpoint_available(self):
        self.authenticate(self.finance_user)

        response = self.client.get(
            "/api/finance/activities/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
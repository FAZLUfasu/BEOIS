from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role, UserRole
from admissions.models import (
    Admission,
    AdmissionActivity,
    AdmissionDocument,
    AdmissionFee,
    AdmissionPayment,
    Institution,
    Program,
)
from hr.models import Employee
from leads.models import Lead, LeadQualification
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)


User = get_user_model()


class AdmissionsAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):

        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="BEOIS Admissions API Test Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST Admissions Test Unit",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Admissions Head Office",
            code="ADM-HO",
        )

        cls.other_branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Admissions Other Branch",
            code="ADM-OTHER",
        )

        cls.admission_department = Department.objects.create(
            branch=None,
            name="Admission Management",
        )

        cls.finance_department = Department.objects.create(
            branch=None,
            name="Accounts/Finance",
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.admission_role = Role.objects.create(
            name="Admission Test",
            code="ADMISSION",
        )

        cls.department_head_role = Role.objects.create(
            name="Admissions Department Head Test",
            code="DEPARTMENT_HEAD",
        )

        cls.finance_role = Role.objects.create(
            name="Finance Test",
            code="FINANCE",
        )

        # ========================================================
        # ADMISSION USER
        # ========================================================

        cls.admission_user = User.objects.create_user(
            username="admission_user_test",
            email="admission@test.local",
            password="TestPassword123!",
        )

        cls.admission_employee = Employee.objects.create(
            user=cls.admission_user,
            branch=cls.branch,
            department=cls.admission_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.admission_user,
            role=cls.admission_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # ADMISSION HOD
        # ========================================================

        cls.admission_hod = User.objects.create_user(
            username="admission_hod_test",
            email="admissionhod@test.local",
            password="TestPassword123!",
        )

        cls.admission_hod_employee = Employee.objects.create(
            user=cls.admission_hod,
            branch=cls.branch,
            department=cls.admission_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.admission_hod,
            role=cls.department_head_role,
            scope_type=UserRole.ScopeType.DEPARTMENT,
            department=cls.admission_department,
        )

        # ========================================================
        # OTHER BRANCH ADMISSION USER
        # ========================================================

        cls.other_admission_user = User.objects.create_user(
            username="other_admission_user_test",
            email="otheradmission@test.local",
            password="TestPassword123!",
        )

        cls.other_admission_employee = Employee.objects.create(
            user=cls.other_admission_user,
            branch=cls.other_branch,
            department=cls.admission_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.other_admission_user,
            role=cls.admission_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # FINANCE USER
        # ========================================================

        cls.finance_user = User.objects.create_user(
            username="admission_finance_test",
            email="admissionfinance@test.local",
            password="TestPassword123!",
        )

        cls.finance_employee = Employee.objects.create(
            user=cls.finance_user,
            branch=cls.branch,
            department=cls.finance_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.finance_user,
            role=cls.finance_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        # ========================================================
        # SUPERUSER
        # ========================================================

        cls.superuser = User.objects.create_superuser(
            username="admissions_superuser_test",
            email="admissionssuperuser@test.local",
            password="TestPassword123!",
        )

        # ========================================================
        # INSTITUTION
        # ========================================================

        cls.institution = Institution.objects.create(
            name="Admissions Test University",
            short_name="ATU",
            code="ATU-TEST",
            state="Tamil Nadu",
            city="Chennai",
            is_active=True,
        )

        # ========================================================
        # PROGRAM
        # ========================================================

        cls.program = Program.objects.create(
            institution=cls.institution,
            name="Bachelor of Commerce",
            code="BCOM",
            level=Program.Level.UG,
            duration_years=3,
            duration_semesters=6,
            is_credit_transfer_available=True,
            is_active=True,
        )

        # ========================================================
        # QUALIFIED LEAD
        # ========================================================

        cls.qualified_lead = Lead.objects.create(
            name="Qualified Admission Lead",
            phone_number="9100000001",
            email="qualified@test.local",
            city="Chennai",
            state="Tamil Nadu",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="Admissions API Test",
            interested_course="B.Com",
            status=Lead.Status.QUALIFIED,
            created_by=cls.superuser,
        )

        LeadQualification.objects.create(
            lead=cls.qualified_lead,
            highest_qualification=(
                LeadQualification
                .QualificationLevel
                .PLUS_TWO
            ),
            required_level=(
                LeadQualification
                .RequiredLevel
                .UG
            ),
            selected_institution=cls.institution,
            selected_program=cls.program,
            eligibility_status=(
                LeadQualification
                .EligibilityStatus
                .ELIGIBLE
            ),
            qualified_by=cls.superuser,
            qualified_at=timezone.now(),
        )

        # ========================================================
        # UNQUALIFIED LEAD
        # ========================================================

        cls.unqualified_lead = Lead.objects.create(
            name="Unqualified Admission Lead",
            phone_number="9100000002",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="Admissions API Test",
            status=Lead.Status.NEW,
            created_by=cls.superuser,
        )

        # ========================================================
        # EXISTING ADMISSION - OWN
        # ========================================================

        cls.own_admission = Admission.objects.create(
            applicant_name="Own Admission Student",
            phone_number="9200000001",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            status=Admission.Status.DOCUMENT_PENDING,
            assigned_to=cls.admission_user,
            created_by=cls.superuser,
        )

        AdmissionActivity.objects.create(
            admission=cls.own_admission,
            activity_type=AdmissionActivity.ActivityType.CREATED,
            description="Own test admission created.",
            performed_by=cls.superuser,
        )

        # ========================================================
        # EXISTING ADMISSION - OTHER USER
        # ========================================================

        cls.other_admission = Admission.objects.create(
            applicant_name="Other Admission Student",
            phone_number="9200000002",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.DIRECT,
            status=Admission.Status.FEE_PENDING,
            assigned_to=cls.other_admission_user,
            created_by=cls.superuser,
        )

    # ============================================================
    # HELPER
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user,
        )

    # ============================================================
    # AUTHENTICATION
    # ============================================================

    def test_anonymous_user_cannot_access_admissions(self):

        response = self.client.get(
            "/api/admissions/"
        )

        self.assertIn(
            response.status_code,
            [401, 403],
        )

    def test_jwt_authentication_works(self):

        token = AccessToken.for_user(
            self.admission_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {str(token)}"
            )
        )

        response = self.client.get(
            "/api/admissions/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_invalid_jwt_is_rejected(self):

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                "Bearer invalid-token"
            )
        )

        response = self.client.get(
            "/api/admissions/"
        )

        self.assertEqual(
            response.status_code,
            401,
        )

    # ============================================================
    # MASTER DATA
    # ============================================================

    def test_admission_user_can_view_institutions(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/institutions/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        codes = {
            item["code"]
            for item in response.json()
        }

        self.assertIn(
            self.institution.code,
            codes,
        )

    def test_admission_user_can_view_programs(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/programs/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        codes = {
            item["code"]
            for item in response.json()
        }

        self.assertIn(
            self.program.code,
            codes,
        )

    # ============================================================
    # ADMISSION SCOPE
    # ============================================================

    def test_own_scope_user_sees_only_own_admission(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["admission_id"]
            for item in response.json()
        }

        self.assertIn(
            self.own_admission.admission_id,
            ids,
        )

        self.assertNotIn(
            self.other_admission.admission_id,
            ids,
        )

    def test_own_scope_user_cannot_retrieve_other_admission(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            (
                "/api/admissions/"
                f"{self.other_admission.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_superuser_sees_all_admissions(self):

        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            "/api/admissions/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["admission_id"]
            for item in response.json()
        }

        self.assertIn(
            self.own_admission.admission_id,
            ids,
        )

        self.assertIn(
            self.other_admission.admission_id,
            ids,
        )
        # ============================================================
    # QUALIFIED LEAD HANDOFF QUEUE
    # ============================================================

    def test_qualified_lead_handoff_requires_authentication(self):

        response = self.client.get(
            "/api/admissions/qualified-leads/"
        )

        self.assertIn(
            response.status_code,
            [401, 403],
        )

    def test_admission_user_can_view_qualified_lead_handoff(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/qualified-leads/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        data = response.json()

        lead_ids = {
            item["lead_id"]
            for item in data
        }

        self.assertIn(
            self.qualified_lead.lead_id,
            lead_ids,
        )

        self.assertNotIn(
            self.unqualified_lead.lead_id,
            lead_ids,
        )

    def test_qualified_lead_handoff_exposes_expected_fields(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/qualified-leads/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        item = next(
            row
            for row in response.json()
            if row["lead_id"]
            == self.qualified_lead.lead_id
        )

        expected_fields = {
            "id",
            "lead_id",
            "name",
            "phone_number",
            "email",
            "interested_course",
            "vertical",
            "vertical_display",
            "channel",
            "channel_display",
            "source",
            "campaign",
            "assigned_to",
            "created_at",
            "updated_at",
        }

        self.assertTrue(
            expected_fields.issubset(
                set(item.keys())
            )
        )

        self.assertEqual(
            item["name"],
            self.qualified_lead.name,
        )

        self.assertEqual(
            item["phone_number"],
            self.qualified_lead.phone_number,
        )

    def test_qualified_lead_handoff_search_and_filters_work(self):

        other_lead = Lead.objects.create(
            name="Credit Transfer Handoff",
            phone_number="9100000099",
            email="cthandoff@test.local",
            city="Kochi",
            state="Kerala",
            vertical=Lead.Vertical.CREDIT_TRANSFER,
            channel=Lead.Channel.DIRECT,
            source="Website",
            campaign="September CT Campaign",
            interested_course="BBA",
            status=Lead.Status.QUALIFIED,
            created_by=self.superuser,
        )

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            (
                "/api/admissions/"
                "qualified-leads/"
                "?search=Credit"
                "&vertical=CREDIT_TRANSFER"
                "&channel=DIRECT"
                "&source=Website"
                "&campaign=September%20CT%20Campaign"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        lead_ids = {
            item["lead_id"]
            for item in response.json()
        }

        self.assertIn(
            other_lead.lead_id,
            lead_ids,
        )

        self.assertNotIn(
            self.qualified_lead.lead_id,
            lead_ids,
        )

    def test_converted_lead_disappears_from_handoff_queue(self):

        self.authenticate(
            self.admission_user
        )

        before_response = self.client.get(
            "/api/admissions/qualified-leads/"
        )

        self.assertEqual(
            before_response.status_code,
            200,
        )

        before_ids = {
            item["lead_id"]
            for item in before_response.json()
        }

        self.assertIn(
            self.qualified_lead.lead_id,
            before_ids,
        )

        convert_response = self.client.post(
            "/api/admissions/convert-from-lead/",
            {
                "lead_id": str(
                    self.qualified_lead.id
                ),
                "institution_id": str(
                    self.institution.id
                ),
                "program_id": str(
                    self.program.id
                ),
                "academic_session": "2026-2027",
            },
            format="json",
        )

        self.assertEqual(
            convert_response.status_code,
            201,
        )

        after_response = self.client.get(
            "/api/admissions/qualified-leads/"
        )

        self.assertEqual(
            after_response.status_code,
            200,
        )

        after_ids = {
            item["lead_id"]
            for item in after_response.json()
        }

        self.assertNotIn(
            self.qualified_lead.lead_id,
            after_ids,
        )

        self.qualified_lead.refresh_from_db()

        self.assertEqual(
            self.qualified_lead.status,
            Lead.Status.CONVERTED,
        )

        self.assertTrue(
            Admission.objects.filter(
                lead=self.qualified_lead
            ).exists()
        )
    # ============================================================
    # LEAD -> ADMISSION
    # ============================================================

    def test_qualified_lead_can_be_converted_to_admission(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            "/api/admissions/convert-from-lead/",
            {
                "lead_id": str(
                    self.qualified_lead.id
                ),
                "institution_id": str(
                    self.institution.id
                ),
                "program_id": str(
                    self.program.id
                ),
                "academic_session": "2026-2027",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        admission = Admission.objects.get(
            lead=self.qualified_lead
        )

        self.assertEqual(
            admission.assigned_to,
            self.admission_user,
        )

        self.assertEqual(
            admission.applicant_name,
            self.qualified_lead.name,
        )

        self.assertEqual(
            admission.status,
            Admission.Status.DRAFT,
        )

        self.qualified_lead.refresh_from_db()

        self.assertEqual(
            self.qualified_lead.status,
            Lead.Status.CONVERTED,
        )

        self.assertTrue(
            admission.activities.filter(
                activity_type=(
                    AdmissionActivity
                    .ActivityType
                    .CREATED
                )
            ).exists()
        )

    def test_unqualified_lead_cannot_be_converted(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            "/api/admissions/convert-from-lead/",
            {
                "lead_id": str(
                    self.unqualified_lead.id
                ),
                "institution_id": str(
                    self.institution.id
                ),
                "program_id": str(
                    self.program.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertFalse(
            Admission.objects.filter(
                lead=self.unqualified_lead
            ).exists()
        )

    # ============================================================
    # ASSIGNMENT SECURITY
    # ============================================================

    def test_shared_department_hod_can_assign_across_branches(self):

        lead = Lead.objects.create(
            name="Shared Department Scope Lead",
            phone_number="9100000010",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="API Test",
            status=Lead.Status.QUALIFIED,
            created_by=self.superuser,
        )

        LeadQualification.objects.create(
            lead=lead,
            highest_qualification=(
                LeadQualification
                .QualificationLevel
                .PLUS_TWO
            ),
            required_level=(
                LeadQualification
                .RequiredLevel
                .UG
            ),
            selected_institution=self.institution,
            selected_program=self.program,
            eligibility_status=(
                LeadQualification
                .EligibilityStatus
                .ELIGIBLE
            ),
            qualified_by=self.superuser,
            qualified_at=timezone.now(),
        )

        self.authenticate(
            self.admission_hod
        )

        response = self.client.post(
            "/api/admissions/convert-from-lead/",
            {
                "lead_id": str(
                    lead.id
                ),
                "institution_id": str(
                    self.institution.id
                ),
                "program_id": str(
                    self.program.id
                ),
                "assigned_to_id": str(
                    self.other_admission_user.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        admission = Admission.objects.get(
            lead=lead
        )

        self.assertEqual(
            admission.assigned_to,
            self.other_admission_user,
        )

        lead.refresh_from_db()

        self.assertEqual(
            lead.status,
            Lead.Status.CONVERTED,
        )
    # ============================================================
    # NOTES
    # ============================================================

    def test_admission_note_creates_activity(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "note/"
            ),
            {
                "description": (
                    "Student submitted additional details."
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        self.assertTrue(
            self.own_admission.activities.filter(
                activity_type=(
                    AdmissionActivity.ActivityType.NOTE
                ),
                description=(
                    "Student submitted additional details."
                ),
            ).exists()
        )

    def test_empty_admission_note_is_rejected(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "note/"
            ),
            {
                "description": "   "
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    # ============================================================
    # DOCUMENTS
    # ============================================================

    def test_admission_document_can_be_added(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "documents/"
            ),
            {
                "document_type": "AADHAAR",
                "document_name": "Aadhaar Card",
                "notes": "Awaiting physical verification.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        document = AdmissionDocument.objects.get(
            admission=self.own_admission,
            document_type=(
                AdmissionDocument.DocumentType.AADHAAR
            ),
        )

        self.assertEqual(
            document.status,
            AdmissionDocument.Status.PENDING,
        )

    def test_admission_document_can_be_verified(self):

        document = AdmissionDocument.objects.create(
            admission=self.own_admission,
            document_type=(
                AdmissionDocument.DocumentType.SSLC
            ),
            document_name="SSLC Certificate",
            status=AdmissionDocument.Status.RECEIVED,
        )

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                f"documents/{document.id}/verify/"
            ),
            {
                "notes": "Verified successfully."
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        document.refresh_from_db()

        self.assertEqual(
            document.status,
            AdmissionDocument.Status.VERIFIED,
        )

        self.assertEqual(
            document.verified_by,
            self.admission_user,
        )

        self.assertIsNotNone(
            document.verified_at
        )

    def test_admission_document_can_be_rejected(self):

        document = AdmissionDocument.objects.create(
            admission=self.own_admission,
            document_type=(
                AdmissionDocument.DocumentType.PLUS_TWO
            ),
            document_name="Plus Two Certificate",
            status=AdmissionDocument.Status.RECEIVED,
        )

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                f"documents/{document.id}/reject/"
            ),
            {
                "reason": "Document is unclear."
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        document.refresh_from_db()

        self.assertEqual(
            document.status,
            AdmissionDocument.Status.REJECTED,
        )

        self.assertEqual(
            document.rejection_reason,
            "Document is unclear.",
        )

    # ============================================================
    # ELIGIBILITY
    # ============================================================

    def test_admission_can_be_marked_eligible(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "eligible/"
            ),
            {
                "notes": "Eligibility confirmed."
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.own_admission.refresh_from_db()

        self.assertEqual(
            self.own_admission.status,
            Admission.Status.ELIGIBLE,
        )

    def test_admission_can_be_marked_not_eligible(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "not-eligible/"
            ),
            {
                "reason": (
                    "Eligibility requirements not met."
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.own_admission.refresh_from_db()

        self.assertEqual(
            self.own_admission.status,
            Admission.Status.NOT_ELIGIBLE,
        )

    # ============================================================
    # FEES
    # ============================================================

    def test_admission_user_can_add_fee(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "fees/"
            ),
            {
                "fee_type": "ADMISSION",
                "description": "Admission Fee",
                "amount": "25000.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        fee = AdmissionFee.objects.get(
            admission=self.own_admission,
            fee_type=AdmissionFee.FeeType.ADMISSION,
        )

        self.assertEqual(
            fee.amount,
            Decimal("25000.00"),
        )

    def test_zero_fee_is_rejected(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "fees/"
            ),
            {
                "fee_type": "ADMISSION",
                "amount": "0.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    # ============================================================
    # PAYMENTS
    # ============================================================

    def test_admission_user_can_record_payment(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "payments/"
            ),
            {
                "amount": "5000.00",
                "payment_method": "UPI",
                "reference_number": "UPI-TEST-001",
                "receipt_number": "REC-001",
                "notes": "First payment.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payment = AdmissionPayment.objects.get(
            admission=self.own_admission,
            reference_number="UPI-TEST-001",
        )

        self.assertEqual(
            payment.amount,
            Decimal("5000.00"),
        )

        self.assertEqual(
            payment.received_by,
            self.admission_user,
        )

        self.assertTrue(
            self.own_admission.activities.filter(
                activity_type=(
                    AdmissionActivity
                    .ActivityType
                    .PAYMENT
                )
            ).exists()
        )

    def test_finance_user_can_record_payment(self):

        self.authenticate(
            self.finance_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "payments/"
            ),
            {
                "amount": "3000.00",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "BANK-TEST-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payment = AdmissionPayment.objects.get(
            reference_number="BANK-TEST-001"
        )

        self.assertEqual(
            payment.received_by,
            self.finance_user,
        )

    # ============================================================
    # FEE SUMMARY
    # ============================================================

    def test_fee_summary_calculates_balance(self):

        AdmissionFee.objects.create(
            admission=self.own_admission,
            fee_type=AdmissionFee.FeeType.ADMISSION,
            amount=Decimal("20000.00"),
        )

        AdmissionPayment.objects.create(
            admission=self.own_admission,
            amount=Decimal("7500.00"),
            payment_method=(
                AdmissionPayment.PaymentMethod.UPI
            ),
            paid_at=timezone.now(),
            received_by=self.admission_user,
        )

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "fee-summary/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        data = response.json()

        self.assertEqual(
            Decimal(str(data["total_fee"])),
            Decimal("20000.00"),
        )

        self.assertEqual(
            Decimal(str(data["total_paid"])),
            Decimal("7500.00"),
        )

        self.assertEqual(
            Decimal(str(data["balance"])),
            Decimal("12500.00"),
        )

    # ============================================================
    # ENROLLMENT
    # ============================================================

    def test_enrollment_can_be_recorded(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "enrollment/"
            ),
            {
                "enrollment_number": "ENR-2026-001",
                "university_admission_number": (
                    "UNI-ADM-001"
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.own_admission.refresh_from_db()

        self.assertEqual(
            self.own_admission.enrollment_number,
            "ENR-2026-001",
        )

        self.assertEqual(
            self.own_admission.university_admission_number,
            "UNI-ADM-001",
        )

        self.assertEqual(
            self.own_admission.status,
            Admission.Status.ENROLLMENT_PENDING,
        )

    # ============================================================
    # COMPLETE ADMISSION
    # ============================================================

    def test_admission_cannot_complete_without_enrollment(self):

        self.own_admission.enrollment_number = ""
        self.own_admission.save()

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "complete/"
            ),
            {
                "notes": "Attempt completion."
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_admission_can_complete_after_enrollment(self):

        self.own_admission.enrollment_number = (
            "ENR-COMPLETE-001"
        )

        self.own_admission.status = (
            Admission.Status.ENROLLMENT_PENDING
        )

        self.own_admission.save()

        self.authenticate(
            self.admission_user
        )

        response = self.client.post(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "complete/"
            ),
            {
                "notes": "Admission completed."
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.own_admission.refresh_from_db()

        self.assertEqual(
            self.own_admission.status,
            Admission.Status.COMPLETED,
        )

        self.assertIsNotNone(
            self.own_admission.completed_at
        )

        self.assertTrue(
            self.own_admission.activities.filter(
                activity_type=(
                    AdmissionActivity
                    .ActivityType
                    .COMPLETED
                )
            ).exists()
        )

    # ============================================================
    # ACTIVITY TIMELINE
    # ============================================================

    def test_activity_timeline_is_available(self):

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            (
                "/api/admissions/"
                f"{self.own_admission.id}/"
                "activities/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertGreaterEqual(
            len(response.json()),
            1,
        )

    # ============================================================
    # QUEUES
    # ============================================================

    def test_document_pending_queue(self):

        self.own_admission.status = (
            Admission.Status.DOCUMENT_PENDING
        )

        self.own_admission.save()

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/document-pending/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["admission_id"]
            for item in response.json()
        }

        self.assertIn(
            self.own_admission.admission_id,
            ids,
        )

    def test_fee_pending_queue(self):

        self.own_admission.status = (
            Admission.Status.FEE_PENDING
        )

        self.own_admission.save()

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/fee-pending/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["admission_id"]
            for item in response.json()
        }

        self.assertIn(
            self.own_admission.admission_id,
            ids,
        )

    def test_enrollment_pending_queue(self):

        self.own_admission.status = (
            Admission.Status.ENROLLMENT_PENDING
        )

        self.own_admission.save()

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/enrollment-pending/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["admission_id"]
            for item in response.json()
        }

        self.assertIn(
            self.own_admission.admission_id,
            ids,
        )

    def test_pending_queue_excludes_completed_admission(self):

        self.own_admission.status = (
            Admission.Status.COMPLETED
        )

        self.own_admission.enrollment_number = (
            "ENR-PENDING-TEST"
        )

        self.own_admission.save()

        self.authenticate(
            self.admission_user
        )

        response = self.client.get(
            "/api/admissions/pending/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["admission_id"]
            for item in response.json()
        }

        self.assertNotIn(
            self.own_admission.admission_id,
            ids,
        )

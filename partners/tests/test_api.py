from decimal import Decimal

from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken
from django.utils import timezone

from accounts.models import Role, UserRole
from admissions.models import Admission, Institution, Program
from hr.models import Employee
from leads.models import Lead
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
    PartnerActivity,
    PartnerCase,
    PartnerDocument,
    PartnerIssue,
    PartnerProgramAccess,
)


User = get_user_model()


class PartnerAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):

        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="BEOIS Partner API Test Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST Partner Test Unit",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Partner Head Office",
            code="PARTNER-HO",
        )

        cls.other_branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Partner Other Branch",
            code="PARTNER-OTHER",
        )

        cls.partner_department = Department.objects.create(
            branch=None,
            name="Partner Network",
        )

        cls.marketing_department = Department.objects.create(
            branch=None,
            name="Partner Test Marketing",
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.partner_role = Role.objects.create(
            name="Partner Network Test",
            code="PARTNER_NETWORK",
        )

        cls.department_head_role = Role.objects.create(
            name="Partner Department Head Test",
            code="DEPARTMENT_HEAD",
        )

        cls.marketing_role = Role.objects.create(
            name="Partner Marketing Test",
            code="MARKETING",
        )

        # ========================================================
        # PARTNER USER - OWN SCOPE
        # ========================================================

        cls.partner_user = User.objects.create_user(
            username="partner_user_test",
            email="partner@test.local",
            password="TestPassword123!",
        )

        cls.partner_employee = Employee.objects.create(
            user=cls.partner_user,
            branch=cls.branch,
            department=cls.partner_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.partner_user,
            role=cls.partner_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # SECOND PARTNER USER
        # ========================================================

        cls.other_partner_user = User.objects.create_user(
            username="other_partner_user_test",
            email="otherpartner@test.local",
            password="TestPassword123!",
        )

        cls.other_partner_employee = Employee.objects.create(
            user=cls.other_partner_user,
            branch=cls.other_branch,
            department=cls.partner_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.other_partner_user,
            role=cls.partner_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # PARTNER HOD - DEPARTMENT SCOPE
        # ========================================================

        cls.partner_hod = User.objects.create_user(
            username="partner_hod_test",
            email="partnerhod@test.local",
            password="TestPassword123!",
        )

        cls.partner_hod_employee = Employee.objects.create(
            user=cls.partner_hod,
            branch=cls.branch,
            department=cls.partner_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.partner_hod,
            role=cls.department_head_role,
            scope_type=UserRole.ScopeType.DEPARTMENT,
            department=cls.partner_department,
        )

        # ========================================================
        # UNRELATED MARKETING USER
        # ========================================================

        cls.marketing_user = User.objects.create_user(
            username="partner_marketing_test",
            email="partnermarketing@test.local",
            password="TestPassword123!",
        )

        cls.marketing_employee = Employee.objects.create(
            user=cls.marketing_user,
            branch=cls.branch,
            department=cls.marketing_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.marketing_user,
            role=cls.marketing_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # SUPERUSER
        # ========================================================

        cls.superuser = User.objects.create_superuser(
            username="partner_superuser_test",
            email="partnersuperuser@test.local",
            password="TestPassword123!",
        )

        # ========================================================
        # INSTITUTIONS
        # ========================================================

        cls.institution = Institution.objects.create(
            name="Partner Test University",
            short_name="PTU",
            code="PTU-TEST",
            state="Tamil Nadu",
            city="Chennai",
            is_active=True,
        )

        cls.other_institution = Institution.objects.create(
            name="Partner Other University",
            short_name="POU",
            code="POU-TEST",
            state="Kerala",
            city="Kochi",
            is_active=True,
        )

        # ========================================================
        # PROGRAMS
        # ========================================================

        cls.program = Program.objects.create(
            institution=cls.institution,
            name="Bachelor of Commerce Partner Test",
            code="BCOM-PARTNER",
            level=Program.Level.UG,
            duration_years=3,
            duration_semesters=6,
            is_credit_transfer_available=True,
            is_active=True,
        )

        cls.other_program = Program.objects.create(
            institution=cls.other_institution,
            name="Bachelor of Arts Partner Test",
            code="BA-PARTNER",
            level=Program.Level.UG,
            duration_years=3,
            duration_semesters=6,
            is_credit_transfer_available=True,
            is_active=True,
        )

        # ========================================================
        # OWN PARTNER
        # ========================================================

        cls.partner = Partner.objects.create(
            name="BEST Partner Centre One",
            partner_type=Partner.PartnerType.EDUCATION_CENTRE,
            status=Partner.Status.ACTIVE,
            contact_person="Partner Contact One",
            phone_number="9300000001",
            email="centre1@test.local",
            city="Chennai",
            state="Tamil Nadu",
            territory="Chennai",
            relationship_manager=cls.partner_user,
            created_by=cls.superuser,
        )

        PartnerActivity.objects.create(
            partner=cls.partner,
            activity_type=PartnerActivity.ActivityType.CREATED,
            description="Partner test record created.",
            performed_by=cls.superuser,
        )

        # ========================================================
        # OTHER PARTNER
        # ========================================================

        cls.other_partner = Partner.objects.create(
            name="BEST Partner Centre Two",
            partner_type=Partner.PartnerType.EDUCATION_CENTRE,
            status=Partner.Status.ACTIVE,
            contact_person="Partner Contact Two",
            phone_number="9300000002",
            email="centre2@test.local",
            city="Kochi",
            state="Kerala",
            territory="Kerala",
            relationship_manager=cls.other_partner_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # PROSPECT PARTNER
        # ========================================================

        cls.prospect_partner = Partner.objects.create(
            name="BEST Prospect Partner",
            partner_type=Partner.PartnerType.CONSULTANT,
            status=Partner.Status.PROSPECT,
            phone_number="9300000003",
            city="Chennai",
            relationship_manager=cls.partner_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # PROGRAM ACCESS
        # ========================================================

        cls.program_access = PartnerProgramAccess.objects.create(
            partner=cls.partner,
            institution=cls.institution,
            program=cls.program,
            is_active=True,
        )

        # ========================================================
        # EXISTING PARTNER CASE
        # ========================================================

        cls.partner_case = PartnerCase.objects.create(
            partner=cls.partner,
            applicant_name="Partner Case Student",
            phone_number="9400000001",
            institution=cls.institution,
            program=cls.program,
            vertical=Admission.Vertical.REGULAR,
            status=PartnerCase.Status.RECEIVED,
            assigned_to=cls.partner_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # OTHER PARTNER CASE
        # ========================================================

        cls.other_partner_case = PartnerCase.objects.create(
            partner=cls.other_partner,
            applicant_name="Other Partner Case Student",
            phone_number="9400000002",
            institution=cls.institution,
            program=cls.program,
            vertical=Admission.Vertical.REGULAR,
            status=PartnerCase.Status.RECEIVED,
            assigned_to=cls.other_partner_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # PARTNER ADMISSIONS
        # ========================================================

        cls.partner_admission = Admission.objects.create(
            applicant_name="Partner Admission Student",
            phone_number="9500000001",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.PARTNER,
            partner=cls.partner,
            status=Admission.Status.DOCUMENT_PENDING,
            assigned_to=cls.partner_user,
            created_by=cls.superuser,
        )

        cls.other_partner_admission = Admission.objects.create(
            applicant_name="Other Partner Admission",
            phone_number="9500000002",
            institution=cls.institution,
            program=cls.program,
            academic_session="2026-2027",
            vertical=Admission.Vertical.REGULAR,
            channel=Admission.Channel.PARTNER,
            partner=cls.other_partner,
            status=Admission.Status.DOCUMENT_PENDING,
            assigned_to=cls.other_partner_user,
            created_by=cls.superuser,
        )

        # ========================================================
        # COMMISSION RULE
        # ========================================================

        cls.fixed_rule = CommissionRule.objects.create(
            partner=cls.partner,
            institution=cls.institution,
            program=cls.program,
            vertical=Admission.Vertical.REGULAR,
            commission_type=CommissionRule.CommissionType.FIXED,
            value=Decimal("3000.00"),
            is_active=True,
        )

        # ========================================================
        # OPEN ISSUE
        # ========================================================

        cls.issue = PartnerIssue.objects.create(
            partner=cls.partner,
            partner_case=cls.partner_case,
            subject="Existing Partner Issue",
            description="Existing issue for API testing.",
            priority=PartnerIssue.Priority.MEDIUM,
            status=PartnerIssue.Status.OPEN,
            assigned_to=cls.partner_user,
        )

    # ============================================================
    # HELPER
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    # ============================================================
    # AUTHENTICATION
    # ============================================================

    def test_anonymous_user_cannot_access_partners(self):
        response = self.client.get("/api/partners/")

        self.assertIn(
            response.status_code,
            [401, 403],
        )

    def test_jwt_authentication_works(self):
        token = AccessToken.for_user(self.partner_user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(token)}"
        )

        response = self.client.get("/api/partners/")

        self.assertEqual(response.status_code, 200)

    def test_invalid_jwt_is_rejected(self):
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer invalid-token"
        )

        response = self.client.get("/api/partners/")

        self.assertEqual(response.status_code, 401)

    def test_unrelated_role_cannot_access_partner_api(self):
        self.authenticate(self.marketing_user)

        response = self.client.get("/api/partners/")

        self.assertEqual(response.status_code, 403)

    # ============================================================
    # PARTNER SCOPE
    # ============================================================

    def test_own_scope_user_sees_only_own_partners(self):
        self.authenticate(self.partner_user)

        response = self.client.get("/api/partners/")

        self.assertEqual(response.status_code, 200)

        ids = {
            item["partner_id"]
            for item in response.json()
        }

        self.assertIn(
            self.partner.partner_id,
            ids,
        )

        self.assertIn(
            self.prospect_partner.partner_id,
            ids,
        )

        self.assertNotIn(
            self.other_partner.partner_id,
            ids,
        )

    def test_own_scope_cannot_retrieve_other_partner(self):
        self.authenticate(self.partner_user)

        response = self.client.get(
            f"/api/partners/{self.other_partner.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_department_hod_sees_department_partners(self):
        self.authenticate(self.partner_hod)

        response = self.client.get("/api/partners/")

        self.assertEqual(response.status_code, 200)

        ids = {
            item["partner_id"]
            for item in response.json()
        }

        self.assertIn(
            self.partner.partner_id,
            ids,
        )

        self.assertIn(
            self.other_partner.partner_id,
            ids,
        )

    def test_superuser_sees_all_partners(self):
        self.authenticate(self.superuser)

        response = self.client.get("/api/partners/")

        self.assertEqual(response.status_code, 200)

        ids = {
            item["partner_id"]
            for item in response.json()
        }

        self.assertIn(self.partner.partner_id, ids)
        self.assertIn(self.other_partner.partner_id, ids)

    # ============================================================
    # SENSITIVE DATA
    # ============================================================

    def test_partner_api_does_not_expose_kyc_numbers(self):
        self.partner.aadhaar_number = "123412341234"
        self.partner.pan_number = "ABCDE1234F"
        self.partner.gst_number = "GST-TEST-001"
        self.partner.save()

        self.authenticate(self.partner_user)

        response = self.client.get(
            f"/api/partners/{self.partner.id}/"
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertNotIn("aadhaar_number", data)
        self.assertNotIn("pan_number", data)
        self.assertNotIn("gst_number", data)

    # ============================================================
    # PARTNER CREATION
    # ============================================================

    def test_partner_can_be_created(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            "/api/partners/",
            {
                "name": "New Partner Centre",
                "phone_number": "9600000001",
                "partner_type": "EDUCATION_CENTRE",
                "contact_person": "New Partner Contact",
                "email": "newpartner@test.local",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "territory": "Chennai South",
                "organization_name": "New Education Centre",
                "notes": "Created from API test.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        partner = Partner.objects.get(
            name="New Partner Centre"
        )

        self.assertTrue(
            partner.partner_id.startswith("BPT-")
        )

        self.assertEqual(
            partner.relationship_manager,
            self.partner_user,
        )

        self.assertTrue(
            partner.activities.filter(
                activity_type=PartnerActivity.ActivityType.CREATED
            ).exists()
        )

    # ============================================================
    # STATUS
    # ============================================================

    def test_partner_status_can_be_changed(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.prospect_partner.id}/status/",
            {
                "status": "ONBOARDING",
                "notes": "KYC process started.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.prospect_partner.refresh_from_db()

        self.assertEqual(
            self.prospect_partner.status,
            Partner.Status.ONBOARDING,
        )

        self.assertTrue(
            self.prospect_partner.activities.filter(
                activity_type=(
                    PartnerActivity.ActivityType.STATUS_CHANGE
                )
            ).exists()
        )

    # ============================================================
    # NOTES
    # ============================================================

    def test_partner_note_creates_activity(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/note/",
            {
                "description":
                    "Partner requested updated course information."
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            self.partner.activities.filter(
                activity_type=PartnerActivity.ActivityType.NOTE,
                description=(
                    "Partner requested updated course information."
                ),
            ).exists()
        )

    def test_empty_partner_note_is_rejected(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/note/",
            {"description": "   "},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    # ============================================================
    # DOCUMENTS
    # ============================================================

    def test_partner_document_can_be_added(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/documents/",
            {
                "document_type": "PAN",
                "title": "PAN Card",
                "notes": "Awaiting file upload.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        document = PartnerDocument.objects.get(
            partner=self.partner,
            document_type=PartnerDocument.DocumentType.PAN,
        )

        self.assertEqual(
            document.status,
            PartnerDocument.Status.PENDING,
        )

    def test_partner_document_can_be_verified(self):
        document = PartnerDocument.objects.create(
            partner=self.partner,
            document_type=PartnerDocument.DocumentType.GST,
            title="GST Certificate",
            status=PartnerDocument.Status.RECEIVED,
        )

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"documents/{document.id}/verify/"
            ),
            {
                "notes": "GST verified."
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        document.refresh_from_db()

        self.assertEqual(
            document.status,
            PartnerDocument.Status.VERIFIED,
        )

        self.assertEqual(
            document.verified_by,
            self.partner_user,
        )

        self.assertIsNotNone(document.verified_at)

    def test_partner_document_can_be_rejected(self):
        document = PartnerDocument.objects.create(
            partner=self.partner,
            document_type=PartnerDocument.DocumentType.ADDRESS_PROOF,
            title="Address Proof",
            status=PartnerDocument.Status.RECEIVED,
        )

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"documents/{document.id}/reject/"
            ),
            {
                "reason": "Document is unclear."
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        document.refresh_from_db()

        self.assertEqual(
            document.status,
            PartnerDocument.Status.REJECTED,
        )

        self.assertEqual(
            document.rejection_reason,
            "Document is unclear.",
        )

    # ============================================================
    # PROGRAM ACCESS
    # ============================================================

    def test_program_access_can_be_granted(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/program-access/",
            {
                "institution_id": str(
                    self.other_institution.id
                ),
                "program_id": str(
                    self.other_program.id
                ),
                "notes": "New authorized program.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            PartnerProgramAccess.objects.filter(
                partner=self.partner,
                institution=self.other_institution,
                program=self.other_program,
                is_active=True,
            ).exists()
        )

    def test_wrong_institution_program_pair_is_rejected(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/program-access/",
            {
                "institution_id": str(self.institution.id),
                "program_id": str(self.other_program.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    # ============================================================
    # PARTNER CASE
    # ============================================================

    def test_active_partner_can_create_case(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/cases/",
            {
                "applicant_name": "New Partner Applicant",
                "phone_number": "9700000001",
                "institution_id": str(self.institution.id),
                "program_id": str(self.program.id),
                "vertical": "REGULAR",
                "partner_reference_number": "REF-001",
                "assigned_to_id": str(self.partner_user.id),
                "notes": "New case.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        case = PartnerCase.objects.get(
            applicant_name="New Partner Applicant"
        )

        self.assertTrue(case.case_id.startswith("PC-"))

        self.assertEqual(
            case.partner,
            self.partner,
        )

        self.assertEqual(
            case.status,
            PartnerCase.Status.RECEIVED,
        )

    def test_non_active_partner_cannot_create_case(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.prospect_partner.id}/cases/",
            {
                "applicant_name": "Prospect Case Applicant",
                "phone_number": "9700000002",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_case_for_unauthorized_program_is_rejected(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/cases/",
            {
                "applicant_name": "Unauthorized Applicant",
                "phone_number": "9700000003",
                "institution_id": str(
                    self.other_institution.id
                ),
                "program_id": str(
                    self.other_program.id
                ),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    # ============================================================
    # CASE -> LEAD
    # ============================================================

    def test_partner_case_can_create_lead(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"cases/{self.partner_case.id}/create-lead/"
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        lead = Lead.objects.get(
            partner=self.partner,
            partner_reference_number=self.partner_case.case_id,
        )

        self.assertEqual(
            lead.channel,
            Lead.Channel.PARTNER,
        )

        self.assertEqual(
            lead.partner,
            self.partner,
        )

        self.assertEqual(
            lead.assigned_to,
            self.partner_user,
        )

        self.assertEqual(
            lead.interested_course,
            self.program.name,
        )

    def test_duplicate_case_to_lead_is_rejected(self):
        Lead.objects.create(
            name=self.partner_case.applicant_name,
            phone_number=self.partner_case.phone_number,
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.PARTNER,
            partner=self.partner,
            partner_reference_number=self.partner_case.case_id,
            source="Partner Network",
            status=Lead.Status.NEW,
            created_by=self.superuser,
        )

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"cases/{self.partner_case.id}/create-lead/"
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    # ============================================================
    # CASE -> ADMISSION
    # ============================================================

    def test_case_can_link_to_same_partner_admission(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"cases/{self.partner_case.id}/link-admission/"
            ),
            {
                "admission_id": str(
                    self.partner_admission.id
                )
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.partner_case.refresh_from_db()

        self.assertEqual(
            self.partner_case.admission,
            self.partner_admission,
        )

        self.assertEqual(
            self.partner_case.status,
            PartnerCase.Status.ADMISSION_CREATED,
        )

    def test_cross_partner_admission_link_is_rejected(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"cases/{self.partner_case.id}/link-admission/"
            ),
            {
                "admission_id": str(
                    self.other_partner_admission.id
                )
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        self.partner_case.refresh_from_db()

        self.assertIsNone(
            self.partner_case.admission
        )

    # ============================================================
    # ISSUES
    # ============================================================

    def test_partner_issue_can_be_created(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/issues/",
            {
                "subject": "Certificate Delay",
                "description":
                    "Partner requested certificate status.",
                "priority": "HIGH",
                "partner_case_id": str(
                    self.partner_case.id
                ),
                "assigned_to_id": str(
                    self.partner_user.id
                ),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        issue = PartnerIssue.objects.get(
            partner=self.partner,
            subject="Certificate Delay",
        )

        self.assertEqual(
            issue.priority,
            PartnerIssue.Priority.HIGH,
        )

        self.assertEqual(
            issue.assigned_to,
            self.partner_user,
        )

    def test_cross_partner_case_cannot_be_used_for_issue(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/issues/",
            {
                "subject": "Invalid Cross Partner Issue",
                "description": "Should fail.",
                "partner_case_id": str(
                    self.other_partner_case.id
                ),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    # ============================================================
    # ACTIVITY TIMELINE
    # ============================================================

    def test_partner_activity_timeline_is_available(self):
        self.authenticate(self.partner_user)

        response = self.client.get(
            f"/api/partners/{self.partner.id}/activities/"
        )

        self.assertEqual(response.status_code, 200)

        self.assertGreaterEqual(
            len(response.json()),
            1,
        )

    # ============================================================
    # COMMISSION
    # ============================================================

    def test_fixed_commission_transaction_can_be_created(self):
        self.authenticate(self.superuser)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/commissions/",
            {
                "rule_id": str(self.fixed_rule.id),
                "base_amount": "25000.00",
                "partner_case_id": str(
                    self.partner_case.id
                ),
                "admission_id": str(
                    self.partner_admission.id
                ),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        transaction = CommissionTransaction.objects.get(
            partner=self.partner,
            rule=self.fixed_rule,
        )

        self.assertEqual(
            transaction.commission_amount,
            Decimal("3000.00"),
        )

        self.assertEqual(
            transaction.status,
            CommissionTransaction.Status.EARNED,
        )

    def test_percentage_commission_calculation(self):
        rule = CommissionRule.objects.create(
            partner=self.partner,
            commission_type=(
                CommissionRule.CommissionType.PERCENTAGE
            ),
            value=Decimal("10.00"),
            is_active=True,
        )

        self.authenticate(self.superuser)

        response = self.client.post(
            f"/api/partners/{self.partner.id}/commissions/",
            {
                "rule_id": str(rule.id),
                "base_amount": "50000.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        transaction = CommissionTransaction.objects.get(
            partner=self.partner,
            rule=rule,
        )

        self.assertEqual(
            transaction.commission_amount,
            Decimal("5000.00"),
        )

    def test_full_commission_state_machine(self):
        transaction = CommissionTransaction.objects.create(
            partner=self.partner,
            rule=self.fixed_rule,
            base_amount=Decimal("25000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.EARNED,
        )

        self.authenticate(self.superuser)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"commissions/{transaction.id}/approve/"
            ),
            {
                "notes": "Commission approved."
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        transaction.refresh_from_db()

        self.assertEqual(
            transaction.status,
            CommissionTransaction.Status.APPROVED,
        )

        self.assertEqual(
            transaction.approved_by,
            self.superuser,
        )

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"commissions/{transaction.id}/payable/"
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        transaction.refresh_from_db()

        self.assertEqual(
            transaction.status,
            CommissionTransaction.Status.PAYABLE,
        )

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"commissions/{transaction.id}/paid/"
            ),
            {
                "payment_reference": "BANK-PARTNER-001"
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        transaction.refresh_from_db()

        self.assertEqual(
            transaction.status,
            CommissionTransaction.Status.PAID,
        )

        self.assertEqual(
            transaction.payment_reference,
            "BANK-PARTNER-001",
        )

        self.assertIsNotNone(transaction.paid_at)

    def test_invalid_commission_transition_is_rejected(self):
        transaction = CommissionTransaction.objects.create(
            partner=self.partner,
            rule=self.fixed_rule,
            base_amount=Decimal("25000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.EARNED,
        )

        self.authenticate(self.superuser)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"commissions/{transaction.id}/paid/"
            ),
            {
                "payment_reference": "INVALID-001"
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        transaction.refresh_from_db()

        self.assertEqual(
            transaction.status,
            CommissionTransaction.Status.EARNED,
        )

    # ============================================================
    # QUEUES
    # ============================================================

    def test_active_partner_queue(self):
        self.authenticate(self.partner_user)

        response = self.client.get(
            "/api/partners/active/"
        )

        self.assertEqual(response.status_code, 200)

        ids = {
            item["partner_id"]
            for item in response.json()
        }

        self.assertIn(
            self.partner.partner_id,
            ids,
        )

        self.assertNotIn(
            self.prospect_partner.partner_id,
            ids,
        )

    def test_open_case_queue(self):
        self.authenticate(self.partner_user)

        response = self.client.get(
            "/api/partners/open-cases/"
        )

        self.assertEqual(response.status_code, 200)

        ids = {
            item["case_id"]
            for item in response.json()
        }

        self.assertIn(
            self.partner_case.case_id,
            ids,
        )

        self.assertNotIn(
            self.other_partner_case.case_id,
            ids,
        )

    def test_open_issue_queue(self):
        self.authenticate(self.partner_user)

        response = self.client.get(
            "/api/partners/open-issues/"
        )

        self.assertEqual(response.status_code, 200)

        subjects = {
            item["subject"]
            for item in response.json()
        }

        self.assertIn(
            self.issue.subject,
            subjects,
        )
        # ============================================================
    # PROGRAM ACCESS LIFECYCLE
    # ============================================================

    def test_program_access_can_be_deactivated(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"program-access/{self.program_access.id}/status/"
            ),
            {
                "is_active": False,
                "notes": "Temporarily disabled.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.program_access.refresh_from_db()

        self.assertFalse(
            self.program_access.is_active
        )

        self.assertEqual(
            self.program_access.notes,
            "Temporarily disabled.",
        )

        self.assertTrue(
            self.partner.activities.filter(
                activity_type=(
                    PartnerActivity.ActivityType.PROGRAM_ACCESS
                ),
                description__icontains="deactivated",
            ).exists()
        )

    def test_program_access_can_be_reactivated(self):
        self.program_access.is_active = False
        self.program_access.save()

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"program-access/{self.program_access.id}/status/"
            ),
            {
                "is_active": True,
                "notes": "Access restored.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.program_access.refresh_from_db()

        self.assertTrue(
            self.program_access.is_active
        )

    def test_cross_partner_program_access_cannot_be_changed(self):
        other_access = PartnerProgramAccess.objects.create(
            partner=self.other_partner,
            institution=self.other_institution,
            program=self.other_program,
            is_active=True,
        )

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"program-access/{other_access.id}/status/"
            ),
            {
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

        other_access.refresh_from_db()

        self.assertTrue(other_access.is_active)

    # ============================================================
    # ISSUE LIFECYCLE
    # ============================================================

    def test_partner_issue_status_can_be_changed(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"issues/{self.issue.id}/status/"
            ),
            {
                "status": "IN_PROGRESS",
                "notes": "Partner team is reviewing the issue.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.issue.refresh_from_db()

        self.assertEqual(
            self.issue.status,
            PartnerIssue.Status.IN_PROGRESS,
        )

        self.assertIsNone(
            self.issue.resolved_at
        )

        self.assertTrue(
            self.partner.activities.filter(
                activity_type=PartnerActivity.ActivityType.ISSUE,
                description__icontains="IN_PROGRESS",
            ).exists()
        )

    def test_resolving_partner_issue_sets_resolved_at(self):
        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"issues/{self.issue.id}/status/"
            ),
            {
                "status": "RESOLVED",
                "notes": "Issue resolved successfully.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.issue.refresh_from_db()

        self.assertEqual(
            self.issue.status,
            PartnerIssue.Status.RESOLVED,
        )

        self.assertIsNotNone(
            self.issue.resolved_at
        )

    def test_reopening_partner_issue_clears_resolved_at(self):
       

        self.issue.status = PartnerIssue.Status.RESOLVED
        self.issue.resolved_at = timezone.now()
        self.issue.save()

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"issues/{self.issue.id}/status/"
            ),
            {
                "status": "IN_PROGRESS",
                "notes": "Issue reopened.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.issue.refresh_from_db()

        self.assertEqual(
            self.issue.status,
            PartnerIssue.Status.IN_PROGRESS,
        )

        self.assertIsNone(
            self.issue.resolved_at
        )

    def test_cross_partner_issue_status_cannot_be_changed(self):
        other_issue = PartnerIssue.objects.create(
            partner=self.other_partner,
            subject="Other Partner Issue",
            description="Should remain untouched.",
            status=PartnerIssue.Status.OPEN,
        )

        self.authenticate(self.partner_user)

        response = self.client.post(
            (
                f"/api/partners/{self.partner.id}/"
                f"issues/{other_issue.id}/status/"
            ),
            {
                "status": "RESOLVED",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

        other_issue.refresh_from_db()

        self.assertEqual(
            other_issue.status,
            PartnerIssue.Status.OPEN,
        )
        # ============================================================
    # OPERATIONAL SUMMARY
    # ============================================================

    def test_partner_operational_summary_respects_scope(self):
        self.authenticate(self.partner_user)

        response = self.client.get(
            "/api/partners/summary/"
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertEqual(
            data["partners"]["total"],
            2,
        )

        self.assertEqual(
            data["partners"]["active"],
            1,
        )

        self.assertEqual(
            data["partners"]["prospects"],
            1,
        )

        self.assertEqual(
            data["cases"]["total"],
            1,
        )

        self.assertEqual(
            data["issues"]["total"],
            1,
        )

    def test_superuser_partner_summary_sees_all_scope(self):
        self.authenticate(self.superuser)

        response = self.client.get(
            "/api/partners/summary/"
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertEqual(
            data["partners"]["total"],
            3,
        )

        self.assertEqual(
            data["partners"]["active"],
            2,
        )

        self.assertEqual(
            data["cases"]["total"],
            2,
        )

    # ============================================================
    # COMMISSION QUEUE
    # ============================================================

    def test_commission_queue_returns_pending_commissions(self):
        transaction = CommissionTransaction.objects.create(
            partner=self.partner,
            rule=self.fixed_rule,
            base_amount=Decimal("25000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.EARNED,
        )

        self.authenticate(self.superuser)

        response = self.client.get(
            "/api/partners/commission-queue/"
        )

        self.assertEqual(response.status_code, 200)

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertIn(
            str(transaction.id),
            ids,
        )

    def test_paid_commission_is_not_in_pending_queue(self):
        transaction = CommissionTransaction.objects.create(
            partner=self.partner,
            rule=self.fixed_rule,
            base_amount=Decimal("25000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.PAID,
        )

        self.authenticate(self.superuser)

        response = self.client.get(
            "/api/partners/commission-queue/"
        )

        self.assertEqual(response.status_code, 200)

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertNotIn(
            str(transaction.id),
            ids,
        )

    def test_commission_queue_can_filter_status(self):
        earned = CommissionTransaction.objects.create(
            partner=self.partner,
            rule=self.fixed_rule,
            base_amount=Decimal("25000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.EARNED,
        )

        approved = CommissionTransaction.objects.create(
            partner=self.partner,
            rule=self.fixed_rule,
            base_amount=Decimal("30000.00"),
            commission_amount=Decimal("3000.00"),
            status=CommissionTransaction.Status.APPROVED,
        )

        self.authenticate(self.superuser)

        response = self.client.get(
            "/api/partners/commission-queue/"
            "?status=APPROVED"
        )

        self.assertEqual(response.status_code, 200)

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertIn(str(approved.id), ids)
        self.assertNotIn(str(earned.id), ids)

    def test_invalid_commission_queue_status_is_rejected(self):
        self.authenticate(self.superuser)

        response = self.client.get(
            "/api/partners/commission-queue/"
            "?status=INVALID"
        )

        self.assertEqual(
            response.status_code,
            400,
        )
from datetime import date

from django.test import TestCase

from admissions.models import Admission, Institution, Program
from core.models import SystemSettings
from hr.models import Employee
from leads.models import Lead
from organization.models import Trust, BusinessUnit, Branch, Department
from partners.models import Partner, PartnerCase
from students.models import Student


class DynamicNumberingIntegrationTests(TestCase):
    """
    Integration tests for the central BEOIS numbering engine.

    These tests use Django's temporary test database only.
    They do not modify the real BEOIS database.
    """

    def setUp(self):
        self.settings = SystemSettings.get_settings()

    def update_settings(self, **kwargs):
        for field, value in kwargs.items():
            setattr(self.settings, field, value)

        self.settings.save()
        self.settings.refresh_from_db()

    def create_employee_organization(self):
        trust = Trust.objects.create(
            name="Numbering Test Trust",
            short_name="NTT",
        )

        business_unit = BusinessUnit.objects.create(
            trust=trust,
            name="Numbering Test Business Unit",
            code="NTBU",
        )

        branch = Branch.objects.create(
            business_unit=business_unit,
            name="Numbering Test Branch",
            code="NTBR",
            is_head_office=True,
        )

        department = Department.objects.create(
            branch=branch,
            name="Numbering Test Department",
            code="NTDEP",
        )

        return branch, department

    # ============================================================
    # LEAD
    # ============================================================

    def create_lead(self, name):
        return Lead.objects.create(
            name=name,
            phone_number="9000000000",
        )

    def test_lead_uses_configured_prefix(self):
        self.update_settings(
            lead_prefix="LTEST",
        )

        lead = self.create_lead(
            "Numbering Lead",
        )

        self.assertEqual(
            lead.lead_id,
            "LTEST-00001",
        )

    def test_lead_sequence_continues_after_prefix_change(self):
        first = self.create_lead(
            "First Lead",
        )

        self.assertEqual(
            first.lead_id,
            "LD-00001",
        )

        self.update_settings(
            lead_prefix="NEWLD",
        )

        second = self.create_lead(
            "Second Lead",
        )

        self.assertEqual(
            second.lead_id,
            "NEWLD-00002",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.lead_id,
            "LD-00001",
        )

    # ============================================================
    # PARTNER
    # ============================================================

    def create_partner(self, name):
        return Partner.objects.create(
            name=name,
            phone_number="9111111111",
        )

    def test_partner_uses_configured_prefix(self):
        self.update_settings(
            partner_prefix="PTR",
        )

        partner = self.create_partner(
            "Test Partner",
        )

        self.assertEqual(
            partner.partner_id,
            "PTR-00001",
        )

    def test_partner_sequence_continues_after_prefix_change(self):
        first = self.create_partner(
            "First Partner",
        )

        self.assertEqual(
            first.partner_id,
            "BPT-00001",
        )

        self.update_settings(
            partner_prefix="PTR",
        )

        second = self.create_partner(
            "Second Partner",
        )

        self.assertEqual(
            second.partner_id,
            "PTR-00002",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.partner_id,
            "BPT-00001",
        )

    # ============================================================
    # PARTNER CASE
    # ============================================================

    def test_partner_case_uses_configured_prefix(self):
        partner = self.create_partner(
            "Case Partner",
        )

        self.update_settings(
            partner_case_prefix="CASE",
        )

        partner_case = PartnerCase.objects.create(
            partner=partner,
            applicant_name="Partner Applicant",
            phone_number="9222222222",
        )

        self.assertEqual(
            partner_case.case_id,
            "CASE-00001",
        )

    def test_partner_case_sequence_continues_after_prefix_change(self):
        partner = self.create_partner(
            "Case Partner",
        )

        first = PartnerCase.objects.create(
            partner=partner,
            applicant_name="Applicant One",
            phone_number="9222222222",
        )

        self.assertEqual(
            first.case_id,
            "PC-00001",
        )

        self.update_settings(
            partner_case_prefix="CASE",
        )

        second = PartnerCase.objects.create(
            partner=partner,
            applicant_name="Applicant Two",
            phone_number="9333333333",
        )

        self.assertEqual(
            second.case_id,
            "CASE-00002",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.case_id,
            "PC-00001",
        )

    # ============================================================
    # EMPLOYEE
    # ============================================================

    def test_employee_uses_configured_prefix(self):
        branch, department = self.create_employee_organization()

        self.update_settings(
            employee_prefix="STAFF",
        )

        employee = Employee.objects.create(
            branch=branch,
            department=department,
            designation="Test Employee",
            date_of_joining=date.today(),
        )

        self.assertEqual(
            employee.employee_id,
            "STAFF-00001",
        )

    def test_employee_sequence_continues_after_prefix_change(self):
        branch, department = self.create_employee_organization()

        first = Employee.objects.create(
            branch=branch,
            department=department,
            designation="First Employee",
            date_of_joining=date.today(),
        )

        self.assertEqual(
            first.employee_id,
            "EMP-00001",
        )

        self.update_settings(
            employee_prefix="STAFF",
        )

        second = Employee.objects.create(
            branch=branch,
            department=department,
            designation="Second Employee",
            date_of_joining=date.today(),
        )

        self.assertEqual(
            second.employee_id,
            "STAFF-00002",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.employee_id,
            "EMP-00001",
        )

    # ============================================================
    # GLOBAL PADDING
    # ============================================================

    def test_identifier_padding_setting_is_respected(self):
        self.update_settings(
            lead_prefix="LD",
            identifier_padding=7,
        )

        lead = self.create_lead(
            "Padding Test",
        )

        self.assertEqual(
            lead.lead_id,
            "LD-0000001",
        )

    # ============================================================
    # HISTORICAL / MIXED PREFIXES
    # ============================================================

    def test_highest_number_is_detected_across_old_prefixes(self):
        Lead.objects.create(
            lead_id="OLD-00027",
            name="Historical Lead",
            phone_number="9444444444",
        )

        self.update_settings(
            lead_prefix="LD",
        )

        lead = self.create_lead(
            "New Lead",
        )

        self.assertEqual(
            lead.lead_id,
            "LD-00028",
        )

    # ============================================================
    # EXISTING ID IMMUTABILITY
    # ============================================================

    def test_existing_identifier_is_not_regenerated_on_update(self):
        lead = self.create_lead(
            "Original Name",
        )

        original_id = lead.lead_id

        self.update_settings(
            lead_prefix="NEW",
        )

        lead.name = "Updated Name"
        lead.save()
        lead.refresh_from_db()

        self.assertEqual(
            lead.lead_id,
            original_id,
        )
        # ============================================================
    # ADMISSION + STUDENT LIFECYCLE
    # ============================================================

    def create_academic_structure(self):
        institution = Institution.objects.create(
            name="Numbering Test University",
            code="NTU",
        )

        program = Program.objects.create(
            institution=institution,
            name="Bachelor of Business Administration",
            code="BBA",
        )

        return institution, program

    def create_admission(
        self,
        institution,
        program,
        applicant_name,
        phone_number,
    ):
        return Admission.objects.create(
            applicant_name=applicant_name,
            phone_number=phone_number,
            institution=institution,
            program=program,
        )

    def create_student(
        self,
        admission,
        name,
        phone_number,
    ):
        return Student.objects.create(
            admission=admission,
            name=name,
            phone_number=phone_number,
            institution=admission.institution,
            program=admission.program,
            vertical=admission.vertical,
            channel=admission.channel,
        )

    def test_admission_uses_configured_prefix(self):
        institution, program = self.create_academic_structure()

        self.update_settings(
            admission_prefix="ADM",
        )

        admission = self.create_admission(
            institution,
            program,
            "Admission Applicant",
            "9555555551",
        )

        self.assertEqual(
            admission.admission_id,
            "ADM-00001",
        )

    def test_admission_sequence_continues_after_prefix_change(self):
        institution, program = self.create_academic_structure()

        first = self.create_admission(
            institution,
            program,
            "Applicant One",
            "9555555551",
        )

        self.assertEqual(
            first.admission_id,
            "AD-00001",
        )

        self.update_settings(
            admission_prefix="ADMISSION",
        )

        second = self.create_admission(
            institution,
            program,
            "Applicant Two",
            "9555555552",
        )

        self.assertEqual(
            second.admission_id,
            "ADMISSION-00002",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.admission_id,
            "AD-00001",
        )

    def test_student_uses_configured_prefix(self):
        institution, program = self.create_academic_structure()

        admission = self.create_admission(
            institution,
            program,
            "Student Applicant",
            "9666666661",
        )

        self.update_settings(
            student_prefix="STD",
        )

        student = self.create_student(
            admission,
            "Student One",
            "9666666661",
        )

        self.assertEqual(
            student.student_id,
            "STD-00001",
        )

    def test_student_sequence_continues_after_prefix_change(self):
        institution, program = self.create_academic_structure()

        admission_one = self.create_admission(
            institution,
            program,
            "Student Applicant One",
            "9666666661",
        )

        first = self.create_student(
            admission_one,
            "Student One",
            "9666666661",
        )

        self.assertEqual(
            first.student_id,
            "ST-00001",
        )

        self.update_settings(
            student_prefix="STUDENT",
        )

        admission_two = self.create_admission(
            institution,
            program,
            "Student Applicant Two",
            "9666666662",
        )

        second = self.create_student(
            admission_two,
            "Student Two",
            "9666666662",
        )

        self.assertEqual(
            second.student_id,
            "STUDENT-00002",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.student_id,
            "ST-00001",
        )

    def test_complete_admission_to_student_numbering_lifecycle(self):
        institution, program = self.create_academic_structure()

        admission_one = self.create_admission(
            institution,
            program,
            "Lifecycle Applicant One",
            "9777777771",
        )

        self.assertEqual(
            admission_one.admission_id,
            "AD-00001",
        )

        student_one = self.create_student(
            admission_one,
            "Lifecycle Student One",
            "9777777771",
        )

        self.assertEqual(
            student_one.student_id,
            "ST-00001",
        )

        self.update_settings(
            admission_prefix="ADMISSION",
            student_prefix="STUDENT",
        )

        admission_two = self.create_admission(
            institution,
            program,
            "Lifecycle Applicant Two",
            "9777777772",
        )

        self.assertEqual(
            admission_two.admission_id,
            "ADMISSION-00002",
        )

        student_two = self.create_student(
            admission_two,
            "Lifecycle Student Two",
            "9777777772",
        )

        self.assertEqual(
            student_two.student_id,
            "STUDENT-00002",
        )

        admission_one.refresh_from_db()
        student_one.refresh_from_db()

        self.assertEqual(
            admission_one.admission_id,
            "AD-00001",
        )

        self.assertEqual(
            student_one.student_id,
            "ST-00001",
        )
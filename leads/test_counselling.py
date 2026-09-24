from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from admissions.models import (
    Admission,
    Institution,
    Program,
    ProgramFeePlan,
    ProgramInternalFinance,
)
from admissions.services import (
    create_admission_from_lead,
)
from organization.models import (
    Branch,
    BusinessUnit,
    Trust,
)

from leads.models import (
    CallLog,
    Lead,
    LeadAppointment,
    LeadAppointmentHistory,
    LeadQualification,
)
from leads.serializers import (
    LeadCourseOptionSerializer,
)
from leads.services import (
    change_lead_appointment_status,
    mark_lead_qualified,
    record_call,
    save_lead_qualification,
    schedule_lead_appointment,
)


User = get_user_model()


class TelecallerCounsellingServiceTests(
    TestCase
):
    def setUp(self):
        self.user = User.objects.create_user(
            username="telecaller-counselling",
            email="telecaller@example.com",
            password="test-password",
        )

        self.lead = Lead.objects.create(
            name="Counselling Student",
            phone_number="9000000011",
            assigned_to=self.user,
            status=Lead.Status.ASSIGNED,
        )

        self.institution = (
            Institution.objects.create(
                name="Counselling Test University",
                code="CTU",
                is_active=True,
            )
        )

        self.program = Program.objects.create(
            institution=self.institution,
            name="Bachelor of Business Administration",
            code="BBA",
            level=Program.Level.UG,
            duration_years=3,
            duration_semesters=6,
            study_mode=(
                Program.StudyMode.DISTANCE
            ),
            minimum_qualification=(
                Program
                .MinimumQualification
                .PLUS_TWO
            ),
            eligibility_text=(
                "Plus Two / 12th or equivalent."
            ),
            eligibility_review_required=False,
            is_active=True,
        )

        self.fee_plan = (
            ProgramFeePlan.objects.create(
                program=self.program,
                name="Standard",
                student_total_fee=Decimal(
                    "60000.00"
                ),
            )
        )

        ProgramInternalFinance.objects.create(
            program=self.program,
            center_fee=Decimal(
                "35000.00"
            ),
        )

        self.trust = Trust.objects.create(
            name="Counselling Test Trust",
        )

        self.business_unit = (
            BusinessUnit.objects.create(
                trust=self.trust,
                name="Counselling BU",
                code="COUN-BU",
            )
        )

        self.branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="Counselling Branch",
            code="COUN-BR",
            is_active=True,
        )

    def test_interested_call_sets_interested_not_qualified(
        self,
    ):
        record_call(
            lead=self.lead,
            telecaller=self.user,
            outcome=(
                CallLog.Outcome.INTERESTED
            ),
            notes="Student is interested.",
        )

        self.lead.refresh_from_db()

        self.assertEqual(
            self.lead.status,
            Lead.Status.INTERESTED,
        )

    def test_verified_program_can_be_qualified(
        self,
    ):
        qualification = (
            save_lead_qualification(
                lead=self.lead,
                performed_by=self.user,
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
                selected_program=(
                    self.program
                ),
            )
        )

        self.assertEqual(
            qualification
            .eligibility_status,
            (
                LeadQualification
                .EligibilityStatus
                .ELIGIBLE
            ),
        )

        mark_lead_qualified(
            lead=self.lead,
            performed_by=self.user,
        )

        self.lead.refresh_from_db()

        self.assertEqual(
            self.lead.status,
            Lead.Status.QUALIFIED,
        )

    def test_review_required_program_cannot_be_qualified(
        self,
    ):
        self.program.eligibility_review_required = True
        self.program.save(
            update_fields=[
                "eligibility_review_required",
                "updated_at",
            ]
        )

        qualification = (
            save_lead_qualification(
                lead=self.lead,
                performed_by=self.user,
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
                selected_program=(
                    self.program
                ),
            )
        )

        self.assertEqual(
            qualification
            .eligibility_status,
            (
                LeadQualification
                .EligibilityStatus
                .REVIEW_REQUIRED
            ),
        )

        with self.assertRaises(
            ValidationError
        ):
            mark_lead_qualified(
                lead=self.lead,
                performed_by=self.user,
            )

    def test_telecaller_course_serializer_hides_center_fee(
        self,
    ):
        qualification = (
            save_lead_qualification(
                lead=self.lead,
                performed_by=self.user,
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
            )
        )

        data = LeadCourseOptionSerializer(
            self.program,
            context={
                "qualification":
                    qualification,
            },
        ).data

        self.assertIn(
            "fee_plans",
            data,
        )

        self.assertNotIn(
            "center_fee",
            data,
        )

        self.assertEqual(
            data["fee_plans"][0][
                "student_total_fee"
            ],
            "60000.00",
        )

    def test_optional_visit_can_be_scheduled(
        self,
    ):
        self.lead.status = (
            Lead.Status.INTERESTED
        )
        self.lead.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        appointment = (
            schedule_lead_appointment(
                lead=self.lead,
                branch=self.branch,
                scheduled_at=timezone.now(),
                performed_by=self.user,
                purpose=(
                    LeadAppointment
                    .Purpose
                    .ADMISSION_COUNSELLING
                ),
            )
        )

        self.assertEqual(
            appointment.status,
            (
                LeadAppointment
                .Status
                .SCHEDULED
            ),
        )

        self.assertEqual(
            appointment.branch,
            self.branch,
        )

        self.assertEqual(
            appointment.history.count(),
            1,
        )

    def test_visit_reschedule_preserves_history(
        self,
    ):
        self.lead.status = (
            Lead.Status.INTERESTED
        )
        self.lead.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        original_time = timezone.now()
        new_time = (
            original_time
            + timedelta(days=1)
        )

        appointment = (
            schedule_lead_appointment(
                lead=self.lead,
                branch=self.branch,
                scheduled_at=original_time,
                performed_by=self.user,
            )
        )

        change_lead_appointment_status(
            appointment=appointment,
            status=(
                LeadAppointment
                .Status
                .RESCHEDULED
            ),
            scheduled_at=new_time,
            performed_by=self.user,
            notes="Student requested a later visit.",
        )

        appointment.refresh_from_db()

        history = (
            appointment.history
            .filter(
                event_type=(
                    LeadAppointmentHistory
                    .EventType
                    .RESCHEDULED
                )
            )
            .get()
        )

        self.assertEqual(
            history.previous_scheduled_at,
            original_time,
        )

        self.assertEqual(
            history.new_scheduled_at,
            new_time,
        )

        self.assertEqual(
            appointment.scheduled_at,
            new_time,
        )

    def test_zero_visitors_are_rejected(
        self,
    ):
        self.lead.status = (
            Lead.Status.INTERESTED
        )
        self.lead.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        with self.assertRaises(
            ValidationError
        ):
            schedule_lead_appointment(
                lead=self.lead,
                branch=self.branch,
                scheduled_at=timezone.now(),
                performed_by=self.user,
                number_of_visitors=0,
            )

    def test_admission_handoff_uses_counselling_selection(
        self,
    ):
        qualification = (
            save_lead_qualification(
                lead=self.lead,
                performed_by=self.user,
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
                selected_program=(
                    self.program
                ),
                quoted_fee=Decimal(
                    "58000.00"
                ),
            )
        )

        self.assertEqual(
            qualification.eligibility_status,
            (
                LeadQualification
                .EligibilityStatus
                .ELIGIBLE
            ),
        )

        mark_lead_qualified(
            lead=self.lead,
            performed_by=self.user,
        )

        admission = (
            create_admission_from_lead(
                lead=self.lead,
                created_by=self.user,
                assigned_to=self.user,
            )
        )

        self.assertEqual(
            admission.institution,
            self.institution,
        )

        self.assertEqual(
            admission.program,
            self.program,
        )

        self.lead.refresh_from_db()

        self.assertEqual(
            self.lead.status,
            Lead.Status.CONVERTED,
        )

        self.assertTrue(
            Admission.objects.filter(
                lead=self.lead,
            ).exists()
        )

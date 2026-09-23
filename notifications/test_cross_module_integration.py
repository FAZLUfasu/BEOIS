from types import SimpleNamespace
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from admissions.models import Admission
from admissions.task_integration import DOCUMENT_LABEL, FEE_LABEL, ENROLLMENT_LABEL, complete_all_admission_tasks, sync_admission_tasks
from finance.task_integration import EXPENSE_LABEL, PAYABLE_LABEL, sync_expense_task, sync_university_payable_task
from hr.task_integration import notify_leave_approved, notify_leave_rejected, notify_payroll_paid, notify_salary_advance_approved, notify_salary_advance_disbursed
from leads.models import Lead
from leads.task_integration import LABEL as LEAD_LABEL, sync_lead_follow_up_task
from notifications.models import Notification, Task
from partners.task_integration import CASE_PREFIX, ISSUE_PREFIX, sync_partner_case_task, sync_partner_issue_task
from students.task_integration import process_label, sync_student_process_task

User = get_user_model()


class CrossModuleTaskIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.manager = User.objects.create_user(username="b3manager", email="b3manager@example.com", password="TestPass123!", is_active=True)
        cls.staff = User.objects.create_user(username="b3staff", email="b3staff@example.com", password="TestPass123!", is_active=True)
        cls.other = User.objects.create_user(username="b3other", email="b3other@example.com", password="TestPass123!", is_active=True)

    def open_task(self, module, object_id, label):
        return Task.objects.filter(
            source_module=module,
            source_object_id=str(object_id),
            source_label=label,
            status__in=(Task.Status.PENDING, Task.Status.IN_PROGRESS),
        ).first()

    def test_3a_lead_follow_up_create_update_cancel(self):
        oid = uuid4()
        due1 = timezone.now() + timezone.timedelta(days=1)
        lead = SimpleNamespace(pk=oid, name="Block 3 Lead", assigned_to_id=self.staff.pk,
                               assigned_to=self.staff, next_follow_up_at=due1,
                               status=Lead.Status.FOLLOW_UP)
        task = sync_lead_follow_up_task(lead, assigned_by=self.manager)
        self.assertIsNotNone(task)
        task.refresh_from_db()
        self.assertEqual(task.source_module, Task.SourceModule.LEADS)
        self.assertEqual(task.source_label, LEAD_LABEL)
        self.assertEqual(task.assigned_to, self.staff)
        self.assertEqual(task.due_at, due1)

        due2 = timezone.now() + timezone.timedelta(days=2)
        lead.next_follow_up_at = due2
        lead.assigned_to = self.other
        lead.assigned_to_id = self.other.pk
        updated = sync_lead_follow_up_task(lead, assigned_by=self.manager)
        self.assertEqual(updated.pk, task.pk)
        self.assertEqual(Task.objects.filter(source_module=Task.SourceModule.LEADS,
                                             source_object_id=str(oid),
                                             source_label=LEAD_LABEL).count(), 1)
        updated.refresh_from_db()
        self.assertEqual(updated.assigned_to, self.other)
        self.assertEqual(updated.due_at, due2)

        lead.status = Lead.Status.CLOSED
        lead.next_follow_up_at = None
        sync_lead_follow_up_task(lead, assigned_by=self.manager)
        updated.refresh_from_db()
        self.assertEqual(updated.status, Task.Status.CANCELLED)

    def test_3b_admission_status_task_lifecycle(self):
        oid = uuid4()
        admission = SimpleNamespace(pk=oid, admission_id="AD-B3-001",
                                    assigned_to_id=self.staff.pk, assigned_to=self.staff,
                                    status=Admission.Status.DOCUMENT_PENDING)
        sync_admission_tasks(admission, performed_by=self.manager)
        doc = self.open_task(Task.SourceModule.ADMISSIONS, oid, DOCUMENT_LABEL)
        self.assertIsNotNone(doc)
        self.assertIsNone(self.open_task(Task.SourceModule.ADMISSIONS, oid, FEE_LABEL))
        self.assertIsNone(self.open_task(Task.SourceModule.ADMISSIONS, oid, ENROLLMENT_LABEL))

        admission.status = Admission.Status.FEE_PENDING
        sync_admission_tasks(admission, performed_by=self.manager)
        doc.refresh_from_db()
        self.assertEqual(doc.status, Task.Status.COMPLETED)
        fee = self.open_task(Task.SourceModule.ADMISSIONS, oid, FEE_LABEL)
        self.assertIsNotNone(fee)

        complete_all_admission_tasks(admission)
        fee.refresh_from_db()
        self.assertEqual(fee.status, Task.Status.COMPLETED)

    def test_3c_expense_task_lifecycle(self):
        oid = uuid4()
        expense = SimpleNamespace(pk=oid, status="APPROVED", requested_by=self.staff,
                                  expense_number="EXP-B3-001", description="Test expense",
                                  due_date=timezone.localdate() + timezone.timedelta(days=5))
        task = sync_expense_task(expense, performed_by=self.manager)
        self.assertIsNotNone(task)
        task.refresh_from_db()
        self.assertEqual(task.source_label, EXPENSE_LABEL)
        self.assertEqual(task.assigned_to, self.manager)
        self.assertEqual(task.priority, Task.Priority.HIGH)

        expense.status = "PARTIALLY_PAID"
        self.assertEqual(sync_expense_task(expense, performed_by=self.manager).pk, task.pk)
        expense.status = "PAID"
        sync_expense_task(expense, performed_by=self.manager)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

    def test_3c_university_payable_task_lifecycle(self):
        oid = uuid4()
        payable = SimpleNamespace(pk=oid, status="OPEN", created_by=self.staff,
                                  payable_number="UP-B3-001", description="University payable",
                                  due_date=timezone.localdate() + timezone.timedelta(days=7))
        task = sync_university_payable_task(payable, performed_by=self.manager)
        self.assertIsNotNone(task)
        task.refresh_from_db()
        self.assertEqual(task.source_label, PAYABLE_LABEL)
        self.assertEqual(task.assigned_to, self.manager)
        self.assertEqual(task.priority, Task.Priority.URGENT)

        payable.status = "PAID"
        sync_university_payable_task(payable, performed_by=self.manager)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

    def test_3d_student_process_lifecycle(self):
        pid, sid = uuid4(), uuid4()
        process = SimpleNamespace(pk=pid, student_id=sid, assigned_to_id=self.staff.pk,
                                  assigned_to=self.staff, status="NOT_STARTED",
                                  due_date=timezone.localdate() + timezone.timedelta(days=10),
                                  get_process_type_display=lambda: "Examination")
        label = process_label(process)
        task = sync_student_process_task(process, performed_by=self.manager)
        self.assertIsNotNone(task)
        task.refresh_from_db()
        self.assertEqual(task.source_module, Task.SourceModule.EDUCATION)
        self.assertEqual(task.source_object_id, str(sid))
        self.assertEqual(task.source_label, label)
        self.assertEqual(task.assigned_to, self.staff)

        process.status = "NOT_APPLICABLE"
        sync_student_process_task(process, performed_by=self.manager)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

    def test_3e_partner_case_lifecycle_and_fallback(self):
        oid = uuid4()
        partner = SimpleNamespace(relationship_manager=self.other)
        case = SimpleNamespace(pk=oid, status="RECEIVED", assigned_to=self.staff,
                               partner=partner, applicant_name="Applicant", case_id="PC-B3-001")
        task = sync_partner_case_task(case, performed_by=self.manager)
        self.assertIsNotNone(task)
        self.assertEqual(task.source_label, f"{CASE_PREFIX}:{oid}")
        self.assertEqual(task.assigned_to, self.staff)

        case.status = "ADMISSION_CREATED"
        sync_partner_case_task(case, performed_by=self.manager)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

        oid2 = uuid4()
        case2 = SimpleNamespace(pk=oid2, status="RECEIVED", assigned_to=None,
                                partner=partner, applicant_name="Fallback", case_id="PC-B3-002")
        fallback = sync_partner_case_task(case2)
        self.assertIsNotNone(fallback)
        self.assertEqual(fallback.assigned_to, self.other)

    def test_3e_partner_issue_lifecycle(self):
        oid = uuid4()
        partner = SimpleNamespace(relationship_manager=self.other)
        issue = SimpleNamespace(pk=oid, status="OPEN", assigned_to=self.staff,
                                partner=partner, subject="Issue", description="Follow up")
        task = sync_partner_issue_task(issue, performed_by=self.manager)
        self.assertIsNotNone(task)
        self.assertEqual(task.source_label, f"{ISSUE_PREFIX}:{oid}")
        self.assertEqual(task.assigned_to, self.staff)

        issue.status = "RESOLVED"
        sync_partner_issue_task(issue, performed_by=self.manager)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

    def test_3f_hr_notifications(self):
        employee = SimpleNamespace(user=self.staff)
        notify_leave_approved(SimpleNamespace(pk=uuid4(), employee=employee))
        notify_leave_rejected(SimpleNamespace(pk=uuid4(), employee=employee))
        notify_salary_advance_approved(SimpleNamespace(pk=uuid4(), employee=employee))
        notify_salary_advance_disbursed(SimpleNamespace(pk=uuid4(), employee=employee))
        notify_payroll_paid(SimpleNamespace(pk=uuid4(), employee=employee))

        qs = Notification.objects.filter(recipient=self.staff, source_module=Task.SourceModule.HR)
        self.assertEqual(qs.count(), 5)
        self.assertTrue(qs.filter(title="Leave approved", notification_type=Notification.Type.SUCCESS).exists())
        self.assertTrue(qs.filter(title="Leave request rejected", notification_type=Notification.Type.WARNING).exists())
        self.assertTrue(qs.filter(title="Salary advance approved").exists())
        self.assertTrue(qs.filter(title="Salary advance disbursed").exists())
        self.assertTrue(qs.filter(title="Salary payment processed").exists())

    def test_3f_employee_without_user_is_safe(self):
        employee = SimpleNamespace(user=None)
        result = notify_leave_approved(SimpleNamespace(pk=uuid4(), employee=employee))
        self.assertIsNone(result)
        self.assertEqual(Notification.objects.filter(source_module=Task.SourceModule.HR).count(), 0)

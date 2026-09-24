export interface IntelligencePeriod {
  start_date: string;
  end_date: string;
  previous_start_date: string;
  previous_end_date: string;
}

export interface ComparisonKpi {
  current: number;
  previous: number;
  change_percentage: number | null;
}

export interface ConversionKpi {
  current: number;
  previous: number;
  change_percentage_points: number;
}

export interface IntelligenceOverview {
  period: IntelligencePeriod;

  kpis: {
    leads: ComparisonKpi;
    lead_conversion_rate: ConversionKpi;
    admissions: ComparisonKpi;
    collections: ComparisonKpi;
  };

  organization: {
    active_students: number;
    active_partners: number;
    active_employees: number;
  };
}

export interface LeadTrendPoint {
  date: string;
  leads: number;
  converted: number;
}

export interface AdmissionTrendPoint {
  date: string;
  admissions: number;
  completed: number;
}

export interface CollectionTrendPoint {
  date: string;
  amount: number;
}

export interface CashFlowTrendPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface IntelligenceTrends {
  period: IntelligencePeriod;
  lead_trend: LeadTrendPoint[];
  admission_trend: AdmissionTrendPoint[];
  collection_trend: CollectionTrendPoint[];
  cash_flow_trend: CashFlowTrendPoint[];
}

export interface FinancialIntelligence {
  period: IntelligencePeriod;

  cash_flow: {
    income: number;
    outflow: number;
    net: number;
  };

  student_finance: {
    booked_fees: number;
    collections_total: number;
    collections_in_period: number;
    receivable: number;
    collection_rate: number;
  };

  obligations: {
    university_outstanding: number;
    partner_commission_outstanding: number;
    operational_expense_outstanding: number;
    payroll_outstanding: number;
  };

  payroll: {
    period_total: number;
    period_paid: number;
    period_outstanding: number;
  };

  note: string;
}
export interface InstitutionIntelligenceRow {
  institution_id: string;
  institution_name: string;
  institution_code: string;
  admissions_in_period: number;
  completed_in_period: number;
  collections_in_period: number;
  booked_fees_total: number;
  collections_total: number;
  student_receivable: number;
  university_outstanding: number;
}

export interface InstitutionIntelligence {
  period: IntelligencePeriod;
  institutions: InstitutionIntelligenceRow[];
}

export interface PartnerIntelligenceRow {
  partner_id: string;
  name: string;
  status: string;
  cases_in_period: number;
  admissions_in_period: number;
  completed_cases: number;
  collections_in_period: number;
  commission_earned: number;
  commission_payable: number;
  commission_paid: number;
  open_issues: number;
}

export interface PartnerIntelligence {
  period: IntelligencePeriod;
  partners: PartnerIntelligenceRow[];
}

export interface StaffIntelligenceRow {
  employee_id: string;
  name: string;
  department: string | null;
  branch: string | null;
  leads_assigned: number;
  calls: number;
  converted_leads: number;
  conversion_rate: number;
  admissions: number;
  completed_admissions: number;
}

export interface StaffIntelligence {
  period: IntelligencePeriod;
  staff: StaffIntelligenceRow[];
}

export interface OverdueFollowupItem {
  lead_id: string;
  name: string;
  status: string;
  next_follow_up_at: string;
}

export interface OverdueEducationProcessItem {
  student_id: string;
  student_name: string;
  process_type: string;
  title: string;
  status: string;
  due_date: string;
}

export interface UrgentPartnerIssueItem {
  partner_id: string;
  partner_name: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface UniversityPayableItem {
  payable_number: string;
  institution: string;
  admission_id: string;
  due_date: string | null;
  status: string;
  outstanding: number;
}

export interface OperationalExpenseItem {
  expense_number: string;
  vendor_name: string;
  description: string;
  due_date: string | null;
  status: string;
  outstanding: number;
}
export interface ExceptionSummary {
  overdue_followups: number;
  overdue_education_processes: number;
  urgent_partner_issues: number;
  university_payables: number;
  university_outstanding: number;
  operational_expenses: number;
  operational_expense_outstanding: number;
}

export interface ExceptionIntelligence {
  period: IntelligencePeriod;
  summary: ExceptionSummary;
  queues: {
    overdue_followups: OverdueFollowupItem[];
    overdue_education_processes: OverdueEducationProcessItem[];
    urgent_partner_issues: UrgentPartnerIssueItem[];
    university_payables: UniversityPayableItem[];
    operational_expenses: OperationalExpenseItem[];
  };
}

export interface TaskIntelligenceItem {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  source_module: string;
  source_module_label: string;
  source_label: string;
  assigned_to: {
    id: string;
    name: string;
  };
  due_at: string | null;
  created_at: string;
  is_overdue: boolean;
  action_url: string;
}

export interface TaskModuleWorkload {
  module: string;
  label: string;
  open_tasks: number;
  overdue_tasks: number;
  high_tasks: number;
  urgent_tasks: number;
}

export interface TaskDepartmentWorkload {
  department: string;
  open_tasks: number;
  overdue_tasks: number;
  high_tasks: number;
  urgent_tasks: number;
}

export interface TaskStaffWorkload {
  user_id: string;
  employee_id: string | null;
  name: string;
  department: string | null;
  branch: string | null;
  open_tasks: number;
  overdue_tasks: number;
  high_open: number;
  urgent_open: number;
  created_in_period: number;
  completed_in_period: number;
  created_cohort_completion_rate: number;
}

export interface TaskIntelligence {
  period: IntelligencePeriod;

  summary: {
    open_tasks: number;
    overdue_tasks: number;
    due_today: number;
    due_next_7_days: number;
    high_open: number;
    urgent_open: number;
    without_due_date: number;
  };

  period_activity: {
    created: number;
    completed: number;
    created_cohort_total: number;
    created_cohort_completed: number;
    created_cohort_completion_rate: number;
  };

  status_breakdown: {
    status: string;
    label: string;
    count: number;
  }[];

  open_priority_breakdown: {
    priority: string;
    label: string;
    count: number;
  }[];

  module_workload: TaskModuleWorkload[];
  department_workload: TaskDepartmentWorkload[];
  staff_workload: TaskStaffWorkload[];

  aging: {
    "0_2_days": number;
    "3_7_days": number;
    "8_14_days": number;
    "15_30_days": number;
    "31_plus_days": number;
  };

  upcoming_deadlines: TaskIntelligenceItem[];
  oldest_overdue: TaskIntelligenceItem[];

  attention: {
    urgent_overdue: number;
    overdue_7_plus_days: number;
    due_next_24_hours: number;
  };
}

export type FinanceAccountType = "CASH" | "BANK" | "UPI" | "OTHER";
export type FinanceTransactionType = "CREDIT" | "DEBIT";
export type FinanceTransactionStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type FinanceCategoryType = "INCOME" | "EXPENSE";
export type FinanceSourceType =
  | "MANUAL" | "ADMISSION_PAYMENT" | "UNIVERSITY_PAYMENT"
  | "PARTNER_COMMISSION" | "PAYROLL" | "EXPENSE" | string;

export interface FinancialAccount {
  id: string; name: string; code: string; account_type: FinanceAccountType | string;
  business_unit: string | null; branch: string | null; bank_name: string;
  account_number: string; ifsc_code: string; upi_id: string; opening_balance: string;
  opening_balance_date: string | null; current_balance: string; is_active: boolean;
  notes: string; created_at: string; updated_at: string;
}
export interface AccountBalance {
  account_id: string; account_code: string; account_name: string;
  as_of_date: string | null; balance: string;
}
export interface TransactionCategory {
  id: string; name: string; code: string; category_type: FinanceCategoryType | string;
  description: string; is_system: boolean; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface FinancialTransaction {
  id: string; transaction_number: string; transaction_type: FinanceTransactionType;
  account: string; account_name: string; category: string; category_name: string;
  amount: string; transaction_date: string; payment_method: string;
  reference_number: string; description: string; status: FinanceTransactionStatus;
  source_type: FinanceSourceType; business_unit: string | null; branch: string | null;
  admission: string | null; admission_number: string | null; institution: string | null;
  institution_name: string | null; partner: string | null; partner_number: string | null;
  admission_payment: string | null; commission_transaction: string | null;
  payroll: string | null; created_by: string | null; posted_by: string | null;
  posted_at: string | null; created_at: string; updated_at: string;
}
export interface ExpensePayment {
  id: string; expense: string; account: string; account_name: string; amount: string;
  paid_at: string; payment_method: string; reference_number: string;
  finance_transaction: string | null; paid_by: string | null; notes: string; created_at: string;
}
export interface FinanceExpense {
  id: string; expense_number: string; category: string; category_name: string;
  business_unit: string | null; branch: string | null; vendor_name: string;
  description: string; bill_number: string; bill_date: string | null; expense_date: string;
  due_date: string | null; amount: string; paid_amount: string; outstanding_amount: string;
  status: string; requested_by: string | null; approved_by: string | null;
  approved_at: string | null; notes: string; payments: ExpensePayment[];
  created_at: string; updated_at: string;
}
export interface UniversityPayment {
  id: string; payable: string; account: string; account_name: string; amount: string;
  paid_at: string; payment_method: string; reference_number: string;
  finance_transaction: string | null; paid_by: string | null; notes: string; created_at: string;
}
export interface UniversityPayable {
  id: string; payable_number: string; institution: string; institution_name: string;
  admission: string | null; admission_number: string | null; description: string;
  amount: string; paid_amount: string; outstanding_amount: string; payable_date: string;
  due_date: string | null; status: string; created_by: string | null; notes: string;
  payments: UniversityPayment[]; created_at: string; updated_at: string;
}
export interface FinanceActivity {
  id: string; activity_type: string; financial_transaction: string | null;
  expense: string | null; university_payable: string | null; description: string;
  performed_by: string | null; performed_by_email: string | null; created_at: string;
}
export interface FinanceSummary { income: string; expenses: string; net: string; transactions: number; }
export interface FinanceOutstandingSummary {
  university_outstanding: string; operational_expense_outstanding: string; total_outstanding: string;
}
export interface FinanceSummaryFilters {
  start_date?: string; end_date?: string; branch?: string; business_unit?: string;
}
export interface FinanceTransactionFilters {
  transaction_type?: FinanceTransactionType | ""; source_type?: string;
  status?: FinanceTransactionStatus | ""; account?: string; branch?: string;
  start_date?: string; end_date?: string; search?: string;
}
export interface ManualTransactionInput {
  account: string; category: string; amount: string; transaction_date: string;
  description: string; payment_method?: string; reference_number?: string;
  business_unit?: string | null; branch?: string | null;
}
export interface AccountCreateInput {
  name: string; code: string; account_type: string; opening_balance?: string;
  opening_balance_date?: string | null; business_unit?: string | null; branch?: string | null;
  bank_name?: string; account_number?: string; ifsc_code?: string; upi_id?: string; notes?: string;
}
export interface CategoryCreateInput {
  name: string; code: string; category_type: string; description?: string; is_active?: boolean;
}
export interface ExpenseCreateInput {
  category: string; description: string; amount: string; expense_date: string;
  vendor_name?: string; bill_number?: string; bill_date?: string | null; due_date?: string | null;
  business_unit?: string | null; branch?: string | null; notes?: string;
}
export interface PaymentInput {
  account: string; amount: string; payment_method: string; reference_number?: string;
  paid_at?: string; notes?: string;
}
export interface UniversityPayableCreateInput {
  institution: string; admission?: string | null; description: string; amount: string;
  payable_date: string; due_date?: string | null; notes?: string;
}

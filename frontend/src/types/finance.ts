export type FinanceAccountType = "CASH" | "BANK" | "UPI" | "OTHER";
export type FinanceTransactionType = "CREDIT" | "DEBIT";
export type FinanceTransactionStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type FinanceSourceType =
  | "MANUAL"
  | "ADMISSION_PAYMENT"
  | "UNIVERSITY_PAYMENT"
  | "PARTNER_COMMISSION"
  | "PAYROLL"
  | "EXPENSE"
  | string;

export interface FinancialAccount {
  id: string;
  name: string;
  code: string;
  account_type: FinanceAccountType | string;
  business_unit: string | null;
  branch: string | null;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  opening_balance: string;
  opening_balance_date: string | null;
  current_balance: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_number: string;
  transaction_type: FinanceTransactionType;
  account: string;
  account_name: string;
  category: string;
  category_name: string;
  amount: string;
  transaction_date: string;
  payment_method: string;
  reference_number: string;
  description: string;
  status: FinanceTransactionStatus;
  source_type: FinanceSourceType;
  business_unit: string | null;
  branch: string | null;
  admission: string | null;
  admission_number: string | null;
  institution: string | null;
  institution_name: string | null;
  partner: string | null;
  partner_number: string | null;
  admission_payment: string | null;
  commission_transaction: string | null;
  payroll: string | null;
  created_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceSummary {
  income: string;
  expenses: string;
  net: string;
  transactions: number;
}

export interface FinanceOutstandingSummary {
  university_outstanding: string;
  operational_expense_outstanding: string;
  total_outstanding: string;
}

export interface FinanceSummaryFilters {
  start_date?: string;
  end_date?: string;
  branch?: string;
  business_unit?: string;
}

export interface FinanceTransactionFilters {
  transaction_type?: FinanceTransactionType | "";
  source_type?: string;
  status?: FinanceTransactionStatus | "";
  account?: string;
  branch?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

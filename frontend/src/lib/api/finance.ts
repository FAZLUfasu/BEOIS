import { apiRequest } from "@/lib/api/client";
import type {
  AccountBalance, AccountCreateInput, CategoryCreateInput, ExpenseCreateInput,
  FinanceActivity, FinanceExpense, FinanceOutstandingSummary, FinanceSummary,
  FinanceSummaryFilters, FinanceTransactionFilters, FinancialAccount,
  FinancialTransaction, ManualTransactionInput, PaymentInput, TransactionCategory,
  UniversityPayable, UniversityPayableCreateInput,
} from "@/types/finance";

function query(values: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString(); return s ? `?${s}` : "";
}
const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

export const getFinanceAccounts = () => apiRequest<FinancialAccount[]>("/finance/accounts/");
export const createFinanceAccount = (body: AccountCreateInput) =>
  apiRequest<FinancialAccount>("/finance/accounts/", json(body));
export const getAccountBalance = (id: string, asOf?: string) =>
  apiRequest<AccountBalance>(`/finance/accounts/${id}/balance/${query({ as_of_date: asOf })}`);

export const getFinanceCategories = () => apiRequest<TransactionCategory[]>("/finance/categories/");
export const createFinanceCategory = (body: CategoryCreateInput) =>
  apiRequest<TransactionCategory>("/finance/categories/", json(body));
export const initializeFinanceCategories = () =>
  apiRequest<TransactionCategory[]>("/finance/categories/initialize-system/", { method: "POST" });

export function getFinanceTransactions(filters: FinanceTransactionFilters = {}) {
  return apiRequest<FinancialTransaction[]>(`/finance/transactions/${query({
    transaction_type: filters.transaction_type || undefined, source_type: filters.source_type || undefined,
    status: filters.status || undefined, account: filters.account || undefined,
    branch: filters.branch || undefined, start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined, search: filters.search?.trim() || undefined,
  })}`);
}
export const createManualIncome = (body: ManualTransactionInput) =>
  apiRequest<FinancialTransaction>("/finance/transactions/manual-income/", json(body));
export const createManualExpense = (body: ManualTransactionInput) =>
  apiRequest<FinancialTransaction>("/finance/transactions/manual-expense/", json(body));
export const postFinanceTransaction = (id: string) =>
  apiRequest<FinancialTransaction>(`/finance/transactions/${id}/post/`, { method: "POST" });

export const getExpenses = (status?: string) =>
  apiRequest<FinanceExpense[]>(`/finance/expenses/${query({ status })}`);
export const createExpense = (body: ExpenseCreateInput) =>
  apiRequest<FinanceExpense>("/finance/expenses/", json(body));
export const submitExpense = (id: string) =>
  apiRequest<FinanceExpense>(`/finance/expenses/${id}/submit/`, { method: "POST" });
export const approveExpense = (id: string) =>
  apiRequest<FinanceExpense>(`/finance/expenses/${id}/approve/`, { method: "POST" });
export const payExpense = (id: string, body: PaymentInput) =>
  apiRequest<FinanceExpense>(`/finance/expenses/${id}/pay/`, json(body));

export const getUniversityPayables = () =>
  apiRequest<UniversityPayable[]>("/finance/university-payables/");
export const createUniversityPayable = (body: UniversityPayableCreateInput) =>
  apiRequest<UniversityPayable>("/finance/university-payables/", json(body));
export const payUniversityPayable = (id: string, body: PaymentInput) =>
  apiRequest<UniversityPayable>(`/finance/university-payables/${id}/pay/`, json(body));

export const getFinanceActivities = () => apiRequest<FinanceActivity[]>("/finance/activities/");
export const syncAdmissionPayment = (id: string, account: string) =>
  apiRequest<FinancialTransaction>(`/finance/sync/admission-payment/${id}/`, json({ account }));
export const syncPayroll = (id: string, account: string) =>
  apiRequest<FinancialTransaction>(`/finance/sync/payroll/${id}/`, json({ account }));
export const syncPartnerCommission = (id: string, account: string) =>
  apiRequest<FinancialTransaction>(`/finance/sync/partner-commission/${id}/`, json({ account }));

export function getFinanceSummary(filters: FinanceSummaryFilters = {}) {
  return apiRequest<FinanceSummary>(`/finance/reports/summary/${query({
    start_date: filters.start_date, end_date: filters.end_date,
    branch: filters.branch, business_unit: filters.business_unit,
  })}`);
}
export const getFinanceOutstandingSummary = () =>
  apiRequest<FinanceOutstandingSummary>("/finance/reports/outstanding/");
export const getAdmissionFinancialSummary = (id: string) =>
  apiRequest<Record<string, unknown>>(`/finance/reports/admission/${id}/`);

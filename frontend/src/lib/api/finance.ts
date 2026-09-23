import { apiRequest } from "@/lib/api/client";
import type {
  FinanceOutstandingSummary,
  FinanceSummary,
  FinanceSummaryFilters,
  FinanceTransactionFilters,
  FinancialAccount,
  FinancialTransaction,
} from "@/types/finance";

function buildQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getFinanceAccounts() {
  return apiRequest<FinancialAccount[]>("/finance/accounts/");
}

export function getFinanceTransactions(
  filters: FinanceTransactionFilters = {},
) {
  const query = buildQuery({
    transaction_type: filters.transaction_type || undefined,
    source_type: filters.source_type || undefined,
    status: filters.status || undefined,
    account: filters.account || undefined,
    branch: filters.branch || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    search: filters.search?.trim() || undefined,
  });
  return apiRequest<FinancialTransaction[]>(
    `/finance/transactions/${query}`,
  );
}

export function getFinanceSummary(
  filters: FinanceSummaryFilters = {},
) {
  const query = buildQuery({
    start_date: filters.start_date,
    end_date: filters.end_date,
    branch: filters.branch,
    business_unit: filters.business_unit,
  });
  return apiRequest<FinanceSummary>(
    `/finance/reports/summary/${query}`,
  );
}

export function getFinanceOutstandingSummary() {
  return apiRequest<FinanceOutstandingSummary>(
    "/finance/reports/outstanding/",
  );
}

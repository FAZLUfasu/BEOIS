"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Banknote, Building2,
  CircleDollarSign, Clock3, Landmark, Loader2,
  ReceiptText, RefreshCw, Scale, WalletCards,
} from "lucide-react";
import {
  getFinanceAccounts, getFinanceOutstandingSummary,
  getFinanceSummary, getFinanceTransactions,
} from "@/lib/api/finance";
import type {
  FinanceOutstandingSummary, FinanceSummary,
  FinancialAccount, FinancialTransaction,
} from "@/types/finance";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load Finance data.";
}

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

function displayLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function FinanceWorkspace() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [outstanding, setOutstanding] =
    useState<FinanceOutstandingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [accountData, transactionData, summaryData, outstandingData] =
        await Promise.all([
          getFinanceAccounts(),
          getFinanceTransactions({ status: "POSTED" }),
          getFinanceSummary(),
          getFinanceOutstandingSummary(),
        ]);
      setAccounts(accountData);
      setTransactions(transactionData);
      setSummary(summaryData);
      setOutstanding(outstandingData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalAccountBalance = useMemo(
    () => accounts.reduce(
      (total, account) => total + Number(account.current_balance || 0), 0,
    ),
    [accounts],
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts],
  );

  const recentTransactions = useMemo(
    () => [...transactions]
      .sort((a, b) => {
        const dateOrder = b.transaction_date.localeCompare(a.transaction_date);
        return dateOrder || b.created_at.localeCompare(a.created_at);
      })
      .slice(0, 8),
    [transactions],
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Finance & Accounts
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Financial Operations
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Monitor cash position, posted income and expenses, account balances
            and outstanding operational liabilities from one finance workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState /> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Income" value={money(summary?.income)}
              helper={`${summary?.transactions ?? 0} posted transactions in current scope`}
              icon={ArrowUpRight} />
            <SummaryCard label="Expenses" value={money(summary?.expenses)}
              helper="Posted financial outflow" icon={ArrowDownRight} />
            <SummaryCard label="Net Cash Flow" value={money(summary?.net)}
              helper="Income less posted expenses" icon={Scale} />
            <SummaryCard label="Account Balance" value={money(totalAccountBalance)}
              helper={`${activeAccounts.length} active financial accounts`}
              icon={WalletCards} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <LiabilityCard label="University Outstanding"
              value={money(outstanding?.university_outstanding)}
              helper="Open university fee liabilities" icon={Building2} />
            <LiabilityCard label="Operational Outstanding"
              value={money(outstanding?.operational_expense_outstanding)}
              helper="Unsettled operational expenses" icon={ReceiptText} />
            <LiabilityCard label="Total Outstanding"
              value={money(outstanding?.total_outstanding)}
              helper="Combined current liabilities" icon={Clock3} />
          </section>

          <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.6fr]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading icon={Landmark} title="Financial Accounts"
                subtitle="Current calculated balances." />
              <div className="p-5">
                {accounts.length === 0 ? <EmptyAccounts /> : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading icon={Banknote} title="Recent Posted Transactions"
                subtitle="Latest ledger activity recorded by Finance." />
              {recentTransactions.length === 0 ? (
                <div className="p-5"><EmptyTransactions /></div>
              ) : (
                <TransactionTable transactions={recentTransactions} />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex items-start gap-3">
              <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h3 className="font-semibold text-slate-900">
                  Finance Block 1 — Overview Foundation
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This overview is connected to the live Finance ledger.
                  Account management, transaction entry, expense workflow,
                  university payables, integrations and reporting controls
                  will be added as dedicated workspace sections next.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, helper, icon: Icon }: {
  label: string; value: string; helper: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function LiabilityCard({ label, value, helper, icon: Icon }: {
  label: string; value: string; helper: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-amber-50 p-3 text-amber-700"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <div className="border-b border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function AccountRow({ account }: { account: FinancialAccount }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900">{account.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              account.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>{account.is_active ? "Active" : "Inactive"}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {account.code} · {displayLabel(account.account_type)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold text-slate-950">{money(account.current_balance)}</p>
      </div>
      {(account.bank_name || account.upi_id) ? (
        <p className="mt-3 text-xs text-slate-500">{account.bank_name || account.upi_id}</p>
      ) : null}
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: FinancialTransaction[] }) {
  return (
    <div className="w-full min-w-0 overflow-hidden">
      <table className="w-full table-fixed border-separate border-spacing-0">
        <thead><tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
          <th className="border-b border-slate-200 px-5 py-3">Transaction</th>
          <th className="border-b border-slate-200 px-4 py-3">Date</th>
          <th className="border-b border-slate-200 px-4 py-3">Account</th>
          <th className="border-b border-slate-200 px-4 py-3">Source</th>
          <th className="border-b border-slate-200 px-5 py-3 text-right">Amount</th>
        </tr></thead>
        <tbody>{transactions.map((transaction) => (
          <tr key={transaction.id} className="transition hover:bg-slate-50">
            <td className="border-b border-slate-100 px-5 py-4">
              <p className="font-semibold text-slate-900">{transaction.transaction_number}</p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {transaction.description || transaction.category_name}
              </p>
            </td>
            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
              {formatDate(transaction.transaction_date)}
            </td>
            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
              {transaction.account_name}
            </td>
            <td className="border-b border-slate-100 px-4 py-4">
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {displayLabel(transaction.source_type)}
              </span>
            </td>
            <td className={`border-b border-slate-100 px-5 py-4 text-right text-sm font-bold ${
              transaction.transaction_type === "CREDIT" ? "text-emerald-700" : "text-slate-900"
            }`}>
              {transaction.transaction_type === "CREDIT" ? "+" : "−"}{money(transaction.amount)}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
    </div>
  );
}

function EmptyAccounts() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <Landmark className="mb-3 h-9 w-9 text-slate-300" />
      <p className="font-semibold text-slate-800">No financial accounts</p>
      <p className="mt-1 text-sm text-slate-500">No accounts are currently available in Finance.</p>
    </div>
  );
}

function EmptyTransactions() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <ReceiptText className="mb-3 h-9 w-9 text-slate-300" />
      <p className="font-semibold text-slate-800">No posted transactions</p>
      <p className="mt-1 text-sm text-slate-500">Posted Finance transactions will appear here.</p>
    </div>
  );
}

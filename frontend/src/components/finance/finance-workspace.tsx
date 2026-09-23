"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Banknote, Building2, CircleDollarSign,
  Clock3, FileClock, Landmark, Loader2, Plus, ReceiptText, RefreshCw,
  Scale, Search, University, WalletCards, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  approveExpense, createExpense, createFinanceAccount, createFinanceCategory,
  createManualExpense, createManualIncome, createUniversityPayable,
  getExpenses, getFinanceAccounts, getFinanceActivities, getFinanceCategories,
  getFinanceOutstandingSummary, getFinanceSummary, getFinanceTransactions,
  getUniversityPayables, initializeFinanceCategories, payExpense,
  payUniversityPayable, postFinanceTransaction,
} from "@/lib/api/finance";
import type {
  AccountCreateInput, CategoryCreateInput, ExpenseCreateInput, FinanceActivity,
  FinanceExpense, FinanceOutstandingSummary, FinanceSummary, FinancialAccount,
  FinancialTransaction, ManualTransactionInput, PaymentInput, TransactionCategory,
  UniversityPayable, UniversityPayableCreateInput,
} from "@/types/finance";

type Tab = "overview" | "accounts" | "transactions" | "expenses" | "payables" | "audit";
type Dialog =
  | { kind: "account" } | { kind: "category" }
  | { kind: "transaction"; direction: "income" | "expense" }
  | { kind: "expense" } | { kind: "payable" }
  | { kind: "payment"; target: "expense" | "payable"; id: string; outstanding: string }
  | null;

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "accounts", label: "Accounts" },
  { key: "transactions", label: "Transactions" }, { key: "expenses", label: "Expenses" },
  { key: "payables", label: "University Payables" }, { key: "audit", label: "Audit" },
];

function money(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0);
}
function label(v: string | null | undefined) {
  return (v || "—").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function date(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}
function err(e: unknown) { return e instanceof Error ? e.message : "Request failed."; }
const today = () => new Date().toISOString().slice(0, 10);

export function FinanceWorkspace() {
  const { user, hasRole } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [payables, setPayables] = useState<UniversityPayable[]>([]);
  const [activities, setActivities] = useState<FinanceActivity[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [outstanding, setOutstanding] = useState<FinanceOutstandingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("");
  const [txSource, setTxSource] = useState("");
  const [txAccount, setTxAccount] = useState("");

  const management = Boolean(user?.is_superuser) || hasRole("SUPER_ADMIN", "CHAIRMAN", "GENERAL_MANAGER");
  const canManage = management || hasRole("FINANCE");
  const canApprove = management || hasRole("FINANCE");
  const canPay = Boolean(user?.is_superuser) || hasRole("SUPER_ADMIN", "FINANCE");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, c, t, e, p, ac, s, o] = await Promise.all([
        getFinanceAccounts(), getFinanceCategories(), getFinanceTransactions(),
        getExpenses(), getUniversityPayables(), getFinanceActivities(),
        getFinanceSummary(), getFinanceOutstandingSummary(),
      ]);
      setAccounts(a); setCategories(c); setTransactions(t); setExpenses(e);
      setPayables(p); setActivities(ac); setSummary(s); setOutstanding(o);
    } catch (e) { setError(err(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const activeAccounts = useMemo(() => accounts.filter(a => a.is_active), [accounts]);
  const balance = useMemo(() => accounts.reduce((n, a) => n + Number(a.current_balance || 0), 0), [accounts]);
  const filteredTx = useMemo(() => transactions.filter(t => {
    const q = search.trim().toLowerCase();
    return (!q || [t.transaction_number, t.reference_number, t.description, t.account_name, t.category_name]
      .some(v => (v || "").toLowerCase().includes(q)))
      && (!txType || t.transaction_type === txType)
      && (!txSource || t.source_type === txSource)
      && (!txAccount || t.account === txAccount);
  }), [transactions, search, txType, txSource, txAccount]);

  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setSuccess("");
    try { await fn(); setSuccess(message); setDialog(null); await load(); }
    catch (e) { setError(err(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Finance & Accounts</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Financial Operations</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Accounts, ledger transactions, operational expenses, university liabilities and audit activity in one workspace.</p>
        </div>
        <button onClick={() => void load()} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      {error && <Notice tone="error" text={error} />}
      {success && <Notice tone="success" text={success} />}

      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t.label}</button>)}
      </div>

      {tab === "overview" && <Overview summary={summary} outstanding={outstanding} balance={balance} accounts={activeAccounts} transactions={transactions} expenses={expenses} payables={payables} />}
      {tab === "accounts" && <Accounts accounts={accounts} categories={categories} canManage={canManage} onDialog={setDialog} onInit={() => void action(initializeFinanceCategories, "System categories initialized.")} busy={busy} />}
      {tab === "transactions" && <Transactions items={filteredTx} accounts={activeAccounts} canManage={canManage} search={search} setSearch={setSearch} txType={txType} setTxType={setTxType} txSource={txSource} setTxSource={setTxSource} txAccount={txAccount} setTxAccount={setTxAccount} onDialog={setDialog} onPost={(id: string) => void action(() => postFinanceTransaction(id), "Transaction posted.")} />}
      {tab === "expenses" && <Expenses items={expenses} canManage={canManage} canApprove={canApprove} canPay={canPay} onDialog={setDialog} onSubmit={(id: string) => void action(() => import("@/lib/api/finance").then(m => m.submitExpense(id)), "Expense submitted.")} onApprove={(id: string) => void action(() => approveExpense(id), "Expense approved.")} />}
      {tab === "payables" && <Payables items={payables} canManage={canManage} canPay={canPay} onDialog={setDialog} />}
      {tab === "audit" && <Audit items={activities} />}

      {dialog && <FinanceDialog dialog={dialog} accounts={activeAccounts} categories={categories} busy={busy} close={() => setDialog(null)}
        save={(payload: unknown) => {
          if (dialog.kind === "account") return action(() => createFinanceAccount(payload as AccountCreateInput), "Financial account created.");
          if (dialog.kind === "category") return action(() => createFinanceCategory(payload as CategoryCreateInput), "Category created.");
          if (dialog.kind === "transaction") return action(() => dialog.direction === "income" ? createManualIncome(payload as ManualTransactionInput) : createManualExpense(payload as ManualTransactionInput), `Manual ${dialog.direction} posted.`);
          if (dialog.kind === "expense") return action(() => createExpense(payload as ExpenseCreateInput), "Expense created.");
          if (dialog.kind === "payable") return action(() => createUniversityPayable(payload as UniversityPayableCreateInput), "University payable created.");
          if (dialog.kind === "payment") return action(() => dialog.target === "expense" ? payExpense(dialog.id, payload as PaymentInput) : payUniversityPayable(dialog.id, payload as PaymentInput), "Payment recorded.");
          return Promise.resolve();
        }} />}
      <style jsx global>{`
        .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:.75rem;background:#0f172a;color:white;padding:.625rem 1rem;font-size:.875rem;font-weight:600}
        .btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid #e2e8f0;border-radius:.75rem;background:white;padding:.625rem 1rem;font-size:.875rem;font-weight:600;color:#334155}
        .field{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;background:white;padding:.625rem .75rem;font-size:.875rem;outline:none}
        .field:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
      `}</style>
    </div>
  );
}

function Overview({ summary, outstanding, balance, accounts, transactions, expenses, payables }: {
  summary: FinanceSummary | null; outstanding: FinanceOutstandingSummary | null; balance: number;
  accounts: FinancialAccount[]; transactions: FinancialTransaction[]; expenses: FinanceExpense[]; payables: UniversityPayable[];
}) {
  const recent = [...transactions].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,6);
  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Income" value={money(summary?.income)} icon={ArrowUpRight} />
      <Metric title="Expenses" value={money(summary?.expenses)} icon={ArrowDownRight} />
      <Metric title="Net Cash Flow" value={money(summary?.net)} icon={Scale} />
      <Metric title="Account Balance" value={money(balance)} icon={WalletCards} />
    </section>
    <section className="grid gap-4 lg:grid-cols-3">
      <Metric title="University Outstanding" value={money(outstanding?.university_outstanding)} icon={University} />
      <Metric title="Operational Outstanding" value={money(outstanding?.operational_expense_outstanding)} icon={ReceiptText} />
      <Metric title="Total Outstanding" value={money(outstanding?.total_outstanding)} icon={Clock3} />
    </section>
    <section className="grid min-w-0 gap-6 xl:grid-cols-2">
      <Panel title="Financial Accounts" icon={Landmark}>
        <div className="space-y-3">{accounts.length ? accounts.map(a => <div key={a.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><p className="text-xs text-slate-500">{a.code} · {label(a.account_type)}</p></div><b className="shrink-0">{money(a.current_balance)}</b></div>) : <Empty text="No active financial accounts." />}</div>
      </Panel>
      <Panel title="Recent Transactions" icon={Banknote}><CompactTx items={recent} /></Panel>
    </section>
    <section className="grid gap-4 md:grid-cols-3">
      <SmallStat label="Transactions" value={String(summary?.transactions ?? 0)} />
      <SmallStat label="Open Expenses" value={String(expenses.filter(x => !["PAID","REJECTED","CANCELLED"].includes(x.status)).length)} />
      <SmallStat label="Open University Payables" value={String(payables.filter(x => !["PAID","CANCELLED"].includes(x.status)).length)} />
    </section>
  </div>;
}

function Accounts({ accounts, categories, canManage, onDialog, onInit, busy }: {
  accounts: FinancialAccount[]; categories: TransactionCategory[]; canManage: boolean;
  onDialog: (d: Dialog) => void; onInit: () => void; busy: boolean;
}) {
  return <div className="grid min-w-0 gap-6 xl:grid-cols-[1.2fr_.8fr]">
    <Panel title="Financial Accounts" icon={Landmark} action={canManage ? <button className="btn-primary" onClick={() => onDialog({kind:"account"})}><Plus className="h-4 w-4"/>New Account</button> : undefined}>
      <div className="grid gap-3 md:grid-cols-2">{accounts.map(a => <div key={a.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><p className="text-xs text-slate-500">{a.code}</p></div><b>{money(a.current_balance)}</b></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><Badge text={label(a.account_type)}/><Badge text={a.is_active?"Active":"Inactive"}/>{a.bank_name&&<Badge text={a.bank_name}/>}</div>
      </div>)}</div>
    </Panel>
    <Panel title="Transaction Categories" icon={CircleDollarSign} action={canManage ? <div className="flex gap-2"><button disabled={busy} className="btn-secondary" onClick={onInit}>Initialize</button><button className="btn-primary" onClick={() => onDialog({kind:"category"})}><Plus className="h-4 w-4"/>Add</button></div> : undefined}>
      <div className="space-y-2">{categories.map(c => <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{c.name}</p><p className="text-xs text-slate-500">{c.code}</p></div><Badge text={label(c.category_type)}/></div>)}</div>
    </Panel>
  </div>;
}

function Transactions({ items, accounts, canManage, search, setSearch, txType, setTxType, txSource, setTxSource, txAccount, setTxAccount, onDialog, onPost }: any) {
  return <Panel title="Financial Ledger" icon={Banknote} action={canManage ? <div className="flex gap-2"><button className="btn-secondary" onClick={() => onDialog({kind:"transaction",direction:"expense"})}>Expense</button><button className="btn-primary" onClick={() => onDialog({kind:"transaction",direction:"income"})}><Plus className="h-4 w-4"/>Income</button></div> : undefined}>
    <div className="grid gap-3 border-b border-slate-200 pb-4 md:grid-cols-2 xl:grid-cols-5">
      <div className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input className="field pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transaction, reference..."/></div>
      <select className="field" value={txType} onChange={e=>setTxType(e.target.value)}><option value="">All types</option><option>CREDIT</option><option>DEBIT</option></select>
      <select className="field" value={txSource} onChange={e=>setTxSource(e.target.value)}><option value="">All sources</option>{["MANUAL","ADMISSION_PAYMENT","UNIVERSITY_PAYMENT","PARTNER_COMMISSION","PAYROLL","EXPENSE"].map(x=><option key={x}>{x}</option>)}</select>
      <select className="field" value={txAccount} onChange={e=>setTxAccount(e.target.value)}><option value="">All accounts</option>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    </div>
    <div className="mt-4 space-y-2">{items.length ? items.map((t:any)=><div key={t.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1.4fr_.8fr_.8fr_auto] md:items-center">
      <div className="min-w-0"><p className="truncate font-semibold">{t.transaction_number}</p><p className="truncate text-xs text-slate-500">{t.description || t.category_name}</p></div>
      <div className="text-sm"><p>{date(t.transaction_date)}</p><p className="text-xs text-slate-500">{t.account_name}</p></div>
      <div><Badge text={label(t.source_type)}/><p className={`mt-1 text-sm font-bold ${t.transaction_type==="CREDIT"?"text-emerald-700":"text-slate-900"}`}>{t.transaction_type==="CREDIT"?"+":"−"}{money(t.amount)}</p></div>
      {canManage && t.status==="DRAFT" ? <button className="btn-secondary" onClick={()=>onPost(t.id)}>Post</button> : <Badge text={label(t.status)}/>}
    </div>) : <Empty text="No transactions match the current filters."/>}</div>
  </Panel>;
}

function Expenses({ items, canManage, canApprove, canPay, onDialog, onSubmit, onApprove }: any) {
  return <Panel title="Operational Expenses" icon={ReceiptText} action={canManage?<button className="btn-primary" onClick={()=>onDialog({kind:"expense"})}><Plus className="h-4 w-4"/>New Expense</button>:undefined}>
    <div className="space-y-3">{items.length?items.map((e:any)=><div key={e.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1.4fr_.7fr_.7fr_auto] lg:items-center">
      <div className="min-w-0"><p className="truncate font-semibold">{e.expense_number} · {e.vendor_name||e.category_name}</p><p className="truncate text-xs text-slate-500">{e.description}</p><p className="mt-1 text-xs text-slate-400">{date(e.expense_date)} · Due {date(e.due_date)}</p></div>
      <div><p className="text-xs text-slate-500">Amount</p><b>{money(e.amount)}</b></div>
      <div><p className="text-xs text-slate-500">Outstanding</p><b>{money(e.outstanding_amount)}</b></div>
      <div className="flex flex-wrap items-center justify-end gap-2"><Badge text={label(e.status)}/>
        {canManage&&e.status==="DRAFT"&&<button className="btn-secondary" onClick={()=>onSubmit(e.id)}>Submit</button>}
        {canApprove&&e.status==="SUBMITTED"&&<button className="btn-secondary" onClick={()=>onApprove(e.id)}>Approve</button>}
        {canPay&&["APPROVED","PARTIALLY_PAID"].includes(e.status)&&<button className="btn-primary" onClick={()=>onDialog({kind:"payment",target:"expense",id:e.id,outstanding:e.outstanding_amount})}>Pay</button>}
      </div>
    </div>):<Empty text="No operational expenses."/ >}</div>
  </Panel>;
}

function Payables({ items, canManage, canPay, onDialog }: any) {
  return <Panel title="University Payables" icon={University} action={canManage?<button className="btn-primary" onClick={()=>onDialog({kind:"payable"})}><Plus className="h-4 w-4"/>New Payable</button>:undefined}>
    <div className="space-y-3">{items.length?items.map((p:any)=><div key={p.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1.5fr_.7fr_.7fr_auto] lg:items-center">
      <div className="min-w-0"><p className="truncate font-semibold">{p.payable_number} · {p.institution_name}</p><p className="truncate text-xs text-slate-500">{p.description}</p><p className="mt-1 text-xs text-slate-400">{p.admission_number||"General payable"} · Due {date(p.due_date)}</p></div>
      <div><p className="text-xs text-slate-500">Amount</p><b>{money(p.amount)}</b></div>
      <div><p className="text-xs text-slate-500">Outstanding</p><b>{money(p.outstanding_amount)}</b></div>
      <div className="flex flex-wrap items-center justify-end gap-2"><Badge text={label(p.status)}/>{canPay&&["OPEN","PARTIALLY_PAID"].includes(p.status)&&<button className="btn-primary" onClick={()=>onDialog({kind:"payment",target:"payable",id:p.id,outstanding:p.outstanding_amount})}>Pay</button>}</div>
    </div>):<Empty text="No university payables."/ >}</div>
  </Panel>;
}

function Audit({ items }: {items: FinanceActivity[]}) {
  return <Panel title="Finance Audit Activity" icon={FileClock}><div className="space-y-3">{items.length?items.map(a=><div key={a.id} className="flex gap-3 rounded-xl border border-slate-200 p-4"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500"/><div className="min-w-0"><div className="flex flex-wrap gap-2"><b className="text-sm">{label(a.activity_type)}</b><span className="text-xs text-slate-400">{date(a.created_at)}</span></div><p className="mt-1 text-sm text-slate-600">{a.description}</p><p className="mt-1 text-xs text-slate-400">{a.performed_by_email||"System"}</p></div></div>):<Empty text="No Finance audit activity."/ >}</div></Panel>;
}

function FinanceDialog({ dialog, accounts, categories, busy, close, save }: any) {
  const incomeCats = categories.filter((c:any)=>c.is_active&&c.category_type==="INCOME");
  const expenseCats = categories.filter((c:any)=>c.is_active&&c.category_type==="EXPENSE");
  const [form,setForm]=useState<Record<string,string>>({transaction_date:today(),expense_date:today(),payable_date:today(),opening_balance:"0.00",payment_method:"BANK_TRANSFER",amount:dialog.kind==="payment"?dialog.outstanding:""});
  const f=(k:string)=>(e:any)=>setForm(x=>({...x,[k]:e.target.value}));
  let title="Finance Entry"; let body:React.ReactNode;
  if(dialog.kind==="account"){title="Create Financial Account";body=<Fields><Input l="Account Name" v={form.name} c={f("name")}/><Input l="Code" v={form.code} c={f("code")}/><Select l="Type" v={form.account_type} c={f("account_type")} opts={["","CASH","BANK","UPI","OTHER"]}/><Input l="Opening Balance" type="number" v={form.opening_balance} c={f("opening_balance")}/><Input l="Opening Balance Date" type="date" v={form.opening_balance_date} c={f("opening_balance_date")}/><Input l="Bank Name" v={form.bank_name} c={f("bank_name")}/><Input l="Account Number" v={form.account_number} c={f("account_number")}/><Input l="IFSC Code" v={form.ifsc_code} c={f("ifsc_code")}/><Input l="UPI ID" v={form.upi_id} c={f("upi_id")}/><Input l="Notes" v={form.notes} c={f("notes")}/></Fields>}
  else if(dialog.kind==="category"){title="Create Transaction Category";body=<Fields><Input l="Name" v={form.name} c={f("name")}/><Input l="Code" v={form.code} c={f("code")}/><Select l="Category Type" v={form.category_type} c={f("category_type")} opts={["","INCOME","EXPENSE"]}/><Input l="Description" v={form.description} c={f("description")}/></Fields>}
  else if(dialog.kind==="transaction"){title=dialog.direction==="income"?"Record Manual Income":"Record Manual Expense";const cats=dialog.direction==="income"?incomeCats:expenseCats;body=<Fields><SelectObj l="Account" v={form.account} c={f("account")} items={accounts}/><SelectObj l="Category" v={form.category} c={f("category")} items={cats}/><Input l="Amount" type="number" v={form.amount} c={f("amount")}/><Input l="Transaction Date" type="date" v={form.transaction_date} c={f("transaction_date")}/><Input l="Description" v={form.description} c={f("description")}/><Input l="Payment Method" v={form.payment_method} c={f("payment_method")}/><Input l="Reference Number" v={form.reference_number} c={f("reference_number")}/></Fields>}
  else if(dialog.kind==="expense"){title="Create Operational Expense";body=<Fields><SelectObj l="Expense Category" v={form.category} c={f("category")} items={expenseCats}/><Input l="Vendor Name" v={form.vendor_name} c={f("vendor_name")}/><Input l="Description" v={form.description} c={f("description")}/><Input l="Amount" type="number" v={form.amount} c={f("amount")}/><Input l="Expense Date" type="date" v={form.expense_date} c={f("expense_date")}/><Input l="Bill Number" v={form.bill_number} c={f("bill_number")}/><Input l="Bill Date" type="date" v={form.bill_date} c={f("bill_date")}/><Input l="Due Date" type="date" v={form.due_date} c={f("due_date")}/><Input l="Notes" v={form.notes} c={f("notes")}/></Fields>}
  else if(dialog.kind==="payable"){title="Create University Payable";body=<Fields><Input l="Institution UUID" v={form.institution} c={f("institution")} /><Input l="Admission UUID (optional)" v={form.admission} c={f("admission")}/><Input l="Description" v={form.description} c={f("description")}/><Input l="Amount" type="number" v={form.amount} c={f("amount")}/><Input l="Payable Date" type="date" v={form.payable_date} c={f("payable_date")}/><Input l="Due Date" type="date" v={form.due_date} c={f("due_date")}/><Input l="Notes" v={form.notes} c={f("notes")}/></Fields>}
  else {title=dialog.target==="expense"?"Pay Expense":"Pay University";body=<Fields><SelectObj l="Payment Account" v={form.account} c={f("account")} items={accounts}/><Input l="Amount" type="number" v={form.amount} c={f("amount")}/><Input l="Payment Method" v={form.payment_method} c={f("payment_method")}/><Input l="Reference Number" v={form.reference_number} c={f("reference_number")}/><Input l="Notes" v={form.notes} c={f("notes")}/></Fields>}
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b bg-white p-5"><h2 className="text-lg font-bold">{title}</h2><button onClick={close}><X className="h-5 w-5"/></button></div><div className="p-5">{body}</div><div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-5"><button className="btn-secondary" onClick={close}>Cancel</button><button disabled={busy} className="btn-primary" onClick={()=>void save(clean(form))}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:null}Save</button></div></div></div>;
}
function clean(form:Record<string,string>){return Object.fromEntries(Object.entries(form).filter(([,v])=>v!==""))}
function Fields({children}:{children:React.ReactNode}){return <div className="grid gap-4 md:grid-cols-2">{children}</div>}
function Input({l,v,c,type="text"}:{l:string;v?:string;c:(e:any)=>void;type?:string}){return <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{l}</span><input className="field" type={type} value={v||""} onChange={c}/></label>}
function Select({l,v,c,opts}:{l:string;v?:string;c:(e:any)=>void;opts:string[]}){return <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{l}</span><select className="field" value={v||""} onChange={c}>{opts.map(x=><option key={x} value={x}>{x?label(x):"Select"}</option>)}</select></label>}
function SelectObj({l,v,c,items}:{l:string;v?:string;c:(e:any)=>void;items:any[]}){return <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{l}</span><select className="field" value={v||""} onChange={c}><option value="">Select</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
function Metric({title,value,icon:Icon}:{title:string;value:string;icon:React.ElementType}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><div className="rounded-xl bg-slate-100 p-3"><Icon className="h-5 w-5"/></div></div></div>}
function SmallStat({label:lab,value}:{label:string;value:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-400">{lab}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>}
function Panel({title,icon:Icon,action,children}:{title:string;icon:React.ElementType;action?:React.ReactNode;children:React.ReactNode}){return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2.5"><Icon className="h-5 w-5"/></div><h2 className="font-bold">{title}</h2></div>{action}</div><div className="min-w-0 p-5">{children}</div></section>}
function Badge({text}:{text:string}){return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{text}</span>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">{text}</div>}
function Notice({tone,text}:{tone:"error"|"success";text:string}){return <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${tone==="error"?"border-red-200 bg-red-50 text-red-700":"border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{text}</div>}
function CompactTx({items}:{items:FinancialTransaction[]}){return <div className="space-y-2">{items.length?items.map(t=><div key={t.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{t.transaction_number}</p><p className="truncate text-xs text-slate-500">{t.description}</p></div><b className={t.transaction_type==="CREDIT"?"text-emerald-700":""}>{t.transaction_type==="CREDIT"?"+":"−"}{money(t.amount)}</b></div>):<Empty text="No transactions."/>}</div>}

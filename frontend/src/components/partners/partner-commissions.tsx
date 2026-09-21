"use client";

import {
  BadgeIndianRupee,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  approvePartnerCommission,
  createPartnerCommission,
  createPartnerCommissionRule,
  getPartnerCases,
  getPartnerCommissionRules,
  getPartnerCommissions,
  markPartnerCommissionPaid,
  markPartnerCommissionPayable,
} from "@/lib/api/partners";
import {
  getInstitutions,
  getPrograms,
} from "@/lib/api/admissions";

import type {
  Institution,
  Program,
} from "@/types/admissions";
import type {
  CommissionRule,
  CommissionTransaction,
  CommissionType,
  PartnerCase,
  PartnerVertical,
} from "@/types/partners";

interface PartnerCommissionsPanelProps {
  partnerId: string;
  onChanged?: () => void;
}

const commissionStatusStyles: Record<
  string,
  string
> = {
  EARNED:
    "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED:
    "bg-blue-50 text-blue-700 border-blue-200",
  PAYABLE:
    "bg-violet-50 text-violet-700 border-violet-200",
  PAID:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:
    "bg-slate-100 text-slate-600 border-slate-200",
};

function formatMoney(
  value: string | number | null | undefined,
) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(numericValue)
      ? numericValue
      : 0,
  );
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function PartnerCommissionsPanel({
  partnerId,
  onChanged,
}: PartnerCommissionsPanelProps) {
  const [rules, setRules] = useState<
    CommissionRule[]
  >([]);
  const [transactions, setTransactions] =
    useState<CommissionTransaction[]>([]);
  const [cases, setCases] = useState<
    PartnerCase[]
  >([]);
  const [institutions, setInstitutions] =
    useState<Institution[]>([]);
  const [programs, setPrograms] = useState<
    Program[]
  >([]);

  const [loading, setLoading] =
    useState(true);
  const [busyId, setBusyId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [showRuleForm, setShowRuleForm] =
    useState(false);
  const [
    showTransactionForm,
    setShowTransactionForm,
  ] = useState(false);

  // Commission rule form
  const [ruleType, setRuleType] =
    useState<CommissionType>("FIXED");
  const [ruleValue, setRuleValue] =
    useState("");
  const [
    ruleInstitutionId,
    setRuleInstitutionId,
  ] = useState("");
  const [
    ruleProgramId,
    setRuleProgramId,
  ] = useState("");
  const [ruleVertical, setRuleVertical] =
    useState<PartnerVertical | "">("");
  const [ruleEffectiveFrom, setRuleEffectiveFrom] =
    useState("");
  const [ruleEffectiveTo, setRuleEffectiveTo] =
    useState("");
  const [ruleNotes, setRuleNotes] =
    useState("");

  // Transaction form
  const [
    transactionRuleId,
    setTransactionRuleId,
  ] = useState("");
  const [
    transactionBaseAmount,
    setTransactionBaseAmount,
  ] = useState("");
  const [
    transactionCaseId,
    setTransactionCaseId,
  ] = useState("");
  const [
    transactionAdmissionId,
    setTransactionAdmissionId,
  ] = useState("");
  const [
    transactionNotes,
    setTransactionNotes,
  ] = useState("");

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      setError("");

      try {
        const [
          ruleData,
          transactionData,
          caseData,
          institutionData,
        ] = await Promise.all([
          getPartnerCommissionRules(
            partnerId,
          ),
          getPartnerCommissions(partnerId),
          getPartnerCases(partnerId),
          getInstitutions(true),
        ]);

        setRules(ruleData);
        setTransactions(transactionData);
        setCases(caseData);
        setInstitutions(institutionData);
      } catch (loadError) {
        setError(
          getErrorMessage(loadError),
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [partnerId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!ruleInstitutionId) {
      setPrograms([]);
      setRuleProgramId("");
      return;
    }

    let active = true;

    void getPrograms(ruleInstitutionId, {
      active: true,
    })
      .then((data) => {
        if (active) {
          setPrograms(data);
        }
      })
      .catch((programError) => {
        if (active) {
          setError(
            getErrorMessage(programError),
          );
        }
      });

    return () => {
      active = false;
    };
  }, [ruleInstitutionId]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        const amount = Number(
          transaction.commission_amount ??
            0,
        );

        summary.total += amount;

        if (
          transaction.status ===
          "EARNED"
        ) {
          summary.earned += amount;
        }

        if (
          transaction.status ===
          "APPROVED"
        ) {
          summary.approved += amount;
        }

        if (
          transaction.status ===
          "PAYABLE"
        ) {
          summary.payable += amount;
        }

        if (
          transaction.status === "PAID"
        ) {
          summary.paid += amount;
        }

        return summary;
      },
      {
        total: 0,
        earned: 0,
        approved: 0,
        payable: 0,
        paid: 0,
      },
    );
  }, [transactions]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetRuleForm() {
    setRuleType("FIXED");
    setRuleValue("");
    setRuleInstitutionId("");
    setRuleProgramId("");
    setRuleVertical("");
    setRuleEffectiveFrom("");
    setRuleEffectiveTo("");
    setRuleNotes("");
  }

  function resetTransactionForm() {
    setTransactionRuleId("");
    setTransactionBaseAmount("");
    setTransactionCaseId("");
    setTransactionAdmissionId("");
    setTransactionNotes("");
  }

  async function handleCreateRule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    clearMessages();

    const value = Number(ruleValue);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError(
        "Enter a valid commission value.",
      );
      return;
    }

    if (
      ruleType === "PERCENTAGE" &&
      value > 100
    ) {
      setError(
        "Percentage commission cannot exceed 100%.",
      );
      return;
    }

    setBusyId("CREATE_RULE");

    try {
      await createPartnerCommissionRule(
        partnerId,
        {
          commission_type: ruleType,
          value: ruleValue,
          institution_id:
            ruleInstitutionId || null,
          program_id:
            ruleProgramId || null,
          vertical:
            ruleVertical || "",
          effective_from:
            ruleEffectiveFrom || null,
          effective_to:
            ruleEffectiveTo || null,
          notes: ruleNotes,
        },
      );

      setSuccess(
        "Commission rule created successfully.",
      );
      resetRuleForm();
      setShowRuleForm(false);

      await loadData(true);
      onChanged?.();
    } catch (createError) {
      setError(
        getErrorMessage(createError),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateTransaction(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    clearMessages();

    if (!transactionRuleId) {
      setError(
        "Select a commission rule.",
      );
      return;
    }

    const baseAmount = Number(
      transactionBaseAmount,
    );

    if (
      !Number.isFinite(baseAmount) ||
      baseAmount < 0
    ) {
      setError(
        "Enter a valid base amount.",
      );
      return;
    }

    setBusyId("CREATE_TRANSACTION");

    try {
      await createPartnerCommission(
        partnerId,
        {
          rule_id: transactionRuleId,
          base_amount:
            transactionBaseAmount,
          partner_case_id:
            transactionCaseId || null,
          admission_id:
            transactionAdmissionId ||
            null,
          notes: transactionNotes,
        },
      );

      setSuccess(
        "Commission transaction created successfully.",
      );
      resetTransactionForm();
      setShowTransactionForm(false);

      await loadData(true);
      onChanged?.();
    } catch (createError) {
      setError(
        getErrorMessage(createError),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(
    transaction: CommissionTransaction,
  ) {
    clearMessages();

    const notes =
      window.prompt(
        "Approval notes (optional):",
        "",
      ) ?? "";

    setBusyId(transaction.id);

    try {
      await approvePartnerCommission(
        partnerId,
        transaction.id,
        notes,
      );

      setSuccess(
        "Commission approved.",
      );
      await loadData(true);
      onChanged?.();
    } catch (actionError) {
      setError(
        getErrorMessage(actionError),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handlePayable(
    transaction: CommissionTransaction,
  ) {
    clearMessages();
    setBusyId(transaction.id);

    try {
      await markPartnerCommissionPayable(
        partnerId,
        transaction.id,
      );

      setSuccess(
        "Commission marked payable.",
      );
      await loadData(true);
      onChanged?.();
    } catch (actionError) {
      setError(
        getErrorMessage(actionError),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handlePaid(
    transaction: CommissionTransaction,
  ) {
    clearMessages();

    const reference = window.prompt(
      "Enter payment reference:",
      "",
    );

    if (!reference?.trim()) {
      return;
    }

    setBusyId(transaction.id);

    try {
      await markPartnerCommissionPaid(
        partnerId,
        transaction.id,
        {
          payment_reference:
            reference.trim(),
        },
      );

      setSuccess(
        "Commission marked paid.",
      );
      await loadData(true);
      onChanged?.();
    } catch (actionError) {
      setError(
        getErrorMessage(actionError),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
        Loading commission management...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Commission Management
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Configure partner commission
            rules and manage the complete
            payment lifecycle.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              clearMessages();
              setShowRuleForm(
                (value) => !value,
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Commission Rule
          </button>

          <button
            type="button"
            onClick={() => {
              clearMessages();
              setShowTransactionForm(
                (value) => !value,
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Commission
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total"
          value={formatMoney(totals.total)}
          icon={CircleDollarSign}
        />
        <SummaryCard
          label="Earned"
          value={formatMoney(
            totals.earned,
          )}
          icon={BadgeIndianRupee}
        />
        <SummaryCard
          label="Approved"
          value={formatMoney(
            totals.approved,
          )}
          icon={CheckCircle2}
        />
        <SummaryCard
          label="Payable"
          value={formatMoney(
            totals.payable,
          )}
          icon={WalletCards}
        />
        <SummaryCard
          label="Paid"
          value={formatMoney(totals.paid)}
          icon={CheckCircle2}
        />
      </div>

      {showRuleForm ? (
        <form
          onSubmit={handleCreateRule}
          className="rounded-2xl border bg-white p-5"
        >
          <div className="mb-4">
            <h4 className="font-semibold text-slate-900">
              Create Commission Rule
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Rules can apply generally or
              to a specific institution,
              program, or vertical.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Commission Type">
              <select
                value={ruleType}
                onChange={(event) =>
                  setRuleType(
                    event.target
                      .value as CommissionType,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="FIXED">
                  Fixed Amount
                </option>
                <option value="PERCENTAGE">
                  Percentage
                </option>
              </select>
            </Field>

            <Field
              label={
                ruleType === "PERCENTAGE"
                  ? "Percentage"
                  : "Amount"
              }
            >
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={ruleValue}
                onChange={(event) =>
                  setRuleValue(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </Field>

            <Field label="Vertical">
              <select
                value={ruleVertical}
                onChange={(event) =>
                  setRuleVertical(
                    event.target
                      .value as
                      | PartnerVertical
                      | "",
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="">
                  All Verticals
                </option>
                <option value="REGULAR">
                  Regular
                </option>
                <option value="CREDIT_TRANSFER">
                  Credit Transfer
                </option>
              </select>
            </Field>

            <Field label="Institution">
              <select
                value={ruleInstitutionId}
                onChange={(event) => {
                  setRuleInstitutionId(
                    event.target.value,
                  );
                  setRuleProgramId("");
                }}
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="">
                  All Institutions
                </option>

                {institutions.map(
                  (institution) => (
                    <option
                      key={institution.id}
                      value={institution.id}
                    >
                      {institution.name}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Program">
              <select
                value={ruleProgramId}
                disabled={
                  !ruleInstitutionId
                }
                onChange={(event) =>
                  setRuleProgramId(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-slate-100"
              >
                <option value="">
                  All Programs
                </option>

                {programs.map(
                  (program) => (
                    <option
                      key={program.id}
                      value={program.id}
                    >
                      {program.name}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Effective From">
              <input
                type="date"
                value={ruleEffectiveFrom}
                onChange={(event) =>
                  setRuleEffectiveFrom(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </Field>

            <Field label="Effective To">
              <input
                type="date"
                value={ruleEffectiveTo}
                onChange={(event) =>
                  setRuleEffectiveTo(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  value={ruleNotes}
                  onChange={(event) =>
                    setRuleNotes(
                      event.target.value,
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setShowRuleForm(false)
              }
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                busyId === "CREATE_RULE"
              }
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyId === "CREATE_RULE"
                ? "Creating..."
                : "Create Rule"}
            </button>
          </div>
        </form>
      ) : null}

      {showTransactionForm ? (
        <form
          onSubmit={
            handleCreateTransaction
          }
          className="rounded-2xl border bg-white p-5"
        >
          <h4 className="font-semibold text-slate-900">
            Create Commission Transaction
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Select the applicable rule and
            base amount. The backend
            calculates the commission.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Commission Rule">
              <select
                required
                value={transactionRuleId}
                onChange={(event) =>
                  setTransactionRuleId(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="">
                  Select Rule
                </option>

                {rules
                  .filter(
                    (rule) =>
                      rule.is_active,
                  )
                  .map((rule) => (
                    <option
                      key={rule.id}
                      value={rule.id}
                    >
                      {rule.commission_type_display}{" "}
                      —{" "}
                      {rule.commission_type ===
                      "PERCENTAGE"
                        ? `${rule.value}%`
                        : formatMoney(
                            rule.value,
                          )}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Base Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={
                  transactionBaseAmount
                }
                onChange={(event) =>
                  setTransactionBaseAmount(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </Field>

            <Field label="Partner Case">
              <select
                value={transactionCaseId}
                onChange={(event) => {
                  const caseId =
                    event.target.value;

                  setTransactionCaseId(
                    caseId,
                  );

                  const selectedCase =
                    cases.find(
                      (item) =>
                        item.id === caseId,
                    );

                  setTransactionAdmissionId(
                    selectedCase?.admission ??
                      "",
                  );
                }}
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="">
                  No Case
                </option>

                {cases.map(
                  (partnerCase) => (
                    <option
                      key={partnerCase.id}
                      value={partnerCase.id}
                    >
                      {partnerCase.case_id} —{" "}
                      {
                        partnerCase.applicant_name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Admission UUID">
              <input
                value={
                  transactionAdmissionId
                }
                onChange={(event) =>
                  setTransactionAdmissionId(
                    event.target.value,
                  )
                }
                placeholder="Optional"
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  rows={3}
                  value={transactionNotes}
                  onChange={(event) =>
                    setTransactionNotes(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setShowTransactionForm(
                  false,
                )
              }
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                busyId ===
                "CREATE_TRANSACTION"
              }
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyId ===
              "CREATE_TRANSACTION"
                ? "Creating..."
                : "Create Commission"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <h4 className="font-semibold text-slate-900">
            Commission Rules
          </h4>
        </div>

        {rules.length === 0 ? (
          <EmptyState text="No commission rules configured." />
        ) : (
          <div className="divide-y">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="grid gap-3 px-5 py-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {
                      rule.commission_type_display
                    }
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {rule.commission_type ===
                    "PERCENTAGE"
                      ? `${rule.value}%`
                      : formatMoney(
                          rule.value,
                        )}
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-slate-500">
                    Scope
                  </div>
                  <div className="mt-1 text-slate-800">
                    {rule.institution_name ||
                      "All Institutions"}
                    {rule.program_name
                      ? ` / ${rule.program_name}`
                      : ""}
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-slate-500">
                    Effective
                  </div>
                  <div className="mt-1 text-slate-800">
                    {rule.effective_from ||
                      "Any date"}{" "}
                    →{" "}
                    {rule.effective_to ||
                      "Ongoing"}
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                      rule.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {rule.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <h4 className="font-semibold text-slate-900">
            Commission Transactions
          </h4>
        </div>

        {transactions.length === 0 ? (
          <EmptyState text="No commission transactions yet." />
        ) : (
          <div className="divide-y">
            {transactions.map(
              (transaction) => (
                <div
                  key={transaction.id}
                  className="px-5 py-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Info
                        label="Base Amount"
                        value={formatMoney(
                          transaction.base_amount,
                        )}
                      />

                      <Info
                        label="Commission"
                        value={formatMoney(
                          transaction.commission_amount,
                        )}
                      />

                      <Info
                        label="Created"
                        value={formatDateTime(
                          transaction.created_at,
                        )}
                      />

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Status
                        </div>

                        <span
                          className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            commissionStatusStyles[
                              transaction.status
                            ] ??
                            "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {
                            transaction.status_display
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {transaction.status ===
                      "EARNED" ? (
                        <button
                          type="button"
                          disabled={
                            busyId ===
                            transaction.id
                          }
                          onClick={() =>
                            void handleApprove(
                              transaction,
                            )
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                      ) : null}

                      {transaction.status ===
                      "APPROVED" ? (
                        <button
                          type="button"
                          disabled={
                            busyId ===
                            transaction.id
                          }
                          onClick={() =>
                            void handlePayable(
                              transaction,
                            )
                          }
                          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Mark Payable
                        </button>
                      ) : null}

                      {transaction.status ===
                      "PAYABLE" ? (
                        <button
                          type="button"
                          disabled={
                            busyId ===
                            transaction.id
                          }
                          onClick={() =>
                            void handlePaid(
                              transaction,
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {transaction.payment_reference ? (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Payment Reference:{" "}
                      <span className="font-medium text-slate-900">
                        {
                          transaction.payment_reference
                        }
                      </span>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>

      <div className="mt-2 text-lg font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CircleDollarSign,
  CreditCard,
  LoaderCircle,
  Plus,
  WalletCards,
} from "lucide-react";

import {
  addAdmissionFee,
  getAdmissionFeeSummary,
  recordAdmissionPayment,
} from "@/lib/api/admissions";

import type {
  AdmissionFee,
  AdmissionFeeSummary,
  AdmissionPayment,
} from "@/types/admissions";

const FEE_TYPES = [
  ["REGISTRATION", "Registration"],
  ["ADMISSION", "Admission"],
  ["TUITION", "Tuition"],
  ["EXAM", "Exam"],
  ["UNIVERSITY", "University"],
  ["PROJECT", "Project"],
  ["CERTIFICATE", "Certificate"],
  ["OTHER", "Other"],
] as const;

const PAYMENT_METHODS = [
  ["CASH", "Cash"],
  ["UPI", "UPI"],
  ["BANK_TRANSFER", "Bank Transfer"],
  ["CARD", "Card"],
  ["CHEQUE", "Cheque"],
  ["OTHER", "Other"],
] as const;

interface Props {
  admissionId: string;
  fees: AdmissionFee[];
  payments: AdmissionPayment[];
  canManageFinance: boolean;
  onChanged: () => Promise<void>;
}

function money(value: string | number) {
  const number = Number(value);

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(number)
      ? number
      : 0,
  );
}

export function AdmissionFinancePanel({
  admissionId,
  fees,
  payments,
  canManageFinance,
  onChanged,
}: Props) {
  const [summary, setSummary] =
    useState<AdmissionFeeSummary | null>(
      null,
    );

  const [feeType, setFeeType] =
    useState("ADMISSION");

  const [feeAmount, setFeeAmount] =
    useState("");

  const [feeDescription, setFeeDescription] =
    useState("");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("UPI");

  const [referenceNumber, setReferenceNumber] =
    useState("");

  const [receiptNumber, setReceiptNumber] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!canManageFinance) {
      setSummary(null);
      return;
    }

    void getAdmissionFeeSummary(
      admissionId,
    )
      .then(setSummary)
      .catch(() => {
        setSummary(null);
      });
  }, [
    admissionId,
    fees,
    payments,
    canManageFinance,
  ]);

  async function refresh() {
    await onChanged();

    if (canManageFinance) {
      try {
        const data =
          await getAdmissionFeeSummary(
            admissionId,
          );

        setSummary(data);
      } catch {
        setSummary(null);
      }
    }
  }

  async function handleAddFee() {
    if (
      !feeAmount ||
      Number(feeAmount) <= 0
    ) {
      setError(
        "Enter a valid fee amount.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await addAdmissionFee(
        admissionId,
        {
          fee_type: feeType,
          amount: feeAmount,
          description:
            feeDescription.trim(),
        },
      );

      setFeeAmount("");
      setFeeDescription("");

      await refresh();
    } catch {
      setError(
        "Unable to add admission fee.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePayment() {
    if (
      !paymentAmount ||
      Number(paymentAmount) <= 0
    ) {
      setError(
        "Enter a valid payment amount.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await recordAdmissionPayment(
        admissionId,
        {
          amount: paymentAmount,
          payment_method:
            paymentMethod,
          reference_number:
            referenceNumber.trim(),
          receipt_number:
            receiptNumber.trim(),
        },
      );

      setPaymentAmount("");
      setReferenceNumber("");
      setReceiptNumber("");

      await refresh();
    } catch {
      setError(
        "Unable to record payment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <CircleDollarSign
            size={20}
          />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            Admission Finance
          </h3>

          <p className="text-xs text-slate-500">
            Fee structure and payment collection.
          </p>
        </div>
      </div>

      {!canManageFinance ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          Financial information is restricted for this account.
        </div>
      ) : (
        <>
          {summary && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-400">
                  Total Fee
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {money(
                    summary.total_fee,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="text-xs text-emerald-600">
                  Paid
                </div>
                <div className="mt-2 font-semibold text-emerald-800">
                  {money(
                    summary.total_paid,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <div className="text-xs text-amber-600">
                  Balance
                </div>
                <div className="mt-2 font-semibold text-amber-800">
                  {money(
                    summary.balance,
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center gap-2 font-medium text-slate-900">
                <WalletCards
                  size={17}
                />
                Add Fee
              </div>

              <div className="space-y-3">
                <select
                  value={feeType}
                  onChange={(event) =>
                    setFeeType(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  {FEE_TYPES.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={feeAmount}
                  onChange={(event) =>
                    setFeeAmount(
                      event.target.value,
                    )
                  }
                  placeholder="Amount"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />

                <input
                  value={feeDescription}
                  onChange={(event) =>
                    setFeeDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Description"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void handleAddFee()
                  }
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={16} />
                  )}
                  Add Fee
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center gap-2 font-medium text-slate-900">
                <CreditCard
                  size={17}
                />
                Record Payment
              </div>

              <div className="space-y-3">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(
                      event.target.value,
                    )
                  }
                  placeholder="Payment amount"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  {PAYMENT_METHODS.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>

                <input
                  value={referenceNumber}
                  onChange={(event) =>
                    setReferenceNumber(
                      event.target.value,
                    )
                  }
                  placeholder="Reference number"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />

                <input
                  value={receiptNumber}
                  onChange={(event) =>
                    setReceiptNumber(
                      event.target.value,
                    )
                  }
                  placeholder="Receipt number"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void handlePayment()
                  }
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <CreditCard
                      size={16}
                    />
                  )}
                  Record Payment
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">
                Fee Items
              </h4>

              <div className="space-y-2">
                {fees.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No fee items.
                  </p>
                ) : (
                  fees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"
                    >
                      <span>
                        {fee.fee_type_display}
                      </span>
                      <strong>
                        {money(fee.amount)}
                      </strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">
                Payments
              </h4>

              <div className="space-y-2">
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No payments recorded.
                  </p>
                ) : (
                  payments.map(
                    (payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        <span>
                          {
                            payment.payment_method_display
                          }
                        </span>
                        <strong>
                          {money(
                            payment.amount,
                          )}
                        </strong>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
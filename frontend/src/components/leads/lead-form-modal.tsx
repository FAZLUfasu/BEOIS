"use client";

import {
  LoaderCircle,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createLead,
  updateLead,
} from "@/lib/api/leads";
import {
  getActivePartners,
} from "@/lib/api/partners";

import type {
  LeadDetail,
  LeadFormPayload,
  LeadVertical,
  LeadChannel,
} from "@/types/leads";
import type {
  PartnerListItem,
} from "@/types/partners";

interface LeadFormModalProps {
  open: boolean;
  lead?: LeadDetail | null;

  onClose: () => void;

  onSaved: (
    lead: LeadDetail,
  ) => void;
}

interface FormState {
  name: string;
  phone_number: string;
  alternate_phone: string;
  email: string;
  city: string;
  state: string;

  vertical: LeadVertical;
  channel: LeadChannel;

  partner: string;
  partner_reference_number: string;

  source: string;
  campaign: string;
  interested_course: string;
  previous_course: string;
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  phone_number: "",
  alternate_phone: "",
  email: "",
  city: "",
  state: "",

  vertical: "REGULAR",
  channel: "DIRECT",

  partner: "",
  partner_reference_number: "",

  source: "",
  campaign: "",
  interested_course: "",
  previous_course: "",
  notes: "",
};

export function LeadFormModal({
  open,
  lead,
  onClose,
  onSaved,
}: LeadFormModalProps) {
  const [form, setForm] =
    useState<FormState>(
      emptyForm,
    );

  const [partners, setPartners] =
    useState<PartnerListItem[]>([]);

  const [loadingPartners, setLoadingPartners] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const editing = Boolean(lead);

  useEffect(() => {
    if (!open) return;

    setError("");

    if (lead) {
      setForm({
        name: lead.name || "",
        phone_number:
          lead.phone_number || "",
        alternate_phone:
          lead.alternate_phone || "",
        email: lead.email || "",
        city: lead.city || "",
        state: lead.state || "",

        vertical: lead.vertical,
        channel: lead.channel,

        partner:
          lead.partner || "",

        partner_reference_number:
          lead.partner_reference_number ||
          "",

        source: lead.source || "",
        campaign: lead.campaign || "",

        interested_course:
          lead.interested_course || "",

        previous_course:
          lead.previous_course || "",

        notes: lead.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, lead]);

  useEffect(() => {
    if (
      !open ||
      form.channel !== "PARTNER"
    ) {
      return;
    }

    let cancelled = false;

    async function loadPartners() {
      setLoadingPartners(true);

      try {
        const response =
          await getActivePartners();

        if (!cancelled) {
          setPartners(response);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to load active partners.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPartners(false);
        }
      }
    }

    void loadPartners();

    return () => {
      cancelled = true;
    };
  }, [open, form.channel]);

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changeChannel(
    value: LeadChannel,
  ) {
    setForm((current) => ({
      ...current,
      channel: value,

      partner:
        value === "DIRECT"
          ? ""
          : current.partner,

      partner_reference_number:
        value === "DIRECT"
          ? ""
          : current.partner_reference_number,
    }));
  }

  function changeVertical(
    value: LeadVertical,
  ) {
    setForm((current) => ({
      ...current,
      vertical: value,

      previous_course:
        value === "REGULAR"
          ? ""
          : current.previous_course,
    }));
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError(
        "Lead name is required.",
      );
      return;
    }

    if (!form.phone_number.trim()) {
      setError(
        "Phone number is required.",
      );
      return;
    }

    if (
      form.channel === "PARTNER" &&
      !form.partner
    ) {
      setError(
        "Select a partner for a Partner lead.",
      );
      return;
    }

    const payload: LeadFormPayload = {
      name: form.name.trim(),

      phone_number:
        form.phone_number.trim(),

      alternate_phone:
        form.alternate_phone.trim(),

      email: form.email.trim(),
      city: form.city.trim(),
      state: form.state.trim(),

      vertical: form.vertical,
      channel: form.channel,

      partner:
        form.channel === "PARTNER"
          ? form.partner
          : null,

      partner_reference_number:
        form.channel === "PARTNER"
          ? form.partner_reference_number.trim()
          : "",

      source: form.source.trim(),

      campaign:
        form.campaign.trim(),

      interested_course:
        form.interested_course.trim(),

      previous_course:
        form.vertical ===
        "CREDIT_TRANSFER"
          ? form.previous_course.trim()
          : "",

      notes: form.notes.trim(),
    };

    setSaving(true);

    try {
      const saved =
        editing && lead
          ? await updateLead(
              lead.id,
              payload,
            )
          : await createLead(
              payload,
            );

      onSaved(saved);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save the lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

  const textareaClass =
    "min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

  const labelClass =
    "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
              Leads & Telecalling
            </div>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {editing
                ? `Edit ${lead?.lead_id}`
                : "Create New Lead"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {editing
                ? "Update the lead's enquiry and contact information."
                : "Register a new student enquiry in BEOIS."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="overflow-y-auto"
        >
          <div className="space-y-7 p-6">
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <section>
              <h3 className="text-sm font-bold text-slate-900">
                Student / Enquiry
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Full Name *
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      setField(
                        "name",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Student name"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Phone Number *
                  </label>

                  <input
                    value={
                      form.phone_number
                    }
                    onChange={(event) =>
                      setField(
                        "phone_number",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Primary phone"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Alternate Phone
                  </label>

                  <input
                    value={
                      form.alternate_phone
                    }
                    onChange={(event) =>
                      setField(
                        "alternate_phone",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setField(
                        "email",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    City
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) =>
                      setField(
                        "city",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    State
                  </label>

                  <input
                    value={form.state}
                    onChange={(event) =>
                      setField(
                        "state",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-900">
                Enquiry Classification
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Vertical *
                  </label>

                  <select
                    value={form.vertical}
                    onChange={(event) =>
                      changeVertical(
                        event.target
                          .value as LeadVertical,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="REGULAR">
                      Regular Distance Education
                    </option>

                    <option value="CREDIT_TRANSFER">
                      Credit Transfer
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Channel *
                  </label>

                  <select
                    value={form.channel}
                    onChange={(event) =>
                      changeChannel(
                        event.target
                          .value as LeadChannel,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="DIRECT">
                      BEST Direct
                    </option>

                    <option value="PARTNER">
                      Partner
                    </option>
                  </select>
                </div>

                {form.channel ===
                  "PARTNER" && (
                  <>
                    <div>
                      <label
                        className={
                          labelClass
                        }
                      >
                        Partner *
                      </label>

                      <select
                        value={
                          form.partner
                        }
                        onChange={(
                          event,
                        ) =>
                          setField(
                            "partner",
                            event.target
                              .value,
                          )
                        }
                        disabled={
                          loadingPartners
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          {loadingPartners
                            ? "Loading partners..."
                            : "Select partner"}
                        </option>

                        {partners.map(
                          (partner) => (
                            <option
                              key={
                                partner.id
                              }
                              value={
                                partner.id
                              }
                            >
                              {
                                partner.partner_id
                              }{" "}
                              —{" "}
                              {
                                partner.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label
                        className={
                          labelClass
                        }
                      >
                        Partner Reference
                      </label>

                      <input
                        value={
                          form.partner_reference_number
                        }
                        onChange={(
                          event,
                        ) =>
                          setField(
                            "partner_reference_number",
                            event.target
                              .value,
                          )
                        }
                        className={
                          inputClass
                        }
                        placeholder="Partner case/reference number"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>
                    Interested Course
                  </label>

                  <input
                    value={
                      form.interested_course
                    }
                    onChange={(event) =>
                      setField(
                        "interested_course",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="e.g. MBA"
                  />
                </div>

                {form.vertical ===
                  "CREDIT_TRANSFER" && (
                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Previous Course
                    </label>

                    <input
                      value={
                        form.previous_course
                      }
                      onChange={(
                        event,
                      ) =>
                        setField(
                          "previous_course",
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                      placeholder="Previous/incomplete course"
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-900">
                Marketing Attribution
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Source
                  </label>

                  <input
                    value={form.source}
                    onChange={(event) =>
                      setField(
                        "source",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Meta Ads, Website, Walk-in..."
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Campaign
                  </label>

                  <input
                    value={form.campaign}
                    onChange={(event) =>
                      setField(
                        "campaign",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Campaign name"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <label className={labelClass}>
                Internal Notes
              </label>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  setField(
                    "notes",
                    event.target.value,
                  )
                }
                className={
                  textareaClass
                }
                placeholder="Initial enquiry notes..."
              />
            </section>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-xl border border-slate-200 px-5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />
              )}

              {editing
                ? "Save Changes"
                : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
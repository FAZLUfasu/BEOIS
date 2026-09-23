"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Building,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

import {
  createBranch,
  createBusinessUnit,
  createDepartment,
  createTrust,
  deleteBranch,
  deleteBusinessUnit,
  deleteDepartment,
  deleteTrust,
  getBranches,
  getBusinessUnits,
  getDepartments,
  getTrusts,
  updateBranch,
  updateBusinessUnit,
  updateDepartment,
  updateTrust,
} from "@/lib/api/organization";

import type {
  Branch,
  BusinessUnit,
  Department,
  OrganizationTab,
  Trust,
} from "@/types/organization";


const tabs: {
  key: OrganizationTab;
  label: string;
}[] = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "trusts",
    label: "Trusts",
  },
  {
    key: "units",
    label: "Business Units",
  },
  {
    key: "branches",
    label: "Branches",
  },
  {
    key: "departments",
    label: "Departments",
  },
];


type Kind =
  | "trust"
  | "unit"
  | "branch"
  | "department";


type Editable =
  | Trust
  | BusinessUnit
  | Branch
  | Department;


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white " +
  "px-3 py-2.5 text-sm outline-none focus:border-blue-500";


const cardClass =
  "rounded-2xl border border-slate-200 bg-white shadow-sm";


export function OrganizationWorkspace() {
  const { hasRole } = useAuth();

  const canManage = hasRole(
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
  );

  const [tab, setTab] =
    useState<OrganizationTab>("overview");

  const [trusts, setTrusts] =
    useState<Trust[]>([]);

  const [units, setUnits] =
    useState<BusinessUnit[]>([]);

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [dialog, setDialog] =
    useState<{
      kind: Kind;
      item?: Editable;
    } | null>(null);


  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          trustData,
          unitData,
          branchData,
          departmentData,
        ] = await Promise.all([
          getTrusts(),
          getBusinessUnits(),
          getBranches(),
          getDepartments(),
        ]);

        setTrusts(trustData);
        setUnits(unitData);
        setBranches(branchData);
        setDepartments(
          departmentData,
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : (
                "Unable to load " +
                "organization data."
              ),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );


  useEffect(() => {
    void load();
  }, [load]);


  const q =
    search
      .trim()
      .toLowerCase();


  const match = (
    values: (
      string |
      null |
      undefined
    )[],
  ) =>
    !q ||
    values.some(
      (value) =>
        (value ?? "")
          .toLowerCase()
          .includes(q),
    );


  const filteredTrusts =
    useMemo(
      () =>
        trusts.filter(
          (item) =>
            match([
              item.name,
              item.short_name,
              item.registration_number,
            ]),
        ),
      [trusts, q],
    );


  const filteredUnits =
    useMemo(
      () =>
        units.filter(
          (item) =>
            match([
              item.name,
              item.code,
              item.trust_name,
            ]),
        ),
      [units, q],
    );


  const filteredBranches =
    useMemo(
      () =>
        branches.filter(
          (item) =>
            match([
              item.name,
              item.code,
              item.city,
              item.state,
              item.business_unit_name,
            ]),
        ),
      [branches, q],
    );


  const filteredDepartments =
    useMemo(
      () =>
        departments.filter(
          (item) =>
            match([
              item.name,
              item.code,
              item.branch_name,
              item.business_unit_name,
            ]),
        ),
      [departments, q],
    );


  const toggle = async (
    kind: Kind,
    item: Editable,
  ) => {
    try {
      setError("");

      const payload = {
        is_active:
          !item.is_active,
      };

      if (kind === "trust") {
        await updateTrust(
          item.id,
          payload,
        );
      }

      if (kind === "unit") {
        await updateBusinessUnit(
          item.id,
          payload,
        );
      }

      if (kind === "branch") {
        await updateBranch(
          item.id,
          payload,
        );
      }

      if (kind === "department") {
        await updateDepartment(
          item.id,
          payload,
        );
      }

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Update failed.",
      );
    }
  };


  const remove = async (
    kind: Kind,
    item: Editable,
  ) => {
    let label = "Record";

    if (kind === "trust") {
      label = "Trust";
    }

    if (kind === "unit") {
      label = "Business Unit";
    }

    if (kind === "branch") {
      label = "Branch";
    }

    if (kind === "department") {
      label = "Department";
    }

    const confirmed =
      window.confirm(
        `Delete ${label} "${item.name}"?\n\n` +
        "This permanently removes the record. " +
        "This action cannot be undone.",
      );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      if (kind === "trust") {
        await deleteTrust(
          item.id,
        );
      }

      if (kind === "unit") {
        await deleteBusinessUnit(
          item.id,
        );
      }

      if (kind === "branch") {
        await deleteBranch(
          item.id,
        );
      }

      if (kind === "department") {
        await deleteDepartment(
          item.id,
        );
      }

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : (
              "Unable to delete this record. " +
              "It may already be used " +
              "elsewhere in BEOIS."
            ),
      );
    }
  };


  const newKind = (): Kind => {
    if (tab === "trusts") {
      return "trust";
    }

    if (tab === "units") {
      return "unit";
    }

    if (tab === "branches") {
      return "branch";
    }

    return "department";
  };


  const addLabel = () => {
    if (tab === "units") {
      return "Business Unit";
    }

    if (tab === "trusts") {
      return "Trust";
    }

    if (tab === "branches") {
      return "Branch";
    }

    return "Department";
  };


  return (
    <div
      className={
        "min-w-0 max-w-full " +
        "space-y-6 overflow-x-hidden"
      }
    >
      <div
        className={
          "flex flex-col gap-4 " +
          "lg:flex-row lg:items-end " +
          "lg:justify-between"
        }
      >
        <div>
          <p
            className={
              "text-xs font-bold uppercase " +
              "tracking-[0.22em] text-blue-600"
            }
          >
            Administration
          </p>

          <h1
            className={
              "mt-2 text-2xl font-bold " +
              "text-slate-950 sm:text-3xl"
            }
          >
            Organization Management
          </h1>

          <p
            className={
              "mt-2 max-w-3xl text-sm " +
              "text-slate-500"
            }
          >
            Manage the BEOIS hierarchy from
            Trust to Business Unit, Branch and
            Department.
          </p>
        </div>

        <button
          onClick={() =>
            void load()
          }
          className={
            "inline-flex items-center " +
            "justify-center gap-2 rounded-xl " +
            "border border-slate-200 bg-white " +
            "px-4 py-2.5 text-sm font-semibold " +
            "text-slate-700"
          }
        >
          <RefreshCw
            className="h-4 w-4"
          />

          Refresh
        </button>
      </div>


      {error && (
        <div
          className={
            "rounded-xl border border-red-200 " +
            "bg-red-50 p-3 text-sm text-red-700"
          }
        >
          {error}
        </div>
      )}


      <div
        className={
          "grid grid-cols-2 gap-3 " +
          "lg:grid-cols-4"
        }
      >
        <Stat
          icon={ShieldCheck}
          label="Trusts"
          value={trusts.length}
        />

        <Stat
          icon={Building2}
          label="Business Units"
          value={units.length}
        />

        <Stat
          icon={Building}
          label="Branches"
          value={branches.length}
        />

        <Stat
          icon={Network}
          label="Departments"
          value={departments.length}
        />
      </div>


      <div
        className={
          `${cardClass} overflow-hidden`
        }
      >
        <div
          className={
            "flex flex-wrap gap-2 " +
            "border-b border-slate-100 p-3"
          }
        >
          {tabs.map(
            (item) => (
              <button
                key={item.key}
                onClick={() =>
                  setTab(item.key)
                }
                className={
                  "rounded-xl px-3 py-2 " +
                  "text-sm font-semibold " +
                  (
                    tab === item.key
                      ? (
                          "bg-slate-950 " +
                          "text-white"
                        )
                      : (
                          "text-slate-600 " +
                          "hover:bg-slate-100"
                        )
                  )
                }
              >
                {item.label}
              </button>
            ),
          )}
        </div>


        {tab !== "overview" && (
          <div
            className={
              "flex flex-col gap-3 border-b " +
              "border-slate-100 p-4 " +
              "sm:flex-row sm:items-center " +
              "sm:justify-between"
            }
          >
            <div
              className={
                "relative w-full sm:max-w-sm"
              }
            >
              <Search
                className={
                  "absolute left-3 top-3 " +
                  "h-4 w-4 text-slate-400"
                }
              />

              <input
                value={search}
                onChange={
                  (e) =>
                    setSearch(
                      e.target.value,
                    )
                }
                placeholder="Search..."
                className={
                  `${inputClass} pl-9`
                }
              />
            </div>

            {canManage && (
              <button
                onClick={() =>
                  setDialog({
                    kind: newKind(),
                  })
                }
                className={
                  "inline-flex items-center " +
                  "justify-center gap-2 " +
                  "rounded-xl bg-blue-600 " +
                  "px-4 py-2.5 text-sm " +
                  "font-semibold text-white"
                }
              >
                <Plus
                  className="h-4 w-4"
                />

                Add {addLabel()}
              </button>
            )}
          </div>
        )}


        <div className="p-4">
          {loading ? (
            <div
              className={
                "py-16 text-center " +
                "text-sm text-slate-500"
              }
            >
              Loading organization...
            </div>
          ) : tab === "overview" ? (
            <Hierarchy
              trusts={trusts}
              units={units}
              branches={branches}
              departments={departments}
            />
          ) : tab === "trusts" ? (
            <Grid
              items={filteredTrusts}
              kind="trust"
              canManage={canManage}
              edit={
                (item) =>
                  setDialog({
                    kind: "trust",
                    item,
                  })
              }
              toggle={toggle}
              remove={remove}
            />
          ) : tab === "units" ? (
            <Grid
              items={filteredUnits}
              kind="unit"
              canManage={canManage}
              edit={
                (item) =>
                  setDialog({
                    kind: "unit",
                    item,
                  })
              }
              toggle={toggle}
              remove={remove}
            />
          ) : tab === "branches" ? (
            <Grid
              items={filteredBranches}
              kind="branch"
              canManage={canManage}
              edit={
                (item) =>
                  setDialog({
                    kind: "branch",
                    item,
                  })
              }
              toggle={toggle}
              remove={remove}
            />
          ) : (
            <Grid
              items={filteredDepartments}
              kind="department"
              canManage={canManage}
              edit={
                (item) =>
                  setDialog({
                    kind: "department",
                    item,
                  })
              }
              toggle={toggle}
              remove={remove}
            />
          )}
        </div>
      </div>


      {dialog && (
        <Editor
          kind={dialog.kind}
          item={dialog.item}
          trusts={trusts}
          units={units}
          branches={branches}
          close={
            () =>
              setDialog(null)
          }
          saved={
            async () => {
              setDialog(null);
              await load();
            }
          }
        />
      )}
    </div>
  );
}


function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <div
      className={
        `${cardClass} p-4`
      }
    >
      <Icon
        className={
          "h-5 w-5 text-blue-600"
        }
      />

      <p
        className={
          "mt-3 text-2xl font-bold " +
          "text-slate-950"
        }
      >
        {value}
      </p>

      <p
        className={
          "text-xs font-semibold uppercase " +
          "tracking-wide text-slate-500"
        }
      >
        {label}
      </p>
    </div>
  );
}


function Hierarchy({
  trusts,
  units,
  branches,
  departments,
}: {
  trusts: Trust[];
  units: BusinessUnit[];
  branches: Branch[];
  departments: Department[];
}) {
  const shared =
    departments.filter(
      (department) =>
        !department.branch,
    );

  return (
    <div className="space-y-4">
      {trusts.map(
        (trust) => (
          <div
            key={trust.id}
            className={
              "rounded-2xl border " +
              "border-slate-200 p-4"
            }
          >
            <div
              className={
                "font-bold text-slate-950"
              }
            >
              {trust.name}
            </div>

            <div
              className={
                "mt-3 grid gap-3 " +
                "lg:grid-cols-2"
              }
            >
              {units
                .filter(
                  (unit) =>
                    unit.trust === trust.id,
                )
                .map(
                  (unit) => (
                    <div
                      key={unit.id}
                      className={
                        "rounded-xl " +
                        "bg-slate-50 p-4"
                      }
                    >
                      <div
                        className="font-semibold"
                      >
                        {unit.name}{" "}

                        <span
                          className={
                            "text-xs " +
                            "text-slate-400"
                          }
                        >
                          ({unit.code})
                        </span>
                      </div>

                      <div
                        className={
                          "mt-3 space-y-2"
                        }
                      >
                        {branches
                          .filter(
                            (branch) =>
                              branch
                                .business_unit ===
                              unit.id,
                          )
                          .map(
                            (branch) => (
                              <div
                                key={
                                  branch.id
                                }
                                className={
                                  "rounded-lg border " +
                                  "border-slate-200 " +
                                  "bg-white p-3"
                                }
                              >
                                <div
                                  className={
                                    "text-sm " +
                                    "font-semibold"
                                  }
                                >
                                  {branch.name}

                                  {branch
                                    .is_head_office
                                    ? (
                                        " • " +
                                        "Head Office"
                                      )
                                    : ""}
                                </div>

                                <div
                                  className={
                                    "mt-1 text-xs " +
                                    "text-slate-500"
                                  }
                                >
                                  {
                                    departments
                                      .filter(
                                        (
                                          department,
                                        ) =>
                                          department
                                            .branch ===
                                          branch.id,
                                      )
                                      .map(
                                        (
                                          department,
                                        ) =>
                                          department
                                            .name,
                                      )
                                      .join(" • ")
                                    ||
                                    "No departments"
                                  }
                                </div>
                              </div>
                            ),
                          )}
                      </div>
                    </div>
                  ),
                )}
            </div>
          </div>
        ),
      )}

      {shared.length > 0 && (
        <div
          className={
            "rounded-2xl border border-dashed " +
            "border-blue-200 bg-blue-50/40 p-4"
          }
        >
          <div
            className={
              "font-semibold text-slate-900"
            }
          >
            Shared Departments
          </div>

          <div
            className={
              "mt-2 text-sm text-slate-600"
            }
          >
            {shared
              .map(
                (department) =>
                  department.name,
              )
              .join(" • ")}
          </div>
        </div>
      )}
    </div>
  );
}


function Grid({
  items,
  kind,
  canManage,
  edit,
  toggle,
  remove,
}: {
  items: Editable[];
  kind: Kind;
  canManage: boolean;
  edit: (
    item: Editable,
  ) => void;
  toggle: (
    kind: Kind,
    item: Editable,
  ) => Promise<void>;
  remove: (
    kind: Kind,
    item: Editable,
  ) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <div
        className={
          "py-16 text-center " +
          "text-sm text-slate-500"
        }
      >
        No records found.
      </div>
    );
  }

  return (
    <div
      className={
        "grid gap-3 md:grid-cols-2 " +
        "xl:grid-cols-3"
      }
    >
      {items.map(
        (item) => {
          const record =
            item as Editable & {
              code?: string;
              short_name?: string;
              branch_name?:
                string | null;
              business_unit_name?:
                string | null;
              trust_name?: string;
            };

          return (
            <div
              key={item.id}
              className={
                "min-w-0 rounded-xl border " +
                "border-slate-200 p-4"
              }
            >
              <div
                className={
                  "flex items-start " +
                  "justify-between gap-3"
                }
              >
                <div className="min-w-0">
                  <p
                    className={
                      "truncate font-semibold " +
                      "text-slate-950"
                    }
                  >
                    {record.name}
                  </p>

                  <p
                    className={
                      "mt-1 truncate text-xs " +
                      "text-slate-500"
                    }
                  >
                    {
                      record.code ||
                      record.short_name ||
                      record.branch_name ||
                      record.business_unit_name ||
                      record.trust_name ||
                      (
                        kind === "department"
                          ? "Shared department"
                          : ""
                      )
                    }
                  </p>
                </div>

                <span
                  className={
                    "shrink-0 rounded-full " +
                    "px-2 py-1 text-[11px] " +
                    "font-bold " +
                    (
                      record.is_active
                        ? (
                            "bg-emerald-50 " +
                            "text-emerald-700"
                          )
                        : (
                            "bg-slate-100 " +
                            "text-slate-500"
                          )
                    )
                  }
                >
                  {
                    record.is_active
                      ? "ACTIVE"
                      : "INACTIVE"
                  }
                </span>
              </div>


              {canManage && (
                <div
                  className={
                    "mt-4 flex flex-wrap gap-2"
                  }
                >
                  <button
                    onClick={
                      () =>
                        edit(item)
                    }
                    className={
                      "rounded-lg border " +
                      "border-slate-200 " +
                      "px-3 py-1.5 text-xs " +
                      "font-semibold " +
                      "hover:bg-slate-50"
                    }
                  >
                    Edit
                  </button>


                  <button
                    onClick={
                      () =>
                        void toggle(
                          kind,
                          item,
                        )
                    }
                    className={
                      "rounded-lg border " +
                      "border-slate-200 " +
                      "px-3 py-1.5 text-xs " +
                      "font-semibold " +
                      "hover:bg-slate-50"
                    }
                  >
                    {
                      item.is_active
                        ? "Deactivate"
                        : "Activate"
                    }
                  </button>


                  <button
                    onClick={
                      () =>
                        void remove(
                          kind,
                          item,
                        )
                    }
                    className={
                      "inline-flex items-center " +
                      "gap-1.5 rounded-lg border " +
                      "border-red-200 bg-red-50 " +
                      "px-3 py-1.5 text-xs " +
                      "font-semibold text-red-700 " +
                      "hover:bg-red-100"
                    }
                  >
                    <Trash2
                      className="h-3.5 w-3.5"
                    />

                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}


function Editor({
  kind,
  item,
  trusts,
  units,
  branches,
  close,
  saved,
}: {
  kind: Kind;
  item?: Editable;
  trusts: Trust[];
  units: BusinessUnit[];
  branches: Branch[];
  close: () => void;
  saved: () => Promise<void>;
}) {
  const initial =
    item
      ? (
          {
            ...item,
          } as Record<
            string,
            unknown
          >
        )
      : {
          is_active: true,
        };


  const [form, setForm] =
    useState<
      Record<string, unknown>
    >(initial);


  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");


  const set = (
    key: string,
    value: unknown,
  ) =>
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );


  const submit = async (
    e: FormEvent,
  ) => {
    e.preventDefault();

    setBusy(true);
    setError("");

    try {
      const payload = {
        ...form,
      };

      [
        "id",
        "created_at",
        "updated_at",
        "trust_name",
        "business_unit_name",
        "branch_name",
      ].forEach(
        (key) =>
          delete payload[key],
      );


      if (kind === "trust") {
        if (item) {
          await updateTrust(
            item.id,
            payload,
          );
        } else {
          await createTrust(
            payload,
          );
        }
      }


      if (kind === "unit") {
        if (item) {
          await updateBusinessUnit(
            item.id,
            payload,
          );
        } else {
          await createBusinessUnit(
            payload,
          );
        }
      }


      if (kind === "branch") {
        delete payload.trust;

        if (item) {
          await updateBranch(
            item.id,
            payload,
          );
        } else {
          await createBranch(
            payload,
          );
        }
      }


      if (kind === "department") {
        delete payload.business_unit;

        if (item) {
          await updateDepartment(
            item.id,
            payload,
          );
        } else {
          await createDepartment(
            payload,
          );
        }
      }


      await saved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save record.",
      );
    } finally {
      setBusy(false);
    }
  };


  const title: string =
  kind === "unit"
    ? "Business Unit"
    : kind === "trust"
      ? "Trust"
      : kind === "branch"
        ? "Branch"
        : "Department";

  return (
    <div
      className={
        "fixed inset-0 z-50 flex " +
        "items-center justify-center " +
        "bg-slate-950/40 p-4"
      }
    >
      <div
        className={
          "max-h-[90vh] w-full max-w-2xl " +
          "overflow-y-auto rounded-2xl " +
          "bg-white shadow-2xl"
        }
      >
        <div
          className={
            "flex items-center justify-between " +
            "border-b p-5"
          }
        >
          <div>
            <p
              className={
                "text-xs font-bold uppercase " +
                "tracking-wider text-blue-600"
              }
            >
              Organization
            </p>

            <h2
              className={
                "text-xl font-bold"
              }
            >
              {item ? "Edit" : "Add"}{" "}
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={close}
          >
            <X
              className="h-5 w-5"
            />
          </button>
        </div>


        <form
          onSubmit={submit}
          className={
            "grid gap-4 p-5 " +
            "sm:grid-cols-2"
          }
        >
          {kind === "unit" && (
            <Select
              label="Trust"
              value={form.trust}
              setValue={
                (value) =>
                  set(
                    "trust",
                    value,
                  )
              }
              options={
                trusts.map(
                  (trust) => [
                    trust.id,
                    trust.name,
                  ],
                )
              }
            />
          )}


          {kind === "branch" && (
            <Select
              label="Business Unit"
              value={
                form.business_unit
              }
              setValue={
                (value) =>
                  set(
                    "business_unit",
                    value,
                  )
              }
              options={
                units.map(
                  (unit) => [
                    unit.id,
                    unit.name,
                  ],
                )
              }
            />
          )}


          {kind === "department" && (
            <Select
              label={
                "Branch (blank = shared)"
              }
              value={form.branch}
              setValue={
                (value) =>
                  set(
                    "branch",
                    value || null,
                  )
              }
              options={
                branches.map(
                  (branch) => [
                    branch.id,
                    branch.name,
                  ],
                )
              }
              optional
            />
          )}


          <Field
            label="Name"
            value={form.name}
            setValue={
              (value) =>
                set(
                  "name",
                  value,
                )
            }
            required
          />


          {kind === "trust" ? (
            <>
              <Field
                label="Short name"
                value={
                  form.short_name
                }
                setValue={
                  (value) =>
                    set(
                      "short_name",
                      value,
                    )
                }
              />

              <Field
                label={
                  "Registration number"
                }
                value={
                  form.registration_number
                }
                setValue={
                  (value) =>
                    set(
                      "registration_number",
                      value,
                    )
                }
              />

              <Field
                label="Phone"
                value={
                  form.phone_number
                }
                setValue={
                  (value) =>
                    set(
                      "phone_number",
                      value,
                    )
                }
              />

              <Field
                label="Email"
                type="email"
                value={form.email}
                setValue={
                  (value) =>
                    set(
                      "email",
                      value,
                    )
                }
              />

              <Field
                label="Address"
                value={form.address}
                setValue={
                  (value) =>
                    set(
                      "address",
                      value,
                    )
                }
                wide
              />
            </>
          ) : (
            <Field
              label="Code"
              value={form.code}
              setValue={
                (value) =>
                  set(
                    "code",
                    value,
                  )
              }
              required
            />
          )}


          {kind === "unit" && (
            <Field
              label="Description"
              value={
                form.description
              }
              setValue={
                (value) =>
                  set(
                    "description",
                    value,
                  )
              }
              wide
            />
          )}


          {kind === "branch" && (
            <>
              <Field
                label="Phone"
                value={
                  form.phone_number
                }
                setValue={
                  (value) =>
                    set(
                      "phone_number",
                      value,
                    )
                }
              />

              <Field
                label="Email"
                type="email"
                value={form.email}
                setValue={
                  (value) =>
                    set(
                      "email",
                      value,
                    )
                }
              />

              <Field
                label="City"
                value={form.city}
                setValue={
                  (value) =>
                    set(
                      "city",
                      value,
                    )
                }
              />

              <Field
                label="State"
                value={form.state}
                setValue={
                  (value) =>
                    set(
                      "state",
                      value,
                    )
                }
              />

              <Field
                label="Pincode"
                value={form.pincode}
                setValue={
                  (value) =>
                    set(
                      "pincode",
                      value,
                    )
                }
              />

              <Field
                label="Address"
                value={form.address}
                setValue={
                  (value) =>
                    set(
                      "address",
                      value,
                    )
                }
                wide
              />

              <Check
                label="Head Office"
                checked={
                  Boolean(
                    form.is_head_office,
                  )
                }
                setChecked={
                  (value) =>
                    set(
                      "is_head_office",
                      value,
                    )
                }
              />
            </>
          )}


          {kind === "department" && (
            <Field
              label="Description"
              value={
                form.description
              }
              setValue={
                (value) =>
                  set(
                    "description",
                    value,
                  )
              }
              wide
            />
          )}


          <Check
            label="Active"
            checked={
              form.is_active !== false
            }
            setChecked={
              (value) =>
                set(
                  "is_active",
                  value,
                )
            }
          />


          {error && (
            <div
              className={
                "rounded-xl bg-red-50 p-3 " +
                "text-sm text-red-700 " +
                "sm:col-span-2"
              }
            >
              {error}
            </div>
          )}


          <div
            className={
              "flex justify-end gap-2 " +
              "border-t pt-4 sm:col-span-2"
            }
          >
            <button
              type="button"
              onClick={close}
              className={
                "rounded-xl border px-4 " +
                "py-2 text-sm font-semibold"
              }
            >
              Cancel
            </button>

            <button
              disabled={busy}
              className={
                "rounded-xl bg-blue-600 " +
                "px-4 py-2 text-sm " +
                "font-semibold text-white " +
                "disabled:opacity-50"
              }
            >
              {
                busy
                  ? "Saving..."
                  : "Save"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function Field({
  label,
  value,
  setValue,
  type = "text",
  required = false,
  wide = false,
}: {
  label: string;
  value: unknown;
  setValue: (
    value: string,
  ) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label
      className={
        wide
          ? "sm:col-span-2"
          : ""
      }
    >
      <span
        className={
          "mb-1.5 block text-xs " +
          "font-semibold text-slate-600"
        }
      >
        {label}
      </span>

      <input
        type={type}
        required={required}
        value={
          String(
            value ?? "",
          )
        }
        onChange={
          (e) =>
            setValue(
              e.target.value,
            )
        }
        className={inputClass}
      />
    </label>
  );
}


function Select({
  label,
  value,
  setValue,
  options,
  optional = false,
}: {
  label: string;
  value: unknown;
  setValue: (
    value: string,
  ) => void;
  options: [
    string,
    string,
  ][];
  optional?: boolean;
}) {
  return (
    <label>
      <span
        className={
          "mb-1.5 block text-xs " +
          "font-semibold text-slate-600"
        }
      >
        {label}
      </span>

      <select
        required={!optional}
        value={
          String(
            value ?? "",
          )
        }
        onChange={
          (e) =>
            setValue(
              e.target.value,
            )
        }
        className={inputClass}
      >
        <option value="">
          {
            optional
              ? "Shared / no branch"
              : "Select..."
          }
        </option>

        {options.map(
          ([id, name]) => (
            <option
              key={id}
              value={id}
            >
              {name}
            </option>
          ),
        )}
      </select>
    </label>
  );
}


function Check({
  label,
  checked,
  setChecked,
}: {
  label: string;
  checked: boolean;
  setChecked: (
    value: boolean,
  ) => void;
}) {
  return (
    <label
      className={
        "flex items-center gap-2 " +
        "text-sm font-semibold " +
        "text-slate-700"
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={
          (e) =>
            setChecked(
              e.target.checked,
            )
        }
        className="h-4 w-4"
      />

      {label}
    </label>
  );
}
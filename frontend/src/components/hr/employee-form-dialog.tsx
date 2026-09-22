"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  Save,
  UserPlus,
  X,
} from "lucide-react";

import {
  createEmployee,
  getAssignableEmployees,
  updateEmployee,
} from "@/lib/api/employees";

import {
  getDesignations,
  getUserDirectory,
  getUserDirectoryItem,
} from "@/lib/api/hr";

import {
  getBranches,
  getEmployeeDepartments,
} from "@/lib/api/organization";

import type {
  EmployeeListItem,
  EmployeePayload,
  EmploymentStatus,
  EmploymentType,
} from "@/types/employees";

import type {
  Designation,
  UserDirectoryItem,
} from "@/types/hr";

import type {
  OrganizationBranch,
  OrganizationDepartment,
} from "@/types/organization";


interface EmployeeFormDialogProps {
  open: boolean;

  employee?: EmployeeListItem | null;

  onClose: () => void;

  onSaved: (
    employee: EmployeeListItem,
  ) => void;
}


interface FormState {
  user: string;

  branch: string;
  department: string;

  designation: string;
  designation_master: string;

  reporting_manager: string;

  employment_type: EmploymentType;
  employment_status: EmploymentStatus;

  date_of_joining: string;
  date_of_exit: string;

  phone_number: string;
  alternate_phone_number: string;
  personal_email: string;

  address: string;

  emergency_contact_name: string;
  emergency_contact_number: string;

  notes: string;
}


const EMPTY_FORM: FormState = {
  user: "",

  branch: "",
  department: "",

  designation: "",
  designation_master: "",

  reporting_manager: "",

  employment_type: "FULL_TIME",
  employment_status: "ACTIVE",

  date_of_joining: "",
  date_of_exit: "",

  phone_number: "",
  alternate_phone_number: "",
  personal_email: "",

  address: "",

  emergency_contact_name: "",
  emergency_contact_number: "",

  notes: "",
};


const EMPLOYMENT_TYPES: Array<{
  value: EmploymentType;
  label: string;
}> = [
  {
    value: "FULL_TIME",
    label: "Full Time",
  },
  {
    value: "PART_TIME",
    label: "Part Time",
  },
  {
    value: "CONTRACT",
    label: "Contract",
  },
  {
    value: "INTERN",
    label: "Intern",
  },
];


const EMPLOYMENT_STATUSES: Array<{
  value: EmploymentStatus;
  label: string;
}> = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "ON_LEAVE",
    label: "On Leave",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    value: "RESIGNED",
    label: "Resigned",
  },
  {
    value: "TERMINATED",
    label: "Terminated",
  },
];


function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to save employee.";
}


export function EmployeeFormDialog({
  open,
  employee,
  onClose,
  onSaved,
}: EmployeeFormDialogProps) {
  const editing =
    Boolean(employee);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    EMPTY_FORM,
  );

  const [
    branches,
    setBranches,
  ] = useState<
    OrganizationBranch[]
  >([]);

  const [
    departments,
    setDepartments,
  ] = useState<
    OrganizationDepartment[]
  >([]);

  const [
    designations,
    setDesignations,
  ] = useState<
    Designation[]
  >([]);

  const [
    users,
    setUsers,
  ] = useState<
    UserDirectoryItem[]
  >([]);

  const [
    managers,
    setManagers,
  ] = useState<
    EmployeeListItem[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    referenceLoading,
    setReferenceLoading,
  ] = useState(false);

  const [
    departmentLoading,
    setDepartmentLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const setField = useCallback(
    <K extends keyof FormState>(
      key: K,
      value: FormState[K],
    ) => {
      setForm(
        (current) => ({
          ...current,
          [key]: value,
        }),
      );
    },
    [],
  );


  useEffect(() => {
    if (!open) {
      return;
    }

    if (employee) {
      setForm({
        user:
          employee.user ?? "",

        branch:
          employee.branch ?? "",

        department:
          employee.department ?? "",

        designation:
          employee.designation ?? "",

        designation_master:
          employee.designation_master ??
          "",

        reporting_manager:
          employee.reporting_manager ??
          "",

        employment_type:
          employee.employment_type,

        employment_status:
          employee.employment_status,

        date_of_joining:
          employee.date_of_joining ??
          "",

        date_of_exit:
          employee.date_of_exit ??
          "",

        phone_number:
          employee.phone_number ??
          "",

        alternate_phone_number:
          employee.alternate_phone_number ??
          "",

        personal_email:
          employee.personal_email ??
          "",

        address:
          employee.address ?? "",

        emergency_contact_name:
          employee.emergency_contact_name ??
          "",

        emergency_contact_number:
          employee.emergency_contact_number ??
          "",

        notes:
          employee.notes ?? "",
      });
    } else {
      setForm(
        EMPTY_FORM,
      );
    }

    setError("");
  }, [
    open,
    employee,
  ]);


  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    async function loadReferenceData() {
      setReferenceLoading(true);

      try {
        const [
          branchData,
          designationData,
          userData,
          managerData,
        ] =
          await Promise.all([
            getBranches({
              active: true,
            }),

            getDesignations({
              active: true,
            }),

            getUserDirectory({
              active: true,
              unlinked: true,
            }),

            getAssignableEmployees(),
          ]);

        if (!active) {
          return;
        }

        setBranches(
          branchData.sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
              ),
          ),
        );

        setDesignations(
          designationData.sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
              ),
          ),
        );

        let availableUsers =
          [...userData];

        /*
         * During edit, the currently linked
         * account is not returned by
         * unlinked=true. Add it explicitly.
         */
        if (
          employee?.user &&
          !availableUsers.some(
            (user) =>
              user.id ===
              employee.user,
          )
        ) {
          try {
            const currentUser =
              await getUserDirectoryItem(
                employee.user,
              );

            if (active) {
              availableUsers = [
                currentUser,
                ...availableUsers,
              ];
            }
          } catch {
            /*
             * Keep the employee editable even
             * if the linked account cannot be
             * loaded separately.
             */
          }
        }

        if (active) {
          setUsers(
            availableUsers.sort(
              (a, b) =>
                a.full_name.localeCompare(
                  b.full_name,
                ),
            ),
          );

          setManagers(
            managerData.filter(
              (manager) =>
                manager.id !==
                employee?.id,
            ),
          );
        }
      } catch (
        requestError
      ) {
        if (active) {
          setError(
            getErrorMessage(
              requestError,
            ),
          );
        }
      } finally {
        if (active) {
          setReferenceLoading(
            false,
          );
        }
      }
    }

    void loadReferenceData();

    return () => {
      active = false;
    };
  }, [
    open,
    employee,
  ]);


  useEffect(() => {
    if (
      !open ||
      !form.branch
    ) {
      setDepartments([]);
      return;
    }

    let active = true;

    async function loadDepartments() {
      setDepartmentLoading(
        true,
      );

      try {
        const data =
          await getEmployeeDepartments(
            form.branch,
          );

        if (active) {
          setDepartments(data);
        }
      } catch (
        requestError
      ) {
        if (active) {
          setError(
            getErrorMessage(
              requestError,
            ),
          );
        }
      } finally {
        if (active) {
          setDepartmentLoading(
            false,
          );
        }
      }
    }

    void loadDepartments();

    return () => {
      active = false;
    };
  }, [
    open,
    form.branch,
  ]);


  const selectedUser =
    useMemo(
      () =>
        users.find(
          (user) =>
            user.id === form.user,
        ) ?? null,
      [
        users,
        form.user,
      ],
    );


  function handleBranchChange(
    branchId: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        branch: branchId,
        department: "",
      }),
    );
  }


  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!form.branch) {
      setError(
        "Branch is required.",
      );
      return;
    }

    if (!form.department) {
      setError(
        "Department is required.",
      );
      return;
    }

    if (
      form.date_of_exit &&
      form.date_of_joining &&
      form.date_of_exit <
        form.date_of_joining
    ) {
      setError(
        "Date of exit cannot be before date of joining.",
      );
      return;
    }

    const payload: EmployeePayload =
      {
        user:
          form.user || null,

        branch:
          form.branch,

        department:
          form.department,

        designation:
          form.designation.trim(),

        designation_master:
          form.designation_master ||
          null,

        reporting_manager:
          form.reporting_manager ||
          null,

        employment_type:
          form.employment_type,

        employment_status:
          form.employment_status,

        date_of_joining:
          form.date_of_joining ||
          null,

        date_of_exit:
          form.date_of_exit ||
          null,

        phone_number:
          form.phone_number.trim(),

        alternate_phone_number:
          form.alternate_phone_number.trim(),

        personal_email:
          form.personal_email.trim(),

        address:
          form.address.trim(),

        emergency_contact_name:
          form.emergency_contact_name.trim(),

        emergency_contact_number:
          form.emergency_contact_number.trim(),

        notes:
          form.notes.trim(),
      };

    try {
      setLoading(true);
      setError("");

      const saved =
        employee
          ? await updateEmployee(
              employee.id,
              payload,
            )
          : await createEmployee(
              payload,
            );

      onSaved(saved);
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setLoading(false);
    }
  }


  if (!open) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <UserPlus className="h-5 w-5" />

              <p className="text-sm font-semibold uppercase tracking-[0.12em]">
                Human Resources
              </p>
            </div>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {editing
                ? "Edit Employee"
                : "New Employee"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editing
                ? `Update ${employee?.employee_id ?? "employee"} workforce information.`
                : "Create an employee profile and assign the organizational structure."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>


        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          <FormSection
            title="Account & Organization"
            description="Connect the employee to their BEOIS account and organizational position."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="BEOIS User Account"
                helper="Optional. Only accounts not already linked to another employee are shown."
              >
                <select
                  value={form.user}
                  onChange={(event) =>
                    setField(
                      "user",
                      event.target.value,
                    )
                  }
                  disabled={
                    referenceLoading
                  }
                  className={inputClass}
                >
                  <option value="">
                    No linked account
                  </option>

                  {users.map(
                    (user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.full_name}
                        {user.email
                          ? ` — ${user.email}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Account Information"
                helper="Employee name is derived from the linked BEOIS user account."
              >
                <div className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {selectedUser ? (
                    <>
                      <span className="font-semibold">
                        {
                          selectedUser.full_name
                        }
                      </span>

                      <span className="ml-2 text-slate-400">
                        @
                        {
                          selectedUser.username
                        }
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">
                      No account selected
                    </span>
                  )}
                </div>
              </Field>

              <Field
                label="Branch"
                required
              >
                <select
                  value={form.branch}
                  onChange={(event) =>
                    handleBranchChange(
                      event.target.value,
                    )
                  }
                  disabled={
                    referenceLoading
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                        {branch.is_head_office
                          ? " — Head Office"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Department"
                required
              >
                <select
                  value={
                    form.department
                  }
                  onChange={(event) =>
                    setField(
                      "department",
                      event.target.value,
                    )
                  }
                  disabled={
                    !form.branch ||
                    departmentLoading
                  }
                  className={inputClass}
                >
                  <option value="">
                    {departmentLoading
                      ? "Loading departments..."
                      : form.branch
                        ? "Select department"
                        : "Select branch first"}
                  </option>

                  {departments.map(
                    (
                      department,
                    ) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {
                          department.name
                        }
                        {department.branch ===
                        null
                          ? " — Shared"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>
          </FormSection>


          <FormSection
            title="Employment"
            description="Configure designation, manager, employment type and status."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Designation">
                <select
                  value={
                    form.designation_master
                  }
                  onChange={(event) =>
                    setField(
                      "designation_master",
                      event.target.value,
                    )
                  }
                  disabled={
                    referenceLoading
                  }
                  className={inputClass}
                >
                  <option value="">
                    No master designation
                  </option>

                  {designations.map(
                    (
                      designation,
                    ) => (
                      <option
                        key={
                          designation.id
                        }
                        value={
                          designation.id
                        }
                      >
                        {
                          designation.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Legacy / Custom Designation"
                helper="Optional fallback when no master designation is used."
              >
                <input
                  value={
                    form.designation
                  }
                  onChange={(event) =>
                    setField(
                      "designation",
                      event.target.value,
                    )
                  }
                  placeholder="Example: Senior Counsellor"
                  className={inputClass}
                />
              </Field>

              <Field label="Reporting Manager">
                <select
                  value={
                    form.reporting_manager
                  }
                  onChange={(event) =>
                    setField(
                      "reporting_manager",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    No reporting manager
                  </option>

                  {managers.map(
                    (manager) => (
                      <option
                        key={
                          manager.id
                        }
                        value={
                          manager.id
                        }
                      >
                        {manager.employee_name ||
                          manager.employee_id}
                        {" — "}
                        {
                          manager.employee_id
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Employment Type"
                required
              >
                <select
                  value={
                    form.employment_type
                  }
                  onChange={(event) =>
                    setField(
                      "employment_type",
                      event.target
                        .value as EmploymentType,
                    )
                  }
                  className={inputClass}
                >
                  {EMPLOYMENT_TYPES.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Employment Status"
                required
              >
                <select
                  value={
                    form.employment_status
                  }
                  onChange={(event) =>
                    setField(
                      "employment_status",
                      event.target
                        .value as EmploymentStatus,
                    )
                  }
                  className={inputClass}
                >
                  {EMPLOYMENT_STATUSES.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Date of Joining">
                <input
                  type="date"
                  value={
                    form.date_of_joining
                  }
                  onChange={(event) =>
                    setField(
                      "date_of_joining",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Date of Exit">
                <input
                  type="date"
                  value={
                    form.date_of_exit
                  }
                  onChange={(event) =>
                    setField(
                      "date_of_exit",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>


          <FormSection
            title="Contact Information"
            description="Employee contact and emergency information."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone Number">
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
                  placeholder="Phone number"
                  className={inputClass}
                />
              </Field>

              <Field label="Alternate Phone">
                <input
                  value={
                    form.alternate_phone_number
                  }
                  onChange={(event) =>
                    setField(
                      "alternate_phone_number",
                      event.target.value,
                    )
                  }
                  placeholder="Alternate number"
                  className={inputClass}
                />
              </Field>

              <Field label="Personal Email">
                <input
                  type="email"
                  value={
                    form.personal_email
                  }
                  onChange={(event) =>
                    setField(
                      "personal_email",
                      event.target.value,
                    )
                  }
                  placeholder="employee@example.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Emergency Contact Name">
                <input
                  value={
                    form.emergency_contact_name
                  }
                  onChange={(event) =>
                    setField(
                      "emergency_contact_name",
                      event.target.value,
                    )
                  }
                  placeholder="Emergency contact"
                  className={inputClass}
                />
              </Field>

              <Field label="Emergency Contact Number">
                <input
                  value={
                    form.emergency_contact_number
                  }
                  onChange={(event) =>
                    setField(
                      "emergency_contact_number",
                      event.target.value,
                    )
                  }
                  placeholder="Emergency number"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Address">
                <textarea
                  value={
                    form.address
                  }
                  onChange={(event) =>
                    setField(
                      "address",
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Employee address"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>


          <FormSection
            title="Internal Notes"
            description="Optional internal HR information."
          >
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setField(
                    "notes",
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Internal notes..."
                className={inputClass}
              />
            </Field>
          </FormSection>


          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}


          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                referenceLoading ||
                !form.branch ||
                !form.department
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {loading
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";


function Field({
  label,
  helper,
  required = false,
  children,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      {children}

      {helper ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-400">
          {helper}
        </span>
      ) : null}
    </label>
  );
}


function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-5">
        <h3 className="font-bold text-slate-950">
          {title}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}
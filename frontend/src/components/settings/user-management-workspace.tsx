"use client";

import {
  Camera,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
  UsersRound,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createAdminUser,
  createAdminUserRole,
  deleteAdminUserRole,
  getAdminRoles,
  getAdminUserRoles,
  getAdminUsers,
  removeAdminProfilePicture,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserRole,
  uploadAdminProfilePicture,
} from "@/lib/api/user-management";

import {
  getBranches,
  getBusinessUnits,
  getDepartments,
} from "@/lib/api/organization";

import type {
  AdminRole,
  AdminUser,
  AdminUserRole,
  CreateAdminUserPayload,
  UserRolePayload,
} from "@/types/user-management";

import type {
  Branch,
  BusinessUnit,
  Department,
} from "@/types/organization";


type UserForm = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  password: string;
  confirm_password: string;
};

type PasswordForm = {
  new_password: string;
  confirm_password: string;
};

type RoleForm = {
  role: string;
  scope_type: string;
  business_unit: string;
  branch: string;
  department: string;
  is_active: boolean;
  notes: string;
};


const EMPTY_USER_FORM: UserForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  phone_number: "",
  is_active: true,
  password: "",
  confirm_password: "",
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  new_password: "",
  confirm_password: "",
};

const EMPTY_ROLE_FORM: RoleForm = {
  role: "",
  scope_type: "OWN",
  business_unit: "",
  branch: "",
  department: "",
  is_active: true,
  notes: "",
};


function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}


function getInitials(user: AdminUser) {
  const name =
    user.full_name?.trim() ||
    user.username;

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}


function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}


function Modal({
  title,
  description,
  children,
  onClose,
  width = "max-w-2xl",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl ${width}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50";


function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </div>
        </div>

        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}


export function UserManagementWorkspace() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [businessUnits, setBusinessUnits] =
    useState<BusinessUnit[]>([]);
  const [branches, setBranches] =
    useState<Branch[]>([]);
  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [userModal, setUserModal] =
    useState<"CREATE" | "EDIT" | null>(null);
  const [passwordModal, setPasswordModal] =
    useState(false);
  const [roleModal, setRoleModal] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<AdminUser | null>(null);

  const [userForm, setUserForm] =
    useState<UserForm>(EMPTY_USER_FORM);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [roleForm, setRoleForm] =
    useState<RoleForm>(EMPTY_ROLE_FORM);

  const [userRoles, setUserRoles] =
    useState<AdminUserRole[]>([]);
  const [editingRole, setEditingRole] =
    useState<AdminUserRole | null>(null);
  const [rolesLoading, setRolesLoading] =
    useState(false);
  const [photoSavingUserId, setPhotoSavingUserId] =
    useState<string | null>(null);

  const [photoTargetUser, setPhotoTargetUser] =
    useState<AdminUser | null>(null);

  const photoInputRef =
    useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        userData,
        roleData,
        businessUnitData,
        branchData,
        departmentData,
      ] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
        getBusinessUnits(),
        getBranches(),
        getDepartments(),
      ]);

      setUsers(userData);
      setRoles(roleData);
      setBusinessUnits(businessUnitData);
      setBranches(branchData);
      setDepartments(departmentData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void loadData();
  }, [loadData]);


  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          user.is_active) ||
        (statusFilter === "INACTIVE" &&
          !user.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        user.full_name,
        user.username,
        user.email,
        user.phone_number,
        ...user.roles.map(
          (assignment) =>
            assignment.role_name,
        ),
      ]
        .filter(Boolean)
        .some((value) =>
          value
            .toLowerCase()
            .includes(term),
        );
    });
  }, [users, search, statusFilter]);


  const activeCount = useMemo(
    () =>
      users.filter(
        (user) => user.is_active,
      ).length,
    [users],
  );

  const inactiveCount =
    users.length - activeCount;

  const superAdminCount = useMemo(
    () =>
      users.filter(
        (user) => user.is_superuser,
      ).length,
    [users],
  );


  function openCreateUser() {
    setSelectedUser(null);
    setUserForm(EMPTY_USER_FORM);
    setError("");
    setSuccess("");
    setUserModal("CREATE");
  }


  function openEditUser(user: AdminUser) {
    setSelectedUser(user);

    setUserForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      is_active: user.is_active,
      password: "",
      confirm_password: "",
    });

    setError("");
    setSuccess("");
    setUserModal("EDIT");
  }


  function openPasswordReset(
    user: AdminUser,
  ) {
    setSelectedUser(user);
    setPasswordForm(
      EMPTY_PASSWORD_FORM,
    );
    setError("");
    setSuccess("");
    setPasswordModal(true);
  }


  async function openRoleManager(
    user: AdminUser,
  ) {
    setSelectedUser(user);
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE_FORM);
    setRoleModal(true);
    setRolesLoading(true);
    setError("");
    setSuccess("");

    try {
      const data =
        await getAdminUserRoles(
          user.id,
        );

      setUserRoles(data);
    } catch (roleError) {
      setError(
        getErrorMessage(roleError),
      );
    } finally {
      setRolesLoading(false);
    }
  }


  async function handleUserSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (userModal === "CREATE") {
        const payload: CreateAdminUserPayload =
          {
            username:
              userForm.username.trim(),
            email:
              userForm.email.trim(),
            first_name:
              userForm.first_name.trim(),
            last_name:
              userForm.last_name.trim(),
            phone_number:
              userForm.phone_number.trim(),
            is_active:
              userForm.is_active,
            password:
              userForm.password,
            confirm_password:
              userForm.confirm_password,
          };

        await createAdminUser(
          payload,
        );

        setSuccess(
          "User account created successfully.",
        );
      } else if (
        userModal === "EDIT" &&
        selectedUser
      ) {
        await updateAdminUser(
          selectedUser.id,
          {
            username:
              userForm.username.trim(),
            email:
              userForm.email.trim(),
            first_name:
              userForm.first_name.trim(),
            last_name:
              userForm.last_name.trim(),
            phone_number:
              userForm.phone_number.trim(),
            is_active:
              userForm.is_active,
          },
        );

        setSuccess(
          "User account updated successfully.",
        );
      }

      setUserModal(null);
      await loadData();
    } catch (submitError) {
      setError(
        getErrorMessage(submitError),
      );
    } finally {
      setSaving(false);
    }
  }


  async function handleToggleStatus(
    user: AdminUser,
  ) {
    const action =
      user.is_active
        ? "deactivate"
        : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${user.full_name || user.username}?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateAdminUser(
        user.id,
        {
          is_active:
            !user.is_active,
        },
      );

      setSuccess(
        `User ${action}d successfully.`,
      );

      await loadData();
    } catch (toggleError) {
      setError(
        getErrorMessage(toggleError),
      );
    } finally {
      setSaving(false);
    }
  }


  async function handlePasswordReset(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await resetAdminUserPassword(
        selectedUser.id,
        passwordForm,
      );

      setPasswordModal(false);
      setPasswordForm(
        EMPTY_PASSWORD_FORM,
      );

      setSuccess(
        `Password reset successfully for ${selectedUser.full_name || selectedUser.username}.`,
      );
    } catch (passwordError) {
      setError(
        getErrorMessage(passwordError),
      );
    } finally {
      setSaving(false);
    }
  }


  const availableBranches =
    useMemo(() => {
      if (!roleForm.business_unit) {
        return branches;
      }

      return branches.filter(
        (branch) =>
          branch.business_unit ===
          roleForm.business_unit,
      );
    }, [
      branches,
      roleForm.business_unit,
    ]);


  const availableDepartments =
    useMemo(() => {
      if (!roleForm.branch) {
        return departments;
      }

      return departments.filter(
        (department) =>
          department.branch ===
          roleForm.branch,
      );
    }, [
      departments,
      roleForm.branch,
    ]);


  function startRoleEdit(
    assignment: AdminUserRole,
  ) {
    setEditingRole(assignment);

    setRoleForm({
      role: assignment.role,
      scope_type:
        assignment.scope_type,
      business_unit:
        assignment.business_unit ??
        "",
      branch:
        assignment.branch ?? "",
      department:
        assignment.department ?? "",
      is_active:
        assignment.is_active,
      notes:
        assignment.notes ?? "",
    });
  }


  function resetRoleForm() {
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE_FORM);
  }


  async function refreshSelectedUserRoles() {
    if (!selectedUser) {
      return;
    }

    const data =
      await getAdminUserRoles(
        selectedUser.id,
      );

    setUserRoles(data);
  }


  async function handleRoleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const scope =
      roleForm.scope_type;

    const payload: UserRolePayload = {
      role: roleForm.role,
      scope_type: scope,
      business_unit:
        scope === "BUSINESS_UNIT" ||
        scope === "BRANCH" ||
        scope === "DEPARTMENT"
          ? roleForm.business_unit ||
            null
          : null,
      branch:
        scope === "BRANCH" ||
        scope === "DEPARTMENT"
          ? roleForm.branch ||
            null
          : null,
      department:
        scope === "DEPARTMENT"
          ? roleForm.department ||
            null
          : null,
      is_active:
        roleForm.is_active,
      notes:
        roleForm.notes.trim(),
    };

    try {
      if (editingRole) {
        await updateAdminUserRole(
          selectedUser.id,
          editingRole.id,
          payload,
        );

        setSuccess(
          "Role assignment updated.",
        );
      } else {
        await createAdminUserRole(
          selectedUser.id,
          payload,
        );

        setSuccess(
          "Role assigned successfully.",
        );
      }

      resetRoleForm();

      await Promise.all([
        refreshSelectedUserRoles(),
        loadData(),
      ]);
    } catch (roleError) {
      setError(
        getErrorMessage(roleError),
      );
    } finally {
      setSaving(false);
    }
  }


  async function handleDeleteRole(
    assignment: AdminUserRole,
  ) {
    if (!selectedUser) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${assignment.role_name} from this user?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await deleteAdminUserRole(
        selectedUser.id,
        assignment.id,
      );

      setSuccess(
        "Role assignment removed.",
      );

      if (
        editingRole?.id ===
        assignment.id
      ) {
        resetRoleForm();
      }

      await Promise.all([
        refreshSelectedUserRoles(),
        loadData(),
      ]);
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError),
      );
    } finally {
      setSaving(false);
    }
  }
function openPhotoPicker(user: AdminUser) {
  setPhotoTargetUser(user);
  setError("");
  setSuccess("");

  window.setTimeout(() => {
    photoInputRef.current?.click();
  }, 0);
}

async function handleProfilePictureChange(
  event: ChangeEvent<HTMLInputElement>,
) {
  const file = event.target.files?.[0];
  const targetUser = photoTargetUser;

  event.target.value = "";

  if (!file || !targetUser) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    setError(
      "Please select a JPG, PNG or WEBP image.",
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setError(
      "Profile picture must not exceed 5 MB.",
    );
    return;
  }

  setPhotoSavingUserId(targetUser.id);
  setError("");
  setSuccess("");

  try {
    await uploadAdminProfilePicture(
      targetUser.id,
      file,
    );

    await loadData();

    setSuccess(
      `Profile picture updated for ${
        targetUser.full_name ||
        targetUser.username
      }.`,
    );
  } catch (photoError) {
    setError(getErrorMessage(photoError));
  } finally {
    setPhotoSavingUserId(null);
    setPhotoTargetUser(null);
  }
}

async function handleRemoveProfilePicture(
  user: AdminUser,
) {
  if (!user.profile_picture) {
    return;
  }

  const confirmed = window.confirm(
    `Remove the profile picture for ${
      user.full_name || user.username
    }?`,
  );

  if (!confirmed) {
    return;
  }

  setPhotoSavingUserId(user.id);
  setError("");
  setSuccess("");

  try {
    await removeAdminProfilePicture(user.id);

    await loadData();

    setSuccess(
      `Profile picture removed for ${
        user.full_name || user.username
      }.`,
    );
  } catch (photoError) {
    setError(getErrorMessage(photoError));
  } finally {
    setPhotoSavingUserId(null);
  }
}

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading user management...
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
                <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleProfilePictureChange}
        className="hidden"
        />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Super Administration
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            User Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create and manage BEOIS accounts,
            authentication access, roles and
            organizational scope.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateUser}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
      </div>


      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      ) : null}


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Users"
          value={users.length}
          icon={
            <UsersRound size={19} />
          }
        />

        <SummaryCard
          label="Active"
          value={activeCount}
          icon={
            <UserCheck size={19} />
          }
        />

        <SummaryCard
          label="Inactive"
          value={inactiveCount}
          icon={
            <UserX size={19} />
          }
        />

        <SummaryCard
          label="Super Admins"
          value={superAdminCount}
          icon={
            <ShieldCheck size={19} />
          }
        />
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search name, username, email, phone or role..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "ALL"
                    | "ACTIVE"
                    | "INACTIVE",
                )
              }
              className={`${inputClass} lg:w-44`}
            >
              <option value="ALL">
                All accounts
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </div>
        </div>


        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <UserRound
              size={32}
              className="mx-auto text-slate-300"
            />

            <div className="mt-3 font-bold text-slate-700">
              No users found
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or
              account filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map(
              (user) => (
                <div
                  key={user.id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                     <div className="relative shrink-0">
                        <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-blue-50 text-sm font-black text-blue-700">
                            {user.profile_picture ? (
                            <div
                                role="img"
                                aria-label={`${user.full_name || user.username} profile`}
                                className="size-full bg-cover bg-center bg-no-repeat"
                                style={{
                                  backgroundImage: `url(${user.profile_picture})`,
                                }}
                            />
                            ) : (
                            getInitials(user)
                            )}
                        </div>

                        {/* Upload / Change */}
                        <button
                            type="button"
                            disabled={photoSavingUserId === user.id}
                            onClick={() => openPhotoPicker(user)}
                            title={
                            user.profile_picture
                                ? "Change profile picture"
                                : "Upload profile picture"
                            }
                            aria-label={
                            user.profile_picture
                                ? "Change profile picture"
                                : "Upload profile picture"
                            }
                            className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {photoSavingUserId === user.id ? (
                            <Loader2
                                size={11}
                                className="animate-spin"
                            />
                            ) : (
                            <Camera size={11} />
                            )}
                        </button>

                        {/* Delete — icon only */}
                        {user.profile_picture &&
                            photoSavingUserId !== user.id && (
                            <button
                                type="button"
                                onClick={() =>
                                void handleRemoveProfilePicture(user)
                                }
                                title="Remove profile picture"
                                aria-label="Remove profile picture"
                                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50"
                            >
                                <Trash2 size={9} />
                            </button>
                            )}
                        </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-bold text-slate-950">
                            {user.full_name ||
                              user.username}
                          </div>

                          {user.is_superuser ? (
                            <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                              Super Admin
                            </span>
                          ) : null}

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {user.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <div className="mt-1 truncate text-sm text-slate-500">
                          @{user.username}
                          {" · "}
                          {user.email}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {user.roles.length ? (
                            user.roles
                              .slice(0, 3)
                              .map(
                                (
                                  assignment,
                                ) => (
                                  <span
                                    key={
                                      assignment.id
                                    }
                                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
                                  >
                                    {
                                      assignment.role_name
                                    }
                                  </span>
                                ),
                              )
                          ) : (
                            <span className="text-xs text-slate-400">
                              No role assigned
                            </span>
                          )}

                          {user.roles.length >
                          3 ? (
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                              +
                              {user.roles
                                .length - 3}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          openEditUser(
                            user,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil
                          size={14}
                        />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void openRoleManager(
                            user,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ShieldPlus
                          size={14}
                        />
                        Roles
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openPasswordReset(
                            user,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <KeyRound
                          size={14}
                        />
                        Password
                      </button>

                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void handleToggleStatus(
                            user,
                          )
                        }
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          user.is_active
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {user.is_active ? (
                          <UserX
                            size={14}
                          />
                        ) : (
                          <UserCheck
                            size={14}
                          />
                        )}

                        {user.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>


      {userModal ? (
        <Modal
          title={
            userModal === "CREATE"
              ? "Create User"
              : "Edit User"
          }
          description={
            userModal === "CREATE"
              ? "Create a secure BEOIS account. Roles can be assigned after account creation."
              : "Update account identity and access status."
          }
          onClose={() =>
            setUserModal(null)
          }
        >
          <form
            onSubmit={
              handleUserSubmit
            }
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name">
                <input
                  value={
                    userForm.first_name
                  }
                  onChange={(event) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        first_name:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Last Name">
                <input
                  value={
                    userForm.last_name
                  }
                  onChange={(event) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        last_name:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Username">
                <input
                  required
                  value={
                    userForm.username
                  }
                  onChange={(event) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        username:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Email">
                <input
                  required
                  type="email"
                  value={
                    userForm.email
                  }
                  onChange={(event) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        email:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Phone Number">
                <input
                  value={
                    userForm.phone_number
                  }
                  onChange={(event) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        phone_number:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Account Status">
                <select
                  value={
                    userForm.is_active
                      ? "ACTIVE"
                      : "INACTIVE"
                  }
                  onChange={(event) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        is_active:
                          event.target
                            .value ===
                          "ACTIVE",
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="ACTIVE">
                    Active
                  </option>
                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>
              </Field>
            </div>

            {userModal ===
            "CREATE" ? (
              <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <Field label="Password">
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={
                      userForm.password
                    }
                    onChange={(
                      event,
                    ) =>
                      setUserForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          password:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Confirm Password">
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={
                      userForm.confirm_password
                    }
                    onChange={(
                      event,
                    ) =>
                      setUserForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          confirm_password:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() =>
                  setUserModal(
                    null,
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : userModal ===
                  "CREATE" ? (
                  <Plus size={16} />
                ) : (
                  <Pencil
                    size={16}
                  />
                )}

                {userModal ===
                "CREATE"
                  ? "Create User"
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}


      {passwordModal &&
      selectedUser ? (
        <Modal
          title="Reset Password"
          description={`Set a new password for ${selectedUser.full_name || selectedUser.username}. The existing password cannot be viewed.`}
          onClose={() =>
            setPasswordModal(
              false,
            )
          }
          width="max-w-lg"
        >
          <form
            onSubmit={
              handlePasswordReset
            }
            className="space-y-4"
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <strong>
                Security:
              </strong>{" "}
              BEOIS stores password
              hashes, not readable
              passwords. This action
              replaces the password
              securely.
            </div>

            <Field label="New Password">
              <input
                required
                type="password"
                autoComplete="new-password"
                value={
                  passwordForm.new_password
                }
                onChange={(event) =>
                  setPasswordForm(
                    (current) => ({
                      ...current,
                      new_password:
                        event.target
                          .value,
                    }),
                  )
                }
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Confirm New Password">
              <input
                required
                type="password"
                autoComplete="new-password"
                value={
                  passwordForm.confirm_password
                }
                onChange={(event) =>
                  setPasswordForm(
                    (current) => ({
                      ...current,
                      confirm_password:
                        event.target
                          .value,
                    }),
                  )
                }
                className={
                  inputClass
                }
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() =>
                  setPasswordModal(
                    false,
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <KeyRound
                    size={16}
                  />
                )}

                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      ) : null}


      {roleModal &&
      selectedUser ? (
        <Modal
          title="Roles & Organization Scope"
          description={`Manage access assignments for ${selectedUser.full_name || selectedUser.username}.`}
          onClose={() =>
            setRoleModal(false)
          }
          width="max-w-5xl"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="mb-3 text-sm font-bold text-slate-950">
                Current Assignments
              </div>

              {rolesLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Loading roles...
                </div>
              ) : userRoles.length ===
                0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  No role assignments.
                </div>
              ) : (
                <div className="space-y-3">
                  {userRoles.map(
                    (assignment) => (
                      <div
                        key={
                          assignment.id
                        }
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-950">
                              {
                                assignment.role_name
                              }
                            </div>

                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {
                                assignment.scope_display
                              }
                            </div>

                            {assignment.notes ? (
                              <div className="mt-2 text-xs leading-5 text-slate-500">
                                {
                                  assignment.notes
                                }
                              </div>
                            ) : null}
                          </div>

                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                startRoleEdit(
                                  assignment,
                                )
                              }
                              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                              <Pencil
                                size={
                                  13
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteRole(
                                  assignment,
                                )
                              }
                              className="flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2
                                size={
                                  13
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>


            <form
              onSubmit={
                handleRoleSubmit
              }
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-950">
                    {editingRole
                      ? "Edit Assignment"
                      : "Assign Role"}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Define role and
                    organizational access.
                  </div>
                </div>

                {editingRole ? (
                  <button
                    type="button"
                    onClick={
                      resetRoleForm
                    }
                    className="text-xs font-bold text-blue-600"
                  >
                    New Assignment
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                <Field label="Role">
                  <select
                    required
                    value={
                      roleForm.role
                    }
                    onChange={(
                      event,
                    ) =>
                      setRoleForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          role:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select role
                    </option>

                    {roles.map(
                      (role) => (
                        <option
                          key={
                            role.id
                          }
                          value={
                            role.id
                          }
                        >
                          {role.name}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Scope">
                  <select
                    value={
                      roleForm.scope_type
                    }
                    onChange={(
                      event,
                    ) =>
                      setRoleForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          scope_type:
                            event
                              .target
                              .value,
                          business_unit:
                            "",
                          branch: "",
                          department:
                            "",
                        }),
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="OWN">
                      Own
                    </option>
                    <option value="ORGANIZATION">
                      Organization
                    </option>
                    <option value="BUSINESS_UNIT">
                      Business Unit
                    </option>
                    <option value="BRANCH">
                      Branch
                    </option>
                    <option value="DEPARTMENT">
                      Department
                    </option>
                  </select>
                </Field>

                {[
                  "BUSINESS_UNIT",
                  "BRANCH",
                  "DEPARTMENT",
                ].includes(
                  roleForm.scope_type,
                ) ? (
                  <Field label="Business Unit">
                    <select
                      required
                      value={
                        roleForm.business_unit
                      }
                      onChange={(
                        event,
                      ) =>
                        setRoleForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            business_unit:
                              event
                                .target
                                .value,
                            branch:
                              "",
                            department:
                              "",
                          }),
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="">
                        Select business
                        unit
                      </option>

                      {businessUnits.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                ) : null}

                {[
                  "BRANCH",
                  "DEPARTMENT",
                ].includes(
                  roleForm.scope_type,
                ) ? (
                  <Field label="Branch">
                    <select
                      required
                      value={
                        roleForm.branch
                      }
                      onChange={(
                        event,
                      ) =>
                        setRoleForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            branch:
                              event
                                .target
                                .value,
                            department:
                              "",
                          }),
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="">
                        Select branch
                      </option>

                      {availableBranches.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                ) : null}

                {roleForm.scope_type ===
                "DEPARTMENT" ? (
                  <Field label="Department">
                    <select
                      required
                      value={
                        roleForm.department
                      }
                      onChange={(
                        event,
                      ) =>
                        setRoleForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            department:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="">
                        Select department
                      </option>

                      {availableDepartments.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                ) : null}

                <Field label="Notes">
                  <textarea
                    rows={3}
                    value={
                      roleForm.notes
                    }
                    onChange={(
                      event,
                    ) =>
                      setRoleForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          notes:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <input
                    type="checkbox"
                    checked={
                      roleForm.is_active
                    }
                    onChange={(
                      event,
                    ) =>
                      setRoleForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          is_active:
                            event
                              .target
                              .checked,
                        }),
                      )
                    }
                  />

                  <span className="text-sm font-semibold text-slate-700">
                    Active role
                    assignment
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !roleForm.role
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                    />
                  )}

                  {editingRole
                    ? "Update Assignment"
                    : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
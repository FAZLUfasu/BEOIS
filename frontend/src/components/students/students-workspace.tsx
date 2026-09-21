"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  createStudentFromAdmission,
  getCompletedAdmissionHandoffs,
  getStudent,
  getStudentProcessQueue,
  getStudents,
} from "@/lib/api/students";

import {
  StudentProcessPanel,
} from "@/components/students/student-process-panel";

import {
  StudentActivityPanel,
} from "@/components/students/student-activity-panel";
import {
  StudentDocumentPanel,
} from "@/components/students/student-document-panel";
import type {
  CompletedAdmissionHandoff,
  EducationWorkspaceView,
  StudentDetail,
  StudentListItem,
  StudentProcess,
  StudentProcessType,
} from "@/types/students";

// ============================================================
// CONFIG
// ============================================================

const PROCESS_VIEWS: Partial<
  Record<
    EducationWorkspaceView,
    StudentProcessType
  >
> = {
  EXAM: "EXAM",
  SEMINAR: "SEMINAR",
  PROJECT: "PROJECT",
  RESULT: "RESULT",
  MARK_SHEET: "MARK_SHEET",
  CERTIFICATE: "CERTIFICATE",
};

const TABS: Array<{
  key: EducationWorkspaceView;
  label: string;
  icon: React.ElementType;
}> = [
  {
    key: "STUDENTS",
    label: "Students",
    icon: Users,
  },
  {
    key: "HANDOFF",
    label: "Admission Handoff",
    icon: UserPlus,
  },
  {
    key: "EXAM",
    label: "Exam",
    icon: ClipboardCheck,
  },
  {
    key: "SEMINAR",
    label: "Seminar",
    icon: BookOpen,
  },
  {
    key: "PROJECT",
    label: "Project",
    icon: FileText,
  },
  {
    key: "RESULT",
    label: "Result",
    icon: CheckCircle2,
  },
  {
    key: "MARK_SHEET",
    label: "Mark Sheet",
    icon: FileCheck2,
  },
  {
    key: "CERTIFICATE",
    label: "Certificate",
    icon: Award,
  },
  {
    key: "PENDING",
    label: "Pending",
    icon: Clock3,
  },
  {
    key: "OVERDUE",
    label: "Overdue",
    icon: AlertCircle,
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Something went wrong.";
}

function statusClass(
  status: string,
) {
  switch (status) {
    case "ACTIVE":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "IN_PROGRESS":
    case "SUBMITTED":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "PENDING":
    case "NOT_STARTED":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "ON_HOLD":
      return "bg-orange-50 text-orange-700 ring-orange-200";

    case "DISCONTINUED":
    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-red-200";

    case "NOT_APPLICABLE":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

// ============================================================
// SMALL UI
// ============================================================

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1",
        "text-xs font-semibold ring-1 ring-inset",
        statusClass(status),
      ].join(" ")}
    >
      {label ??
        status.replaceAll(
          "_",
          " ",
        )}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <GraduationCap className="mb-4 h-10 w-10 text-slate-300" />

      <h3 className="text-base font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
    </div>
  );
}

// ============================================================
// STUDENT DETAIL
// ============================================================

function StudentDetailPanel({
  student,
  loading,
  onClose,
  onRefresh,
}: {
  student: StudentDetail | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  if (!student && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close student details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Student Profile
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {student?.name ??
                "Loading..."}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading || !student ? (
          <LoadingState />
        ) : (
          <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
                {student.student_id}
              </span>

              <StatusBadge
                status={
                  student.status
                }
                label={
                  student.status_display
                }
              />

              <span className="text-sm text-slate-500">
                {student.vertical.replaceAll(
                  "_",
                  " ",
                )}
                {" · "}
                {student.channel}
              </span>
            </div>

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Academic Information
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Institution"
                  value={
                    student.institution_name
                  }
                />

                <DetailItem
                  label="Program"
                  value={
                    student.program_name
                  }
                />

                <DetailItem
                  label="Academic Session"
                  value={
                    student.academic_session
                  }
                />

                <DetailItem
                  label="Enrollment No."
                  value={
                    student.enrollment_number
                  }
                />

                <DetailItem
                  label="University Admission No."
                  value={
                    student.university_admission_number
                  }
                />

                <DetailItem
                  label="Current Stage"
                  value={`Year ${student.current_year} · Semester ${student.current_semester}`}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Contact
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Phone"
                  value={
                    student.phone_number
                  }
                />

                <DetailItem
                  label="Email"
                  value={
                    student.email
                  }
                />

                <DetailItem
                  label="City"
                  value={
                    student.city
                  }
                />

                <DetailItem
                  label="State"
                  value={
                    student.state
                  }
                />
              </div>
            </section>

            {/* ============================================= */}
            {/* OPERATIONAL EDUCATION PROCESS MANAGEMENT      */}
            {/* ============================================= */}

            <StudentProcessPanel
              student={student}
              onRefresh={
                onRefresh
              }
            />

            {/* ============================================= */}
            {/* ACADEMIC PROGRESS + NOTES + ACTIVITY          */}
            {/* ============================================= */}

            <StudentActivityPanel
              student={student}
              onRefresh={
                onRefresh
              }
            />
            <StudentDocumentPanel
              student={student}
              onRefresh={onRefresh}
            />

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Documents
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {
                      student.documents
                        .length
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Total Documents
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {
                      student.documents.filter(
                        (
                          document,
                        ) =>
                          document.verified,
                      ).length
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Verified
                  </p>
                </div>
              </div>

              {student.documents
                .length > 0 && (
                <div className="mt-4 space-y-2">
                  {student.documents
                    .slice(0, 5)
                    .map(
                      (
                        document,
                      ) => (
                        <div
                          key={
                            document.id
                          }
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {document.title ||
                                document.document_type_display}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                document.document_type_display
                              }
                            </p>
                          </div>

                          <StatusBadge
                            status={
                              document.verified
                                ? "COMPLETED"
                                : "PENDING"
                            }
                            label={
                              document.verified
                                ? "Verified"
                                : "Pending"
                            }
                          />
                        </div>
                      ),
                    )}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-500">
                Upload, verification and
                complete document management
                will be enabled in the next
                implementation block.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

// ============================================================
// MAIN WORKSPACE
// ============================================================

export function StudentsWorkspace() {
  const [view, setView] =
    useState<EducationWorkspaceView>(
      "STUDENTS",
    );

  const [search, setSearch] =
    useState("");

  const [students, setStudents] =
    useState<StudentListItem[]>(
      [],
    );

  const [handoffs, setHandoffs] =
    useState<
      CompletedAdmissionHandoff[]
    >([]);

  const [processes, setProcesses] =
    useState<StudentProcess[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<StudentDetail | null>(
      null,
    );

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    convertingAdmissionId,
    setConvertingAdmissionId,
  ] = useState<string | null>(
    null,
  );

  // ==========================================================
  // DATA LOAD
  // ==========================================================

  const loadCurrentView =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        if (
          view === "STUDENTS"
        ) {
          const data =
            await getStudents({
              search:
                search.trim() ||
                undefined,
            });

          setStudents(data);
          return;
        }

        if (
          view === "HANDOFF"
        ) {
          const data =
            await getCompletedAdmissionHandoffs(
              {
                search:
                  search.trim() ||
                  undefined,
              },
            );

          setHandoffs(data);
          return;
        }

        const processType =
          PROCESS_VIEWS[view];

        if (processType) {
          const data =
            await getStudentProcessQueue(
              {
                process_type:
                  processType,
                search:
                  search.trim() ||
                  undefined,
              },
            );

          setProcesses(data);
          return;
        }

        if (
          view === "PENDING"
        ) {
          const data =
            await getStudentProcessQueue(
              {
                status:
                  "PENDING",
                search:
                  search.trim() ||
                  undefined,
              },
            );

          setProcesses(data);
          return;
        }

        if (
          view === "OVERDUE"
        ) {
          const data =
            await getStudentProcessQueue(
              {
                overdue: true,
                search:
                  search.trim() ||
                  undefined,
              },
            );

          setProcesses(data);
        }
      } catch (err) {
        setError(
          getErrorMessage(err),
        );
      } finally {
        setLoading(false);
      }
    }, [view, search]);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadCurrentView();
        },
        search ? 300 : 0,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    loadCurrentView,
    search,
  ]);

  // ==========================================================
  // STUDENT DETAIL
  // ==========================================================

  const openStudent =
    useCallback(
      async (
        studentId: string,
      ) => {
        setDetailLoading(
          true,
        );

        setSelectedStudent(
          null,
        );

        try {
          const data =
            await getStudent(
              studentId,
            );

          setSelectedStudent(
            data,
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err,
            ),
          );
        } finally {
          setDetailLoading(
            false,
          );
        }
      },
      [],
    );

  // ==========================================================
  // REFRESH CURRENT SELECTED STUDENT
  // ==========================================================

  const refreshSelectedStudent =
    useCallback(async () => {
      if (
        !selectedStudent
      ) {
        return;
      }

      try {
        const refreshed =
          await getStudent(
            selectedStudent.id,
          );

        setSelectedStudent(
          refreshed,
        );

        // Also refresh the active workspace queue.
        // This keeps Exam / Project / Result / Pending /
        // Overdue etc. synchronized after process changes.
        await loadCurrentView();
      } catch (err) {
        setError(
          getErrorMessage(err),
        );

        throw err;
      }
    }, [
      selectedStudent,
      loadCurrentView,
    ]);

  // ==========================================================
  // HANDOFF
  // ==========================================================

  const handleCreateStudent =
    useCallback(
      async (
        admission:
          CompletedAdmissionHandoff,
      ) => {
        setConvertingAdmissionId(
          admission.id,
        );

        setError("");

        try {
          const student =
            await createStudentFromAdmission(
              {
                admission_id:
                  admission.id,

                assigned_coordinator_id:
                  admission
                    .assigned_to
                    ?.id ??
                  null,

                initialize_processes:
                  true,
              },
            );

          await loadCurrentView();

          await openStudent(
            student.id,
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err,
            ),
          );
        } finally {
          setConvertingAdmissionId(
            null,
          );
        }
      },
      [
        loadCurrentView,
        openStudent,
      ],
    );

  const title =
    useMemo(() => {
      return (
        TABS.find(
          (tab) =>
            tab.key ===
            view,
        )?.label ??
        "Education Process"
      );
    }, [view]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Education Process
              Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Student Lifecycle
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage students from
              completed admission
              handoff through exams,
              academic processes,
              results, mark sheets
              and certification.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadCurrentView()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            {TABS.map(
              (tab) => {
                const Icon =
                  tab.icon;

                const active =
                  view ===
                  tab.key;

                return (
                  <button
                    key={
                      tab.key
                    }
                    type="button"
                    onClick={() => {
                      setSearch(
                        "",
                      );

                      setView(
                        tab.key,
                      );
                    }}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(
                      " ",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {
                      tab.label
                    }
                  </button>
                );
              },
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {view ===
                "HANDOFF"
                  ? "Completed admissions waiting to enter the education process."
                  : view ===
                      "STUDENTS"
                    ? "Student master records currently available to you."
                    : "Operational academic process queue."}
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
                }
                placeholder={
                  view ===
                  "HANDOFF"
                    ? "Search admissions..."
                    : view ===
                        "STUDENTS"
                      ? "Search students..."
                      : "Search process or student..."
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>
                {error}
              </span>
            </div>
          )}

          <div className="p-5">
            {loading ? (
              <LoadingState />
            ) : view ===
              "STUDENTS" ? (
              <StudentsTable
                students={
                  students
                }
                onOpen={
                  openStudent
                }
              />
            ) : view ===
              "HANDOFF" ? (
              <HandoffTable
                admissions={
                  handoffs
                }
                convertingAdmissionId={
                  convertingAdmissionId
                }
                onConvert={
                  handleCreateStudent
                }
              />
            ) : (
              <ProcessTable
                processes={
                  processes
                }
                onOpenStudent={
                  openStudent
                }
              />
            )}
          </div>
        </section>
      </div>

      <StudentDetailPanel
        student={
          selectedStudent
        }
        loading={
          detailLoading
        }
        onRefresh={
          refreshSelectedStudent
        }
        onClose={() => {
          setSelectedStudent(
            null,
          );

          setDetailLoading(
            false,
          );
        }}
      />
    </>
  );
}

// ============================================================
// STUDENTS TABLE
// ============================================================

function StudentsTable({
  students,
  onOpen,
}: {
  students: StudentListItem[];

  onOpen: (
    studentId: string,
  ) => void | Promise<void>;
}) {
  if (
    students.length === 0
  ) {
    return (
      <EmptyState
        title="No students found"
        description="No student records match the current search or your access scope."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Student
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Institution /
              Program
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Stage
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Vertical
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Coordinator
            </th>
          </tr>
        </thead>

        <tbody>
          {students.map(
            (student) => (
              <tr
                key={
                  student.id
                }
                onClick={() =>
                  void onOpen(
                    student.id,
                  )
                }
                className="cursor-pointer transition hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {
                      student.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      student.student_id
                    }
                    {" · "}
                    {
                      student.phone_number
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm font-medium text-slate-800">
                    {
                      student.institution_name
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      student.program_name
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  Year{" "}
                  {
                    student.current_year
                  }
                  {" · "}
                  Sem{" "}
                  {
                    student.current_semester
                  }
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {student.vertical.replaceAll(
                    "_",
                    " ",
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      student.status
                    }
                    label={
                      student.status_display
                    }
                  />
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {student
                    .assigned_coordinator
                    ?.username ??
                    "—"}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// HANDOFF TABLE
// ============================================================

function HandoffTable({
  admissions,
  convertingAdmissionId,
  onConvert,
}: {
  admissions:
    CompletedAdmissionHandoff[];

  convertingAdmissionId:
    string | null;

  onConvert: (
    admission:
      CompletedAdmissionHandoff,
  ) => void | Promise<void>;
}) {
  if (
    admissions.length === 0
  ) {
    return (
      <EmptyState
        title="No admissions waiting"
        description="There are no completed admissions waiting to be converted into student records."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Applicant
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Institution /
              Program
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Enrollment
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Type
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Completed
            </th>

            <th className="border-b border-slate-200 px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {admissions.map(
            (
              admission,
            ) => {
              const converting =
                convertingAdmissionId ===
                admission.id;

              return (
                <tr
                  key={
                    admission.id
                  }
                  className="hover:bg-slate-50"
                >
                  <td className="border-b border-slate-100 px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {
                        admission.applicant_name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        admission.admission_id
                      }
                      {" · "}
                      {
                        admission.phone_number
                      }
                    </p>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4">
                    <p className="text-sm font-medium text-slate-800">
                      {
                        admission.institution_name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        admission.program_name
                      }
                    </p>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                    {admission.enrollment_number ||
                      "—"}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                    {
                      admission.vertical_display
                    }
                    {" · "}
                    {
                      admission.channel_display
                    }
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                    {formatDate(
                      admission.completed_at,
                    )}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-right">
                    <button
                      type="button"
                      disabled={
                        converting
                      }
                      onClick={() =>
                        void onConvert(
                          admission,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {converting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}

                      Create Student
                    </button>
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// PROCESS TABLE
// ============================================================

function ProcessTable({
  processes,
  onOpenStudent,
}: {
  processes: StudentProcess[];

  onOpenStudent: (
    studentId: string,
  ) => void | Promise<void>;
}) {
  if (
    processes.length === 0
  ) {
    return (
      <EmptyState
        title="No processes found"
        description="There are no education process records in this queue for the current search."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Student
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Process
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Academic Stage
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Due Date
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Assigned To
            </th>
          </tr>
        </thead>

        <tbody>
          {processes.map(
            (process) => (
              <tr
                key={
                  process.id
                }
                onClick={() =>
                  void onOpenStudent(
                    process.student,
                  )
                }
                className="cursor-pointer transition hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {
                      process.student_name
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      process.student_id
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm font-medium text-slate-800">
                    {process.title ||
                      process.process_type_display}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      process.process_type_display
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {process.academic_year
                    ? `Year ${process.academic_year}`
                    : "—"}

                  {process.semester
                    ? ` · Sem ${process.semester}`
                    : ""}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatDate(
                    process.due_date,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      process.status
                    }
                    label={
                      process.status_display
                    }
                  />
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {process
                    .assigned_to
                    ?.username ??
                    "—"}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
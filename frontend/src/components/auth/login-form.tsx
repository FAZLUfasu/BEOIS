"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ApiError,
} from "@/lib/api/client";
import {
  useAuth,
} from "@/lib/auth/auth-context";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const destination =
    searchParams.get("next") || "/";

  const {
    login,
    authenticated,
    loading,
  } = useAuth();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace(destination);
    }
  }, [
    authenticated,
    loading,
    router,
    destination,
  ]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      await login(
        username.trim(),
        password,
      );

      router.replace(destination);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401
      ) {
        setError(
          "The username or password is incorrect.",
        );
      } else {
        setError(
          "Unable to connect to BEOIS. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoaderCircle
          className="animate-spin text-[var(--brand)]"
          size={28}
        />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[var(--sidebar)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-[420px] rounded-full border border-white/5" />
        <div className="absolute -right-16 -top-16 size-[270px] rounded-full border border-white/8" />
        <div className="absolute bottom-[-180px] left-[-120px] size-[430px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white text-[var(--brand)]">
              <GraduationCap size={24} />
            </div>

            <div>
              <div className="text-xl font-bold tracking-[0.1em]">
                BEOIS
              </div>

              <div className="text-[10px] tracking-[0.14em] text-blue-100/60">
                BEST EDUCATION OPERATIONS
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex rounded-full border border-blue-200/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-blue-100">
            OPERATIONS & INTELLIGENCE
          </div>

          <h1 className="text-[44px] font-bold leading-[1.08] tracking-[-0.035em]">
            One system for every stage of the
            student journey.
          </h1>

          <p className="mt-6 max-w-lg text-[15px] leading-7 text-blue-100/65">
            Manage enquiries, admissions,
            students, partners, education
            processes, HR and finance from one
            secure operational platform.
          </p>
        </div>

        <div className="relative text-xs text-blue-100/45">
          Brainstorm Educational Service Trust
        </div>
      </section>

      <section className="flex items-center justify-center bg-[#f8fafc] px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-9 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
                <GraduationCap size={22} />
              </div>

              <div className="text-lg font-bold tracking-[0.08em] text-slate-900">
                BEOIS
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-[12px] font-bold uppercase tracking-[0.13em] text-[var(--brand)]">
              Secure Access
            </div>

            <h2 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in using your BEST College
              account to continue.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Username
              </label>

              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-[var(--brand)] focus-within:ring-3 focus-within:ring-blue-100">
                <UserRound
                  size={17}
                  className="mr-3 shrink-0 text-slate-400"
                />

                <input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your username"
                  required
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-[var(--brand)] focus-within:ring-3 focus-within:ring-blue-100">
                <LockKeyhole
                  size={17}
                  className="mr-3 shrink-0 text-slate-400"
                />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your password"
                  required
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="ml-2 text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                !username.trim() ||
                !password
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to BEOIS
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] leading-5 text-slate-400">
            Access is restricted to authorized
            BEST College personnel.
          </p>
        </div>
      </section>
    </main>
  );
}
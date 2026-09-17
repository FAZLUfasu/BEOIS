"use client";

import { useEffect } from "react";
import { GraduationCap, LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";

interface ProtectedAppProps {
  children: React.ReactNode;
}

export function ProtectedApp({
  children,
}: ProtectedAppProps) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    authenticated,
    loading,
  } = useAuth();

  useEffect(() => {
    if (!loading && !authenticated) {
      const next =
        pathname && pathname !== "/"
          ? `?next=${encodeURIComponent(pathname)}`
          : "";

      router.replace(`/login${next}`);
    }
  }, [
    authenticated,
    loading,
    pathname,
    router,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-sm">
            <GraduationCap size={27} />
          </div>

          <LoaderCircle
            size={24}
            className="mx-auto mt-5 animate-spin text-[var(--brand)]"
          />

          <div className="mt-3 text-xs font-medium text-slate-500">
            Loading BEOIS...
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
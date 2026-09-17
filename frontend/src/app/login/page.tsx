import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <LoaderCircle
          size={28}
          className="mx-auto animate-spin text-[var(--brand)]"
        />

        <div className="mt-3 text-xs font-medium text-slate-500">
          Loading BEOIS...
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
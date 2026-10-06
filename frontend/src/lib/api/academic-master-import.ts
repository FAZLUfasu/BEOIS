import { apiRequest } from "@/lib/api/client";

export interface AcademicImportReport {
  status: "ready" | "blocked";
  valid: boolean;
  import_token: string;
  filename: string;
  expires_in_seconds: number;
  sha256: string;
  counts: Record<string, number>;
  changes: Record<string, number>;
  review_only: Record<string, number>;
  errors: Array<{
    code: string;
    row?: number;
    message: string;
  }>;
  warnings: Array<{
    code: string;
    severity: string;
    institution_code?: string;
    message: string;
    action_required?: string;
  }>;
  requires_warning_acknowledgement: boolean;
}

export interface AcademicImportResult {
  status: "imported";
  filename: string;
  result: Record<string, number>;
  completed_at: string;
}

export function previewAcademicMasterImport(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<AcademicImportReport>(
    "/admissions/import/preview/",
    {
      method: "POST",
      body: form,
    },
  );
}

export function confirmAcademicMasterImport(
  importToken: string,
  acknowledgeWarnings: boolean,
) {
  return apiRequest<AcademicImportResult>(
    "/admissions/import/confirm/",
    {
      method: "POST",
      body: JSON.stringify({
        import_token: importToken,
        acknowledge_warnings: acknowledgeWarnings,
      }),
    },
  );
}

from __future__ import annotations

import hashlib
import json
import secrets
import time
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .master_data_import import import_data, read_workbook, validate
from .permissions import CanManageAdmissions

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
TOKEN_TTL_SECONDS = 30 * 60


def staging_dir() -> Path:
    path = Path(getattr(settings, "BASE_DIR", Path.cwd())) / ".academic_master_imports"
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    return path


def cleanup_staging() -> None:
    now = time.time()
    for path in staging_dir().glob("*"):
        try:
            if now - path.stat().st_mtime > TOKEN_TTL_SECONDS:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def token_paths(token: str) -> tuple[Path, Path]:
    base = staging_dir() / token
    return base.with_suffix(".xlsx"), base.with_suffix(".json")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def base_response(report: dict) -> dict:
    return {
        "status": "ready" if report["valid"] else "blocked",
        "valid": report["valid"],
        **report,
    }


class AcademicMasterImportPreviewView(APIView):
    permission_classes = [IsAuthenticated, CanManageAdmissions]
    parser_classes = [MultiPartParser]

    def post(self, request):
        cleanup_staging()
        upload = request.FILES.get("file")
        if not upload:
            return JsonResponse({"detail": "Please upload an Excel .xlsx file."}, status=status.HTTP_400_BAD_REQUEST)
        if not upload.name.lower().endswith(".xlsx"):
            return JsonResponse({"detail": "Only .xlsx files are supported."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_UPLOAD_BYTES:
            return JsonResponse({"detail": "The Excel file must be 15 MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

        token = secrets.token_urlsafe(24)
        workbook_path, meta_path = token_paths(token)
        with workbook_path.open("wb") as destination:
            for chunk in upload.chunks():
                destination.write(chunk)
        workbook_path.chmod(0o600)

        try:
            data = read_workbook(workbook_path)
            report = validate(data)
        except Exception as exc:
            workbook_path.unlink(missing_ok=True)
            return JsonResponse({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        checksum = sha256_file(workbook_path)
        meta_path.write_text(json.dumps({
            "token": token,
            "original_name": upload.name,
            "sha256": checksum,
            "created_at": timezone.now().isoformat(),
        }), encoding="utf-8")
        meta_path.chmod(0o600)

        payload = base_response(report)
        payload.update({
            "import_token": token,
            "filename": upload.name,
            "expires_in_seconds": TOKEN_TTL_SECONDS,
            "sha256": checksum,
        })
        return JsonResponse(payload, status=status.HTTP_200_OK)


class AcademicMasterImportConfirmView(APIView):
    permission_classes = [IsAuthenticated, CanManageAdmissions]

    def post(self, request):
        cleanup_staging()
        token = str(request.data.get("import_token") or "").strip()
        acknowledge = bool(request.data.get("acknowledge_warnings"))
        if not token or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in token):
            return JsonResponse({"detail": "Invalid or missing import token."}, status=status.HTTP_400_BAD_REQUEST)

        workbook_path, meta_path = token_paths(token)
        if not workbook_path.exists() or not meta_path.exists():
            return JsonResponse({"detail": "This import preview has expired. Please upload the workbook again."}, status=status.HTTP_410_GONE)

        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            if sha256_file(workbook_path) != meta.get("sha256"):
                return JsonResponse({"detail": "The staged workbook checksum changed. Please upload it again."}, status=status.HTTP_409_CONFLICT)
            data = read_workbook(workbook_path)
            report = validate(data)
        except Exception as exc:
            return JsonResponse({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not report["valid"]:
            return JsonResponse({"detail": "Validation failed. No database changes were made.", "report": report}, status=status.HTTP_400_BAD_REQUEST)
        if report["requires_warning_acknowledgement"] and not acknowledge:
            return JsonResponse({"detail": "High-severity review warnings must be acknowledged before import.", "report": report}, status=status.HTTP_409_CONFLICT)

        try:
            result = import_data(data)
        except Exception as exc:
            return JsonResponse({"detail": f"Import failed. The transaction was rolled back. {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            workbook_path.unlink(missing_ok=True)
            meta_path.unlink(missing_ok=True)

        return JsonResponse({
            "status": "imported",
            "filename": meta.get("original_name"),
            "result": result,
            "completed_at": timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, BrokenBarrierError, Lock
from unittest.mock import patch

from rest_framework.test import APITransactionTestCase
from rest_framework.test import APIClient

from admissions.tests.test_academic_master_import_tokens import (
    AcademicMasterImportTokenTests,
)


class AcademicMasterImportConcurrencyTests(
    APITransactionTestCase
):
    preview_url = AcademicMasterImportTokenTests.preview_url
    confirm_url = AcademicMasterImportTokenTests.confirm_url

    setUp = AcademicMasterImportTokenTests.setUp
    stage_token = AcademicMasterImportTokenTests.stage_token
    confirm = AcademicMasterImportTokenTests.confirm
    valid_report = AcademicMasterImportTokenTests.valid_report

    def test_both_requests_past_validation_cannot_import_twice(self):
        token, _, _ = self.stage_token()

        barrier = Barrier(2)
        lock = Lock()
        import_calls = []
        read_calls = []

        def synchronized_read(path):
            with lock:
                read_calls.append(str(path))

            barrier.wait(timeout=10)

            return {"synthetic": []}

        def simulated_import(data):
            with lock:
                import_calls.append(data)
            return {"institutions": 0}

        def confirm_as(user):
            client = APIClient()
            client.force_authenticate(user=user)
            try:
                response = client.post(
                    self.confirm_url,
                    {
                        "import_token": token,
                        "acknowledge_warnings": True,
                    },
                    format="json",
                )
                return ("HTTP", response.status_code)
            except Exception as exc:
                return (
                    "EXCEPTION",
                    type(exc).__name__,
                    str(exc),
                )

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                side_effect=synchronized_read,
            ),
            patch(
                "admissions.master_data_import_api.validate",
                return_value=self.valid_report(),
            ),
            patch(
                "admissions.master_data_import_api.import_data",
                side_effect=simulated_import,
            ),
        ):
            with ThreadPoolExecutor(max_workers=2) as executor:
                future_a = executor.submit(
                    confirm_as, self.manager_a
                )
                future_b = executor.submit(
                    confirm_as, self.manager_b
                )
                statuses = [
                    future_a.result(timeout=15),
                    future_b.result(timeout=15),
                ]

        print(
            "CONCURRENCY_DIAGNOSTIC:",
            {
                "workbook_reads": len(read_calls),
                "import_calls": len(import_calls),
                "request_outcomes": statuses,
            },
            flush=True,
        )

        self.assertEqual(
            len(read_calls),
            2,
            msg="Both requests must reach workbook reading.",
        )

        self.assertEqual(
            len(import_calls),
            1,
            msg=(
                "Expected exactly one import execution; "
                f"observed {len(import_calls)}. "
                f"Request outcomes: {statuses}"
            ),
        )

        self.assertFalse(
            any(result[0] == "EXCEPTION" for result in statuses),
            msg=f"Concurrent requests raised exceptions: {statuses}",
        )

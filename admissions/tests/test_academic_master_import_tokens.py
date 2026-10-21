import json
import os
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Role, UserRole
from admissions.permissions import CanManageAcademicMasterData


class AcademicMasterImportTokenTests(APITestCase):
    preview_url = "/api/admissions/import/preview/"
    confirm_url = "/api/admissions/import/confirm/"

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)

        self.settings_override = override_settings(
            BASE_DIR=Path(self.temp_dir.name)
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

        User = get_user_model()

        self.manager_a = User.objects.create_user(
            username="import_token_manager_a",
            email="import-manager-a@example.com",
            password="TestPassword123!",
        )
        self.manager_b = User.objects.create_user(
            username="import_token_manager_b",
            email="import-manager-b@example.com",
            password="TestPassword123!",
        )
        self.viewer = User.objects.create_user(
            username="import_token_viewer",
            email="import-viewer@example.com",
            password="TestPassword123!",
        )

        required = CanManageAcademicMasterData.required_permissions
        codenames = [p.split(".", 1)[1] for p in required]

        permissions = list(
            Permission.objects.filter(
                content_type__app_label="admissions",
                codename__in=codenames,
            )
        )
        self.assertEqual(len(permissions), len(required))

        manager_role = Role.objects.create(
            name="Import Token Test Managers",
            code="IMPORT_TOKEN_TEST_MANAGERS",
        )
        manager_role.permissions.add(*permissions)

        viewer_role = Role.objects.create(
            name="Import Token Test Viewer",
            code="IMPORT_TOKEN_TEST_VIEWER",
        )

        view_permission = Permission.objects.get(
            content_type__app_label="admissions",
            codename="view_institution",
        )
        viewer_role.permissions.add(view_permission)

        for user in (self.manager_a, self.manager_b):
            UserRole.objects.create(
                user=user,
                role=manager_role,
                scope_type=UserRole.ScopeType.ORGANIZATION,
            )

        UserRole.objects.create(
            user=self.viewer,
            role=viewer_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

    def stage_token(self, token="synthetic-import-token"):
        from admissions.master_data_import_api import token_paths

        workbook_path, meta_path = token_paths(token)
        workbook_path.write_bytes(b"synthetic workbook content")

        from admissions.master_data_import_api import sha256_file

        meta_path.write_text(
            json.dumps({
                "token": token,
                "original_name": "synthetic.xlsx",
                "sha256": sha256_file(workbook_path),
                "created_at": "synthetic-test-timestamp",
            }),
            encoding="utf-8",
        )

        return token, workbook_path, meta_path

    def confirm(self, user, token):
        if user is None:
            self.client.force_authenticate(user=None)
        else:
            self.client.force_authenticate(user=user)

        return self.client.post(
            self.confirm_url,
            {
                "import_token": token,
                "acknowledge_warnings": True,
            },
            format="json",
        )

    def valid_report(self):
        return {
            "valid": True,
            "requires_warning_acknowledgement": False,
        }

    def test_authorized_manager_can_confirm(self):
        token, _, _ = self.stage_token()

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                return_value={"synthetic": []},
            ),
            patch(
                "admissions.master_data_import_api.validate",
                return_value=self.valid_report(),
            ),
            patch(
                "admissions.master_data_import_api.import_data",
                return_value={"institutions": 0},
            ) as importer,
        ):
            response = self.confirm(self.manager_a, token)

        self.assertEqual(response.status_code, 200)
        importer.assert_called_once()

    def test_another_authorized_manager_can_confirm(self):
        token, _, _ = self.stage_token()

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                return_value={"synthetic": []},
            ),
            patch(
                "admissions.master_data_import_api.validate",
                return_value=self.valid_report(),
            ),
            patch(
                "admissions.master_data_import_api.import_data",
                return_value={"institutions": 0},
            ) as importer,
        ):
            response = self.confirm(self.manager_b, token)

        self.assertEqual(response.status_code, 200)
        importer.assert_called_once()

    def test_view_only_user_cannot_confirm(self):
        token, workbook_path, meta_path = self.stage_token()

        with patch(
            "admissions.master_data_import_api.import_data"
        ) as importer:
            response = self.confirm(self.viewer, token)

        self.assertEqual(response.status_code, 403)
        importer.assert_not_called()
        self.assertTrue(workbook_path.exists())
        self.assertTrue(meta_path.exists())

    def test_anonymous_user_cannot_confirm(self):
        token, _, _ = self.stage_token()

        with patch(
            "admissions.master_data_import_api.import_data"
        ) as importer:
            response = self.confirm(None, token)

        self.assertEqual(response.status_code, 401)
        importer.assert_not_called()

    def test_expired_token_is_rejected(self):
        token, workbook_path, meta_path = self.stage_token()

        expired_time = time.time() - (31 * 60)
        os.utime(workbook_path, (expired_time, expired_time))
        os.utime(meta_path, (expired_time, expired_time))

        with patch(
            "admissions.master_data_import_api.import_data"
        ) as importer:
            response = self.confirm(self.manager_a, token)

        self.assertEqual(response.status_code, 410)
        importer.assert_not_called()

    def test_consumed_token_cannot_be_replayed(self):
        token, _, _ = self.stage_token()

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                return_value={"synthetic": []},
            ),
            patch(
                "admissions.master_data_import_api.validate",
                return_value=self.valid_report(),
            ),
            patch(
                "admissions.master_data_import_api.import_data",
                return_value={"institutions": 0},
            ) as importer,
        ):
            first_response = self.confirm(self.manager_a, token)
            second_response = self.confirm(self.manager_a, token)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 410)
        importer.assert_called_once()

    def test_invalid_token_is_rejected(self):
        with patch(
            "admissions.master_data_import_api.import_data"
        ) as importer:
            response = self.confirm(
                self.manager_a,
                "../invalid-token",
            )

        self.assertEqual(response.status_code, 400)
        importer.assert_not_called()

    def test_concurrent_confirmation_consumes_token_once(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier, BrokenBarrierError, Lock
        from rest_framework.test import APIClient

        token, _, _ = self.stage_token()

        barrier = Barrier(2)
        call_lock = Lock()
        import_calls = []

        def simulated_import(data):
            with call_lock:
                import_calls.append(data)

            try:
                barrier.wait(timeout=3)
            except BrokenBarrierError:
                pass

            return {"institutions": 0}

        def submit_confirmation(user):
            client = APIClient()
            client.force_authenticate(user=user)

            response = client.post(
                self.confirm_url,
                {
                    "import_token": token,
                    "acknowledge_warnings": True,
                },
                format="json",
            )

            return response.status_code

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                return_value={"synthetic": []},
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
                    submit_confirmation,
                    self.manager_a,
                )
                future_b = executor.submit(
                    submit_confirmation,
                    self.manager_b,
                )

                results = [
                    future_a.result(timeout=10),
                    future_b.result(timeout=10),
                ]

        self.assertLessEqual(
            len(import_calls),
            1,
            msg=(
                "The same import token reached the import "
                "operation more than once during concurrent "
                f"confirmation. HTTP statuses: {results}"
            ),
        )


    def test_failed_import_consumes_token(self):
        from admissions.models import AcademicMasterImportClaim
        from admissions.master_data_import_api import (
            claim_import_token,
        )

        token, _, _ = self.stage_token()

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                return_value={"synthetic": []},
            ),
            patch(
                "admissions.master_data_import_api.validate",
                return_value=self.valid_report(),
            ),
            patch(
                "admissions.master_data_import_api.import_data",
                side_effect=RuntimeError("Synthetic import failure"),
            ) as importer,
        ):
            response = self.confirm(self.manager_a, token)

        self.assertEqual(response.status_code, 500)
        importer.assert_called_once()

        self.assertEqual(
            AcademicMasterImportClaim.objects.count(),
            1,
        )

        self.assertFalse(
            claim_import_token(token),
            "Failed imports must not release their token claim.",
        )

        with patch(
            "admissions.master_data_import_api.import_data"
        ) as replay_importer:
            replay = self.confirm(self.manager_b, token)

        self.assertIn(replay.status_code, (409, 410))
        replay_importer.assert_not_called()

    def test_cleanup_permission_error_does_not_mask_success(self):
        from admissions.master_data_import_api import token_paths

        token, workbook_path, meta_path = self.stage_token()

        original_unlink = Path.unlink

        def simulated_unlink(path, *args, **kwargs):
            if path == workbook_path:
                raise PermissionError(
                    "Synthetic Windows file deletion error"
                )
            return original_unlink(path, *args, **kwargs)

        with (
            patch(
                "admissions.master_data_import_api.read_workbook",
                return_value={"synthetic": []},
            ),
            patch(
                "admissions.master_data_import_api.validate",
                return_value=self.valid_report(),
            ),
            patch(
                "admissions.master_data_import_api.import_data",
                return_value={"institutions": 0},
            ) as importer,
            patch.object(
                Path,
                "unlink",
                autospec=True,
                side_effect=simulated_unlink,
            ),
            patch(
                "admissions.master_data_import_api.logger"
            ) as logger,
        ):
            response = self.confirm(self.manager_a, token)

        self.assertEqual(response.status_code, 200)
        importer.assert_called_once()
        logger.exception.assert_called()

        # The workbook may remain after a simulated cleanup
        # failure, but its database claim prevents reuse.
        self.assertTrue(workbook_path.exists())

        with patch(
            "admissions.master_data_import_api.import_data"
        ) as replay_importer:
            replay = self.confirm(self.manager_b, token)

        self.assertIn(replay.status_code, (409, 410))
        replay_importer.assert_not_called()

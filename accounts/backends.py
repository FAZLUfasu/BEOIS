from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import Permission


class BEOISRoleBackend(ModelBackend):
    """
    Authentication/authorization backend for BEOIS.

    Keeps Django's normal user/group permissions and additionally
    gives users permissions assigned through active BEOIS Roles.
    """

    def get_group_permissions(self, user_obj, obj=None):
        # Keep Django's normal Group permissions.
        permissions = super().get_group_permissions(
            user_obj,
            obj=obj,
        )

        # Django ModelBackend doesn't provide object-level
        # permissions, so don't add role permissions for obj.
        if obj is not None:
            return permissions

        if user_obj.is_anonymous or not user_obj.is_active:
            return permissions

        role_permissions = Permission.objects.filter(
            beois_roles__user_assignments__user=user_obj,
            beois_roles__user_assignments__is_active=True,
            beois_roles__is_active=True,
        ).values_list(
            "content_type__app_label",
            "codename",
        ).distinct()

        role_permissions = {
            f"{app_label}.{codename}"
            for app_label, codename in role_permissions
        }

        return permissions | role_permissions
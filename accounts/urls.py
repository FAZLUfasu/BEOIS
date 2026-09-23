from django.urls import path

from .views import (
    CurrentUserView,
    UserDirectoryDetailView,
    UserDirectoryListView,
    SuperAdminPasswordResetView,
    CurrentUserProfilePictureView,
    SuperAdminProfilePictureView,
    SuperAdminRoleListView,
    SuperAdminUserDetailView,
    SuperAdminUserListCreateView,
    SuperAdminUserRoleDetailView,
    SuperAdminUserRoleListCreateView,
)


urlpatterns = [
    path(
        "me/",
        CurrentUserView.as_view(),
        name="current-user",
    ),
    path(
        "me/profile-picture/",
        CurrentUserProfilePictureView.as_view(),
        name="current-user-profile-picture",
    ),

    path(
        "users/",
        UserDirectoryListView.as_view(),
        name="user-directory-list",
    ),

    path(
        "users/<uuid:pk>/",
        UserDirectoryDetailView.as_view(),
        name="user-directory-detail",
    ),
        path(
        "admin/users/",
        SuperAdminUserListCreateView.as_view(),
        name="super-admin-user-list",
    ),

    path(
        "admin/users/<uuid:pk>/",
        SuperAdminUserDetailView.as_view(),
        name="super-admin-user-detail",
    ),

    path(
        "admin/users/<uuid:pk>/reset-password/",
        SuperAdminPasswordResetView.as_view(),
        name="super-admin-user-password",
    ),

    path(
        "admin/users/<uuid:pk>/profile-picture/",
        SuperAdminProfilePictureView.as_view(),
        name="super-admin-user-profile-picture",
    ),

    path(
        "admin/users/<uuid:pk>/roles/",
        SuperAdminUserRoleListCreateView.as_view(),
        name="super-admin-user-role-list",
    ),

    path(
        "admin/users/<uuid:user_pk>/roles/<uuid:role_pk>/",
        SuperAdminUserRoleDetailView.as_view(),
        name="super-admin-user-role-detail",
    ),

    path(
        "admin/roles/",
        SuperAdminRoleListView.as_view(),
        name="super-admin-role-list",
    ),
]
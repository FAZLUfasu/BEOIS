from django.urls import path

from .views import (
    CurrentUserView,
    UserDirectoryDetailView,
    UserDirectoryListView,
)


urlpatterns = [
    path(
        "me/",
        CurrentUserView.as_view(),
        name="current-user",
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
]
import uuid

from django.db import models


class Trust(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=255,
        unique=True,
    )

    short_name = models.CharField(
        max_length=100,
        blank=True,
    )

    registration_number = models.CharField(
        max_length=100,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return self.name


class BusinessUnit(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    trust = models.ForeignKey(
        Trust,
        on_delete=models.PROTECT,
        related_name="business_units",
    )

    name = models.CharField(
        max_length=255,
    )

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Branch(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.PROTECT,
        related_name="branches",
    )

    name = models.CharField(
        max_length=255,
    )

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
    )

    pincode = models.CharField(
        max_length=10,
        blank=True,
    )

    is_head_office = models.BooleanField(
        default=False,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="departments",
        null=True,
        blank=True,
    )

    name = models.CharField(
        max_length=255,
    )

    code = models.CharField(
        max_length=50,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

        constraints = [
            models.UniqueConstraint(
                fields=["branch", "code"],
                name="unique_department_code_per_branch",
            )
        ]

    def __str__(self):
        if self.branch:
            return f"{self.name} - {self.branch.name}"

        return f"{self.name} - Shared"
import re

from django.db import transaction

from .models import SystemSettings


# ================================================================
# IDENTIFIER CONFIGURATION
# ================================================================

IDENTIFIER_SETTING_FIELDS = {
    "lead": "lead_prefix",
    "credit_transfer": "credit_transfer_prefix",
    "admission": "admission_prefix",
    "student": "student_prefix",
    "partner": "partner_prefix",
    "partner_case": "partner_case_prefix",
    "employee": "employee_prefix",
}


# ================================================================
# SYSTEM SETTINGS
# ================================================================

def get_system_settings():
    """
    Return the singleton BEOIS system settings record.
    """
    return SystemSettings.get_settings()


def lock_system_settings():
    """
    Lock the singleton settings row.

    IMPORTANT:
    This function must be called inside transaction.atomic().

    The settings row acts as the central numbering lock so that
    two requests cannot calculate the same next identifier at the
    same time.
    """

    settings_obj = SystemSettings.get_settings()

    return (
        SystemSettings.objects
        .select_for_update()
        .get(pk=settings_obj.pk)
    )


# ================================================================
# PREFIX
# ================================================================

def get_identifier_prefix(
    identifier_type,
    *,
    settings_obj=None,
):
    """
    Return the configured prefix for an identifier type.
    """

    try:
        field_name = IDENTIFIER_SETTING_FIELDS[identifier_type]
    except KeyError as exc:
        raise ValueError(
            f"Unsupported identifier type: {identifier_type}"
        ) from exc

    if settings_obj is None:
        settings_obj = get_system_settings()

    prefix = getattr(
        settings_obj,
        field_name,
        "",
    )

    prefix = str(prefix or "").strip().upper()

    if not prefix:
        raise ValueError(
            f"No prefix configured for identifier type: "
            f"{identifier_type}"
        )

    return prefix


# ================================================================
# IDENTIFIER FORMAT
# ================================================================

def format_identifier(
    prefix,
    number,
    padding=None,
):
    """
    Format an identifier.

    Example:
        prefix = ST
        number = 25
        padding = 5

        ST-00025
    """

    if number < 1:
        raise ValueError(
            "Identifier number must be greater than zero."
        )

    prefix = str(prefix or "").strip().upper()

    if not prefix:
        raise ValueError(
            "Identifier prefix cannot be empty."
        )

    if padding is None:
        padding = get_system_settings().identifier_padding

    return f"{prefix}-{number:0{padding}d}"


# ================================================================
# NUMBER EXTRACTION
# ================================================================

def extract_identifier_number(identifier):
    """
    Extract the final numeric sequence from an identifier.

    Examples:

        ST-00015   -> 15
        BST-00015  -> 15
        EMP-102    -> 102

    Returns None when no valid trailing numeric sequence exists.
    """

    if not identifier:
        return None

    match = re.search(
        r"-(\d+)$",
        str(identifier).strip(),
    )

    if not match:
        return None

    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None


# ================================================================
# HIGHEST EXISTING NUMBER
# ================================================================

def find_highest_identifier_number(
    queryset,
    field_name,
):
    """
    Find the highest numeric suffix currently used.

    IMPORTANT:
    We intentionally inspect IDs from ALL prefixes.

    Example existing data:

        ST-00001
        ST-00002
        ST-00050

    Administrator changes prefix to BST.

    Next ID becomes:

        BST-00051

    rather than:

        BST-00001

    This prevents sequence reuse when prefixes change.
    """

    highest_number = 0

    identifiers = (
        queryset
        .exclude(**{field_name: ""})
        .values_list(
            field_name,
            flat=True,
        )
    )

    for identifier in identifiers:
        number = extract_identifier_number(
            identifier
        )

        if (
            number is not None
            and number > highest_number
        ):
            highest_number = number

    return highest_number


# ================================================================
# BUILD NEXT IDENTIFIER
# ================================================================

def build_next_identifier(
    queryset,
    field_name,
    identifier_type,
):
    """
    Build the next identifier using System Settings.

    CALL THIS INSIDE transaction.atomic().

    This function locks the singleton SystemSettings row.
    All BEOIS automatic ID generators therefore serialize their
    number allocation through one database lock.

    The caller must save the record before leaving the surrounding
    transaction.atomic() block.
    """

    settings_obj = lock_system_settings()

    prefix = get_identifier_prefix(
        identifier_type,
        settings_obj=settings_obj,
    )

    highest_number = find_highest_identifier_number(
        queryset,
        field_name,
    )

    next_number = highest_number + 1

    return format_identifier(
        prefix,
        next_number,
        settings_obj.identifier_padding,
    )
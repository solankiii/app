"""Field cleaning helpers used by the enrichment pipeline.

Trimmed port of the original core.cleaning — only the bits enrichment needs
(plus a couple of generic cleaners reused by social_profiles).
"""

from __future__ import annotations

import re
from typing import Optional

_BLANK_TOKENS = {"", "n/a", "na", "none", "not available", "-", "nan", "null"}


def _is_blank(value) -> bool:
    if value is None:
        return True
    try:
        if isinstance(value, float) and value != value:  # NaN
            return True
    except TypeError:
        pass
    return str(value).strip().lower() in _BLANK_TOKENS


def clean_text(value) -> Optional[str]:
    if _is_blank(value):
        return None
    return re.sub(r"\s+", " ", str(value).strip())


def extract_domain(value) -> Optional[str]:
    """Root domain from a URL."""
    if _is_blank(value):
        return None
    url = str(value).strip().lower()
    url = url.replace("https://", "").replace("http://", "")
    url = url.split("/")[0].split("?")[0]
    if url.startswith("www."):
        url = url[4:]
    return url or None


def clean_website(value) -> Optional[str]:
    if _is_blank(value):
        return None
    url = str(value).strip()
    if not url.lower().startswith(("http://", "https://")):
        url = "https://" + url
    return url


def clean_instagram(value) -> Optional[str]:
    """Return a normalized @handle from a URL or raw handle."""
    if _is_blank(value):
        return None
    raw = str(value).strip()
    m = re.search(r"instagram\.com/([^/?#]+)", raw, flags=re.I)
    handle = m.group(1) if m else raw
    handle = handle.strip().lstrip("@").strip("/")
    if not handle or handle.lower() in {"p", "reel", "explore", "stories"}:
        return None
    return "@" + handle

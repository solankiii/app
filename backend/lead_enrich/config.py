"""Enrichment configuration (env-driven, sensible defaults).

Only the website-enrichment knobs are kept here. The AI-provider config from the
original project is intentionally omitted — the CRM port does website + social
enrichment, not AI scoring.
"""

from __future__ import annotations

import os


def _get(name: str, default: str) -> str:
    value = os.environ.get(name, "").strip()
    return value or default


def _get_int(name: str, default: int) -> int:
    try:
        return int(_get(name, str(default)))
    except ValueError:
        return default


# --- Website enrichment -----------------------------------------------------
# Enrichment is network I/O (not CPU), so threaded parallelism is safe.
ENRICH_CONCURRENCY = max(1, _get_int("ENRICH_CONCURRENCY", 8))
ENRICH_TIMEOUT = _get_int("ENRICH_TIMEOUT", 12)            # seconds per page
ENRICH_MAX_PAGES = _get_int("ENRICH_MAX_PAGES", 3)         # home + contact + about
ENRICH_TEXT_SUMMARY_CHARS = _get_int("ENRICH_TEXT_SUMMARY_CHARS", 1800)
ENRICH_USER_AGENT = _get(
    "ENRICH_USER_AGENT",
    "Mozilla/5.0 (compatible; AHM-LeadResearch/1.0; +https://acehousemedia.example)",
)

# Hard cap on how many leads a single enrichment job will process, to bound
# memory/time on the host.
ENRICH_MAX_LEADS_PER_JOB = _get_int("ENRICH_MAX_LEADS_PER_JOB", 1000)

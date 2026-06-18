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
# Defaults are tuned for speed over completeness: a tight per-page timeout so
# dead/slow sites don't stall the batch, and homepage-only by default (the
# homepage already yields socials + most contact info). Bump ENRICH_MAX_PAGES
# back to 3 via env if you need contact/about-page emails and can spare the time.
# Keep this LOW on small/free-tier hosts: the enrichment threads share one CPU
# with the web server, and too many parsing threads starve the event loop so it
# can't answer status polls (the frontend then thinks the job died). 5-6 is a
# safe balance on a 0.1-CPU box; raise it only on a backend with real CPU.
ENRICH_CONCURRENCY = max(1, _get_int("ENRICH_CONCURRENCY", 5))
# Tight per-page timeout: most wasted time is dead/parked sites hitting the full
# timeout, so 4s reclaims a lot without adding CPU load. Bump via env if you move
# to a backend with real CPU.
ENRICH_TIMEOUT = _get_int("ENRICH_TIMEOUT", 4)             # seconds per page
ENRICH_MAX_PAGES = _get_int("ENRICH_MAX_PAGES", 1)         # homepage only (set 3 for +contact/about)
ENRICH_TEXT_SUMMARY_CHARS = _get_int("ENRICH_TEXT_SUMMARY_CHARS", 1800)
ENRICH_USER_AGENT = _get(
    "ENRICH_USER_AGENT",
    "Mozilla/5.0 (compatible; AHM-LeadResearch/1.0; +https://acehousemedia.example)",
)

# Hard cap on how many leads a single enrichment job will process, to bound
# memory/time on the host.
ENRICH_MAX_LEADS_PER_JOB = _get_int("ENRICH_MAX_LEADS_PER_JOB", 1000)

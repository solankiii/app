"""Best-effort public Instagram/LinkedIn profile metadata.

Fetches the public profile page (no login, no API) and reads what's available
from the page title and OG/meta tags: handle, profile name, follower/following/
post counts. IG/LinkedIn frequently block datacenter IPs, in which case the
status is recorded (e.g. "blocked_http_401") and fields are left blank.

Ported from lead_discovery_app.py's inspect_* helpers.
"""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Optional

from bs4 import BeautifulSoup
from scrapling.fetchers import Fetcher

from . import config
from .enrichment import EnrichedLead

HTTP_HEADERS = {
    "User-Agent": config.ENRICH_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def inspect_social_profiles(enriched: EnrichedLead) -> dict:
    return {
        "instagram": inspect_instagram(enriched.instagram_url),
        "linkedin": inspect_linkedin(enriched.linkedin_url),
    }


def collect_social_profile_details(
    enriched: list[EnrichedLead],
    *,
    workers: int = 6,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> list[dict]:
    results: list[Optional[dict]] = [None] * len(enriched)
    if not enriched:
        return []
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        fut_to_idx = {pool.submit(inspect_social_profiles, item): i for i, item in enumerate(enriched)}
        done = 0
        for fut in as_completed(fut_to_idx):
            idx = fut_to_idx[fut]
            done += 1
            try:
                results[idx] = fut.result()
            except Exception as exc:
                results[idx] = {
                    "instagram": {"status": f"error: {exc}"},
                    "linkedin": {"status": f"error: {exc}"},
                }
            if progress_cb:
                progress_cb(done, len(enriched), enriched[idx].business_name)
    return [r or {} for r in results]


def inspect_instagram(url: Optional[str]) -> dict:
    detail = _empty_profile("not_found")
    if not url:
        return detail
    detail["url"] = _clean_instagram(url)
    detail["handle"] = _instagram_handle(detail["url"])
    html, final_url, status = fetch_public_page(detail["url"])
    detail["status"] = status
    if final_url:
        detail["url"] = final_url
        detail["handle"] = _instagram_handle(final_url) or detail["handle"]
    if not html:
        return detail
    soup = BeautifulSoup(html, "lxml")
    title = _page_title(soup)
    desc = _meta(soup, "description") or _meta(soup, "og:description")
    og_title = _meta(soup, "og:title")
    detail["profile_name"] = _instagram_profile_name(og_title or title, detail["handle"])
    counts = _instagram_counts(" ".join([title, desc or ""]))
    detail.update(counts)
    detail["raw_title"] = title
    return detail


def inspect_linkedin(url: Optional[str]) -> dict:
    detail = _empty_profile("not_found")
    if not url:
        return detail
    detail["url"] = _clean_linkedin(url)
    detail["profile_type"] = "company" if "/company/" in detail["url"].lower() else "person"
    html, final_url, status = fetch_public_page(detail["url"])
    detail["status"] = status
    if final_url:
        detail["url"] = final_url
    if not html:
        return detail
    soup = BeautifulSoup(html, "lxml")
    title = _page_title(soup)
    desc = _meta(soup, "description") or _meta(soup, "og:description")
    og_title = _meta(soup, "og:title")
    detail["profile_name"] = _linkedin_profile_name(og_title or title)
    detail["followers"] = _first_regex(r"([\d,.]+[KMBkmb]?)\s+followers?", " ".join([title, desc or ""]))
    detail["raw_title"] = title
    return detail


def fetch_public_page(url: str) -> tuple[str, str, str]:
    if not url:
        return "", "", "not_found"
    try:
        response = Fetcher.get(
            url,
            headers=HTTP_HEADERS,
            timeout=config.ENRICH_TIMEOUT,
            follow_redirects=True,
            stealthy_headers=False,
        )
        if response.status in {401, 403, 429, 999}:
            return "", str(response.url), f"blocked_http_{response.status}"
        if response.status >= 400:
            return "", str(response.url), f"http_{response.status}"
        html = str(response.html_content or "")
        return html[:600_000], str(response.url), "ok"
    except Exception as exc:
        return "", "", f"fetch_error: {_short(str(exc), 90)}"


# --- helpers ---------------------------------------------------------------- #
def _empty_profile(status: str) -> dict:
    return {
        "url": "",
        "handle": "",
        "profile_name": "",
        "followers": "",
        "following": "",
        "posts": "",
        "profile_type": "",
        "status": status,
        "raw_title": "",
    }


def _is_blank(value) -> bool:
    if value is None:
        return True
    text = str(value).strip()
    return text == "" or text.lower() in {"n/a", "na", "none", "null", "not available", "nan"}


def _clean_text(value) -> str:
    if _is_blank(value):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _clean_url(value) -> str:
    text = _clean_text(value)
    if not text:
        return ""
    if text.startswith("@"):
        return text
    if not re.match(r"^https?://", text, flags=re.I):
        text = "https://" + text
    return text


def _clean_instagram(value) -> str:
    text = _clean_text(value)
    if not text:
        return ""
    if "instagram.com" in text.lower():
        return _clean_url(text.split()[0])
    handle = text.strip().lstrip("@").split()[0].strip("/")
    if not handle:
        return ""
    return f"https://www.instagram.com/{handle}"


def _clean_linkedin(value) -> str:
    text = _clean_text(value)
    if not text:
        return ""
    if "linkedin.com" in text.lower():
        return _clean_url(text.split()[0])
    slug = text.strip().strip("/")
    return f"https://www.linkedin.com/company/{slug}"


def _page_title(soup: BeautifulSoup) -> str:
    if soup.title and soup.title.string:
        return _clean_text(soup.title.string)
    return ""


def _meta(soup: BeautifulSoup, name: str) -> str:
    selectors = [{"property": name}, {"name": name}]
    if name == "description":
        selectors.append({"property": "og:description"})
    for attrs in selectors:
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return _clean_text(tag.get("content"))
    return ""


def _instagram_handle(url: str) -> str:
    if not url:
        return ""
    match = re.search(r"instagram\.com/([^/?#]+)/?", url, flags=re.I)
    if not match:
        return ""
    handle = match.group(1).strip("@")
    if handle.lower() in {"p", "reel", "stories", "explore"}:
        return ""
    return handle


def _instagram_profile_name(title: str, handle: str) -> str:
    title = _clean_text(title)
    if not title:
        return ""
    if handle:
        title = re.sub(rf"\(@?{re.escape(handle)}\)", "", title, flags=re.I)
    title = re.split(r"\s+[|•]\s+Instagram", title, maxsplit=1, flags=re.I)[0]
    title = title.replace("Instagram photos and videos", "").strip(" -|•")
    return title


def _linkedin_profile_name(title: str) -> str:
    title = _clean_text(title)
    if not title:
        return ""
    title = re.split(r"\s+[|•]\s+LinkedIn", title, maxsplit=1, flags=re.I)[0]
    return title.strip(" -|•")


def _instagram_counts(text: str) -> dict:
    out = {"followers": "", "following": "", "posts": ""}
    match = re.search(
        r"([\d,.]+[KMBkmb]?)\s+followers?,\s*([\d,.]+[KMBkmb]?)\s+following,\s*([\d,.]+[KMBkmb]?)\s+posts?",
        text,
        flags=re.I,
    )
    if match:
        out["followers"], out["following"], out["posts"] = match.groups()
        return out
    out["followers"] = _first_regex(r"([\d,.]+[KMBkmb]?)\s+followers?", text)
    out["following"] = _first_regex(r"([\d,.]+[KMBkmb]?)\s+following", text)
    out["posts"] = _first_regex(r"([\d,.]+[KMBkmb]?)\s+posts?", text)
    return out


def _first_regex(pattern: str, text: str) -> str:
    match = re.search(pattern, text or "", flags=re.I)
    return match.group(1) if match else ""


def _short(text: str, limit: int) -> str:
    text = _clean_text(text)
    if len(text) > limit:
        return text[: limit - 3] + "..."
    return text

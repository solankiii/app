"""Website enrichment: gather REAL evidence from a lead's own website.

For each lead that has a website we fetch the homepage and (if linked) the
contact and about pages, then extract page-text evidence, service/premium/weak
signals, and social + contact links (Instagram, LinkedIn, Facebook, YouTube,
WhatsApp, emails, phones) taken ONLY from real anchors / mailto / tel / regex.

We never invent a link. If something is not found it is recorded in
``missing_data``.

Ethics: only public pages on the business's own website are fetched.
"""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Optional
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from scrapling.fetchers import Fetcher

from . import config
from .cleaning import clean_instagram
from .models import EnrichedLead, LeadInput

# --- Signal vocabularies (matched against real page text) ------------------- #
PREMIUM_KEYWORDS = [
    "luxury", "premium", "bespoke", "handcrafted", "handmade", "artisan",
    "exclusive", "couture", "fine dining", "michelin", "award", "awarded",
    "boutique", "curated", "signature", "flagship", "heritage", "since 19",
    "since 20", "established 19", "established 20", "5-star", "five star",
    "reservation", "by appointment", "concierge", "atelier", "limited edition",
]
WEAK_KEYWORDS = [
    "coming soon", "under construction", "website coming", "lorem ipsum",
    "free quote", "lowest price", "cheapest", "discount", "best rate",
    "page not found", "default web page", "godaddy", "domain for sale",
]
SERVICE_KEYWORDS = [
    # F&B
    "cafe", "café", "restaurant", "dining", "bakery", "patisserie", "bar",
    "brunch", "coffee", "menu", "catering",
    # beauty / wellness
    "salon", "spa", "bridal", "makeup", "hair", "skin", "aesthetic", "wellness",
    "massage", "facial", "treatment", "tattoo", "piercing",
    # clinic / health
    "clinic", "dental", "dermatology", "cosmetic", "physiotherapy", "ivf",
    # design / property
    "interior", "architect", "design", "decor", "turnkey", "real estate",
    "property", "apartment", "villa", "project", "builder", "developer",
    # retail / fashion / jewellery
    "jewellery", "jewelry", "diamond", "gold", "fashion", "couture", "apparel",
    "boutique",
    # marine / B2B
    "yacht", "charter", "boat", "sailing", "marine", "ship", "chandler",
    "chandlery", "ship stores", "supplier", "wholesale", "procurement", "b2b",
    "manufacturer", "export", "import",
    # generic services
    "booking", "appointment", "consultation", "portfolio", "gallery",
]

CONTACT_PATH_HINTS = ["contact", "contact-us", "contactus", "reach-us", "enquiry", "enquiries"]
ABOUT_PATH_HINTS = ["about", "about-us", "aboutus", "our-story", "who-we-are"]

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?91[\-\s]?)?(?:\d[\-\s]?){10}\d?")


class WebsiteConnectError(RuntimeError):
    """Raised when Scrapling cannot fetch a page at the transport layer."""


class WebsiteHTTPError(RuntimeError):
    """Raised when a public website returns an HTTP error response."""


def _scrapling_headers() -> dict[str, str]:
    return {
        "User-Agent": config.ENRICH_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
    }


def _normalize_url(website: str) -> Optional[str]:
    if not website:
        return None
    url = website.strip()
    if not url.lower().startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _classify_social(href: str) -> Optional[tuple[str, str]]:
    h = href.strip()
    low = h.lower()
    if "instagram.com" in low:
        return ("instagram", h)
    if "linkedin.com/company/" in low or "linkedin.com/in/" in low or "linkedin.com/" in low:
        return ("linkedin", h)
    if "facebook.com" in low or "fb.com" in low:
        return ("facebook", h)
    if "youtube.com" in low or "youtu.be" in low:
        return ("youtube", h)
    if "wa.me" in low or "api.whatsapp.com" in low or "whatsapp.com" in low:
        return ("whatsapp", h)
    return None


def _visible_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text)


def _find_internal_page(soup: BeautifulSoup, base_url: str, hints: list[str]) -> Optional[str]:
    base_host = urlparse(base_url).netloc
    for a in soup.find_all("a", href=True):
        href = a["href"]
        low = href.lower()
        if any(hint in low for hint in hints):
            full = urljoin(base_url, href)
            if urlparse(full).netloc in ("", base_host):
                return full
    return None


def _extract_from_soup(soup: BeautifulSoup, evidence: dict) -> None:
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip()
            if EMAIL_RE.fullmatch(addr):
                evidence["emails"].add(addr.lower())
            continue
        if href.lower().startswith("tel:"):
            evidence["phones"].add(href[4:].strip())
            continue
        cls = _classify_social(href)
        if cls:
            platform, url = cls
            evidence[platform].add(url)


def _fetch_page(url: str) -> Optional[tuple[BeautifulSoup, str]]:
    """Return (parsed soup, final URL after redirects) or None for non-HTML."""
    try:
        resp = Fetcher.get(
            url,
            timeout=config.ENRICH_TIMEOUT,
            follow_redirects=True,
            headers=_scrapling_headers(),
            stealthy_headers=False,
        )
    except Exception as exc:
        raise WebsiteConnectError(str(exc)) from exc

    if resp.status >= 400:
        raise WebsiteHTTPError(f"http_{resp.status}")

    html = str(resp.html_content or "")
    ctype = resp.headers.get("content-type", "")
    if "html" not in ctype and "<html" not in html[:2000].lower():
        return None
    return BeautifulSoup(html, "lxml"), str(resp.url)


def enrich_lead(lead: LeadInput) -> EnrichedLead:
    """Visit the lead's website (if any) and attach real evidence."""
    enriched = EnrichedLead.from_lead(lead)
    url = _normalize_url(lead.website or "")

    if not url:
        enriched.website_checked = False
        enriched.website_fetch_status = "no_website"
        _finalize_missing(enriched)
        return enriched

    evidence = {k: set() for k in
                ("instagram", "linkedin", "facebook", "youtube", "whatsapp",
                 "emails", "phones")}
    checked: list[str] = []

    try:
        fetched = _fetch_page(url)
        if fetched is None:
            raise ValueError("non-html homepage")
        home, final_url = fetched
        checked.append(url)
        enriched.final_url = final_url

        enriched.website_checked = True
        enriched.website_fetch_status = "ok"
        if home.title and home.title.string:
            enriched.page_title = home.title.string.strip()[:300]
        meta = home.find("meta", attrs={"name": "description"}) or \
            home.find("meta", attrs={"property": "og:description"})
        if meta and meta.get("content"):
            enriched.meta_description = meta["content"].strip()[:400]
        enriched.h1_texts = [h.get_text(strip=True) for h in home.find_all("h1")][:8]
        enriched.h2_texts = [h.get_text(strip=True) for h in home.find_all("h2")][:12]

        home_text = _visible_text(home)
        _extract_from_soup(home, evidence)

        extra_texts = [home_text]
        contact_url = _find_internal_page(home, url, CONTACT_PATH_HINTS)
        about_url = _find_internal_page(home, url, ABOUT_PATH_HINTS)

        for page_url, attr in ((contact_url, "contact_page_url"),
                               (about_url, "about_page_url")):
            if page_url and len(checked) < config.ENRICH_MAX_PAGES:
                try:
                    fetched_pg = _fetch_page(page_url)
                    if fetched_pg is not None:
                        sp, _ = fetched_pg
                        setattr(enriched, attr, page_url)
                        checked.append(page_url)
                        _extract_from_soup(sp, evidence)
                        extra_texts.append(_visible_text(sp))
                except (WebsiteConnectError, WebsiteHTTPError, ValueError):
                    pass

        combined = " ".join(extra_texts)
        for m in EMAIL_RE.findall(combined):
            evidence["emails"].add(m.lower())

        enriched.visible_text_summary = combined[:config.ENRICH_TEXT_SUMMARY_CHARS]
        enriched.services_keywords = _match_keywords(combined, SERVICE_KEYWORDS)
        enriched.premium_signals = _match_keywords(combined, PREMIUM_KEYWORDS)
        enriched.weak_signals = _match_keywords(combined, WEAK_KEYWORDS)

    except WebsiteConnectError:
        enriched.website_checked = False
        enriched.website_fetch_status = "connect_error"
    except WebsiteHTTPError:
        enriched.website_checked = False
        enriched.website_fetch_status = "http_error"
    except Exception:
        enriched.website_checked = False
        enriched.website_fetch_status = "error"

    enriched.source_urls_checked = checked
    _apply_social(enriched, evidence)
    _finalize_missing(enriched)
    return enriched


def _match_keywords(text: str, vocab: list[str]) -> list[str]:
    low = text.lower()
    found = [kw for kw in vocab if kw in low]
    return list(dict.fromkeys(found))[:20]


def _first(s: set) -> Optional[str]:
    return sorted(s)[0] if s else None


def _apply_social(enriched: EnrichedLead, ev: dict) -> None:
    insta = _first(ev["instagram"])
    if insta:
        enriched.instagram_url = insta
        enriched.instagram_handle = clean_instagram(insta) or enriched.instagram_handle
        enriched.instagram_found = True

    enriched.linkedin_url = _first(ev["linkedin"]) or enriched.linkedin_url
    enriched.facebook_url = _first(ev["facebook"]) or enriched.facebook_url
    enriched.youtube_url = _first(ev["youtube"]) or enriched.youtube_url
    enriched.whatsapp_url = _first(ev["whatsapp"]) or enriched.whatsapp_url

    emails = sorted(ev["emails"])
    if enriched.email and enriched.email.lower() not in [e.lower() for e in emails]:
        emails = [enriched.email] + emails
    enriched.emails_found = emails[:10]

    phones = sorted({re.sub(r"[^\d+]", "", p) for p in ev["phones"] if p})
    enriched.phones_found = [p for p in phones if len(re.sub(r"\D", "", p)) >= 10][:10]


def _finalize_missing(enriched: EnrichedLead) -> None:
    missing: list[str] = []
    if enriched.website_fetch_status == "no_website":
        missing.append("no website provided")
    elif not enriched.website_checked:
        missing.append(f"website could not be fetched ({enriched.website_fetch_status})")
    if not enriched.instagram_found:
        missing.append("instagram not found from available sources")
    if not enriched.linkedin_url:
        missing.append("linkedin not found from available sources")
    if not enriched.emails_found and not enriched.email:
        missing.append("no email found from available sources")
    if enriched.reviews is None:
        missing.append("google reviews count missing")
    elif enriched.reviews < 10:
        missing.append("very few google reviews (<10)")
    if enriched.rating is None:
        missing.append("google rating missing")
    if not (enriched.industry or enriched.services_keywords):
        missing.append("business category unclear")
    enriched.missing_data = list(dict.fromkeys(missing))


def enrich_leads(
    leads: list[LeadInput],
    *,
    workers: Optional[int] = None,
    progress_cb: Optional[Callable[[int, int, EnrichedLead], None]] = None,
) -> list[EnrichedLead]:
    """Enrich many leads concurrently (network I/O — parallelism is safe here)."""
    workers = config.ENRICH_CONCURRENCY if workers is None else workers
    total = len(leads)
    if total == 0:
        return []

    results: list[Optional[EnrichedLead]] = [None] * total
    done = 0

    def _run(i_lead):
        i, lead = i_lead
        return i, enrich_lead(lead)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        for i, enriched in pool.map(_run, list(enumerate(leads))):
            results[i] = enriched
            done += 1
            if progress_cb:
                progress_cb(done, total, enriched)

    return results  # type: ignore[return-value]

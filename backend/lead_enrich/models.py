"""Pydantic models for the enrichment pipeline.

Only LeadInput (raw lead) and EnrichedLead (lead + real website/social evidence)
are kept. The AI scoring contract from the original project is omitted.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class LeadInput(BaseModel):
    business_name: str
    industry: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    google_maps_link: Optional[str] = None

    @field_validator("business_name")
    @classmethod
    def _name_required(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("business_name must not be empty")
        return v


class EnrichedLead(LeadInput):
    # Fetch outcome
    website_checked: bool = False
    website_fetch_status: str = "not_attempted"  # ok | http_error | connect_error | no_website | not_attempted
    final_url: Optional[str] = None

    # Page content evidence
    page_title: Optional[str] = None
    meta_description: Optional[str] = None
    h1_texts: list[str] = Field(default_factory=list)
    h2_texts: list[str] = Field(default_factory=list)
    visible_text_summary: Optional[str] = None
    services_keywords: list[str] = Field(default_factory=list)
    premium_signals: list[str] = Field(default_factory=list)
    weak_signals: list[str] = Field(default_factory=list)

    # Social / contact evidence (only what was actually found)
    instagram_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    instagram_found: bool = False
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    whatsapp_url: Optional[str] = None
    emails_found: list[str] = Field(default_factory=list)
    phones_found: list[str] = Field(default_factory=list)
    contact_page_url: Optional[str] = None
    about_page_url: Optional[str] = None

    # Provenance + gaps
    source_urls_checked: list[str] = Field(default_factory=list)
    missing_data: list[str] = Field(default_factory=list)

    @classmethod
    def from_lead(cls, lead: LeadInput) -> "EnrichedLead":
        e = cls(**lead.model_dump())
        if lead.instagram:
            e.instagram_handle = lead.instagram
            e.instagram_found = True
            if "instagram.com" in lead.instagram:
                e.instagram_url = lead.instagram
        return e

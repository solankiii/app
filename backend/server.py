from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, File, UploadFile, Form
from fastapi.responses import Response
import csv
import io
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import base64
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import List, Optional

# ─── Setup ───────────────────────────────────────────────────────────
import certifi
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get('DB_NAME', 'sales_crm')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'default-dev-jwt-secret')
JWT_ALGORITHM = "HS256"

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

def send_otp_email(to_email: str, otp: str):
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logging.warning("SMTP not configured — cannot send OTP email")
        return False
    msg = MIMEMultipart()
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    msg["Subject"] = "AHM Sales CRM - Password Reset OTP"
    body = f"""
    <h2>Password Reset</h2>
    <p>Your one-time password (OTP) to reset your account password is:</p>
    <h1 style="color: #2563EB; letter-spacing: 8px; font-size: 36px;">{otp}</h1>
    <p>This OTP is valid for <b>10 minutes</b>.</p>
    <p>If you did not request this, please ignore this email.</p>
    <br>
    <p style="color: #888;">— AHM Sales CRM</p>
    """
    msg.attach(MIMEText(body, "html"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

app = FastAPI(title="AHM Sales CRM API")
api_router = APIRouter(prefix="/api")


@app.get("/health")
async def health():
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "ok",
        "database": db_status,
        "environment": os.environ.get("RENDER", "local"),
    }

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# ─── Pydantic Models ────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    phone: Optional[str] = None

class LeadCreate(BaseModel):
    full_name: str
    phone_number: str
    alternate_phone: Optional[str] = None
    company_name: Optional[str] = None
    source: str = "direct"
    industry: Optional[str] = None
    city: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    alternate_phone: Optional[str] = None
    company_name: Optional[str] = None
    source: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: str  # "admin" or "sales"

class ResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class CallSessionCreate(BaseModel):
    lead_id: str
    dialed_number: str

class CallSessionUpdate(BaseModel):
    outcome: Optional[str] = None
    duration_seconds: Optional[int] = None
    call_notes: Optional[str] = None
    next_follow_up_at: Optional[str] = None
    lead_status: Optional[str] = None

class FollowUpCreate(BaseModel):
    lead_id: str
    call_session_id: Optional[str] = None
    follow_up_at: str
    follow_up_type: str = "call"
    note: Optional[str] = None

class FollowUpUpdate(BaseModel):
    follow_up_at: Optional[str] = None
    follow_up_type: Optional[str] = None
    note: Optional[str] = None
    status: Optional[str] = None

class LeadNoteCreate(BaseModel):
    lead_id: str
    note_text: str


# ─── Auth Routes ─────────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account disabled")
    token = create_access_token(user["id"], user["email"], user["role"])
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": user_data, "access_token": token}

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    email = req.email.lower().strip()
    if not req.full_name.strip():
        raise HTTPException(400, "Full name is required")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(409, "An account with this email already exists")
    now = datetime.now(timezone.utc).isoformat()
    user = {
        "id": str(uuid.uuid4()),
        "full_name": req.full_name.strip(),
        "email": email,
        "phone": req.phone,
        "role": "sales",
        "is_active": True,
        "password_hash": hash_password(req.password),
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user["role"])
    user_data = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"user": user_data, "access_token": token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, request: Request):
    """Admin resets any user's password."""
    await require_admin(request)
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    target = await db.users.find_one({"id": req.user_id})
    if not target:
        raise HTTPException(404, "User not found")
    await db.users.update_one(
        {"id": req.user_id},
        {"$set": {"password_hash": hash_password(req.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Password reset successfully"}

@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, request: Request):
    """User changes their own password."""
    user = await get_current_user(request)
    full_user = await db.users.find_one({"id": user["id"]})
    if not verify_password(req.current_password, full_user.get("password_hash", "")):
        raise HTTPException(400, "Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(req.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Password changed successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Send OTP to user's email for password reset."""
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user:
        # Don't reveal whether email exists
        return {"message": "If this email is registered, you will receive an OTP."}
    otp = str(random.randint(100000, 999999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.password_resets.delete_many({"email": req.email.lower().strip()})
    await db.password_resets.insert_one({
        "email": req.email.lower().strip(),
        "otp": otp,
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    sent = send_otp_email(req.email.lower().strip(), otp)
    if not sent:
        raise HTTPException(500, "Failed to send email. SMTP not configured — contact your admin.")
    return {"message": "If this email is registered, you will receive an OTP."}

@api_router.post("/auth/verify-reset-otp")
async def verify_reset_otp(req: VerifyOtpRequest):
    """Verify OTP and reset password."""
    record = await db.password_resets.find_one({"email": req.email.lower().strip(), "otp": req.otp})
    if not record:
        raise HTTPException(400, "Invalid OTP")
    if datetime.now(timezone.utc).isoformat() > record["expires_at"]:
        await db.password_resets.delete_many({"email": req.email.lower().strip()})
        raise HTTPException(400, "OTP has expired. Please request a new one.")
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    await db.users.update_one(
        {"email": req.email.lower().strip()},
        {"$set": {"password_hash": hash_password(req.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.password_resets.delete_many({"email": req.email.lower().strip()})
    return {"message": "Password reset successfully. You can now sign in."}


# ─── Users Routes ────────────────────────────────────────────────────
@api_router.get("/users")
async def list_users(request: Request):
    await get_current_user(request)
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)

@api_router.get("/users/sales")
async def list_sales_users(request: Request):
    await get_current_user(request)
    return await db.users.find({"role": "sales"}, {"_id": 0, "password_hash": 0}).to_list(100)

@api_router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, req: UserRoleUpdate, request: Request):
    await require_admin(request)
    if req.role not in ("admin", "sales"):
        raise HTTPException(400, "Role must be 'admin' or 'sales'")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"role": req.role, "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated


# ─── Leads Routes ────────────────────────────────────────────────────
@api_router.get("/leads/industries")
async def list_industries(request: Request):
    await get_current_user(request)
    industries = await db.leads.distinct("industry")
    return [i for i in industries if i]

@api_router.get("/leads")
async def list_leads(
    request: Request,
    status: Optional[str] = None,
    source: Optional[str] = None,
    industry: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50, skip: int = 0
):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "sales":
        query["assigned_to"] = user["id"]
    if status:
        query["status"] = status
    if source:
        query["source"] = source
    if industry:
        query["industry"] = industry
    if assigned_to and user["role"] == "admin":
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"industry": {"$regex": search, "$options": "i"}}
        ]
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.leads.count_documents(query)
    # Batch enrich: collect IDs
    assigned_ids = list({l["assigned_to"] for l in leads if l.get("assigned_to")})
    lead_ids = [l["id"] for l in leads]
    # Batch fetch users
    users_map = {}
    if assigned_ids:
        users_list = await db.users.find({"id": {"$in": assigned_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        users_map = {u["id"]: u["full_name"] for u in users_list}
    # Batch fetch last call dates via aggregation
    last_calls_map = {}
    if lead_ids:
        pipeline = [
            {"$match": {"lead_id": {"$in": lead_ids}}},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$lead_id", "last_call": {"$first": "$created_at"}}}
        ]
        async for doc in db.call_sessions.aggregate(pipeline):
            last_calls_map[doc["_id"]] = doc["last_call"]
    # Batch fetch next follow-ups
    next_fu_map = {}
    if lead_ids:
        pipeline = [
            {"$match": {"lead_id": {"$in": lead_ids}, "status": "pending"}},
            {"$sort": {"follow_up_at": 1}},
            {"$group": {"_id": "$lead_id", "next_fu": {"$first": "$follow_up_at"}}}
        ]
        async for doc in db.follow_ups.aggregate(pipeline):
            next_fu_map[doc["_id"]] = doc["next_fu"]
    # Map results
    for lead in leads:
        lead["assigned_name"] = users_map.get(lead.get("assigned_to"), "Unassigned")
        lead["last_call_date"] = last_calls_map.get(lead["id"])
        lead["next_follow_up"] = next_fu_map.get(lead["id"])
    return {"leads": leads, "total": total}

@api_router.post("/leads")
async def create_lead(req: LeadCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    lead = {
        "id": str(uuid.uuid4()),
        "full_name": req.full_name,
        "phone_number": req.phone_number,
        "alternate_phone": req.alternate_phone,
        "company_name": req.company_name,
        "source": req.source,
        "industry": req.industry,
        "status": "new",
        "assigned_to": req.assigned_to or user["id"],
        "city": req.city,
        "notes": req.notes,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.leads.insert_one(lead)
    lead.pop("_id", None)
    if req.notes:
        await db.lead_notes.insert_one({
            "id": str(uuid.uuid4()), "lead_id": lead["id"],
            "user_id": user["id"], "note_text": req.notes, "created_at": now
        })
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "entity_type": "lead", "entity_id": lead["id"],
        "action": "created", "meta_json": {"lead_name": lead["full_name"]},
        "created_at": now
    })
    return lead

def _get_csv_field(row: dict, *keys: str) -> str:
    """Get a field from a CSV row, trying multiple column name variations case-insensitively."""
    lower_map = {k.strip().lower(): v for k, v in row.items() if k}
    for key in keys:
        val = lower_map.get(key.lower(), "")
        if val and val.strip():
            return val.strip()
    return ""


KNOWN_CSV_FIELDS = {
    "full_name": ["full_name", "name", "full name", "contact name", "contact"],
    "phone_number": ["phone_number", "phone", "phone number", "phone num", "mobile", "mobile number", "contact number", "mob"],
    "alternate_phone": ["alternate_phone", "alternate phone", "alt phone", "phone 2", "phone2"],
    "company_name": ["company_name", "company", "company name", "firm", "business", "organization"],
    "source": ["source", "lead source", "channel"],
    "industry": ["industry", "sector", "category", "type", "business type"],
    "city": ["city", "location", "place", "area"],
    "notes": ["notes", "note", "remarks", "comment", "comments", "description"],
    "email": ["email", "e-mail", "email address", "mail"],
    "designation": ["designation", "title", "role", "position", "job title"],
    "address": ["address", "full address", "street"],
    "state": ["state", "province", "region"],
    "pincode": ["pincode", "pin code", "zip", "zip code", "postal code"],
    "website": ["website", "url", "web"],
    "rating": ["rating", "ratings", "total reviews", "reviews"],
    "google_maps_link": ["google maps link", "maps link", "google maps url", "maps url"],
}


def _parse_csv_rows(text: str, assigned_to, user_id: str):
    reader = csv.DictReader(io.StringIO(text))
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    skipped = 0
    errors = []
    leads_to_insert = []
    for idx, row in enumerate(reader, start=2):
        name = _get_csv_field(row, *KNOWN_CSV_FIELDS["full_name"])
        phone = _get_csv_field(row, *KNOWN_CSV_FIELDS["phone_number"])
        if not name or not phone:
            skipped += 1
            errors.append(f"Row {idx}: missing name or phone")
            continue
        lead = {
            "id": str(uuid.uuid4()),
            "full_name": name,
            "phone_number": phone,
            "alternate_phone": _get_csv_field(row, *KNOWN_CSV_FIELDS["alternate_phone"]) or None,
            "company_name": _get_csv_field(row, *KNOWN_CSV_FIELDS["company_name"]) or None,
            "source": _get_csv_field(row, *KNOWN_CSV_FIELDS["source"]) or "direct",
            "industry": _get_csv_field(row, *KNOWN_CSV_FIELDS["industry"]) or None,
            "city": _get_csv_field(row, *KNOWN_CSV_FIELDS["city"]) or None,
            "status": "new",
            "assigned_to": assigned_to,
            "notes": _get_csv_field(row, *KNOWN_CSV_FIELDS["notes"]) or None,
            "email": _get_csv_field(row, *KNOWN_CSV_FIELDS["email"]) or None,
            "designation": _get_csv_field(row, *KNOWN_CSV_FIELDS["designation"]) or None,
            "address": _get_csv_field(row, *KNOWN_CSV_FIELDS["address"]) or None,
            "state": _get_csv_field(row, *KNOWN_CSV_FIELDS["state"]) or None,
            "pincode": _get_csv_field(row, *KNOWN_CSV_FIELDS["pincode"]) or None,
            "website": _get_csv_field(row, *KNOWN_CSV_FIELDS["website"]) or None,
            "rating": _get_csv_field(row, *KNOWN_CSV_FIELDS["rating"]) or None,
            "google_maps_link": _get_csv_field(row, *KNOWN_CSV_FIELDS["google_maps_link"]) or None,
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
        }
        # Store any extra columns not matched above
        lower_map = {k.strip().lower(): k for k in row.keys() if k}
        matched_lower = set()
        for aliases in KNOWN_CSV_FIELDS.values():
            for a in aliases:
                matched_lower.add(a.lower())
        extra = {}
        for lk, orig_k in lower_map.items():
            if lk not in matched_lower and row[orig_k] and row[orig_k].strip():
                extra[orig_k.strip()] = row[orig_k].strip()
        if extra:
            lead["extra_fields"] = extra
        leads_to_insert.append(lead)
        created += 1
    return leads_to_insert, created, skipped, errors


@api_router.post("/leads/upload-csv")
async def upload_leads_csv(request: Request, file: UploadFile = File(...), assigned_to: Optional[str] = Form(None)):
    user = await require_admin(request)
    contents = await file.read()
    text = contents.decode("utf-8-sig")
    leads_to_insert, created, skipped, errors = _parse_csv_rows(text, assigned_to or None, user["id"])
    if leads_to_insert:
        await db.leads.insert_many(leads_to_insert)
    return {"created": created, "skipped": skipped, "errors": errors[:20]}


@api_router.post("/leads/upload-csv-text")
async def upload_leads_csv_text(request: Request):
    user = await require_admin(request)
    body = await request.json()
    csv_text = body.get("csv_text", "")
    assigned_to = body.get("assigned_to") or None
    if not csv_text.strip():
        raise HTTPException(400, "No CSV text provided")
    text = csv_text.lstrip("\ufeff")
    leads_to_insert, created, skipped, errors = _parse_csv_rows(text, assigned_to, user["id"])
    if leads_to_insert:
        await db.leads.insert_many(leads_to_insert)
    return {"created": created, "skipped": skipped, "errors": errors[:20]}


@api_router.post("/leads/bulk-assign")
async def bulk_assign_leads(request: Request):
    await require_admin(request)
    body = await request.json()
    lead_ids = body.get("lead_ids", [])
    assigned_to = body.get("assigned_to")
    if not lead_ids or not assigned_to:
        raise HTTPException(400, "lead_ids and assigned_to are required")
    target = await db.users.find_one({"id": assigned_to})
    if not target:
        raise HTTPException(404, "Target user not found")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_many(
        {"id": {"$in": lead_ids}},
        {"$set": {"assigned_to": assigned_to, "updated_at": now}}
    )
    return {"updated": result.modified_count}

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, request: Request):
    await get_current_user(request)
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    if lead.get("assigned_to"):
        u = await db.users.find_one({"id": lead["assigned_to"]}, {"_id": 0, "password_hash": 0})
        lead["assigned_user"] = u
    lead["call_sessions"] = await db.call_sessions.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    lead["notes_list"] = await db.lead_notes.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    # Batch enrich notes with user names
    note_user_ids = list({n.get("user_id") for n in lead["notes_list"] if n.get("user_id")})
    note_users_map = {}
    if note_user_ids:
        note_users = await db.users.find({"id": {"$in": note_user_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        note_users_map = {u["id"]: u["full_name"] for u in note_users}
    for n in lead["notes_list"]:
        n["user_name"] = note_users_map.get(n.get("user_id"), "Unknown")
    lead["follow_ups"] = await db.follow_ups.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("follow_up_at", -1).to_list(50)
    session_ids = [s["id"] for s in lead["call_sessions"]]
    lead["recordings"] = []
    if session_ids:
        lead["recordings"] = await db.call_recordings.find(
            {"call_session_id": {"$in": session_ids}}, {"_id": 0, "base64_data": 0}
        ).to_list(50)
    return lead

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, req: LeadUpdate, request: Request):
    await get_current_user(request)
    update = {k: v for k, v in req.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"id": lead_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, request: Request):
    await require_admin(request)
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Lead not found")
    await db.call_sessions.delete_many({"lead_id": lead_id})
    await db.lead_notes.delete_many({"lead_id": lead_id})
    await db.follow_ups.delete_many({"lead_id": lead_id})
    return {"message": "Lead deleted"}


@api_router.post("/leads/bulk-delete")
async def bulk_delete_leads(request: Request):
    await require_admin(request)
    body = await request.json()
    lead_ids = body.get("lead_ids", [])
    if not lead_ids:
        raise HTTPException(400, "No lead IDs provided")
    result = await db.leads.delete_many({"id": {"$in": lead_ids}})
    await db.call_sessions.delete_many({"lead_id": {"$in": lead_ids}})
    await db.lead_notes.delete_many({"lead_id": {"$in": lead_ids}})
    await db.follow_ups.delete_many({"lead_id": {"$in": lead_ids}})
    return {"deleted": result.deleted_count}


@api_router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    status = body.get("status")
    valid = ["new", "contacted", "interested", "follow_up", "won", "lost"]
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid}")
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Status updated", "status": status}


# ─── Call Sessions Routes ────────────────────────────────────────────
@api_router.post("/call-sessions")
async def create_call_session(req: CallSessionCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    session = {
        "id": str(uuid.uuid4()),
        "lead_id": req.lead_id,
        "user_id": user["id"],
        "dialed_number": req.dialed_number,
        "call_started_at": now,
        "call_ended_at": None,
        "duration_seconds": None,
        "outcome": None,
        "call_notes": None,
        "next_follow_up_at": None,
        "recording_status": "pending",
        "created_at": now
    }
    await db.call_sessions.insert_one(session)
    session.pop("_id", None)
    await db.leads.update_one(
        {"id": req.lead_id},
        {"$set": {"status": "contacted", "updated_at": now}}
    )
    return session

@api_router.get("/call-sessions")
async def list_call_sessions(
    request: Request,
    user_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    outcome: Optional[str] = None,
    limit: int = 50, skip: int = 0
):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "sales":
        query["user_id"] = user["id"]
    elif user_id:
        query["user_id"] = user_id
    if lead_id:
        query["lead_id"] = lead_id
    if outcome:
        query["outcome"] = outcome
    sessions = await db.call_sessions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    # Batch enrich
    lead_ids = list({s.get("lead_id") for s in sessions if s.get("lead_id")})
    user_ids = list({s.get("user_id") for s in sessions if s.get("user_id")})
    leads_map = {}
    if lead_ids:
        leads_list = await db.leads.find({"id": {"$in": lead_ids}}, {"_id": 0, "id": 1, "full_name": 1, "phone_number": 1}).to_list(100)
        leads_map = {l["id"]: l for l in leads_list}
    users_map = {}
    if user_ids:
        users_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        users_map = {u["id"]: u["full_name"] for u in users_list}
    for s in sessions:
        lead = leads_map.get(s.get("lead_id"), {})
        s["lead_name"] = lead.get("full_name", "Unknown")
        s["lead_phone"] = lead.get("phone_number", "")
        s["user_name"] = users_map.get(s.get("user_id"), "Unknown")
    total = await db.call_sessions.count_documents(query)
    return {"sessions": sessions, "total": total}

@api_router.put("/call-sessions/{session_id}")
async def update_call_session(session_id: str, req: CallSessionUpdate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update = {"call_ended_at": now}
    if req.outcome:
        update["outcome"] = req.outcome
    if req.duration_seconds is not None:
        update["duration_seconds"] = req.duration_seconds
    if req.call_notes:
        update["call_notes"] = req.call_notes
    if req.next_follow_up_at:
        update["next_follow_up_at"] = req.next_follow_up_at
    await db.call_sessions.update_one({"id": session_id}, {"$set": update})
    session = await db.call_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    if req.lead_status:
        await db.leads.update_one(
            {"id": session["lead_id"]},
            {"$set": {"status": req.lead_status, "updated_at": now}}
        )
    if req.next_follow_up_at:
        await db.follow_ups.insert_one({
            "id": str(uuid.uuid4()), "lead_id": session["lead_id"],
            "call_session_id": session_id, "assigned_to": user["id"],
            "follow_up_at": req.next_follow_up_at, "follow_up_type": "call",
            "status": "pending", "note": req.call_notes,
            "created_at": now, "updated_at": now
        })
    if req.call_notes:
        await db.lead_notes.insert_one({
            "id": str(uuid.uuid4()), "lead_id": session["lead_id"],
            "user_id": user["id"], "note_text": f"Call note: {req.call_notes}",
            "created_at": now
        })
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "entity_type": "call_session", "entity_id": session_id,
        "action": "updated", "meta_json": {"outcome": req.outcome},
        "created_at": now
    })
    return await db.call_sessions.find_one({"id": session_id}, {"_id": 0})


# ─── Follow-ups Routes ──────────────────────────────────────────────
@api_router.get("/follow-ups")
async def list_follow_ups(
    request: Request,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    tab: Optional[str] = None,
    limit: int = 50, skip: int = 0
):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "sales":
        query["assigned_to"] = user["id"]
    elif assigned_to:
        query["assigned_to"] = assigned_to
    if status:
        query["status"] = status
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    if tab == "overdue":
        query["follow_up_at"] = {"$lt": today_start}
        query["status"] = "pending"
    elif tab == "today":
        query["follow_up_at"] = {"$gte": today_start, "$lte": today_end}
    elif tab == "upcoming":
        query["follow_up_at"] = {"$gt": today_end}
        if "status" not in query:
            query["status"] = {"$ne": "cancelled"}
    follow_ups = await db.follow_ups.find(query, {"_id": 0}).sort("follow_up_at", 1).skip(skip).limit(limit).to_list(limit)
    # Batch enrich
    lead_ids = list({f.get("lead_id") for f in follow_ups if f.get("lead_id")})
    user_ids = list({f.get("assigned_to") for f in follow_ups if f.get("assigned_to")})
    leads_map = {}
    if lead_ids:
        leads_list = await db.leads.find({"id": {"$in": lead_ids}}, {"_id": 0, "id": 1, "full_name": 1, "phone_number": 1}).to_list(100)
        leads_map = {l["id"]: l for l in leads_list}
    users_map = {}
    if user_ids:
        users_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        users_map = {u["id"]: u["full_name"] for u in users_list}
    for f in follow_ups:
        lead = leads_map.get(f.get("lead_id"), {})
        f["lead_name"] = lead.get("full_name", "Unknown")
        f["lead_phone"] = lead.get("phone_number", "")
        f["assigned_name"] = users_map.get(f.get("assigned_to"), "Unknown")
    total = await db.follow_ups.count_documents(query)
    return {"follow_ups": follow_ups, "total": total}

@api_router.post("/follow-ups")
async def create_follow_up(req: FollowUpCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    follow_up = {
        "id": str(uuid.uuid4()), "lead_id": req.lead_id,
        "call_session_id": req.call_session_id, "assigned_to": user["id"],
        "follow_up_at": req.follow_up_at, "follow_up_type": req.follow_up_type,
        "status": "pending", "note": req.note,
        "created_at": now, "updated_at": now
    }
    await db.follow_ups.insert_one(follow_up)
    follow_up.pop("_id", None)
    await db.leads.update_one(
        {"id": req.lead_id},
        {"$set": {"status": "follow_up", "updated_at": now}}
    )
    return follow_up

@api_router.patch("/follow-ups/{follow_up_id}/status")
async def update_follow_up_status(follow_up_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    status = body.get("status")
    if status not in ["pending", "done", "missed", "cancelled"]:
        raise HTTPException(400, "Invalid status")
    await db.follow_ups.update_one(
        {"id": follow_up_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Status updated"}

@api_router.put("/follow-ups/{follow_up_id}")
async def update_follow_up(follow_up_id: str, req: FollowUpUpdate, request: Request):
    await get_current_user(request)
    update = {k: v for k, v in req.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.follow_ups.update_one({"id": follow_up_id}, {"$set": update})
    return await db.follow_ups.find_one({"id": follow_up_id}, {"_id": 0})


# ─── Lead Notes Routes ──────────────────────────────────────────────
@api_router.get("/lead-notes/{lead_id}")
async def get_lead_notes(lead_id: str, request: Request):
    await get_current_user(request)
    notes = await db.lead_notes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    user_ids = list({n.get("user_id") for n in notes if n.get("user_id")})
    users_map = {}
    if user_ids:
        users_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        users_map = {u["id"]: u["full_name"] for u in users_list}
    for n in notes:
        n["user_name"] = users_map.get(n.get("user_id"), "Unknown")
    return notes

@api_router.post("/lead-notes")
async def create_lead_note(req: LeadNoteCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    note = {
        "id": str(uuid.uuid4()), "lead_id": req.lead_id,
        "user_id": user["id"], "note_text": req.note_text, "created_at": now
    }
    await db.lead_notes.insert_one(note)
    note.pop("_id", None)
    return note


# ─── Recordings Routes ──────────────────────────────────────────────
@api_router.get("/recordings")
async def list_recordings(
    request: Request,
    upload_status: Optional[str] = None,
    limit: int = 50, skip: int = 0
):
    await get_current_user(request)
    query = {}
    if upload_status:
        query["upload_status"] = upload_status
    recordings = await db.call_recordings.find(
        query, {"_id": 0, "base64_data": 0}
    ).sort("uploaded_at", -1).skip(skip).limit(limit).to_list(limit)
    # Batch enrich
    session_ids = list({r.get("call_session_id") for r in recordings if r.get("call_session_id")})
    sessions_map = {}
    if session_ids:
        sessions_list = await db.call_sessions.find({"id": {"$in": session_ids}}, {"_id": 0}).to_list(100)
        sessions_map = {s["id"]: s for s in sessions_list}
    lead_ids = list({s.get("lead_id") for s in sessions_map.values() if s.get("lead_id")})
    user_ids = list({s.get("user_id") for s in sessions_map.values() if s.get("user_id")})
    leads_map = {}
    if lead_ids:
        leads_list = await db.leads.find({"id": {"$in": lead_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        leads_map = {l["id"]: l["full_name"] for l in leads_list}
    users_map = {}
    if user_ids:
        users_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
        users_map = {u["id"]: u["full_name"] for u in users_list}
    for r in recordings:
        session = sessions_map.get(r.get("call_session_id"), {})
        r["user_id"] = session.get("user_id")
        r["lead_id"] = session.get("lead_id")
        r["outcome"] = session.get("outcome")
        r["duration_seconds"] = session.get("duration_seconds")
        r["call_started_at"] = session.get("call_started_at")
        r["lead_name"] = leads_map.get(session.get("lead_id"), "Unknown")
        r["user_name"] = users_map.get(session.get("user_id"), "Unknown")
    total = await db.call_recordings.count_documents(query)
    return {"recordings": recordings, "total": total}

@api_router.post("/recordings/upload")
async def upload_recording(
    request: Request,
    call_session_id: str = Form(...),
    file: UploadFile = File(...)
):
    await get_current_user(request)
    contents = await file.read()
    b64 = base64.b64encode(contents).decode('utf-8')
    now = datetime.now(timezone.utc).isoformat()
    recording = {
        "id": str(uuid.uuid4()), "call_session_id": call_session_id,
        "file_name": file.filename, "local_file_path": None,
        "storage_url": None, "base64_data": b64,
        "mime_type": file.content_type or "audio/mpeg",
        "file_size_bytes": len(contents),
        "matched_at": now, "uploaded_at": now, "upload_status": "uploaded"
    }
    await db.call_recordings.insert_one(recording)
    recording.pop("_id", None)
    recording.pop("base64_data", None)
    await db.call_sessions.update_one(
        {"id": call_session_id}, {"$set": {"recording_status": "uploaded"}}
    )
    return recording

@api_router.post("/recordings/upload-base64")
async def upload_recording_base64(request: Request):
    await get_current_user(request)
    body = await request.json()
    call_session_id = body.get("call_session_id")
    file_name = body.get("file_name", "recording.mp3")
    file_data = body.get("file_data", "")
    content_type = body.get("content_type", "audio/mpeg")
    if not call_session_id or not file_data:
        raise HTTPException(400, "call_session_id and file_data are required")
    contents = base64.b64decode(file_data)
    now = datetime.now(timezone.utc).isoformat()
    recording = {
        "id": str(uuid.uuid4()), "call_session_id": call_session_id,
        "file_name": file_name, "local_file_path": None,
        "storage_url": None, "base64_data": file_data,
        "mime_type": content_type,
        "file_size_bytes": len(contents),
        "matched_at": now, "uploaded_at": now, "upload_status": "uploaded"
    }
    await db.call_recordings.insert_one(recording)
    recording.pop("_id", None)
    recording.pop("base64_data", None)
    await db.call_sessions.update_one(
        {"id": call_session_id}, {"$set": {"recording_status": "uploaded"}}
    )
    return recording


@api_router.get("/recordings/{recording_id}/audio")
async def get_recording_audio(recording_id: str):
    recording = await db.call_recordings.find_one({"id": recording_id})
    if not recording or not recording.get("base64_data"):
        raise HTTPException(404, "Recording not found")
    audio_bytes = base64.b64decode(recording["base64_data"])
    return Response(
        content=audio_bytes,
        media_type=recording.get("mime_type", "audio/mpeg"),
        headers={"Content-Disposition": f'inline; filename="{recording.get("file_name", "recording.mp3")}"'}
    )


# ─── Dashboard Routes ───────────────────────────────────────────────
@api_router.get("/dashboard/sales")
async def sales_dashboard(request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    return {
        "calls_today": await db.call_sessions.count_documents({
            "user_id": user["id"], "created_at": {"$gte": today_start, "$lte": today_end}
        }),
        "follow_ups_due": await db.follow_ups.count_documents({
            "assigned_to": user["id"], "status": "pending",
            "follow_up_at": {"$lte": today_end}
        }),
        "assigned_leads": await db.leads.count_documents({"assigned_to": user["id"]}),
        "pending_recordings": await db.call_sessions.count_documents({
            "user_id": user["id"], "recording_status": "pending"
        })
    }

@api_router.get("/dashboard/admin")
async def admin_dashboard(request: Request):
    await require_admin(request)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    sales_users = await db.users.find({"role": "sales"}, {"_id": 0, "password_hash": 0}).to_list(50)
    performance = []
    for su in sales_users:
        performance.append({
            "user_id": su["id"], "full_name": su["full_name"],
            "calls_today": await db.call_sessions.count_documents({
                "user_id": su["id"], "created_at": {"$gte": today_start, "$lte": today_end}
            }),
            "total_leads": await db.leads.count_documents({"assigned_to": su["id"]}),
            "connected_calls": await db.call_sessions.count_documents({
                "user_id": su["id"], "outcome": "connected"
            })
        })
    return {
        "total_calls_today": await db.call_sessions.count_documents({
            "created_at": {"$gte": today_start, "$lte": today_end}
        }),
        "connected_calls_today": await db.call_sessions.count_documents({
            "outcome": "connected", "created_at": {"$gte": today_start, "$lte": today_end}
        }),
        "total_leads": await db.leads.count_documents({}),
        "pending_follow_ups": await db.follow_ups.count_documents({"status": "pending"}),
        "uploaded_recordings": await db.call_recordings.count_documents({"upload_status": "uploaded"}),
        "salesperson_performance": performance
    }


# ─── Startup & Seeding ──────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.leads.create_index("id", unique=True)
    await db.leads.create_index("assigned_to")
    await db.call_sessions.create_index("id", unique=True)
    await db.call_sessions.create_index("lead_id")
    await db.call_sessions.create_index("user_id")
    await db.follow_ups.create_index("id", unique=True)
    await db.follow_ups.create_index("assigned_to")
    await db.lead_notes.create_index("lead_id")
    await db.call_recordings.create_index("call_session_id")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@salescrm.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "full_name": "Admin User",
            "email": admin_email, "phone": None, "role": "admin",
            "is_active": True, "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")

    # Ensure abhinavsolanki008@gmail.com is admin
    abhinav = await db.users.find_one({"email": "abhinavsolanki008@gmail.com"})
    if abhinav and abhinav.get("role") != "admin":
        await db.users.update_one({"email": "abhinavsolanki008@gmail.com"}, {"$set": {"role": "admin"}})
        logger.info("Promoted abhinavsolanki008@gmail.com to admin")

    # Seed sales users
    for name, email in [("Rahul Sharma", "rahul@salescrm.com"), ("Priya Patel", "priya@salescrm.com")]:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "full_name": name,
                "email": email, "phone": None, "role": "sales",
                "is_active": True, "password_hash": hash_password("sales123"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Sales user seeded: {email}")

    # Seed sample leads
    if await db.leads.count_documents({}) == 0:
        sales_users = await db.users.find({"role": "sales"}, {"_id": 0}).to_list(10)
        if sales_users:
            samples = [
                ("Amit Kumar", "+919876543210", "Tech Solutions", "Mumbai", "website", "Technology"),
                ("Sneha Reddy", "+919876543211", "Digital Mart", "Hyderabad", "referral", "E-commerce"),
                ("Vikram Singh", "+919876543212", "BuildCo", "Delhi", "cold_call", "Construction"),
                ("Anita Desai", "+919876543213", "Green Energy", "Pune", "website", "Energy"),
                ("Rajesh Nair", "+919876543214", "Marine Exports", "Kochi", "trade_show", "Logistics"),
            ]
            statuses = ["new", "contacted", "interested", "follow_up", "new"]
            now = datetime.now(timezone.utc).isoformat()
            for idx, (name, phone, company, city, source, industry) in enumerate(samples):
                assigned = sales_users[idx % len(sales_users)]
                await db.leads.insert_one({
                    "id": str(uuid.uuid4()), "full_name": name,
                    "phone_number": phone, "alternate_phone": None,
                    "company_name": company, "source": source,
                    "industry": industry,
                    "status": statuses[idx], "assigned_to": assigned["id"],
                    "city": city, "notes": None, "created_by": assigned["id"],
                    "created_at": now, "updated_at": now
                })
            logger.info("Sample leads seeded")

    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ─── Wire up ─────────────────────────────────────────────────────────
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=("*" not in ALLOWED_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)

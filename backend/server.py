from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, File, UploadFile, Form
from fastapi.responses import Response
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
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'sales_crm')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'default-dev-jwt-secret')
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Sales CRM API")
api_router = APIRouter(prefix="/api")

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

class LeadCreate(BaseModel):
    full_name: str
    phone_number: str
    alternate_phone: Optional[str] = None
    company_name: Optional[str] = None
    source: str = "direct"
    city: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    alternate_phone: Optional[str] = None
    company_name: Optional[str] = None
    source: Optional[str] = None
    city: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

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

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)


# ─── Users Routes ────────────────────────────────────────────────────
@api_router.get("/users")
async def list_users(request: Request):
    await get_current_user(request)
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)

@api_router.get("/users/sales")
async def list_sales_users(request: Request):
    await get_current_user(request)
    return await db.users.find({"role": "sales"}, {"_id": 0, "password_hash": 0}).to_list(100)


# ─── Leads Routes ────────────────────────────────────────────────────
@api_router.get("/leads")
async def list_leads(
    request: Request,
    status: Optional[str] = None,
    source: Optional[str] = None,
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
    if assigned_to and user["role"] == "admin":
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}}
        ]
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.leads.count_documents(query)
    # Enrich with assigned user name
    for lead in leads:
        if lead.get("assigned_to"):
            u = await db.users.find_one({"id": lead["assigned_to"]}, {"_id": 0, "full_name": 1})
            lead["assigned_name"] = u["full_name"] if u else "Unassigned"
        # Get last call date
        last_call = await db.call_sessions.find_one(
            {"lead_id": lead["id"]}, {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        lead["last_call_date"] = last_call["created_at"] if last_call else None
        # Get next follow-up
        next_fu = await db.follow_ups.find_one(
            {"lead_id": lead["id"], "status": "pending"}, {"_id": 0, "follow_up_at": 1},
            sort=[("follow_up_at", 1)]
        )
        lead["next_follow_up"] = next_fu["follow_up_at"] if next_fu else None
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
    for n in lead["notes_list"]:
        u = await db.users.find_one({"id": n.get("user_id")}, {"_id": 0, "full_name": 1})
        n["user_name"] = u["full_name"] if u else "Unknown"
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
    for s in sessions:
        lead = await db.leads.find_one({"id": s.get("lead_id")}, {"_id": 0, "full_name": 1, "phone_number": 1})
        s["lead_name"] = lead["full_name"] if lead else "Unknown"
        s["lead_phone"] = lead["phone_number"] if lead else ""
        u = await db.users.find_one({"id": s.get("user_id")}, {"_id": 0, "full_name": 1})
        s["user_name"] = u["full_name"] if u else "Unknown"
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
    for f in follow_ups:
        lead = await db.leads.find_one({"id": f.get("lead_id")}, {"_id": 0, "full_name": 1, "phone_number": 1})
        f["lead_name"] = lead["full_name"] if lead else "Unknown"
        f["lead_phone"] = lead["phone_number"] if lead else ""
        u = await db.users.find_one({"id": f.get("assigned_to")}, {"_id": 0, "full_name": 1})
        f["assigned_name"] = u["full_name"] if u else "Unknown"
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
    for n in notes:
        u = await db.users.find_one({"id": n.get("user_id")}, {"_id": 0, "full_name": 1})
        n["user_name"] = u["full_name"] if u else "Unknown"
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
    for r in recordings:
        session = await db.call_sessions.find_one({"id": r.get("call_session_id")}, {"_id": 0})
        if session:
            r["user_id"] = session.get("user_id")
            r["lead_id"] = session.get("lead_id")
            r["outcome"] = session.get("outcome")
            r["duration_seconds"] = session.get("duration_seconds")
            r["call_started_at"] = session.get("call_started_at")
            lead = await db.leads.find_one({"id": session.get("lead_id")}, {"_id": 0, "full_name": 1})
            r["lead_name"] = lead["full_name"] if lead else "Unknown"
            u = await db.users.find_one({"id": session.get("user_id")}, {"_id": 0, "full_name": 1})
            r["user_name"] = u["full_name"] if u else "Unknown"
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
                ("Amit Kumar", "+919876543210", "Tech Solutions", "Mumbai", "website"),
                ("Sneha Reddy", "+919876543211", "Digital Mart", "Hyderabad", "referral"),
                ("Vikram Singh", "+919876543212", "BuildCo", "Delhi", "cold_call"),
                ("Anita Desai", "+919876543213", "Green Energy", "Pune", "website"),
                ("Rajesh Nair", "+919876543214", "Marine Exports", "Kochi", "trade_show"),
            ]
            statuses = ["new", "contacted", "interested", "follow_up", "new"]
            now = datetime.now(timezone.utc).isoformat()
            for idx, (name, phone, company, city, source) in enumerate(samples):
                assigned = sales_users[idx % len(sales_users)]
                await db.leads.insert_one({
                    "id": str(uuid.uuid4()), "full_name": name,
                    "phone_number": phone, "alternate_phone": None,
                    "company_name": company, "source": source,
                    "status": statuses[idx], "assigned_to": assigned["id"],
                    "city": city, "notes": None, "created_by": assigned["id"],
                    "created_at": now, "updated_at": now
                })
            logger.info("Sample leads seeded")

    # Write test credentials
    creds_path = Path("/app/memory")
    creds_path.mkdir(parents=True, exist_ok=True)
    with open(creds_path / "test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin\n- Email: admin@salescrm.com\n- Password: admin123\n- Role: admin\n\n")
        f.write("## Sales User 1\n- Email: rahul@salescrm.com\n- Password: sales123\n- Role: sales\n\n")
        f.write("## Sales User 2\n- Email: priya@salescrm.com\n- Password: sales123\n- Role: sales\n\n")
        f.write("## API Endpoints\n- POST /api/auth/login\n- GET /api/auth/me\n- GET /api/leads\n- POST /api/leads\n")
        f.write("- GET /api/leads/{id}\n- PUT /api/leads/{id}\n- POST /api/call-sessions\n- PUT /api/call-sessions/{id}\n")
        f.write("- GET /api/follow-ups\n- POST /api/follow-ups\n- GET /api/dashboard/sales\n- GET /api/dashboard/admin\n")

    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ─── Wire up ─────────────────────────────────────────────────────────
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

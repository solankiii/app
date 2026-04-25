"""One-shot script to mirror production MongoDB data into the staging database.

Reads from `sales_crm`, writes into `ahm_crm_staging` on the SAME Atlas cluster.

Usage (from d:/app/backend):
    # Set MONGO_URL to the same connection string Render uses for the prod service.
    # Find it in: Render dashboard -> ahm-crm-backend (prod) -> Environment -> MONGO_URL.
    export MONGO_URL="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority"

    # Then:
    python scripts/copy_prod_to_staging.py

Behavior:
- Wipes each target collection in `ahm_crm_staging` before copying so it's a clean mirror.
- Copies these collections only (skips indexes — they're recreated by the staging app on next restart):
    users, leads, call_sessions, follow_ups, lead_notes, call_recordings, lead_activities,
    password_resets, leads_csv_uploads
- Refuses to run if SOURCE_DB == TARGET_DB.
"""
import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

SOURCE_DB = "sales_crm"
TARGET_DB = "ahm_crm_staging"

COLLECTIONS = [
    "users",
    "leads",
    "call_sessions",
    "follow_ups",
    "lead_notes",
    "call_recordings",
    "lead_activities",
    "password_resets",
    "leads_csv_uploads",
]


async def copy_collection(src, dst, name: str) -> int:
    src_col = src[name]
    dst_col = dst[name]
    docs = await src_col.find({}).to_list(length=None)
    if not docs:
        print(f"  [{name}] source empty — skipping")
        return 0
    # Wipe target so this is a clean mirror, not an append.
    await dst_col.delete_many({})
    await dst_col.insert_many(docs)
    print(f"  [{name}] copied {len(docs)} doc(s)")
    return len(docs)


async def main() -> int:
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("ERROR: MONGO_URL env var not set", file=sys.stderr)
        return 2
    if SOURCE_DB == TARGET_DB:
        print(f"ERROR: SOURCE_DB and TARGET_DB are both '{SOURCE_DB}' — refusing to run", file=sys.stderr)
        return 2

    client = AsyncIOMotorClient(mongo_url)
    src = client[SOURCE_DB]
    dst = client[TARGET_DB]

    print(f"Copying {SOURCE_DB} -> {TARGET_DB}")
    print(f"Cluster: {mongo_url.split('@')[-1].split('/')[0] if '@' in mongo_url else 'local'}")
    print()

    total = 0
    for name in COLLECTIONS:
        try:
            total += await copy_collection(src, dst, name)
        except Exception as e:
            print(f"  [{name}] FAILED: {e}", file=sys.stderr)

    print()
    print(f"Done. {total} document(s) total mirrored into {TARGET_DB}.")
    print(f"Demo logins on staging now use the same credentials as production.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

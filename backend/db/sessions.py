"""
Supabase-backed session and chat history storage.

Tables (create once in Supabase SQL editor):
    CREATE TABLE sessions (
        session_id  TEXT PRIMARY KEY,
        video_id    TEXT NOT NULL,
        video_title TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE messages (
        id          BIGSERIAL PRIMARY KEY,
        session_id  TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
        role        TEXT NOT NULL,
        content     TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX messages_session_idx ON messages(session_id, created_at);
"""
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Client | None = None


def _get_client() -> Client:
    """Lazily initialise the Supabase client (singleton)."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in your .env"
            )
        clean_url = SUPABASE_URL.strip().rstrip("/")
        if clean_url.endswith("/rest/v1"):
            clean_url = clean_url[:-len("/rest/v1")].rstrip("/")
        _client = create_client(clean_url, SUPABASE_SERVICE_KEY)
    return _client


async def init_db():
    """No-op: tables are pre-created in Supabase. Kept for API compatibility."""
    pass


async def create_session(video_id: str, video_title: str = "") -> str:
    """Insert a new chat session row and return its UUID."""
    client = _get_client()
    session_id = str(uuid.uuid4())
    client.table("sessions").insert(
        {
            "session_id": session_id,
            "video_id": video_id,
            "video_title": video_title,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()
    return session_id


async def save_message(session_id: str, role: str, content: str):
    """Persist a single chat message."""
    client = _get_client()
    client.table("messages").insert(
        {
            "session_id": session_id,
            "role": role,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()


async def get_history(session_id: str, limit: int = 12) -> List[Dict]:
    """Return the last `limit` messages for a session in chronological order."""
    client = _get_client()
    response = (
        client.table("messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    rows = response.data or []
    return [{"role": r["role"], "content": r["content"]} for r in rows]


async def list_sessions(limit: int = 50) -> List[Dict]:
    """Return recent sessions with message counts, newest first."""
    client = _get_client()

    # Fetch sessions
    sessions_resp = (
        client.table("sessions")
        .select("session_id, video_id, video_title, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    sessions = sessions_resp.data or []

    if not sessions:
        return []

    # Fetch message counts for those sessions in a single query
    session_ids = [s["session_id"] for s in sessions]
    counts_resp = (
        client.table("messages")
        .select("session_id")
        .in_("session_id", session_ids)
        .execute()
    )
    counts_raw = counts_resp.data or []

    # Build a count map
    count_map: Dict[str, int] = {}
    for row in counts_raw:
        sid = row["session_id"]
        count_map[sid] = count_map.get(sid, 0) + 1

    return [
        {
            "session_id": s["session_id"],
            "video_id": s["video_id"],
            "video_title": s["video_title"],
            "created_at": s["created_at"],
            "message_count": count_map.get(s["session_id"], 0),
        }
        for s in sessions
    ]

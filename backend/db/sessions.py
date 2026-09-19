"""SQLite-backed session and chat history storage."""
import os
import uuid
import json
import aiosqlite
from datetime import datetime
from typing import List, Dict, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "chatbot.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                video_title TEXT,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            )
        """)
        await db.commit()


async def create_session(video_id: str, video_title: str = "") -> str:
    session_id = str(uuid.uuid4())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO sessions (session_id, video_id, video_title, created_at) VALUES (?, ?, ?, ?)",
            (session_id, video_id, video_title, datetime.utcnow().isoformat()),
        )
        await db.commit()
    return session_id


async def save_message(session_id: str, role: str, content: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, content, datetime.utcnow().isoformat()),
        )
        await db.commit()


async def get_history(session_id: str, limit: int = 12) -> List[Dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
    # Return in chronological order
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]


async def list_sessions(limit: int = 50) -> List[Dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """
            SELECT s.session_id, s.video_id, s.video_title, s.created_at,
                   COUNT(m.id) as message_count
            FROM sessions s
            LEFT JOIN messages m ON s.session_id = m.session_id
            GROUP BY s.session_id
            ORDER BY s.created_at DESC
            LIMIT ?
            """,
            (limit,),
        ) as cursor:
            rows = await cursor.fetchall()
    return [
        {
            "session_id": r[0],
            "video_id": r[1],
            "video_title": r[2],
            "created_at": r[3],
            "message_count": r[4],
        }
        for r in rows
    ]

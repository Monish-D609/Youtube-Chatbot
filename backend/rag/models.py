"""Pydantic models / schemas for the YT Chatbot API."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class IngestRequest(BaseModel):
    video_id: str = Field(..., description="YouTube video ID (11-char string)")
    force_reindex: bool = Field(False, description="Force re-embedding even if already indexed")


class IngestResponse(BaseModel):
    video_id: str
    title: str
    channel: str
    duration_seconds: int
    chunk_count: int
    already_indexed: bool
    thumbnail_url: str
    chapters: List[dict]


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    video_id: str
    question: str
    session_id: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list)


class SourceChunk(BaseModel):
    text: str
    start_time: Optional[float] = None  # seconds
    timestamp_label: Optional[str] = None  # "04:23"


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    session_id: str


class VideoInfo(BaseModel):
    video_id: str
    title: str
    channel: str
    duration_seconds: int
    thumbnail_url: str
    chapters: List[dict]
    indexed: bool


class SessionSummary(BaseModel):
    session_id: str
    video_id: str
    video_title: str
    created_at: datetime
    message_count: int

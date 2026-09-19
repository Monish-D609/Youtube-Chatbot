"""
FastAPI Application — YT Chatbot Backend
Routes:
  POST /api/ingest          — Index a YouTube video
  POST /api/chat            — Chat with a video (SSE streaming)
  GET  /api/sessions        — List all chat sessions
  GET  /api/video/{id}/info — Get video metadata + indexed status
  GET  /health              — Health check
"""
import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from rag.models import (
    IngestRequest, IngestResponse,
    ChatRequest, ChatResponse,
    VideoInfo, SessionSummary,
)
from rag.ingestion import ingest_video, is_indexed, get_video_metadata, get_stored_metadata
from rag.retrieval import retrieve, is_global_query
from rag.generation import stream_answer, generate_answer
from db.sessions import init_db, create_session, save_message, get_history, list_sessions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite DB on startup
    await init_db()
    yield


app = FastAPI(
    title="YT Chatbot API",
    version="1.0.0",
    description="Industry-standard RAG chatbot for YouTube videos",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/ingest", response_model=IngestResponse)
async def ingest(req: IngestRequest):
    """Ingest a YouTube video: fetch transcript, chunk, embed, store."""
    try:
        result = ingest_video(req.video_id, force_reindex=req.force_reindex)
        return IngestResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/video/{video_id}/info", response_model=VideoInfo)
async def video_info(video_id: str):
    """Return video metadata and indexed status."""
    indexed = is_indexed(video_id)

    if indexed:
        try:
            store = get_stored_metadata(video_id)
            return VideoInfo(
                video_id=video_id,
                title=store.get("title", f"Video {video_id}"),
                channel=store.get("channel", ""),
                duration_seconds=store.get("duration_seconds", 0),
                thumbnail_url=store.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"),
                chapters=store.get("chapters", []),
                indexed=True,
            )
        except Exception:
            pass

    meta = get_video_metadata(video_id)
    return VideoInfo(
        video_id=video_id,
        title=meta.get("title", f"Video {video_id}"),
        channel=meta.get("channel", ""),
        duration_seconds=0,
        thumbnail_url=meta.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"),
        chapters=[],
        indexed=False,
    )


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Chat endpoint with SSE streaming.
    Returns a stream of SSE events: data: {"token": "..."} and data: [DONE]
    Also includes source chunks as a final event before DONE.
    """
    # Validate video is indexed
    if not is_indexed(req.video_id):
        raise HTTPException(
            status_code=404,
            detail=f"Video {req.video_id} is not indexed. Please ingest it first.",
        )

    # Get or create session
    session_id = req.session_id
    history = req.history

    # If no session_id, create one
    if not session_id:
        try:
            store = get_stored_metadata(req.video_id)
            video_title = store.get("title", "")
        except Exception:
            video_title = ""
        session_id = await create_session(req.video_id, video_title)

    # Load history from DB if not provided in request
    if not history:
        history = await get_history(session_id)

    # Retrieve relevant chunks (global router auto-detects summary intent)
    global_query = is_global_query(req.question)
    chunks = retrieve(req.video_id, req.question, top_k=4)

    # Save user message to DB
    await save_message(session_id, "user", req.question)

    import json

    async def event_stream():
        full_answer = []
        try:
            # Stream answer tokens
            async for event in stream_answer(chunks, req.question, history, is_global=global_query):
                yield event
                if event.startswith("data: ") and not event.startswith("data: [DONE]"):
                    try:
                        token_data = json.loads(event[6:])
                        full_answer.append(token_data.get("token", ""))
                    except Exception:
                        pass

            # Emit sources as a final event before DONE
            sources = [
                {
                    "text": c["text"][:300],
                    "start_time": c.get("start_time"),
                    "timestamp_label": c.get("timestamp_label"),
                }
                for c in chunks
            ]
            yield f"data: {json.dumps({'sources': sources, 'session_id': session_id})}\n\n"

            # Persist full answer
            complete_answer = "".join(full_answer)
            if complete_answer:
                await save_message(session_id, "assistant", complete_answer)

        except Exception as e:
            err_msg = json.dumps({"token": f"\n\n*(Error generating answer: {str(e)})*"})
            yield f"data: {err_msg}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/sessions")
async def sessions():
    """List recent chat sessions."""
    return await list_sessions(limit=50)

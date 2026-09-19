"""
RAG Ingestion Pipeline — Industry-Standard YT Chatbot
- Fetches YouTube transcript with timestamps
- Chunks with overlap, preserving timestamp metadata
- Embeds via Cloudflare AI (bge-base-en-v1.5)
- Persists FAISS index + metadata JSON to disk per video
"""
import os
import json
import math
import pickle
import requests
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv()

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
import numpy as np

STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "vector_store")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")
CF_EMBED_MODEL = "@cf/baai/bge-base-en-v1.5"
EMBED_BATCH_SIZE = 100  # Cloudflare max batch

os.makedirs(STORE_PATH, exist_ok=True)


def index_path(video_id: str) -> str:
    return os.path.join(STORE_PATH, f"{video_id}.faiss")


def meta_path(video_id: str) -> str:
    return os.path.join(STORE_PATH, f"{video_id}.json")


def is_indexed(video_id: str) -> bool:
    """Check if a video is already indexed."""
    return os.path.exists(index_path(video_id)) and os.path.exists(meta_path(video_id))


def seconds_to_label(seconds: float) -> str:
    """Convert seconds to MM:SS or H:MM:SS label."""
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{sec:02d}"
    return f"{m}:{sec:02d}"


def fetch_transcript(video_id: str) -> List[Dict]:
    """Fetch YouTube transcript with timestamps, compatible with all library versions."""
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.fetch(video_id)
    except AttributeError:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

    results = []
    for seg in transcript_list:
        if isinstance(seg, dict):
            text = seg.get("text", "")
            start = seg.get("start", 0.0)
            duration = seg.get("duration", 0.0)
        else:
            text = getattr(seg, "text", "")
            start = getattr(seg, "start", 0.0)
            duration = getattr(seg, "duration", 0.0)
        results.append({"text": text, "start": float(start), "duration": float(duration)})
    return results


def chunk_transcript(segments: List[Dict], chunk_size: int = 800, overlap: int = 150) -> List[Dict]:
    """
    Chunk transcript segments into overlapping windows.
    Each chunk carries start_time from its first segment.
    """
    chunks = []
    segment_buffer = []
    current_word_count = 0

    for seg in segments:
        words = seg["text"].split()
        segment_buffer.append(seg)
        current_word_count += len(words)

        if current_word_count >= chunk_size:
            chunk_text = " ".join(s["text"] for s in segment_buffer)
            chunk_start = segment_buffer[0]["start"]
            chunks.append({
                "text": chunk_text.strip(),
                "start_time": chunk_start,
                "timestamp_label": seconds_to_label(chunk_start),
            })
            # Keep overlap
            overlap_buffer = []
            overlap_words = 0
            for s in reversed(segment_buffer):
                w = len(s["text"].split())
                if overlap_words + w <= overlap:
                    overlap_buffer.insert(0, s)
                    overlap_words += w
                else:
                    break
            segment_buffer = overlap_buffer
            current_word_count = overlap_words

    if segment_buffer:
        chunk_text = " ".join(s["text"] for s in segment_buffer)
        chunk_start = segment_buffer[0]["start"]
        if chunk_text.strip():
            chunks.append({
                "text": chunk_text.strip(),
                "start_time": chunk_start,
                "timestamp_label": seconds_to_label(chunk_start),
            })

    return chunks


def embed_texts_cloudflare(texts: List[str]) -> List[List[float]]:
    """Embed texts using Cloudflare AI REST API."""
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_EMBED_MODEL}"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json",
    }
    all_embeddings = []

    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i: i + EMBED_BATCH_SIZE]
        response = requests.post(url, headers=headers, json={"text": batch}, timeout=60)
        response.raise_for_status()
        data = response.json()
        if not data.get("success"):
            raise RuntimeError(f"Cloudflare embedding error: {data.get('errors')}")
        all_embeddings.extend(data["result"]["data"])

    return all_embeddings


def get_video_metadata(video_id: str) -> Dict:
    """Fetch video metadata from noembed."""
    try:
        oembed_url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
        resp = requests.get(oembed_url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            "title": data.get("title", f"YouTube Video {video_id}"),
            "channel": data.get("author_name", "Unknown Channel"),
            "thumbnail_url": data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"),
        }
    except Exception:
        return {
            "title": f"YouTube Video {video_id}",
            "channel": "Unknown Channel",
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        }


def estimate_duration(segments: List[Dict]) -> int:
    if not segments:
        return 0
    last = segments[-1]
    return int(last["start"] + last.get("duration", 0))


def extract_chapters(segments: List[Dict], chunk_count: int) -> List[Dict]:
    """Create synthetic chapters from transcript sections."""
    if not segments:
        return []
    total_duration = estimate_duration(segments)
    num_chapters = min(8, max(3, chunk_count // 4))
    step = total_duration / num_chapters
    chapters = []
    for i in range(num_chapters):
        start_sec = i * step
        chapters.append({
            "title": f"Section {i + 1}",
            "start_time": start_sec,
            "timestamp_label": seconds_to_label(start_sec),
        })
    return chapters


def save_faiss_index(video_id: str, embeddings: List[List[float]], chunks: List[Dict], meta: Dict):
    """Save FAISS index and metadata to disk."""
    import faiss

    vectors = np.array(embeddings, dtype=np.float32)
    dim = vectors.shape[1]

    # Normalize for cosine similarity
    faiss.normalize_L2(vectors)
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    faiss.write_index(index, index_path(video_id))

    # Save metadata
    store = {
        "video_id": video_id,
        "title": meta["title"],
        "channel": meta["channel"],
        "thumbnail_url": meta["thumbnail_url"],
        "duration_seconds": meta.get("duration_seconds", 0),
        "chunks": chunks,
        "chapters": meta.get("chapters", []),
    }
    with open(meta_path(video_id), "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def load_faiss_index(video_id: str):
    """Load FAISS index and metadata from disk."""
    import faiss

    index = faiss.read_index(index_path(video_id))
    with open(meta_path(video_id), "r", encoding="utf-8") as f:
        store = json.load(f)
    return index, store


def get_stored_metadata(video_id: str) -> Dict:
    """Get just the stored metadata without loading the full index."""
    with open(meta_path(video_id), "r", encoding="utf-8") as f:
        return json.load(f)


def ingest_video(video_id: str, force_reindex: bool = False) -> Dict:
    """
    Full ingestion pipeline.
    Returns metadata dict compatible with IngestResponse.
    """
    # Check cache
    if is_indexed(video_id) and not force_reindex:
        store = get_stored_metadata(video_id)
        return {
            "video_id": video_id,
            "title": store["title"],
            "channel": store["channel"],
            "duration_seconds": store.get("duration_seconds", 0),
            "chunk_count": len(store["chunks"]),
            "already_indexed": True,
            "thumbnail_url": store["thumbnail_url"],
            "chapters": store.get("chapters", []),
        }

    # Fetch transcript
    segments = fetch_transcript(video_id)

    # Chunk
    chunks = chunk_transcript(segments, chunk_size=800, overlap=150)
    if not chunks:
        raise ValueError("No transcript content found for this video.")

    # Get metadata
    meta = get_video_metadata(video_id)
    duration = estimate_duration(segments)
    chapters = extract_chapters(segments, len(chunks))

    # Embed
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts_cloudflare(texts)

    # Persist
    full_meta = {**meta, "duration_seconds": duration, "chapters": chapters}
    save_faiss_index(video_id, embeddings, chunks, full_meta)

    return {
        "video_id": video_id,
        "title": meta["title"],
        "channel": meta["channel"],
        "duration_seconds": duration,
        "chunk_count": len(chunks),
        "already_indexed": False,
        "thumbnail_url": meta["thumbnail_url"],
        "chapters": chapters,
    }

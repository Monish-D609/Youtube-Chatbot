"""
Generation — OpenRouter streaming via SSE
Uses anthropic/claude-3.5-sonnet for best-quality video synthesis.
"""
import os
import json
from typing import List, Dict, AsyncGenerator
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "google/gemini-2.5-flash-lite"

SYSTEM_PROMPT = """You are a brilliant AI research assistant specialized in analyzing YouTube video content.

You have access to transcript excerpts from a YouTube video. Your job is to:
1. Answer the user's question using ONLY information from the provided transcript excerpts
2. Be precise and insightful — synthesize ideas, don't just repeat verbatim
3. Cite timestamps naturally when referencing specific moments (e.g. "Around 4:32, the speaker explains...")
4. If the transcript doesn't contain enough information to fully answer, say so clearly
5. Keep responses focused and well-structured

You must never invent information not present in the transcript."""


def build_context(chunks: List[Dict]) -> str:
    """Format retrieved chunks into a structured context block."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        label = chunk.get("timestamp_label", "?:??")
        parts.append(f"[Excerpt {i} — {label}]\n{chunk['text']}")
    return "\n\n---\n\n".join(parts)


def build_messages(
    context: str,
    question: str,
    history: List[Dict],
) -> List[Dict]:
    """Build the message list for the OpenRouter API call."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Inject last 6 turns of conversation history
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

    # Current user turn with context
    user_content = f"""Transcript context from the video:

{context}

---

Question: {question}"""

    messages.append({"role": "user", "content": user_content})
    return messages


async def stream_answer(
    chunks: List[Dict],
    question: str,
    history: List[Dict],
) -> AsyncGenerator[str, None]:
    """
    Call OpenRouter with streaming and yield SSE-formatted data strings.
    Each yielded string is a complete SSE event.
    """
    context = build_context(chunks)
    messages = build_messages(context, question, history)

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": True,
        "temperature": 0.3,
        "max_tokens": 1500,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://yt-chatbot.app",
        "X-Title": "YT Chatbot",
    }

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{OPENROUTER_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        return
                    try:
                        data = json.loads(data_str)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            payload_out = json.dumps({"token": delta})
                            yield f"data: {payload_out}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


async def generate_answer(
    chunks: List[Dict],
    question: str,
    history: List[Dict],
) -> str:
    """Non-streaming version — collects full answer. Used for non-SSE fallback."""
    context = build_context(chunks)
    messages = build_messages(context, question, history)

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 1500,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://yt-chatbot.app",
        "X-Title": "YT Chatbot",
    }

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

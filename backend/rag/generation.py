"""
Generation — OpenRouter streaming via SSE
Model: google/gemini-2.5-flash-lite (via OpenRouter)
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

SUMMARY_SYSTEM_PROMPT = """You are a brilliant AI research assistant specialized in synthesizing YouTube video content.

You have been given transcript excerpts sampled from across the ENTIRE video timeline (intro, middle, and conclusion). Your job is to:
1. Produce a comprehensive, well-structured answer that covers the WHOLE video — not just one section
2. Use clear headings, bullet points, or numbered lists to organize your response
3. Highlight the key ideas, arguments, or takeaways the creator presents
4. Reference timestamps where relevant (e.g. "At 2:14, the speaker introduces...")
5. Write in a way that someone who hasn't watched the video can fully understand the content

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
    is_global: bool = False,
) -> List[Dict]:
    """Build the message list for the OpenRouter API call."""
    system_prompt = SUMMARY_SYSTEM_PROMPT if is_global else SYSTEM_PROMPT
    messages = [{"role": "system", "content": system_prompt}]

    # Inject last 6 turns of conversation history
    for turn in history[-6:]:
        if isinstance(turn, dict):
            role = turn.get("role", "user")
            content = turn.get("content", "")
        else:
            role = getattr(turn, "role", "user")
            content = getattr(turn, "content", "")
        if content:
            messages.append({"role": str(role), "content": str(content)})

    # Current user turn with context
    preamble = (
        "The following excerpts are sampled evenly across the FULL video timeline to give you complete coverage:"
        if is_global
        else "Transcript context from the video:"
    )
    user_content = f"""{preamble}

{context}

---

Question: {question}"""

    messages.append({"role": "user", "content": user_content})
    return messages


async def stream_answer(
    chunks: List[Dict],
    question: str,
    history: List[Dict],
    is_global: bool = False,
) -> AsyncGenerator[str, None]:
    """
    Call OpenRouter with streaming and yield SSE-formatted data strings.
    Each yielded string is a complete SSE event.
    """
    context = build_context(chunks)
    messages = build_messages(context, question, history, is_global=is_global)

    # Global/summary queries need more tokens for a complete structured answer
    max_tokens = 2500 if is_global else 1500

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": True,
        "temperature": 0.3,
        "max_tokens": max_tokens,
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

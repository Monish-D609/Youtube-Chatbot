/**
 * API client for the YT Chatbot backend.
 * Handles regular requests + SSE streaming for chat.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

/**
 * Ingest a YouTube video by ID.
 * @param {string} videoId
 * @param {boolean} forceReindex
 */
export async function ingestVideo(videoId, forceReindex = false) {
  const res = await fetch(`${BASE_URL}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, force_reindex: forceReindex }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Ingest failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Get video metadata and indexed status.
 * @param {string} videoId
 */
export async function getVideoInfo(videoId) {
  const res = await fetch(`${BASE_URL}/video/${videoId}/info`);
  if (!res.ok) throw new Error(`Video info fetch failed: ${res.status}`);
  return res.json();
}

/**
 * List recent chat sessions.
 */
export async function getSessions() {
  const res = await fetch(`${BASE_URL}/sessions`);
  if (!res.ok) throw new Error(`Sessions fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Stream a chat response using SSE.
 * @param {object} params
 * @param {string} params.videoId
 * @param {string} params.question
 * @param {string|null} params.sessionId
 * @param {Array} params.history
 * @param {function} onToken - called with each token string
 * @param {function} onSources - called with sources array when received
 * @param {function} onSessionId - called with session_id when received
 * @param {function} onDone - called when stream ends
 * @param {function} onError - called on error
 * @returns {AbortController} - call .abort() to cancel
 */
export function streamChat({
  videoId,
  question,
  sessionId,
  history = [],
  onToken,
  onSources,
  onSessionId,
  onDone,
  onError,
}) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          question,
          session_id: sessionId,
          history,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError?.(new Error(err.detail || `Chat failed: ${res.status}`));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const raw = trimmed.slice(6);
          if (raw === '[DONE]') {
            onDone?.();
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed.token !== undefined) {
              onToken?.(parsed.token);
            } else if (parsed.sources) {
              onSources?.(parsed.sources);
              if (parsed.session_id) onSessionId?.(parsed.session_id);
            }
          } catch {
            // non-JSON line, ignore
          }
        }
      }
      onDone?.();
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  })();

  return controller;
}

/**
 * Extract YouTube video ID from a URL or raw ID.
 * @param {string} input
 * @returns {string|null}
 */
export function extractVideoId(input) {
  if (!input) return null;
  input = input.trim();

  // Already an ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  // Full URL patterns
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Format seconds to MM:SS or H:MM:SS
 */
export function formatTimestamp(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Format duration in seconds to human-readable string.
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

import React, { useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked with custom timestamp extension
const timestampExtension = {
  name: 'timestamp',
  level: 'inline',
  start(src) {
    return src.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.index;
  },
  tokenizer(src) {
    const match = /^\b(\d{1,2}:\d{2}(?::\d{2})?)\b/.exec(src);
    if (match) {
      return {
        type: 'timestamp',
        raw: match[0],
        timestamp: match[1],
      };
    }
  },
  renderer(token) {
    return `<button class="ts-pill" data-timestamp="${token.timestamp}"><span class="material-symbols-outlined" style="font-size:11px">play_arrow</span>${token.timestamp}</button>`;
  },
};

const customRenderer = {
  code({ text, lang }) {
    const language = lang || 'code';
    const escaped = (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="code-block">
      <div class="code-block-header">
        <div class="code-block-lang">
          <span class="code-dot"></span>
          ${language}
        </div>
        <button class="btn-copy" data-code="${encodeURIComponent(text || '')}">
          <span class="material-symbols-outlined">content_copy</span>
          Copy
        </button>
      </div>
      <div class="code-block-body">
        <pre><code>${escaped}</code></pre>
      </div>
    </div>`;
  },
};

marked.use({
  extensions: [timestampExtension],
  renderer: customRenderer,
  breaks: true,
  gfm: true,
});

function parseTimestampToSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

/**
 * MessageBubble — renders a single chat message with marked GFM, code blocks,
 * timestamp pills, and source attribution.
 */
export default function MessageBubble({ message, videoId }) {
  const { role, content, timestamp, sources, isStreaming } = message;
  const isAI = role === 'assistant';

  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  const handleClick = useCallback((e) => {
    // Check if timestamp button clicked
    const tsBtn = e.target.closest('.ts-pill');
    if (tsBtn) {
      const ts = tsBtn.getAttribute('data-timestamp');
      if (ts && videoId) {
        window.open(
          `https://www.youtube.com/watch?v=${videoId}&t=${parseTimestampToSeconds(ts)}s`,
          '_blank'
        );
      }
      return;
    }

    // Check if code copy button clicked
    const copyBtn = e.target.closest('.btn-copy');
    if (copyBtn) {
      const code = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
      if (code) {
        copyToClipboard(code);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">check</span> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      }
    }
  }, [videoId, copyToClipboard]);

  const renderedHtml = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = marked.parse(content);
      return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['button', 'span'],
        ADD_ATTR: ['data-timestamp', 'data-code'],
      });
    } catch {
      return content;
    }
  }, [content]);

  if (isAI) {
    return (
      <div className="msg-row">
        <div className="msg-avatar">
          <span className="material-symbols-outlined">asterisk</span>
        </div>
        <div className="msg-content">
          <div className="msg-meta">
            <span className="msg-sender">AI</span>
            <span className="msg-model">Gemini 2.5 Flash Lite</span>
            <span className="msg-time">{timeLabel}</span>
          </div>
          <div className="msg-bubble" onClick={handleClick}>
            {isStreaming && !content ? (
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            )}
            {isStreaming && content && (
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: '1em',
                  background: 'var(--accent-primary)',
                  verticalAlign: 'middle',
                  marginLeft: 2,
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
            )}
          </div>

          {/* Sources */}
          {!isStreaming && sources && sources.length > 0 && (
            <div className="msg-sources">
              <div className="msg-sources-label">Sources from video</div>
              <div className="source-pills">
                {sources.map((src, i) =>
                  src.timestamp_label ? (
                    <button
                      key={i}
                      className="source-pill"
                      onClick={() => {
                        if (videoId && src.start_time != null) {
                          window.open(
                            `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(src.start_time)}s`,
                            '_blank'
                          );
                        }
                      }}
                      title={src.text?.slice(0, 100)}
                    >
                      <span className="material-symbols-outlined">play_circle</span>
                      {src.timestamp_label}
                    </button>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User message
  return (
    <div className="msg-row user">
      <div className="msg-content user">
        <div className="msg-meta user">
          <span className="msg-time">{timeLabel}</span>
          <span className="msg-sender">You</span>
        </div>
        <div className="msg-bubble user">{content}</div>
      </div>
      <div className="msg-user-avatar">Y</div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const SUGGESTED_PROMPTS = [
  'Summarize this video in 5 bullet points',
  'What are the key takeaways?',
  'What problems does the speaker address?',
  'Give me a timeline of topics covered',
  'What are the most important quotes?',
];

/**
 * ChatStream — scrollable conversation display.
 */
export default function ChatStream({ messages, isStreaming, videoId, onSuggestPrompt }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const showSuggested = messages.length === 1 && !isStreaming;

  return (
    <div className="chat-stream">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} videoId={videoId} />
      ))}

      {/* Suggested prompts after initial ingest message */}
      {showSuggested && (
        <div className="suggested-prompts">
          <div className="suggested-label">Suggested questions</div>
          <div className="prompt-chips">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                className="prompt-chip"
                onClick={() => onSuggestPrompt?.(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

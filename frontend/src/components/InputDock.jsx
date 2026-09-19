import React, { useState, useRef, useEffect, useCallback } from 'react';
import { extractVideoId } from '../api/client';

/**
 * InputDock — fixed bottom dock with chat textarea and ingest URL input.
 */
export default function InputDock({
  videoInfo,
  dockMode,
  setDockMode,
  onSend,
  onIngest,
  isIngesting,
  isStreaming,
  onAbort,
}) {
  const [chatValue, setChatValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const textareaRef = useRef(null);
  const sidebarCollapsed = false; // Could be passed as prop

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [chatValue]);

  const handleSend = useCallback(() => {
    if (!chatValue.trim() || isStreaming) return;
    onSend(chatValue.trim());
    setChatValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [chatValue, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleIngestSubmit = useCallback(async () => {
    if (!urlValue.trim() || isIngesting) return;
    const id = extractVideoId(urlValue.trim());
    if (!id) {
      alert('Invalid YouTube URL or video ID. Please check and try again.');
      return;
    }
    await onIngest(urlValue.trim());
    setUrlValue('');
  }, [urlValue, isIngesting, onIngest]);

  const handleUrlKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleIngestSubmit();
      }
    },
    [handleIngestSubmit]
  );

  // Expose a method to set chat value from outside (suggested prompts)
  useEffect(() => {
    if (window._setChatValue) {
      window._setChatValue = setChatValue;
    }
    window._setChatValue = setChatValue;
  }, []);

  return (
    <div className={`input-dock-wrapper${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="input-dock-inner">
        <div className="input-dock">
          {/* Top bar — mode tabs + video pill */}
          <div className="dock-top">
            <div className="dock-mode-tabs">
              <button
                className={`dock-tab${dockMode === 'chat' ? ' active' : ''}`}
                onClick={() => setDockMode('chat')}
                disabled={!videoInfo}
              >
                <span className="material-symbols-outlined">forum</span>
                Chat with Video
              </button>
              <button
                className={`dock-tab${dockMode === 'ingest' ? ' active' : ''}`}
                onClick={() => setDockMode('ingest')}
              >
                <span className="material-symbols-outlined">add_link</span>
                Ingest New URL
              </button>
            </div>

            {videoInfo && dockMode === 'chat' && (
              <div className="dock-video-pill">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_display</span>
                <span className="dock-video-title">{videoInfo.title}</span>
                <button
                  className="dock-close"
                  onClick={() => setDockMode('ingest')}
                  title="Change video"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>
            )}
          </div>

          {/* Ingest mode */}
          {dockMode === 'ingest' && (
            <div className="dock-ingest-mode">
              <input
                type="text"
                className="dock-url-input"
                placeholder="Paste a YouTube URL or video ID..."
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                disabled={isIngesting}
                autoFocus
              />
              <button
                className="btn-ingest-dock"
                onClick={handleIngestSubmit}
                disabled={isIngesting || !urlValue.trim()}
              >
                {isIngesting ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    Indexing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                    Index Video
                  </>
                )}
              </button>
            </div>
          )}

          {/* Chat mode */}
          {dockMode === 'chat' && videoInfo && (
            <>
              <div className="dock-textarea-row">
                <textarea
                  ref={textareaRef}
                  className="dock-textarea"
                  placeholder="Ask anything about this video, request a summary, or jump to a timestamp..."
                  value={chatValue}
                  onChange={(e) => setChatValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={isStreaming}
                />
              </div>

              <div className="dock-bottom">
                <div className="dock-tools">
                  <button className="btn-auto-cite">
                    <span className="material-symbols-outlined">timeline</span>
                    Auto-cite timestamps: ON
                  </button>
                  <span className="dock-meta" style={{ display: 'none' }}>
                    Model: claude-3.5-sonnet
                  </span>
                </div>

                <div className="dock-right">
                  {isStreaming ? (
                    <button
                      className="btn-send"
                      onClick={onAbort}
                      title="Stop generation"
                      style={{ background: 'var(--surface-overlay)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-primary)' }}>stop</span>
                    </button>
                  ) : (
                    <>
                      <span className="return-hint" style={{ display: window.innerWidth > 640 ? undefined : 'none' }}>
                        ↵ Return
                      </span>
                      <button
                        id="send-button"
                        className="btn-send"
                        onClick={handleSend}
                        disabled={!chatValue.trim()}
                        title="Send message"
                      >
                        <span className="material-symbols-outlined">arrow_upward</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import VideoContextCard from './components/VideoContextCard';
import ChapterRibbon from './components/ChapterRibbon';
import ChatStream from './components/ChatStream';
import InputDock from './components/InputDock';
import { useChat } from './hooks/useChat';
import { getSessions } from './api/client';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);

  const {
    videoInfo,
    messages,
    isIngesting,
    ingestError,
    isStreaming,
    sessionId,
    dockMode,
    setDockMode,
    handleIngest,
    sendMessage,
    abortStream,
    newSession,
  } = useChat();

  // Load sessions from backend
  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => {}); // graceful fail
  }, [sessionId]); // refresh when session changes

  // Keyboard shortcut: Cmd/Ctrl+K = new session
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        newSession();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [newSession]);

  const handleSuggestPrompt = useCallback(
    (prompt) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const handleChapterClick = useCallback(
    (chapter) => {
      sendMessage(`What happens around ${chapter.timestamp_label} in this video?`);
    },
    [sendMessage]
  );

  const handleQuickAction = useCallback(
    (prompt) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        sessions={sessions}
        videoInfo={videoInfo}
        onNewSession={newSession}
        onSelectSession={(s) => {
          // For now, just show video info — full session restore is a future enhancement
          if (isMobile) setSidebarOpen(false);
        }}
      />

      {/* Main content */}
      <div className={`main-content${!sidebarOpen ? ' sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className={`app-header${!sidebarOpen ? ' sidebar-collapsed' : ''}`}>
          <div className="header-left">
            {!sidebarOpen && (
              <button
                className="icon-btn"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
                style={{ marginRight: '0.25rem' }}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            )}
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent-secondary)' }}>
              ondemand_video
            </span>
            <span className="header-video-title">
              {videoInfo ? videoInfo.title : 'YT Chatbot — Chat with any YouTube video'}
            </span>
            {videoInfo && (
              <>
                <div className="header-divider" />
                <div className="status-pill">
                  <span className="status-dot" />
                  Indexed
                </div>
              </>
            )}
          </div>

          <div className="header-right">
            <div className="model-selector">
              <span className="material-symbols-outlined">neurology</span>
              <span>Gemini 2.5 Flash Lite</span>
            </div>
            {videoInfo && (
              <a
                href={`https://youtube.com/watch?v=${videoInfo.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                title="Open video on YouTube"
              >
                <span className="material-symbols-outlined">open_in_new</span>
              </a>
            )}
          </div>
        </header>

        {/* Page body */}
        <div className="page-body">
          {!videoInfo ? (
            /* Welcome / landing screen */
            <div className="welcome-screen">
              <div className="welcome-hero">
                <div className="welcome-icon">
                  <span className="material-symbols-outlined">smart_display</span>
                </div>
                <h1 className="welcome-title">Chat with any YouTube video</h1>
                <p className="welcome-sub">
                  Paste a YouTube URL below to index it with AI. Then ask anything — get
                  timestamped answers powered by industry-standard RAG.
                </p>
              </div>

              <div className="ingest-form">
                <div className="ingest-input-wrapper">
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center', marginLeft: '0.25rem' }}>
                    link
                  </span>
                  <input
                    id="video-url-input"
                    className="ingest-input"
                    type="text"
                    placeholder="https://youtube.com/watch?v=... or video ID"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleIngest(e.target.value.trim());
                      }
                    }}
                    disabled={isIngesting}
                    autoFocus
                  />
                  <button
                    id="ingest-button"
                    className="btn-ingest"
                    onClick={() => {
                      const val = document.getElementById('video-url-input')?.value;
                      if (val) handleIngest(val);
                    }}
                    disabled={isIngesting}
                  >
                    {isIngesting ? (
                      <>
                        <div className="spinner" />
                        Indexing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">bolt</span>
                        Index Video
                      </>
                    )}
                  </button>
                </div>

                {ingestError && (
                  <div style={{ color: '#ffb4ab', fontSize: 'var(--fs-body-sm)', padding: '0.5rem 0.75rem', background: 'rgba(147,0,10,0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(147,0,10,0.3)' }}>
                    {ingestError}
                  </div>
                )}

                {isIngesting && (
                  <div className="ingest-progress">
                    <div className="spinner" />
                    <span>Fetching transcript and generating embeddings via Cloudflare AI...</span>
                  </div>
                )}

                <p className="ingest-hint">
                  Supports any public YouTube video with captions. Embeddings are cached —
                  <span> re-visits are instant.</span>
                </p>
              </div>
            </div>
          ) : (
            /* Chat view */
            <>
              <VideoContextCard
                videoInfo={videoInfo}
                onQuickAction={handleQuickAction}
              />
              {videoInfo.chapters?.length > 0 && (
                <div style={{ padding: '0 var(--sp-md)' }}>
                  <ChapterRibbon
                    chapters={videoInfo.chapters}
                    videoId={videoInfo.video_id}
                    onChapterClick={handleChapterClick}
                  />
                </div>
              )}
              <ChatStream
                messages={messages}
                isStreaming={isStreaming}
                videoId={videoInfo.video_id}
                onSuggestPrompt={handleSuggestPrompt}
              />
            </>
          )}
        </div>

        {/* Input Dock */}
        <InputDock
          videoInfo={videoInfo}
          dockMode={videoInfo ? dockMode : 'ingest'}
          setDockMode={setDockMode}
          onSend={sendMessage}
          onIngest={handleIngest}
          isIngesting={isIngesting}
          isStreaming={isStreaming}
          onAbort={abortStream}
        />
      </div>
    </div>
  );
}

import React from 'react';

/**
 * Sidebar — collapsible nav with chat history grouped by date.
 */
export default function Sidebar({ isOpen, onToggle, sessions = [], videoInfo, onNewSession, onSelectSession }) {
  const [search, setSearch] = React.useState('');

  // Group sessions by date label
  const grouped = React.useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };

    sessions
      .filter((s) => !search || s.video_title?.toLowerCase().includes(search.toLowerCase()))
      .forEach((s) => {
        const d = new Date(s.created_at);
        if (d.toDateString() === today.toDateString()) groups.Today.push(s);
        else if (d.toDateString() === yesterday.toDateString()) groups.Yesterday.push(s);
        else if (d >= weekAgo) groups['Previous 7 Days'].push(s);
        else groups.Older.push(s);
      });

    return groups;
  }, [sessions, search]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay active"
          onClick={onToggle}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>smart_display</span>
            </div>
            <span className="logo-title">YT Chatbot</span>
            <span className="logo-badge">v1.0</span>
          </div>
          <button className="icon-btn" onClick={onToggle} title="Collapse sidebar">
            <span className="material-symbols-outlined">dock_to_right</span>
          </button>
        </div>

        {/* Body */}
        <div className="sidebar-body">
          {/* New Session */}
          <button className="btn-new-session" onClick={onNewSession}>
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              <span>New Session</span>
            </div>
            <span className="kbd">⌘K</span>
          </button>

          {/* Search */}
          <div className="sidebar-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Filter video chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Nav Groups */}
          <nav>
            {Object.entries(grouped).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label} style={{ marginBottom: '0.5rem' }}>
                  <div className="nav-group-label">{label}</div>
                  {items.map((s) => (
                    <div
                      key={s.session_id}
                      className={`nav-item${videoInfo?.video_id === s.video_id ? ' active' : ''}`}
                      onClick={() => onSelectSession?.(s)}
                    >
                      <span className="material-symbols-outlined" style={{ color: videoInfo?.video_id === s.video_id ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
                        {videoInfo?.video_id === s.video_id ? 'play_circle' : 'smart_display'}
                      </span>
                      <div className="nav-item-text">
                        <span className="nav-item-title">{s.video_title || s.video_id}</span>
                        <span className="nav-item-meta">
                          {s.message_count} messages{videoInfo?.video_id === s.video_id ? ' • active' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {sessions.length === 0 && (
              <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-body-sm)' }}>
                <span className="material-symbols-outlined" style={{ display: 'block', fontSize: 28, marginBottom: '0.5rem', opacity: 0.4 }}>history</span>
                No sessions yet. Ingest a video to start.
              </div>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">Y</div>
            <div className="user-info">
              <div className="user-name">YT Chatbot</div>
              <div className="user-plan">Gemini 2.5 Flash Lite</div>
            </div>
            <button className="icon-btn" title="Settings">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

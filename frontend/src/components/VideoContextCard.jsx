import React from 'react';
import { formatDuration } from '../api/client';

/**
 * VideoContextCard — displays the current video's metadata.
 */
export default function VideoContextCard({ videoInfo, onQuickAction }) {
  if (!videoInfo) return null;

  const { title, channel, duration_seconds, thumbnail_url, video_id, chunk_count } = videoInfo;
  const youtubeUrl = `https://www.youtube.com/watch?v=${video_id}`;

  return (
    <section className="video-context-card">
      <div className="video-card-inner">
        {/* Thumbnail */}
        <div className="video-thumb-col">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="video-thumb"
            style={{ display: 'block' }}
          >
            <img
              src={thumbnail_url || `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`}
              alt={title}
              onError={(e) => {
                e.target.src = `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`;
              }}
            />
            <div className="thumb-overlay">
              <div className="play-btn">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
              </div>
            </div>
            {duration_seconds > 0 && (
              <div className="thumb-duration">{formatDuration(duration_seconds)}</div>
            )}
            <div className="indexed-badge">
              <span className="indexed-dot" />
              INDEXED
            </div>
          </a>
        </div>

        {/* Metadata */}
        <div className="video-meta-col">
          <div>
            <div className="video-tags">
              <span className="video-tag">YouTube</span>
              <span className="dot-sep">•</span>
              <span className="video-tag-text">
                {chunk_count} chunks indexed
              </span>
              <span className="dot-sep">•</span>
              <span className="video-tag-text" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {video_id}
              </span>
            </div>

            <h1 className="video-title">{title}</h1>

            <p className="video-channel">
              <strong>{channel}</strong>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 15, color: 'var(--accent-primary)' }}>
                verified
              </span>
              {duration_seconds > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>{formatDuration(duration_seconds)} total</span>
              )}
            </p>
          </div>

          <div className="video-actions">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-action"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              <span>Open on YouTube</span>
            </a>
            <button
              className="btn-action btn-action-primary"
              onClick={() => onQuickAction?.('Summarize this video in 5 key points')}
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>Key Takeaways</span>
            </button>
            <button
              className="btn-action"
              onClick={() => onQuickAction?.('What are the main topics covered in this video?')}
            >
              <span className="material-symbols-outlined">overview</span>
              <span>Overview</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

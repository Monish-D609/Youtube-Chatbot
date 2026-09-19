import React from 'react';

/**
 * ChapterRibbon — horizontal scrollable chapter pills with timestamps.
 */
export default function ChapterRibbon({ chapters = [], videoId, onChapterClick }) {
  const [active, setActive] = React.useState(null);

  if (!chapters.length) return null;

  const handleClick = (chapter, index) => {
    setActive(index);
    onChapterClick?.(chapter);
  };

  return (
    <div className="chapter-ribbon">
      <div className="chapter-ribbon-header">
        <span className="chapter-ribbon-label">
          <span className="material-symbols-outlined">format_list_bulleted</span>
          Indexed Chapters &amp; Keyframe Jumps
        </span>
        <span className="chapter-ribbon-status">100% vector embeddings ready</span>
      </div>
      <div className="chapter-pills">
        {chapters.map((chapter, i) => (
          <button
            key={i}
            className={`chapter-pill${active === i ? ' active' : ''}`}
            onClick={() => handleClick(chapter, i)}
            title={`Jump to ${chapter.timestamp_label}`}
          >
            <span className="chapter-ts">{chapter.timestamp_label}</span>
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chapter.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

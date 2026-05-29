import React, { useState } from 'react';

const EMOJIS = [
  ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆'],
  ['😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗'],
  ['😙', '😚', '🙂', '🤗', '🤔', '🤨', '😐', '😑'],
  ['😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯'],
  ['😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤'],
  ['😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️'],
  ['🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦'],
  ['😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵'],
  ['🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '👿'],
  ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌'],
  ['👐', '🤲', '🤝', '🙏', '✌️', '🤞', '💪', '🖕'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍'],
  ['💔', '💕', '💞', '💗', '💖', '✨', '🔥', '💯'],
  ['🎉', '🎊', '🎈', '🎁', '🏆', '⭐', '🌟', '💀'],
  ['✅', '❌', '💩', '👋', '🖐️', '✋', '🤚', '👌'],
];

const RECENT_KEY = 'chat-recent-emojis';

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecent(emoji) {
  const recent = getRecent().filter((e) => e !== emoji);
  recent.unshift(emoji);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 20)));
}

export default function EmojiPicker({ onSelect }) {
  const [category, setCategory] = useState('recent');
  const recent = getRecent();

  const categories = [
    { id: 'recent', label: '🕐' },
    { id: 'smileys', label: '😀' },
    { id: 'gestures', label: '👍' },
    { id: 'hearts', label: '❤️' },
  ];

  const visibleEmojis = category === 'recent'
    ? (recent.length > 0 ? [recent] : [EMOJIS[0]])
    : EMOJIS.filter((_, i) => {
        if (category === 'smileys') return i < 9;
        if (category === 'gestures') return i >= 9 && i < 11;
        if (category === 'hearts') return i >= 11;
        return false;
      });

  const styles = {
    container: {
      borderTop: '1px solid #0f3460', background: '#16213e',
      padding: '8px 12px', maxHeight: '220px', overflowY: 'auto'
    },
    tabs: {
      display: 'flex', gap: '4px', marginBottom: '8px'
    },
    tab: (active) => ({
      background: 'none', border: 'none', fontSize: '20px',
      cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
      opacity: active ? 1 : 0.5, transition: 'all 0.15s'
    }),
    grid: {
      display: 'flex', flexWrap: 'wrap', gap: '4px'
    },
    emoji: {
      background: 'none', border: 'none', fontSize: '24px',
      cursor: 'pointer', padding: '4px', borderRadius: '6px',
      lineHeight: 1, transition: 'all 0.1s'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {categories.map((c) => (
          <button
            key={c.id}
            style={styles.tab(category === c.id)}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={styles.grid}>
        {(category === 'recent' && recent.length > 0 ? [recent] : visibleEmojis).flat().map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            style={styles.emoji}
            onClick={() => { addRecent(emoji); onSelect(emoji); }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

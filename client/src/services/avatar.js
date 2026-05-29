const COLORS = ['#e94560', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#ff6b6b', '#48dbfb', '#ff9ff3'];

export function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function getInitials(name) {
  return (name || '?')[0].toUpperCase();
}

export function getAvatarData(user) {
  if (!user) return { initials: '?', color: '#555', type: 'color' };

  const initials = getInitials(user.username);
  const avatar = user.avatar || {};
  const color = avatar.color || hashColor(user.username);

  return {
    initials,
    color,
    type: avatar.type || 'color',
    path: avatar.path || null
  };
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export function getAvatarUrl(username) {
  return `${SERVER_URL}/api/avatar/${encodeURIComponent(username)}`;
}

const COLORS = ['#4F6CF7', '#22B05E', '#E85656', '#F0A030', '#8B6CF7', '#3B9BD0', '#D45080', '#3BCB6E', '#6B85F7', '#E07040'];

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
  if (!user) return { initials: '?', color: '#888', type: 'color' };

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

import { SERVER_URL } from './config';

export function getAvatarUrl(username) {
  return `${SERVER_URL}/api/avatar/${encodeURIComponent(username)}`;
}

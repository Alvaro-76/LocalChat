import React, { useState } from 'react';
import { getAvatarData, getAvatarUrl } from '../services/avatar';

export default function Avatar({ user, size = 32, style }) {
  const [imgError, setImgError] = useState(false);
  const data = getAvatarData(user);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(size * 0.45, 10),
    fontWeight: 600,
    flexShrink: 0,
    overflow: 'hidden',
    background: data.color,
    color: '#fff',
    ...style
  };

  if (data.type === 'image' && data.path && !imgError) {
    return (
      <img
        src={getAvatarUrl(user.username)}
        alt={data.initials}
        style={containerStyle}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {data.initials}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import Avatar from './Avatar';
import { getAvatarUrl } from '../services/avatar';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function SettingsPanel({ user, settings, onUpdateSettings, onClose, onAvatarChange }) {
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [avatarColor, setAvatarColor] = useState(user.avatar?.color || '#e94560');
  const fileRef = useRef(null);

  const styles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    },
    panel: {
      background: '#16213e', borderRadius: '16px', width: '420px',
      maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    },
    header: {
      padding: '20px 24px', borderBottom: '1px solid #0f3460',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    title: { fontSize: '18px', fontWeight: 600 },
    closeBtn: {
      background: 'none', border: 'none', color: '#888',
      fontSize: '22px', cursor: 'pointer', lineHeight: 1
    },
    section: { padding: '20px 24px', borderBottom: '1px solid #0f3460' },
    sectionTitle: { fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' },
    row: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0'
    },
    label: { fontSize: '14px' },
    toggle: (on) => ({
      width: '44px', height: '24px', borderRadius: '12px',
      background: on ? '#e94560' : '#0f3460', cursor: 'pointer',
      position: 'relative', transition: 'all 0.2s', border: 'none', padding: 0
    }),
    toggleDot: (on) => ({
      width: '20px', height: '20px', borderRadius: '50%',
      background: '#fff', position: 'absolute', top: '2px',
      left: on ? '22px' : '2px', transition: 'all 0.2s'
    }),
    avatarSection: {
      display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px'
    },
    uploadBtn: {
      padding: '8px 16px', border: '1px solid #e94560', borderRadius: '8px',
      background: 'transparent', color: '#e94560', cursor: 'pointer', fontSize: '13px'
    },
    colorInput: {
      width: '32px', height: '32px', border: '2px solid #0f3460',
      borderRadius: '8px', cursor: 'pointer', padding: 0, background: 'none'
    },
    colorPresets: {
      display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px'
    },
    colorPreset: (color) => ({
      width: '28px', height: '28px', borderRadius: '50%',
      background: color, cursor: 'pointer', border: '2px solid transparent',
      transition: 'all 0.15s'
    }),
    avatarPreview: { display: 'flex', alignItems: 'center', gap: '16px' }
  };

  const colors = ['#e94560', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#ff6b6b', '#48dbfb', '#ff9ff3'];

  async function handleAvatarUpload(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);

    const token = user.token;
    if (!token) {
      alert('Solo usuarios registrados pueden subir avatar');
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/avatar/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Error al subir');
      const data = await res.json();
      user.avatar = data.avatar;
      if (onAvatarChange) onAvatarChange(data.avatar);
      setShowAvatarUpload(false);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function handleColorSelect(color) {
    setAvatarColor(color);
    if (user) {
      user.avatar = { type: 'color', color };
      if (onAvatarChange) onAvatarChange({ type: 'color', color });
    }
  }

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.title}>Configuración</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Perfil</div>
          <div style={styles.avatarPreview}>
            <Avatar user={user} size={56} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{user?.username}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'anonymous' ? 'Invitado' : 'Usuario'}
              </div>
            </div>
          </div>

          {user?.role !== 'anonymous' && (
            <div style={{ marginTop: '16px' }}>
              <button style={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
                {user?.avatar?.type === 'image' ? 'Cambiar avatar' : 'Subir avatar'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  handleAvatarUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          <div style={styles.colorPresets}>
            {colors.map((c) => (
              <div
                key={c}
                style={{ ...styles.colorPreset(c), borderColor: avatarColor === c ? '#fff' : 'transparent' }}
                onClick={() => handleColorSelect(c)}
              />
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Notificaciones</div>
          <div style={styles.row}>
            <span style={styles.label}>Sonido al recibir mensaje</span>
            <button
              style={styles.toggle(settings.sound)}
              onClick={() => onUpdateSettings('sound', !settings.sound)}
            >
              <div style={styles.toggleDot(settings.sound)} />
            </button>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Notificaciones de escritorio</span>
            <button
              style={styles.toggle(settings.notifications)}
              onClick={() => onUpdateSettings('notifications', !settings.notifications)}
            >
              <div style={styles.toggleDot(settings.notifications)} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

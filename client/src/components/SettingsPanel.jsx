import React, { useState, useRef } from 'react';
import Avatar from './Avatar';
import { toggleTheme, getTheme } from '../services/theme';
import { SERVER_URL } from '../services/config';
import { ConfirmModal } from './Modal';

export default function SettingsPanel({ user, settings, onUpdateSettings, onClose, onAvatarChange }) {
  const [avatarColor, setAvatarColor] = useState(user.avatar?.color || '#4F6CF7');
  const [themeMode, setThemeMode] = useState(getTheme());
  const fileRef = useRef(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  function handleToggleTheme() {
    const next = toggleTheme();
    setThemeMode(next);
  }

  const styles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    },
    panel: {
      background: 'var(--surface)', borderRadius: '16px', width: '420px',
      maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
      boxShadow: '0 12px 40px var(--shadow-lg)'
    },
    header: {
      padding: '20px 24px', borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    title: { fontSize: '18px', fontWeight: 600, color: 'var(--text)' },
    closeBtn: {
      background: 'none', border: 'none', color: 'var(--text-secondary)',
      fontSize: '22px', cursor: 'pointer', lineHeight: 1,
      padding: '4px 8px', borderRadius: '8px'
    },
    section: { padding: '20px 24px', borderBottom: '1px solid var(--border)' },
    sectionTitle: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' },
    row: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0'
    },
    label: { fontSize: '14px', color: 'var(--text)', fontWeight: 500 },
    toggle: (on) => ({
      width: '44px', height: '24px', borderRadius: '12px',
      background: on ? 'var(--toggle-bg-on)' : 'var(--toggle-bg-off)', cursor: 'pointer',
      position: 'relative', transition: 'all 0.2s', border: 'none', padding: 0
    }),
    toggleDot: (on) => ({
      width: '20px', height: '20px', borderRadius: '50%',
      background: '#fff', position: 'absolute', top: '2px',
      left: on ? '22px' : '2px', transition: 'all 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }),
    avatarPreview: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' },
    uploadBtn: {
      padding: '8px 16px', border: '2px solid var(--primary)', borderRadius: '20px',
      background: 'transparent', color: 'var(--primary)', cursor: 'pointer',
      fontSize: '13px', fontWeight: 600
    },
    colorPresets: {
      display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px'
    },
    colorPreset: (color) => ({
      width: '28px', height: '28px', borderRadius: '50%',
      background: color, cursor: 'pointer', border: '3px solid transparent',
      transition: 'all 0.15s'
    }),
    themeBtn: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 16px', border: '2px solid var(--border)', borderRadius: '12px',
      background: 'var(--surface-hover)', cursor: 'pointer', width: '100%',
      color: 'var(--text)', fontSize: '14px', fontWeight: 500
    },
    themeIcon: { fontSize: '20px' }
  };

  const colors = ['#4F6CF7', '#6B85F7', '#3B55D0', '#22B05E', '#E85656', '#F0A030', '#8B6CF7', '#3B9BD0', '#6B7B8D', '#D45080'];

  async function handleAvatarUpload(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);

    const token = user.token;
    if (!token) {
      setAlertMsg('Solo usuarios registrados pueden subir avatar');
      setAlertOpen(true);
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
      if (onAvatarChange) onAvatarChange(data.avatar);
    } catch (err) {
      setAlertMsg('Error: ' + err.message);
      setAlertOpen(true);
    }
  }

  function handleColorSelect(color) {
    setAvatarColor(color);
    if (onAvatarChange && user) {
      onAvatarChange({ type: 'color', color });
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
          <div style={styles.sectionTitle}>Apariencia</div>
          <button style={styles.themeBtn} onClick={handleToggleTheme}>
            <span style={styles.themeIcon}>{themeMode === 'light' ? '🌙' : '☀️'}</span>
            <span>{themeMode === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Perfil</div>
          <div style={styles.avatarPreview}>
            <Avatar user={user} size={56} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{user?.username}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'anonymous' ? 'Invitado' : 'Usuario'}
              </div>
            </div>
          </div>

          {user?.role !== 'anonymous' && (
            <div style={{ marginBottom: '12px' }}>
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
                style={{ ...styles.colorPreset(c), borderColor: avatarColor === c ? 'var(--text)' : 'transparent' }}
                onClick={() => handleColorSelect(c)}
              />
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Notificaciones</div>
          <div style={styles.row}>
            <span style={styles.label}>Sonido de mensaje</span>
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

      <ConfirmModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        onConfirm={() => setAlertOpen(false)}
        title="Aviso"
        message={alertMsg}
        confirmText="Entendido"
      />
    </div>
  );
}

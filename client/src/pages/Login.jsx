import React, { useState } from 'react';
import { connectSocket } from '../services/socket';
import Avatar from '../components/Avatar';
import { hashColor } from '../services/avatar';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'guest') {
        if (!username.trim()) {
          setError('Ingresa un nickname');
          setLoading(false);
          return;
        }
        const socket = connectSocket();
        const userData = { username: username.trim(), role: 'anonymous', avatar: { type: 'color', color: hashColor(username.trim()) } };
        socket.emit('user:join', { username: userData.username });
        onLogin(userData);
        setLoading(false);
        return;
      }

      const endpoint = mode === 'register' ? 'register' : 'login';
      const res = await fetch(`${SERVER_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error');
        setLoading(false);
        return;
      }

      const socket = connectSocket(data.token);
      socket.emit('user:join', { username: data.user.username, token: data.token });
      onLogin({ ...data.user, token: data.token });
    } catch {
      setError('No se pudo conectar al servidor');
    }
    setLoading(false);
  }

  const styles = {
    container: {
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', padding: '20px',
      background: 'radial-gradient(ellipse at top left, #E8ECF8, #F2F3F7 50%, #E4E8F0)'
    },
    card: {
      background: 'var(--surface)', padding: '36px', borderRadius: '16px',
      width: '100%', maxWidth: '400px',
      boxShadow: '0 12px 40px var(--shadow-lg)'
    },
    logo: {
      textAlign: 'center', marginBottom: '28px'
    },
    logoBadge: {
      width: '72px', height: '72px', margin: '0 auto 14px',
      borderRadius: '18px',
      background: 'linear-gradient(135deg, #4F6CF7, #3B55D0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '28px', fontWeight: 800, color: '#fff',
      letterSpacing: '-1px',
      boxShadow: '0 4px 16px rgba(79,108,247,0.3)',
      position: 'relative'
    },
    logoAccent: {
      position: 'absolute', bottom: '-4px', right: '-4px',
      width: '20px', height: '20px', borderRadius: '6px',
      background: '#4F6CF7', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '11px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
    },
    title: { textAlign: 'center', fontSize: '26px', fontWeight: 700, color: '#3c3c57', marginBottom: '2px', letterSpacing: '-0.5px' },
    titleAccent: { color: '#4F6CF7' },
    subtitle: { textAlign: 'center', fontSize: '13px', color: '#888', marginBottom: '24px' },
    tabs: {
      display: 'flex', gap: '6px', marginBottom: '20px',
      background: 'var(--bg)', borderRadius: '10px', padding: '4px'
    },
    tab: (active) => ({
      flex: 1, padding: '9px 12px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontSize: '13px', fontWeight: active ? 600 : 500,
      background: active ? 'var(--surface)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-secondary)',
      transition: 'all 0.2s',
      boxShadow: active ? '0 1px 3px var(--shadow)' : 'none'
    }),
    avatarPreview: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '8px', marginBottom: '20px'
    },
    inputGroup: {
      marginBottom: '12px'
    },
    label: {
      display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
      marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    input: {
      width: '100%', padding: '12px 16px',
      border: '2px solid var(--border)', borderRadius: '10px', fontSize: '15px',
      background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
      transition: 'border-color 0.2s'
    },
    button: {
      width: '100%', padding: '13px', border: 'none', borderRadius: '10px',
      background: 'var(--gradient-btn)', color: '#fff',
      fontSize: '15px', fontWeight: 600, cursor: 'pointer',
      opacity: loading ? 0.6 : 1, marginTop: '8px',
      boxShadow: '0 4px 12px rgba(79,108,247,0.25)'
    },
    error: {
      color: 'var(--danger)', textAlign: 'center', marginBottom: '12px',
      fontSize: '13px', background: '#FEF0F0', padding: '8px 12px',
      borderRadius: '8px'
    },
    link: {
      textAlign: 'center', marginTop: '16px', color: '#bbb',
      fontSize: '12px', cursor: 'pointer'
    }
  };

  const previewUser = username.trim()
    ? { username: username.trim(), avatar: { type: 'color', color: hashColor(username.trim()) } }
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoBadge}>
            LC
            <span style={styles.logoAccent}>✦</span>
          </div>
          <div style={styles.title}>
            <span style={styles.titleAccent}>LocalChat</span>
          </div>
          <div style={styles.subtitle}>Red local · Conexión directa</div>
        </div>

        {previewUser && (
          <div style={styles.avatarPreview}>
            <Avatar user={previewUser} size={68} style={{ border: '3px solid var(--primary)' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{previewUser.username}</div>
          </div>
        )}

        <div style={styles.tabs}>
          <button style={styles.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); }}>Entrar</button>
          <button style={styles.tab(mode === 'register')} onClick={() => { setMode('register'); setError(''); }}>Registro</button>
          <button style={styles.tab(mode === 'guest')} onClick={() => { setMode('guest'); setError(''); }}>Invitado</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <div style={styles.label}>Usuario</div>
            <input
              style={styles.input}
              placeholder={mode === 'guest' ? 'Tu nickname' : 'Nombre de usuario'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {mode !== 'guest' && (
            <div style={styles.inputGroup}>
              <div style={styles.label}>Contraseña</div>
              <input
                style={styles.input}
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          )}

          <button style={styles.button} disabled={loading}>
            {loading ? 'Conectando...' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Entrar como invitado'}
          </button>
        </form>

        <div style={styles.link} onClick={() => window.location.href = SERVER_URL}>
          {SERVER_URL}
        </div>
      </div>
    </div>
  );
}

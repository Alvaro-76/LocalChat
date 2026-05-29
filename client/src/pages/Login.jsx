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
      minHeight: '100vh', padding: '20px'
    },
    card: {
      background: '#16213e', padding: '32px', borderRadius: '16px',
      width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    },
    title: { textAlign: 'center', fontSize: '24px', marginBottom: '24px', color: '#e94560' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab: (active) => ({
      flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontSize: '14px', fontWeight: 600,
      background: active ? '#e94560' : '#0f3460', color: '#fff',
      transition: 'all 0.2s'
    }),
    avatarPreview: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '8px', marginBottom: '20px'
    },
    input: {
      width: '100%', padding: '12px 16px', marginBottom: '12px',
      border: '1px solid #0f3460', borderRadius: '8px', fontSize: '15px',
      background: '#1a1a2e', color: '#eee', outline: 'none'
    },
    button: {
      width: '100%', padding: '12px', border: 'none', borderRadius: '8px',
      background: '#e94560', color: '#fff', fontSize: '16px', fontWeight: 600,
      cursor: 'pointer', opacity: loading ? 0.6 : 1
    },
    error: { color: '#e94560', textAlign: 'center', marginBottom: '12px', fontSize: '14px' },
    link: { textAlign: 'center', marginTop: '16px', color: '#888', fontSize: '13px', cursor: 'pointer' }
  };

  const previewUser = username.trim()
    ? { username: username.trim(), avatar: { type: 'color', color: hashColor(username.trim()) } }
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Chat en Red</h1>
        {previewUser && (
          <div style={styles.avatarPreview}>
            <Avatar user={previewUser} size={64} />
            <div style={{ fontSize: '13px', color: '#888' }}>{previewUser.username}</div>
          </div>
        )}
        <div style={styles.tabs}>
          <button style={styles.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); }}>Iniciar sesión</button>
          <button style={styles.tab(mode === 'register')} onClick={() => { setMode('register'); setError(''); }}>Registrarse</button>
          <button style={styles.tab(mode === 'guest')} onClick={() => { setMode('guest'); setError(''); }}>Invitado</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <input
            style={styles.input}
            placeholder={mode === 'guest' ? 'Nickname' : 'Usuario'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {mode !== 'guest' && (
            <input
              style={styles.input}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          <button style={styles.button} disabled={loading}>
            {loading ? 'Conectando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Entrar como invitado'}
          </button>
        </form>

        <div style={styles.link} onClick={() => window.location.href = SERVER_URL}>
          Servidor: {SERVER_URL}
        </div>
      </div>
    </div>
  );
}

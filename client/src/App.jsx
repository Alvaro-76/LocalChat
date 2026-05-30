import React, { useState, useCallback, useEffect } from 'react';
import Login from './pages/Login';
import Chat from './pages/Chat';
import ErrorBoundary from './components/ErrorBoundary';
import { connectSocket, disconnectSocket } from './services/socket';
import { initTheme } from './services/theme';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    initTheme();
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <ErrorBoundary>
      {!user ? <Login onLogin={handleLogin} /> : <Chat user={user} onLogout={handleLogout} />}
    </ErrorBoundary>
  );
}

import React, { useState, useCallback } from 'react';
import Login from './pages/Login';
import Chat from './pages/Chat';
import { connectSocket, disconnectSocket } from './services/socket';

export default function App() {
  const [user, setUser] = useState(null);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    setUser(null);
  }, []);

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Chat user={user} onLogout={handleLogout} />;
}

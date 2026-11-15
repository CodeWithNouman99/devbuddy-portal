// Keeps track of "who is logged in" for the whole app.
// Any component can call useAuth() to get { user, loading, login, logout }.
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until we've asked the server whether a session cookie exists.
  const [loading, setLoading] = useState(true);

  // On page load: the cookie is httpOnly, so JS can't read it. Instead we ask
  // the server "who am I?". If the cookie is valid it returns the user.
  useEffect(() => {
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password, rememberMe) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password, rememberMe } });
    setUser(data.user);
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

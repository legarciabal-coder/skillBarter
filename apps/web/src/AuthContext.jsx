import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await api('/api/users/me'));
    } catch (e) {
      if (e.status === 404) setProfile(null); // usuario autenticado sin perfil todavía
      else throw e;
    }
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setLoading(true); // evita que las rutas privadas redirijan mientras se carga el perfil
        setUser(u);
        if (u) {
          try { await refreshProfile(); } catch { setProfile(null); }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }),
    [refreshProfile]
  );

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

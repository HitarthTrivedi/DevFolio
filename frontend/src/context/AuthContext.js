import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Helper: get token from either storage
const getSavedToken = () =>
  localStorage.getItem('rezum_token') || sessionStorage.getItem('rezum_token');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getSavedToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getSavedToken();
      if (savedToken) {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data);
          setToken(savedToken);
        } catch (error) {
          localStorage.removeItem('rezum_token');
          sessionStorage.removeItem('rezum_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, keepSignedIn = false) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    if (keepSignedIn) {
      localStorage.setItem('rezum_token', access_token);
      sessionStorage.removeItem('rezum_token');
    } else {
      sessionStorage.setItem('rezum_token', access_token);
      localStorage.removeItem('rezum_token');
    }
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, keepSignedIn = false) => {
    const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    const { access_token, user: userData } = response.data;
    if (keepSignedIn) {
      localStorage.setItem('rezum_token', access_token);
      sessionStorage.removeItem('rezum_token');
    } else {
      sessionStorage.setItem('rezum_token', access_token);
      localStorage.removeItem('rezum_token');
    }
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('rezum_token');
    sessionStorage.removeItem('rezum_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const savedToken = getSavedToken();
    if (!savedToken) return;
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      setUser(response.data);
    } catch (error) {
      // silently fail
    }
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`
  });

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      getAuthHeaders,
      refreshUser,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

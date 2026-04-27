import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function GitHubCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      setError('No authorization code received from GitHub.');
      return;
    }

    // Clean the URL immediately
    window.history.replaceState({}, '', window.location.pathname);

    const isLoginFlow = state?.startsWith('login_');
    const savedToken =
      localStorage.getItem('rezum_token') || sessionStorage.getItem('rezum_token');

    if (isLoginFlow || !savedToken) {
      // Sign-in / register flow
      axios
        .post(`${API_URL}/auth/github/login/callback`, { code })
        .then(({ data }) => {
          localStorage.setItem('rezum_token', data.access_token);
          sessionStorage.removeItem('rezum_token');
          // Full reload so AuthContext re-reads the token
          window.location.replace('/dashboard');
        })
        .catch((err) => {
          setError(err.response?.data?.detail || 'GitHub sign-in failed. Please try again.');
        });
    } else {
      // Connect flow — user is already authenticated
      axios
        .post(
          `${API_URL}/auth/github/callback`,
          { code },
          { headers: { Authorization: `Bearer ${savedToken}` } }
        )
        .then(() => {
          navigate('/dashboard/settings', { replace: true });
        })
        .catch((err) => {
          setError(err.response?.data?.detail || 'Failed to connect GitHub account.');
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="font-mono text-5xl text-muted-foreground/20 mb-6">×</div>
          <h1 className="font-serif text-2xl font-medium mb-3">Connection failed</h1>
          <p className="text-sm text-muted-foreground mb-8">{error}</p>
          <Link to="/login" className="text-sm text-white hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-mono">Connecting with GitHub...</span>
      </div>
    </div>
  );
}

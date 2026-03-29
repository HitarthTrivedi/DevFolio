import { useAuth } from '@/context/AuthContext';
import { Copy, Check, ExternalLink, Github, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function SettingsPage() {
  const { user, getAuthHeaders, refreshUser } = useAuth();
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [githubInput, setGithubInput] = useState(user?.github_username || '');
  const [githubSaving, setGithubSaving] = useState(false);
  const [localGithub, setLocalGithub] = useState(user?.github_username || null);

  const profileUrl = `${window.location.origin}/profile/${user?.unique_slug}`;
  const exportUrl = `${process.env.REACT_APP_BACKEND_URL}/api/export/${user?.unique_slug}`;

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'slug') {
        setCopiedSlug(true);
        setTimeout(() => setCopiedSlug(false), 2000);
      } else {
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      }
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleGithubConnect = async () => {
    const trimmed = githubInput.trim().replace(/^@/, '');
    if (!trimmed) {
      toast.error('Please enter a GitHub username');
      return;
    }
    setGithubSaving(true);
    try {
      await axios.patch(
        `${API_URL}/auth/github`,
        { github_username: trimmed },
        { headers: getAuthHeaders() }
      );
      setLocalGithub(trimmed);
      await refreshUser();
      toast.success(`Connected to @${trimmed}`);
    } catch (err) {
      toast.error('Failed to connect GitHub');
    } finally {
      setGithubSaving(false);
    }
  };

  const handleGithubDisconnect = async () => {
    setGithubSaving(true);
    try {
      await axios.patch(
        `${API_URL}/auth/github`,
        { github_username: '' },
        { headers: getAuthHeaders() }
      );
      setLocalGithub(null);
      setGithubInput('');
      await refreshUser();
      toast.success('GitHub disconnected');
    } catch (err) {
      toast.error('Failed to disconnect GitHub');
    } finally {
      setGithubSaving(false);
    }
  };

  return (
    <div className="p-8 lg:p-12" data-testid="settings-page">
      {/* Header */}
      <div className="mb-12">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Settings</p>
        <h1 className="font-serif text-3xl font-medium">Account Settings</h1>
      </div>

      {/* Profile Info */}
      <section className="project-card p-8 mb-8">
        <h2 className="font-sans text-lg font-medium mb-6">Profile Information</h2>

        <div className="space-y-6">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Name</label>
            <p className="text-lg">{user?.name}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <p className="text-lg">{user?.email}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Member since</label>
            <p className="text-lg">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* GitHub Integration */}
      <section className="project-card p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 flex items-center justify-center border border-white/10 flex-shrink-0">
            <Github className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-sans text-lg font-medium mb-1">GitHub Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to display your contribution calendar and auto-sync public repos in your dashboard.
            </p>
          </div>
        </div>

        {localGithub ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-sm text-emerald-300 font-medium">Connected as @{localGithub}</span>
              <a
                href={`https://github.com/${localGithub}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-emerald-400/70 hover:text-emerald-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="flex gap-3">
              <Input
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                placeholder="Change username..."
                className="bg-transparent border-white/20 rounded-sm flex-1"
                data-testid="github-username-input"
              />
              <Button
                onClick={handleGithubConnect}
                disabled={githubSaving}
                variant="outline"
                className="border-white/20 rounded-sm"
              >
                Update
              </Button>
              <Button
                onClick={handleGithubDisconnect}
                disabled={githubSaving}
                variant="ghost"
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-sm"
                data-testid="github-disconnect-button"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Input
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              placeholder="Your GitHub username (e.g. torvalds)"
              className="bg-transparent border-white/20 rounded-sm flex-1"
              data-testid="github-username-input"
            />
            <Button
              onClick={handleGithubConnect}
              disabled={githubSaving}
              className="bg-white text-black hover:bg-gray-200 rounded-sm px-6"
              data-testid="github-connect-button"
            >
              {githubSaving ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        )}
      </section>

      {/* Public URLs */}
      <section className="project-card p-8 mb-8">
        <h2 className="font-sans text-lg font-medium mb-2">Your Public URLs</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Share these URLs to give others access to your portfolio
        </p>

        <div className="space-y-6">
          {/* Profile URL */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Public Profile URL
            </label>
            <div className="export-url-box flex items-center justify-between gap-4">
              <code className="text-sm text-muted-foreground flex-1 truncate">
                {profileUrl}
              </code>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(profileUrl, 'slug')}
                  data-testid="copy-profile-url"
                >
                  {copiedSlug ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* AI Export URL */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              AI Export URL (JSON)
            </label>
            <div className="export-url-box flex items-center justify-between gap-4">
              <code className="text-sm text-muted-foreground flex-1 truncate">
                {exportUrl}
              </code>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(exportUrl, 'export')}
                  data-testid="copy-export-url"
                >
                  {copiedExport ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <a
                  href={exportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Add <code className="text-white">?sections=projects</code> or <code className="text-white">?sections=achievements</code> to filter
            </p>
          </div>
        </div>
      </section>

      {/* Unique Slug */}
      <section className="project-card p-8">
        <h2 className="font-sans text-lg font-medium mb-2">Unique Identifier</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your unique slug is used in all your public URLs
        </p>

        <div className="inline-block">
          <span className="font-mono text-lg px-4 py-2 bg-white/5 border border-white/10">
            {user?.unique_slug}
          </span>
        </div>
      </section>
    </div>
  );
}

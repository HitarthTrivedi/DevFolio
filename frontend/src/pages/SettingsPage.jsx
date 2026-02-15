import { useAuth } from '@/context/AuthContext';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

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

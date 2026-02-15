import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { 
  FolderKanban, 
  Award, 
  Copy, 
  Check, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function DashboardHome() {
  const { user, getAuthHeaders } = useAuth();
  const [projectsCount, setProjectsCount] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [exportSection, setExportSection] = useState('all');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [projectsRes, achievementsRes] = await Promise.all([
          axios.get(`${API_URL}/projects`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/achievements`, { headers: getAuthHeaders() })
        ]);
        setProjectsCount(projectsRes.data.length);
        setAchievementsCount(achievementsRes.data.length);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [getAuthHeaders]);

  const getExportUrl = () => {
    const baseUrl = window.location.origin;
    return `${process.env.REACT_APP_BACKEND_URL}/api/export/${user?.unique_slug}?sections=${exportSection}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getExportUrl());
      setCopied(true);
      toast.success('URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="p-8 lg:p-12" data-testid="dashboard-home">
      {/* Header */}
      <div className="mb-12">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Dashboard</p>
        <h1 className="font-serif text-3xl font-medium">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Projects Card */}
        <Link to="/dashboard/projects" className="project-card p-6 hover-lift" data-testid="projects-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 flex items-center justify-center border border-white/10">
              <FolderKanban className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="font-mono text-4xl font-medium mb-1">
            {loading ? '—' : projectsCount}
          </p>
          <p className="text-muted-foreground text-sm">Projects</p>
        </Link>

        {/* Achievements Card */}
        <Link to="/dashboard/achievements" className="project-card p-6 hover-lift" data-testid="achievements-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 flex items-center justify-center border border-white/10">
              <Award className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="font-mono text-4xl font-medium mb-1">
            {loading ? '—' : achievementsCount}
          </p>
          <p className="text-muted-foreground text-sm">Achievements</p>
        </Link>
      </div>

      {/* AI Export Section */}
      <div className="project-card p-8" data-testid="export-section">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-sans text-lg font-medium mb-2">AI Export URL</h2>
            <p className="text-muted-foreground text-sm">
              Share this URL with any AI to let it access your portfolio data
            </p>
          </div>
        </div>

        {/* Section Filter */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">
            Include sections
          </label>
          <Select value={exportSection} onValueChange={setExportSection}>
            <SelectTrigger 
              className="w-48 bg-transparent border-white/20 rounded-sm"
              data-testid="export-section-select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10">
              <SelectItem value="all">All (Projects + Achievements)</SelectItem>
              <SelectItem value="projects">Projects only</SelectItem>
              <SelectItem value="achievements">Achievements only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* URL Box */}
        <div className="export-url-box flex items-center justify-between gap-4">
          <code className="text-sm text-muted-foreground flex-1 truncate">
            {getExportUrl()}
          </code>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            className="flex-shrink-0"
            data-testid="copy-url-button"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Preview Link */}
        <div className="mt-4 flex items-center gap-4">
          <a
            href={getExportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors duration-200"
            data-testid="preview-export-link"
          >
            Preview JSON output
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-muted-foreground">|</span>
          <Link
            to={`/profile/${user?.unique_slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors duration-200"
            data-testid="view-profile-link"
          >
            View public profile
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/dashboard/projects">
          <Button 
            className="bg-white text-black hover:bg-gray-200 rounded-sm px-6"
            data-testid="add-project-cta"
          >
            Add Project
          </Button>
        </Link>
        <Link to="/dashboard/achievements">
          <Button 
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 rounded-sm px-6"
            data-testid="add-achievement-cta"
          >
            Add Achievement
          </Button>
        </Link>
      </div>
    </div>
  );
}

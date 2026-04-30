import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  FolderKanban,
  Award,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Github,
  Trophy,
  Clock,
  Calendar,
  Flag,
  Zap,
  Timer
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
import GitHubCalendar from '@/components/GitHubCalendar';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(str) {
  const d = parseDate(str);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function formatCountdown(ms) {
  if (ms <= 0) return { label: 'Ended', urgent: false };
  const totalSecs = Math.floor(ms / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;

  if (days > 0)  return { label: `${days}d ${hours}h ${mins}m`, urgent: days < 1 };
  if (hours > 0) return { label: `${hours}h ${mins}m ${secs}s`, urgent: hours < 6 };
  return { label: `${mins}m ${secs}s`, urgent: true };
}

function progressPercent(start, end) {
  const s = parseDate(start), e = parseDate(end), now = Date.now();
  if (!s || !e) return 0;
  const total = e - s;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - s) / total) * 100));
}

// ── Hackathon Timeline Widget ─────────────────────────────────────────────────

function HackathonTimeline({ hackathons }) {
  const [now, setNow] = useState(Date.now());

  // Tick every second for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const relevant = hackathons.filter(h => h.status === 'active' || h.status === 'upcoming');
  if (relevant.length === 0) return null;

  return (
    <div className="project-card p-8 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 flex items-center justify-center border border-white/10">
          <Timer className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-sans text-base font-medium">Hackathon Timeline</h2>
          <p className="text-xs text-muted-foreground">Live countdowns for active &amp; upcoming hackathons</p>
        </div>
        <Link to="/dashboard/explore" className="ml-auto text-xs text-muted-foreground hover:text-white transition-colors">
          View all →
        </Link>
      </div>

      <div className="space-y-6">
        {relevant.map(hack => {
          const endMs   = parseDate(hack.end_date)   ? parseDate(hack.end_date) - now   : null;
          const startMs = parseDate(hack.start_date) ? parseDate(hack.start_date) - now : null;
          const subMs   = parseDate(hack.submission_deadline) ? parseDate(hack.submission_deadline) - now : null;
          const regMs   = parseDate(hack.registration_deadline) ? parseDate(hack.registration_deadline) - now : null;
          const pct     = progressPercent(hack.start_date, hack.end_date);

          const isActive = hack.status === 'active';
          const mainMs = isActive ? endMs : startMs;
          const { label: countLabel, urgent } = mainMs != null ? formatCountdown(mainMs) : { label: '—', urgent: false };

          // Build milestone list
          const milestones = [];
          if (hack.registration_deadline) milestones.push({
            key: 'reg', icon: Flag, label: 'Registration closes',
            dt: hack.registration_deadline, ms: regMs,
            done: regMs !== null && regMs <= 0,
          });
          if (hack.submission_deadline) milestones.push({
            key: 'sub', icon: Trophy, label: 'Submission deadline',
            dt: hack.submission_deadline, ms: subMs,
            done: subMs !== null && subMs <= 0,
          });
          if (hack.end_date) milestones.push({
            key: 'end', icon: Zap, label: isActive ? 'Hackathon ends' : 'Hackathon starts',
            dt: isActive ? hack.end_date : hack.start_date,
            ms: mainMs,
            done: mainMs !== null && mainMs <= 0,
          });

          return (
            <div key={hack.id} className="border border-white/10 rounded-sm overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded border font-mono flex-shrink-0 ${
                    isActive ? 'bg-green-500/10 text-green-400 border-green-500/20'
                             : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {hack.status}
                  </span>
                  <h3 className="font-sans text-sm font-medium truncate">{hack.name}</h3>
                </div>

                {/* Big countdown */}
                <div className={`text-right flex-shrink-0 ${urgent ? 'text-red-400' : isActive ? 'text-green-400' : 'text-blue-400'}`}>
                  <p className="font-mono text-lg font-semibold leading-none">{countLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isActive ? 'until end' : 'until start'}
                  </p>
                </div>
              </div>

              {/* Progress bar (only for active) */}
              {isActive && (
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatDateTime(hack.start_date)}</span>
                    <span className="font-mono">{Math.round(pct)}%</span>
                    <span>{formatDateTime(hack.end_date)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Milestone timeline */}
              {milestones.length > 0 && (
                <div className="border-t border-white/10 px-5 py-3 flex flex-col sm:flex-row gap-3 sm:gap-6">
                  {milestones.map((m, idx) => {
                    const { label: cdLabel, urgent: cdUrgent } = m.ms != null && m.ms > 0
                      ? formatCountdown(m.ms)
                      : { label: m.done ? 'Done' : '—', urgent: false };

                    return (
                      <div key={m.key} className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Connector dot */}
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          m.done ? 'bg-white/20' : cdUrgent ? 'bg-red-400' : 'bg-white/40'
                        }`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${m.done ? 'text-muted-foreground line-through' : ''}`}>
                            {m.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{formatDateTime(m.dt)}</p>
                          {!m.done && m.ms != null && m.ms > 0 && (
                            <p className={`text-xs font-mono mt-0.5 ${cdUrgent ? 'text-red-400' : 'text-muted-foreground'}`}>
                              {cdLabel}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { user, getAuthHeaders } = useAuth();
  const [projectsCount, setProjectsCount] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [hackathons, setHackathons] = useState([]);
  const [exportSection, setExportSection] = useState('all');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [projectsRes, achievementsRes, hacksRes] = await Promise.all([
          axios.get(`${API_URL}/projects`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/achievements`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/hackathons`),
        ]);
        setProjectsCount(projectsRes.data.length);
        setAchievementsCount(achievementsRes.data.length);
        setHackathons(hacksRes.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getAuthHeaders]);

  const getExportUrl = () =>
    `${API_URL}/export/${user?.unique_slug}?sections=${exportSection}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getExportUrl());
      setCopied(true);
      toast.success('URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
        <Link to="/dashboard/projects" className="project-card p-6 hover-lift" data-testid="projects-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 flex items-center justify-center border border-white/10">
              <FolderKanban className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="font-mono text-4xl font-medium mb-1">{loading ? '—' : projectsCount}</p>
          <p className="text-muted-foreground text-sm">Projects</p>
        </Link>

        <Link to="/dashboard/achievements" className="project-card p-6 hover-lift" data-testid="achievements-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 flex items-center justify-center border border-white/10">
              <Award className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="font-mono text-4xl font-medium mb-1">{loading ? '—' : achievementsCount}</p>
          <p className="text-muted-foreground text-sm">Achievements</p>
        </Link>
      </div>

      {/* Hackathon Timeline */}
      {!loading && <HackathonTimeline hackathons={hackathons} />}

      {/* GitHub Contribution Calendar */}
      {user?.github_username && (
        <div className="project-card p-8 mb-8" data-testid="github-calendar-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center border border-white/10">
              <Github className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-sans text-base font-medium">GitHub Activity</h2>
              <p className="text-xs text-muted-foreground">@{user.github_username}</p>
            </div>
          </div>
          <GitHubCalendar username={user.github_username} />
        </div>
      )}

      {/* GitHub Connect Prompt */}
      {!user?.github_username && (
        <div className="project-card p-6 mb-8 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium">Connect GitHub</p>
                <p className="text-xs text-muted-foreground">Show your contribution calendar on your dashboard</p>
              </div>
            </div>
            <Link to="/dashboard/settings">
              <Button variant="outline" className="border-white/20 rounded-sm text-sm px-4">
                Connect →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* AI Export Section */}
      <div className="project-card p-8" data-testid="export-section">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-sans text-lg font-medium mb-2">Data Export URL</h2>
            <p className="text-muted-foreground text-sm">
              Share this structured JSON URL with recruiters or tools to let them access your portfolio data
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">Include sections</label>
          <Select value={exportSection} onValueChange={setExportSection}>
            <SelectTrigger className="w-48 bg-transparent border-white/20 rounded-sm" data-testid="export-section-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10">
              <SelectItem value="all">All (Projects + Achievements)</SelectItem>
              <SelectItem value="projects">Projects only</SelectItem>
              <SelectItem value="achievements">Achievements only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="export-url-box flex items-center justify-between gap-4">
          <code className="text-sm text-muted-foreground flex-1 truncate">{getExportUrl()}</code>
          <Button variant="ghost" size="icon" onClick={copyToClipboard} className="flex-shrink-0" data-testid="copy-url-button">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

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
          <Button className="bg-white text-black hover:bg-gray-200 rounded-sm px-6" data-testid="add-project-cta">
            Add Project
          </Button>
        </Link>
        <Link to="/dashboard/achievements">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-sm px-6" data-testid="add-achievement-cta">
            Add Achievement
          </Button>
        </Link>
        <Link to="/dashboard/hackathons">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-sm px-6">
            My Hackathons
          </Button>
        </Link>
      </div>
    </div>
  );
}

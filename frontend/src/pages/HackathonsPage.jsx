import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  Plus, Pencil, Trash2, X, Loader2, ExternalLink, Github, Video,
  Trophy, Calendar, Users, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const STATUS_COLORS = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  past:     'bg-white/5 text-muted-foreground border-white/10',
  draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const emptyForm = {
  hackathon_id: '',
  team_name: '',
  title: '',
  description: '',
  readme_content: '',
  tech_stack: [],
  github_link: '',
  live_demo_link: '',
  video_link: '',
  team_members: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatCountdown(ms) {
  if (ms <= 0) return { label: 'Ended', urgent: false };
  const s = Math.floor(ms / 1000);
  const days  = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = s % 60;
  if (days > 0)  return { label: `${days}d ${hours}h ${mins}m`, urgent: days < 1 };
  if (hours > 0) return { label: `${hours}h ${mins}m ${secs}s`, urgent: hours < 6 };
  return { label: `${mins}m ${secs}s`, urgent: true };
}

function progressPercent(start, end, now) {
  const s = parseDate(start), e = parseDate(end);
  if (!s || !e) return 0;
  const total = e - s;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - s) / total) * 100));
}

// Parses emoji-sectioned / numbered / bulleted text into structured JSX
function DescriptionRenderer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const els = [];
  let prevEmpty = false;

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) {
      if (!prevEmpty) els.push(<div key={i} className="h-1.5" />);
      prevEmpty = true;
      return;
    }
    prevEmpty = false;

    const emojiMatch = t.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
    if (emojiMatch) {
      els.push(
        <div key={i} className={`flex items-start gap-2 ${i > 0 ? 'mt-2' : ''}`}>
          <span className="text-sm leading-5 flex-shrink-0">{emojiMatch[0].trim()}</span>
          <span className="text-sm font-medium text-white/90 leading-5">
            {t.slice(emojiMatch[0].length)}
          </span>
        </div>
      );
      return;
    }

    const numMatch = t.match(/^(\d+)[.)]\s+(.+)/);
    if (numMatch) {
      els.push(
        <div key={i} className="flex items-start gap-2 pl-5">
          <span className="text-xs font-mono text-muted-foreground/60 flex-shrink-0 w-4 pt-0.5">{numMatch[1]}.</span>
          <span className="text-sm text-muted-foreground leading-5">{numMatch[2]}</span>
        </div>
      );
      return;
    }

    const bulletMatch = t.match(/^[•\-\*]\s+(.+)/);
    if (bulletMatch) {
      els.push(
        <div key={i} className="flex items-start gap-2 pl-5">
          <span className="text-muted-foreground/40 flex-shrink-0 pt-1 text-xs">·</span>
          <span className="text-sm text-muted-foreground leading-5">{bulletMatch[1]}</span>
        </div>
      );
      return;
    }

    els.push(<p key={i} className="text-sm text-muted-foreground pl-5 leading-5">{t}</p>);
  });

  return <div className="space-y-0.5">{els}</div>;
}

// Parses rules text same way but shorter
function RulesRenderer({ text }) {
  if (!text) return null;
  return (
    <div className="space-y-1.5">
      {text.split('\n').filter(Boolean).map((rule, idx) => {
        const t = rule.trim();
        const num = t.match(/^(\d+)[.)]\s+(.+)/);
        if (num) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-mono text-muted-foreground/60 flex-shrink-0 w-5 pt-0.5">{num[1]}.</span>
              <p className="text-sm text-muted-foreground">{num[2]}</p>
            </div>
          );
        }
        const bullet = t.match(/^[•\-\*]\s+(.+)/);
        if (bullet) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-muted-foreground/40 flex-shrink-0 pt-1 text-xs">·</span>
              <p className="text-sm text-muted-foreground">{bullet[1]}</p>
            </div>
          );
        }
        return <p key={idx} className="text-sm text-muted-foreground">{t}</p>;
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HackathonsPage() {
  const { user, getAuthHeaders } = useAuth();

  const [hackathons, setHackathons]       = useState([]);
  const [teamCounts, setTeamCounts]       = useState({});
  const [myProjects, setMyProjects]       = useState([]);
  const [memberProjects, setMemberProjects] = useState([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [now, setNow]                     = useState(Date.now());

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Submission modal
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm]                   = useState(emptyForm);
  const [techInput, setTechInput]         = useState('');
  const [memberInput, setMemberInput]     = useState('');
  const [memberSuggestions, setMemberSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const memberSearchTimer = useState(null);
  const [saving, setSaving]               = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteOpen, setDeleteOpen]       = useState(false);

  // Expanded hackathon panels
  const [expandedHackathon, setExpandedHackathon] = useState(null);

  // GitHub Auto-fill
  const [githubRepos, setGithubRepos]     = useState([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);

  const fetchGithubRepos = async () => {
    if (!user?.github_username) return;
    setFetchingRepos(true);
    try {
      const res = await axios.get(`https://api.github.com/users/${user.github_username}/repos?sort=updated&per_page=30`);
      setGithubRepos(res.data);
      setShowRepoDropdown(true);
    } catch {
      toast.error('Failed to fetch GitHub repos.');
    } finally {
      setFetchingRepos(false);
    }
  };

  const handleSelectRepo = async (repo) => {
    setShowRepoDropdown(false);
    toast.success(`Selected ${repo.name}, fetching details…`);
    let readme = '';
    try {
      const readmeRes = await axios.get(`https://api.github.com/repos/${repo.full_name}/readme`, {
        headers: { Accept: 'application/vnd.github.raw' },
      });
      readme = readmeRes.data;
    } catch {}
    setForm(f => ({
      ...f,
      title: repo.name,
      description: repo.description || f.description,
      github_link: repo.html_url,
      live_demo_link: repo.homepage || f.live_demo_link,
      readme_content: readme || f.readme_content,
      tech_stack: repo.language && !f.tech_stack.includes(repo.language)
        ? [...f.tech_stack, repo.language] : f.tech_stack,
    }));
    toast.success('Project details autofilled!');
  };

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [hackRes, myRes, memberRes, countsRes] = await Promise.all([
        axios.get(`${API_URL}/hackathons`),
        axios.get(`${API_URL}/hackathon-projects/my`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/hackathon-projects/member`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/hackathons/team-counts`).catch(() => ({ data: {} })),
      ]);
      setHackathons(hackRes.data);
      setMyProjects(myRes.data);
      setMemberProjects(memberRes.data);
      setTeamCounts(countsRes.data || {});
    } catch {
      toast.error('Failed to load hackathon data');
    } finally {
      setLoadingData(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = (hackathon) => {
    setEditingProject(null);
    setForm({ ...emptyForm, hackathon_id: hackathon.id });
    setTechInput('');
    setMemberInput('');
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setForm({
      hackathon_id: project.hackathon_id,
      team_name: project.team_name || '',
      title: project.title,
      description: project.description,
      readme_content: project.readme_content || '',
      tech_stack: project.tech_stack || [],
      github_link: project.github_link || '',
      live_demo_link: project.live_demo_link || '',
      video_link: project.video_link || '',
      team_members: (project.team_members || []).map(m =>
        m.rezum_url ? { rezum_url: m.rezum_url } : { name: m.name }
      ),
    });
    setTechInput('');
    setMemberInput('');
    setModalOpen(true);
  };

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.tech_stack.includes(t)) {
      setForm(f => ({ ...f, tech_stack: [...f.tech_stack, t] }));
      setTechInput('');
    }
  };

  const removeTech = (t) => setForm(f => ({ ...f, tech_stack: f.tech_stack.filter(x => x !== t) }));

  const addMember = () => {
    const val = memberInput.trim();
    if (!val) return;
    const isUrl = val.includes('://') || val.includes('/profile/');
    const entry = isUrl ? { rezum_url: val } : { name: val };
    const key = isUrl ? val : val.toLowerCase();
    const exists = form.team_members.some(m =>
      (isUrl ? m.rezum_url === val : m.name?.toLowerCase() === val.toLowerCase())
    );
    if (!exists) {
      setForm(f => ({ ...f, team_members: [...f.team_members, entry] }));
      setMemberInput('');
    }
  };

  const removeMember = (entry) =>
    setForm(f => ({
      ...f,
      team_members: f.team_members.filter(m =>
        entry.rezum_url ? m.rezum_url !== entry.rezum_url : m.name !== entry.name
      )
    }));

  const handleMemberInputChange = (val) => {
    setMemberInput(val);
    clearTimeout(memberSearchTimer[0]);
    if (val.trim().length < 2 || val.includes('://')) {
      setMemberSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    memberSearchTimer[0] = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(val.trim())}`);
        setMemberSuggestions(res.data || []);
        setShowSuggestions(true);
      } catch {
        setMemberSuggestions([]);
      }
    }, 250);
  };

  const pickSuggestion = (u) => {
    const entry = { rezum_url: `${window.location.origin}/profile/${u.unique_slug}`, _displayName: u.name };
    const already = form.team_members.some(m => m.rezum_url === entry.rezum_url);
    if (!already) setForm(f => ({ ...f, team_members: [...f.team_members, entry] }));
    setMemberInput('');
    setShowSuggestions(false);
    setMemberSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_name.trim()) {
      toast.error('Team name is required');
      return;
    }
    if (!form.title || !form.description) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    try {
      if (editingProject) {
        await axios.put(`${API_URL}/hackathon-projects/${editingProject.id}`, form, { headers: getAuthHeaders() });
        toast.success('Project updated!');
      } else {
        await axios.post(`${API_URL}/hackathon-projects`, form, { headers: getAuthHeaders() });
        toast.success('Project submitted!');
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_URL}/hackathon-projects/${deleteTarget.id}`, { headers: getAuthHeaders() });
      toast.success('Project deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      const hasTime = d.includes('T') && !d.endsWith('T00:00') && !d.endsWith('T00:00:00');
      if (hasTime) {
        return dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  if (loadingData) {
    return <div className="p-8 lg:p-12 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Hackathons</p>
        <h1 className="font-serif text-3xl font-medium">My Hackathons</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Submit your team's project for any active hackathon. Team members will see the project on their dashboards too.
        </p>
      </div>

      {/* Win badges */}
      {(() => {
        const allMine = [...myProjects, ...memberProjects];
        const wins = [];
        hackathons.forEach(hack => {
          (hack.winners || []).forEach(w => {
            if (allMine.some(p => p.hackathon_id === hack.id && p.team_name === w.team_name)) {
              wins.push({ position: w.position, hackathon_name: hack.name, prize: w.prize, team_name: w.team_name });
            }
          });
        });
        const participated = new Set(allMine.map(p => p.hackathon_id)).size;
        if (wins.length === 0 && participated === 0) return null;
        return (
          <div className="flex flex-wrap gap-2 mb-10">
            {wins.sort((a, b) => a.position - b.position).map((w, i) => (
              <div key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium ${
                w.position === 1 ? 'border-yellow-400/40 bg-yellow-400/8 text-yellow-400' :
                w.position === 2 ? 'border-gray-300/40 bg-white/5 text-gray-300' :
                w.position === 3 ? 'border-orange-400/40 bg-orange-400/8 text-orange-400' :
                'border-white/20 bg-white/5 text-white/70'
              }`}>
                <Trophy className="w-3 h-3" strokeWidth={1.5} />
                {w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : w.position === 3 ? '🥉' : `#${w.position}`}
                {' '}{w.hackathon_name}
                {w.prize && <span className="opacity-70">· {w.prize}</span>}
              </div>
            ))}
            {participated > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/15 bg-white/3 text-xs text-muted-foreground">
                <Trophy className="w-3 h-3" strokeWidth={1.5} />
                {participated} hackathon{participated !== 1 ? 's' : ''} participated
              </div>
            )}
          </div>
        );
      })()}

      {/* My submissions (Leader) */}
      {myProjects.length > 0 && (
        <div className="mb-10">
          <p className="text-sm font-mono text-muted-foreground mb-4">// Your Submissions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myProjects.map(p => {
              const hack = hackathons.find(h => h.id === p.hackathon_id);
              return (
                <HackathonProjectCard
                  key={p.id}
                  project={p}
                  hackathonName={hack?.name}
                  isLeader={true}
                  onEdit={() => openEdit(p)}
                  onDelete={() => { setDeleteTarget(p); setDeleteOpen(true); }}
                  formatDate={formatDate}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Team member submissions */}
      {memberProjects.length > 0 && (
        <div className="mb-10">
          <p className="text-sm font-mono text-muted-foreground mb-4">// You're a team member in</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberProjects.map(p => {
              const hack = hackathons.find(h => h.id === p.hackathon_id);
              return (
                <HackathonProjectCard
                  key={p.id}
                  project={p}
                  hackathonName={hack?.name}
                  isLeader={false}
                  formatDate={formatDate}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Hackathons list */}
      {hackathons.length === 0 ? (
        <div className="empty-state">
          <Trophy className="w-12 h-12 text-muted-foreground/20 mb-4" strokeWidth={1} />
          <p className="text-lg mb-2">No hackathons yet</p>
          <p className="text-sm text-muted-foreground">Check back soon for upcoming hackathons.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {hackathons.map(hack => {
            const isExpanded  = expandedHackathon === hack.id;
            const isActive    = hack.status === 'active';
            const isUpcoming  = hack.status === 'upcoming';
            const teamCount   = teamCounts[hack.id] || 0;
            const mySubmission     = myProjects.find(p => p.hackathon_id === hack.id);
            const memberSubmission = memberProjects.find(p => p.hackathon_id === hack.id);
            const hasSubmitted     = !!(mySubmission || memberSubmission);

            const endMs   = parseDate(hack.end_date)   ? parseDate(hack.end_date)   - now : null;
            const startMs = parseDate(hack.start_date) ? parseDate(hack.start_date) - now : null;
            const subMs   = parseDate(hack.submission_deadline) ? parseDate(hack.submission_deadline) - now : null;
            const mainMs  = isActive ? endMs : isUpcoming ? startMs : null;
            const pct     = isActive ? progressPercent(hack.start_date, hack.end_date, now) : 0;
            const { label: countLabel, urgent } = mainMs != null && mainMs > 0
              ? formatCountdown(mainMs)
              : { label: '', urgent: false };
            const { label: subLabel, urgent: subUrgent } = subMs != null && subMs > 0
              ? formatCountdown(subMs)
              : { label: '', urgent: false };

            return (
              <div key={hack.id} className="project-card overflow-hidden">
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title + badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h2 className="font-sans text-lg font-medium">{hack.name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STATUS_COLORS[hack.status] || STATUS_COLORS.past}`}>
                          {hack.status}
                        </span>
                        {/* Already submitted badge */}
                        {mySubmission && (
                          <span className="text-xs px-2 py-0.5 rounded border font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            ✓ Submitted
                          </span>
                        )}
                        {!mySubmission && memberSubmission && (
                          <span className="text-xs px-2 py-0.5 rounded border font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            ✓ In team
                          </span>
                        )}
                        {/* Live countdown badge */}
                        {mainMs != null && mainMs > 0 && (
                          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                            urgent
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : isActive
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {isActive ? '⏱ ' : '🕐 '}{countLabel} {isActive ? 'left' : 'to start'}
                          </span>
                        )}
                        {/* Team count */}
                        {teamCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Users className="w-3 h-3" />{teamCount} team{teamCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Description — first line only when collapsed */}
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {hack.description?.split('\n')[0]}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {hack.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(hack.start_date)} — {formatDate(hack.end_date)}
                          </span>
                        )}
                        {hack.submission_deadline && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Clock className="w-3 h-3" />
                            Submit by: {formatDate(hack.submission_deadline)}
                          </span>
                        )}
                        {hack.theme && (
                          <span>Theme: <span className="text-white">{hack.theme}</span></span>
                        )}
                        {hack.prizes && (
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />{hack.prizes}
                          </span>
                        )}
                      </div>

                      {/* Progress bar — active only */}
                      {isActive && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{formatDate(hack.start_date)}</span>
                            <span className={`font-mono ${urgent ? 'text-red-400' : 'text-green-400/80'}`}>{Math.round(pct)}% elapsed</span>
                            <span>{formatDate(hack.end_date)}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {/* Submission deadline countdown */}
                          {subMs != null && subMs > 0 && (
                            <p className={`text-xs font-mono mt-2 ${subUrgent ? 'text-red-400' : 'text-yellow-400'}`}>
                              ⚠ Submission closes in {subLabel}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hack.registration_link && (
                        <Button asChild variant="outline" className="border-white/20 hover:bg-white hover:text-black rounded-sm px-4 text-sm">
                          <a href={hack.registration_link} target="_blank" rel="noopener noreferrer">Register</a>
                        </Button>
                      )}
                      {isActive && (
                        mySubmission ? (
                          <Button
                            onClick={() => openEdit(mySubmission)}
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-sm px-4 text-sm"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />Edit Submission
                          </Button>
                        ) : memberSubmission ? (
                          <span className="text-xs text-emerald-400 font-mono px-3 py-1.5 border border-emerald-500/20 rounded-sm bg-emerald-500/5">
                            ✓ In team · {memberSubmission.team_name}
                          </span>
                        ) : (
                          <Button
                            onClick={() => openCreate(hack)}
                            className="bg-white text-black hover:bg-gray-200 rounded-sm px-4 text-sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />Submit Project
                          </Button>
                        )
                      )}
                      <button
                        onClick={() => setExpandedHackathon(isExpanded ? null : hack.id)}
                        className="p-2 text-muted-foreground hover:text-white transition-colors"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/10">
                    {/* Full description */}
                    {hack.description && (
                      <div className="px-6 py-5 border-b border-white/10">
                        <p className="text-xs font-mono text-muted-foreground mb-3">// About</p>
                        <DescriptionRenderer text={hack.description} />
                      </div>
                    )}

                    {/* Prizes · Rules · Winners */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-white/10">
                      <div className="space-y-5">
                        {hack.prizes && (
                          <div>
                            <p className="text-xs font-mono text-muted-foreground mb-2">// Prizes</p>
                            <div className="bg-white/3 border border-white/8 rounded-sm p-3">
                              <p className="text-sm text-yellow-400/90 font-medium">{hack.prizes}</p>
                            </div>
                          </div>
                        )}
                        {hack.rules && (
                          <div>
                            <p className="text-xs font-mono text-muted-foreground mb-2">// Rules</p>
                            <RulesRenderer text={hack.rules} />
                          </div>
                        )}
                        {!hack.prizes && !hack.rules && (
                          <p className="text-sm text-muted-foreground">No additional details.</p>
                        )}
                      </div>

                      {/* Winners */}
                      <div>
                        <p className="text-xs font-mono text-muted-foreground mb-3">// Winners</p>
                        {hack.winners?.length > 0 ? (
                          <div className="space-y-2">
                            {hack.winners.sort((a, b) => a.position - b.position).map(w => (
                              <div key={w.position} className={`flex items-center gap-3 p-3 rounded-sm border ${
                                w.position === 1 ? 'border-yellow-400/20 bg-yellow-400/5' :
                                w.position === 2 ? 'border-gray-300/20 bg-white/3' :
                                w.position === 3 ? 'border-orange-400/20 bg-orange-400/5' :
                                'border-white/8'
                              }`}>
                                <div className={`w-8 h-8 flex items-center justify-center border font-mono text-sm flex-shrink-0 rounded-sm ${
                                  w.position === 1 ? 'border-yellow-400/50 text-yellow-400' :
                                  w.position === 2 ? 'border-gray-300/50 text-gray-300' :
                                  w.position === 3 ? 'border-orange-400/50 text-orange-400' :
                                  'border-white/10 text-muted-foreground'
                                }`}>
                                  #{w.position}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{w.team_name}</p>
                                  {w.prize && <p className="text-xs text-muted-foreground">{w.prize}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-white/10 rounded-sm p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              {hack.status === 'past'
                                ? 'No winners announced yet.'
                                : 'Winners will be announced after the hackathon ends.'}
                            </p>
                          </div>
                        )}

                        {teamCount > 0 && (
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground border border-white/8 rounded-sm px-3 py-2 bg-white/2">
                            <Users className="w-3.5 h-3.5" />
                            <span className="font-mono font-medium text-white">{teamCount}</span>
                            <span>team{teamCount !== 1 ? 's' : ''} {hack.status === 'past' ? 'participated' : 'registered'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingProject ? 'Edit Hackathon Project' : 'Submit Hackathon Project'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingProject
                ? 'Update your hackathon project details.'
                : 'Fill in your project details and add team member REZUM profile URLs.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {user?.github_username && (
              <div className="bg-white/5 p-4 rounded-sm border border-white/10 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Github className="w-4 h-4" /> Connect Repository
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fetch title, description, and README directly from your GitHub.
                    </p>
                  </div>
                  <Button type="button" onClick={fetchGithubRepos} disabled={fetchingRepos} variant="outline" className="border-white/20 h-8 text-xs px-3">
                    {fetchingRepos ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : 'Fetch Repos'}
                  </Button>
                </div>
                {showRepoDropdown && githubRepos.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto border border-white/10 rounded-sm bg-[#0a0a0a]">
                    {githubRepos.map(repo => (
                      <button
                        type="button"
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                      >
                        {repo.name}
                        <span className="text-xs text-muted-foreground ml-2">{repo.updated_at.split('T')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input
                value={form.team_name}
                onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))}
                placeholder="e.g. Team Alpha"
                className="bg-transparent border-white/20 rounded-sm"
                required
              />
              <p className="text-xs text-muted-foreground">Required — used to identify your team in results and the winners board.</p>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Project name"
                className="bg-transparent border-white/20 rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does your project do?"
                className="bg-transparent border-white/20 rounded-sm min-h-[90px]"
              />
            </div>

            <div className="space-y-2">
              <Label>README Content</Label>
              <Textarea
                value={form.readme_content}
                onChange={e => setForm(f => ({ ...f, readme_content: e.target.value }))}
                placeholder="Detailed description, setup instructions, etc."
                className="bg-transparent border-white/20 rounded-sm min-h-[120px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Tech Stack</Label>
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={e => setTechInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())}
                  placeholder="Add technology (Enter)"
                  className="bg-transparent border-white/20 rounded-sm"
                />
                <Button type="button" onClick={addTech} variant="outline" className="border-white/20 rounded-sm">Add</Button>
              </div>
              {form.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tech_stack.map((t, i) => (
                    <span key={i} className="tech-tag inline-flex items-center gap-1">
                      {t}
                      <button type="button" onClick={() => removeTech(t)}><X className="w-3 h-3 hover:text-red-400" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GitHub Link</Label>
                <Input
                  value={form.github_link}
                  onChange={e => setForm(f => ({ ...f, github_link: e.target.value }))}
                  placeholder="https://github.com/..."
                  className="bg-transparent border-white/20 rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Live Demo</Label>
                <Input
                  value={form.live_demo_link}
                  onChange={e => setForm(f => ({ ...f, live_demo_link: e.target.value }))}
                  placeholder="https://..."
                  className="bg-transparent border-white/20 rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Video Link</Label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.video_link}
                  onChange={e => setForm(f => ({ ...f, video_link: e.target.value }))}
                  placeholder="https://drive.google.com/... or https://youtu.be/..."
                  className="bg-transparent border-white/20 rounded-sm pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                Team Members
              </Label>
              <p className="text-xs text-muted-foreground">
                Type a name <span className="text-white/50">or</span> paste a REZUM profile URL — URL members get the project on their dashboard too.
              </p>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={memberInput}
                    onChange={e => handleMemberInputChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addMember(); setShowSuggestions(false); }
                      if (e.key === 'Escape') setShowSuggestions(false);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onFocus={() => memberSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search by name  or  paste a REZUM URL"
                    className="bg-transparent border-white/20 rounded-sm w-full"
                  />
                  {showSuggestions && memberSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-xl">
                      {memberSuggestions.map(u => (
                        <button
                          key={u.unique_slug}
                          type="button"
                          onMouseDown={() => pickSuggestion(u)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/8 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="w-6 h-6 rounded-sm bg-white/10 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white leading-none mb-0.5">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">/{u.unique_slug}</p>
                          </div>
                          {u.github_username && (
                            <span className="ml-auto text-[10px] text-muted-foreground font-mono flex-shrink-0">
                              @{u.github_username}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="button" onClick={() => { addMember(); setShowSuggestions(false); }} variant="outline" className="border-white/20 rounded-sm">Add</Button>
              </div>
              {form.team_members.length > 0 && (
                <div className="space-y-1 mt-2">
                  {form.team_members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-sm px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.rezum_url ? (
                          <>
                            <span className="text-[10px] font-mono px-1 py-0.5 border border-white/10 text-muted-foreground rounded">REZUM</span>
                            <span className="text-xs text-white/80">{m._displayName || m.rezum_url}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-mono px-1 py-0.5 border border-white/10 text-muted-foreground rounded">NAME</span>
                            <span className="text-xs text-white/80">{m.name}</span>
                          </>
                        )}
                      </div>
                      <button type="button" onClick={() => removeMember(m)} className="text-muted-foreground hover:text-red-400 ml-2 flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-white/20 rounded-sm">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-gray-200 rounded-sm">
                {saving ? 'Saving…' : editingProject ? 'Update' : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hackathon Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-900 hover:bg-red-800 rounded-sm">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Hackathon Project Card ────────────────────────────────────────────────────

function HackathonProjectCard({ project, hackathonName, isLeader, onEdit, onDelete, formatDate }) {
  return (
    <div className="project-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          {project.team_name && (
            <p className="text-xs font-mono text-muted-foreground mb-1">{project.team_name}</p>
          )}
          <h3 className="font-sans text-base font-medium">{project.title}</h3>
          {hackathonName && <p className="text-xs text-muted-foreground mt-0.5">{hackathonName}</p>}
        </div>
        {isLeader && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} className="text-muted-foreground hover:text-white w-7 h-7">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-red-500 w-7 h-7">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{project.description}</p>

      {project.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tech_stack.map((t, i) => <span key={i} className="tech-tag text-xs">{t}</span>)}
        </div>
      )}

      {(project.team_leader_name || project.team_members?.length > 0) && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Team</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Leader chip */}
            {project.team_leader_name && (() => {
              const name = project.team_leader_name;
              const slug = project.team_leader_slug;
              const chip = (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/8 border border-white/20 rounded-sm text-xs">
                  <span className="w-4 h-4 rounded-sm bg-white/15 flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0">
                    {name[0]?.toUpperCase()}
                  </span>
                  <span className="text-white">{name}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">leader</span>
                </div>
              );
              return slug ? (
                <a key="leader" href={`/profile/${slug}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity rounded-sm">
                  {chip}
                </a>
              ) : <span key="leader">{chip}</span>;
            })()}
            {/* Member chips */}
            {(project.team_members || []).map((m, i) => {
              const displayName = m.name || m.slug || 'Unknown';
              const profileUrl = m.slug ? `/profile/${m.slug}` : null;
              const chip = (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-xs">
                  <span className="w-4 h-4 rounded-sm bg-white/10 flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0">
                    {displayName[0]?.toUpperCase()}
                  </span>
                  <span className="text-white/80">{displayName}</span>
                </div>
              );
              return profileUrl ? (
                <a key={i} href={profileUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity rounded-sm">
                  {chip}
                </a>
              ) : <span key={i}>{chip}</span>;
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {project.github_link && (
          <a href={toAbsoluteUrl(project.github_link)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <Github className="w-3.5 h-3.5" />GitHub
          </a>
        )}
        {project.live_demo_link && (
          <a href={toAbsoluteUrl(project.live_demo_link)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />Demo
          </a>
        )}
        {project.video_link && (
          <a href={toAbsoluteUrl(project.video_link)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <Video className="w-3.5 h-3.5" />Video
          </a>
        )}
      </div>
    </div>
  );
}

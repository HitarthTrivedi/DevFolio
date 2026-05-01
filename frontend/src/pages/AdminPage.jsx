import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Pencil, Trash2, X, Trophy, Users, Eye, Save, ChevronDown, ChevronUp,
  ExternalLink, Shield, Mail, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const STATUS_OPTIONS = ['draft', 'upcoming', 'active', 'past'];
const STATUS_COLORS = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  past:     'bg-white/5 text-muted-foreground border-white/10',
  draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const emptyHackathon = {
  name: '', description: '', theme: '', rules: '', prizes: '',
  start_date: '', end_date: '', registration_deadline: '', submission_deadline: '',
  status: 'draft', registration_link: '',
};

const emptyWinner = { position: 1, team_name: '', hackathon_project_id: '', prize: '' };

// Searchable team name input backed by a datalist of registered teams
function TeamNameInput({ value, onChange, suggestions, index }) {
  const listId = `team-names-${index}`;
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        Team Name <span className="text-muted-foreground">(from registered teams)</span>
      </Label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        list={listId}
        placeholder="Search or type team name"
        className="bg-transparent border-white/20 rounded-sm h-8 text-sm"
      />
      <datalist id={listId}>
        {suggestions.map((name, i) => (
          <option key={i} value={name} />
        ))}
      </datalist>
      {suggestions.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60">{suggestions.length} registered team{suggestions.length !== 1 ? 's' : ''} — start typing to search</p>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const [hackathons, setHackathons] = useState([]);
  const [teamCounts, setTeamCounts] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hackathon form
  const [hackForm, setHackForm] = useState(emptyHackathon);
  const [hackModalOpen, setHackModalOpen] = useState(false);
  const [editingHack, setEditingHack] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Submissions viewer
  const [selectedHack, setSelectedHack] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);

  // Winners editor
  const [winnersHack, setWinnersHack] = useState(null);
  const [winners, setWinners] = useState([]);
  const [winnersOpen, setWinnersOpen] = useState(false);
  const [winnersSubmissions, setWinnersSubmissions] = useState([]);
  const [loadingWinnersData, setLoadingWinnersData] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [hackRes, countsRes, statsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/admin/hackathons`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/hackathons/team-counts`).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/admin/stats`, { headers: getAuthHeaders() }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/admin/users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);
      setHackathons(hackRes.data);
      setTeamCounts(countsRes.data || {});
      setStats(statsRes.data);
      setUsersList(usersRes.data || []);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!user?.is_admin) { navigate('/dashboard'); return; }
    fetchAdminData();
  }, [user, fetchAdminData, navigate]);

  const openCreate = () => {
    setEditingHack(null);
    setHackForm(emptyHackathon);
    setHackModalOpen(true);
  };

  const openEdit = (hack) => {
    setEditingHack(hack);
    setHackForm({
      name: hack.name,
      description: hack.description,
      theme: hack.theme || '',
      rules: hack.rules || '',
      prizes: hack.prizes || '',
      start_date: hack.start_date || '',
      end_date: hack.end_date || '',
      registration_deadline: hack.registration_deadline || '',
      submission_deadline: hack.submission_deadline || '',
      status: hack.status,
      registration_link: hack.registration_link || '',
    });
    setHackModalOpen(true);
  };

  const handleSaveHack = async (e) => {
    e.preventDefault();
    if (!hackForm.name || !hackForm.description) {
      toast.error('Name and description are required');
      return;
    }
    setSaving(true);
    try {
      if (editingHack) {
        await axios.put(`${API_URL}/admin/hackathons/${editingHack.id}`, hackForm, { headers: getAuthHeaders() });
        toast.success('Hackathon updated!');
      } else {
        await axios.post(`${API_URL}/admin/hackathons`, hackForm, { headers: getAuthHeaders() });
        toast.success('Hackathon created!');
      }
      setHackModalOpen(false);
      fetchAdminData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save hackathon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_URL}/admin/hackathons/${deleteTarget.id}`, { headers: getAuthHeaders() });
      toast.success('Hackathon deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchAdminData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openSubmissions = async (hack) => {
    setSelectedHack(hack);
    try {
      const res = await axios.get(`${API_URL}/admin/hackathons/${hack.id}/submissions`, { headers: getAuthHeaders() });
      setSubmissions(res.data);
    } catch {
      setSubmissions([]);
    }
    setSubmissionsOpen(true);
  };

  const openWinners = async (hack) => {
    setWinnersHack(hack);
    // Start with existing winners only — don't pre-populate a blank entry
    // so the user can freely remove all entries to clear winners
    setWinners(hack.winners?.length ? hack.winners.map(w => ({ ...w })) : []);
    setLoadingWinnersData(true);
    setWinnersOpen(true);
    try {
      const res = await axios.get(`${API_URL}/admin/hackathons/${hack.id}/submissions`, { headers: getAuthHeaders() });
      setWinnersSubmissions(res.data);
    } catch {
      setWinnersSubmissions([]);
    } finally {
      setLoadingWinnersData(false);
    }
  };

  const saveWinners = async () => {
    // Filter out blank-named entries; saving an empty list is intentional (clears winners)
    const toSave = winners.filter(w => w.team_name.trim());
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/admin/hackathons/${winnersHack.id}`,
        { winners: toSave },
        { headers: getAuthHeaders() }
      );
      toast.success(toSave.length ? 'Winners saved!' : 'Winners cleared.');
      setWinnersOpen(false);
      fetchAdminData();
    } catch {
      toast.error('Failed to save winners');
    } finally {
      setSaving(false);
    }
  };

  const addWinner = () => setWinners(w => [...w, { ...emptyWinner, position: w.length + 1 }]);
  const removeWinner = (i) => setWinners(w => w.filter((_, idx) => idx !== i));
  const updateWinner = (i, field, value) =>
    setWinners(w => w.map((wn, idx) => idx === i ? { ...wn, [field]: value } : wn));

  // Extract unique non-empty team names from submissions
  const registeredTeamNames = [
    ...new Set(
      winnersSubmissions
        .map(s => s.team_name?.trim())
        .filter(Boolean)
    )
  ].sort();

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  if (!user?.is_admin) return null;

  return (
    <div className="p-8 lg:p-12">
      <div className="mb-10">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Admin</p>
        <h1 className="font-serif text-3xl font-medium">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-2">Manage hackathons, submissions, and platform growth.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="project-card p-5 border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Total Members</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif">{stats?.total_users ?? '—'}</span>
            <span className="text-[10px] text-green-400 font-mono">Platform Users</span>
          </div>
        </div>
        <div className="project-card p-5 border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Hackathons</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif">{stats?.total_hackathons ?? '—'}</span>
            <span className="text-[10px] text-blue-400 font-mono">Managed Events</span>
          </div>
        </div>
        <div className="project-card p-5 border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Total Projects</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif">{stats?.total_projects ?? '—'}</span>
            <span className="text-[10px] text-purple-400 font-mono">Submissions</span>
          </div>
        </div>
        <div className="project-card p-5 border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Save className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Last Sync</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono text-muted-foreground">
              {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="hackathons">
        <TabsList className="bg-white/5 border border-white/10 rounded-sm mb-8">
          <TabsTrigger value="hackathons" className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-black">
            Hackathons
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-black">
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hackathons">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">{hackathons.length} hackathon(s)</p>
            <Button onClick={openCreate} className="bg-white text-black hover:bg-gray-200 rounded-sm px-5">
              <Plus className="w-4 h-4 mr-2" />
              New Hackathon
            </Button>
          </div>

          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : hackathons.length === 0 ? (
            <div className="empty-state">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mb-4" strokeWidth={1} />
              <p className="text-lg mb-2">No hackathons yet</p>
              <Button onClick={openCreate} className="bg-white text-black hover:bg-gray-200 rounded-sm">Create First Hackathon</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {hackathons.map(hack => {
                const count = teamCounts[hack.id] || 0;
                return (
                  <div key={hack.id} className="project-card p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h2 className="font-sans text-base font-medium">{hack.name}</h2>
                          <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STATUS_COLORS[hack.status] || STATUS_COLORS.past}`}>
                            {hack.status}
                          </span>
                          {hack.winners?.length > 0 && (
                            <span className="text-xs text-yellow-400 font-mono">
                              🏆 {hack.winners.length} winner{hack.winners.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-2 line-clamp-1">{hack.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>{formatDate(hack.start_date)} — {formatDate(hack.end_date)}</span>
                          {count > 0 && (
                            <span className="flex items-center gap-1 text-white/60">
                              <Users className="w-3 h-3" />
                              {count} team{count !== 1 ? 's' : ''} registered
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSubmissions(hack)}
                          className="border-white/20 rounded-sm text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Submissions {count > 0 && <span className="ml-1 font-mono text-muted-foreground">({count})</span>}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWinners(hack)}
                          className="border-white/20 rounded-sm text-xs"
                        >
                          <Trophy className="w-3.5 h-3.5 mr-1" />
                          Winners
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(hack)}
                          className="text-muted-foreground hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeleteTarget(hack); setDeleteOpen(true); }}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">{usersList.length} member(s) registered</p>
          </div>

          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : usersList.length === 0 ? (
            <div className="empty-state">
              <Users className="w-12 h-12 text-muted-foreground/20 mb-4" strokeWidth={1} />
              <p className="text-lg">No members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usersList.map(u => (
                <div key={u.id} className="project-card p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-sans text-base font-medium">{u.name}</h3>
                      {u.is_admin && (
                        <span className="flex items-center gap-1 text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter font-mono">
                          <Shield className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {u.email}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Joined {formatDate(u.created_at)}</span>
                      <span className="text-white/40">ID: {u.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/profile/${u.unique_slug}`)}
                      className="text-muted-foreground hover:text-white h-8 px-2"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Hackathon Modal */}
      <Dialog open={hackModalOpen} onOpenChange={setHackModalOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingHack ? 'Edit Hackathon' : 'New Hackathon'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingHack ? 'Update hackathon details.' : 'Create a new hackathon. Start as draft and publish when ready.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHack} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={hackForm.name} onChange={e => setHackForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Hackathon name" className="bg-transparent border-white/20 rounded-sm" />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={hackForm.description} onChange={e => setHackForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this hackathon about?" className="bg-transparent border-white/20 rounded-sm min-h-[90px]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Input value={hackForm.theme} onChange={e => setHackForm(f => ({ ...f, theme: e.target.value }))}
                  placeholder="e.g. AI for Good" className="bg-transparent border-white/20 rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={hackForm.status} onValueChange={v => setHackForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-transparent border-white/20 rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-white/10">
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date &amp; Time</Label>
                <DateTimePicker value={hackForm.start_date} onChange={v => setHackForm(f => ({ ...f, start_date: v }))} placeholder="Pick start date & time" />
              </div>
              <div className="space-y-2">
                <Label>End Date &amp; Time</Label>
                <DateTimePicker value={hackForm.end_date} onChange={v => setHackForm(f => ({ ...f, end_date: v }))} placeholder="Pick end date & time" />
              </div>
              <div className="space-y-2">
                <Label>Registration Deadline</Label>
                <DateTimePicker value={hackForm.registration_deadline} onChange={v => setHackForm(f => ({ ...f, registration_deadline: v }))} placeholder="Pick registration deadline" />
              </div>
              <div className="space-y-2">
                <Label>Submission Deadline</Label>
                <DateTimePicker value={hackForm.submission_deadline} onChange={v => setHackForm(f => ({ ...f, submission_deadline: v }))} placeholder="Pick submission deadline" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prizes</Label>
              <Input value={hackForm.prizes} onChange={e => setHackForm(f => ({ ...f, prizes: e.target.value }))}
                placeholder="e.g. 1st: ₹10,000 | 2nd: ₹5,000" className="bg-transparent border-white/20 rounded-sm" />
            </div>

            <div className="space-y-2">
              <Label>Registration Link (External)</Label>
              <Input value={hackForm.registration_link} onChange={e => setHackForm(f => ({ ...f, registration_link: e.target.value }))}
                placeholder="https://lu.ma/..." className="bg-transparent border-white/20 rounded-sm" />
            </div>

            <div className="space-y-2">
              <Label>Rules</Label>
              <Textarea value={hackForm.rules} onChange={e => setHackForm(f => ({ ...f, rules: e.target.value }))}
                placeholder="Rules and guidelines..." className="bg-transparent border-white/20 rounded-sm min-h-[80px]" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setHackModalOpen(false)} className="border-white/20 rounded-sm">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-gray-200 rounded-sm">
                {saving ? 'Saving...' : editingHack ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submissions Viewer Modal */}
      <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Submissions — {selectedHack?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{submissions.length} submission(s)</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {submissions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No submissions yet.</p>
            ) : submissions.map(sub => (
              <div key={sub.id} className="project-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {sub.team_name && (
                      <p className="text-xs font-mono text-muted-foreground mb-0.5">{sub.team_name}</p>
                    )}
                    <h3 className="font-sans text-base font-medium">{sub.title}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{sub.id.slice(0, 8)}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{sub.description}</p>
                {sub.tech_stack?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {sub.tech_stack.map((t, i) => <span key={i} className="tech-tag text-xs">{t}</span>)}
                  </div>
                )}
                {sub.team_members?.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Team: {sub.team_members.map(m => m.name || m.slug).join(', ')}
                  </div>
                )}
                <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
                  {sub.github_link && <a href={sub.github_link} target="_blank" rel="noopener noreferrer" className="hover:text-white">GitHub ↗</a>}
                  {sub.live_demo_link && <a href={sub.live_demo_link} target="_blank" rel="noopener noreferrer" className="hover:text-white">Demo ↗</a>}
                  {sub.video_link && <a href={sub.video_link} target="_blank" rel="noopener noreferrer" className="hover:text-white">Video ↗</a>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Winners Editor Modal */}
      <Dialog open={winnersOpen} onOpenChange={setWinnersOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Set Winners — {winnersHack?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {loadingWinnersData
                ? 'Loading registered teams…'
                : `${winnersSubmissions.length} submission(s) registered · team names auto-suggested below`}
            </DialogDescription>
          </DialogHeader>

          {/* Registered teams quick-reference */}
          {!loadingWinnersData && registeredTeamNames.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-sm p-3 text-xs text-muted-foreground">
              <p className="font-mono mb-1.5 text-muted-foreground/60">// Registered teams</p>
              <div className="flex flex-wrap gap-1.5">
                {registeredTeamNames.map(name => (
                  <span key={name} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm font-mono">{name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 space-y-4">
            {winners.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-white/10 rounded-sm">
                No winners set. Click "Add Position" to add one, or save now to clear all winners.
              </p>
            )}
            {winners.map((w, i) => (
              <div key={`winner-${i}`} className="p-4 border border-white/10 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-mono ${
                    w.position === 1 ? 'text-yellow-400' :
                    w.position === 2 ? 'text-gray-300' :
                    w.position === 3 ? 'text-orange-400' : 'text-muted-foreground'
                  }`}>
                    #{w.position === 1 ? '1st' : w.position === 2 ? '2nd' : w.position === 3 ? '3rd' : `${w.position}th`} Place
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWinner(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    aria-label="Remove winner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Position #</Label>
                  <Input
                    type="number"
                    min={1}
                    value={w.position}
                    onChange={e => updateWinner(i, 'position', parseInt(e.target.value) || 1)}
                    className="bg-transparent border-white/20 rounded-sm h-8 text-sm w-24"
                  />
                </div>

                <TeamNameInput
                  value={w.team_name}
                  onChange={v => updateWinner(i, 'team_name', v)}
                  suggestions={registeredTeamNames}
                  index={i}
                />

                <div className="space-y-1">
                  <Label className="text-xs">Prize / Note</Label>
                  <Input
                    value={w.prize}
                    onChange={e => updateWinner(i, 'prize', e.target.value)}
                    placeholder="e.g. ₹10,000 + Certificate"
                    className="bg-transparent border-white/20 rounded-sm h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hackathon Project ID (optional)</Label>
                  <Input
                    value={w.hackathon_project_id}
                    onChange={e => updateWinner(i, 'hackathon_project_id', e.target.value)}
                    placeholder="Project ID"
                    className="bg-transparent border-white/20 rounded-sm h-8 text-sm font-mono"
                  />
                </div>
              </div>
            ))}
            <Button type="button" onClick={addWinner} variant="outline" className="border-white/20 rounded-sm w-full text-sm">
              <Plus className="w-4 h-4 mr-2" />Add Position
            </Button>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setWinnersOpen(false)} className="border-white/20 rounded-sm">Cancel</Button>
            <Button onClick={saveWinners} disabled={saving} className="bg-white text-black hover:bg-gray-200 rounded-sm">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Winners'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hackathon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
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

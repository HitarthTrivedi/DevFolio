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
import { Badge } from '@/components/ui/badge';
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
  title: '',
  description: '',
  readme_content: '',
  tech_stack: [],
  github_link: '',
  live_demo_link: '',
  video_link: '',
  team_members: [],
};

export default function HackathonsPage() {
  const { getAuthHeaders } = useAuth();

  const [hackathons, setHackathons] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [memberProjects, setMemberProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Submission modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [techInput, setTechInput] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Expanded hackathon panels
  const [expandedHackathon, setExpandedHackathon] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [hackRes, myRes, memberRes] = await Promise.all([
        axios.get(`${API_URL}/hackathons`),
        axios.get(`${API_URL}/hackathon-projects/my`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/hackathon-projects/member`, { headers: getAuthHeaders() }),
      ]);
      setHackathons(hackRes.data);
      setMyProjects(myRes.data);
      setMemberProjects(memberRes.data);
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
      title: project.title,
      description: project.description,
      readme_content: project.readme_content || '',
      tech_stack: project.tech_stack || [],
      github_link: project.github_link || '',
      live_demo_link: project.live_demo_link || '',
      video_link: project.video_link || '',
      team_members: (project.team_members || []).map(m => ({ rezum_url: m.rezum_url })),
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
    const url = memberInput.trim();
    if (url && !form.team_members.find(m => m.rezum_url === url)) {
      setForm(f => ({ ...f, team_members: [...f.team_members, { rezum_url: url }] }));
      setMemberInput('');
    }
  };

  const removeMember = (url) => setForm(f => ({ ...f, team_members: f.team_members.filter(m => m.rezum_url !== url) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const myProjectIds = new Set(myProjects.map(p => p.id));

  if (loadingData) {
    return <div className="p-8 lg:p-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Hackathons</p>
        <h1 className="font-serif text-3xl font-medium">Hackathons</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Submit your team's project for any active hackathon. Team members will see the project on their dashboards too.
        </p>
      </div>

      {/* My submissions as team member */}
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
        <div className="space-y-6">
          {hackathons.map(hack => {
            const submissions = myProjects.filter(p => p.hackathon_id === hack.id);
            const isExpanded = expandedHackathon === hack.id;

            return (
              <div key={hack.id} className="project-card overflow-hidden">
                {/* Hackathon header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="font-sans text-lg font-medium">{hack.name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STATUS_COLORS[hack.status] || STATUS_COLORS.past}`}>
                          {hack.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2 whitespace-pre-line">{hack.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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
                          <span className="flex items-center gap-1">
                            Theme: <span className="text-white">{hack.theme}</span>
                          </span>
                        )}
                        {hack.prizes && (
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {hack.prizes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hack.registration_link && (
                        <Button
                          asChild
                          variant="outline"
                          className="border-white/20 hover:bg-white hover:text-black rounded-sm px-4 text-sm"
                        >
                          <a href={hack.registration_link} target="_blank" rel="noopener noreferrer">
                            Register
                          </a>
                        </Button>
                      )}
                      {hack.status === 'active' && (
                        <Button
                          onClick={() => openCreate(hack)}
                          className="bg-white text-black hover:bg-gray-200 rounded-sm px-4 text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Submit Project
                        </Button>
                      )}
                      <button
                        onClick={() => setExpandedHackathon(isExpanded ? null : hack.id)}
                        className="p-2 text-muted-foreground hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded: winners + my submissions */}
                {isExpanded && (
                  <div className="border-t border-white/10">
                    {/* Winners */}
                    {hack.winners?.length > 0 && (
                      <div className="p-6 border-b border-white/10">
                        <p className="text-sm font-mono text-muted-foreground mb-4">// Winners</p>
                        <div className="space-y-2">
                          {hack.winners.map(w => (
                            <div key={w.position} className="flex items-center gap-3 text-sm">
                              <span className="font-mono text-muted-foreground w-6">#{w.position}</span>
                              <span className="font-medium">{w.team_name}</span>
                              {w.prize && <span className="text-muted-foreground">— {w.prize}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* My submissions for this hackathon */}
                    <div className="p-6">
                      <p className="text-sm font-mono text-muted-foreground mb-4">// Your Submissions</p>
                      {submissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {hack.status === 'active'
                            ? 'No submission yet. Click "Submit Project" to add yours.'
                            : 'You did not submit a project for this hackathon.'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {submissions.map(p => (
                            <HackathonProjectCard
                              key={p.id}
                              project={p}
                              isLeader={true}
                              onEdit={() => openEdit(p)}
                              onDelete={() => { setDeleteTarget(p); setDeleteOpen(true); }}
                              formatDate={formatDate}
                            />
                          ))}
                        </div>
                      )}
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

            {/* Team members */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                Team Member REZUM URLs
              </Label>
              <p className="text-xs text-muted-foreground">
                Paste each team member's REZUM profile URL (e.g. https://rezum.app/profile/their-slug). The project will appear on their dashboards too.
              </p>
              <div className="flex gap-2">
                <Input
                  value={memberInput}
                  onChange={e => setMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
                  placeholder="https://rezum.app/profile/team-member-slug"
                  className="bg-transparent border-white/20 rounded-sm"
                />
                <Button type="button" onClick={addMember} variant="outline" className="border-white/20 rounded-sm">Add</Button>
              </div>
              {form.team_members.length > 0 && (
                <div className="space-y-1 mt-2">
                  {form.team_members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-sm px-3 py-2">
                      <span className="text-xs font-mono text-muted-foreground truncate">{m.rezum_url}</span>
                      <button type="button" onClick={() => removeMember(m.rezum_url)} className="text-muted-foreground hover:text-red-400 ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-white/20 rounded-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-gray-200 rounded-sm">
                {saving ? 'Saving...' : editingProject ? 'Update' : 'Submit'}
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

function HackathonProjectCard({ project, hackathonName, isLeader, onEdit, onDelete, formatDate }) {
  const toAbsoluteUrl = (url) => {
    if (!url) return url;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  return (
    <div className="project-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
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

      {project.team_members?.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          {project.team_members.map((m, i) => (
            <span key={i}>{m.name || m.slug}</span>
          )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`}>,</span>, el], [])}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {project.github_link && (
          <a href={toAbsoluteUrl(project.github_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <Github className="w-3.5 h-3.5" />GitHub
          </a>
        )}
        {project.live_demo_link && (
          <a href={toAbsoluteUrl(project.live_demo_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />Demo
          </a>
        )}
        {project.video_link && (
          <a href={toAbsoluteUrl(project.video_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <Video className="w-3.5 h-3.5" />Video
          </a>
        )}
      </div>
    </div>
  );
}

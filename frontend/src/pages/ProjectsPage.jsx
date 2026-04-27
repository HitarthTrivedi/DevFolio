import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Github,
  X,
  Video,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const formatRepoName = (name) =>
  name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const emptyProject = {
  title: '',
  description: '',
  readme_content: '',
  tech_stack: [],
  github_link: '',
  live_demo_link: '',
  video_link: ''
};

export default function ProjectsPage() {
  const { getAuthHeaders, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [formData, setFormData] = useState(emptyProject);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);

  // GitHub import state
  const [repos, setRepos] = useState([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`, {
        headers: getAuthHeaders()
      });
      setProjects(response.data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filter repos as user types
  useEffect(() => {
    if (!repos.length) { setFilteredRepos([]); return; }
    const q = repoSearch.trim().toLowerCase();
    const results = q
      ? repos.filter(r =>
          r.name.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q)
        )
      : repos;
    setFilteredRepos(results.slice(0, 8));
  }, [repoSearch, repos]);

  const fetchRepos = async () => {
    if (!user?.github_username || repos.length > 0) return;
    setReposLoading(true);
    try {
      const { data } = await axios.get(
        `https://api.github.com/users/${user.github_username}/repos?per_page=100&sort=updated`
      );
      setRepos(data);
    } catch {
      // GitHub API unavailable or rate limited — silent fail, user can type manually
    } finally {
      setReposLoading(false);
    }
  };

  const importFromGitHub = async (repo) => {
    setShowDropdown(false);
    setRepoSearch(repo.name);
    setImportLoading(true);

    try {
      // Fetch README and languages in parallel
      const [readmeRes, langsRes] = await Promise.allSettled([
        axios.get(`https://api.github.com/repos/${repo.full_name}/readme`),
        axios.get(`https://api.github.com/repos/${repo.full_name}/languages`),
      ]);

      const readmeContent =
        readmeRes.status === 'fulfilled'
          ? atob(readmeRes.value.data.content.replace(/\n/g, ''))
          : '';

      const languages =
        langsRes.status === 'fulfilled'
          ? Object.keys(langsRes.value.data)
          : [];

      setFormData((prev) => ({
        ...prev,
        title: formatRepoName(repo.name),
        description: repo.description || '',
        readme_content: readmeContent,
        tech_stack: languages,
        github_link: repo.html_url,
        live_demo_link: repo.homepage || '',
      }));

      toast.success(`Imported "${repo.name}"`);
    } catch {
      toast.error('Failed to import repository details');
    } finally {
      setImportLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData(emptyProject);
    setTechInput('');
    setRepoSearch('');
    setShowDropdown(false);
    setModalOpen(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      readme_content: project.readme_content || '',
      tech_stack: project.tech_stack || [],
      github_link: project.github_link || '',
      live_demo_link: project.live_demo_link || '',
      video_link: project.video_link || ''
    });
    setTechInput('');
    setRepoSearch('');
    setShowDropdown(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Title and description are required');
      return;
    }

    setSaving(true);
    try {
      if (editingProject) {
        await axios.put(
          `${API_URL}/projects/${editingProject.id}`,
          formData,
          { headers: getAuthHeaders() }
        );
        toast.success('Project updated!');
      } else {
        await axios.post(
          `${API_URL}/projects`,
          formData,
          { headers: getAuthHeaders() }
        );
        toast.success('Project created!');
      }
      setModalOpen(false);
      fetchProjects();
    } catch {
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await axios.delete(
        `${API_URL}/projects/${projectToDelete.id}`,
        { headers: getAuthHeaders() }
      );
      toast.success('Project deleted');
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const addTech = () => {
    if (techInput.trim() && !formData.tech_stack.includes(techInput.trim())) {
      setFormData({ ...formData, tech_stack: [...formData.tech_stack, techInput.trim()] });
      setTechInput('');
    }
  };

  const removeTech = (tech) => {
    setFormData({ ...formData, tech_stack: formData.tech_stack.filter(t => t !== tech) });
  };

  return (
    <div className="p-8 lg:p-12" data-testid="projects-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-mono text-muted-foreground mb-2">// Projects</p>
          <h1 className="font-serif text-3xl font-medium">Your Projects</h1>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-white text-black hover:bg-gray-200 rounded-sm px-6 w-fit"
          data-testid="add-project-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state" data-testid="empty-projects">
          <div className="font-mono text-6xl text-muted-foreground/20 mb-4">{'{ }'}</div>
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first project to get started
          </p>
          <Button onClick={openCreateModal} className="bg-white text-black hover:bg-gray-200 rounded-sm">
            Add Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="project-card p-6" data-testid={`project-card-${project.id}`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-sans text-lg font-medium">{project.title}</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(project)} className="text-muted-foreground hover:text-white" data-testid={`edit-project-${project.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setProjectToDelete(project); setDeleteDialogOpen(true); }} className="text-muted-foreground hover:text-red-500" data-testid={`delete-project-${project.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{project.description}</p>

              {project.tech_stack?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack.map((tech, idx) => (
                    <span key={idx} className="tech-tag">{tech}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {project.github_link && (
                  <a href={toAbsoluteUrl(project.github_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors">
                    <Github className="w-4 h-4" />GitHub
                  </a>
                )}
                {project.live_demo_link && (
                  <a href={toAbsoluteUrl(project.live_demo_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" />Demo
                  </a>
                )}
                {project.video_link && (
                  <a href={toAbsoluteUrl(project.video_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors">
                    <Video className="w-4 h-4" />Video
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingProject ? 'Edit Project' : 'Add Project'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingProject ? 'Update your project details below.' : 'Add a new project to your portfolio.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">

            {/* GitHub Import — only when creating, only if GitHub connected */}
            {!editingProject && (
              <div className="pb-6 border-b border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Github className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Import from GitHub</span>
                </div>

                {user?.github_username ? (
                  <div className="relative">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        onFocus={() => { fetchRepos(); setShowDropdown(true); }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        placeholder="Search your repositories..."
                        className="bg-transparent border-white/20 rounded-sm pl-9 pr-9"
                      />
                      {(reposLoading || importLoading) && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Dropdown */}
                    {showDropdown && filteredRepos.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d0d] border border-white/10 rounded-sm z-50 max-h-60 overflow-y-auto shadow-xl">
                        {filteredRepos.map((repo) => (
                          <button
                            key={repo.id}
                            type="button"
                            onMouseDown={() => importFromGitHub(repo)}
                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium truncate">{repo.name}</span>
                              <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                                {repo.language || ''}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {repo.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {showDropdown && !reposLoading && repos.length > 0 && filteredRepos.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d0d] border border-white/10 rounded-sm z-50 px-4 py-3">
                        <p className="text-sm text-muted-foreground">No repositories match "{repoSearch}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <a href="/dashboard/settings" className="text-white hover:underline">Connect GitHub in Settings</a> to import repositories automatically.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="My Awesome Project"
                className="bg-transparent border-white/20 rounded-sm"
                data-testid="project-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of your project"
                className="bg-transparent border-white/20 rounded-sm min-h-[100px]"
                data-testid="project-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="readme">README Content</Label>
              <Textarea
                id="readme"
                value={formData.readme_content}
                onChange={(e) => setFormData({ ...formData, readme_content: e.target.value })}
                placeholder="Paste your README content here (markdown supported)"
                className="bg-transparent border-white/20 rounded-sm min-h-[150px] font-mono text-sm"
                data-testid="project-readme-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Tech Stack</Label>
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                  placeholder="Add technology (press Enter)"
                  className="bg-transparent border-white/20 rounded-sm"
                  data-testid="project-tech-input"
                />
                <Button type="button" onClick={addTech} variant="outline" className="border-white/20 rounded-sm">
                  Add
                </Button>
              </div>
              {formData.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tech_stack.map((tech, idx) => (
                    <span key={idx} className="tech-tag inline-flex items-center gap-1">
                      {tech}
                      <button type="button" onClick={() => removeTech(tech)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="github">GitHub Link</Label>
                <Input
                  id="github"
                  value={formData.github_link}
                  onChange={(e) => setFormData({ ...formData, github_link: e.target.value })}
                  placeholder="https://github.com/..."
                  className="bg-transparent border-white/20 rounded-sm"
                  data-testid="project-github-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo">Live Demo Link</Label>
                <Input
                  id="demo"
                  value={formData.live_demo_link}
                  onChange={(e) => setFormData({ ...formData, live_demo_link: e.target.value })}
                  placeholder="https://..."
                  className="bg-transparent border-white/20 rounded-sm"
                  data-testid="project-demo-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">
                Video Link
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (Google Drive, YouTube, Instagram Reel, etc.)
                </span>
              </Label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="video"
                  value={formData.video_link}
                  onChange={(e) => setFormData({ ...formData, video_link: e.target.value })}
                  placeholder="https://drive.google.com/... or https://youtu.be/..."
                  className="bg-transparent border-white/20 rounded-sm pl-10"
                  data-testid="project-video-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-white/20 rounded-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={saving || importLoading} className="bg-white text-black hover:bg-gray-200 rounded-sm" data-testid="save-project-button">
                {saving ? 'Saving...' : editingProject ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-900 hover:bg-red-800 rounded-sm" data-testid="confirm-delete-button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

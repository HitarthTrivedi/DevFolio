import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Github,
  X
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

const emptyProject = {
  title: '',
  description: '',
  readme_content: '',
  tech_stack: [],
  github_link: '',
  live_demo_link: ''
};

export default function ProjectsPage() {
  const { getAuthHeaders } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [formData, setFormData] = useState(emptyProject);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`, {
        headers: getAuthHeaders()
      });
      setProjects(response.data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData(emptyProject);
    setTechInput('');
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
      live_demo_link: project.live_demo_link || ''
    });
    setTechInput('');
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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const addTech = () => {
    if (techInput.trim() && !formData.tech_stack.includes(techInput.trim())) {
      setFormData({
        ...formData,
        tech_stack: [...formData.tech_stack, techInput.trim()]
      });
      setTechInput('');
    }
  };

  const removeTech = (tech) => {
    setFormData({
      ...formData,
      tech_stack: formData.tech_stack.filter(t => t !== tech)
    });
  };

  return (
    <div className="p-8 lg:p-12" data-testid="projects-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm font-mono text-muted-foreground mb-2">// Projects</p>
          <h1 className="font-serif text-3xl font-medium">Your Projects</h1>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-white text-black hover:bg-gray-200 rounded-sm px-6"
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
          <Button
            onClick={openCreateModal}
            className="bg-white text-black hover:bg-gray-200 rounded-sm"
          >
            Add Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card p-6"
              data-testid={`project-card-${project.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-sans text-lg font-medium">{project.title}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(project)}
                    className="text-muted-foreground hover:text-white"
                    data-testid={`edit-project-${project.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setProjectToDelete(project);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-muted-foreground hover:text-red-500"
                    data-testid={`delete-project-${project.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                {project.description}
              </p>

              {/* Tech Stack */}
              {project.tech_stack?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack.map((tech, idx) => (
                    <span key={idx} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Links */}
              <div className="flex items-center gap-4">
                {project.github_link && (
                  <a
                    href={project.github_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {project.live_demo_link && (
                  <a
                    href={project.live_demo_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Demo
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
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                  placeholder="Add technology (press Enter)"
                  className="bg-transparent border-white/20 rounded-sm"
                  data-testid="project-tech-input"
                />
                <Button
                  type="button"
                  onClick={addTech}
                  variant="outline"
                  className="border-white/20 rounded-sm"
                >
                  Add
                </Button>
              </div>
              {formData.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tech_stack.map((tech, idx) => (
                    <span key={idx} className="tech-tag inline-flex items-center gap-1">
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTech(tech)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-white/20 rounded-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-white text-black hover:bg-gray-200 rounded-sm"
                data-testid="save-project-button"
              >
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
            <AlertDialogCancel className="border-white/20 rounded-sm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-900 hover:bg-red-800 rounded-sm"
              data-testid="confirm-delete-button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

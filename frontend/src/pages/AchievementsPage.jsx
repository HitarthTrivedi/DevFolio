import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar
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

const emptyAchievement = {
  title: '',
  description: '',
  date: '',
  certificate_link: ''
};

export default function AchievementsPage() {
  const { getAuthHeaders } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [achievementToDelete, setAchievementToDelete] = useState(null);
  const [formData, setFormData] = useState(emptyAchievement);
  const [saving, setSaving] = useState(false);

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/achievements`, {
        headers: getAuthHeaders()
      });
      setAchievements(response.data);
    } catch (error) {
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const openCreateModal = () => {
    setEditingAchievement(null);
    setFormData(emptyAchievement);
    setModalOpen(true);
  };

  const openEditModal = (achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      title: achievement.title,
      description: achievement.description,
      date: achievement.date || '',
      certificate_link: achievement.certificate_link || ''
    });
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
      if (editingAchievement) {
        await axios.put(
          `${API_URL}/achievements/${editingAchievement.id}`,
          formData,
          { headers: getAuthHeaders() }
        );
        toast.success('Achievement updated!');
      } else {
        await axios.post(
          `${API_URL}/achievements`,
          formData,
          { headers: getAuthHeaders() }
        );
        toast.success('Achievement created!');
      }
      setModalOpen(false);
      fetchAchievements();
    } catch (error) {
      toast.error('Failed to save achievement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!achievementToDelete) return;

    try {
      await axios.delete(
        `${API_URL}/achievements/${achievementToDelete.id}`,
        { headers: getAuthHeaders() }
      );
      toast.success('Achievement deleted');
      setDeleteDialogOpen(false);
      setAchievementToDelete(null);
      fetchAchievements();
    } catch (error) {
      toast.error('Failed to delete achievement');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-8 lg:p-12" data-testid="achievements-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm font-mono text-muted-foreground mb-2">// Achievements</p>
          <h1 className="font-serif text-3xl font-medium">Your Achievements</h1>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-white text-black hover:bg-gray-200 rounded-sm px-6"
          data-testid="add-achievement-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Achievement
        </Button>
      </div>

      {/* Achievements List */}
      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : achievements.length === 0 ? (
        <div className="empty-state" data-testid="empty-achievements">
          <div className="font-mono text-6xl text-muted-foreground/20 mb-4">{'[ ]'}</div>
          <p className="text-lg mb-2">No achievements yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first achievement to showcase your accomplishments
          </p>
          <Button
            onClick={openCreateModal}
            className="bg-white text-black hover:bg-gray-200 rounded-sm"
          >
            Add Achievement
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="project-card p-6 flex items-start justify-between"
              data-testid={`achievement-card-${achievement.id}`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-sans text-lg font-medium mb-2">{achievement.title}</h3>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {achievement.description}
                </p>

                <div className="flex items-center gap-4 text-sm">
                  {achievement.date && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(achievement.date)}
                    </span>
                  )}
                  {achievement.certificate_link && (
                    <a
                      href={achievement.certificate_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Certificate
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditModal(achievement)}
                  className="text-muted-foreground hover:text-white"
                  data-testid={`edit-achievement-${achievement.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAchievementToDelete(achievement);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-muted-foreground hover:text-red-500"
                  data-testid={`delete-achievement-${achievement.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingAchievement ? 'Edit Achievement' : 'Add Achievement'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingAchievement ? 'Update your achievement details below.' : 'Add a new achievement to your portfolio.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="AWS Certified Solutions Architect"
                className="bg-transparent border-white/20 rounded-sm"
                data-testid="achievement-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your achievement"
                className="bg-transparent border-white/20 rounded-sm min-h-[100px]"
                data-testid="achievement-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-transparent border-white/20 rounded-sm"
                data-testid="achievement-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate">Certificate Link</Label>
              <Input
                id="certificate"
                value={formData.certificate_link}
                onChange={(e) => setFormData({ ...formData, certificate_link: e.target.value })}
                placeholder="https://..."
                className="bg-transparent border-white/20 rounded-sm"
                data-testid="achievement-certificate-input"
              />
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
                data-testid="save-achievement-button"
              >
                {saving ? 'Saving...' : editingAchievement ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Achievement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{achievementToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 rounded-sm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-900 hover:bg-red-800 rounded-sm"
              data-testid="confirm-delete-achievement"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

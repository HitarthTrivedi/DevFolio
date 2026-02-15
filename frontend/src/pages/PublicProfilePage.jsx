import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Github, 
  ExternalLink, 
  Calendar, 
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PublicProfilePage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/profile/${slug}`);
        setProfile(response.data);
      } catch (err) {
        setError('Profile not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [slug]);

  const exportUrl = `${process.env.REACT_APP_BACKEND_URL}/api/export/${slug}`;

  const copyExportUrl = async () => {
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      toast.success('Export URL copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-6xl text-muted-foreground/20 mb-4">404</div>
          <h1 className="font-serif text-2xl mb-4">Profile not found</h1>
          <p className="text-muted-foreground mb-8">
            The profile you're looking for doesn't exist.
          </p>
          <Link to="/">
            <Button className="bg-white text-black hover:bg-gray-200 rounded-sm">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const projectsCount = profile?.projects?.length || 0;
  const achievementsCount = profile?.achievements?.length || 0;

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* Animated Background */}
      <div className="absolute inset-0 animated-gradient opacity-20" />
      <div className="absolute inset-0 spotlight" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-serif text-xl font-medium">DevFolio</span>
            </Link>
            
            <Button
              onClick={copyExportUrl}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 rounded-sm text-sm"
              data-testid="copy-export-url-button"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy AI Export URL
                </>
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <p className="text-sm font-mono text-muted-foreground mb-4">
              // {slug}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-4" data-testid="profile-name">
              {profile?.name}
            </h1>
            <p className="text-muted-foreground">
              {projectsCount} {projectsCount === 1 ? 'project' : 'projects'} · {achievementsCount} {achievementsCount === 1 ? 'achievement' : 'achievements'}
            </p>
          </header>

          {/* Tabs */}
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-transparent border-b border-white/10 rounded-none w-full justify-start h-auto p-0 mb-8">
              <TabsTrigger 
                value="projects" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-6 py-3 text-sm"
                data-testid="projects-tab"
              >
                Projects
              </TabsTrigger>
              <TabsTrigger 
                value="achievements" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-6 py-3 text-sm"
                data-testid="achievements-tab"
              >
                Achievements
              </TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects" data-testid="projects-content">
              {projectsCount === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No projects yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.projects.map((project, idx) => (
                    <article 
                      key={project.id || idx} 
                      className="project-card p-6"
                      data-testid={`public-project-${idx}`}
                    >
                      <h3 className="font-sans text-lg font-medium mb-3">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {project.description}
                      </p>
                      
                      {/* Tech Stack */}
                      {project.tech_stack?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tech_stack.map((tech, techIdx) => (
                            <span key={techIdx} className="tech-tag">
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
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" data-testid="achievements-content">
              {achievementsCount === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No achievements yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.achievements.map((achievement, idx) => (
                    <article 
                      key={achievement.id || idx} 
                      className="project-card p-6"
                      data-testid={`public-achievement-${idx}`}
                    >
                      <h3 className="font-sans text-lg font-medium mb-2">
                        {achievement.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
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
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <Link to="/" className="text-white hover:underline">DevFolio</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

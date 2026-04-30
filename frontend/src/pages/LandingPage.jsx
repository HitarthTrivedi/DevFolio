import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Link2, FileJson, Github, LayoutDashboard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 animated-gradient opacity-30" />
      
      {/* Spotlight Effect */}
      <div className="absolute inset-0 spotlight" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-serif text-xl font-semibold tracking-widest">REZUM</span>
            </Link>
            
            <div className="flex items-center gap-6">
              {!loading && user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center border border-white/20 rounded-sm bg-white/5">
                      <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <Link to="/dashboard">
                    <Button
                      className="bg-white text-black hover:bg-gray-200 rounded-sm px-6 font-medium inline-flex items-center gap-2"
                      data-testid="nav-dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link text-sm font-medium" data-testid="nav-login">
                    Sign In
                  </Link>
                  <Link to="/register">
                    <Button
                      className="bg-white text-black hover:bg-gray-200 rounded-sm px-6 font-medium"
                      data-testid="nav-register"
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-mono text-muted-foreground mb-4 fade-in opacity-0 stagger-1">
              // Your work, perfectly structured
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.1] mb-6 fade-in opacity-0 stagger-2">
              The minimalist portfolio for
              <span className="block text-muted-foreground">modern developers.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-10 fade-in opacity-0 stagger-3">
              Upload your projects and achievements in one place. Get a clean public profile and a unique URL to share your structured data with any tool or platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 fade-in opacity-0 stagger-4">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button
                      className="bg-white text-black hover:bg-gray-200 rounded-sm px-8 py-6 text-base font-medium inline-flex items-center gap-2"
                      data-testid="hero-cta"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link to={`/profile/${user.unique_slug}`} target="_blank">
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/5 rounded-sm px-8 py-6 text-base"
                      data-testid="hero-profile"
                    >
                      View My Profile
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register">
                    <Button
                      className="bg-white text-black hover:bg-gray-200 rounded-sm px-8 py-6 text-base font-medium inline-flex items-center gap-2"
                      data-testid="hero-cta"
                    >
                      Start Building
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/profile/demo-user-1234">
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/5 rounded-sm px-8 py-6 text-base"
                      data-testid="hero-demo"
                    >
                      View Demo Profile
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <p className="text-sm font-mono text-muted-foreground mb-4">// Features</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium">
              Simple, clean, and shareable
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="project-card p-8 fade-in opacity-0 stagger-1" data-testid="feature-card-1">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 mb-6">
                <Zap className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-medium mb-3">One-Link Sharing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Generate a unique URL for your portfolio data. Share it with recruiters, platforms, or tools to let them access your complete work history instantly.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="project-card p-8 fade-in opacity-0 stagger-2" data-testid="feature-card-2">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 mb-6">
                <Link2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-medium mb-3">Modular Export</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Choose what to show. Export only projects, only achievements, or your entire history. You have full control over your public data.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="project-card p-8 fade-in opacity-0 stagger-3" data-testid="feature-card-3">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 mb-6">
                <FileJson className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-medium mb-3">Clean JSON Format</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Need your data in a machine-readable format? Our clean JSON export is optimized for any developer tool or AI agent you want to use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <p className="text-sm font-mono text-muted-foreground mb-4">// How it works</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium">
              Your professional snapshot
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="fade-in opacity-0 stagger-1">
              <div className="font-mono text-4xl text-muted-foreground/30 mb-4">01</div>
              <h3 className="font-sans text-lg font-medium mb-3">Centralize Your Work</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upload projects with READMEs and tech stacks. Add achievements and links to certificates in one dashboard.
              </p>
            </div>
            
            <div className="fade-in opacity-0 stagger-2">
              <div className="font-mono text-4xl text-muted-foreground/30 mb-4">02</div>
              <h3 className="font-sans text-lg font-medium mb-3">Get a Permanent Link</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Each profile gets a unique, permanent URL. Copy it from your dashboard whenever you need to share your history.
              </p>
            </div>
            
            <div className="fade-in opacity-0 stagger-3">
              <div className="font-mono text-4xl text-muted-foreground/30 mb-4">03</div>
              <h3 className="font-sans text-lg font-medium mb-3">Share Anywhere</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Paste your export URL into AI tools, resume builders, or send it directly to recruiters for a detailed view of your work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-6">
            Ready to simplify your portfolio?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-10">
            Stop manually copying your project details. Keep your history in a format that works for you and your tools.
          </p>
          <Link to="/register">
            <Button 
              className="bg-white text-black hover:bg-gray-200 rounded-sm px-10 py-6 text-base font-medium"
              data-testid="cta-button"
            >
              Get Started with REZUM
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg tracking-widest">REZUM</span>
              <span className="text-muted-foreground text-sm">— your work, structured</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-white transition-colors duration-200"
              >
                <Github className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <span className="text-muted-foreground text-sm">
                {new Date().getFullYear()} All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Link2, FileJson, Github, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
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
              <span className="font-serif text-xl font-semibold tracking-tight">DevFolio</span>
            </Link>
            
            <div className="flex items-center gap-6">
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
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-mono text-muted-foreground mb-4 fade-in opacity-0 stagger-1">
              // Your portfolio, AI-ready
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.1] mb-6 fade-in opacity-0 stagger-2">
              Share your work with
              <span className="block text-muted-foreground">any AI, instantly.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-10 fade-in opacity-0 stagger-3">
              Upload your projects and achievements once. Get a unique URL that any AI agent can read. 
              Generate resumes, portfolios, or cover letters without manual input.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 fade-in opacity-0 stagger-4">
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
              Built for the AI age
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="project-card p-8 fade-in opacity-0 stagger-1" data-testid="feature-card-1">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 mb-6">
                <Zap className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-medium mb-3">One-Click Export</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Generate a unique URL for your portfolio. Share it with ChatGPT, Claude, or any AI to let them access your complete work history.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="project-card p-8 fade-in opacity-0 stagger-2" data-testid="feature-card-2">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 mb-6">
                <Link2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-medium mb-3">Section Filtering</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Choose what to share. Export only projects, only achievements, or both. Control exactly what AI sees.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="project-card p-8 fade-in opacity-0 stagger-3" data-testid="feature-card-3">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 mb-6">
                <FileJson className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-medium mb-3">Structured Data</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Clean JSON output optimized for AI consumption. Your README, tech stack, and links—all perfectly formatted.
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
              Three steps to AI-ready
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="fade-in opacity-0 stagger-1">
              <div className="font-mono text-4xl text-muted-foreground/30 mb-4">01</div>
              <h3 className="font-sans text-lg font-medium mb-3">Add Your Work</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upload projects with README content, tech stack, and links. Add achievements with dates and certificates.
              </p>
            </div>
            
            <div className="fade-in opacity-0 stagger-2">
              <div className="font-mono text-4xl text-muted-foreground/30 mb-4">02</div>
              <h3 className="font-sans text-lg font-medium mb-3">Get Your URL</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Each profile gets a unique, permanent URL. Copy it from your dashboard whenever you need it.
              </p>
            </div>
            
            <div className="fade-in opacity-0 stagger-3">
              <div className="font-mono text-4xl text-muted-foreground/30 mb-4">03</div>
              <h3 className="font-sans text-lg font-medium mb-3">Share with AI</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Paste your export URL into any AI chat. Ask it to create resumes, cover letters, or portfolio pages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-6">
            Ready to simplify your workflow?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-10">
            Stop copying and pasting your project details. Let AI do the heavy lifting.
          </p>
          <Link to="/register">
            <Button 
              className="bg-white text-black hover:bg-gray-200 rounded-sm px-10 py-6 text-base font-medium"
              data-testid="cta-button"
            >
              Create Your DevFolio
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg">DevFolio</span>
              <span className="text-muted-foreground text-sm">— AI-ready portfolios</span>
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

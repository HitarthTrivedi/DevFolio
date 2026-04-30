import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Award,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Trophy,
  Compass,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const mainNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/dashboard/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/dashboard/achievements', icon: Award, label: 'Achievements' },
    { to: '/dashboard/hackathons', icon: Trophy, label: 'Hackathons' },
    { to: '/dashboard/explore', icon: Compass, label: 'Explore' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const adminNavItems = user?.is_admin
    ? [{ to: '/dashboard/admin', icon: ShieldCheck, label: 'Admin Panel' }]
    : [];

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const NavItem = ({ item }) => (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-medium">{item.label}</span>
      </NavLink>
    </li>
  );

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 glass border-b border-white/10">
        <NavLink to="/" className="font-serif text-lg font-medium tracking-widest">
          REZUM
        </NavLink>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-muted-foreground hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-60 border-r border-white/10 flex flex-col bg-[#050505] z-50 transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <NavLink
            to="/"
            className="font-serif text-xl font-medium tracking-widest hover:opacity-80 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          >
            REZUM
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {mainNavItems.map(item => <NavItem key={item.to} item={item} />)}
          </ul>

          {adminNavItems.length > 0 && (
            <>
              <div className="my-4 border-t border-white/8" />
              <p className="px-3 mb-1.5 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Admin
              </p>
              <ul className="space-y-0.5">
                {adminNavItems.map(item => <NavItem key={item.to} item={item} />)}
              </ul>
            </>
          )}
        </nav>

        {/* Public profile link */}
        {user?.unique_slug && (
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Public Profile</p>
            <NavLink
              to={`/profile/${user.unique_slug}`}
              target="_blank"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
              data-testid="public-profile-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="truncate font-mono text-xs">/{user.unique_slug}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
            </NavLink>
          </div>
        )}

        {/* User Info & Logout */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-mono font-medium text-white/80">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white/90">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="flex-shrink-0 w-7 h-7 text-muted-foreground hover:text-white"
              data-testid="logout-button"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

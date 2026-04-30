import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, Users, Flag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const STATUS_COLORS = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  past:     'bg-white/5 text-muted-foreground border-white/10',
  draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const WINNER_STYLE = {
  1: 'border-yellow-400/30 bg-yellow-400/5',
  2: 'border-gray-300/30 bg-white/3',
  3: 'border-orange-400/30 bg-orange-400/5',
};

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
          <span className="text-base leading-5 flex-shrink-0">{emojiMatch[0].trim()}</span>
          <span className="text-sm font-medium text-white/90 leading-5">{t.slice(emojiMatch[0].length)}</span>
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

export default function PublicHackathonPage() {
  const { id } = useParams();
  const [hack, setHack] = useState(null);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/hackathons/${id}`),
      axios.get(`${API_URL}/hackathons/team-counts`).catch(() => ({ data: {} })),
    ])
      .then(([hackRes, countsRes]) => {
        setHack(hackRes.data);
        setTeamCount((countsRes.data || {})[id] || 0);
      })
      .catch(() => toast.error('Hackathon not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDateTime = (str) => {
    const d = parseDate(str);
    if (!d) return '—';
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );

  if (!hack) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
      <p className="font-mono text-6xl text-muted-foreground/20">404</p>
      <h1 className="font-serif text-2xl">Hackathon not found</h1>
      <Link to="/hackathons"><Button className="bg-white text-black rounded-sm">Browse Hackathons</Button></Link>
    </div>
  );

  const isActive   = hack.status === 'active';
  const isUpcoming = hack.status === 'upcoming';
  const endMs      = parseDate(hack.end_date)   ? parseDate(hack.end_date)   - now : null;
  const startMs    = parseDate(hack.start_date) ? parseDate(hack.start_date) - now : null;
  const subMs      = parseDate(hack.submission_deadline) ? parseDate(hack.submission_deadline) - now : null;
  const regMs      = parseDate(hack.registration_deadline) ? parseDate(hack.registration_deadline) - now : null;
  const mainMs     = isActive ? endMs : isUpcoming ? startMs : null;
  const pct        = isActive ? progressPercent(hack.start_date, hack.end_date, now) : 0;
  const { label: countLabel, urgent } = mainMs != null && mainMs > 0
    ? formatCountdown(mainMs) : { label: '', urgent: false };

  const sortedWinners = [...(hack.winners || [])].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-[#050505] relative">
      <div className="absolute inset-0 animated-gradient opacity-10" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="font-serif text-xl font-medium tracking-widest">REZUM</Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/hackathons" className="hover:text-white transition-colors">All Hackathons</Link>
            <Link to="/hall-of-fame" className="hover:text-white transition-colors">Hall of Fame</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STATUS_COLORS[hack.status] || STATUS_COLORS.past}`}>
                {hack.status}
              </span>
              {hack.theme && (
                <span className="text-xs border border-white/15 px-2 py-0.5 rounded-sm text-muted-foreground">
                  {hack.theme}
                </span>
              )}
              {teamCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Users className="w-3 h-3" />{teamCount} team{teamCount !== 1 ? 's' : ''} registered
                </span>
              )}
            </div>
            <h1 className="font-serif text-4xl font-medium mb-4">{hack.name}</h1>

            {/* Live countdown hero */}
            {mainMs != null && mainMs > 0 && (
              <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-sm border mb-6 ${
                urgent ? 'border-red-500/30 bg-red-500/10'
                : isActive ? 'border-green-500/30 bg-green-500/10'
                : 'border-blue-500/30 bg-blue-500/10'
              }`}>
                <Clock className={`w-4 h-4 ${urgent ? 'text-red-400' : isActive ? 'text-green-400' : 'text-blue-400'}`} strokeWidth={1.5} />
                <div>
                  <p className={`font-mono text-xl font-semibold leading-none ${urgent ? 'text-red-400' : isActive ? 'text-green-400' : 'text-blue-400'}`}>
                    {countLabel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{isActive ? 'until hackathon ends' : 'until it begins'}</p>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {isActive && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{formatDateTime(hack.start_date)}</span>
                  <span className={`font-mono ${urgent ? 'text-red-400' : 'text-green-400/80'}`}>{Math.round(pct)}% elapsed</span>
                  <span>{formatDateTime(hack.end_date)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Key dates */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-6">
              {hack.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateTime(hack.start_date)} → {formatDateTime(hack.end_date)}
                </span>
              )}
              {regMs != null && regMs > 0 && (
                <span className="text-orange-400 flex items-center gap-1">
                  <Flag className="w-3 h-3" />Reg. closes: {formatDateTime(hack.registration_deadline)}
                </span>
              )}
              {subMs != null && subMs > 0 && (
                <span className="text-yellow-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />Submit by: {formatDateTime(hack.submission_deadline)}
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3 flex-wrap">
              {hack.registration_link && (isActive || isUpcoming) && (
                <Button asChild className="bg-white text-black hover:bg-gray-200 rounded-sm px-6">
                  <a href={hack.registration_link} target="_blank" rel="noopener noreferrer">Register Now ↗</a>
                </Button>
              )}
              <Link to="/dashboard/hackathons">
                <Button variant="outline" className="border-white/20 rounded-sm px-6 hover:bg-white hover:text-black">
                  Submit Project
                </Button>
              </Link>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {hack.description && (
                <section className="project-card p-6">
                  <p className="text-xs font-mono text-muted-foreground mb-4">// About</p>
                  <DescriptionRenderer text={hack.description} />
                </section>
              )}

              {hack.rules && (
                <section className="project-card p-6">
                  <p className="text-xs font-mono text-muted-foreground mb-4">// Rules</p>
                  <div className="space-y-2">
                    {hack.rules.split('\n').filter(Boolean).map((rule, idx) => {
                      const t = rule.trim();
                      const num = t.match(/^(\d+)[.)]\s+(.+)/);
                      if (num) return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-xs font-mono text-muted-foreground/60 w-5 pt-0.5 flex-shrink-0">{num[1]}.</span>
                          <p className="text-sm text-muted-foreground">{num[2]}</p>
                        </div>
                      );
                      const bul = t.match(/^[•\-\*]\s+(.+)/);
                      if (bul) return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground/40 pt-1 text-xs flex-shrink-0">·</span>
                          <p className="text-sm text-muted-foreground">{bul[1]}</p>
                        </div>
                      );
                      return <p key={idx} className="text-sm text-muted-foreground">{t}</p>;
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Prizes */}
              {hack.prizes && (
                <div className="project-card p-5">
                  <p className="text-xs font-mono text-muted-foreground mb-3">// Prizes</p>
                  <p className="text-sm text-yellow-400/90 font-medium">{hack.prizes}</p>
                </div>
              )}

              {/* Winners */}
              <div className="project-card p-5">
                <p className="text-xs font-mono text-muted-foreground mb-3">// Winners</p>
                {sortedWinners.length > 0 ? (
                  <div className="space-y-2">
                    {sortedWinners.map(w => (
                      <div key={w.position} className={`flex items-center gap-3 p-3 rounded-sm border ${WINNER_STYLE[w.position] || 'border-white/10'}`}>
                        <span className="text-xl flex-shrink-0">{MEDAL[w.position] || `#${w.position}`}</span>
                        <div>
                          <p className="text-sm font-medium">{w.team_name}</p>
                          {w.prize && <p className="text-xs text-muted-foreground">{w.prize}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hack.status === 'past' ? 'No winners announced.' : 'Announced after the event.'}
                  </p>
                )}
              </div>

              {/* Submission deadline countdown */}
              {subMs != null && subMs > 0 && (
                <div className="project-card p-5">
                  <p className="text-xs font-mono text-muted-foreground mb-2">// Submission closes in</p>
                  <p className={`font-mono text-xl font-semibold ${subMs < 6 * 3600 * 1000 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {formatCountdown(subMs).label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(hack.submission_deadline)}</p>
                </div>
              )}

              {/* Team count */}
              {teamCount > 0 && (
                <div className="project-card p-5 flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <p className="font-mono text-2xl font-medium">{teamCount}</p>
                    <p className="text-xs text-muted-foreground">team{teamCount !== 1 ? 's' : ''} registered</p>
                  </div>
                </div>
              )}

              {/* Hall of fame link */}
              <Link to="/hall-of-fame" className="block project-card p-4 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-yellow-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium">Hall of Fame</p>
                    <p className="text-xs text-muted-foreground">See all-time champions</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-8 border-t border-white/10 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <Link to="/" className="text-white tracking-widest hover:underline">REZUM</Link>
        </p>
      </footer>
    </div>
  );
}

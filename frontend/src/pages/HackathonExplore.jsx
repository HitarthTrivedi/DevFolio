import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Trophy, Calendar, Users, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const STATUS_COLORS = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  past:     'bg-white/5 text-muted-foreground border-white/10',
  draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const STATUS_DOT = {
  active:   'bg-green-400',
  upcoming: 'bg-blue-400',
  past:     'bg-white/20',
  draft:    'bg-yellow-400',
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

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function HackathonExplore() {
  const [hackathons, setHackathons] = useState([]);
  const [teamCounts, setTeamCounts] = useState({});
  const [loading, setLoading]   = useState(true);
  const [now, setNow]           = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/hackathons`),
      axios.get(`${API_URL}/hackathons/team-counts`).catch(() => ({ data: {} })),
    ])
      .then(([hackRes, countsRes]) => {
        setHackathons(hackRes.data);
        setTeamCounts(countsRes.data || {});
      })
      .catch(() => toast.error('Failed to load hackathons'))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return d; }
  };

  const active   = hackathons.filter(h => h.status === 'active');
  const upcoming = hackathons.filter(h => h.status === 'upcoming');
  const past     = hackathons.filter(h => h.status === 'past');

  if (loading) return <div className="p-8 lg:p-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Explore</p>
        <h1 className="font-serif text-3xl font-medium">Hackathon Hub</h1>
        <p className="text-muted-foreground text-sm mt-2">
          A live overview of every hackathon — past, present, and upcoming.
          To submit a project or view full details, head to{' '}
          <Link to="/dashboard/hackathons" className="text-white underline underline-offset-2">My Hackathons →</Link>
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Active Now',  count: active.length,   color: 'text-green-400',         dot: 'bg-green-400' },
          { label: 'Upcoming',    count: upcoming.length, color: 'text-blue-400',           dot: 'bg-blue-400' },
          { label: 'Completed',   count: past.length,     color: 'text-muted-foreground',   dot: 'bg-white/20' },
        ].map(({ label, count, color, dot }) => (
          <div key={label} className="project-card p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <p className={`font-mono text-3xl font-medium ${color}`}>{count}</p>
            </div>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Active hackathons — featured */}
      {active.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs font-mono text-green-400 uppercase tracking-widest">Live Now</p>
          </div>
          <div className="space-y-3">
            {active.map(hack => {
              const endMs = parseDate(hack.end_date) ? parseDate(hack.end_date) - now : null;
              const pct   = progressPercent(hack.start_date, hack.end_date, now);
              const { label: cd, urgent } = endMs != null && endMs > 0
                ? formatCountdown(endMs)
                : { label: 'Ended', urgent: false };
              const count = teamCounts[hack.id] || 0;

              return (
                <div key={hack.id} className="project-card p-5 border-green-500/15">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-sans text-base font-medium">{hack.name}</h3>
                        {hack.theme && (
                          <span className="text-xs text-muted-foreground border border-white/10 px-2 py-0.5 rounded-sm">
                            {hack.theme}
                          </span>
                        )}
                        {count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Users className="w-3 h-3" />{count} team{count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-1">
                        {hack.description?.split('\n')[0]}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-mono text-lg font-semibold leading-none ${urgent ? 'text-red-400' : 'text-green-400'}`}>
                        {cd}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">until end</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{formatDate(hack.start_date)}</span>
                      <span className="font-mono text-green-400/80">{Math.round(pct)}% elapsed</span>
                      <span>{formatDate(hack.end_date)}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {hack.registration_link && (
                    <div className="mt-3">
                      <Button asChild variant="outline" size="sm" className="border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-sm h-7 text-xs px-3">
                        <a href={hack.registration_link} target="_blank" rel="noopener noreferrer">Register ↗</a>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full timeline list */}
      {hackathons.length > 0 && (
        <div className="mb-10">
          <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-widest">// All Hackathons</p>
          <div className="space-y-2">
            {hackathons.map(hack => {
              const isActive   = hack.status === 'active';
              const isUpcoming = hack.status === 'upcoming';
              const count      = teamCounts[hack.id] || 0;

              const mainMs = isActive
                ? (parseDate(hack.end_date)   ? parseDate(hack.end_date)   - now : null)
                : isUpcoming
                ? (parseDate(hack.start_date) ? parseDate(hack.start_date) - now : null)
                : null;

              const { label: cd, urgent } = mainMs != null && mainMs > 0
                ? formatCountdown(mainMs)
                : { label: '', urgent: false };

              return (
                <div key={hack.id} className="project-card px-5 py-4 flex items-center gap-4">
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[hack.status] || 'bg-white/20'} ${isActive ? 'animate-pulse' : ''}`} />

                  {/* Name + dates */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{hack.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${STATUS_COLORS[hack.status] || STATUS_COLORS.past}`}>
                        {hack.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {hack.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(hack.start_date)} → {formatDate(hack.end_date)}
                        </span>
                      )}
                      {hack.theme && <span>Theme: <span className="text-white/70">{hack.theme}</span></span>}
                      {count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{count} team{count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {/* Past winners summary */}
                      {hack.status === 'past' && hack.winners?.length > 0 && (
                        <span className="flex items-center gap-1">
                          {hack.winners
                            .sort((a, b) => a.position - b.position)
                            .slice(0, 3)
                            .map(w => (
                              <span key={w.position} className="font-medium">
                                {MEDAL[w.position] || `#${w.position}`} {w.team_name}
                              </span>
                            ))
                            .reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`s${i}`} className="opacity-30">·</span>, el], [])}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Countdown or days ago */}
                  {(isActive || isUpcoming) && cd && (
                    <div className="text-right flex-shrink-0">
                      <p className={`font-mono text-sm font-medium ${
                        urgent ? 'text-red-400' : isActive ? 'text-green-400' : 'text-blue-400'
                      }`}>{cd}</p>
                      <p className="text-xs text-muted-foreground">{isActive ? 'left' : 'to start'}</p>
                    </div>
                  )}

                  {/* Register button */}
                  {hack.registration_link && (isActive || isUpcoming) && (
                    <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-white rounded-sm h-7 text-xs px-2 flex-shrink-0">
                      <a href={hack.registration_link} target="_blank" rel="noopener noreferrer">
                        Register ↗
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hackathons.length === 0 && (
        <div className="empty-state">
          <Trophy className="w-12 h-12 text-muted-foreground/20 mb-4" strokeWidth={1} />
          <p className="text-lg mb-2">No hackathons yet</p>
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </div>
      )}

      {/* CTA to Hackathons page */}
      <div className="project-card p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium mb-1">Ready to participate?</p>
          <p className="text-xs text-muted-foreground">Submit your project, track your submissions, and see results on the Hackathons page.</p>
        </div>
        <Link to="/dashboard/hackathons">
          <Button className="bg-white text-black hover:bg-gray-200 rounded-sm px-5 flex-shrink-0">
            My Hackathons <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

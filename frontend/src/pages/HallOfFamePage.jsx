import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Users, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const POSITION_LABEL = { 1: '1st', 2: '2nd', 3: '3rd' };

const POSITION_STYLE = {
  1: 'border-yellow-400/30 bg-yellow-400/5 text-yellow-400',
  2: 'border-gray-300/30 bg-white/3 text-gray-300',
  3: 'border-orange-400/30 bg-orange-400/5 text-orange-400',
};

export default function HallOfFamePage() {
  const [hackathons, setHackathons] = useState([]);
  const [teamCounts, setTeamCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/hackathons`),
      axios.get(`${API_URL}/hackathons/team-counts`).catch(() => ({ data: {} })),
    ])
      .then(([hackRes, countsRes]) => {
        setHackathons(hackRes.data);
        setTeamCounts(countsRes.data || {});
      })
      .catch(() => toast.error('Failed to load hall of fame'))
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

  const pastWithWinners = hackathons
    .filter(h => h.status === 'past' && h.winners?.length > 0)
    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

  const totalWinners = pastWithWinners.reduce((sum, h) => sum + h.winners.length, 0);
  const totalParticipants = Object.values(teamCounts).reduce((sum, c) => sum + c, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] relative">
      <div className="absolute inset-0 animated-gradient opacity-10" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="font-serif text-xl font-medium tracking-widest">REZUM</Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/hackathons" className="hover:text-white transition-colors">All Hackathons</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-7 h-7 text-yellow-400" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-3 tracking-widest uppercase">// Hall of Fame</p>
            <h1 className="font-serif text-4xl font-medium mb-4">Champions</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Every team that has ever stood on the podium at a REZUM hackathon.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-14">
            {[
              { label: 'Hackathons held',  value: hackathons.filter(h => h.status === 'past').length },
              { label: 'Teams competed',   value: totalParticipants },
              { label: 'Winners crowned',  value: totalWinners },
            ].map(({ label, value }) => (
              <div key={label} className="project-card p-5 text-center">
                <p className="font-mono text-3xl font-medium mb-1">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {pastWithWinners.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" strokeWidth={1} />
              <p className="text-muted-foreground">No winners announced yet. Check back after the next hackathon.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {pastWithWinners.map(hack => {
                const count = teamCounts[hack.id] || 0;
                const sorted = [...hack.winners].sort((a, b) => a.position - b.position);
                return (
                  <div key={hack.id} className="project-card overflow-hidden">
                    {/* Hackathon header */}
                    <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-sans text-lg font-medium mb-1">{hack.name}</h2>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {hack.end_date && <span>{formatDate(hack.start_date)} → {formatDate(hack.end_date)}</span>}
                          {hack.theme && <span>Theme: <span className="text-white/70">{hack.theme}</span></span>}
                          {count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{count} team{count !== 1 ? 's' : ''} competed
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={`/hackathons/${hack.id}`}
                        className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 flex-shrink-0 transition-colors"
                      >
                        Details <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Podium */}
                    <div className="p-6">
                      {/* Top 3 podium */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        {sorted.filter(w => w.position <= 3).map(w => (
                          <div
                            key={w.position}
                            className={`rounded-sm border p-4 ${POSITION_STYLE[w.position] || 'border-white/10'}`}
                          >
                            <div className="text-2xl mb-2">{MEDAL[w.position] || `#${w.position}`}</div>
                            <p className="text-sm font-medium text-white">{w.team_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {POSITION_LABEL[w.position] || `#${w.position}`} Place
                            </p>
                            {w.prize && (
                              <p className="text-xs mt-1 opacity-70">{w.prize}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Remaining positions */}
                      {sorted.filter(w => w.position > 3).length > 0 && (
                        <div className="space-y-2 mt-2">
                          {sorted.filter(w => w.position > 3).map(w => (
                            <div key={w.position} className="flex items-center gap-3 px-3 py-2 border border-white/8 rounded-sm">
                              <span className="font-mono text-xs text-muted-foreground w-6">#{w.position}</span>
                              <span className="text-sm text-white/80">{w.team_name}</span>
                              {w.prize && <span className="text-xs text-muted-foreground ml-auto">{w.prize}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

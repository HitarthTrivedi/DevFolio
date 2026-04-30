import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Calendar, Clock, ChevronDown, ChevronUp, Zap, Flag, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const STATUS_COLORS = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active:   'bg-green-500/10 text-green-400 border-green-500/20',
  past:     'bg-white/5 text-muted-foreground border-white/10',
  draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const STATUS_ICON = {
  active: Zap,
  upcoming: Clock,
  past: Archive,
  draft: Flag,
};

export default function HackathonExplore() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | upcoming | past
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/hackathons`)
      .then(res => setHackathons(res.data))
      .catch(() => toast.error('Failed to load hackathons'))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      const hasTime = d.includes('T') && !d.endsWith('T00:00') && !d.endsWith('T00:00:00');
      if (hasTime) {
        return dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  const daysUntil = (d) => {
    if (!d) return null;
    const diff = new Date(d) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const filtered = filter === 'all'
    ? hackathons
    : hackathons.filter(h => h.status === filter);

  // Group by status for timeline display
  const active   = hackathons.filter(h => h.status === 'active');
  const upcoming = hackathons.filter(h => h.status === 'upcoming');
  const past     = hackathons.filter(h => h.status === 'past');

  if (loading) {
    return <div className="p-8 lg:p-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-mono text-muted-foreground mb-2">// Hackathon Explorer</p>
        <h1 className="font-serif text-3xl font-medium">Hackathons</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Browse all hackathons — ongoing, upcoming, and past. See timelines, themes, and winners.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Active Now', count: active.length, color: 'text-green-400' },
          { label: 'Upcoming', count: upcoming.length, color: 'text-blue-400' },
          { label: 'Past', count: past.length, color: 'text-muted-foreground' },
        ].map(({ label, count, color }) => (
          <div key={label} className="project-card p-5 text-center">
            <p className={`font-mono text-3xl font-medium mb-1 ${color}`}>{count}</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {['all', 'active', 'upcoming', 'past'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-sm border transition-colors capitalize ${
              filter === f
                ? 'bg-white text-black border-white'
                : 'border-white/20 text-muted-foreground hover:border-white/40 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Trophy className="w-12 h-12 text-muted-foreground/20 mb-4" strokeWidth={1} />
          <p className="text-lg mb-2">No hackathons in this category</p>
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(hack => {
            const isExpanded = expandedId === hack.id;
            const Icon = STATUS_ICON[hack.status] || Flag;
            const days = daysUntil(hack.status === 'upcoming' ? hack.start_date : hack.end_date);

            return (
              <div key={hack.id} className="project-card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 flex-shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h2 className="font-sans text-lg font-medium">{hack.name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STATUS_COLORS[hack.status] || STATUS_COLORS.past}`}>
                          {hack.status}
                        </span>
                        {hack.status === 'active' && days !== null && days >= 0 && (
                          <span className="text-xs text-green-400 font-mono">{days}d left</span>
                        )}
                        {hack.status === 'upcoming' && days !== null && days >= 0 && (
                          <span className="text-xs text-blue-400 font-mono">starts in {days}d</span>
                        )}
                      </div>

                      <p className="text-muted-foreground text-sm mb-3 whitespace-pre-line">{hack.description}</p>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {hack.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(hack.start_date)} → {formatDate(hack.end_date)}
                          </span>
                        )}
                        {hack.theme && (
                          <span>Theme: <span className="text-white">{hack.theme}</span></span>
                        )}
                        {hack.registration_deadline && (
                          <span className="text-orange-400">
                            Reg. closes: {formatDate(hack.registration_deadline)}
                          </span>
                        )}
                        {hack.submission_deadline && (
                          <span className="text-yellow-400">
                            Submit by: {formatDate(hack.submission_deadline)}
                          </span>
                        )}
                      </div>
                      
                      {hack.registration_link && (
                        <div className="mt-4">
                          <Button asChild variant="outline" className="border-white/20 hover:bg-white hover:text-black rounded-sm h-8 px-3 text-xs">
                            <a href={hack.registration_link} target="_blank" rel="noopener noreferrer">
                              Register Here ↗
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : hack.id)}
                      className="p-2 text-muted-foreground hover:text-white transition-colors flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/10">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Details */}
                      <div className="space-y-4">
                        {hack.prizes && (
                          <div>
                            <p className="text-xs font-mono text-muted-foreground mb-2">// Prizes</p>
                            <p className="text-sm">{hack.prizes}</p>
                          </div>
                        )}
                        {hack.rules && (
                          <div>
                            <p className="text-xs font-mono text-muted-foreground mb-2">// Rules</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{hack.rules}</p>
                          </div>
                        )}
                        {!hack.prizes && !hack.rules && (
                          <p className="text-sm text-muted-foreground">No additional details.</p>
                        )}
                      </div>

                      {/* Winners */}
                      <div>
                        <p className="text-xs font-mono text-muted-foreground mb-3">// Winners</p>
                        {hack.winners?.length > 0 ? (
                          <div className="space-y-3">
                            {hack.winners.sort((a, b) => a.position - b.position).map(w => (
                              <div key={w.position} className="flex items-center gap-3">
                                <div className={`w-8 h-8 flex items-center justify-center border font-mono text-sm flex-shrink-0 ${
                                  w.position === 1 ? 'border-yellow-400/50 text-yellow-400' :
                                  w.position === 2 ? 'border-gray-300/50 text-gray-300' :
                                  w.position === 3 ? 'border-orange-400/50 text-orange-400' :
                                  'border-white/10 text-muted-foreground'
                                }`}>
                                  {w.position}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{w.team_name}</p>
                                  {w.prize && <p className="text-xs text-muted-foreground">{w.prize}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {hack.status === 'past' ? 'No winners announced.' : 'Winners will be announced after the hackathon.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

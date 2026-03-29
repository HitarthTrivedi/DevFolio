import { useState, useEffect } from 'react';

/**
 * Fetches and renders a GitHub contribution calendar for a given username.
 * Uses the GitHub contributions API via a CORS proxy.
 */

const LEVEL_COLORS = [
  'bg-white/5 border border-white/10',      // 0 - no contributions
  'bg-emerald-900/60',                       // 1 - low
  'bg-emerald-700/70',                       // 2 - medium-low
  'bg-emerald-500/80',                       // 3 - medium-high
  'bg-emerald-400',                          // 4 - high
];

function getWeeksInYear(contributions) {
  // Group days into weeks (Sun-Sat)
  const weeks = [];
  let currentWeek = [];
  contributions.forEach((day, i) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === contributions.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  return weeks;
}

function getMonthLabels(contributions) {
  const labels = [];
  let lastMonth = -1;
  let weekIndex = 0;
  let dayInWeek = 0;
  contributions.forEach((day) => {
    const month = new Date(day.date).getMonth();
    if (month !== lastMonth) {
      labels.push({ month, weekIndex: Math.floor(weekIndex / 7) });
      lastMonth = month;
    }
    weekIndex++;
  });
  return labels;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function GitHubCalendar({ username }) {
  const [contributions, setContributions] = useState([]);
  const [totalContributions, setTotalContributions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    // Use GitHub's contribution graph via a public proxy
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
      .then(res => {
        if (!res.ok) throw new Error('GitHub user not found');
        return res.json();
      })
      .then(data => {
        // data.contributions is array of { date, count, level }
        const sorted = (data.contributions || []).sort((a, b) =>
          new Date(a.date) - new Date(b.date)
        );
        setContributions(sorted);
        setTotalContributions(data.total?.lastYear || sorted.reduce((s, d) => s + d.count, 0));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground text-sm py-6">
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        Loading contribution data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400/80 py-4">
        Could not load contributions: {error}
      </div>
    );
  }

  if (!contributions.length) return null;

  const weeks = getWeeksInYear(contributions);
  const monthLabels = getMonthLabels(contributions);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          <span className="text-white font-medium">{totalContributions.toLocaleString()}</span> contributions in the last year
        </span>
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-white transition-colors"
        >
          @{username} →
        </a>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 pl-0">
            {weeks.map((week, wi) => {
              const firstDay = week[0];
              const month = firstDay ? new Date(firstDay.date).getMonth() : -1;
              const prevMonth = wi > 0 && weeks[wi - 1][0]
                ? new Date(weeks[wi - 1][0].date).getMonth()
                : -1;
              const showLabel = month !== prevMonth;
              return (
                <div key={wi} className="w-[11px] flex-shrink-0">
                  {showLabel && (
                    <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">
                      {MONTH_NAMES[month]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                    className={`w-[11px] h-[11px] rounded-[2px] cursor-default transition-opacity hover:opacity-80 ${
                      LEVEL_COLORS[day.level] || LEVEL_COLORS[0]
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[10px] text-muted-foreground/60">Less</span>
            {LEVEL_COLORS.map((cls, i) => (
              <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[10px] text-muted-foreground/60">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

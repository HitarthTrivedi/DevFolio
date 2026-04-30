import { useState } from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function parseIso(value) {
  if (!value) return { date: undefined, hours: '09', mins: '00' };
  const [datePart = '', timePart = '09:00'] = value.split('T');
  const [h = '09', m = '00'] = timePart.split(':');
  const d = new Date(datePart + 'T00:00:00');
  return {
    date: isNaN(d.getTime()) ? undefined : d,
    hours: h.padStart(2, '0'),
    mins: m.padStart(2, '0'),
  };
}

function toIso(date, hours, mins) {
  if (!date) return '';
  const y  = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  const h  = String(Math.min(23, Math.max(0, parseInt(hours) || 0))).padStart(2, '0');
  const mn = String(Math.min(59, Math.max(0, parseInt(mins)  || 0))).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mn}`;
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time', className }) {
  const [open, setOpen] = useState(false);
  const { date, hours, mins } = parseIso(value);

  const emit = (newDate, newHours, newMins) => {
    onChange(toIso(newDate, newHours, newMins));
  };

  const displayLabel = date
    ? `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}  ${hours}:${mins}`
    : placeholder;

  const clampInt = (v, min, max) =>
    String(Math.min(max, Math.max(min, parseInt(v) || min))).padStart(2, '0');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal border-white/20 rounded-sm bg-transparent hover:bg-white/5',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">{displayLabel}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto p-0 bg-[#0d0d0d] border-white/10 shadow-2xl"
      >
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => emit(d, hours, mins)}
          initialFocus
          classNames={{
            day_selected: 'bg-white text-black hover:bg-white hover:text-black focus:bg-white focus:text-black',
            day_today: 'border border-white/30 text-white',
          }}
        />

        {/* Time picker */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Time</span>

            <div className="flex items-center gap-1 ml-auto">
              {/* Hours */}
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={e => emit(date, e.target.value, mins)}
                onBlur={e => emit(date, clampInt(e.target.value, 0, 23), mins)}
                className="w-12 bg-white/5 border border-white/10 rounded-sm px-2 py-1.5 text-sm text-center font-mono focus:outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground font-mono">:</span>
              {/* Minutes */}
              <input
                type="number"
                min="0"
                max="59"
                value={mins}
                onChange={e => emit(date, hours, e.target.value)}
                onBlur={e => emit(date, hours, clampInt(e.target.value, 0, 59))}
                className="w-12 bg-white/5 border border-white/10 rounded-sm px-2 py-1.5 text-sm text-center font-mono focus:outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Quick time presets */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {[['09', '00'], ['12', '00'], ['18', '00'], ['23', '59']].map(([h, m]) => (
              <button
                key={`${h}:${m}`}
                type="button"
                onClick={() => emit(date, h, m)}
                className={cn(
                  'text-xs px-2 py-1 rounded-sm border transition-colors',
                  hours === h && mins === m
                    ? 'bg-white text-black border-white'
                    : 'border-white/20 text-muted-foreground hover:border-white/40 hover:text-white'
                )}
              >
                {h}:{m}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-2 flex justify-between items-center">
          <button
            type="button"
            onClick={() => { onChange(''); }}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Clear
          </button>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
            className="bg-white text-black hover:bg-gray-200 rounded-sm h-7 text-xs px-4"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

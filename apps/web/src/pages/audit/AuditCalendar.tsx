import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, AUDIT_STATUS_LABELS } from '@/lib/utils';
import type { AuditSession } from '@/types';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_REVIEW: 'bg-amber-500',
  COMPLETED: 'bg-indigo-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
};

interface Props {
  sessions: AuditSession[];
  onSelect: (id: string) => void;
}

export default function AuditCalendar({ sessions, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const sessionsOn = (day: number) =>
    sessions.filter((s) => {
      const dt = new Date(s.scheduledAt);
      return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day;
    });

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{MONTHS[month]} {year}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hari ini</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b-${i}`} className="min-h-[84px]" />;
          const items = sessionsOn(day);
          return (
            <div key={day} className={cn('min-h-[84px] border rounded-md p-1.5 text-left', isToday(day) && 'border-primary bg-primary/5')}>
              <div className={cn('text-xs font-medium mb-1', isToday(day) ? 'text-primary' : 'text-muted-foreground')}>{day}</div>
              <div className="space-y-1">
                {items.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    title={`${s.area?.name} — ${AUDIT_STATUS_LABELS[s.status]}`}
                    className="w-full flex items-center gap-1 text-[10px] leading-tight px-1 py-0.5 rounded hover:bg-muted truncate"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[s.status])} />
                    <span className="truncate">{s.area?.name}</span>
                  </button>
                ))}
                {items.length > 3 && <p className="text-[10px] text-muted-foreground pl-1">+{items.length - 3} lagi</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { SLA_LIMITS, TicketPriority } from '../tickets.types';

interface SLATimerProps {
  createdAt: string;
  priority: TicketPriority;
}

type SLAStatus = 'ok' | 'warning' | 'overdue';

export default function SLATimer({ createdAt, priority }: SLATimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [status, setStatus] = useState<SLAStatus>('ok');

  useEffect(() => {
    const updateTimer = () => {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const elapsed = (now - created) / (1000 * 60 * 60);
      const limit = SLA_LIMITS[priority]?.hours || 72;
      const remaining = limit - elapsed;
      const ratio = elapsed / limit;

      if (remaining <= 0) {
        setStatus('overdue');
        const overdueHours = Math.abs(remaining);
        setTimeLeft(`Vencido hace ${Math.floor(overdueHours)}h ${Math.floor((overdueHours % 1) * 60)}m`);
      } else {
        if (ratio > 0.75) setStatus('warning');
        else setStatus('ok');

        const hours = Math.floor(remaining);
        const minutes = Math.floor((remaining % 1) * 60);
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [createdAt, priority]);

  const colors: Record<SLAStatus, string> = {
    ok: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    overdue: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider border ${colors[status]}`}>
      <Clock size={10} />
      <span>{timeLeft}</span>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { SLA_LIMITS, TicketPriority } from '../tickets.types';

interface SLATimerProps {
  createdAt: string;
  priority: TicketPriority;
}

export default function SLATimer({ createdAt, priority }: SLATimerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const elapsed = (now - created) / (1000 * 60 * 60);
      const limit = SLA_LIMITS[priority]?.hours || 72;
      const remaining = limit - elapsed;

      if (remaining <= 0) {
        const overdueHours = Math.abs(remaining);
        setTimeLeft(`Vencido hace ${Math.floor(overdueHours)}h ${Math.floor((overdueHours % 1) * 60)}m`);
      } else {
        const hours = Math.floor(remaining);
        const minutes = Math.floor((remaining % 1) * 60);
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [createdAt, priority]);

  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
      <Clock size={10} />
      <span>{timeLeft}</span>
    </span>
  );
}

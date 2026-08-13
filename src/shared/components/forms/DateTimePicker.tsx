import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { FormSelect } from './BaseForm';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const pad = (n: number) => String(n).padStart(2, '0');

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
};

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(value: string): string {
  const d = parseDate(value);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DateTimePicker({
  value,
  onChange,
  error,
  placeholder = 'Seleccionar fecha y hora',
  disabled = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseDate(value), [value]);
  const timeBase = selectedDate ?? new Date();

  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewMonth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inContainer && !inPanel) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const open = () => {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const PANEL_WIDTH = 300;
      const PANEL_HEIGHT = 390;
      let top = rect.bottom + 8;
      if (top + PANEL_HEIGHT > window.innerHeight - 8) {
        top = Math.max(8, rect.top - PANEL_HEIGHT - 8);
      }
      let left = rect.left;
      if (left + PANEL_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - PANEL_WIDTH - 8);
      }
      setPanelPos({ top, left });
    }
    const d = selectedDate ?? new Date();
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setIsOpen(true);
  };

  const emit = (date: Date) => onChange(formatValue(date));

  const selectDay = (day: number) => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    d.setFullYear(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    emit(d);
  };

  const changeTime = (part: 'hour' | 'minute', val: string) => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    if (part === 'hour') d.setHours(parseInt(val, 10));
    else d.setMinutes(parseInt(val, 10));
    emit(d);
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      viewMonth.getMonth() === selectedDate.getMonth() &&
      viewMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      day === now.getDate() &&
      viewMonth.getMonth() === now.getMonth() &&
      viewMonth.getFullYear() === now.getFullYear()
    );
  };

  const currentHour = String(timeBase.getHours()).padStart(2, '0');
  const currentMinute = String(Math.floor(timeBase.getMinutes() / 5) * 5).padStart(2, '0');

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        className={`
          w-full px-3 py-2 h-10 flex items-center justify-between gap-2 bg-white border border-slate-300 rounded-md shadow-sm
          hover:border-slate-400 transition-all text-[11px] font-normal tracking-normal text-left
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-300' : ''}
          ${isOpen ? 'border-blue-600 ring-2 ring-blue-500/20' : ''}
        `}
      >
        <span className={`truncate ${selectedDate ? 'text-[#002855]' : 'text-slate-400'}`}>
          {selectedDate ? formatDisplay(value) : placeholder}
        </span>
        <CalendarClock size={16} className={`shrink-0 transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-400'}`} />
      </button>

      {isOpen && panelPos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, zIndex: 9999, width: 300 }}
          className="bg-white border border-slate-200 rounded-md shadow-2xl animate-fadeIn p-3 space-y-3"
        >
          {/* Navegación de mes */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold text-[#002855] uppercase tracking-wide">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map(w => (
              <span key={w} className="text-center text-[9px] font-bold text-slate-400 uppercase">{w}</span>
            ))}
          </div>

          {/* Calendario */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) =>
              day === null ? (
                <span key={index} />
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`
                    h-7 w-7 mx-auto flex items-center justify-center rounded-md text-[10px] font-semibold transition-all
                    ${isSelectedDay(day)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isToday(day)
                        ? 'text-blue-600 border border-blue-600 hover:bg-blue-50'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}
                  `}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {/* Hora */}
          <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
              <Clock size={12} />
              Hora
            </span>
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1">
                <FormSelect value={currentHour} onChange={(e) => changeTime('hour', e.target.value)} aria-label="Hora">
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </FormSelect>
              </div>
              <span className="text-slate-400 text-[11px] font-bold">:</span>
              <div className="flex-1">
                <FormSelect value={currentMinute} onChange={(e) => changeTime('minute', e.target.value)} aria-label="Minutos">
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </FormSelect>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  emit(now);
                }}
                className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={11} />
                Limpiar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Listo
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

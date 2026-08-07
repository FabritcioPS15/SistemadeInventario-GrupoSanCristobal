import { useState, useRef, useEffect } from 'react';
import { Zap } from 'lucide-react';

const QUICK_RESPONSES = [
  { label: 'Revisando', text: 'Estoy revisando tu caso, en un momento te doy respuesta.' },
  { label: 'Más info', text: '¿Podrías brindarme más detalles sobre el problema?' },
  { label: 'Escalado', text: 'He escalado este caso al área correspondiente. Te mantendré informado.' },
  { label: 'Probado OK', text: 'He realizado las pruebas y todo funciona correctamente. ¿Podrías confirmar?' },
  { label: 'Reiniciar', text: 'Por favor, intenta reiniciar el equipo y me confirmas si el problema persiste.' },
  { label: 'Cerrado', text: 'Damos por solucionado el caso. Si vuelve a ocurrir, no dudes en contactarnos.' },
];

interface QuickResponsesProps {
  onSelect: (text: string) => void;
}

export default function QuickResponses({ onSelect }: QuickResponsesProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 text-slate-400 hover:text-[#002855] hover:bg-slate-100 transition-all"
        title="Respuesta rápida"
      >
        <Zap size={16} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200 shadow-xl z-50 max-h-64 overflow-y-auto">
          <div className="px-3 py-2 bg-[#002855] text-white text-[9px] font-semibold uppercase tracking-wider">
            Respuestas rápidas
          </div>
          {QUICK_RESPONSES.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#002855] border-b border-slate-100 last:border-0 transition-colors"
              onClick={() => { onSelect(r.text); setOpen(false); }}
            >
              <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider block">{r.label}</span>
              <span className="line-clamp-2">{r.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

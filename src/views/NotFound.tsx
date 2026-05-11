import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Ghost } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Lógica Visual: Icono Flotante */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
          <div className="relative bg-white border-2 border-slate-100 p-8 rounded-3xl shadow-2xl shadow-blue-500/10">
            <Ghost size={80} className="text-[#002855] animate-bounce" />
          </div>
          <div className="absolute -top-4 -right-4 bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
            404
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-[#002855] tracking-tight">
            PÁGINA NO ENCONTRADA
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Parece que te has perdido en el sistema. La página que buscas no existe o fue movida.
          </p>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:flex-1 group px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Volver Atrás
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full sm:flex-1 group px-6 py-4 bg-[#002855] text-white rounded-2xl font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Inicio
          </button>
        </div>

        {/* Decoración */}
        <div className="pt-8 opacity-20">
          <div className="flex justify-center gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-slate-400"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

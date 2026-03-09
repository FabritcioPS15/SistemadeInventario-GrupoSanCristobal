import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, User, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [emailOrDni, setEmailOrDni] = useState(() => localStorage.getItem('remembered_user') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_user'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isEmail = emailOrDni.includes('@');
      let query = supabase
        .from('users')
        .select('*')
        .eq('password', password)
        .eq('status', 'active');

      if (isEmail) {
        query = query.eq('email', emailOrDni);
      } else {
        query = query.eq('dni', emailOrDni);
      }

      const { data: userData, error: userError } = await query.single();

      if (userError || !userData) {
        setError('Credenciales incorrectas o usuario inactivo');
        setLoading(false);
        return;
      }

      // Handle "Remember Me" for the identifier
      if (rememberMe) {
        localStorage.setItem('remembered_user', emailOrDni);
      } else {
        localStorage.removeItem('remembered_user');
      }

      login(userData, rememberMe);
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f2f5] p-4 lg:p-0 overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

      <div className="relative w-full max-w-5xl min-h-[600px] lg:h-[650px] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col lg:flex-row overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-700">

        <div className="w-full lg:w-1/2 bg-[#002855] relative flex-col p-8 sm:p-12 overflow-hidden flex lg:hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#0056b3_0%,transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#003d80_0%,transparent_50%)]" />
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center h-full">
            <div className="flex justify-center items-center h-full animate-in zoom-in duration-700 delay-100">
              <img
                src="public/Enblanco.png"
                alt="GSC Logistics"
                className="w-[60%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://img.freepik.com/free-vector/modern-courier-delivery-service-commercial-concept_1284-52646.jpg?t=st=1740830000&exp=1740833600&hmac=xxx";
                  (e.target as HTMLImageElement).style.opacity = "0.8";
                  (e.target as HTMLImageElement).style.mixBlendMode = "multiply";
                }}
              />
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
        </div>

        <div className="hidden lg:flex w-1/2 bg-[#002855] relative flex-col p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#0056b3_0%,transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#003d80_0%,transparent_50%)]" />
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center h-full">
            <div className="absolute top-8 left-8 right-8 h-1 bg-white/20 animate-pulse" />
            <div className="absolute top-12 left-16 right-16 h-0.5 bg-white/15 animate-pulse delay-75" />
            
            <div className="flex justify-center items-center mb-8 animate-in zoom-in duration-700 delay-100">
              <img
                src="public/Enblanco.png"
                alt="GSC Logistics"
                className="w-[80%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://img.freepik.com/free-vector/modern-courier-delivery-service-commercial-concept_1284-52646.jpg?t=st=1740830000&exp=1740833600&hmac=xxx";
                  (e.target as HTMLImageElement).style.opacity = "0.8";
                  (e.target as HTMLImageElement).style.mixBlendMode = "multiply";
                }}
              />
            </div>

            <h2 className="text-5xl font-bold text-white leading-tight animate-in slide-in-from-left duration-700 delay-200 text-center">
              Sistema Integrado <span className="text-blue-400"></span>
            </h2>
            
            <p className="mt-4 text-blue-100/70 text-lg max-w-md font-medium animate-in slide-in-from-left duration-700 delay-400 mx-auto text-center">
              Solución tecnológica para la gestión integral de activos y operaciones. Eficiencia, control y excelencia operativa.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-16 flex flex-col justify-center animate-in slide-in-from-right duration-700">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-6 lg:mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Bienvenido</h2>
              <p className="text-slate-500 mt-2 font-medium">Por favor ingrese sus credenciales para acceder.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="group">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                  Identificación (Email o DNI)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={emailOrDni}
                    onChange={(e) => setEmailOrDni(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/20 transition-all"
                  />
                  <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Recordarme</span>
                </label>
                <button
                  type="button"
                  className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider transition-colors"
                >
                  ¿Olvidó su clave?
                </button>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#002855] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-[#003d80] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Ingresar Sistema
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4">
              <button
                type="button"
                className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3"
              >
                <Lock size={16} className="text-slate-400" />
                Solicitar Registro de Usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, AlertCircle, User, Lock, ArrowRight, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export default function Login() {
  const mountedRef = useRef(true);
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('remembered_identifier') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_identifier'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    full_name: '',
    email: '',
    dni: '',
    phone: '',
    requested_role: '',
    notes: ''
  });
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("LOGIN CLICK");

    // Validación básica antes de intentar nada
    if (!identifier.trim() || !password.trim()) {
      setError('Por favor, ingrese su identificación (Email o DNI) y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (!API_URL) {
        throw new Error("VITE_API_URL no está definido");
      }

      // Construir la URL correctamente (SIN emojis, SIN espacios, SIN saltos de línea)
      // Eliminamos cualquier carácter no deseado incluyendo emojis y espacios
      const cleanBaseURL = API_URL.trim()
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/\s+/g, '')
        .replace(/\/+$/, '');

      let url = `${cleanBaseURL}/api/auth/login`;
      
      // Corregir duplicación de /api/api si existe
      url = url.replace(/\/api\/api\//g, '/api/');

      console.log("LOGIN URL FINAL:", url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier,
          password
        })
      });

      console.log("Response Status:", response.status);

      if (!mountedRef.current) return;

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login Error Data:", errorData);
        const error = new Error(errorData.message || 'Error en el login');
        (error as any).response = { data: errorData };
        throw error;
      }

      const data = await response.json();
      const { access_token, user: userData } = data;
      
      // Guardar Token para futuras peticiones
      localStorage.setItem('token', access_token);
      
      login(userData, rememberMe);

      if (rememberMe) {
        localStorage.setItem('remembered_identifier', identifier);
      } else {
        localStorage.removeItem('remembered_identifier');
      }
    } catch (err: any) {
      console.error("FETCH ERROR COMPLETO:", err);
      if (mountedRef.current) {
        setError(err.message || 'Error de conexión con el servidor');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationLoading(true);

    try {
      const { error } = await supabase
        .from('user_registration_requests')
        .insert([{
          ...registrationForm,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (!mountedRef.current) return;

      if (error) throw error;

      setShowRegistrationModal(false);
      setRegistrationForm({
        full_name: '',
        email: '',
        dni: '',
        phone: '',
        requested_role: '',
        notes: ''
      });
      
      if (mountedRef.current) {
        alert('Solicitud de registro enviada exitosamente. Será revisada por el administrador.');
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error submitting registration request:', err);
        alert('Error al enviar la solicitud. Inténtalo de nuevo.');
      }
    } finally {
      if (mountedRef.current) {
        setRegistrationLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white p-0 overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

      <div className="relative w-full h-screen bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col lg:flex-row overflow-hidden border border-white/20">

        <div className="w-full lg:w-1/2 bg-[#002855] relative flex-col p-8 sm:p-12 overflow-hidden flex lg:hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#0056b3_0%,transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#003d80_0%,transparent_50%)]" />
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center h-full">
            <div className="flex justify-center items-center h-full">
              <img
                src="/Enblanco.png"
                alt="GSC Logistics"
                className="w-[60%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  if (mountedRef.current) {
                    (e.target as HTMLImageElement).src = "https://img.freepik.com/free-vector/modern-courier-delivery-service-commercial-concept_1284-52646.jpg?t=st=1740830000&exp=1740833600&hmac=xxx";
                    (e.target as HTMLImageElement).style.opacity = "0.8";
                    (e.target as HTMLImageElement).style.mixBlendMode = "multiply";
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-1/2 bg-[#002855] relative flex-col p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#0056b3_0%,transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#003d80_0%,transparent_50%)]" />
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center h-full">
            <div className="absolute top-8 left-8 right-8 h-1 bg-white/20 animate-pulse" />
            <div className="absolute top-12 left-16 right-16 h-0.5 bg-white/15 animate-pulse delay-75" />
            
            <div className="flex justify-center items-center mb-8">
              <img
                src="/Enblanco.png"
                alt="GSC Logistics"
                className="w-[80%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  if (mountedRef.current) {
                    (e.target as HTMLImageElement).src = "https://img.freepik.com/free-vector/modern-courier-delivery-service-commercial-concept_1284-52646.jpg?t=st=1740830000&exp=1740833600&hmac=xxx";
                    (e.target as HTMLImageElement).style.opacity = "0.8";
                    (e.target as HTMLImageElement).style.mixBlendMode = "multiply";
                  }
                }}
              />
            </div>

            <h2 className="text-5xl font-bold text-white leading-tight text-center">
              Sistema Integrado <span className="text-blue-400"></span>
            </h2>
            
            <p className="mt-4 text-blue-100/70 text-lg max-w-md font-medium mx-auto text-center">
              Solución tecnológica para la gestión integral de activos y operaciones. Eficiencia, control y excelencia operativa.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-16 flex flex-col justify-center">
          <div className="w-full">
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
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="email@ejemplo.com o DNI"
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
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl flex items-center gap-3">
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
                onClick={() => setShowRegistrationModal(true)}
                className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3"
              >
                <UserPlus size={16} className="text-slate-400" />
                Solicitar Registro de Usuario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Request Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-800">Solicitar Registro de Usuario</h3>
              <button 
                onClick={() => {
                  if (mountedRef.current) {
                    setShowRegistrationModal(false);
                  }
                }} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleRegistrationSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationForm.full_name}
                    onChange={(e) => {
                      if (mountedRef.current) {
                        setRegistrationForm({ ...registrationForm, full_name: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={registrationForm.email}
                    onChange={(e) => {
                      if (mountedRef.current) {
                        setRegistrationForm({ ...registrationForm, email: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    DNI
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationForm.dni}
                    onChange={(e) => {
                      if (mountedRef.current) {
                        setRegistrationForm({ ...registrationForm, dni: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="12345678"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={registrationForm.phone}
                    onChange={(e) => {
                      if (mountedRef.current) {
                        setRegistrationForm({ ...registrationForm, phone: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="987654321"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Rol Solicitado
                  </label>
                  <select
                    required
                    value={registrationForm.requested_role}
                    onChange={(e) => {
                      if (mountedRef.current) {
                        setRegistrationForm({ ...registrationForm, requested_role: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                  >
                    <option value="">Seleccionar rol</option>
                    <option value="administradores">Administrador</option>
                    <option value="supervisores">Supervisor</option>
                    <option value="sistemas">Sistemas</option>
                    <option value="gerencia">Gerencia</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={registrationForm.notes}
                    onChange={(e) => {
                      if (mountedRef.current) {
                        setRegistrationForm({ ...registrationForm, notes: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700 resize-none"
                    placeholder="Información adicional (opcional)"
                    rows={3}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registrationLoading}
                className="w-full bg-[#002855] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-[#003d80] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3"
              >
                {registrationLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Enviar Solicitud
                    <UserPlus size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

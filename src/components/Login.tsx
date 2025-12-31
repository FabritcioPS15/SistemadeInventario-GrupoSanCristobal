import { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [emailOrDni, setEmailOrDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Determinar si el input es email o DNI
      const isEmail = emailOrDni.includes('@');

      let query = supabase
        .from('users')
        .select('*')
        .eq('password', password)
        .eq('status', 'active');

      // Buscar por email o DNI según el formato del input
      if (isEmail) {
        query = query.eq('email', emailOrDni);
      } else {
        query = query.eq('dni', emailOrDni);
      }

      const { data: userData, error: userError } = await query.single();

      if (userError || !userData) {
        setError('Credenciales incorrectas');
        setLoading(false);
        return;
      }

      login(userData);
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-slate-800 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sistema GSC</h1>
          <p className="text-gray-600">Gestión y Control del Grupo San Cristobal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email o DNI
            </label>
            <input
              type="text"
              value={emailOrDni}
              onChange={(e) => setEmailOrDni(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="usuario@ejemplo.com o 12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 text-white py-2 px-4 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Roles disponibles:</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span>Administrador:</span>
              <span className="text-green-600">Acceso completo</span>
            </div>
            <div className="flex justify-between">
              <span>Supervisor:</span>
              <span className="text-blue-600">Solo lectura</span>
            </div>
            <div className="flex justify-between">
              <span>Usuario:</span>
              <span className="text-gray-600">Dashboard y cámaras</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

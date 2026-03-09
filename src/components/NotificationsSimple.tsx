import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationsSimple() {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2); // Simulado para prueba con 2 notificaciones

  // Roles que deben recibir notificaciones
  const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];

  if (!user || !notificationRoles.includes(user.role)) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors group"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-black group-hover:text-gray-700 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-black text-slate-900">Notificaciones</h3>
            </div>
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-800 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Sistema de notificaciones activo</p>
              <p className="text-xs text-slate-500 mt-2">Las notificaciones aparecerán aquí cuando se creen, atiendan o resuelvan tickets</p>
              <button 
                onClick={() => alert('¡Dropdown funcionando correctamente!')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Probar Sistema
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

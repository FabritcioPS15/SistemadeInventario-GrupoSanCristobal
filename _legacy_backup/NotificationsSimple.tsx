import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';

type Notification = {
  id: string;
  type: 'ticket_created' | 'ticket_attended' | 'ticket_resolved' | 'ticket_closed' | 'sutran_visit_scheduled' | 'sutran_visit_completed';
  title: string;
  message: string;
  ticket_id?: string;
  user_name: string;
  location_name?: string;
  target_role: string;
  read: boolean;
  created_at: string;
};

// Función para reproducir sonido de notificación
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    // Segundo beep
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1200, audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1);
        gain2.gain.setValueAtTime(1.0, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.2);
      } catch (e) { }
    }, 400);
  } catch (error) {
    console.error('Error reproduciendo sonido:', error);
  }
};

export default function NotificationsSimple() {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Roles que deben recibir notificaciones
  const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];

  useEffect(() => {
    if (!user || !notificationRoles.includes(user.role)) {
      return;
    }

    // Suscribirse a notificaciones en tiempo real
    const channel = supabase
      .channel('notifications-simple')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_role=eq.${user.role}`
        },
        (payload) => {
          console.log('🔔 Nueva notificación recibida:', payload.new);
          const newNotification = payload.new as Notification;

          // Agregar notificación
          setNotifications(prev => [newNotification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          // Reproducir sonido
          console.log('🔊 Reproduciendo sonido...');
          playNotificationSound();

          // Mostrar notificación del navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico'
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción a notificaciones activada');
          fetchNotifications();
        }
      });

    // Cargar notificaciones existentes
    fetchNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_role', user.role)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando como leído:', error);
    }
  };

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
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-slate-900">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-red-600 font-medium">{unreadCount} nuevas</span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No hay notificaciones</p>
                  <p className="text-xs text-slate-500 mt-2">Las notificaciones aparecerán aquí cuando se creen, atiendan o resuelvan tickets</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50' : ''
                      }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-slate-300'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
                        <p className="text-slate-600 text-xs mt-1">{notification.message}</p>
                        <p className="text-slate-500 text-xs mt-2">
                          {notification.user_name} • {new Date(notification.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    notifications.filter(n => !n.read).forEach(n => markAsRead(n.id));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Marcar todas como leídas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

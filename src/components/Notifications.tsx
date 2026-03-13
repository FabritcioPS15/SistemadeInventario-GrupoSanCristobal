import { useState, useEffect } from 'react';
import { BellIcon, CheckCircle, Clock, Archive, Plus, User, MapPin, Calendar, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Notification = {
  id: string;
  type: 'ticket_created' | 'ticket_attended' | 'ticket_resolved' | 'ticket_closed';
  title: string;
  message: string;
  ticket_id?: string;
  user_name: string;
  location_name?: string;
  created_at: string;
  read: boolean;
};

// Función para reproducir sonido de notificación
const playNotificationSound = () => {
  try {
    // Crear un sonido de notificación usando Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Crear un oscilador para el sonido
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Conectar nodos
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configurar el sonido (un beep suave)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frecuencia inicial
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1); // Bajar frecuencia
    
    // Configurar volumen (suave pero audible)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    // Reproducir
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Segundo beep para más atención
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(800, audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Ignorar error si el audio context se cerró
      }
    }, 200);
  } catch (error) {
    console.log('No se pudo reproducir sonido de notificación:', error);
  }
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Roles que deben recibir notificaciones
  const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];

  // Solicitar permisos de notificación del navegador al cargar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Permiso de notificación:', permission);
      });
    }
  }, []);

  // Función para mostrar notificación del navegador
  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'san-cristobal-notification',
        requireInteraction: false
      });
    }
  };

  // Debug: Verificar qué está pasando
  console.log('🔔 DEBUG Notifications Component:');
  console.log('- User:', user?.full_name, 'Role:', user?.role);
  console.log('- Notification Roles:', notificationRoles);
  console.log('- Should Show:', user && notificationRoles.includes(user.role));
  console.log('- Has Notifications:', notifications.length > 0);

  useEffect(() => {
    if (!user || !notificationRoles.includes(user.role)) {
      console.log('❌ Notifications: User no válido o rol no autorizado');
      return;
    }

    console.log('✅ Notifications: Iniciando suscripción a tiempo real');

    // Suscribirse a notificaciones en tiempo real
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Mantener solo las últimas 50
        setUnreadCount(prev => prev + 1);
        
        // Reproducir sonido para nueva notificación
        playNotificationSound();
        
        // Mostrar notificación del navegador
        showBrowserNotification(
          newNotification.title,
          newNotification.message
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción a notificaciones activada');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Error en suscripción a notificaciones');
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
      } else if (error) {
        console.log('Error al cargar notificaciones:', error.message);
      }
    } catch (error) {
      console.log('Error al cargar notificaciones:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    console.log('🗑️ Deleting notification:', notificationId);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      console.log('✅ Notification deleted successfully');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } else {
      console.log('❌ Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    console.log('🗑️ Clearing all notifications for role:', user?.role);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('target_role', user?.role);

    if (!error) {
      console.log('✅ All notifications cleared successfully');
      setNotifications([]);
      setUnreadCount(0);
    } else {
      console.log('❌ Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'ticket_attended':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'ticket_resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ticket_closed':
        return <Archive className="w-4 h-4 text-gray-500" />;
      default:
        return <BellIcon className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return 'bg-blue-50 border-blue-200';
      case 'ticket_attended':
        return 'bg-orange-50 border-orange-200';
      case 'ticket_resolved':
        return 'bg-green-50 border-green-200';
      case 'ticket_closed':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString();
  };

  // Si no hay tabla o el rol no es válido, no mostrar nada
  if (!user || !notificationRoles.includes(user.role)) {
    return null;
  }

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors group"
      >
        <BellIcon className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {showDropdown && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div
            className={`absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-96 overflow-hidden transition-all duration-200 ease-in-out transform origin-top-right ${
              showDropdown 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-black text-slate-900">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all text-xs font-bold"
                    title="Limpiar todas las notificaciones"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpiar Todo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No tienes notificaciones</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.ticket_id) {
                            window.location.href = `/tickets/${notification.ticket_id}`;
                          }
                        }}
                      >
                        <div className={`p-2 rounded-lg border ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-sm text-slate-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{notification.user_name}</span>
                            </div>
                            {notification.location_name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{notification.location_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatTime(notification.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-all border border-red-200 shadow-sm flex-shrink-0"
                        title="Eliminar notificación"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Aquí podrías navegar a una vista completa de notificaciones
                  }}
                  className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

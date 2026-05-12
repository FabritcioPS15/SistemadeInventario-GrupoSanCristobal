import { useState, useEffect, useRef } from 'react';
import { Bell, Clock, Plus, CheckCircle, Archive, User, MapPin, Calendar, CalendarDays, CheckSquare, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../services/api';
import { io } from 'socket.io-client';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Audio global compartido ───────────────────────────────────────────────
// Mantenemos un único AudioContext reutilizable para evitar que el navegador
// lo bloquee por crear demasiados contextos.
let _audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioCtx;
};

/**
 * Desbloquea el AudioContext con la primera interacción del usuario.
 * Los navegadores modernos requieren un gesto del usuario antes de
 * permitir la reproducción de audio.
 */
const unlockAudioContext = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {/* silencioso */ });
    }
    // Reproducir un buffer silencioso para activar el contexto en iOS/Safari
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (_) {/* ignorar */ }
};

/** Alerta de nuevo ticket — Sonido suave y agradable (tipo "pop" o "ding" moderno). */
const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();

    const fire = () => {
      // Un solo tono suave y rápido
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine'; // Onda senoidal suave, sin estridencias
      osc.frequency.setValueAtTime(659.25, t); // Nota Mi5 (E5)
      
      // Volumen bajo y decaimiento rápido
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05); // Ataque suave
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5); // Desvanecimiento

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.5);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(fire).catch(() => { });
    } else {
      fire();
    }
  } catch (err) {
    console.warn('⚠️ No se pudo reproducir el sonido de notificación:', err);
  }
};

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

export default function NotificationsFinal() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('unread');
  // true una vez que el AudioContext fue desbloqueado por gesto del usuario
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioEnabledRef = useRef(false);
  // IDs de notificaciones ya conocidas — no disparan sonido al iniciar
  const knownIdsRef = useRef<Set<string> | null>(null);

  // Roles que deben recibir notificaciones
  const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];

  // Solicitar permisos de notificación del navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /**
   * Desbloquea el AudioContext. DEBE llamarse desde un handler de clic
   * (gesto del usuario), no desde un callback asíncrono.
   */
  const handleUnlockAndPlay = () => {
    try {
      if (audioUnlocked) {
        setAudioUnlocked(false);
        audioEnabledRef.current = false;
      } else {
        unlockAudioContext();
        setAudioUnlocked(true);
        audioEnabledRef.current = true;
        playNotificationSound();
      }
    } catch (_) {/* ignorar */ }
  };

  useEffect(() => {
    if (!user || !notificationRoles.includes(user.role)) {
      return;
    }

    if (DB_MODE === 'supabase') {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `target_role=eq.${user.role}`
          },
          (payload: any) => {
            handleNewNotification(payload.new as Notification);
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') fetchNotifications();
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // MODO NESTJS: Usar WebSockets propios
      const socket = io(API_URL.replace('/api', ''), {
        path: '/socket.io',
        transports: ['websocket'],
      });

      socket.on(`notification_${user.role}`, (notification: Notification) => {
        console.log('🔔 NOTIFICACIÓN RECIBIDA POR SOCKET:', notification);
        handleNewNotification(notification);
      });

      fetchNotifications();

      return () => {
        socket.disconnect();
      };
    }
  }, [user?.id, user?.role]);

  const handleNewNotification = (newNotification: Notification) => {
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);

    try {
      if (audioEnabledRef.current) {
        playNotificationSound();
      }
    } catch (error) {
      console.error('❌ Error sonando:', error);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      let incoming: Notification[] = [];

      if (DB_MODE === 'supabase') {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, type, title, message, ticket_id, user_name, target_role, read, created_at')
          .eq('target_role', user.role)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) {
          if ((error as any).status === 402 || error.message?.includes('exceed_egress_quota')) {
            (window as any).supabaseQuotaExceeded = true;
            setError('⚠️ Límite de transferencia de datos excedido en Supabase.');
            setLoading(false);
            return;
          }
          throw error;
        }
        incoming = (data || []) as Notification[];
      } else {
        const response = await api.get('/notifications', { params: { role: user.role } });
        incoming = response.data;
      }

      if (knownIdsRef.current === null) {
        knownIdsRef.current = new Set(incoming.map(n => n.id));
        setLoading(false);
      } else {
        const newOnes = incoming.filter(n => !knownIdsRef.current!.has(n.id));
        if (newOnes.length > 0) {
          newOnes.forEach(n => knownIdsRef.current!.add(n.id));
          if (audioEnabledRef.current) {
            playNotificationSound();
          }
        }
      }

      setNotifications(incoming);
      setUnreadCount(incoming.filter(n => !n.read).length);
    } catch (error: any) {
      if (error?.status === 402) {
        (window as any).supabaseQuotaExceeded = true;
        setError('⚠️ Límite de transferencia de datos excedido en Supabase.');
      } else {
        setError('Error al cargar notificaciones');
      }
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        return;
      }

      // Actualizar estado local inmediatamente
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );

      // Actualizar contador de no leídas
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Error handling
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);

    if (unreadNotifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadNotifications.map(n => n.id));

      if (error) {
        return;
      }

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      // Error handling
    }
  };

  const deleteNotification = async (notificationId: string) => {
    console.log('🗑️ Deleting notification:', notificationId);
    try {
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
    } catch (error) {
      console.log('❌ Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    console.log('🗑️ Clearing all notifications for role:', user?.role);
    try {
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
    } catch (error) {
      console.log('❌ Error clearing notifications:', error);
    }
  };

  // Marcar todas como leídas cuando se CIERRA el dropdown
  useEffect(() => {
    if (!showDropdown && unreadCount > 0) {
      markAllAsRead();
    }

    // Al abrir el dropdown, nos aseguramos de estar en la pestaña de Nuevas
    if (showDropdown) {
      setActiveTab('unread');
    }
  }, [showDropdown]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return (
          <div className="relative">
            <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
        );
      case 'ticket_attended':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'ticket_resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ticket_closed':
        return <Archive className="w-5 h-5 text-gray-500" />;
      case 'sutran_visit_scheduled':
        return <CalendarDays className="w-5 h-5 text-purple-500" />;
      case 'sutran_visit_completed':
        return <CheckSquare className="w-5 h-5 text-green-600" />;
      default:
        return <div className="w-4 h-4 bg-slate-500 rounded-full"></div>;
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
      case 'sutran_visit_scheduled':
        return 'bg-purple-50 border-purple-200';
      case 'sutran_visit_completed':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'read':
        return notifications.filter(n => n.read);
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

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

  if (!user || !notificationRoles.includes(user.role)) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          // El clic en la campana ES un gesto del usuario → desbloquear audio aquí.
          if (!audioUnlocked) {
            try { unlockAudioContext(); setAudioUnlocked(true); } catch (_) { }
          }
          setShowDropdown(!showDropdown);
        }}
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
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          <div className="absolute left-1/2 sm:right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-96 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 sm:left-auto left-1/2 sm:translate-x-0 -translate-x-1/2">
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-[#001529]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-white text-sm sm:text-base">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                  {/* Botón de prueba de sonido — también desbloquea el AudioContext */}
                  <button
                    onClick={handleUnlockAndPlay}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 transition-all text-xs font-bold"
                    title={audioUnlocked ? 'Probar sonido de alerta' : 'Activar y probar sonido'}
                  >
                    <span>{audioUnlocked ? '🔊' : '🔇'}</span>
                  </button>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all text-xs font-bold"
                      title="Limpiar todas las notificaciones"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-100">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === 'all'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-white border-transparent hover:text-slate-700'
                    }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === 'unread'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-white border-transparent hover:text-slate-700'
                    }`}
                >
                  Nuevas ({unreadCount})
                </button>
                <button
                  onClick={() => setActiveTab('read')}
                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === 'read'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-white border-transparent hover:text-slate-700'
                    }`}
                >
                  Leídas ({notifications.length - unreadCount})
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                  <p className="text-slate-600 font-medium">Cargando notificaciones...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-red-300 mx-auto mb-3" />
                  <p className="text-red-600 font-medium">Error al cargar notificaciones</p>
                  <button
                    onClick={fetchNotifications}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No tienes notificaciones</p>
                  <p className="text-xs text-slate-500 mt-2">Las notificaciones aparecerán aquí cuando se creen, atiendan o resuelvan tickets</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 sm:p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="flex-1 cursor-pointer flex items-center gap-2 sm:gap-3"
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.ticket_id) {
                            window.location.href = `/tickets/${notification.ticket_id}`;
                          }
                        }}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate">{notification.user_name}</span>
                            </div>
                            {notification.location_name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{notification.location_name}</span>
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

            {filteredNotifications.length > 0 && (
              <div className="p-2 sm:p-3 border-t border-slate-200">
                <button
                  onClick={() => setShowDropdown(false)}
                  className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-1 sm:py-2"
                >
                  Cerrar notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

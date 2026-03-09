import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
  read: boolean;
  user_id: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Función para reproducir sonido
  const playNotificationSound = useCallback(() => {
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
      
      // Configurar volumen (suave)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      // Reproducir
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // Segundo beep para más atención
      setTimeout(() => {
        try {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          
          osc2.frequency.setValueAtTime(800, audioContext.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
          
          gain2.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.1);
        } catch (e) {
          // Ignorar error si el audio context se cerró
        }
      }, 150);
    } catch (error) {
      console.log('No se pudo reproducir sonido de notificación:', error);
    }
  }, []);

  // Cargar notificaciones del usuario
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }, [user]);

  // Marcar notificación como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
    }
  }, [user]);

  // Crear una nueva notificación
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at' | 'read' | 'user_id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: user.id,
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      // Reproducir sonido para nueva notificación
      playNotificationSound();

      return data;
    } catch (error) {
      console.error('Error creando notificación:', error);
    }
  }, [user, playNotificationSound]);

  // Suscribirse a nuevas notificaciones en tiempo real
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        
        // Agregar notificación al estado
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Reproducir sonido
        playNotificationSound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, playNotificationSound]);

  // Cargar notificaciones iniciales
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Solicitar permisos para notificaciones del navegador
  const requestBrowserPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Mostrar notificación del navegador
  const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    requestBrowserPermission,
    showBrowserNotification,
    playNotificationSound
  };
}

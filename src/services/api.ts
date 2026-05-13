import axios from 'axios';

// Detectamos la URL del API. Priorizamos el .env, luego el host actual, luego localhost.
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.trim()
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '')
      .replace(/\s+/g, '')
      .replace(/\/+$/, '');
  }
  
  // En producción (VPS), si no hay URL definida, usamos la ruta relativa
  // Esto permite que Nginx maneje el proxy en el puerto 80
  if (window.location.hostname !== 'localhost') {
    return '/api';
  }
  
  return 'http://localhost:3000/api';
};

const API_URL = getBaseURL();
console.log("DEBUG: API_URL configurada en el servicio:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición: Inyectar Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta: Manejo de Errores Globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Sesión expirada o no autorizada');
      // Limpiar tokens y redirigir al login
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
      // Solo redirigir si no estamos ya en la página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

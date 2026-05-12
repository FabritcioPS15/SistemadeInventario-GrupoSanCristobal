import axios from 'axios';

// Detectamos la URL del API. Priorizamos el .env, luego el host actual, luego localhost.
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // Si estamos en producción (VPS), podemos intentar deducir la IP/Dominio
  if (window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  
  return 'http://localhost:3000/api';
};

const API_URL = getBaseURL();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición: Inyectar Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
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
      // Podríamos redirigir al login si fuera necesario
      // localStorage.removeItem('auth_token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

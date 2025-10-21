import { useEffect, useState } from 'react';
import { Package, Camera, MapPin, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TestButtons from '../components/TestButtons';

interface DashboardProps {
  onShowDiagnostic?: () => void;
  onShowConnectionTest?: () => void;
  onShowQuickDiagnostic?: () => void;
}

export default function Dashboard({ onShowDiagnostic, onShowConnectionTest, onShowQuickDiagnostic }: DashboardProps) {
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeAssets: 0,
    totalCameras: 0,
    activeCameras: 0,
    totalLocations: 0,
    totalUsers: 0,
    maintenanceAssets: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        { count: totalAssets },
        { count: activeAssets },
        { count: totalCameras },
        { count: activeCameras },
        { count: totalLocations },
        { count: totalUsers },
        { count: maintenanceAssets },
      ] = await Promise.all([
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('cameras').select('*', { count: 'exact', head: true }),
        supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
      ]);

      setStats({
        totalAssets: totalAssets || 0,
        activeAssets: activeAssets || 0,
        totalCameras: totalCameras || 0,
        activeCameras: activeCameras || 0,
        totalLocations: totalLocations || 0,
        totalUsers: totalUsers || 0,
        maintenanceAssets: maintenanceAssets || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err
      });
      setError(`Error al cargar los datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Activos',
      value: stats.totalAssets,
      subtitle: `${stats.activeAssets} activos`,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Cámaras',
      value: stats.totalCameras,
      subtitle: `${stats.activeCameras} activas`,
      icon: Camera,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Sedes',
      value: stats.totalLocations,
      subtitle: 'Ubicaciones registradas',
      icon: MapPin,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Usuarios',
      value: stats.totalUsers,
      subtitle: 'Personal registrado',
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-600" size={20} />
            <h3 className="text-lg font-semibold text-red-800">Error de Conexión</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="space-y-2 text-sm text-red-600">
            <p>• Verifica que las migraciones se ejecutaron correctamente</p>
            <p>• Ejecuta <code className="bg-red-100 px-2 py-1 rounded">safe_migration.sql</code> en Supabase</p>
            <p>• Ejecuta <code className="bg-red-100 px-2 py-1 rounded">fixed_test_data.sql</code> para datos de prueba</p>
            <p>• Verifica las variables de entorno en <code className="bg-red-100 px-2 py-1 rounded">.env.local</code></p>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={fetchStats}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
            {onShowDiagnostic && (
              <button 
                onClick={onShowDiagnostic}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Ver Diagnóstico
              </button>
            )}
            {onShowConnectionTest && (
              <button 
                onClick={onShowConnectionTest}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Prueba de Conexión
              </button>
            )}
            {onShowQuickDiagnostic && (
              <button 
                onClick={onShowQuickDiagnostic}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              >
                Diagnóstico Rápido
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Vista general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={stat.textColor} size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Estado del Inventario</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Activos Operativos</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats.totalAssets > 0
                    ? Math.round((stats.activeAssets / stats.totalAssets) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.totalAssets > 0
                        ? (stats.activeAssets / stats.totalAssets) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Cámaras Activas</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats.totalCameras > 0
                    ? Math.round((stats.activeCameras / stats.totalCameras) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.totalCameras > 0
                        ? (stats.activeCameras / stats.totalCameras) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-orange-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Atención Requerida</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm text-gray-700">Activos en Mantenimiento</span>
              <span className="text-lg font-bold text-yellow-700">{stats.maintenanceAssets}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Activos Inactivos</span>
              <span className="text-lg font-bold text-gray-700">
                {stats.totalAssets - stats.activeAssets - stats.maintenanceAssets}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <TestButtons />
      </div>
    </div>
  );
}
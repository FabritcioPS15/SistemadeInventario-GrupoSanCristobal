import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function DiagnosticPanel() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults: DiagnosticResult[] = [];

    // Test 1: Verificar variables de entorno
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    newResults.push({
      test: 'Variables de Entorno',
      status: supabaseUrl && supabaseKey ? 'success' : 'error',
      message: supabaseUrl && supabaseKey ? 'Variables configuradas correctamente' : 'Variables de entorno faltantes',
      details: supabaseUrl ? `URL: ${supabaseUrl.substring(0, 30)}...` : 'VITE_SUPABASE_URL no encontrada'
    });

    // Test 2: Verificar conexión básica
    try {
      const { data, error } = await supabase.from('locations').select('count', { count: 'exact', head: true });
      
      newResults.push({
        test: 'Conexión a Supabase',
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : 'Conexión exitosa',
        details: error ? error.details : `Tabla locations accesible`
      });
    } catch (err) {
      newResults.push({
        test: 'Conexión a Supabase',
        status: 'error',
        message: 'Error de conexión',
        details: err instanceof Error ? err.message : 'Error desconocido'
      });
    }

    // Test 3: Verificar tablas existentes
    const tables = ['locations', 'asset_types', 'assets', 'cameras', 'mtc_accesos', 'users', 'audit_logs', 'maintenance_records', 'shipments'];
    let tablesExist = 0;

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) tablesExist++;
      } catch (err) {
        // Tabla no existe
      }
    }

    newResults.push({
      test: 'Tablas de Base de Datos',
      status: tablesExist === tables.length ? 'success' : tablesExist > 0 ? 'warning' : 'error',
      message: `${tablesExist}/${tables.length} tablas existen`,
      details: tablesExist === tables.length ? 'Todas las tablas están creadas' : 'Ejecuta safe_migration.sql'
    });

    // Test 4: Verificar datos de prueba
    try {
      const { count: locationsCount } = await supabase.from('locations').select('*', { count: 'exact', head: true });
      const { count: assetsCount } = await supabase.from('assets').select('*', { count: 'exact', head: true });
      
      newResults.push({
        test: 'Datos de Prueba',
        status: (locationsCount || 0) > 0 && (assetsCount || 0) > 0 ? 'success' : 'warning',
        message: `Ubicaciones: ${locationsCount || 0}, Activos: ${assetsCount || 0}`,
        details: (locationsCount || 0) > 0 ? 'Datos de prueba insertados' : 'Ejecuta fixed_test_data.sql'
      });
    } catch (err) {
      newResults.push({
        test: 'Datos de Prueba',
        status: 'error',
        message: 'Error al verificar datos',
        details: err instanceof Error ? err.message : 'Error desconocido'
      });
    }

    // Test 5: Verificar políticas RLS
    try {
      const { data: policies } = await supabase.rpc('get_rls_policies');
      newResults.push({
        test: 'Políticas RLS',
        status: policies && policies.length > 0 ? 'success' : 'warning',
        message: policies ? `${policies.length} políticas configuradas` : 'Políticas no verificadas',
        details: 'RLS habilitado en las tablas'
      });
    } catch (err) {
      newResults.push({
        test: 'Políticas RLS',
        status: 'warning',
        message: 'No se pudo verificar políticas',
        details: 'RLS puede estar configurado correctamente'
      });
    }

    setResults(newResults);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <XCircle className="text-red-600" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600" size={20} />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Panel de Diagnóstico</h2>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>
        <p className="text-gray-600 mt-2">Diagnóstico del sistema y conexión con Supabase</p>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(result.status)}
              <h3 className="font-semibold text-gray-900">{result.test}</h3>
            </div>
            <p className="text-gray-700 mb-1">{result.message}</p>
            {result.details && (
              <p className="text-sm text-gray-600">{result.details}</p>
            )}
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. Ejecuta <code className="bg-blue-100 px-2 py-1 rounded">safe_migration.sql</code> en Supabase SQL Editor</p>
            <p>2. Ejecuta <code className="bg-blue-100 px-2 py-1 rounded">fixed_test_data.sql</code> para datos de prueba</p>
            <p>3. Verifica que <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code> tenga las variables correctas</p>
            <p>4. Recarga la página para ver los cambios</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  count?: number;
  details?: any;
}

export default function QuickDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults: DiagnosticResult[] = [];

    // Test 1: Verificar ubicaciones
    try {
      const { data, error, count } = await supabase
        .from('locations')
        .select('*', { count: 'exact' })
        .limit(5);
      
      newResults.push({
        test: 'Ubicaciones',
        status: error ? 'error' : count === 0 ? 'warning' : 'success',
        message: error ? `Error: ${error.message}` : `${count || 0} ubicaciones encontradas`,
        count: count || 0,
        details: error
      });
    } catch (err) {
      newResults.push({
        test: 'Ubicaciones',
        status: 'error',
        message: 'Error de conexión',
        details: err
      });
    }

    // Test 2: Verificar activos
    try {
      const { data, error, count } = await supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .limit(5);
      
      newResults.push({
        test: 'Activos',
        status: error ? 'error' : count === 0 ? 'warning' : 'success',
        message: error ? `Error: ${error.message}` : `${count || 0} activos encontrados`,
        count: count || 0,
        details: error
      });
    } catch (err) {
      newResults.push({
        test: 'Activos',
        status: 'error',
        message: 'Error de conexión',
        details: err
      });
    }

    // Test 3: Verificar usuarios
    try {
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .limit(5);
      
      newResults.push({
        test: 'Usuarios',
        status: error ? 'error' : count === 0 ? 'warning' : 'success',
        message: error ? `Error: ${error.message}` : `${count || 0} usuarios encontrados`,
        count: count || 0,
        details: error
      });
    } catch (err) {
      newResults.push({
        test: 'Usuarios',
        status: 'error',
        message: 'Error de conexión',
        details: err
      });
    }

    // Test 4: Verificar cámaras
    try {
      const { data, error, count } = await supabase
        .from('cameras')
        .select('*', { count: 'exact' })
        .limit(5);
      
      newResults.push({
        test: 'Cámaras',
        status: error ? 'error' : count === 0 ? 'warning' : 'success',
        message: error ? `Error: ${error.message}` : `${count || 0} cámaras encontradas`,
        count: count || 0,
        details: error
      });
    } catch (err) {
      newResults.push({
        test: 'Cámaras',
        status: 'error',
        message: 'Error de conexión',
        details: err
      });
    }

    // Test 5: Verificar tipos de activos
    try {
      const { data, error, count } = await supabase
        .from('asset_types')
        .select('*', { count: 'exact' });
      
      newResults.push({
        test: 'Tipos de Activos',
        status: error ? 'error' : count === 0 ? 'warning' : 'success',
        message: error ? `Error: ${error.message}` : `${count || 0} tipos encontrados`,
        count: count || 0,
        details: error
      });
    } catch (err) {
      newResults.push({
        test: 'Tipos de Activos',
        status: 'error',
        message: 'Error de conexión',
        details: err
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

  const totalData = results.reduce((sum, result) => sum + (result.count || 0), 0);
  const hasData = results.some(result => result.count && result.count > 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Diagnóstico Rápido</h2>
            <p className="text-gray-600 mt-1">Verificación de datos en Supabase</p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 text-lg">
            {hasData ? '✅' : '⚠️'}
          </span>
          <h3 className="font-semibold text-blue-900">Resumen</h3>
        </div>
        <p className="text-blue-800">
          {hasData 
            ? `Total de registros encontrados: ${totalData}`
            : 'No se encontraron datos. Ejecuta fixed_test_data.sql en Supabase.'
          }
        </p>
      </div>

      {/* Resultados detallados */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(result.status)}
              <h3 className="font-semibold text-gray-900">{result.test}</h3>
              {result.count !== undefined && (
                <span className="text-sm text-gray-600">({result.count})</span>
              )}
            </div>
            <p className="text-gray-700 mb-1">{result.message}</p>
            {result.details && (
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer hover:text-gray-800">Ver detalles técnicos</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Instrucciones */}
      {!hasData && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Instrucciones</h3>
          <div className="text-sm text-yellow-800 space-y-1">
            <p>1. Ejecuta <code className="bg-yellow-100 px-2 py-1 rounded">safe_migration.sql</code> en Supabase SQL Editor</p>
            <p>2. Ejecuta <code className="bg-yellow-100 px-2 py-1 rounded">fixed_test_data.sql</code> para insertar datos de prueba</p>
            <p>3. Ejecuta <code className="bg-yellow-100 px-2 py-1 rounded">enable_anonymous_access.sql</code> para habilitar acceso anónimo</p>
            <p>4. Recarga esta página para ver los cambios</p>
          </div>
        </div>
      )}

      {hasData && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Sistema Listo</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>• Los datos están disponibles en Supabase</p>
            <p>• La conexión está funcionando correctamente</p>
            <p>• El Dashboard debería mostrar las estadísticas</p>
            <p>• Todas las vistas deberían funcionar con datos reales</p>
          </div>
        </div>
      )}
    </div>
  );
}

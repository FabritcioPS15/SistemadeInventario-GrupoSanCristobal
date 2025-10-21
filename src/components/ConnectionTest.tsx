import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ConnectionTest() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults: any[] = [];

    // Test 1: Verificar variables de entorno
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    testResults.push({
      test: 'Variables de Entorno',
      status: url && key ? 'success' : 'error',
      message: url && key ? 'Variables presentes' : 'Variables faltantes',
      details: { url: url?.substring(0, 30) + '...', key: key ? 'Presente' : 'Faltante' }
    });

    // Test 2: Conexión básica
    try {
      const { data, error } = await supabase.from('locations').select('count', { count: 'exact', head: true });
      testResults.push({
        test: 'Conexión Básica',
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : 'Conexión exitosa',
        details: { error: error?.message, data }
      });
    } catch (err) {
      testResults.push({
        test: 'Conexión Básica',
        status: 'error',
        message: 'Error de conexión',
        details: { error: err }
      });
    }

    // Test 3: Verificar datos
    try {
      const { data, error } = await supabase.from('locations').select('*').limit(5);
      testResults.push({
        test: 'Datos de Ubicaciones',
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : `${data?.length || 0} ubicaciones encontradas`,
        details: { error: error?.message, count: data?.length, sample: data?.[0] }
      });
    } catch (err) {
      testResults.push({
        test: 'Datos de Ubicaciones',
        status: 'error',
        message: 'Error al obtener datos',
        details: { error: err }
      });
    }

    // Test 4: Verificar activos
    try {
      const { data, error } = await supabase.from('assets').select('*').limit(5);
      testResults.push({
        test: 'Datos de Activos',
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : `${data?.length || 0} activos encontrados`,
        details: { error: error?.message, count: data?.length, sample: data?.[0] }
      });
    } catch (err) {
      testResults.push({
        test: 'Datos de Activos',
        status: 'error',
        message: 'Error al obtener activos',
        details: { error: err }
      });
    }

    // Test 5: Verificar políticas RLS
    try {
      // Intentar insertar un registro de prueba (debería fallar por RLS)
      const { error: insertError } = await supabase
        .from('locations')
        .insert({ name: 'Test RLS', type: 'revision' });
      
      testResults.push({
        test: 'Políticas RLS',
        status: insertError ? 'success' : 'warning',
        message: insertError ? 'RLS funcionando (inserción bloqueada)' : 'RLS puede no estar configurado',
        details: { error: insertError?.message }
      });
    } catch (err) {
      testResults.push({
        test: 'Políticas RLS',
        status: 'error',
        message: 'Error al verificar RLS',
        details: { error: err }
      });
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Prueba de Conexión</h2>
        <p className="text-gray-600">Verificación detallada de la conexión con Supabase</p>
        <button
          onClick={runTests}
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Ejecutando...' : 'Ejecutar Pruebas'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              result.status === 'success' ? 'bg-green-50 border-green-200' :
              result.status === 'error' ? 'bg-red-50 border-red-200' :
              'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${
                result.status === 'success' ? 'text-green-600' :
                result.status === 'error' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️'}
              </span>
              <h3 className="font-semibold text-gray-900">{result.test}</h3>
            </div>
            <p className="text-gray-700 mb-2">{result.message}</p>
            {result.details && (
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer hover:text-gray-800">Ver detalles</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instrucciones de Solución</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. Si hay errores de RLS, verifica que las políticas estén configuradas para usuarios anónimos</p>
            <p>2. Si hay errores de conexión, verifica las variables de entorno</p>
            <p>3. Si no hay datos, ejecuta <code className="bg-blue-100 px-2 py-1 rounded">fixed_test_data.sql</code></p>
            <p>4. Revisa la consola del navegador para más detalles</p>
          </div>
        </div>
      )}
    </div>
  );
}

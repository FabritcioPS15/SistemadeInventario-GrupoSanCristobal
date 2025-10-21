import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestButtons() {
  const [testResult, setTestResult] = useState('');

  const testDelete = async () => {
    try {
      console.log('Probando eliminación...');
      const { data, error } = await supabase
        .from('assets')
        .select('id, brand, model')
        .limit(1);

      if (error) {
        setTestResult('Error al obtener datos: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        const asset = data[0];
        console.log('Eliminando activo:', asset);
        
        const { error: deleteError } = await supabase
          .from('assets')
          .delete()
          .eq('id', asset.id);

        if (deleteError) {
          setTestResult('Error al eliminar: ' + deleteError.message);
        } else {
          setTestResult('Eliminación exitosa');
        }
      } else {
        setTestResult('No hay activos para eliminar');
      }
    } catch (err) {
      setTestResult('Error: ' + err);
    }
  };

  const testUpdate = async () => {
    try {
      console.log('Probando actualización...');
      const { data, error } = await supabase
        .from('assets')
        .select('id, brand, model')
        .limit(1);

      if (error) {
        setTestResult('Error al obtener datos: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        const asset = data[0];
        console.log('Actualizando activo:', asset);
        
        const { error: updateError } = await supabase
          .from('assets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', asset.id);

        if (updateError) {
          setTestResult('Error al actualizar: ' + updateError.message);
        } else {
          setTestResult('Actualización exitosa');
        }
      } else {
        setTestResult('No hay activos para actualizar');
      }
    } catch (err) {
      setTestResult('Error: ' + err);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Pruebas de CRUD</h3>
      <div className="space-y-2">
        <button
          onClick={testDelete}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Probar Eliminación
        </button>
        <button
          onClick={testUpdate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Probar Actualización
        </button>
      </div>
      {testResult && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-sm">
          {testResult}
        </div>
      )}
    </div>
  );
}


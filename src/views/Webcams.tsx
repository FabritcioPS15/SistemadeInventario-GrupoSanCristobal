import { useEffect, useState } from 'react';
import { BsWebcam } from 'react-icons/bs';
import { supabase, Camera } from '../lib/supabase';

export default function Webcams() {
  const [loading, setLoading] = useState(true);
  const [webcams, setWebcams] = useState<Camera[]>([]);

  useEffect(() => {
    const fetchWebcams = async () => {
      setLoading(true);
      // Nota: Ajusta el filtro según cómo identifiques "cámaras web" en tu modelo
      // Aquí usamos una heurística por nombre o modelo que contenga 'webcam'
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .ilike('name', '%webcam%');

      if (!error && data) setWebcams(data as Camera[]);
      setLoading(false);
    };

    fetchWebcams();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6">
        <BsWebcam size={22} className="text-slate-700" />
        <h2 className="text-2xl font-bold text-gray-900">Cámaras web</h2>
      </div>

      {loading ? (
        <div className="text-left py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {webcams.map((cam) => (
            <div key={cam.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2 text-slate-700">
                <BsWebcam />
                <span className="font-semibold">{cam.name}</span>
              </div>
              {cam.url && (
                <div className="text-sm">
                  <span className="text-gray-500">URL: </span>
                  <a className="text-blue-600 hover:underline" href={cam.url} target="_blank" rel="noreferrer">
                    {cam.url}
                  </a>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">Estado: {cam.status}</div>
            </div>
          ))}
          {webcams.length === 0 && (
            <div className="text-gray-500">No se encontraron cámaras web.</div>
          )}
        </div>
      )}
    </div>
  );
}



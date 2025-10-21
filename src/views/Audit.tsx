import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuditLog = {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
};

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setLogs(data);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntityType = !filterEntityType || log.entity_type === filterEntityType;

    return matchesSearch && matchesEntityType;
  });

  const entityTypes = Array.from(new Set(logs.map(log => log.entity_type)));

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('insert')) return 'bg-green-100 text-green-800';
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Auditoría</h2>
        <p className="text-gray-600">Registro de actividades y cambios en el sistema</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar en auditoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las entidades</option>
            {entityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-left py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{log.entity_type}</span>
                      </div>

                      {log.entity_id && (
                        <p className="text-sm text-gray-600 mb-1">
                          ID: <span className="font-mono text-xs">{log.entity_id}</span>
                        </p>
                      )}

                      {log.details && (
                        <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                          <pre className="text-gray-700 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500">{formatDate(log.created_at)}</p>
                      {log.user_id && (
                        <p className="text-xs text-gray-400 mt-1">User: {log.user_id.slice(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-left py-12">
              <p className="text-gray-500">No se encontraron registros</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

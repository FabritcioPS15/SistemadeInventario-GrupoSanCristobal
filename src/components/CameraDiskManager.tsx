import { useState, useEffect } from 'react';
import { Plus, Trash2, HardDrive, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, CameraDisk } from '../lib/supabase';

type CameraDiskManagerProps = {
  cameraId: string;
  onDisksChange?: (disks: CameraDisk[]) => void;
};

export default function CameraDiskManager({ cameraId, onDisksChange }: CameraDiskManagerProps) {
  const [disks, setDisks] = useState<CameraDisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDisk, setEditingDisk] = useState<CameraDisk | null>(null);

  const [formData, setFormData] = useState({
    disk_number: 1,
    total_capacity_gb: '',
    remaining_capacity_gb: '',
    disk_type: 'HDD' as 'HDD' | 'SSD' | 'NVMe' | 'Other',
    status: 'active' as 'active' | 'full' | 'error' | 'maintenance',
    notes: ''
  });

  useEffect(() => {
    if (cameraId) {
      fetchDisks();
    }
  }, [cameraId]);

  const fetchDisks = async () => {
    try {
      const { data, error } = await supabase
        .from('camera_disks')
        .select('*')
        .eq('camera_id', cameraId)
        .order('disk_number');

      if (error) {
        console.error('Error fetching disks:', error);
        return;
      }

      setDisks(data || []);
      onDisksChange?.(data || []);
    } catch (err) {
      console.error('Error fetching disks:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.total_capacity_gb || !formData.remaining_capacity_gb) {
      alert('Capacidad total y capacidad restante son requeridos');
      return;
    }

    const totalCapacity = parseFloat(formData.total_capacity_gb);
    const remainingCapacity = parseFloat(formData.remaining_capacity_gb);

    if (remainingCapacity > totalCapacity) {
      alert('La capacidad restante no puede ser mayor que la capacidad total');
      return;
    }

    // Verificar que el número de disco no esté en uso (solo para nuevos discos)
    if (!editingDisk) {
      const existingDisk = disks.find(d => d.disk_number === formData.disk_number);
      if (existingDisk) {
        alert(`El disco número ${formData.disk_number} ya existe para esta cámara`);
        return;
      }
    }

    setLoading(true);

    try {
      const diskData = {
        camera_id: cameraId,
        disk_number: formData.disk_number,
        total_capacity_gb: totalCapacity,
        remaining_capacity_gb: remainingCapacity,
        disk_type: formData.disk_type,
        status: formData.status,
        notes: formData.notes || null
      };

      if (editingDisk) {
        const { error } = await supabase
          .from('camera_disks')
          .update(diskData)
          .eq('id', editingDisk.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('camera_disks')
          .insert([diskData]);

        if (error) throw error;
      }

      await fetchDisks();
      resetForm();
    } catch (error) {
      console.error('Error saving disk:', error);
      alert('Error al guardar el disco: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (diskId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este disco?')) return;

    try {
      const { error } = await supabase
        .from('camera_disks')
        .delete()
        .eq('id', diskId);

      if (error) throw error;

      await fetchDisks();
    } catch (error) {
      console.error('Error deleting disk:', error);
      alert('Error al eliminar el disco: ' + (error as Error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      disk_number: 1,
      total_capacity_gb: '',
      remaining_capacity_gb: '',
      disk_type: 'HDD',
      status: 'active',
      notes: ''
    });
    setShowAddForm(false);
    setEditingDisk(null);
  };

  const handleEdit = (disk: CameraDisk) => {
    setFormData({
      disk_number: disk.disk_number,
      total_capacity_gb: disk.total_capacity_gb.toString(),
      remaining_capacity_gb: disk.remaining_capacity_gb.toString(),
      disk_type: disk.disk_type,
      status: disk.status,
      notes: disk.notes || ''
    });
    setEditingDisk(disk);
    setShowAddForm(true);
  };

  const getAvailableDiskNumbers = () => {
    const usedNumbers = disks.map(d => d.disk_number);
    return [1, 2, 3, 4].filter(num => {
      // Si estamos editando, permitir el número actual del disco
      if (editingDisk && editingDisk.disk_number === num) {
        return true;
      }
      // Si no estamos editando, solo permitir números no usados
      return !usedNumbers.includes(num);
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'full':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'maintenance':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'full':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsagePercentage = (remaining: number, total: number) => {
    const used = total - remaining;
    return Math.round((used / total) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Discos de Almacenamiento
        </h3>
        {disks.length < 4 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Establecer el siguiente número de disco disponible
              const availableNumbers = getAvailableDiskNumbers();
              if (availableNumbers.length > 0) {
                setFormData(prev => ({
                  ...prev,
                  disk_number: availableNumbers[0]
                }));
              }
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            Agregar Disco
          </button>
        )}
      </div>

      {/* Lista de discos */}
      <div className="grid gap-4">
        {disks.map((disk) => (
          <div key={disk.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Disco {disk.disk_number} - {disk.disk_type}
                  </h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(disk.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(disk.status)}`}>
                      {disk.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEdit(disk);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(disk.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Capacidad Total: {disk.total_capacity_gb} GB</span>
                <span>Espacio Usado: {disk.used_space_gb} GB</span>
                <span>Capacidad Restante: {disk.remaining_capacity_gb} GB</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(disk.remaining_capacity_gb, disk.total_capacity_gb))}`}
                  style={{
                    width: `${getUsagePercentage(disk.remaining_capacity_gb, disk.total_capacity_gb)}%`
                  }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                {getUsagePercentage(disk.remaining_capacity_gb, disk.total_capacity_gb)}% usado
              </div>
            </div>

            {disk.notes && (
              <div className="mt-2 text-sm text-gray-600">
                <strong>Notas:</strong> {disk.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulario para agregar/editar disco */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">
            {editingDisk ? 'Editar Disco' : 'Agregar Nuevo Disco'}
          </h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Disco
                </label>
                <select
                  value={formData.disk_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, disk_number: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {getAvailableDiskNumbers().map(num => (
                    <option key={num} value={num}>
                      Disco {num} {disks.find(d => d.disk_number === num) ? '(En uso)' : '(Disponible)'}
                    </option>
                  ))}
                </select>
                {getAvailableDiskNumbers().length === 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    No hay números de disco disponibles (máximo 4 discos)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Disco
                </label>
                <select
                  value={formData.disk_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, disk_type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HDD">HDD</option>
                  <option value="SSD">SSD</option>
                  <option value="NVMe">NVMe</option>
                  <option value="Other">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad Total (GB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_capacity_gb}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_capacity_gb: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad Restante (GB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.remaining_capacity_gb}
                  onChange={(e) => setFormData(prev => ({ ...prev, remaining_capacity_gb: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Activo</option>
                <option value="full">Lleno</option>
                <option value="error">Error</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : (editingDisk ? 'Actualizar' : 'Agregar')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

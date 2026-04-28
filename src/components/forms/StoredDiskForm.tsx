import React, { useState, useEffect } from 'react';
import { X, HardDrive, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StoredDiskFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editDisk?: any;
}

export default function StoredDiskForm({ onClose, onSuccess, editDisk }: StoredDiskFormProps) {
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    camera_id: '',
    disk_number: 1,
    total_capacity_gb: '',
    used_space_gb: '',
    disk_type: 'HDD' as 'HDD' | 'SSD' | 'NVMe' | 'Other',
    brand: '',
    serial_number: '',
    stored_from: '',
    stored_to: '',
    notes: ''
  });

  useEffect(() => {
    fetchCameras();
    if (editDisk) {
      setFormData({
        camera_id: editDisk.camera_id || '',
        disk_number: editDisk.disk_number || 1,
        total_capacity_gb: editDisk.total_capacity_gb?.toString() || '',
        used_space_gb: editDisk.used_space_gb?.toString() || '',
        disk_type: editDisk.disk_type || 'HDD',
        brand: editDisk.brand || '',
        serial_number: editDisk.serial_number || '',
        stored_from: editDisk.stored_from || '',
        stored_to: editDisk.stored_to || '',
        notes: editDisk.notes || ''
      });
    }
  }, [editDisk]);

  async function fetchCameras() {
    const { data } = await supabase.from('cameras').select('id, name').order('name');
    if (data) setCameras(data);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.camera_id) {
      alert('Por favor seleccione una cámara de origen');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        camera_id: formData.camera_id,
        disk_number: formData.disk_number,
        disk_type: formData.disk_type,
        brand: formData.brand || null,
        serial_number: formData.serial_number || null,
        stored_from: formData.stored_from || null,
        stored_to: formData.stored_to || null,
        notes: formData.notes || null,
        total_capacity_gb: Number(formData.total_capacity_gb),
        used_space_gb: Number(formData.used_space_gb),
        remaining_capacity_gb: Number(formData.total_capacity_gb) - Number(formData.used_space_gb)
      };

      if (editDisk) {
        const { error } = await supabase
          .from('stored_disks')
          .update(dataToSave)
          .eq('id', editDisk.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stored_disks')
          .insert([dataToSave]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving disk:', error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-[#002855] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <HardDrive size={20} />
            <span className="font-black uppercase tracking-widest text-sm">
              {editDisk ? 'Editar Disco Almacenado' : 'Nuevo Disco Almacenado'}
            </span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Cámara de Origen <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.camera_id}
                onChange={e => setFormData(prev => ({ ...prev, camera_id: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Seleccione una cámara...</option>
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Marca
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ej: Western Digital, Seagate..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Número de Serie
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={e => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="S/N..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Tipo de Disco
              </label>
              <select
                value={formData.disk_type}
                onChange={e => setFormData(prev => ({ ...prev, disk_type: e.target.value as any }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="HDD">HDD (Mecánico)</option>
                <option value="SSD">SSD (Sólido)</option>
                <option value="NVMe">NVMe</option>
                <option value="Other">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Capacidad Total (GB)
              </label>
              <input
                type="number"
                required
                value={formData.total_capacity_gb}
                onChange={e => setFormData(prev => ({ ...prev, total_capacity_gb: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ej: 1000"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Espacio Usado (GB)
              </label>
              <input
                type="number"
                required
                value={formData.used_space_gb}
                onChange={e => setFormData(prev => ({ ...prev, used_space_gb: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ej: 800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Grabación Desde
              </label>
              <input
                type="date"
                value={formData.stored_from}
                onChange={e => setFormData(prev => ({ ...prev, stored_from: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Grabación Hasta
              </label>
              <input
                type="date"
                value={formData.stored_to}
                onChange={e => setFormData(prev => ({ ...prev, stored_to: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Notas / Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                placeholder="Detalles sobre el contenido del disco..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'Guardando...' : editDisk ? 'Actualizar Disco' : 'Guardar Disco'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Plus, Trash2, HardDrive,
  Edit2
} from 'lucide-react';
import type { CameraDisk } from '../lib/supabase';

type CameraDiskManagerProps = {
  disks: Partial<CameraDisk>[];
  onChange: (disks: Partial<CameraDisk>[]) => void;
};

export default function CameraDiskManager({ disks, onChange }: CameraDiskManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    disk_number: 1,
    total_capacity_gb: '',
    remaining_capacity_gb: '',
    disk_type: 'HDD' as 'HDD' | 'SSD' | 'NVMe' | 'Other',
    status: 'active' as 'active' | 'full' | 'error' | 'maintenance' | 'extracted',
    brand: '',
    serial_number: '',
    stored_from: '',
    stored_to: '',
    notes: ''
  });

  const handleAddOrUpdate = () => {
    if (!formData.total_capacity_gb || !formData.remaining_capacity_gb) {
      alert('Capacidad total y restante son requeridas');
      return;
    }

    const total = parseFloat(formData.total_capacity_gb);
    const remaining = parseFloat(formData.remaining_capacity_gb);

    if (remaining > total) {
      alert('La capacidad restante no puede ser mayor a la total');
      return;
    }

    const newDisk = {
      ...formData,
      total_capacity_gb: total,
      remaining_capacity_gb: remaining,
      used_space_gb: total - remaining
    };

    let updatedDisks = [...disks];
    if (editingIndex !== null) {
      updatedDisks[editingIndex] = { ...updatedDisks[editingIndex], ...newDisk };
    } else {
      // Verificar duplicados de número de disco
      if (disks.some(d => d.disk_number === formData.disk_number)) {
        alert(`El disco #${formData.disk_number} ya está en la lista`);
        return;
      }
      updatedDisks.push(newDisk);
    }

    onChange(updatedDisks);
    resetForm();
  };

  const removeDisk = (index: number) => {
    const updated = disks.filter((_, i) => i !== index);
    onChange(updated);
  };

  const resetForm = () => {
    setFormData({
      disk_number: disks.length + 1,
      total_capacity_gb: '',
      remaining_capacity_gb: '',
      disk_type: 'HDD',
      status: 'active',
      brand: '',
      serial_number: '',
      stored_from: '',
      stored_to: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const startEdit = (index: number) => {
    const disk = disks[index];
    setFormData({
      disk_number: disk.disk_number || 1,
      total_capacity_gb: disk.total_capacity_gb?.toString() || '',
      remaining_capacity_gb: disk.remaining_capacity_gb?.toString() || '',
      disk_type: (disk.disk_type as any) || 'HDD',
      status: (disk.status as any) || 'active',
      brand: disk.brand || '',
      serial_number: disk.serial_number || '',
      stored_from: disk.stored_from || '',
      stored_to: disk.stored_to || '',
      notes: disk.notes || ''
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const getAvailableDiskNumbers = () => {
    const used = disks.map((d, i) => i === editingIndex ? -1 : d.disk_number);
    return [1, 2, 3, 4, 5, 6, 7, 8].filter(n => !used.includes(n));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-black text-[#002855] uppercase tracking-wider">Discos Configurados ({disks.length})</span>
        </div>
        {!showAddForm && disks.length < 8 && (
          <button
            type="button"
            onClick={() => {
              const available = getAvailableDiskNumbers();
              setFormData(prev => ({ ...prev, disk_number: available[0] || 1 }));
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus size={14} /> Añadir Disco
          </button>
        )}
      </div>

      {/* Lista de Discos - Más compacta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {disks.map((disk, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white border border-slate-200 flex items-center justify-center text-[#002855] font-black text-xs">
                {disk.disk_number}
              </div>
              <div>
                <p className="text-[11px] font-black text-[#002855] uppercase leading-tight">
                  {disk.disk_type} - {disk.total_capacity_gb}GB {disk.brand ? `(${disk.brand})` : ''}
                </p>
                <div className="flex flex-col mt-0.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {disk.status === 'active' ? '✓ Activo' : '⚠ ' + disk.status}
                    {disk.serial_number && <span className="ml-2 text-slate-300">S/N: {disk.serial_number}</span>}
                  </p>
                  {disk.stored_from || disk.stored_to ? (
                    <p className="text-[9px] font-black text-blue-600 uppercase mt-1">
                      Grabación: {disk.stored_from ? new Date(disk.stored_from + 'T00:00:00').toLocaleDateString() : '—'} al {disk.stored_to ? new Date(disk.stored_to + 'T00:00:00').toLocaleDateString() : '—'}
                    </p>
                  ) : (
                    <p className="text-[9px] font-bold text-slate-300 uppercase mt-1 italic">Sin fechas de grabación</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => startEdit(idx)} className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={14} /></button>
              <button type="button" onClick={() => removeDisk(idx)} className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario Inline - Sin pasos extras */}
      {showAddForm && (
        <div className="bg-white border-2 border-indigo-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-indigo-50 pb-2 mb-2">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
              {editingIndex !== null ? 'Editando Disco' : 'Nuevo Disco de Almacenamiento'}
            </span>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase">Cancelar</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">N° Disco</label>
              <select
                value={formData.disk_number}
                onChange={e => setFormData(p => ({ ...p, disk_number: parseInt(e.target.value) }))}
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold text-[#002855]"
              >
                {getAvailableDiskNumbers().map(n => <option key={n} value={n}>Disco {n}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
              <select
                value={formData.disk_type}
                onChange={e => setFormData(p => ({ ...p, disk_type: e.target.value as any }))}
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold text-[#002855]"
              >
                <option value="HDD">HDD</option>
                <option value="SSD">SSD</option>
                <option value="NVMe">NVMe</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacidad (GB)</label>
              <input
                type="number"
                value={formData.total_capacity_gb}
                onChange={e => setFormData(p => ({ ...p, total_capacity_gb: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold"
                placeholder="Ej: 1000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Libre (GB)</label>
              <input
                type="number"
                value={formData.remaining_capacity_gb}
                onChange={e => setFormData(p => ({ ...p, remaining_capacity_gb: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold"
                placeholder="Ej: 200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grabación Desde (Opcional)</label>
              <input
                type="date"
                value={formData.stored_from}
                onChange={e => setFormData(p => ({ ...p, stored_from: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grabación Hasta (Opcional)</label>
              <input
                type="date"
                value={formData.stored_to}
                onChange={e => setFormData(p => ({ ...p, stored_to: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddOrUpdate}
            className="w-full py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200"
          >
            {editingIndex !== null ? 'Actualizar en Lista' : 'Confirmar Disco y Añadir'}
          </button>
        </div>
      )}
    </div>
  );
}

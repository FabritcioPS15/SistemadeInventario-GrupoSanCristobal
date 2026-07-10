import { useState } from 'react';
import { Plus, Building2, Calendar, FileText, User, AlertTriangle, Edit, X, Search, MapPin, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../../shared/services/supabase';
import type { SutranVisit } from '../../../shared/services/supabase';
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery';
import SutranVisitForm from '../forms/SutranVisitForm';
import { useAuth } from '../../../app/providers/AuthContext';
import Pagination from '../../../shared/components/ui/Pagination';
import { useNotify } from '../../../shared/hooks/useNotify';
import DetailModal, {
  DetailModalHeader,
  DetailModalBody,
  StandardModalFooter,
  DetailModalGrid,
  DetailModalSection,
  DetailModalCard,
  DetailModalRow,
} from '../../../shared/components/ui/DetailModal';
import ActionToolbar from '../../../shared/components/ui/ActionToolbar';
import FilterBar from '../../../shared/components/ui/FilterBar';
import ViewToggle from '../../../shared/components/ui/ViewToggle';
import ExportButtons from '../../../shared/components/ui/ExportButtons';

export default function Sutran() {
  const { canEdit } = useAuth();
  const { success: notifySuccess, error: notifyError, confirm } = useNotify();

  // — Todos los estados declarados antes de ser usados —
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SutranVisit | undefined>();
  const [viewingVisit, setViewingVisit] = useState<SutranVisit | undefined>();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedVisits.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedVisits.map(v => v.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm(`¿Eliminar ${selectedIds.length} visitas seleccionadas?`, 'Eliminación por Lote');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('sutran_visits').delete().in('id', selectedIds);
      if (error) {
        notifyError(`Error al eliminar: ${error.message}`);
      } else {
        setSelectedIds([]);
        await refetchVisits();
        notifySuccess(`Visitas eliminadas correctamente`);
      }
    } catch (err) {
      notifyError('Error inesperado al eliminar las visitas');
    }
  };
  // Tipo correcto: wrapper con data[] y count para paginación del servidor
  const { data: visitsData, loading, refetch: refetchVisits } = useSupabaseQuery<{ data: SutranVisit[]; count: number }>(
    `sutran_visits:p${currentPage}-l${itemsPerPage}-s${statusFilter}-t${visitTypeFilter}-q${searchTerm}-loc${selectedLocations.join(',')}-k${sortConfig?.key}-d${sortConfig?.direction}`,
    async () => {
      let query = supabase
        .from('sutran_visits')
        .select('id, visit_date, location_id, visit_type, status, inspector_name, findings, observations, locations(id, name, type, region)', { count: 'exact' });

      if (statusFilter) query = query.eq('status', statusFilter);
      if (visitTypeFilter) query = query.eq('visit_type', visitTypeFilter);
      if (selectedLocations.length > 0) query = query.in('location_id', selectedLocations);
      if (searchTerm) query = query.or(`inspector_name.ilike.%${searchTerm}%,observations.ilike.%${searchTerm}%,findings.ilike.%${searchTerm}%`);

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('visit_date', { ascending: false });
      }

      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);

      const result = await query;
      return {
        data: { data: (result.data as unknown as SutranVisit[]) ?? [], count: result.count ?? 0 },
        error: result.error,
      };
    }
  );

  const { data: locationsData } = useSupabaseQuery<any[]>(
    'locations:all',
    async () => await supabase.from('locations').select('id, name, type, region').order('name')
  );

  const paginatedVisits = visitsData?.data ?? [];
  const locations = locationsData ?? [];
  const totalPages = Math.ceil((visitsData?.count ?? 0) / itemsPerPage);

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusLabels: Record<string, string> = {
    completed: 'Completada',
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    cancelled: 'Cancelada',
  };

  const typeColors: Record<string, string> = {
    programada: 'bg-[#002855]/8 text-[#002855] border-[#002855]/20',
    no_programada: 'bg-[#002855]/8 text-[#002855] border-[#002855]/20',
    de_gabinete: 'bg-[#002855]/8 text-[#002855] border-[#002855]/20',
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'programada': return 'Programada';
      case 'no_programada': return 'No programada';
      case 'de_gabinete': return 'De gabinete';
      default: return type;
    }
  };

  const handleEditVisit = (visit: SutranVisit) => {
    setEditingVisit(visit);
    setShowForm(true);
  };

  const handleViewVisit = (visit: SutranVisit) => {
    setViewingVisit(visit);
  };

  const handleDeleteVisit = async (id: string) => {
    const confirmed = await confirm(
      'Esta acción no se puede deshacer.',
      '¿Eliminar visita?'
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('sutran_visits')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error al eliminar visita:', error);
        notifyError(`Error al eliminar la visita: ${error.message}`, 'Error');
      } else {
        await refetchVisits();
        notifySuccess('Visita eliminada correctamente', 'Eliminada');
      }
    } catch (err) {
      console.error('❌ Error inesperado al eliminar visita:', err);
      notifyError('Error inesperado al eliminar la visita', 'Error');
    }
  };

  const handleSaveVisit = async () => {
    setShowForm(false);
    setEditingVisit(undefined);
    await refetchVisits();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVisit(undefined);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-1.5 hover:text-[#002855] text-slate-400 transition-colors"
      >
        <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">{label}</span>
        {isSorted ? (
          <span className="text-[#002855] text-[10px]">
            {sortConfig.direction === 'asc' ? '▲' : '▼'}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px] opacity-50">▲▼</span>
        )}
      </button>
    );
  };

  const handleGenerateExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Visitas SUTRAN');

      worksheet.columns = [
        { header: 'Fecha', key: 'visit_date', width: 15 },
        { header: 'Inspector', key: 'inspector_name', width: 25 },
        { header: 'Sede', key: 'location_name', width: 20 },
        { header: 'Tipo', key: 'visit_type', width: 15 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Hallazgos', key: 'findings', width: 30 }
      ];

      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      paginatedVisits.forEach(visit => {
        worksheet.addRow({
          visit_date: new Date(String(visit.visit_date).includes('T') ? String(visit.visit_date) : `${visit.visit_date}T12:00:00`).toLocaleDateString(),
          inspector_name: visit.inspector_name || '',
          location_name: (visit as any).locations?.name || '',
          visit_type: getVisitTypeLabel(visit.visit_type),
          status: statusLabels[visit.status],
          findings: visit.findings || 'Sin hallazgos'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `visitas_sutran_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      notifyError('Error al exportar a Excel', 'Error de exportación');
    }
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const tableData = paginatedVisits.map(v => [
      new Date(String(v.visit_date).includes('T') ? String(v.visit_date) : `${v.visit_date}T12:00:00`).toLocaleDateString(),
      v.inspector_name,
      (v as any).locations?.name || '—',
      getVisitTypeLabel(v.visit_type),
      statusLabels[v.status],
      v.findings || 'Sin hallazgos'
    ]);

    autoTable(doc, {
      head: [['Fecha', 'Inspector', 'Sede', 'Tipo', 'Estado', 'Hallazgos']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 40, 85] }
    });

    doc.save(`Reporte_SUTRAN_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">


      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <ActionToolbar
          totalItems={visitsData?.count ?? 0}
          label="Visitas"
          searchComponent={
            <>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar por inspector, sede o hallazgos..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </>
          }
        >
          <FilterBar
            filters={[
              { key: 'location', placeholder: 'TODAS LAS SEDES', icon: MapPin, iconClassName: 'text-rose-500', wrapperClassName: 'md:min-w-[220px]', options: locations.map(loc => ({ value: loc.id, label: loc.name.toUpperCase() })) },
              { key: 'status', placeholder: 'TODOS LOS ESTADOS', options: Object.entries(statusLabels).map(([val, label]) => ({ value: val, label })) },
              {
                key: 'visitType', placeholder: 'TODOS LOS TIPOS', options: [
                  { value: 'programada', label: 'PROGRAMADA' },
                  { value: 'no_programada', label: 'NO PROGRAMADA' },
                  { value: 'de_gabinete', label: 'DE GABINETE' },
                ]
              },
            ]}
            values={{ location: selectedLocations[0] || '', status: statusFilter, visitType: visitTypeFilter }}
            onChange={(key, value) => {
              if (key === 'location') setSelectedLocations(value ? [value as string] : []);
              else if (key === 'status') setStatusFilter(value as string);
              else if (key === 'visitType') setVisitTypeFilter(value as string);
              setCurrentPage(1);
            }}
          />

          <ViewToggle viewMode={viewMode} onChange={setViewMode} />

          {canEdit() && (
            <button
              onClick={() => { setEditingVisit(undefined); setShowForm(true); }}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
            >
              <Plus size={14} />
              Nuevo Registro
            </button>
          )}

          <ExportButtons onExportExcel={handleGenerateExcel} onExportPDF={handleGeneratePDF} />

          {canEdit() && selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={14} />
              Eliminar ({selectedIds.length})
            </button>
          )}
        </ActionToolbar>

        {showForm ? (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-8">
              <div className="mb-8 border-b border-gray-100 pb-6">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                  {editingVisit ? 'Actualización de Reporte SUTRAN' : 'Nuevo Registro de Inspección'}
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium italic">Gestione los resultados y observaciones de las visitas de SUTRAN.</p>
              </div>
              <SutranVisitForm
                visit={editingVisit}
                onSave={handleSaveVisit}
                onClose={handleCloseForm}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={visitsData?.count ?? 0}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {canEdit() && (
                          <th className="px-4 py-5 text-center w-12">
                            <input
                              type="checkbox"
                              checked={paginatedVisits.length > 0 && selectedIds.length === paginatedVisits.length}
                              onChange={toggleSelectAll}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="px-4 py-5 text-left">{renderSortableHeader('Fecha', 'visit_date')}</th>
                        <th className="px-4 py-5 text-left">{renderSortableHeader('Sede', 'location_name')}</th>
                        <th className="px-4 py-5 text-left">{renderSortableHeader('Tipo', 'visit_type')}</th>
                        <th className="px-4 py-5 text-left">{renderSortableHeader('Principales Hallazgos', 'findings')}</th>
                        <th className="px-4 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedVisits.map(visit => (
                        <tr key={visit.id} className={`hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0 ${selectedIds.includes(visit.id) ? 'bg-blue-50/50' : ''}`} onDoubleClick={() => handleViewVisit(visit)}>
                          {canEdit() && (
                            <td className="px-4 py-4 text-center w-12">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(visit.id)}
                                onChange={() => toggleSelect(visit.id)}
                                onClick={e => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-4 py-4 font-bold text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                <Calendar size={14} />
                              </div>
                              <span className="text-[13px] font-black text-[#002855] uppercase leading-tight">
                                {new Date(String(visit.visit_date).includes('T') ? String(visit.visit_date) : `${visit.visit_date}T12:00:00`).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <span className="text-[11px] font-bold text-[#002855] uppercase">{(visit as any).locations?.name}</span>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <span className="text-[11px] font-bold text-slate-700 uppercase">
                              {getVisitTypeLabel(visit.visit_type)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-left">
                            {visit.findings ? (
                              <p className="text-[11px] font-bold text-slate-600 line-clamp-2 max-w-[300px]">{visit.findings}</p>
                            ) : (
                              <span className="text-slate-300 italic text-xs">Sin hallazgos registrados</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {visit.evidence_url && (
                                <a href={visit.evidence_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm" title="Ver Evidencias">
                                  <FileText size={14} />
                                </a>
                              )}
                              {canEdit() && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleEditVisit(visit); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm" title="Editar"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteVisit(visit.id); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm" title="Eliminar"><AlertTriangle size={14} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={visitsData?.count ?? 0}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {paginatedVisits.map(visit => (
                    <div key={visit.id} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 flex flex-col group overflow-hidden relative ${selectedIds.includes(visit.id) ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-gray-100 hover:shadow-xl hover:border-slate-300'}`}>
                      {canEdit() && (
                        <div className="absolute top-4 right-4 z-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(visit.id)}
                            onChange={() => toggleSelect(visit.id)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                          />
                        </div>
                      )}
                      <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight mb-2">Visita SUTRAN - {(visit as any).locations?.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${typeColors[visit.visit_type]}`}>
                                {getVisitTypeLabel(visit.visit_type)}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${statusColors[visit.status]}`}>
                                {statusLabels[visit.status]}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4 mb-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha</label>
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                <Calendar size={14} className="text-blue-500" />
                                {new Date(String(visit.visit_date).includes('T') ? String(visit.visit_date) : `${visit.visit_date}T12:00:00`).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Inspector</label>
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                <User size={14} className="text-emerald-500" />
                                <span className="truncate">{visit.inspector_name}</span>
                              </div>
                            </div>
                          </div>
                          {visit.evidence_url && (
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Evidencias</label>
                              <a href={visit.evidence_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-2">
                                <FileText size={14} />
                                Ver Archivos Adjuntos
                              </a>
                            </div>
                          )}
                          {visit.findings && (
                            <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/30">
                              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">Hallazgos principales</label>
                              <p className="text-sm text-amber-900 font-medium leading-relaxed line-clamp-3">{visit.findings}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                        {canEdit() && (
                          <div className="flex gap-2">
                            <button onClick={() => handleEditVisit(visit)} className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-sm"><Edit size={16} /></button>
                            <button onClick={() => handleDeleteVisit(visit.id)} className="p-2 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"><AlertTriangle size={16} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && paginatedVisits.length === 0 && (
              <div className="text-left py-12">
                <p className="text-gray-500 font-medium">No se encontraron visitas registradas.</p>
              </div>
            )}

            {viewingVisit && (
              <DetailModal maxWidth="2xl" onClose={() => setViewingVisit(undefined)} closeOnBackdrop>
                <DetailModalHeader>
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs sm:text-base font-black text-white uppercase tracking-tight leading-snug line-clamp-1">Detalle de Inspección</h2>
                      <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase tracking-wide mt-1">SUTRAN — {(viewingVisit as any).locations?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingVisit(undefined)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all -mr-1" aria-label="Cerrar">
                    <X size={22} />
                  </button>
                </DetailModalHeader>

                <DetailModalBody>
                  <DetailModalGrid>
                    <DetailModalSection title="Información General">
                      <DetailModalCard className="space-y-2.5 sm:space-y-3">
                        <DetailModalRow label="Fecha">
                          <span className="text-[10px] sm:text-[11px] font-black text-[#002855]">{new Date(String(viewingVisit.visit_date).includes('T') ? String(viewingVisit.visit_date) : `${viewingVisit.visit_date}T12:00:00`).toLocaleDateString()}</span>
                        </DetailModalRow>
                        <DetailModalRow label="Inspector">
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-700">{viewingVisit.inspector_name}</span>
                        </DetailModalRow>
                        <DetailModalRow label="Estado">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${statusColors[viewingVisit.status]}`}>{statusLabels[viewingVisit.status]}</span>
                        </DetailModalRow>
                      </DetailModalCard>
                    </DetailModalSection>

                    <DetailModalSection title="Tipo de Visita">
                      <DetailModalCard className="space-y-2.5 sm:space-y-3">
                        <DetailModalRow label="Tipo">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${typeColors[viewingVisit.visit_type]}`}>{getVisitTypeLabel(viewingVisit.visit_type)}</span>
                        </DetailModalRow>
                        {viewingVisit.inspector_email && (
                          <DetailModalRow label="Contacto">
                            <span className="text-[10px] sm:text-[11px] font-black text-blue-600">{viewingVisit.inspector_email}</span>
                          </DetailModalRow>
                        )}
                        {viewingVisit.evidence_url && (
                          <DetailModalRow label="Evidencias">
                            <a href={viewingVisit.evidence_url} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-[11px] font-black text-blue-600 hover:text-blue-800 underline truncate block max-w-full">
                              Ver Evidencias (Drive)
                            </a>
                          </DetailModalRow>
                        )}
                      </DetailModalCard>
                    </DetailModalSection>
                  </DetailModalGrid>

                  {viewingVisit.findings && (
                    <div className="mt-4 sm:mt-6">
                      <DetailModalSection title="Hallazgos Identificados">
                        <DetailModalCard className="bg-amber-50 border-amber-100">
                          <p className="text-[10px] sm:text-[11px] font-medium text-amber-950 leading-relaxed whitespace-pre-wrap">{viewingVisit.findings}</p>
                        </DetailModalCard>
                      </DetailModalSection>
                    </div>
                  )}

                  {viewingVisit.observations && (
                    <div className="mt-4 sm:mt-6">
                      <DetailModalSection title="Observaciones Técnicas">
                        <DetailModalCard>
                          <p className="text-[10px] sm:text-[11px] font-medium text-slate-700 italic leading-relaxed whitespace-pre-wrap">{viewingVisit.observations}</p>
                        </DetailModalCard>
                      </DetailModalSection>
                    </div>
                  )}
                </DetailModalBody>

                <StandardModalFooter
                  onClose={() => setViewingVisit(undefined)}
                  onEdit={canEdit() ? () => { setViewingVisit(undefined); handleEditVisit(viewingVisit); } : undefined}
                  editLabel="Editar Reporte"
                />
              </DetailModal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

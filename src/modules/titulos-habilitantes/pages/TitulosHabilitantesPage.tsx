import { useEffect, useState } from 'react';
import { Plus, Trash2, MapPin, Search, FileText, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../../../shared/components/ui/Pagination';
import { supabase, Location } from '../../../shared/services/supabase';
import Swal from 'sweetalert2';
import { useAuth } from '../../../app/providers/AuthContext';
import TituloHabilitanteForm from '../forms/TituloHabilitanteForm';
import TituloHabilitanteDetails from '../components/TituloHabilitanteDetails';
import ActionToolbar from '../../../shared/components/ui/ActionToolbar';
import FilterBar from '../../../shared/components/ui/FilterBar';
import ViewToggle from '../../../shared/components/ui/ViewToggle';
import ExportButtons from '../../../shared/components/ui/ExportButtons';
import LoadingSpinner from '../../../shared/components/ui/LoadingSpinner';
import PrimaryButton from '../../../shared/components/ui/PrimaryButton';
import RowActions from '../../../shared/components/ui/RowActions';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/Table';

type TituloHabilitante = {
  id: string;
  titulo: string;
  tipo: string;
  numero: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  vigencia_del?: string;
  vigencia_al?: string;
  vigencia_documento?: string;
  dias_para_vencer?: number;
  ubicacion_id: string;
  estado: 'vigente' | 'por_vencer' | 'vencido';
  notas?: string;
  created_at: string;
  updated_at: string;
  locations?: Location;
};

export default function TitulosHabilitantes() {
  const { canEdit } = useAuth();
  const [titulos, setTitulos] = useState<TituloHabilitante[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = (paginated: TituloHabilitante[]) => {
    if (selectedIds.length === paginated.length && paginated.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: `¿Eliminar ${selectedIds.length} títulos seleccionados?`,
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('titulos_habilitantes').delete().in('id', selectedIds);
        if (error) throw error;
        setSelectedIds([]);
        fetchTitulos();
        Swal.fire('Eliminado', 'Los títulos han sido eliminados.', 'success');
      } catch (error) {
        Swal.fire('Error', 'Hubo un error al eliminar los títulos.', 'error');
      }
    }
  };
  const [sortField, setSortField] = useState<'titulo' | 'tipo' | 'fecha_vencimiento' | 'ubicacion'>('titulo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState<TituloHabilitante | undefined>(undefined);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloHabilitante | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchTitulos(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

  const fetchTitulos = async () => {
    const { data, error } = await supabase.from('titulos_habilitantes').select('*, locations(*)').order('created_at', { ascending: false });
    if (!error && data) {
      // Filtrar para mostrar solo los títulos de sedes tipo CITV, ESCON y ECSAL
      const citvTitulos = (data as TituloHabilitante[]).filter(t => t.locations && ['revision', 'escuela_conductores', 'policlinico'].includes(t.locations.type));
      setTitulos(citvTitulos);
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) {
      // Filtrar para mostrar solo las sedes tipo CITV, ESCON y ECSAL
      const citvLocations = data.filter(loc => ['revision', 'escuela_conductores', 'policlinico'].includes(loc.type));
      setLocations(citvLocations);
    }
  };

  const getDaysUntil = (dateString: string) => {
    if (!dateString) return 0;
    const target = new Date(dateString);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortedTitulos = [...titulos].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortField) {
      case 'titulo':
        aValue = a.titulo || '';
        bValue = b.titulo || '';
        break;
      case 'tipo':
        aValue = a.tipo || '';
        bValue = b.tipo || '';
        break;
      case 'fecha_vencimiento': {
        const dateA = a.vigencia_al || a.fecha_vencimiento;
        const dateB = b.vigencia_al || b.fecha_vencimiento;
        aValue = dateA ? new Date(dateA).getTime() : 0;
        bValue = dateB ? new Date(dateB).getTime() : 0;
        break;
      }
      case 'ubicacion':
        aValue = a.locations?.name || '';
        bValue = b.locations?.name || '';
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filtered = sortedTitulos.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = t.titulo?.toLowerCase().includes(q) ||
      t.tipo?.toLowerCase().includes(q) ||
      t.numero?.toLowerCase().includes(q) ||
      t.locations?.name?.toLowerCase().includes(q);

    const matchesLocation = selectedLocations.length === 0 ||
      selectedLocations.length === locations.length ||
      selectedLocations.includes(t.ubicacion_id || '');

    return matchesSearch && matchesLocation;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: 'titulo' | 'tipo' | 'fecha_vencimiento' | 'ubicacion') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar título habilitante?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-xl font-bold text-slate-800',
        confirmButton: 'rounded-xl font-bold tracking-wide',
        cancelButton: 'rounded-xl font-bold tracking-wide'
      }
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('titulos_habilitantes').delete().eq('id', id);
        if (error) throw error;

        Swal.fire({
          title: 'Eliminado',
          text: 'El título habilitante ha sido eliminado.',
          icon: 'success',
          customClass: { popup: 'rounded-2xl' }
        });

        fetchTitulos();
      } catch (error) {
        console.error('Error al eliminar título habilitante:', error);
        Swal.fire({
          title: 'Error',
          text: 'Hubo un error al intentar eliminar el título habilitante.',
          icon: 'error',
          customClass: { popup: 'rounded-2xl' }
        });
      }
    }
  };

  const renderStatus = (titulo: TituloHabilitante) => {
    const targetDate = titulo.vigencia_al || titulo.fecha_vencimiento;
    if (!targetDate) return <span className="text-[10px] text-slate-400 italic">Sin vencimiento</span>;

    const daysLeft = getDaysUntil(targetDate);
    const dateStr = new Date(String(targetDate).includes('T') ? String(targetDate) : `${targetDate}T12:00:00`).toLocaleDateString('es-PE', { timeZone: 'UTC' });

    if (daysLeft <= 0) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
            <AlertTriangle size={11} className="text-rose-500 shrink-0" />
            Vencido ({Math.abs(daysLeft)}d)
          </span>
          <span className="text-[10px] font-black text-rose-600/80 ml-1">{dateStr}</span>
        </div>
      );
    }

    if (daysLeft <= 30) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
            Vence {daysLeft}d
          </span>
          <span className="text-[10px] font-black text-amber-600/80 ml-1">{dateStr}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
          Vigente ({daysLeft}d)
        </span>
        <span className="text-[10px] font-bold text-slate-500 ml-1">{dateStr}</span>
      </div>
    );
  };

  const downloadReport = () => {
    const headers = ['Título', 'Tipo', 'Número', 'Vigencia Del', 'Vigencia Al', 'Vigencia Documento', 'Días para Vencer', 'Ubicación', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(t => {
        const startDate = t.vigencia_del || t.fecha_emision;
        const targetDate = t.vigencia_al || t.fecha_vencimiento;
        const daysLeft = targetDate ? getDaysUntil(targetDate) : '';
        return [
          `"${t.titulo || ''}"`,
          `"${t.tipo || ''}"`,
          `"${t.numero || ''}"`,
          `"${startDate ? new Date(String(startDate).includes('T') ? String(startDate) : `${startDate}T12:00:00`).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : ''}"`,
          `"${targetDate ? new Date(String(targetDate).includes('T') ? String(targetDate) : `${targetDate}T12:00:00`).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : ''}"`,
          `"${t.vigencia_documento || ''}"`,
          `"${daysLeft}"`,
          `"${t.locations?.name || ''}"`,
          `"${t.estado || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `titulos_habilitantes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadReportPdf = () => {
    const doc = new jsPDF();
    const tableData = filtered.map(t => {
      const startDate = t.vigencia_del || t.fecha_emision;
      const targetDate = t.vigencia_al || t.fecha_vencimiento;
      const daysLeft = targetDate ? getDaysUntil(targetDate) : '';
      return [
        t.titulo || '',
        t.tipo || '',
        t.numero || '',
        startDate ? new Date(String(startDate).includes('T') ? String(startDate) : `${startDate}T12:00:00`).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
        targetDate ? new Date(String(targetDate).includes('T') ? String(targetDate) : `${targetDate}T12:00:00`).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
        t.vigencia_documento || '',
        daysLeft !== '' ? `${daysLeft} días` : '',
        t.locations?.name || '',
        t.estado || ''
      ];
    });

    autoTable(doc, {
      head: [['Título', 'Tipo', 'Número', 'Vigencia Del', 'Vigencia Al', 'Vigencia Doc.', 'Días Vencer', 'Ubicación', 'Estado']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 40, 85] }
    });

    doc.save(`titulos_habilitantes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">

        <ActionToolbar
          totalItems={filtered.length}
          label="Títulos"
          searchComponent={
            <>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar por título, tipo o número..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[12px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </>
          }
        >
          <FilterBar
            filters={[
              { key: 'location', placeholder: 'TODAS LAS UBICACIONES', icon: MapPin, iconClassName: 'text-rose-500', wrapperClassName: 'md:min-w-[220px]', options: locations.map(loc => ({ value: loc.id, label: loc.name })) },
            ]}
            values={{ location: selectedLocations[0] || '' }}
            onChange={(_key, value) => {
              setSelectedLocations(value ? [value as string] : []);
              setCurrentPage(1);
            }}
          />

          <ViewToggle viewMode={viewMode} onChange={setViewMode} />

          {canEdit() && (
            <PrimaryButton icon={Plus} onClick={() => { setEditingTitulo(undefined); setIsFormOpen(true); }}>
              Nuevo Título
            </PrimaryButton>
          )}

          <ExportButtons onExportExcel={downloadReport} onExportPDF={downloadReportPdf} />

          {canEdit() && selectedIds.length > 0 && viewMode === 'table' && (
            <button
              onClick={handleBulkDelete}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all text-[10px] font-black uppercase tracking-wider"
            >
              <Trash2 size={14} />
              Eliminar ({selectedIds.length})
            </button>
          )}
        </ActionToolbar>

        {loading ? (
          <LoadingSpinner />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedData.map(titulo => (
              <div key={titulo.id} className={`bg-white rounded-2xl shadow-sm border transition-all p-6 flex flex-col group overflow-hidden hover:-translate-y-0.5 duration-200 relative ${selectedIds.includes(titulo.id) ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200/80 hover:shadow-xl'}`}>
                {canEdit() && (
                  <div className="absolute top-4 right-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(titulo.id)}
                      onChange={() => toggleSelect(titulo.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 cursor-pointer shadow-sm"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 group-hover:bg-[#002855] group-hover:text-white transition-all shadow-sm">
                    <FileText size={20} />
                  </div>
                  {renderStatus(titulo)}
                </div>

                <div className="mb-4">
                  <h4 className="text-[14px] font-black text-slate-800 uppercase leading-none">{titulo.titulo}</h4>
                  <p className="text-[11px] font-semibold text-slate-400 tracking-wider mt-1">{titulo.tipo}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 uppercase">
                    <MapPin size={14} className="text-rose-500 shrink-0" />
                    <span className="truncate">{titulo.locations?.name || 'Ubicación N/A'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Número</label>
                      <span className="text-[11px] font-black text-slate-600 uppercase truncate">{titulo.numero || '—'}</span>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vigencia Doc.</label>
                      <span className="text-[11px] font-black text-slate-600 uppercase truncate">{titulo.vigencia_documento || '—'}</span>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vigencia Del</label>
                      <span className="text-[11px] font-black text-slate-600 uppercase truncate">
                        {(titulo.vigencia_del || titulo.fecha_emision) ? new Date((titulo.vigencia_del || titulo.fecha_emision) as string).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—'}
                      </span>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vigencia Al</label>
                      <span className="text-[11px] font-black text-slate-600 uppercase truncate">
                        {(titulo.vigencia_al || titulo.fecha_vencimiento) ? new Date((titulo.vigencia_al || titulo.fecha_vencimiento) as string).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150 mt-auto">
                  <RowActions
                    canEdit={canEdit()}
                    onEdit={(e) => { e.stopPropagation(); setEditingTitulo(titulo); setIsFormOpen(true); }}
                    onDelete={(e) => { e.stopPropagation(); handleDelete(titulo.id); }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
            <div className="bg-slate-50 border-b border-slate-200 shrink-0">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <tr>
                    {canEdit() && (
                      <TableHead className="text-center w-12">
                        <input
                          type="checkbox"
                          checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                          onChange={() => toggleSelectAll(paginatedData)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 transition-all cursor-pointer"
                        />
                      </TableHead>
                    )}

                    <TableHead>
                      <button
                        onClick={() => handleSort('titulo')}
                        className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Título</span>
                        {sortField === 'titulo' && (
                          sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('tipo')}
                        className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Tipo</span>
                        {sortField === 'tipo' && (
                          sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Vigencia Del</span>
                    </TableHead>
                    <TableHead>
                      <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Vigencia Al</span>
                    </TableHead>
                    <TableHead>
                      <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Vigencia Doc.</span>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('fecha_vencimiento')}
                        className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Días para Vencer</span>
                        {sortField === 'fecha_vencimiento' && (
                          sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('ubicacion')}
                        className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Ubicación</span>
                        {sortField === 'ubicacion' && (
                          sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <span className="text-[12px] font-black text-[#002855] tracking-[0.2em]">Acciones</span>
                    </TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((titulo) => (
                    <TableRow
                      key={titulo.id}
                      className={`cursor-pointer ${selectedIds.includes(titulo.id) ? 'bg-blue-50/40' : ''}`}
                      onClick={() => { setSelectedTitulo(titulo); setShowDetails(true); }}
                    >
                      {canEdit() && (
                        <TableCell className="text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(titulo.id)}
                            onChange={() => toggleSelect(titulo.id)}
                            onClick={e => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 transition-all cursor-pointer"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-[13px] font-black text-[#002855] leading-tight">{titulo.titulo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-bold text-slate-700 uppercase">{titulo.tipo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-bold text-slate-700">
                          {(titulo.vigencia_del || titulo.fecha_emision) ? new Date((titulo.vigencia_del || titulo.fecha_emision) as string).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-bold text-slate-700">
                          {(titulo.vigencia_al || titulo.fecha_vencimiento) ? new Date((titulo.vigencia_al || titulo.fecha_vencimiento) as string).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-bold text-slate-700 uppercase">{titulo.vigencia_documento || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {renderStatus(titulo)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin size={14} className="text-rose-500 shrink-0" />
                          <span className="text-[12px] font-bold uppercase truncate max-w-xs block">{titulo.locations?.name || 'Ubicación N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover/row:opacity-100 transition-opacity duration-150">
                          <RowActions
                            canEdit={canEdit()}
                            onEdit={(e) => { e.stopPropagation(); setEditingTitulo(titulo); setIsFormOpen(true); }}
                            onDelete={(e) => { e.stopPropagation(); handleDelete(titulo.id); }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <TituloHabilitanteForm
          tituloHabilitante={editingTitulo}
          locations={locations}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            fetchTitulos();
          }}
        />
      )}

      {showDetails && selectedTitulo && (
        <TituloHabilitanteDetails
          titulo={selectedTitulo}
          onClose={() => setShowDetails(false)}
          onEdit={
            canEdit()
              ? () => {
                setShowDetails(false);
                setEditingTitulo(selectedTitulo);
                setIsFormOpen(true);
              }
              : undefined
          }
        />
      )}
    </div>
  );
}
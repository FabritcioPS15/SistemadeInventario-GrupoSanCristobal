import { useState, useEffect, useRef } from 'react';
import { Plus, Building2, Calendar, FileText, User, AlertTriangle, Edit, X, LayoutGrid, List, Search, MapPin, ChevronDown } from 'lucide-react';
import { FaFilePdf } from "react-icons/fa6";
import { RiFileExcel2Fill } from "react-icons/ri";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import type { SutranVisit } from '../lib/supabase';
import SutranVisitForm from '../components/forms/SutranVisitForm';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

export default function Sutran() {
  const { canEdit } = useAuth();
  const [visits, setVisits] = useState<SutranVisit[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SutranVisit | undefined>();
  const [viewingVisit, setViewingVisit] = useState<SutranVisit | undefined>();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchVisits();
    fetchLocations();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sutran_visits')
        .select('*, locations(*)')
        .order('visit_date', { ascending: false });

      if (error) {
        console.error('Error al cargar visitas:', error);
        alert(`Error al cargar visitas: ${error.message}`);
        return;
      }

      if (data) {
        setVisits(data);
      } else {
        setVisits([]);
      }
    } catch (err) {
      console.error('Error inesperado al cargar visitas:', err);
      alert('Error inesperado al cargar visitas: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error al cargar sedes:', error);
        return;
      }

      if (data) {
        setLocations(data);
      }
    } catch (err) {
      console.error('Error inesperado al cargar sedes:', err);
    }
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch =
      visit.inspector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visit.observations && visit.observations.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (visit.findings && visit.findings.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || visit.status === statusFilter;
    const matchesType = !visitTypeFilter || visit.visit_type === visitTypeFilter;
    const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(visit.location_id || '');

    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, startIndex + itemsPerPage);

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

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'programada': return 'Programada';
      case 'no_programada': return 'No programada';
      case 'de_gabinete': return 'De gabinete';
      default: return 'Desconocido';
    }
  };

  const typeColors: Record<string, string> = {
    programada: 'bg-blue-50 text-blue-700 border-blue-200',
    no_programada: 'bg-rose-50 text-rose-700 border-rose-200',
    de_gabinete: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const handleEditVisit = (visit: SutranVisit) => {
    setEditingVisit(visit);
    setShowForm(true);
  };

  const handleViewVisit = (visit: SutranVisit) => {
    setViewingVisit(visit);
  };

  const handleDeleteVisit = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta visita? Esta acción no se puede deshacer.')) {
      try {
        const { error } = await supabase
          .from('sutran_visits')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('❌ Error al eliminar visita:', error);
          alert(`Error al eliminar la visita: ${error.message}`);
        } else {
          await fetchVisits();
          alert('Visita eliminada correctamente');
        }
      } catch (err) {
        console.error('❌ Error inesperado al eliminar visita:', err);
        alert('Error inesperado al eliminar la visita');
      }
    }
  };

  const handleSaveVisit = async () => {
    setShowForm(false);
    setEditingVisit(undefined);
    await fetchVisits();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVisit(undefined);
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
      
      filteredVisits.forEach(visit => {
        worksheet.addRow({
          visit_date: new Date(visit.visit_date).toLocaleDateString(),
          inspector_name: visit.inspector_name || '',
          location_name: visit.location_name || '',
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
      alert('Error al exportar a Excel');
    }
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const tableData = filteredVisits.map(v => [
      new Date(v.visit_date).toLocaleDateString(),
      v.inspector_name,
      v.location_name,
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
        {/* Action Bar — Standardized */}
        <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
          <div className="absolute -top-3 -left-3">
            <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
              {filteredVisits.length} Visitas
            </div>
          </div>

          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="BUSCAR POR INSPECTOR, SEDE O HALLAZGOS..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 uppercase tracking-[0.1em]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[220px]"
              >
                <MapPin size={14} className="text-rose-500" />
                <span className="truncate">{selectedLocations.length === 0 || selectedLocations.length === locations.length ? 'Todas las sedes' : `${selectedLocations.length} Sedes`}</span>
                <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-slate-200 bg-[#001529]">
                    <button
                      onClick={() => {
                        setSelectedLocations(locations.map(loc => loc.id));
                        setShowLocationDropdown(false);
                        setCurrentPage(1);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Seleccionar todas las sedes
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLocations([]);
                        setShowLocationDropdown(false);
                        setCurrentPage(1);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Limpiar selección
                    </button>
                  </div>
                  {locations.map(location => (
                    <label key={location.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations([...selectedLocations, location.id]);
                          } else {
                            setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                          }
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <span className="text-xs font-medium text-slate-700">{location.name.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
            >
              <option value="">TODOS LOS ESTADOS</option>
              {Object.entries(statusLabels).map(([val, label]) => (
                <option key={val} value={val}>{label.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={visitTypeFilter}
              onChange={e => { setVisitTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
            >
              <option value="">TODOS LOS TIPOS</option>
              <option value="programada">PROGRAMADA</option>
              <option value="no_programada">NO PROGRAMADA</option>
              <option value="de_gabinete">DE GABINETE</option>
            </select>

            <div className="flex bg-slate-100 p-1 border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`} 
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className={`p-1.5 transition-all ${viewMode === 'table' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`} 
                title="Vista Tabla"
              >
                <List size={16} />
              </button>
            </div>

            {canEdit() && (
              <button
                onClick={() => { setEditingVisit(undefined); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
              >
                <Plus size={14} />
                Nuevo Registro
              </button>
            )}

            <button
              onClick={handleGenerateExcel}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
              title="Exportar a Excel"
            >
              <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              onClick={handleGeneratePDF}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
              title="Exportar a PDF"
            >
              <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>
        </div>

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
                    totalItems={filteredVisits.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Fecha / Inspector</span></th>
                        <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span></th>
                        <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tipo / Estado</span></th>
                        <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Principales Hallazgos</span></th>
                        <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedVisits.map(visit => (
                        <tr key={visit.id} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0" onDoubleClick={() => handleViewVisit(visit)}>
                          <td className="px-6 py-5 font-bold text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                <Calendar size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">
                                  {new Date(visit.visit_date).toLocaleDateString()}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{visit.inspector_name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-left">
                            <span className="text-sm font-extrabold text-[#002855] uppercase">{visit.location_name}</span>
                          </td>
                          <td className="px-4 py-5 text-left">
                            <div className="flex flex-col gap-1.5">
                              <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border w-fit ${typeColors[visit.visit_type]}`}>
                                {getVisitTypeLabel(visit.visit_type)}
                              </span>
                              <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border w-fit ${statusColors[visit.status]}`}>
                                {statusLabels[visit.status]}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-left">
                            {visit.findings ? (
                              <p className="text-sm font-medium text-slate-600 line-clamp-2 max-w-[300px]">{visit.findings}</p>
                            ) : (
                              <span className="text-slate-300 italic text-xs">Sin hallazgos registrados</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleViewVisit(visit); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><FileText size={14} /></button>
                              {canEdit() && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleEditVisit(visit); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteVisit(visit.id); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><AlertTriangle size={14} /></button>
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
                    totalItems={filteredVisits.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {paginatedVisits.map(visit => (
                    <div key={visit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col group overflow-hidden">
                      <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight mb-2">Visita SUTRAN - {visit.location_name}</h3>
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
                                {new Date(visit.visit_date).toLocaleDateString()}
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
                          {visit.findings && (
                            <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/30">
                              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">Hallazgos principales</label>
                              <p className="text-sm text-amber-900 font-medium leading-relaxed line-clamp-3">{visit.findings}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                        <button onClick={() => handleViewVisit(visit)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                          <FileText size={14} /> DETALLES
                        </button>
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

            {!loading && filteredVisits.length === 0 && (
              <div className="text-left py-12">
                <p className="text-gray-500 font-medium">No se encontraron visitas registradas.</p>
              </div>
            )}

            {viewingVisit && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
                  <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                        <Building2 className="text-[#002855]" size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Detalle de Inspección</h2>
                        <p className="text-xs font-bold text-[#002855] uppercase tracking-widest leading-none mt-1">SUTRAN - {viewingVisit.location_name}</p>
                      </div>
                    </div>
                    <button onClick={() => setViewingVisit(undefined)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-8 overflow-y-auto space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Información General</label>
                        <div className="space-y-3">
                          <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-xs text-gray-500 font-bold uppercase">Fecha</span>
                            <span className="text-xs font-black text-gray-900">{new Date(viewingVisit.visit_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-xs text-gray-500 font-bold uppercase">Inspector</span>
                            <span className="text-xs font-black text-gray-900">{viewingVisit.inspector_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500 font-bold uppercase">Estado</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${statusColors[viewingVisit.status]}`}>{statusLabels[viewingVisit.status]}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Tipo de Visita</label>
                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest border mb-4 ${typeColors[viewingVisit.visit_type]}`}>{getVisitTypeLabel(viewingVisit.visit_type)}</span>
                        {viewingVisit.inspector_email && (
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Contacto</label>
                            <p className="text-xs font-bold text-blue-600">{viewingVisit.inspector_email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {viewingVisit.findings && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <AlertTriangle size={14} className="text-amber-500" /> Hallazgos Identificados
                        </h3>
                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                          <p className="text-sm text-amber-950 font-medium leading-relaxed whitespace-pre-wrap">{viewingVisit.findings}</p>
                        </div>
                      </div>
                    )}

                    {viewingVisit.observations && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <FileText size={14} className="text-slate-500" /> Observaciones Técnicas
                        </h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                          <p className="text-sm text-slate-700 font-medium italic leading-relaxed whitespace-pre-wrap">{viewingVisit.observations}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onClick={() => setViewingVisit(undefined)} className="flex-1 px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm">Cerrar</button>
                    {canEdit() && (
                      <button onClick={() => { setViewingVisit(undefined); handleEditVisit(viewingVisit); }} className="flex-1 px-4 py-3 text-xs font-black text-white uppercase tracking-widest bg-[#002855] rounded-xl hover:bg-blue-800 transition-all active:scale-95 shadow-lg">Editar Reporte</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

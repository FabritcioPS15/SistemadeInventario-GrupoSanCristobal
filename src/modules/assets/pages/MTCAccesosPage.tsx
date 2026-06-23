import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ExternalLink, Eye, EyeOff, X, Copy, Check, Globe, Database, Terminal, Server, Shield, List, LayoutGrid } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { supabase } from '../../../shared/services/supabase';
import MTCAccesoForm from '../forms/MTCAccesoForm';
import { useAuth } from '../../../app/providers/AuthContext';
import { useNotify } from '../../../shared/hooks/useNotify';
import Pagination from '../../../shared/components/ui/Pagination';
import DetailModal, {
  DetailModalHeader,
  DetailModalBody,
  StandardModalFooter,
  DetailModalGrid,
  DetailModalSection,
  DetailModalCard,
  DetailModalRow,
} from '../../../shared/components/ui/DetailModal';

type MTCAcceso = {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  access_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type ViewType = 'list' | 'form';

export default function MTCAccesos() {
  const { canEdit } = useAuth();
  const { confirm, error: notifyError, success: notifySuccess } = useNotify();
  const [view, setView] = useState<ViewType>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [accesos, setAccesos] = useState<MTCAcceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAcceso, setEditingAcceso] = useState<MTCAcceso | undefined>();
  const [viewingAcceso, setViewingAcceso] = useState<MTCAcceso | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [accessTypeFilter, setAccessTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchAccesos();
  }, []);

  const fetchAccesos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mtc_accesos')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setAccesos(data);
    }
    setLoading(false);
  };

  const handleEditAcceso = (acceso: MTCAcceso) => {
    setEditingAcceso(acceso);
    setView('form');
  };

  const handleViewAcceso = (acceso: MTCAcceso) => {
    setViewingAcceso(acceso);
  };

  const handleDeleteAcceso = async (acceso: MTCAcceso) => {
    const confirmed = await confirm(`¿Estás seguro de que quieres eliminar el acceso "${acceso.name}"?`, 'Eliminar Acceso');
    if (confirmed) {
      try {
        const { error } = await supabase
          .from('mtc_accesos')
          .delete()
          .eq('id', acceso.id);

        if (error) {
          console.error('❌ Error al eliminar acceso MTC:', error);
          notifyError(`Error al eliminar el acceso MTC: ${error.message}`);
        } else {
          await fetchAccesos();
          notifySuccess('Acceso MTC eliminado correctamente');
        }
      } catch (err) {
        console.error('❌ Error inesperado al eliminar acceso MTC:', err);
        notifyError('Error inesperado al eliminar el acceso MTC');
      }
    }
  };

  const handleSaveAcceso = async () => {
    setView('list');
    setEditingAcceso(undefined);
    await fetchAccesos();
  };

  const handleCloseForm = () => {
    setView('list');
    setEditingAcceso(undefined);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'web': return <Globe className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'ssh': return <Terminal className="h-4 w-4" />;
      case 'ftp': return <Server className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'web': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'api': return 'bg-green-50 text-green-700 border-green-200';
      case 'database': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ssh': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ftp': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Accesos MTC');
      
      worksheet.columns = [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'URL', key: 'url', width: 40 },
        { header: 'Usuario', key: 'username', width: 20 },
        { header: 'Tipo', key: 'access_type', width: 15 },
        { header: 'Notas', key: 'notes', width: 30 }
      ];
      
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      filteredAccesos.forEach(acceso => {
        worksheet.addRow({
          name: acceso.name || '',
          url: acceso.url || '',
          username: acceso.username || '',
          access_type: acceso.access_type || '',
          notes: acceso.notes || ''
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `accesos_mtc_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al exportar a Excel');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const tableData = filteredAccesos.map(acceso => [
        acceso.name || '',
        acceso.url || '',
        acceso.username || '',
        acceso.access_type || '',
        acceso.notes || 'Sin notas'
      ]);
      
      autoTable(doc, {
        head: [['Nombre', 'URL', 'Usuario', 'Tipo', 'Notas']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 40, 85] }
      });
      
      doc.save(`accesos_mtc_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al exportar a PDF');
    }
  };

  const filteredAccesos = accesos.filter(acceso => {
    const matchesSearch = acceso.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acceso.access_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acceso.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !accessTypeFilter || acceso.access_type === accessTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredAccesos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAccesos = filteredAccesos.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
          <div className="absolute -top-3 -left-3">
            <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
              {filteredAccesos.length} Accesos
            </div>
          </div>

          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Buscar acceso, URL o tipo..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={accessTypeFilter}
              onChange={e => { setAccessTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
            >
              <option value="">TODOS LOS TIPOS</option>
              <option value="web">WEB SERVICES</option>
              <option value="api">APIS & ENDPOINTS</option>
              <option value="database">BASES DE DATOS</option>
              <option value="ssh">TERMINAL SSH</option>
              <option value="ftp">SERVIDORES FTP</option>
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
                onClick={() => setView(view === 'form' ? 'list' : 'form')}
                className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${view === 'form' ? 'bg-slate-800 text-white' : 'bg-[#002855] text-white hover:bg-blue-800'}`}
              >
                {view === 'form' ? <List size={14} /> : <Plus size={14} />}
                {view === 'form' ? 'Ver Lista' : 'Nuevo Acceso'}
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
              title="Exportar a Excel"
            >
              <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              onClick={handleExportPDF}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
              title="Exportar a PDF"
            >
              <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>
        </div>

        {view === 'form' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-8">
              <div className="mb-8 border-b border-gray-100 pb-6">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                  {editingAcceso ? 'Actualización de Credenciales' : 'Registro de Nuevo Acceso'}
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium italic">Gestione de forma segura los accesos a plataformas del MTC.</p>
              </div>
              <MTCAccesoForm
                editAcceso={editingAcceso}
                onClose={handleCloseForm}
                onSave={handleSaveAcceso}
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
                <div className="bg-slate-50/50 border-b border-slate-100 relative z-20">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredAccesos.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Nombre</span></th>
                        <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tipo</span></th>
                        <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">URL / Endpoint</span></th>
                        <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Usuario</span></th>
                        <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAccesos.map(acceso => (
                        <tr key={acceso.id} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0" onDoubleClick={() => handleViewAcceso(acceso)}>
                          <td className="px-6 py-4 font-bold text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                {getAccessTypeIcon(acceso.access_type)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-black text-[#002855] uppercase leading-tight">{acceso.name}</span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(acceso.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest border ${getAccessTypeColor(acceso.access_type)}`}>
                              {acceso.access_type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <a href={acceso.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[13px] font-extrabold text-blue-600 truncate max-w-[220px] block hover:text-blue-800 transition-colors">
                              {acceso.url}
                            </a>
                          </td>
                          <td className="px-4 py-4 text-left">
                            {acceso.username ? (
                              <div className="flex flex-col">
                                <span className="text-[13px] font-black text-[#002855] font-mono">{acceso.username}</span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                  {acceso.password ? '••••••••' : 'Sin contraseña'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic text-xs">Sin credenciales</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit() && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleEditAcceso(acceso); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteAcceso(acceso); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"><Trash2 size={14} /></button>
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
                    totalItems={filteredAccesos.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {paginatedAccesos.map(acceso => (
                    <div key={acceso.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col group overflow-hidden">
                      <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight mb-2">{acceso.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${getAccessTypeColor(acceso.access_type)}`}>
                                {getAccessTypeIcon(acceso.access_type)} {acceso.access_type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4 mb-6">
                          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enlace Directo</label>
                              <button onClick={() => copyToClipboard(acceso.url, `url-${acceso.id}`)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-blue-600 active:scale-90">
                                {copiedItems[`url-${acceso.id}`] ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            </div>
                            <a href={acceso.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 break-all group/link">
                              <span className="truncate">{acceso.url}</span>
                              <ExternalLink size={14} className="flex-shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                            </a>
                          </div>
                          {acceso.username && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/30">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-[10px] font-black text-blue-700/50 uppercase tracking-widest">Identidad</label>
                                  <button onClick={() => copyToClipboard(acceso.username!, `username-${acceso.id}`)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-400 hover:text-blue-600 active:scale-90">
                                    {copiedItems[`username-${acceso.id}`] ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                  </button>
                                </div>
                                <p className="text-sm text-blue-900 font-black tracking-tight font-mono">{acceso.username}</p>
                              </div>
                              {acceso.password && (
                                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-blue-700/50 uppercase tracking-widest">Token / Pass</label>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => copyToClipboard(acceso.password!, `password-${acceso.id}`)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-400 hover:text-blue-600 active:scale-90">
                                        {copiedItems[`password-${acceso.id}`] ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                      </button>
                                      <button onClick={() => togglePasswordVisibility(acceso.id)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-600 hover:text-blue-800 active:scale-90">
                                        {showPasswords[acceso.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-blue-900 font-black tracking-widest font-mono">{showPasswords[acceso.id] ? acceso.password : '••••••••'}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {acceso.notes && (
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Observaciones</label>
                              <p className="text-xs text-gray-600 italic leading-relaxed whitespace-pre-wrap">{acceso.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                        {canEdit() && (
                          <div className="flex gap-2">
                            <button onClick={() => handleEditAcceso(acceso)} className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-sm"><Edit size={16} /></button>
                            <button onClick={() => handleDeleteAcceso(acceso)} className="p-2 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"><Trash2 size={16} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && filteredAccesos.length === 0 && (
              <div className="text-left py-12">
                <p className="text-gray-500 font-medium">No se encontraron accesos registrados.</p>
              </div>
            )}

            {viewingAcceso && (
              <DetailModal maxWidth="2xl" onClose={() => setViewingAcceso(undefined)} closeOnBackdrop>
                <DetailModalHeader>
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      {getAccessTypeIcon(viewingAcceso.access_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs sm:text-base font-black text-white uppercase tracking-tight leading-snug line-clamp-1">{viewingAcceso.name}</h2>
                      <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase tracking-wide mt-1">MTC ACCESO — {viewingAcceso.access_type.toUpperCase()}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingAcceso(undefined)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all -mr-1" aria-label="Cerrar">
                    <X size={22} />
                  </button>
                </DetailModalHeader>

                <DetailModalBody>
                  <DetailModalGrid>
                    <DetailModalSection title="Identificación del Recurso">
                      <DetailModalCard className="space-y-2.5 sm:space-y-3">
                        <DetailModalRow label="URL / Endpoint">
                          <a href={viewingAcceso.url} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-[11px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 break-all">
                            {viewingAcceso.url} <ExternalLink size={12} />
                          </a>
                        </DetailModalRow>
                      </DetailModalCard>
                    </DetailModalSection>

                    {(viewingAcceso.username || viewingAcceso.password) && (
                      <DetailModalSection title="Seguridad y Credenciales">
                        <DetailModalCard className="space-y-2.5 sm:space-y-3">
                          {viewingAcceso.username && (
                            <DetailModalRow label="Usuario">
                              <span className="text-[10px] sm:text-[11px] font-black text-slate-700 font-mono">{viewingAcceso.username}</span>
                            </DetailModalRow>
                          )}
                          {viewingAcceso.password && (
                            <DetailModalRow label="Contraseña">
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-[10px] sm:text-[11px] font-black text-slate-700 font-mono tracking-widest">{showPasswords[viewingAcceso.id] ? viewingAcceso.password : '••••••••'}</span>
                                <button onClick={() => togglePasswordVisibility(viewingAcceso.id)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                                  {showPasswords[viewingAcceso.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </DetailModalRow>
                          )}
                        </DetailModalCard>
                      </DetailModalSection>
                    )}
                  </DetailModalGrid>

                  {viewingAcceso.notes && (
                    <div className="mt-4 sm:mt-6">
                      <DetailModalSection title="Observaciones Técnicas">
                        <DetailModalCard className="bg-amber-50 border-amber-100">
                          <p className="text-[10px] sm:text-[11px] font-medium text-amber-950 italic leading-relaxed whitespace-pre-wrap">{viewingAcceso.notes}</p>
                        </DetailModalCard>
                      </DetailModalSection>
                    </div>
                  )}
                </DetailModalBody>

                <StandardModalFooter
                  onClose={() => setViewingAcceso(undefined)}
                  onEdit={canEdit() ? () => { setViewingAcceso(undefined); handleEditAcceso(viewingAcceso); } : undefined}
                  editLabel="Editar Acceso"
                />
              </DetailModal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

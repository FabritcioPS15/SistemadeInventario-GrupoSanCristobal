import { useEffect, useState } from 'react';
import { Car, ChevronRight, Building2, Stethoscope, GraduationCap, FileText, ExternalLink, Edit, LayoutGrid, List, MapPin } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocationForm from '../components/forms/LocationForm';

export default function Checklist({ type }: { type?: string }) {
   const navigate = useNavigate();
   const { canEdit, user } = useAuth();
   const [locations, setLocations] = useState<Location[]>([]);
   const [searchTerm] = useState('');
   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
   const [showForm, setShowForm] = useState(false);
   const [editingLocation, setEditingLocation] = useState<Location | undefined>();

   const driveLinks: Record<string, string> = {
      escon: 'https://drive.google.com/drive/folders/170_fX-XqA6K8F8-R7Nn-T5R_N4L5lX_h?usp=drive_link',
      ecsal: 'https://drive.google.com/drive/folders/1F-vTj-YV-R9Y8L8X8K7Nn-T5R_N4L5lX_h?usp=drive_link',
      citv: 'https://drive.google.com/drive/folders/11Q8PLtXgaL6T42LkcAb1y3MZjyIKOpUi?usp=drive_link'
   };

   const fetchLocations = async () => {
      try {
         const { data: locationsData, error: locationsError } = await supabase
            .from('locations')
            .select('*')
            .order('name');

         if (locationsError) throw locationsError;

         let filteredResults = locationsData as Location[];

         const privilegedRoles = ['super_admin', 'sistemas', 'gerencia', 'supervisores'];
         const isPrivileged = user && privilegedRoles.includes(user.role);

         if (!isPrivileged && user?.location_id) {
            filteredResults = filteredResults.filter(loc => loc.id === user.location_id);
         }

         setLocations(filteredResults);
      } catch (err) {
         console.error('Error fetching locations:', err);
      }
   };

   useEffect(() => {
      fetchLocations();
   }, [user?.location_id, user?.role]);

   const handleEditLinks = (location: Location) => {
      setEditingLocation(location);
      setShowForm(true);
   };

   const handleSaveLinks = async () => {
      setShowForm(false);
      setEditingLocation(undefined);
      await fetchLocations();
   };

   const getFilteredLocations = () => {
      let filtered = locations;

      if (type) {
         filtered = filtered.filter(loc => {
            if (type === 'escon') return loc.type === 'escuela_conductores';
            if (type === 'ecsal') return loc.type === 'policlinico';
            if (type === 'citv') return loc.type === 'revision';
            return false;
         });
      }

      return filtered.filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()));
   };

   const canSeeSection = (sectionType: string) => {
      const privilegedRoles = ['super_admin', 'sistemas', 'gerencia', 'supervisores'];
      if (user && privilegedRoles.includes(user.role)) return true;

      if (user?.location_id) {
         const userLoc = locations.find(l => l.id === user.location_id);
         if (!userLoc) return true;

         if (sectionType === 'escon') return userLoc.type === 'escuela_conductores';
         if (sectionType === 'ecsal') return userLoc.type === 'policlinico';
         if (sectionType === 'citv') return userLoc.type === 'revision';
      }

      return true;
   };

   const renderGeneralView = () => (
      <div className="animate-in fade-in duration-500">
         {/* ESCON Section */}
         {canSeeSection('escon') && (
            <div className="mb-12">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-none" />
                  <h2 className="text-[16px] font-black text-[#002855] uppercase tracking-[0.2em]">ESCON</h2>
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest">{locations.filter(l => l.type === 'escuela_conductores').length} sedes</span>
               </div>
               <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-100">
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {locations.filter(l => l.type === 'escuela_conductores').map(location => (
                           <tr key={location.id} className="hover:bg-slate-50 cursor-pointer transition-all duration-200 group border-b border-slate-50 last:border-0" onClick={() => navigate('/checklist/escon')}>
                              <td className="px-8 py-6">
                                 <span className="text-[13px] font-black text-[#002855] uppercase tracking-tight group-hover:text-blue-600 transition-colors">{location.name}</span>
                              </td>
                              <td className="px-4 py-6">
                                 <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-slate-300" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                 </div>
                              </td>
                              <td className="px-4 py-6 text-center">
                                 <span className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border border-blue-200 text-blue-600 rounded-none bg-white">2 documentos</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <span className="text-[10px] font-black text-blue-600 group-hover:text-blue-800 uppercase tracking-widest">
                                    Ver checklist →
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* ECSAL Section */}
         {canSeeSection('ecsal') && (
            <div className="mb-12">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-emerald-600 rounded-none" />
                  <h2 className="text-[16px] font-black text-[#002855] uppercase tracking-[0.2em]">ECSAL</h2>
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest">{locations.filter(l => l.type === 'policlinico').length} sedes</span>
               </div>
               <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-100">
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {locations.filter(l => l.type === 'policlinico').map(location => (
                           <tr key={location.id} className="hover:bg-slate-50 cursor-pointer transition-all duration-200 group border-b border-slate-50 last:border-0" onClick={() => navigate('/checklist/ecsal')}>
                              <td className="px-8 py-6">
                                 <span className="text-[13px] font-black text-[#002855] uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{location.name}</span>
                              </td>
                              <td className="px-4 py-6">
                                 <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-slate-300" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                 </div>
                              </td>
                              <td className="px-4 py-6 text-center">
                                 <span className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border border-emerald-200 text-emerald-600 rounded-none bg-white">2 documentos</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <span className="text-[10px] font-black text-emerald-600 group-hover:text-emerald-800 uppercase tracking-widest">
                                    Ver checklist →
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* CITV Section */}
         {canSeeSection('citv') && (
            <div className="mb-12">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-orange-600 rounded-none" />
                  <h2 className="text-[16px] font-black text-[#002855] uppercase tracking-[0.2em]">CITV</h2>
                  <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest">{locations.filter(l => l.type === 'revision').length} sedes</span>
               </div>
               <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-100">
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {locations.filter(l => l.type === 'revision').map(location => (
                           <tr key={location.id} className="hover:bg-slate-50 cursor-pointer transition-all duration-200 group border-b border-slate-50 last:border-0" onClick={() => navigate('/checklist/citv')}>
                              <td className="px-8 py-6">
                                 <span className="text-[13px] font-black text-[#002855] uppercase tracking-tight group-hover:text-orange-600 transition-colors">{location.name}</span>
                              </td>
                              <td className="px-4 py-6">
                                 <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-slate-300" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                 </div>
                              </td>
                              <td className="px-4 py-6 text-center">
                                 <span className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border border-orange-200 text-orange-600 rounded-none bg-white">2 documentos</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <span className="text-[10px] font-black text-orange-600 group-hover:text-orange-800 uppercase tracking-widest">
                                    Ver checklist →
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
      </div>
   );

   const renderSpecificView = (unitType: string, unitColor: string, icon: any) => {
      const filteredLocations = getFilteredLocations();

      return (
         <div className="animate-in fade-in duration-500">
            {viewMode === 'grid' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLocations.map((location) => (
                     <div key={location.id} className="group bg-white rounded-none border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all duration-300 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                        <div className="p-5 flex-1 relative z-10">
                           <div className="flex justify-between items-start mb-6">
                              <div className={`w-12 h-12 rounded-none flex items-center justify-center transition-all duration-300 bg-slate-50 text-slate-400 group-hover:bg-${unitColor === 'blue' ? 'blue-600' : unitColor + '-600'} group-hover:text-white group-hover:shadow-lg`}>
                                 {icon}
                              </div>
                              {canEdit() && (
                                 <button
                                    onClick={() => handleEditLinks(location)}
                                    className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-none border border-transparent hover:border-amber-100 transition-all"
                                    title="Editar enlaces"
                                 >
                                    <Edit size={16} />
                                 </button>
                              )}
                           </div>

                           <div className="mb-6">
                              <h3 className="text-[15px] font-black text-[#002855] uppercase leading-tight tracking-tight mb-1">{location.name}</h3>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                 <MapPin size={10} className="text-rose-500" /> {location.address || 'Sin dirección registrada'}
                              </div>
                           </div>

                           <div className="space-y-2">
                              <a
                                 href={(location as any)[`${unitType}_general`]}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group/link"
                              >
                                 <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white shadow-sm border border-slate-100">
                                       <FileText size={14} className="text-blue-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest">Checklist General</span>
                                 </div>
                                 <ChevronRight size={14} className="text-slate-300 group-hover/link:translate-x-1 transition-all" />
                              </a>

                              <a
                                 href={(location as any)[`${unitType}_individual`]}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group/link"
                              >
                                 <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white shadow-sm border border-slate-100">
                                       <ExternalLink size={14} className="text-emerald-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest">Carpeta Evidencias</span>
                                 </div>
                                 <ChevronRight size={14} className="text-slate-300 group-hover/link:translate-x-1 transition-all" />
                              </a>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {viewMode === 'list' && (
               <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-100">
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                           <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                           <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredLocations.map((location) => (
                           <tr key={location.id} className="hover:bg-slate-50 transition-all duration-200 group border-b border-slate-50 last:border-0" onClick={() => navigate(`/checklist/${unitType}`)}>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-9 h-9 flex items-center justify-center transition-all duration-300 bg-slate-50 text-slate-400 group-hover:bg-${unitColor}-600 group-hover:text-white`}>
                                       {icon}
                                    </div>
                                    <span className="text-[13px] font-black text-[#002855] uppercase tracking-tight group-hover:text-blue-600 transition-colors">{location.name}</span>
                                 </div>
                              </td>
                              <td className="px-4 py-6">
                                 <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-slate-300" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                 </div>
                              </td>
                              <td className="px-4 py-6 text-center">
                                 <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border border-${unitColor}-200 text-${unitColor}-600 rounded-none bg-white`}>2 documentos</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="flex items-center justify-end gap-3">
                                    <span className={`text-[10px] font-black text-${unitColor}-600 group-hover:text-${unitColor}-800 uppercase tracking-widest`}>
                                       Ver checklist →
                                    </span>
                                    {canEdit() && (
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             handleEditLinks(location);
                                          }}
                                          className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 shadow-sm border border-transparent hover:border-amber-100 transition-all opacity-0 group-hover:opacity-100"
                                       >
                                          <Edit size={14} />
                                       </button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      );
   };

   return (
      <div className="flex flex-col h-full bg-[#f8f9fc]">
         <div className="p-8 flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
               {/* Fila de Acciones Superior */}
               {type && (
                  <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all mb-8 relative">
                     {/* Badge de Sección */}
                     <div className="absolute -top-3 -left-3">
                        <div className={`bg-${type === 'escon' ? 'blue' : type === 'ecsal' ? 'emerald' : 'orange'}-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl`}>
                           Gestión {type.toUpperCase()}
                        </div>
                     </div>

                     <div className="flex items-center gap-2">
                        {driveLinks[type] && (
                           <a
                              href={driveLinks[type]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-black text-[10px] uppercase tracking-widest mr-2 border border-blue-100"
                           >
                              <ExternalLink size={14} />
                              Abrir Drive
                           </a>
                        )}

                        <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
                           <div className="flex bg-slate-50 p-1 rounded-xl">
                              <button
                                 onClick={() => setViewMode('grid')}
                                 className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                              >
                                 <LayoutGrid size={18} />
                              </button>
                              <button
                                 onClick={() => setViewMode('list')}
                                 className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                              >
                                 <List size={18} />
                              </button>
                           </div>
                        </div>

                        <button
                           onClick={() => navigate('/checklist')}
                           className="px-6 py-2 bg-[#002855] text-white rounded-none hover:bg-blue-800 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm ml-2"
                        >
                           Volver
                        </button>
                     </div>
                  </div>
               )}

               {!type && renderGeneralView()}
               {type === 'escon' && renderSpecificView('escon', 'blue', <GraduationCap size={24} />)}
               {type === 'ecsal' && renderSpecificView('ecsal', 'emerald', <Stethoscope size={24} />)}
               {type === 'citv' && renderSpecificView('citv', 'orange', <Car size={24} />)}
            </div>

            {showForm && editingLocation && (
               <LocationForm
                  editLocation={editingLocation}
                  onClose={() => {
                     setShowForm(false);
                     setEditingLocation(undefined);
                  }}
                  onSave={handleSaveLinks}
               />
            )}
         </div>
      </div>
   );
}

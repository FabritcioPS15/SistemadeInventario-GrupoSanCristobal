import { useState, useEffect, useRef } from 'react';
import { Edit, Plus, Trash2, Save, X, Settings, ChevronDown } from 'lucide-react';

type ChecklistItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
};

type ChecklistTemplate = {
  id: string;
  name: string;
  type: 'escon' | 'ecsal' | 'citv';
  description: string;
  items: ChecklistItem[];
};

type TemplateManagerProps = {
  templates: Record<string, ChecklistTemplate>;
  onSaveTemplate: (templateId: string, template: ChecklistTemplate) => void;
  onClose: () => void;
};

export default function TemplateManager({ templates, onSaveTemplate, onClose }: TemplateManagerProps) {
  const mountedRef = useRef(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('escon');
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const selectedTemplate = templates[selectedTemplateId];
  
  const handleEditTemplate = () => {
    if (mountedRef.current) {
      setEditingTemplate(JSON.parse(JSON.stringify(selectedTemplate)));
    }
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate || !mountedRef.current) return;
    
    // Validar que no haya IDs duplicados
    const itemIds = editingTemplate.items.map(item => item.id);
    const uniqueIds = new Set(itemIds);
    
    if (itemIds.length !== uniqueIds.size) {
      alert('Hay IDs duplicados en los ítems. Por favor corrija antes de guardar.');
      return;
    }

    onSaveTemplate(selectedTemplateId, editingTemplate);
    setEditingTemplate(null);
  };

  const handleAddItem = (category: string) => {
    if (!editingTemplate || !mountedRef.current) return;
    
    const newItem: ChecklistItem = {
      id: `item_${Date.now()}`,
      category,
      title: 'Nuevo Ítem',
      description: 'Descripción del nuevo ítem',
      required: false,
      order: editingTemplate.items.filter(item => item.category === category).length + 1
    };
    
    setEditingTemplate({
      ...editingTemplate,
      items: [...editingTemplate.items, newItem]
    });
  };

  const handleUpdateItem = (itemId: string, field: keyof ChecklistItem, value: any) => {
    if (!editingTemplate || !mountedRef.current) return;
    
    setEditingTemplate({
      ...editingTemplate,
      items: editingTemplate.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!editingTemplate || !mountedRef.current) return;
    
    if (!confirm('¿Está seguro de eliminar este ítem?')) return;
    
    setEditingTemplate({
      ...editingTemplate,
      items: editingTemplate.items.filter(item => item.id !== itemId)
    });
  };

  const handleAddCategory = () => {
    if (!editingTemplate || !mountedRef.current) return;
    
    const categoryName = prompt('Nombre de la nueva categoría:');
    if (!categoryName) return;
    
    const newItem: ChecklistItem = {
      id: `item_${Date.now()}`,
      category: categoryName,
      title: 'Nuevo Ítem',
      description: 'Descripción del nuevo ítem',
      required: false,
      order: 1
    };
    
    setEditingTemplate({
      ...editingTemplate,
      items: [...editingTemplate.items, newItem]
    });
  };

  const toggleCategory = (category: string) => {
    if (!mountedRef.current) return;
    
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategories = (template: ChecklistTemplate) => {
    return Array.from(new Set(template.items.map(item => item.category)));
  };

  const getCategoryItems = (template: ChecklistTemplate, category: string) => {
    return template.items
      .filter(item => item.category === category)
      .sort((a, b) => a.order - b.order);
  };

  if (!editingTemplate) {
    return (
      <div className="fixed inset-0 bg-[#002855]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-none shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative border border-slate-200">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#002855]" />
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings size={20} className="text-[#002855]" />
              <h2 className="text-[16px] font-black text-[#002855] uppercase tracking-tight">Gestión de Plantillas</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-blue-600" />
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Seleccionar Formulario</label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(templates).map(([id, template]) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (mountedRef.current) {
                        setSelectedTemplateId(id);
                      }
                    }}
                    className={`p-5 rounded-none border transition-all text-left relative ${
                      selectedTemplateId === id
                        ? `border-${template.type === 'escon' ? 'blue' : template.type === 'ecsal' ? 'emerald' : 'orange'}-500 bg-${template.type === 'escon' ? 'blue' : template.type === 'ecsal' ? 'emerald' : 'orange'}-50/30`
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`text-[12px] font-black uppercase tracking-widest mb-1 ${selectedTemplateId === id ? `text-${template.type === 'escon' ? 'blue' : template.type === 'ecsal' ? 'emerald' : 'orange'}-600` : 'text-[#002855]'}`}>{template.name.split(' - ')[0]}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">{template.items.length} Requerimientos</div>
                    {selectedTemplateId === id && <div className={`absolute top-0 right-0 w-2 h-2 bg-${template.type === 'escon' ? 'blue' : template.type === 'ecsal' ? 'emerald' : 'orange'}-500`} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-200 rounded-none p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-black text-[#002855] uppercase tracking-tight">{selectedTemplate.name}</h3>
                <span className="px-3 py-1 bg-white border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">Previsualización</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed italic">{selectedTemplate.description}</p>
              
              <div className="space-y-3">
                {getCategories(selectedTemplate).map(category => {
                  const items = getCategoryItems(selectedTemplate, category);
                  return (
                    <div key={category} className="bg-white border border-slate-100 rounded-none p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                        <h4 className="text-[11px] font-black text-[#002855] uppercase tracking-widest">{category}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{items.length} ítems</span>
                      </div>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-[11px] hover:bg-slate-50 rounded px-2 py-1 transition-colors">
                            <span className="font-bold text-slate-600 uppercase tracking-tight">{item.title}</span>
                            {item.required && (
                              <span className="px-2 py-0.5 border border-rose-100 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest">Requerido</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={handleEditTemplate}
                className="px-8 py-3 bg-[#002855] text-white rounded-none font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-800 transition-all shadow-lg flex items-center gap-2 group"
              >
                <Edit size={14} className="group-hover:rotate-12 transition-transform" />
                MODIFICAR ESTRUCTURA
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#002855]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-none shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit size={20} className="text-[#002855]" />
            <h2 className="text-[16px] font-black text-[#002855] uppercase tracking-tight">Estructura: {editingTemplate.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveTemplate}
              className="px-5 py-2 bg-emerald-600 text-white rounded-none font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <Save size={14} />
              CONFIRMAR
            </button>
            <button
              onClick={() => {
                if (mountedRef.current) {
                  setEditingTemplate(null);
                }
              }}
              className="px-5 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-none font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
            >
              CANCELAR
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh] bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nombre Identificador</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => {
                  if (mountedRef.current) {
                    setEditingTemplate({ ...editingTemplate, name: e.target.value });
                  }
                }}
                className="w-full p-4 bg-white border border-slate-200 rounded-none text-[11px] font-bold uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Descripción Técnica</label>
              <textarea
                value={editingTemplate.description}
                onChange={(e) => {
                  if (mountedRef.current) {
                    setEditingTemplate({ ...editingTemplate, description: e.target.value });
                  }
                }}
                className="w-full p-4 bg-white border border-slate-200 rounded-none text-[11px] font-bold uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all h-20 resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-600" />
                <h3 className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Configuración de Requerimientos</h3>
              </div>
              <button
                onClick={handleAddCategory}
                className="px-5 py-2 bg-[#002855] text-white rounded-none font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-800 transition-all flex items-center gap-2 shadow-md"
              >
                <Plus size={14} />
                Agregar Categoría
              </button>
            </div>

            <div className="space-y-6">
              {getCategories(editingTemplate).map(category => {
                const items = getCategoryItems(editingTemplate, category);
                const isExpanded = expandedCategories.has(category);
                
                return (
                  <div key={category} className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-all border-b border-white"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={18} className="text-slate-400" />
                        </div>
                        <h4 className="text-[11px] font-black text-[#002855] uppercase tracking-widest">{category}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 border border-slate-100">{items.length} Ítems</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(category);
                        }}
                        className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-none font-black hover:bg-blue-100 transition-all flex items-center gap-1.5 text-[9px] uppercase tracking-widest"
                      >
                        <Plus size={12} />
                        Añadir Ítem
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-6 space-y-4 bg-slate-50/30">
                        {items.map(item => (
                          <div key={item.id} className="bg-white rounded-none p-5 border border-slate-200 shadow-sm relative group/item">
                            <div className="absolute top-0 left-0 w-1 h-0 group-hover/item:h-full bg-blue-500 transition-all duration-300" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificador Interno (ID)</label>
                                <input
                                  type="text"
                                  value={item.id}
                                  onChange={(e) => handleUpdateItem(item.id, 'id', e.target.value)}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-none text-[10px] font-bold uppercase tracking-widest focus:bg-white focus:border-blue-500 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Título del Requerimiento</label>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-none text-[10px] font-bold uppercase tracking-widest focus:bg-white focus:border-blue-500 outline-none transition-all"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Especificaciones de Verificación</label>
                                <textarea
                                  value={item.description}
                                  onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-none text-[10px] font-bold uppercase tracking-widest focus:bg-white focus:border-blue-500 outline-none transition-all h-16 resize-none leading-relaxed"
                                />
                              </div>
                              <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={(e) => handleUpdateItem(item.id, 'required', e.target.checked)}
                                    className="w-4 h-4 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Obligatorio</span>
                                </label>
                              </div>
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

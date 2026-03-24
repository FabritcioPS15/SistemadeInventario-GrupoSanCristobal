import { useState, useEffect, useRef } from 'react';
import { Edit, Plus, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#002855]">Gestión de Plantillas</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-black text-gray-700 mb-3">Seleccionar Plantilla</label>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(templates).map(([id, template]) => (
                  <button
                    key={id}
                    onClick={() => {
                    if (mountedRef.current) {
                      setSelectedTemplateId(id);
                    }
                  }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTemplateId === id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-black text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-gray-600">{template.items.length} ítems</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-black text-[#002855] mb-4">{selectedTemplate.name}</h3>
              <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
              
              <div className="space-y-4">
                {getCategories(selectedTemplate).map(category => {
                  const items = getCategoryItems(selectedTemplate, category);
                  return (
                    <div key={category} className="bg-white rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-black text-sm">{category}</h4>
                        <span className="text-xs text-gray-500">{items.length} ítems</span>
                      </div>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="flex-1">{item.title}</span>
                            {item.required && (
                              <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Requerido</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleEditTemplate}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Edit size={18} />
                Editar Plantilla
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#002855]">Editando: {editingTemplate.name}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Guardar
              </button>
              <button
                onClick={() => {
                if (mountedRef.current) {
                  setEditingTemplate(null);
                }
              }}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl font-black hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="mb-6">
            <label className="block text-sm font-black text-gray-700 mb-2">Nombre de la Plantilla</label>
            <input
              type="text"
              value={editingTemplate.name}
              onChange={(e) => {
                if (mountedRef.current) {
                  setEditingTemplate({ ...editingTemplate, name: e.target.value });
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-black text-gray-700 mb-2">Descripción</label>
            <textarea
              value={editingTemplate.description}
              onChange={(e) => {
                if (mountedRef.current) {
                  setEditingTemplate({ ...editingTemplate, description: e.target.value });
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none h-20"
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[#002855]">Ítems del Checklist</h3>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Nueva Categoría
              </button>
            </div>

            <div className="space-y-4">
              {getCategories(editingTemplate).map(category => {
                const items = getCategoryItems(editingTemplate, category);
                const isExpanded = expandedCategories.has(category);
                
                return (
                  <div key={category} className="bg-gray-50 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        <h4 className="font-black text-sm">{category}</h4>
                        <span className="text-xs text-gray-500">({items.length} ítems)</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(category);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg font-black hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs"
                      >
                        <Plus size={12} />
                        Ítem
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {items.map(item => (
                          <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">ID del Ítem</label>
                                <input
                                  type="text"
                                  value={item.id}
                                  onChange={(e) => handleUpdateItem(item.id, 'id', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-black text-gray-700 mb-1">Título</label>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-black text-gray-700 mb-1">Descripción</label>
                                <textarea
                                  value={item.description}
                                  onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none h-16"
                                />
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-xs font-black text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={(e) => handleUpdateItem(item.id, 'required', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  Requerido
                                </label>
                              </div>
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

import { useState } from 'react';
import { ChevronDown, ChevronUp, Monitor, Smartphone, Camera, HardDrive, Printer, Scan, Laptop, Projector, Network, CreditCard, Droplets, Zap, MemoryStick, Database, HardDriveIcon } from 'lucide-react';
import { AssetType } from '../lib/supabase';

type CategoryDropdownProps = {
  assetTypes: AssetType[];
  selectedType: string;
  onTypeChange: (typeId: string) => void;
};

// Mapeo de iconos para cada tipo de activo
const getIconForType = (typeName: string) => {
  const iconMap: Record<string, any> = {
    'PC': Monitor,
    'Celular': Smartphone,
    'Cámara': Camera,
    'DVR': HardDrive,
    'Impresora': Printer,
    'Escáner': Scan,
    'Monitor': Monitor,
    'Laptop': Laptop,
    'Proyector': Projector,
    'Switch': Network,
    'Chip de Celular': CreditCard,
    'Tinte': Droplets,
    'Fuente de Poder': Zap,
    'Memoria RAM': MemoryStick,
    'Disco de Almacenamiento': Database,
    'Disco Extraído': HardDriveIcon,
  };
  
  return iconMap[typeName] || Monitor;
};

// Colores para cada categoría
const getColorForType = (typeName: string) => {
  const colorMap: Record<string, string> = {
    'PC': 'bg-blue-50 text-blue-700 border-blue-200',
    'Celular': 'bg-purple-50 text-purple-700 border-purple-200',
    'Cámara': 'bg-green-50 text-green-700 border-green-200',
    'DVR': 'bg-orange-50 text-orange-700 border-orange-200',
    'Impresora': 'bg-red-50 text-red-700 border-red-200',
    'Escáner': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Monitor': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Laptop': 'bg-pink-50 text-pink-700 border-pink-200',
    'Proyector': 'bg-teal-50 text-teal-700 border-teal-200',
    'Switch': 'bg-gray-50 text-gray-700 border-gray-200',
    'Chip de Celular': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Tinte': 'bg-amber-50 text-amber-700 border-amber-200',
    'Fuente de Poder': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Memoria RAM': 'bg-violet-50 text-violet-700 border-violet-200',
    'Disco de Almacenamiento': 'bg-rose-50 text-rose-700 border-rose-200',
    'Disco Extraído': 'bg-slate-50 text-slate-700 border-slate-200',
  };
  
  return colorMap[typeName] || 'bg-gray-50 text-gray-700 border-gray-200';
};

export default function CategoryDropdown({ assetTypes, selectedType, onTypeChange }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedAssetType = assetTypes.find(type => type.id === selectedType);
  const selectedTypeName = selectedAssetType?.name || 'Todas las categorías';
  const SelectedIcon = getIconForType(selectedTypeName);

  // Función para manejar clic en el área principal (seleccionar "Todas las categorías")
  const handleMainClick = () => {
    onTypeChange('');
    setIsOpen(false);
  };

  // Función para manejar clic en la flecha (abrir/cerrar desplegable)
  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <div className="flex items-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50 transition-colors min-w-[200px]">
        <button
          onClick={handleMainClick}
          className="flex items-center gap-2 px-4 py-2 flex-1 text-left"
        >
          {selectedTypeName !== 'Todas las categorías' && (
            <SelectedIcon size={18} className="text-gray-600" />
          )}
          <span className="flex-1">{selectedTypeName}</span>
        </button>
        <button
          onClick={handleArrowClick}
          className="px-2 py-2 hover:bg-gray-100 rounded-r-lg transition-colors"
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => {
                onTypeChange('');
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 transition-colors ${
                !selectedType ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <Monitor size={18} className="text-gray-500" />
              <span>Todas las categorías</span>
            </button>
            
            {assetTypes.map(type => {
              const Icon = getIconForType(type.name);
              const colorClass = getColorForType(type.name);
              
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    onTypeChange(type.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 transition-colors ${
                    selectedType === type.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <Icon size={18} className="text-gray-500" />
                  <span>{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

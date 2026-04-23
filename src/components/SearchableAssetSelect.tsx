import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Monitor, Smartphone, Wrench, Package, MapPin } from 'lucide-react';
import { AssetWithDetails } from '../lib/supabase';

interface SearchableAssetSelectProps {
  assets: AssetWithDetails[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export default function SearchableAssetSelect({ assets, value, onChange, error, placeholder = "Buscar activo..." }: SearchableAssetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAsset = useMemo(() => 
    assets.find(a => a.id === value),
  [assets, value]);

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets.slice(0, 50); // Mostrar top 50 por defecto
    const term = searchTerm.toLowerCase();
    return assets.filter(a => 
      a.brand?.toLowerCase().includes(term) ||
      a.model?.toLowerCase().includes(term) ||
      a.asset_types?.name?.toLowerCase().includes(term) ||
      a.serial_number?.toLowerCase().includes(term) ||
      a.codigo_unico?.toLowerCase().includes(term) ||
      (a as any).descripcion?.toLowerCase().includes(term) ||
      (a as any).description?.toLowerCase().includes(term) ||
      (a as any).item?.toLowerCase().includes(term) ||
      (a as any).name?.toLowerCase().includes(term) ||
      a.notes?.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [assets, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (typeName: string = '') => {
    const name = typeName.toUpperCase();
    if (name.includes('MONITOR')) return <Monitor size={14} />;
    if (name.includes('CELULAR')) return <Smartphone size={14} />;
    if (name.includes('HERRAMIENTA')) return <Wrench size={14} />;
    if (name.includes('REPUESTO')) return <Package size={14} />;
    return <Package size={14} />;
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className={`
          flex items-center justify-between px-4 py-3 bg-slate-50 border transition-all cursor-pointer
          ${isOpen ? 'border-blue-600 ring-4 ring-blue-50 bg-white' : error ? 'border-rose-300' : 'border-slate-200 hover:border-slate-300'}
        `}
      >
        <div className="flex-1 truncate">
          {selectedAsset ? (
            <div className="flex items-center gap-2">
              <span className="p-1 bg-blue-100 text-blue-700 rounded-none">
                {getIcon(selectedAsset.asset_types?.name)}
              </span>
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                {selectedAsset.brand && selectedAsset.model
                  ? `${selectedAsset.brand} ${selectedAsset.model}`
                  : (selectedAsset as any).descripcion ||
                    (selectedAsset as any).item ||
                    (selectedAsset as any).name ||
                    selectedAsset.brand ||
                    selectedAsset.model ||
                    'Sin nombre'}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                {selectedAsset.locations?.name}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 shadow-2xl overflow-hidden scale-in-center origin-top">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Marca, modelo, descripción o serie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[10px] font-black text-slate-700 uppercase tracking-widest bg-white border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-2 custom-scrollbar">
            {filteredAssets.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron activos</p>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    onChange(asset.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`
                    px-4 py-3 cursor-pointer flex items-center justify-between transition-colors
                    ${value === asset.id ? 'bg-blue-50' : 'hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${value === asset.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {getIcon(asset.asset_types?.name)}
                    </div>
                    <div>
                      <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none mb-1 ${value === asset.id ? 'text-blue-700' : 'text-slate-800'}`}>
                        {asset.brand && asset.model
                          ? `${asset.brand} ${asset.model}`
                          : (asset as any).descripcion ||
                            (asset as any).item ||
                            (asset as any).name ||
                            asset.brand ||
                            asset.model ||
                            'Sin nombre'}
                      </h4>
                      {((asset as any).descripcion || (asset as any).description) && (asset.brand || asset.model) && (
                        <p className="text-[9px] text-slate-500 italic truncate max-w-[220px] mb-1">
                          {(asset as any).descripcion || (asset as any).description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{asset.asset_types?.name}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 uppercase italic">
                          <MapPin size={10} />
                          {asset.locations?.name}
                        </div>
                      </div>
                    </div>
                  </div>
                  {value === asset.id && <Check size={16} className="text-blue-600" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-[10px] font-black text-rose-500 uppercase tracking-widest">{error}</p>}
    </div>
  );
}

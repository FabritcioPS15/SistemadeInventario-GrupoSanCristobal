import { useState, useEffect, useCallback } from 'react';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, Category, Subcategory, Location, AssetWithDetails } from '../../../shared/services/supabase';

export type AssetFormData = Record<string, string>;

export type UseAssetFormProps = {
  editAsset?: AssetWithDetails;
  initialCategoryId?: string;
  initialSubcategoryId?: string;
  defaultFields?: AssetFormData;
};

export type UseAssetFormReturn = {
  formData: AssetFormData;
  setFormData: React.Dispatch<React.SetStateAction<AssetFormData>>;
  categories: Category[];
  subcategories: Subcategory[];
  locations: Location[];
  loading: boolean;
  errors: Record<string, string>;
  filteredSubcategories: Subcategory[];
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setField: (name: string, value: string) => void;
  handleSubmit: () => Promise<void>;
};

const BASE_FIELDS: AssetFormData = {
  codigo_unico: '',
  category_id: '',
  subcategory_id: '',
  location_id: '',
  area_id: '',
  brand: '',
  model: '',
  serial_number: '',
  status: 'active',
  item: '',
  descripcion: '',
  unidad_medida: 'UNIDADES',
  cantidad: '1',
  condicion: 'Nuevo',
  color: '',
  gama: '',
  fecha_adquisicion: '',
  valor_estimado: '',
  estado_uso: 'Operativo',
  name: '',
  ip_address: '',
  mac_address: '',
  processor: '',
  ram: '',
  capacity: '',
  operating_system: '',
  anydesk_id: '',
  phone_number: '',
  url: '',
  username: '',
  password: '',
  port: '',
  access_type: 'url',
  auth_code: '',
  placa: '',
  marca_motor: '',
  imei: '',
  operator: '',
  data_plan: '',
  sistema_operativo: '',
  version_so: '',
  almacenamiento: '',
  bateria_estado: '',
  accesorios: '',
  tipo_impresion: '',
  tecnologia_impresion: '',
  velocidad_impresion: '',
  resolucion: '',
  tamaño_pantalla: '',
  resolucion_pantalla: '',
  tipo_conexion: '',
  luminosidad: '',
  potencia_w: '',
  estabilizador_w: '',
  voltage_v: '',
  frecuencia_hz: '',
  brillo_lumens: '',
  velocidad_internet: '',
  tipo_conector: '',
  physical_condition: '',
  bios_mode: '',
};

function buildInitialFields(editAsset?: AssetWithDetails, defaultFields?: AssetFormData, initialCategoryId?: string, initialSubcategoryId?: string): AssetFormData {
  const fields = { ...BASE_FIELDS };

  if (editAsset) {
    Object.keys(fields).forEach(key => {
      const val = (editAsset as any)[key];
      if (val !== undefined && val !== null) {
        fields[key] = typeof val === 'number' ? String(val) : val;
      }
    });
  }

  if (defaultFields) {
    Object.assign(fields, defaultFields);
  }

  if (!editAsset) {
    if (initialCategoryId) fields.category_id = initialCategoryId;
    if (initialSubcategoryId) fields.subcategory_id = initialSubcategoryId;
    if (!fields.codigo_unico) {
      fields.codigo_unico = 'ACT-' + Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  return fields;
}

export function useAssetForm({ editAsset, initialCategoryId, initialSubcategoryId, defaultFields }: UseAssetFormProps): UseAssetFormReturn {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<AssetFormData>(() =>
    buildInitialFields(editAsset, defaultFields, initialCategoryId, initialSubcategoryId)
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [catRes, subRes, locRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('subcategories').select('*').order('sort_order'),
        supabase.from('locations').select('*').eq('is_active', true).order('name'),
      ]);

      if (catRes.error) {
        setErrors(prev => ({ ...prev, submit: `Error cargando categorías: ${catRes.error.message}` }));
        return;
      }

      setCategories(catRes.data || []);
      setSubcategories(subRes.data || []);
      if (locRes.data) setLocations(locRes.data);
    } catch {
      setErrors(prev => ({ ...prev, submit: 'Error de conexión con la base de datos' }));
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'category_id') newData.subcategory_id = '';
      return newData;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const setField = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      if (!formData.category_id) throw new Error('La categoría es obligatoria');

      const numericFields = ['cantidad', 'valor_estimado', 'potencia_w', 'estabilizador_w', 'voltage_v', 'frecuencia_hz', 'brillo_lumens'];
      const dataToSave: Record<string, any> = { updated_at: new Date().toISOString() };

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'codigo_unico' && !value) {
          dataToSave[key] = 'ACT-' + Math.floor(100000 + Math.random() * 900000).toString();
        } else if (key === 'cantidad') {
          dataToSave[key] = parseInt(value) || 1;
        } else if (numericFields.includes(key)) {
          dataToSave[key] = value ? parseFloat(value) : null;
        } else if (value === '' || value === undefined) {
          dataToSave[key] = null;
        } else {
          dataToSave[key] = value;
        }
      });

      if (editAsset) {
        const { error } = await supabase.from('assets').update(dataToSave).eq('id', editAsset.id);
        if (error) throw error;
        notifySuccess('El activo se actualizó correctamente', '¡Excelente!');
      } else {
        const { error } = await supabase.from('assets').insert([dataToSave]);
        if (error) throw error;
        notifySuccess('El activo se creó correctamente', '¡Buen trabajo!');
      }
    } catch (error: any) {
      setErrors({ submit: error.message });
      notifyError(error.message, 'Error');
    } finally {
      setLoading(false);
    }
  }, [formData, editAsset]);

  const filteredSubcategories = formData.category_id
    ? subcategories.filter(s => s.category_id === formData.category_id)
    : [];

  return {
    formData,
    setFormData,
    categories,
    subcategories,
    locations,
    loading,
    errors,
    filteredSubcategories,
    handleChange,
    setField,
    handleSubmit,
  };
}

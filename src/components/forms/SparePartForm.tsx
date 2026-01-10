import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SparePart = {
  id?: string;
  name: string;
  description: string;
  part_number: string;
  manufacturer: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  min_quantity: number;
  location: string;
  supplier: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

type SparePartFormProps = {
  onClose: () => void;
  onSave: () => void;
  editRecord?: SparePart;
};

export default function SparePartForm({ onClose, onSave, editRecord }: SparePartFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  
  const [formData, setFormData] = useState<SparePart>({
    name: editRecord?.name || '',
    description: editRecord?.description || '',
    part_number: editRecord?.part_number || '',
    manufacturer: editRecord?.manufacturer || '',
    category: editRecord?.category || 'general',
    quantity: editRecord?.quantity || 0,
    unit: editRecord?.unit || 'unidad',
    unit_price: editRecord?.unit_price || 0,
    min_quantity: editRecord?.min_quantity || 1,
    location: editRecord?.location || '',
    supplier: editRecord?.supplier || '',
    notes: editRecord?.notes || ''
  });

  const categories = [
    'general',
    'electrónico',
    'mecánico',
    'eléctrico',
    'neumático',
    'hidráulico',
    'otros'
  ];

  const units = [
    'unidad',
    'pieza',
    'juego',
    'par',
    'litro',
    'metro',
    'kg',
    'otro'
  ];

  const validateField = (name: string, value: any) => {
    let isValid = true;
    let errorMessage = '';

    switch (name) {
      case 'name':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El nombre es requerido';
        }
        break;
      case 'part_number':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El número de parte es requerido';
        }
        break;
      case 'quantity':
      case 'min_quantity':
      case 'unit_price':
        if (isNaN(value) || value < 0) {
          isValid = false;
          errorMessage = 'Debe ser un número mayor o igual a 0';
        }
        break;
    }

    setValidationStatus(prev => ({ ...prev, [name]: isValid ? 'valid' : 'invalid' }));
    if (!isValid) {
      setErrors(prev => ({ ...prev, [name]: errorMessage }));
    } else if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }

    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['name', 'part_number'];
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!formData[field as keyof SparePart]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Validate numeric fields
    const numericFields = ['quantity', 'min_quantity', 'unit_price'];
    numericFields.forEach(field => {
      const value = formData[field as keyof SparePart];
      if (typeof value === 'number' && value < 0) {
        newErrors[field] = 'Debe ser un número mayor o igual a 0';
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (editRecord?.id) {
        // Update existing record
        const { error } = await supabase
          .from('spare_parts')
          .update(dataToSave)
          .eq('id', editRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('spare_parts')
          .insert([{ ...dataToSave, created_at: new Date().toISOString() }]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error al guardar el repuesto:', error);
      setErrors({ submit: 'Error al guardar el repuesto. Por favor, intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const renderValidationIcon = (fieldName: string) => {
    const status = validationStatus[fieldName];
    if (status === 'valid') {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (status === 'invalid' || errors[fieldName]) {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {editRecord ? 'Editar Repuesto' : 'Nuevo Repuesto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={(e) => validateField('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderValidationIcon('name')}
                </div>
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Número de Parte */}
            <div>
              <label htmlFor="part_number" className="block text-sm font-medium text-gray-700 mb-1">
                Número de Parte <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="part_number"
                  name="part_number"
                  value={formData.part_number}
                  onChange={handleChange}
                  onBlur={(e) => validateField('part_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.part_number ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderValidationIcon('part_number')}
                </div>
              </div>
              {errors.part_number && <p className="mt-1 text-sm text-red-600">{errors.part_number}</p>}
            </div>

            {/* Fabricante */}
            <div>
              <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-1">
                Fabricante
              </label>
              <input
                type="text"
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Cantidad */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  onBlur={(e) => validateField('quantity', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.quantity ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderValidationIcon('quantity')}
                </div>
              </div>
              {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
            </div>

            {/* Unidad */}
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                Unidad
              </label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Precio Unitario */}
            <div>
              <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unitario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="unit_price"
                  name="unit_price"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                  onBlur={(e) => validateField('unit_price', e.target.value)}
                  className={`pl-7 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.unit_price ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderValidationIcon('unit_price')}
                </div>
              </div>
              {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>}
            </div>

            {/* Cantidad Mínima */}
            <div>
              <label htmlFor="min_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad Mínima
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="min_quantity"
                  name="min_quantity"
                  min="0"
                  step="1"
                  value={formData.min_quantity}
                  onChange={handleChange}
                  onBlur={(e) => validateField('min_quantity', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.min_quantity ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderValidationIcon('min_quantity')}
                </div>
              </div>
              {errors.min_quantity && <p className="mt-1 text-sm text-red-600">{errors.min_quantity}</p>}
            </div>

            {/* Ubicación */}
            <div className="md:col-span-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación en Almacén
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Estante A, Nivel 2"
                disabled={loading}
              />
            </div>

            {/* Proveedor */}
            <div className="md:col-span-2">
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas Adicionales
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Guardando...
                </>
              ) : (
                'Guardar Repuesto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

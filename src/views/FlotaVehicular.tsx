import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Car, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Vehiculo = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  tipo_combustible: string;
  kilometraje: number;
  estado: 'disponible' | 'en_mantenimiento' | 'en_uso' | 'inactivo';
  ubicacion_actual: string;
  imagen_url?: string;
  fecha_ultimo_mantenimiento: string;
  notas: string;
  citv_emision?: string;
  citv_vencimiento?: string;
  soat_emision?: string;
  soat_vencimiento?: string;
  poliza_emision?: string;
  poliza_vencimiento?: string;
};

type Escuela = {
  id: string;
  nombre: string;
  color: string;
};

const escuelas: Escuela[] = [
  { id: 'escuela_central', nombre: 'Escuela Central', color: 'bg-blue-600' },
  { id: 'escuela_norte', nombre: 'Escuela Norte', color: 'bg-green-600' },
  { id: 'escuela_sur', nombre: 'Escuela Sur', color: 'bg-red-600' },
  { id: 'escuela_este', nombre: 'Escuela Este', color: 'bg-yellow-600' },
  { id: 'escuela_oeste', nombre: 'Escuela Oeste', color: 'bg-purple-600' },
];

export default function FlotaVehicular() {
  const { canEdit } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | undefined>();
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    tipo_combustible: 'gasolina',
    kilometraje: 0,
    estado: 'disponible',
    ubicacion_actual: 'escuela_central',
    imagen_url: '',
    fecha_ultimo_mantenimiento: new Date().toISOString().split('T')[0],
    notas: '',
    citv_emision: '',
    citv_vencimiento: '',
    soat_emision: '',
    soat_vencimiento: '',
    poliza_emision: '',
    poliza_vencimiento: ''
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('type', 'escuela_conductores');

      if (error) throw error;

      if (data) {
        setSchools(data);
      }
    } catch (error) {
      console.error('Error al cargar las escuelas:', error);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);
  useEffect(() => {
    fetchVehiculos();
  }, []);

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .order('placa')
        .limit(1000);

      if (error) throw error;

      setVehiculos(data || []);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
      alert('No se pudieron cargar los vehículos. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.placa) newErrors.placa = 'La placa es requerida';
    if (!form.marca) newErrors.marca = 'La marca es requerida';
    if (!form.modelo) newErrors.modelo = 'El modelo es requerido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from('vehiculos')
          .update({
            ...form,
            updated_at: new Date().toISOString()
          })
          .eq('id', editing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehiculos')
          .insert([form]);

        if (error) throw error;
      }

      fetchVehiculos();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error al guardar el vehículo:', error);
      alert('Ocurrió un error al guardar el vehículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este vehículo?')) return;

    try {
      const { error } = await supabase
        .from('vehiculos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchVehiculos();
    } catch (error) {
      console.error('Error al eliminar el vehículo:', error);
      alert('No se pudo eliminar el vehículo');
    }
  };

  const handleEdit = (vehiculo: Vehiculo) => {
    setEditing(vehiculo);
    setForm({
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      año: vehiculo.año,
      tipo_combustible: vehiculo.tipo_combustible,
      kilometraje: vehiculo.kilometraje,
      estado: vehiculo.estado,
      ubicacion_actual: vehiculo.ubicacion_actual,
      imagen_url: vehiculo.imagen_url || '',
      fecha_ultimo_mantenimiento: vehiculo.fecha_ultimo_mantenimiento.split('T')[0],
      notas: vehiculo.notas || '',
      citv_emision: vehiculo.citv_emision || '',
      citv_vencimiento: vehiculo.citv_vencimiento || '',
      soat_emision: vehiculo.soat_emision || '',
      soat_vencimiento: vehiculo.soat_vencimiento || '',
      poliza_emision: vehiculo.poliza_emision || '',
      poliza_vencimiento: vehiculo.poliza_vencimiento || ''
    });
    setShowForm(true);
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setForm(prev => ({ ...prev, imagen_url: url }));
  };

  const openImageModal = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setShowImageModal(true);
  };

  const resetForm = () => {
    setForm({
      placa: '',
      marca: '',
      modelo: '',
      año: new Date().getFullYear(),
      tipo_combustible: 'gasolina',
      kilometraje: 0,
      estado: 'disponible',
      ubicacion_actual: 'escuela_central',
      imagen_url: '',
      fecha_ultimo_mantenimiento: new Date().toISOString().split('T')[0],
      notas: '',
      citv_emision: '',
      citv_vencimiento: '',
      soat_emision: '',
      soat_vencimiento: '',
      poliza_emision: '',
      poliza_vencimiento: ''
    });
    setEditing(undefined);
    setErrors({});
  };

  const filteredVehiculos = vehiculos.filter(vehiculo =>
    Object.values(vehiculo).some(
      value => value &&
        value.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  const getEstadoBadge = (estado: string) => {
    const estados = {
      disponible: 'bg-green-100 text-green-800',
      en_mantenimiento: 'bg-yellow-100 text-yellow-800',
      en_uso: 'bg-blue-100 text-blue-800',
      inactivo: 'bg-gray-100 text-gray-800'
    };

    const estadoText = {
      disponible: 'Disponible',
      en_mantenimiento: 'En Mantenimiento',
      en_uso: 'En Uso',
      inactivo: 'Inactivo'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estados[estado as keyof typeof estados]}`}>
        {estadoText[estado as keyof typeof estadoText]}
      </span>
    );
  };

  const getDocumentStatus = (dateString?: string) => {
    if (!dateString) return { color: 'bg-gray-100 text-gray-800', label: 'No reg.' };

    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'bg-red-100 text-red-800', label: 'Vencido' };
    if (diffDays <= 30) return { color: 'bg-yellow-100 text-yellow-800', label: 'Por vencer' };
    return { color: 'bg-green-100 text-green-800', label: 'Vigente' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getEscuelaColor = (ubicacionActual: string) => {
    const escuela = escuelas.find(e => e.id === ubicacionActual);
    return escuela ? escuela.color : 'bg-gray-200';
  };

  const getEscuelaNombre = (ubicacionActual: string) => {
    const escuela = escuelas.find(e => e.id === ubicacionActual);
    return escuela ? escuela.nombre : 'Sin asignar';
  };

  return (
    <div className="p-8 relative">
      {/* Image Preview Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img
              src={currentImage}
              alt="Vista previa"
              className="max-w-full max-h-[80vh] mx-auto object-contain"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Flota Vehicular</h2>
          <p className="text-gray-600">Gestiona los vehículos de la empresa</p>
        </div>

        <div className="mt-4 md:mt-0">
          {canEdit() && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Agregar Vehículo
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Buscar vehículos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca / Modelo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Año
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documentación (Vencimiento)
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehiculos.length > 0 ? (
                filteredVehiculos.map((vehiculo) => (
                  <tr key={vehiculo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-md">
                          <Car className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vehiculo.placa}</div>
                          <div className="text-sm text-gray-500">{vehiculo.marca} {vehiculo.modelo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vehiculo.marca} {vehiculo.modelo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vehiculo.año}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEstadoBadge(vehiculo.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        {/* CITV */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 w-12">CITV:</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getDocumentStatus(vehiculo.citv_vencimiento).color}`}>
                            {vehiculo.citv_vencimiento || '-'}
                          </span>
                        </div>
                        {/* SOAT */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 w-12">SOAT:</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getDocumentStatus(vehiculo.soat_vencimiento).color}`}>
                            {vehiculo.soat_vencimiento || '-'}
                          </span>
                        </div>
                        {/* Poliza */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 w-12">Póliza:</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getDocumentStatus(vehiculo.poliza_vencimiento).color}`}>
                            {vehiculo.poliza_vencimiento || '-'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(vehiculo)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehiculo.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No se encontraron vehículos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario para agregar/editar vehículos */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editing ? 'Editar Vehículo' : 'Agregar Vehículo'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Placa *</label>
                  <input
                    type="text"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value })}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 ${errors.placa ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.placa && <p className="text-red-500 text-xs mt-1">{errors.placa}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Marca *</label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 ${errors.marca ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.marca && <p className="text-red-500 text-xs mt-1">{errors.marca}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Modelo *</label>
                  <input
                    type="text"
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 ${errors.modelo ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.modelo && <p className="text-red-500 text-xs mt-1">{errors.modelo}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Año</label>
                  <input
                    type="number"
                    value={form.año}
                    onChange={(e) => setForm({ ...form, año: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Combustible</label>
                  <select
                    value={form.tipo_combustible}
                    onChange={(e) => setForm({ ...form, tipo_combustible: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="gasolina">Gasolina</option>
                    <option value="diesel">Diésel</option>
                    <option value="electrico">Eléctrico</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Kilometraje</label>
                  <input
                    type="number"
                    value={form.kilometraje}
                    onChange={(e) => setForm({ ...form, kilometraje: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="en_mantenimiento">En Mantenimiento</option>
                    <option value="en_uso">En Uso</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Escuela</label>
                  <select
                    value={form.ubicacion_actual}
                    onChange={(e) => setForm({ ...form, ubicacion_actual: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Último Mantenimiento</label>
                  <input
                    type="date"
                    value={form.fecha_ultimo_mantenimiento}
                    onChange={(e) => setForm({ ...form, fecha_ultimo_mantenimiento: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                {/* CITV Section */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">CITV (Revisión Técnica)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                      <input
                        type="date"
                        value={form.citv_emision}
                        onChange={(e) => setForm({ ...form, citv_emision: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                      <input
                        type="date"
                        value={form.citv_vencimiento}
                        onChange={(e) => setForm({ ...form, citv_vencimiento: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* SOAT Section */}
                <div className="md:col-span-2 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">SOAT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                      <input
                        type="date"
                        value={form.soat_emision}
                        onChange={(e) => setForm({ ...form, soat_emision: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                      <input
                        type="date"
                        value={form.soat_vencimiento}
                        onChange={(e) => setForm({ ...form, soat_vencimiento: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Policy Section */}
                <div className="md:col-span-2 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Póliza de Seguro</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                      <input
                        type="date"
                        value={form.poliza_emision}
                        onChange={(e) => setForm({ ...form, poliza_emision: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                      <input
                        type="date"
                        value={form.poliza_vencimiento}
                        onChange={(e) => setForm({ ...form, poliza_vencimiento: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">URL de la imagen (Google Drive)</label>
                  <input
                    type="url"
                    value={form.imagen_url || ''}
                    onChange={handleImageUrlChange}
                    placeholder="https://drive.google.com/..."
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {form.imagen_url && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
                      <img
                        src={form.imagen_url}
                        alt="Vista previa"
                        className="h-32 object-contain rounded-md border border-gray-200 p-1 cursor-pointer"
                        onClick={() => openImageModal(form.imagen_url || '')}
                        onError={(e) => {
                          // Si la imagen no se puede cargar, mostramos un mensaje
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiYjMTQ3Q0JCOyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlLW9mZiI+PHBhdGggZD0iTTQgMTVMMjIgMyIvPjxwYXRoIGQ9Ik0xMC41IDkuNWwtLjE5Mi4xOTJhMiA1LjQxIDAgMCAwLTcuMDg3IDcuMDg3bDUuNjk5LTUuNjk5Ci8+PHBhdGggZD0iTTE2LjUgMTMuNWwtMS45NjggMS45NjhhMi44NjcgMi44NjcgMCAwIDAtNC4wNjQtNC4wNjRsLSgxLjA0OC0xLjA0OGExLjg0IDEuODQgMCAwIDAtMi42MTkuMTI2bC0uMDU2LjA2O2EyLjI4IDIuMjggMCAwIDAgLjYwMiAzLjI3bC0uNTcuMzg2YTIuMjg0IDIuMjg0IDAgMCAwLTIuODc4LS4zMzRsLS4xNTUuMTE0YTIuODcgMi44NyAwIDAgMCAwIDQuNzFsLjE1NS4xMTRhMi44ODQgMi44ODQgMCAwIDAgMy40ODUtLjQ5M2wuNTY1LS41NjVhMi44NyAyLjg3IDAgMCAwIDQuMDEyLS4xNzRsLjA5NC0uMDg0YTIuODcgMi44NyAwIDAgMCAuMTc0LTQuMDEyeiIvPjxwYXRoIGQ9Ik0yIDIybDE1LTE1Ii8+PHBhdGggZD0iTTIyIDJ2MTJhNCA0IDAgMCAxLTQgNEg2Ii8+PC9zdmc+';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editing ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
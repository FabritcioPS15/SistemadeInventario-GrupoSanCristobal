import { ComponentType } from 'react';
import TecnologiaForm from '../forms/categories/TecnologiaForm';
import SeguridadControlForm from '../forms/categories/SeguridadControlForm';
import EquiposOperativosForm from '../forms/categories/EquiposOperativosForm';
import FlotaVehicularForm from '../forms/categories/FlotaVehicularForm';
import InfraestructuraTIForm from '../forms/categories/InfraestructuraTIForm';
import HerramientasEquiposForm from '../forms/categories/HerramientasEquiposForm';
import InstalacionesForm from '../forms/categories/InstalacionesForm';
import GenericForm from '../forms/categories/GenericForm';
import { UseAssetFormReturn } from '../hooks/useAssetForm';

export type CategoryFormProps = {
  form: UseAssetFormReturn;
  editAsset?: any;
  onClose: () => void;
};

export const CATEGORY_FORM_REGISTRY: Record<string, ComponentType<CategoryFormProps>> = {
  'tecnologia': TecnologiaForm,
  'seguridad-control': SeguridadControlForm,
  'equipos-operativos': EquiposOperativosForm,
  'flota-vehicular': FlotaVehicularForm,
  'infraestructura-ti': InfraestructuraTIForm,
  'herramientas-equipos': HerramientasEquiposForm,
  'instalaciones': InstalacionesForm,
  'mobiliario': GenericForm,
  'utiles-suministros': GenericForm,
  'otros-activos': GenericForm,
};

export const DEFAULT_CATEGORY_FORM = GenericForm;

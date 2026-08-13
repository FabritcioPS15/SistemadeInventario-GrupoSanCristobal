import { useMemo } from 'react';
import { AssetWithDetails } from '../../../shared/services/supabase';
import { CATEGORY_FORM_REGISTRY } from '../config/categoryFormRegistry';
import { useAssetForm } from '../hooks/useAssetForm';
import DynamicAssetForm from './DynamicAssetForm';

type AssetFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAsset?: AssetWithDetails;
  initialCategoryId?: string;
  initialSubcategoryId?: string;
};

export default function AssetForm({ onClose, onSave, editAsset, initialCategoryId, initialSubcategoryId }: AssetFormProps) {
  const form = useAssetForm({ editAsset, initialCategoryId, initialSubcategoryId });

  const categorySlug = useMemo(() => {
    const cat = form.categories.find(c => c.id === form.formData.category_id);
    return cat?.slug || '';
  }, [form.categories, form.formData.category_id]);

  // Si existe en el registry y NO es GenericForm, usar el antiguo, caso contrario usar Dynamic
  // En nuestro caso, vamos a reemplazar todo con DynamicAssetForm de acuerdo al plan
  return (
    <DynamicAssetForm
      onClose={onClose}
      onSaved={onSave}
      editAsset={editAsset}
      initialCategoryId={initialCategoryId}
    />
  );
}

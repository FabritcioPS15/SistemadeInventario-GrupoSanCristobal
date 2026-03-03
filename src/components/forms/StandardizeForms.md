# Form Standardization Guide

## Completed Forms ✅
1. AssetForm.tsx - Fully standardized
2. PCForm.tsx - Fully standardized

## Remaining Forms to Standardize 📋
3. UserForm.tsx - In progress (complex form with permissions)
4. LocationForm.tsx
5. CameraForm.tsx
6. DVRForm.tsx
7. MaintenanceForm.tsx
8. MaquinariaForm.tsx
9. MonitorForm.tsx
10. PhoneForm.tsx
11. ShipmentForm.tsx
12. SparePartForm.tsx
13. SutranVisitForm.tsx
14. TicketForm.tsx
15. WebcamForm.tsx
16. AuditForm.tsx
17. MTCAccesoForm.tsx

## Standardization Pattern
For each form, apply this structure:

```tsx
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

export default function YourForm({ onClose, onSave, editData }: YourFormProps) {
  // ... existing state and logic ...

  return (
    <BaseForm
      title={editData ? 'Editar X' : 'Nuevo X'}
      subtitle="Descripción del módulo"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="4xl" // or "5xl" for complex forms
      icon={<YourIcon size={24} className="text-blue-600" />}
      showChangesWarning={hasChanges} // if applicable
    >
      <FormSection title="Sección Principal" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Campo" required error={errors.field}>
            <FormInput 
              type="text" 
              name="field" 
              value={formData.field} 
              onChange={handleChange} 
              placeholder="Ej: valor"
              error={errors.field}
            />
          </FormField>
        </div>
      </FormSection>
    </BaseForm>
  );
}
```

## Color Scheme for Sections
- Blue: Primary/Identification sections
- Emerald: Technical specifications
- Amber: Inventory/Information
- Purple: Acquisition/Value
- Rose: Critical/Important sections
- Indigo: Additional/Optional sections

## Key Benefits Achieved
✅ Consistent responsive design
✅ Unified typography and colors
✅ Standardized error handling
✅ Mobile-first approach
✅ Accessible form structure
✅ Maintainable codebase

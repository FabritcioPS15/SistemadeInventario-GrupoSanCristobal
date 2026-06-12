import { useState, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

export type FieldType = 'text' | 'email' | 'password' | 'number' | 'date' | 'url' | 'tel' | 'textarea' | 'select';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  options?: { value: string; label: string }[];
  validation?: (value: string) => string | null;
  showPasswordToggle?: boolean;
  gridCols?: number;
  conditional?: (formData: Record<string, any>) => boolean;
  helperText?: string;
  disabled?: boolean;
  maxLength?: number;
}

export interface SectionConfig {
  title: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';
  fields: FieldConfig[];
  titleRight?: ReactNode;
}

export interface GenericFormProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave: (formData: Record<string, any>) => Promise<void>;
  sections: SectionConfig[];
  initialData?: Record<string, any>;
  icon?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  customValidation?: (formData: Record<string, any>) => Record<string, string>;
  beforeSubmit?: (formData: Record<string, any>) => Record<string, any>;
  helpSection?: ReactNode;
}

export default function GenericForm({
  title,
  subtitle,
  onClose,
  onSave,
  sections,
  initialData = {},
  icon,
  maxWidth = '6xl',
  customValidation,
  beforeSubmit,
  helpSection
}: GenericFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    sections.forEach(section => {
      section.fields.forEach(field => {
        initial[field.name] = initialData[field.name] ?? field.defaultValue ?? '';
      });
    });
    return initial;
  });

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateField = (field: FieldConfig, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} es requerido`;
    }

    if (field.validation) {
      return field.validation(value);
    }

    return null;
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.conditional && !field.conditional(formData)) {
          return;
        }

        const error = validateField(field, formData[field.name]);
        if (error) {
          newErrors[field.name] = error;
        }
      });
    });

    if (customValidation) {
      const customErrors = customValidation(formData);
      Object.assign(newErrors, customErrors);
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      let dataToSubmit = { ...formData };

      if (beforeSubmit) {
        dataToSubmit = beforeSubmit(dataToSubmit);
      }

      await onSave(dataToSubmit);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Error al guardar' });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    if (field.conditional && !field.conditional(formData)) {
      return null;
    }

    const error = errors[field.name];
    const value = formData[field.name] ?? '';

    const inputProps = {
      name: field.name,
      value: value,
      onChange: handleChange,
      placeholder: field.placeholder,
      error: error,
      disabled: field.disabled,
      maxLength: field.maxLength,
      required: field.required
    };

    let inputElement: ReactNode;

    switch (field.type) {
      case 'textarea':
        inputElement = (
          <FormTextarea
            {...inputProps}
            rows={4}
          />
        );
        break;

      case 'select':
        inputElement = (
          <FormSelect {...inputProps}>
            <option value="">Seleccionar...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
        );
        break;

      case 'password':
        inputElement = (
          <div className="relative">
            <FormInput
              {...inputProps}
              type={showPassword[field.name] ? 'text' : 'password'}
              className={field.showPasswordToggle ? 'pr-10' : ''}
            />
            {field.showPasswordToggle && (
              <button
                type="button"
                onClick={() => togglePasswordVisibility(field.name)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        );
        break;

      default:
        inputElement = (
          <FormInput
            {...inputProps}
            type={field.type}
          />
        );
    }

    return (
      <FormField
        key={field.name}
        label={field.label}
        required={field.required}
        error={error}
        gridCols={field.gridCols}
      >
        {inputElement}
        {field.helperText && (
          <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>
        )}
      </FormField>
    );
  };

  return (
    <BaseForm
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={icon}
      maxWidth={maxWidth}
    >
      {helpSection}

      {sections.map((section, sectionIndex) => (
        <FormSection
          key={sectionIndex}
          title={section.title}
          color={section.color}
          titleRight={section.titleRight}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.fields.map(field => renderField(field))}
          </div>
        </FormSection>
      ))}
    </BaseForm>
  );
}

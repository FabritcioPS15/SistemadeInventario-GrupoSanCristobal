import { Edit, Trash2 } from 'lucide-react';

interface RowActionsProps {
  /** Callback para editar */
  onEdit?: (e: React.MouseEvent) => void;
  /** Callback para eliminar */
  onDelete?: (e: React.MouseEvent) => void;
  /** Si es false, no muestra ninguna acción (útil con canEdit()) */
  canEdit?: boolean;
  /** Clases extra del contenedor */
  className?: string;
}

/**
 * Acciones de fila unificadas (Editar + Eliminar).
 * Reemplaza los pares de botones Edit/Delete en tablas y grids de todas las páginas.
 *
 * Uso:
 * <RowActions
 *   canEdit={canEdit()}
 *   onEdit={(e) => { e.stopPropagation(); openEdit(item); }}
 *   onDelete={(e) => { e.stopPropagation(); handleDelete(item.id); }}
 * />
 */
export default function RowActions({ onEdit, onDelete, canEdit = true, className = '' }: RowActionsProps) {
  if (!canEdit) return null;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {onEdit && (
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
          title="Editar"
          type="button"
        >
          <Edit size={14} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
          title="Eliminar"
          type="button"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

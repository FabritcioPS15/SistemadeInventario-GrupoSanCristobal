import { Lightbulb, ArrowRight } from 'lucide-react';
import { detectCategory, getCategoryBySlug, CATEGORY_RECOMMENDATIONS } from '../config/categoryRecommendations';
import { Category } from '../../shared/services/supabase';

type Props = {
  itemName: string;
  currentCategorySlug: string;
  categories: Category[];
  onApplyCategory: (categorySlug: string) => void;
};

export default function CategoryRecommendation({ itemName, currentCategorySlug, categories, onApplyCategory }: Props) {
  const detectedSlug = detectCategory(itemName);

  if (!detectedSlug || detectedSlug === currentCategorySlug) return null;

  const recommendation = getCategoryBySlug(detectedSlug);
  const matchedCategory = categories.find(c => {
    const catSlug = (c as any).slug;
    return catSlug === detectedSlug;
  });

  if (!recommendation || !matchedCategory) return null;

  return (
    <div className="col-span-full mt-1">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <Lightbulb size={14} className="text-amber-600 shrink-0" />
        <span className="text-[11px] text-amber-800">
          <span className="font-semibold">¿Es {matchedCategory.name}?</span>
          {' '}— {recommendation.examples.slice(0, 4).join(', ')}
        </span>
        <button
          type="button"
          onClick={() => onApplyCategory(detectedSlug)}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors shrink-0"
        >
          Aplicar
          <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}

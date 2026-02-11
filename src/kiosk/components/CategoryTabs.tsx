import { cn } from "@shared/lib/utils";
import type { Category } from "@shared/types/menu";

interface CategoryTabsProps {
  categories: Category[];
  active: string | null;
  onChange: (slug: string) => void;
}

export default function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-white border-b shrink-0 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.slug)}
          className={cn(
            "px-5 py-3 rounded-xl text-base font-bold whitespace-nowrap transition-all shrink-0",
            active === cat.slug
              ? "bg-primary text-white shadow-soft"
              : "bg-gray-100 text-primary hover:bg-gray-200"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

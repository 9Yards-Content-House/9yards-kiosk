import { cn } from "@shared/lib/utils";
import type { Category } from "@shared/types/menu";

interface CategoryTabsProps {
  categories: Category[];
  active: string | null;
  onChange: (slug: string) => void;
}

export default function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-card border-b shrink-0 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.slug)}
          className={cn(
            "px-5 py-3 rounded-xl text-base font-medium whitespace-nowrap transition-colors shrink-0",
            active === cat.slug
              ? "bg-yards-blue text-white shadow-sm"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

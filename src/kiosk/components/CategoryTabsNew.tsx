import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@shared/context/LanguageContext';
import { Category } from '@shared/types';
import { getCategoryName } from '@shared/lib/i18n';
import { cn, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';

interface CategoryTabsNewProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
  itemCounts?: Record<string, number>;
  className?: string;
}

export default function CategoryTabsNew({
  categories,
  activeCategory,
  onCategoryChange,
  itemCounts = {},
  className,
}: CategoryTabsNewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeButtonRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeButtonRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      const scrollLeft =
        button.offsetLeft -
        container.offsetWidth / 2 +
        button.offsetWidth / 2;

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth',
      });
    }
  }, [activeCategory]);

  const handleCategoryClick = useCallback(
    (slug: string | null) => {
      vibrate();
      onCategoryChange(slug);
    },
    [onCategoryChange]
  );

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex gap-2 overflow-x-auto scrollbar-hide py-3 px-4',
        '-mx-4 px-4', // Negative margin for full-width scroll
        className
      )}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* All tab */}
      <CategoryTab
        ref={activeCategory === null ? activeButtonRef : undefined}
        label={t('category.all')}
        active={activeCategory === null}
        onClick={() => handleCategoryClick(null)}
      />

      {/* Category tabs */}
      {categories
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((category) => (
          <CategoryTab
            key={category.id}
            ref={activeCategory === category.slug ? activeButtonRef : undefined}
            label={getCategoryName(category.slug)}
            count={itemCounts[category.slug]}
            active={activeCategory === category.slug}
            onClick={() => handleCategoryClick(category.slug)}
          />
        ))}
    </div>
  );
}

interface CategoryTabProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

const CategoryTab = ({
  ref,
  label,
  count,
  active,
  onClick,
}: CategoryTabProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all',
        'touch-manipulation select-none',
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-muted/80 text-muted-foreground hover:bg-muted'
      )}
    >
      <span className="flex items-center gap-2">
        {label}
        {count !== undefined && count > 0 && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-xs',
              active
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted-foreground/20 text-muted-foreground'
            )}
          >
            {count}
          </span>
        )}
      </span>
      
      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-primary rounded-full -z-10"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );
};

// Add forwardRef properly
import { forwardRef } from 'react';

export { CategoryTabsNew };

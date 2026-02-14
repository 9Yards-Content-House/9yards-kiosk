import { cn } from '@shared/lib/utils';

interface SkipLinkProps {
  targetId: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Skip link for keyboard navigation accessibility
 * Allows users to skip repetitive navigation and jump directly to main content
 */
export function SkipLink({ targetId, className, children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Hidden by default, visible on focus
        'sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000]',
        'px-4 py-2 bg-brand-600 text-white rounded-lg font-medium',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

export default SkipLink;

import { cn } from '@shared/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

/**
 * Premium skeleton loading component
 */
export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animations = {
    pulse: 'animate-pulse bg-muted',
    shimmer: 'skeleton',
    none: 'bg-muted',
  };

  return (
    <div
      className={cn(
        animations[animation],
        variants[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

/**
 * Menu item card skeleton
 */
export function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col">
      {/* Image */}
      <Skeleton className="aspect-[4/3] w-full" variant="rectangular" />
      
      {/* Content */}
      <div className="p-3 md:p-4 flex flex-col flex-1 space-y-2">
        {/* Category tag */}
        <Skeleton className="h-3 w-16" variant="rounded" />
        
        {/* Name */}
        <Skeleton className="h-5 w-3/4" variant="rounded" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full" variant="rounded" />
        
        {/* Price row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          <Skeleton className="h-6 w-20" variant="rounded" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Menu grid skeleton
 */
export function MenuGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <MenuItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Cart item skeleton
 */
export function CartItemSkeleton() {
  return (
    <div className="p-4 border-b bg-white">
      <div className="flex gap-4 items-start">
        {/* Image */}
        <Skeleton className="w-24 h-24 shrink-0" variant="rounded" />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" variant="rounded" />
          <Skeleton className="h-4 w-1/2" variant="rounded" />
          
          <div className="flex items-center justify-between mt-3">
            <Skeleton className="h-6 w-20" variant="rounded" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Category tabs skeleton
 */
export function CategoryTabsSkeleton() {
  return (
    <div className="px-2 pb-3 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        {[100, 85, 90, 80, 95, 88].map((width, i) => (
          <Skeleton 
            key={i}
            className="h-10 rounded-full"
            width={width}
            variant="rounded"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Order summary skeleton
 */
export function OrderSummarySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" variant="rounded" />
          <Skeleton className="h-5 w-20" variant="rounded" />
        </div>
      ))}
      <div className="border-t pt-4 flex justify-between items-center">
        <Skeleton className="h-6 w-16" variant="rounded" />
        <Skeleton className="h-8 w-28" variant="rounded" />
      </div>
    </div>
  );
}

/**
 * Confirmation page skeleton
 */
export function ConfirmationSkeleton() {
  return (
    <div className="flex flex-col items-center pt-12 pb-8 px-6 space-y-6">
      {/* Success icon */}
      <Skeleton className="w-24 h-24" variant="circular" />
      
      {/* Title */}
      <Skeleton className="h-10 w-48" variant="rounded" />
      
      {/* Subtitle */}
      <Skeleton className="h-5 w-64" variant="rounded" />
      
      {/* Order number card */}
      <Skeleton className="h-40 w-full max-w-md rounded-3xl" />
      
      {/* QR code */}
      <Skeleton className="h-48 w-48" variant="rounded" />
      
      {/* Wait time */}
      <Skeleton className="h-24 w-full max-w-md rounded-2xl" />
    </div>
  );
}

/**
 * Full page loading state
 */
export function PageLoadingSkeleton({ 
  type = 'menu' 
}: { 
  type?: 'menu' | 'cart' | 'confirmation' 
}) {
  if (type === 'menu') {
    return (
      <div className="kiosk-screen flex flex-col bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-[#212282] py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 bg-white/10" variant="circular" />
            <Skeleton className="w-24 h-8 bg-white/10" variant="rounded" />
          </div>
          <Skeleton className="h-8 w-3/4 bg-white/10 mb-2" variant="rounded" />
          <Skeleton className="h-5 w-1/2 bg-white/10" variant="rounded" />
        </div>
        
        {/* Search skeleton */}
        <div className="bg-white border-b px-4 py-3">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
        
        {/* Category tabs */}
        <div className="bg-white border-b">
          <CategoryTabsSkeleton />
        </div>
        
        {/* Grid */}
        <div className="flex-1 overflow-hidden">
          <MenuGridSkeleton count={8} />
        </div>
      </div>
    );
  }
  
  if (type === 'cart') {
    return (
      <div className="kiosk-screen flex flex-col bg-[#FAFAFA]">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10" variant="circular" />
              <Skeleton className="w-20 h-6" variant="rounded" />
            </div>
            <Skeleton className="w-24 h-8" variant="rounded" />
          </div>
        </div>
        
        {/* Items */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <CartItemSkeleton key={i} />
          ))}
        </div>
        
        {/* Footer */}
        <div className="border-t bg-white p-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="w-20 h-5" variant="rounded" />
            <Skeleton className="w-28 h-8" variant="rounded" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-14 rounded-xl" />
            <Skeleton className="flex-1 h-14 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  
  return <ConfirmationSkeleton />;
}

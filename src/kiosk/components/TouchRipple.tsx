import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@shared/lib/utils';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface TouchRippleProps {
  children: React.ReactNode;
  className?: string;
  color?: 'primary' | 'secondary' | 'white' | 'dark';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  as?: 'button' | 'div';
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  role?: string;
  tabIndex?: number;
}

const RIPPLE_COLORS = {
  primary: 'bg-[#212282]/20',
  secondary: 'bg-[#E6411C]/25',
  white: 'bg-white/30',
  dark: 'bg-black/10',
};

/**
 * Premium touch ripple effect component
 * Creates a Material Design-like ripple animation on touch/click
 */
export default function TouchRipple({
  children,
  className,
  color = 'dark',
  disabled = false,
  onClick,
  onTouchStart,
  as: Component = 'button',
  type = 'button',
  ...props
}: TouchRippleProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback((clientX: number, clientY: number) => {
    if (disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: Ripple = {
      id: rippleIdRef.current++,
      x: x - size / 2,
      y: y - size / 2,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);
  }, [disabled]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    createRipple(e.clientX, e.clientY);
    onClick?.(e);
  }, [createRipple, onClick]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    createRipple(touch.clientX, touch.clientY);
    onTouchStart?.(e);
  }, [createRipple, onTouchStart]);

  // Clean up ripples after animation
  useEffect(() => {
    if (ripples.length === 0) return;

    const timer = setTimeout(() => {
      setRipples((prev) => prev.slice(1));
    }, 600);

    return () => clearTimeout(timer);
  }, [ripples]);

  const commonProps = {
    ref: containerRef as React.Ref<HTMLButtonElement & HTMLDivElement>,
    className: cn(
      'relative overflow-hidden transform-gpu',
      'active:scale-[0.98] transition-transform duration-100',
      disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      className
    ),
    onClick: handleClick,
    onTouchStart: handleTouchStart,
    disabled,
    ...props,
  };

  return (
    <Component {...commonProps} {...(Component === 'button' ? { type } : {})}>
      {children}
      
      {/* Ripple container */}
      <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className={cn(
              'absolute rounded-full opacity-0 animate-ripple',
              RIPPLE_COLORS[color]
            )}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </span>
    </Component>
  );
}

/**
 * Premium button with built-in touch feedback
 * Combines ripple effect with scale animation and haptic-like feedback
 */
interface PremiumButtonProps extends Omit<TouchRippleProps, 'as'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'touch';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const BUTTON_VARIANTS = {
  primary: 'bg-[#212282] hover:bg-[#1a1a6e] text-white shadow-md hover:shadow-lg',
  secondary: 'bg-[#E6411C] hover:bg-[#d13a18] text-white shadow-md hover:shadow-lg',
  outline: 'bg-transparent border-2 border-gray-200 hover:border-[#212282] text-[#212282] hover:bg-[#212282]/5',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  xl: 'h-14 px-8 text-lg rounded-2xl gap-3',
  touch: 'h-14 sm:h-16 px-6 sm:px-8 text-base sm:text-lg rounded-2xl gap-2 sm:gap-3',
};

export function PremiumButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  children,
  disabled,
  ...props
}: PremiumButtonProps) {
  const rippleColor = variant === 'secondary' ? 'secondary' : 
                      variant === 'primary' ? 'white' : 'primary';

  return (
    <TouchRipple
      color={rippleColor}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-bold transition-all duration-200',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </TouchRipple>
  );
}

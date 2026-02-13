import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { useSound } from '../hooks/useSound';
import { useReducedMotion } from '../context/AccessibilityContext';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

const CONFETTI_COLORS = [
  '#E6411C', // Orange
  '#212282', // Blue
  '#22C55E', // Green
  '#FBBF24', // Yellow
  '#EC4899', // Pink
  '#8B5CF6', // Purple
];

/**
 * Premium confetti celebration effect
 */
export function Confetti({ 
  count = 50, 
  duration = 3000,
  onComplete,
}: { 
  count?: number;
  duration?: number;
  onComplete?: () => void;
}) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      onComplete?.();
      return;
    }

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    }));

    setPieces(newPieces);

    const timer = setTimeout(() => {
      setPieces([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [count, duration, reducedMotion, onComplete]);

  if (reducedMotion || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[200]">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-3 h-3"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            backgroundColor: piece.color,
            transform: `scale(${piece.scale})`,
          }}
          initial={{ 
            y: 0, 
            x: 0,
            rotate: 0,
            opacity: 1,
          }}
          animate={{ 
            y: '120vh', 
            x: [0, 50 * (Math.random() - 0.5), 100 * (Math.random() - 0.5)],
            rotate: piece.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: piece.delay,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
}

/**
 * Animated success checkmark with circle
 */
export function SuccessCheckmark({
  size = 96,
  color = '#22C55E',
  className,
  onAnimationComplete,
}: {
  size?: number;
  color?: string;
  className?: string;
  onAnimationComplete?: () => void;
}) {
  const { play } = useSound();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    play('success');
  }, [play]);

  if (reducedMotion) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-full", className)}
        style={{ width: size, height: size, backgroundColor: color }}
      >
        <Check className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={3} />
      </div>
    );
  }

  return (
    <motion.div 
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 260, 
        damping: 20,
        delay: 0.1,
      }}
      onAnimationComplete={onAnimationComplete}
    >
      {/* Circle background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      />

      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: `3px solid ${color}` }}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      />

      {/* Checkmark */}
      <svg
        viewBox="0 0 52 52"
        className="absolute inset-0 w-full h-full"
      >
        <motion.path
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27 L22 35 L38 19"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * Success celebration overlay - combines checkmark and confetti
 */
export default function SuccessCelebration({
  isVisible,
  title = "Success!",
  subtitle,
  onComplete,
  showConfetti = true,
  autoHide = true,
  hideDelay = 2500,
}: {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
  showConfetti?: boolean;
  autoHide?: boolean;
  hideDelay?: number;
}) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowContent(true);
      
      if (autoHide) {
        const timer = setTimeout(() => {
          setShowContent(false);
          setTimeout(() => onComplete?.(), 300);
        }, hideDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, autoHide, hideDelay, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {showConfetti && <Confetti count={60} duration={2500} />}
          
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-white/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {showContent && (
                <motion.div
                  className="flex flex-col items-center text-center px-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.1 }}
                >
                  <SuccessCheckmark size={120} className="mb-8" />
                  
                  <motion.h2
                    className="text-3xl md:text-4xl font-extrabold text-[#212282] mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {title}
                  </motion.h2>
                  
                  {subtitle && (
                    <motion.p
                      className="text-lg text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {subtitle}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Flying item animation - item flies to cart
 */
export function FlyToCart({
  isVisible,
  startPosition,
  children,
  onComplete,
}: {
  isVisible: boolean;
  startPosition: { x: number; y: number };
  children: React.ReactNode;
  onComplete?: () => void;
}) {
  const { play } = useSound();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (isVisible) {
      play('add');
    }
  }, [isVisible, play]);

  if (reducedMotion) {
    if (isVisible) {
      onComplete?.();
    }
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed pointer-events-none z-[100]"
          style={{
            left: startPosition.x,
            top: startPosition.y,
          }}
          initial={{ 
            scale: 1, 
            opacity: 1,
            x: 0,
            y: 0,
          }}
          animate={{ 
            scale: 0.3, 
            opacity: 0,
            x: window.innerWidth / 2 - startPosition.x,
            y: window.innerHeight - startPosition.y - 50,
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1],
          }}
          onAnimationComplete={onComplete}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

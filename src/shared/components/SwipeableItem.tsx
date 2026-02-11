import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
  deleteThreshold?: number;
}

export function SwipeableItem({
  children,
  onDelete,
  className,
  deleteThreshold = 100,
}: SwipeableItemProps) {
  const [dragX, setDragX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (info.offset.x < -deleteThreshold) {
        setIsDeleting(true);
        onDelete();
      } else {
        setDragX(0);
      }
    },
    [deleteThreshold, onDelete]
  );

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Only allow left swipe
    setDragX(Math.min(0, info.offset.x));
  }, []);

  if (isDeleting) {
    return (
      <motion.div
        initial={{ height: 'auto', opacity: 1 }}
        animate={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 w-24 bg-destructive flex items-center justify-center">
        <Trash2 className="w-6 h-6 text-white" />
      </div>

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        className="relative bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default SwipeableItem;

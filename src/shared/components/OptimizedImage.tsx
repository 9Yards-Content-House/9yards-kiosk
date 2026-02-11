import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ImageOff } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | 'auto';
  fallbackSrc?: string;
  showLoader?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio = '4/3',
  fallbackSrc = '/images/placeholder.jpg',
  showLoader = true,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
    onError?.();
  }, [fallbackSrc, imageSrc, onError]);

  const aspectRatioClass = {
    square: 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    auto: '',
  }[aspectRatio];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        containerClassName
      )}
    >
      <AnimatePresence>
        {isLoading && showLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-muted"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {hasError && !isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageOff className="w-8 h-8 text-muted-foreground" />
        </div>
      ) : (
        <motion.img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className={cn('w-full h-full object-cover', className)}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}

export default OptimizedImage;

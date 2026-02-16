import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';
import { Accessibility, ListOrdered } from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';
import AccessibilityPanel from '../components/AccessibilityPanel';
import { useAccessibility } from '../context/AccessibilityContext';

const BACKGROUND_IMAGES = [
  '/images/welcome/1.webp',
  '/images/welcome/2.webp',
  '/images/welcome/3.webp',
  '/images/welcome/4.webp',
  '/images/welcome/5.webp',
];

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAccessibilityMode } = useAccessibility();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Preload images
    BACKGROUND_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 10000); // Change image every 10 seconds
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartOrder = useCallback(() => {
    navigate('/menu');
  }, [navigate]);

  const handleTrackOrder = useCallback(() => {
    navigate('/lookup');
  }, [navigate]);

  const handleViewQueue = useCallback(() => {
    navigate('/queue');
  }, [navigate]);

  const formatDateTime = (date: Date) => {
    const day = date.toLocaleDateString('en-UG', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const time = date.toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { day, time };
  };

  const { day, time } = formatDateTime(currentTime);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t('welcome.greeting.morning');
    if (hour < 17) return t('welcome.greeting.afternoon');
    return t('welcome.greeting.evening');
  };

  return (
    <div className="kiosk-screen flex flex-col relative overflow-hidden">
      {/* Animated gradient background - Apple-style color shift */}
      {/* Dynamic Background Slideshow */}
      <div className="absolute inset-0 bg-black">
        <AnimatePresence>
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.0 }}
            animate={{ opacity: 0.6, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 1, ease: "easeInOut" },
              scale: { duration: 10, ease: "linear" }
            }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${BACKGROUND_IMAGES[currentImageIndex]})`,
              willChange: "transform, opacity",
            }}
          />
        </AnimatePresence>
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </div>

      {/* Top bar - Increased max padding for large screens */}
      <div className="relative z-10 flex items-center justify-between px-[clamp(1rem,4vw,3rem)] py-[clamp(0.75rem,2.5vh,2rem)]">
        <div className="text-white/70 leading-tight drop-shadow-md">
          <div className="text-[clamp(0.75rem,1.6vmin,1.25rem)] font-medium">{day}</div>
          <div className="text-[clamp(1.125rem,2.4vmin,2rem)] font-semibold text-white/90">{time}</div>
        </div>
        <div className="flex items-center gap-[clamp(0.125rem,0.5vw,0.75rem)]">
          <button
            onClick={() => setShowAccessibility(true)}
            aria-label="Accessibility settings"
            className={cn(
              "flex items-center justify-center rounded-xl transition-colors",
              "w-[clamp(2.5rem,5vmin,3rem)] h-[clamp(2.5rem,5vmin,3rem)]",
              "text-white/60 hover:bg-white/10 hover:text-white active:bg-white/15",
              isAccessibilityMode && "bg-white/15 text-white"
            )}
          >
            <Accessibility className="w-[clamp(1.125rem,2.2vmin,1.375rem)] h-[clamp(1.125rem,2.2vmin,1.375rem)]" />
          </button>
        </div>
      </div>

      {/* Accessibility Panel */}
      <AccessibilityPanel
        isOpen={showAccessibility}
        onClose={() => setShowAccessibility(false)}
      />

      {/* Main content — vertically centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-[clamp(1.5rem,6vw,3rem)]">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-[clamp(0.75rem,2.5vh,2rem)]"
        >
          <div className="w-[clamp(6rem,18vmin,16rem)] h-[clamp(6rem,18vmin,16rem)] rounded-full bg-white flex items-center justify-center shadow-elevated p-[clamp(0.5rem,1.5vmin,1.5rem)]">
            <img
              src="/images/logo/9Yards-Food-White-Logo-colored.png"
              alt="9Yards Food"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[clamp(2.5rem,7vmin,5.5rem)] font-extrabold text-white text-center mb-[clamp(0.25rem,1vh,1rem)] tracking-tight drop-shadow-lg"
        >
          {getGreeting()}
        </motion.h1>

        {/* Tagline - Scaled */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[clamp(1rem,3vmin,2rem)] text-white/90 text-center mb-[clamp(1.5rem,5vh,4rem)] max-w-[clamp(16rem,60vmin,40rem)] drop-shadow-md"
        >
          {t('welcome.subtitle')}
        </motion.p>

        {/* Buttons - Scaled */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-[clamp(0.75rem,2vh,1.5rem)] w-full max-w-[clamp(18rem,60vmin,32rem)]"
        >
          {/* Primary CTA */}
          <Button
            size="touch"
            onClick={handleStartOrder}
            className={cn(
              'w-full bg-secondary hover:bg-secondary/90 active:bg-secondary/80 text-white',
              'text-[clamp(1.25rem,4vmin,2.25rem)] font-bold',
              'py-[clamp(1rem,3.5vh,2.25rem)] rounded-2xl',
              'shadow-cta transition-all duration-150 active:scale-[0.98]',
              'animate-pulse-slow' // Custom pulse animation
            )}
          >
            {t('welcome.startOrder')}
          </Button>

          {/* Secondary CTA */}
          <Button
            variant="outline"
            size="touch"
            onClick={handleTrackOrder}
            className={cn(
              'w-full backdrop-blur-md bg-white/10 hover:bg-white/20 active:bg-white/25',
              'text-white/90 hover:text-white border border-white/25 hover:border-white/50',
              'text-[clamp(0.875rem,2.5vmin,1.5rem)] font-medium',
              'py-[clamp(0.75rem,2.5vh,1.5rem)] rounded-xl',
              'transition-all duration-150 active:scale-[0.98]'
            )}
          >
            {t('welcome.trackOrder')}
          </Button>
        </motion.div>
      </div>

      {/* Bottom status bar */}
      <div className="relative z-10 w-full px-[clamp(1.5rem,6vw,3rem)] pb-[clamp(1.5rem,4vh,2rem)]">
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewQueue}
            className={cn(
              'text-white/40 hover:text-white/80 hover:bg-white/5',
              'text-[clamp(0.875rem,2vmin,1.125rem)] font-medium rounded-full px-4 py-2',
              'transition-all duration-200'
            )}
          >
            <ListOrdered className="w-4 h-4 mr-2" />
            {t('welcome.viewQueue')}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';
import { UtensilsCrossed, Search, LayoutGrid, Globe, Accessibility } from 'lucide-react';
import { useTranslation, useLanguage } from '@shared/context/LanguageContext';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';
import AccessibilityPanel from '../components/AccessibilityPanel';
import { useAccessibility } from '../context/AccessibilityContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { isAccessibilityMode } = useAccessibility();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAccessibility, setShowAccessibility] = useState(false);

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

  const handleViewBoard = useCallback(() => {
    navigate('/track');
  }, [navigate]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'lg' : 'en');
  }, [language, setLanguage]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="kiosk-screen flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero" />
      
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5"
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top bar with time and language */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="text-white/80 text-lg font-medium">
          {formatTime(currentTime)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAccessibility(true)}
            className={cn(
              "text-white hover:bg-white/10",
              isAccessibilityMode && "bg-white/20"
            )}
          >
            <Accessibility className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-white hover:bg-white/10 gap-2"
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'Luganda' : 'English'}
          </Button>
        </div>
      </div>

      {/* Accessibility Panel */}
      <AccessibilityPanel 
        isOpen={showAccessibility} 
        onClose={() => setShowAccessibility(false)} 
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white flex items-center justify-center shadow-elevated p-4">
            <img
              src="/images/logo/9Yards-Food-White-Logo-colored.png"
              alt="9Yards Food"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white text-center mb-3 tracking-tight"
        >
          {t('welcome.title')}
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg md:text-xl text-white/80 text-center mb-12 max-w-md"
        >
          {t('welcome.subtitle')}
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-4 w-full max-w-md"
        >
          {/* Primary CTA - Start Order */}
          <Button
            size="touch"
            onClick={handleStartOrder}
            className={cn(
              'w-full bg-secondary hover:bg-secondary/90 text-white',
              'text-xl md:text-2xl font-bold py-6 md:py-8 rounded-2xl',
              'shadow-cta hover:shadow-elevated transition-all duration-300',
              'gap-3'
            )}
          >
            <UtensilsCrossed className="w-6 h-6 md:w-7 md:h-7" />
            {t('welcome.startOrder')}
          </Button>

          {/* Secondary CTAs */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              size="touch"
              onClick={handleTrackOrder}
              className={cn(
                'flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30',
                'text-base md:text-lg font-semibold py-4 md:py-5 rounded-xl',
                'gap-2'
              )}
            >
              <Search className="w-5 h-5" />
              {t('welcome.trackOrder')}
            </Button>

            <Button
              variant="outline"
              size="touch"
              onClick={handleViewBoard}
              className={cn(
                'flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30',
                'text-base md:text-lg font-semibold py-4 md:py-5 rounded-xl',
                'gap-2'
              )}
            >
              <LayoutGrid className="w-5 h-5" />
              {t('welcome.viewBoard')}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 text-center pb-6"
      >
        <p className="text-white/40 text-sm">
          {t('welcome.poweredBy')}
        </p>
      </motion.div>
    </div>
  );
}

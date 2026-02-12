import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';
import { Globe, Accessibility } from 'lucide-react';
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

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'lg' : 'en');
  }, [language, setLanguage]);

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
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero" />

      {/* Subtle background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/[0.03]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-[clamp(1rem,4vw,2.5rem)] py-[clamp(0.75rem,2.5vh,1.5rem)]">
        <div className="text-white/70 leading-tight">
          <div className="text-[clamp(0.75rem,1.6vw,1rem)] font-medium">{day}</div>
          <div className="text-[clamp(1.125rem,2.4vw,1.5rem)] font-semibold text-white/90">{time}</div>
        </div>
        <div className="flex items-center gap-[clamp(0.125rem,0.5vw,0.375rem)]">
          <button
            onClick={() => setShowAccessibility(true)}
            className={cn(
              "flex items-center justify-center rounded-xl transition-colors",
              "w-[clamp(2.5rem,5vmin,3rem)] h-[clamp(2.5rem,5vmin,3rem)]",
              "text-white/60 hover:bg-white/10 hover:text-white active:bg-white/15",
              isAccessibilityMode && "bg-white/15 text-white"
            )}
          >
            <Accessibility className="w-[clamp(1.125rem,2.2vmin,1.375rem)] h-[clamp(1.125rem,2.2vmin,1.375rem)]" />
          </button>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-[clamp(0.25rem,0.6vw,0.5rem)] rounded-xl px-[clamp(0.625rem,1.5vw,1rem)] h-[clamp(2.5rem,5vmin,3rem)] text-white/60 hover:bg-white/10 hover:text-white active:bg-white/15 transition-colors"
          >
            <Globe className="w-[clamp(0.875rem,1.8vmin,1.125rem)] h-[clamp(0.875rem,1.8vmin,1.125rem)]" />
            <span className="text-[clamp(0.8rem,1.6vw,1rem)] font-medium">
              {language === 'en' ? 'Luganda' : 'English'}
            </span>
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
          className="mb-[clamp(0.75rem,2.5vh,1.5rem)]"
        >
          <div className="w-[clamp(6rem,18vmin,11rem)] h-[clamp(6rem,18vmin,11rem)] rounded-full bg-white flex items-center justify-center shadow-elevated p-[clamp(0.5rem,1.5vmin,1rem)]">
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
          className="text-[clamp(2rem,6vmin,3.75rem)] font-extrabold text-white text-center mb-[clamp(0.25rem,1vh,0.75rem)] tracking-tight"
        >
          {getGreeting()}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[clamp(0.875rem,2.5vmin,1.25rem)] text-white/65 text-center mb-[clamp(1.5rem,5vh,3rem)] max-w-[28rem]"
        >
          {t('welcome.subtitle')}
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-[clamp(0.75rem,2vh,1.25rem)] w-full max-w-[clamp(18rem,50vmin,28rem)]"
        >
          {/* Primary CTA */}
          <Button
            size="touch"
            onClick={handleStartOrder}
            className={cn(
              'w-full bg-secondary hover:bg-secondary/90 active:bg-secondary/80 text-white',
              'text-[clamp(1.25rem,3.5vmin,1.875rem)] font-bold',
              'py-[clamp(1rem,3.5vh,1.75rem)] rounded-2xl',
              'shadow-cta transition-all duration-200'
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
              'w-full bg-white/5 hover:bg-white/10 active:bg-white/15',
              'text-white/55 hover:text-white/75 border-white/10',
              'text-[clamp(0.75rem,1.8vmin,1rem)] font-medium',
              'py-[clamp(0.625rem,2vh,1rem)] rounded-xl'
            )}
          >
            {t('welcome.trackOrder')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

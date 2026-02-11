import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@shared/context/LanguageContext';
import { cn } from '@shared/lib/utils';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ title: string; completed?: boolean }>;
  compact?: boolean;
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  steps,
  compact = false,
  className,
}: StepProgressProps) {
  const { t } = useTranslation();

  if (compact) {
    // Dot-style progress for mobile/tablet
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        {steps.map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.8 }}
            animate={{
              scale: index === currentStep ? 1.2 : 1,
              backgroundColor:
                index < currentStep
                  ? 'hsl(var(--primary))'
                  : index === currentStep
                  ? 'hsl(var(--secondary))'
                  : 'hsl(var(--muted))',
            }}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-300',
              index <= currentStep ? 'shadow-md' : ''
            )}
          />
        ))}
      </div>
    );
  }

  // Breadcrumb-style progress for larger screens
  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Step pill */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
              index < currentStep
                ? 'bg-primary text-primary-foreground'
                : index === currentStep
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                index < currentStep
                  ? 'bg-primary-foreground/20'
                  : index === currentStep
                  ? 'bg-secondary-foreground/20'
                  : 'bg-muted-foreground/20'
              )}
            >
              {index < currentStep ? '✓' : index + 1}
            </span>
            <span className="hidden lg:inline">{step.title}</span>
          </motion.div>

          {/* Connector line */}
          {index < totalSteps - 1 && (
            <div
              className={cn(
                'w-6 h-0.5 mx-1',
                index < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default StepProgress;

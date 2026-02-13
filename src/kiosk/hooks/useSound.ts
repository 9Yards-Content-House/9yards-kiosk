import { useCallback, useRef, useEffect } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

// Sound types for different interactions
export type SoundType = 
  | 'tap'        // General tap/click
  | 'select'     // Item selection
  | 'add'        // Add to cart
  | 'remove'     // Remove item
  | 'success'    // Order success
  | 'error'      // Error occurred
  | 'notify'     // Notification
  | 'slide'      // Page transition
  | 'pop';       // Pop/bounce effect

// Web Audio API-based sound generation for instant, lightweight feedback
// No audio files needed - generates sounds programmatically
const SOUND_CONFIGS: Record<SoundType, () => void> = {
  tap: () => playTone(800, 0.05, 'sine', 0.15),
  select: () => {
    playTone(600, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(900, 0.08, 'sine', 0.1), 50);
  },
  add: () => {
    playTone(523, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 160);
  },
  remove: () => {
    playTone(400, 0.1, 'triangle', 0.1);
    setTimeout(() => playTone(300, 0.15, 'triangle', 0.08), 100);
  },
  success: () => {
    playTone(523, 0.15, 'sine', 0.2);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.18), 120);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.15), 240);
    setTimeout(() => playTone(1047, 0.25, 'sine', 0.12), 360);
  },
  error: () => {
    playTone(200, 0.15, 'sawtooth', 0.15);
    setTimeout(() => playTone(180, 0.2, 'sawtooth', 0.12), 150);
  },
  notify: () => {
    playTone(880, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.1), 100);
  },
  slide: () => playTone(300, 0.03, 'sine', 0.05),
  pop: () => {
    playTone(600, 0.05, 'sine', 0.2);
    setTimeout(() => playTone(800, 0.08, 'sine', 0.15), 30);
  },
};

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  
  // Resume if suspended (required for user gesture policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  return audioContext;
}

/**
 * Play a simple tone using Web Audio API
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.1
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Fade in/out for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail - sound is not critical
  }
}

/**
 * Hook for playing sound feedback in the kiosk
 */
export function useSound() {
  const { soundEnabled } = useAccessibility();
  const hasInteractedRef = useRef(false);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        getAudioContext(); // Initialize
      }
    };

    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, []);

  const play = useCallback((type: SoundType) => {
    if (!soundEnabled) return;
    
    // Ensure audio context is ready
    const ctx = getAudioContext();
    if (!ctx) return;

    // Play the sound
    try {
      SOUND_CONFIGS[type]();
    } catch {
      // Silently fail
    }
  }, [soundEnabled]);

  return { play };
}

/**
 * Play sound imperatively (for use outside React components)
 */
export function playSound(type: SoundType, enabled: boolean = true): void {
  if (!enabled) return;
  
  try {
    SOUND_CONFIGS[type]();
  } catch {
    // Silently fail
  }
}

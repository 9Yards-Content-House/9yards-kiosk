import { useCallback, useRef } from "react";

const SOUND_URL = "/sounds/new-order.mp3";

/**
 * Plays an alert sound when a new order arrives.
 * Must be called after a user gesture (browser autoplay policy).
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(SOUND_URL);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked — ignored
      });
    } catch {
      // Audio not available
    }
  }, []);

  return { play };
}

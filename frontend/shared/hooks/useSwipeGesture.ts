import { useRef, useCallback, TouchEvent } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeOptions {
  /** Minimum horizontal distance in px to register as a swipe (default: 50) */
  threshold?: number;
  /** Maximum vertical drift allowed in px (default: 100) */
  maxVerticalDrift?: number;
}

/**
 * Lightweight swipe gesture hook for touch navigation.
 * Returns onTouchStart / onTouchEnd handlers to attach to any element.
 *
 * Usage:
 *   const swipe = useSwipeGesture({ onSwipeLeft: nextCard, onSwipeRight: prevCard });
 *   <div {...swipe}>...</div>
 */
export function useSwipeGesture(
  handlers: SwipeHandlers,
  options?: SwipeOptions,
) {
  const threshold = options?.threshold ?? 50;
  const maxVerticalDrift = options?.maxVerticalDrift ?? 100;

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);

      touchStart.current = null;

      // Ignore if vertical drift is too large (user was scrolling)
      if (dy > maxVerticalDrift) return;

      if (dx < -threshold && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      } else if (dx > threshold && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      }
    },
    [handlers, threshold, maxVerticalDrift],
  );

  return { onTouchStart, onTouchEnd };
}

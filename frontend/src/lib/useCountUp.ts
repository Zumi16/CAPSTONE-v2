import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 up to `target`, but only once the element scrolls
 * into view. This is the React version of the old `glance.js` counter.
 *
 * Usage:
 *   const { ref, value } = useCountUp(2052);
 *   return <div ref={ref}>{value.toLocaleString()}</div>;
 */
export function useCountUp(target: number, durationMs = 2000) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            runCount();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(element);

    function runCount() {
      const steps = 100;
      const increment = target / steps;
      const stepDelay = durationMs / steps;
      let current = 0;

      const tick = () => {
        current += increment;
        if (current < target) {
          setValue(Math.floor(current));
          window.setTimeout(tick, stepDelay);
        } else {
          setValue(target);
        }
      };
      tick();
    }

    return () => observer.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}

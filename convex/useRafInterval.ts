import { useEffect, useRef } from "react";

/**
 * useRafInterval - runs a callback at a given interval using requestAnimationFrame.
 * This keeps the callback in sync with the browser's refresh rate and avoids
 * timer clamping issues on background tabs.
 *
 * @param callback Function to run at each interval.
 * @param delay Interval in milliseconds.
 * @param active If false, the interval is paused.
 */
export function useRafInterval(
  callback: () => void,
  delay: number,
  active: boolean = true,
) {
  const frame = useRef<number | undefined>(undefined);
  const start = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;

    const tick = (time: number) => {
      if (start.current === undefined) {
        start.current = time;
      }

      const elapsed = time - start.current;
      if (elapsed >= delay) {
        callback();
        start.current = time;
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      start.current = undefined;
    };
  }, [callback, delay, active]);
}
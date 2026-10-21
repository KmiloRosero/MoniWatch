import { useEffect, useState } from 'react';

const TICK_MS = 1_000;
const SECONDS_PER_MINUTE = 60;

/** Remaining time as "m:ss", updated every second. */
export function useCountdown(deadline: number | null): { label: string; isOver: boolean } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  const remainingSeconds = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / TICK_MS));
  const minutes = Math.floor(remainingSeconds / SECONDS_PER_MINUTE);
  const seconds = (remainingSeconds % SECONDS_PER_MINUTE).toString().padStart(2, '0');

  return { label: `${minutes}:${seconds}`, isOver: deadline !== null && remainingSeconds === 0 };
}

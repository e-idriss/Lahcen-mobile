/**
 * A clock that ticks once per minute, aligned to the minute boundary.
 *
 * Prayer countdowns are displayed as `HH:MM`, so a per-second tick re-ran the
 * full astronomical calculation (two `PrayerTimes` constructions, plus the
 * whole result object) sixty times for every visible change.
 *
 * Aligning to the boundary also keeps the displayed minute honest: a plain
 * 60s interval started at :59 would flip the value a second late and drift
 * further with every tick.
 */

import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;

/**
 * Milliseconds from `nowMs` until the next wall-clock minute boundary.
 *
 * Always in (0, 60000]: exactly on a boundary this returns a full minute
 * rather than 0, so the timer never fires in a tight loop.
 */
export function msUntilNextMinute(nowMs: number): number {
  return MINUTE_MS - (nowMs % MINUTE_MS);
}

export function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), MINUTE_MS);
    }, msUntilNextMinute(Date.now()));

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, []);

  return now;
}

/**
 * The minute tick drives both prayer countdowns.
 *
 * The property that matters is alignment to the wall-clock minute boundary: a
 * plain 60s interval started at :20 would flip the displayed minute 20 seconds
 * late, and every subsequent tick inherits that offset.
 */

import { msUntilNextMinute } from '../useMinuteTick';

const at = (minute: number, second: number, ms = 0): number =>
  new Date(2026, 0, 1, 10, minute, second, ms).getTime();

describe('msUntilNextMinute', () => {
  it('waits only the remainder of the current minute', () => {
    expect(msUntilNextMinute(at(0, 20))).toBe(40_000);
    expect(msUntilNextMinute(at(0, 59))).toBe(1_000);
    expect(msUntilNextMinute(at(0, 0, 500))).toBe(59_500);
  });

  it('returns a full minute exactly on a boundary, never zero', () => {
    // A 0 here would schedule a zero-delay timer that reschedules immediately.
    expect(msUntilNextMinute(at(0, 0))).toBe(60_000);
  });

  it('always lands strictly within one minute', () => {
    for (let second = 0; second < 60; second++) {
      const wait = msUntilNextMinute(at(3, second));
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(60_000);
    }
  });

  it('lands exactly on the boundary when added to the current time', () => {
    for (let second = 0; second < 60; second++) {
      const nowMs = at(7, second);
      expect((nowMs + msUntilNextMinute(nowMs)) % 60_000).toBe(0);
    }
  });
});

export type RollingWindowResult = {
  allowed: boolean;
  events: number[];
  retryAfterSeconds: number;
};

export function secondsUntil(deadline: number, now = Date.now()) {
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}

export function parseStoredDeadline(value: string | null, now = Date.now()) {
  if (!value) return 0;
  const deadline = Number(value);
  return Number.isFinite(deadline) && deadline > now ? deadline : 0;
}

export function formatShortCountdown(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function consumeRollingWindow(events: number[], now: number, limit: number, windowMs: number): RollingWindowResult {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Rate limit must be a positive integer.");
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("Rate-limit window must be positive.");
  const activeEvents = events
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > now - windowMs && timestamp <= now)
    .sort((a, b) => a - b);
  if (activeEvents.length >= limit) {
    return {
      allowed: false,
      events: activeEvents,
      retryAfterSeconds: Math.max(1, Math.ceil((activeEvents[0] + windowMs - now) / 1_000)),
    };
  }
  return { allowed: true, events: [...activeEvents, now], retryAfterSeconds: 0 };
}

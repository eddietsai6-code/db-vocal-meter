export const DEFAULT_DB_FLOOR = -100;
export const DEFAULT_DISPLAY_OFFSET = 85;
export const DEFAULT_DISPLAY_MIN = 0;
export const DEFAULT_DISPLAY_MAX = 100;
export const DEFAULT_QUIET_THRESHOLD = 40;

export function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function getRms(buffer) {
  if (!buffer.length) {
    return 0;
  }

  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index] * buffer[index];
  }

  return Math.sqrt(sum / buffer.length);
}

export function decibelsFromRms(rms, floor = DEFAULT_DB_FLOOR) {
  if (!Number.isFinite(rms) || rms <= 0) {
    return floor;
  }
  return Math.max(floor, Math.round(20 * Math.log10(rms)));
}

export function displayDbFromRms(
  rms,
  {
    offset = DEFAULT_DISPLAY_OFFSET,
    min = DEFAULT_DISPLAY_MIN,
    max = DEFAULT_DISPLAY_MAX,
  } = {}
) {
  return clamp(decibelsFromRms(rms) + offset, min, max);
}

export function smoothValue(previous, next, amount = 0.35) {
  if (!Number.isFinite(previous)) {
    return next;
  }

  const smoothing = clamp(amount, 0, 0.95);
  return Math.round(previous + (next - previous) * smoothing);
}

export function shouldTrackDb(value, threshold = DEFAULT_QUIET_THRESHOLD) {
  return Number.isFinite(value) && value >= threshold;
}

export function createSessionStats() {
  return {
    count: 0,
    min: null,
    max: null,
    mean: null,
    sum: 0,
  };
}

export function updateSessionStats(stats, value) {
  const count = stats.count + 1;
  const sum = stats.sum + value;

  return {
    count,
    min: stats.min === null ? value : Math.min(stats.min, value),
    max: stats.max === null ? value : Math.max(stats.max, value),
    mean: Math.round(sum / count),
    sum,
  };
}

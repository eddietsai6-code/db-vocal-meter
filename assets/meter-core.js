export const DEFAULT_DB_FLOOR = -100;
export const DEFAULT_DISPLAY_OFFSET = 90;
export const DEFAULT_DISPLAY_MIN = 0;
export const DEFAULT_DISPLAY_MAX = 120;
export const DEFAULT_OFFSET_MIN = 20;
export const DEFAULT_OFFSET_MAX = 140;
export const DEFAULT_QUIET_THRESHOLD = 40;
export const DEFAULT_DISPLAY_RESPONSE = 0.12;
export const DEFAULT_DISPLAY_DEADBAND = 2;
export const REFERENCE_PRESETS = Object.freeze([
  Object.freeze({
    id: "normal-conversation",
    label: "Normal conversation",
    db: 65,
  }),
  Object.freeze({
    id: "clear-vocal",
    label: "Clear vocal",
    db: 75,
  }),
  Object.freeze({
    id: "strong-vocal",
    label: "Strong vocal",
    db: 85,
  }),
]);

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

export function calibrationOffsetFromReference(
  rms,
  referenceDb,
  {
    min = DEFAULT_OFFSET_MIN,
    max = DEFAULT_OFFSET_MAX,
    fallback = DEFAULT_DISPLAY_OFFSET,
  } = {}
) {
  if (!Number.isFinite(rms) || rms <= 0 || !Number.isFinite(referenceDb)) {
    return fallback;
  }

  return clamp(Math.round(referenceDb - decibelsFromRms(rms)), min, max);
}

export function isCalibratedSettings(settings) {
  return Boolean(
    settings &&
      settings.calibrated === true &&
      Number.isFinite(settings.offset)
  );
}

export function referencePresetById(id) {
  return REFERENCE_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function smoothValue(previous, next, amount = 0.35) {
  if (!Number.isFinite(previous)) {
    return next;
  }

  const smoothing = clamp(amount, 0, 0.95);
  return Math.round(previous + (next - previous) * smoothing);
}

export function smoothDisplayDb(
  previous,
  next,
  {
    response = DEFAULT_DISPLAY_RESPONSE,
    deadband = DEFAULT_DISPLAY_DEADBAND,
  } = {}
) {
  if (!Number.isFinite(previous)) {
    return Math.round(next);
  }

  const roundedPrevious = Math.round(previous);
  const roundedNext = Math.round(next);
  if (Math.abs(roundedNext - roundedPrevious) <= deadband) {
    return roundedPrevious;
  }

  const amount = clamp(response, 0.04, 0.5);
  return Math.round(previous + (next - previous) * amount);
}

export function median(values) {
  const finiteValues = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (!finiteValues.length) {
    return 0;
  }

  const middle = Math.floor(finiteValues.length / 2);
  if (finiteValues.length % 2) {
    return finiteValues[middle];
  }

  return (finiteValues[middle - 1] + finiteValues[middle]) / 2;
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

import {
  DEFAULT_DISPLAY_OFFSET,
  DEFAULT_DISPLAY_RESPONSE,
  DEFAULT_OFFSET_MAX,
  DEFAULT_OFFSET_MIN,
  DEFAULT_QUIET_THRESHOLD,
  calibrationOffsetFromReference,
  clamp,
  createSessionStats,
  displayDbFromRms,
  getRms,
  isCalibratedSettings,
  median,
  referencePresetById,
  shouldTrackDb,
  smoothDisplayDb,
  updateSessionStats,
} from "./meter-core.js";

const STORAGE_KEY = "db-vocal-meter-settings-v4";
const DISPLAY_INTERVAL_MS = 400;
const DEFAULT_SETTINGS = {
  offset: DEFAULT_DISPLAY_OFFSET,
  smoothing: DEFAULT_DISPLAY_RESPONSE,
  referenceDb: 65,
  referencePreset: "normal-conversation",
  calibrated: false,
  calibrationSource: "web",
};

const currentValue = document.querySelector("#currentValue");
const minValue = document.querySelector("#minValue");
const meanValue = document.querySelector("#meanValue");
const maxValue = document.querySelector("#maxValue");
const resetButton = document.querySelector("#resetButton");
const micButton = document.querySelector("#micButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsDialog = document.querySelector("#settingsDialog");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const offsetInput = document.querySelector("#offsetInput");
const smoothingInput = document.querySelector("#smoothingInput");
const referencePresetInput = document.querySelector("#referencePresetInput");
const referenceInput = document.querySelector("#referenceInput");
const calibrateButton = document.querySelector("#calibrateButton");
const statusText = document.querySelector("#statusText");

let audioContext = null;
let analyser = null;
let stream = null;
let animationFrame = null;
let timeBuffer = null;
let smoothedDb = null;
let rmsWindow = [];
let lastDisplayAt = 0;
let latestCalibrationRms = 0;
let stats = createSessionStats();
let settings = loadSettings();

function loadSettings() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      offset: clamp(Number(parsed.offset), DEFAULT_OFFSET_MIN, DEFAULT_OFFSET_MAX),
      smoothing: clamp(Number(parsed.smoothing), 0.06, 0.3),
      referenceDb: clamp(Number(parsed.referenceDb), 20, 120),
      referencePreset: parsed.referencePreset === "custom" ||
        referencePresetById(parsed.referencePreset)
        ? parsed.referencePreset
        : DEFAULT_SETTINGS.referencePreset,
      calibrated: parsed.calibrated === true && Number.isFinite(Number(parsed.offset)),
      calibrationSource: parsed.calibrationSource === "meter" ? "meter" : "web",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function syncSettingsInputs() {
  offsetInput.value = String(settings.offset);
  smoothingInput.value = String(settings.smoothing);
  referencePresetInput.value = settings.referencePreset;
  referenceInput.value = String(settings.referenceDb);
}

function formatDb(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : "--";
}

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.classList.toggle("error", isError);
}

function renderStats() {
  minValue.textContent = formatDb(stats.min);
  meanValue.textContent = formatDb(stats.mean);
  maxValue.textContent = formatDb(stats.max);
}

function inactiveStatus() {
  if (!isCalibratedSettings(settings)) {
    return "CALIBRATE";
  }
  return settings.calibrationSource === "web" ? "REFERENCE" : "READY";
}

function activeStatus() {
  return isCalibratedSettings(settings) ? "LISTENING" : "MATCH METER";
}

function resetSession() {
  stats = createSessionStats();
  renderStats();
  setStatus(audioContext ? activeStatus() : inactiveStatus());
}

function updateCurrent(value) {
  currentValue.textContent = formatDb(value);
}

function updateMicButton(active) {
  micButton.setAttribute("aria-pressed", active ? "true" : "false");
  micButton.setAttribute(
    "aria-label",
    active ? "Stop microphone" : "Start microphone"
  );
}

function tick() {
  if (!analyser || !timeBuffer) {
    return;
  }

  analyser.getFloatTimeDomainData(timeBuffer);
  rmsWindow.push(getRms(timeBuffer));
  const now = performance.now();

  if (now - lastDisplayAt < DISPLAY_INTERVAL_MS) {
    animationFrame = window.requestAnimationFrame(tick);
    return;
  }

  const rms = median(rmsWindow);
  rmsWindow = [];
  lastDisplayAt = now;
  latestCalibrationRms = rms;

  if (!isCalibratedSettings(settings)) {
    updateCurrent(null);
    animationFrame = window.requestAnimationFrame(tick);
    return;
  }

  const nextDb = displayDbFromRms(rms, { offset: settings.offset });
  smoothedDb = smoothDisplayDb(smoothedDb, nextDb, {
    response: settings.smoothing,
  });
  updateCurrent(smoothedDb);

  if (shouldTrackDb(smoothedDb, DEFAULT_QUIET_THRESHOLD)) {
    stats = updateSessionStats(stats, smoothedDb);
    renderStats();
  }

  animationFrame = window.requestAnimationFrame(tick);
}

async function startListening() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("MIC API UNAVAILABLE", true);
    return;
  }

  micButton.disabled = true;
  setStatus("STARTING");

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.04;
    timeBuffer = new Float32Array(analyser.fftSize);

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    micButton.disabled = false;
    rmsWindow = [];
    lastDisplayAt = 0;
    latestCalibrationRms = 0;
    updateMicButton(true);
    setStatus(activeStatus());
    animationFrame = window.requestAnimationFrame(tick);
  } catch (error) {
    stopListening();
    micButton.disabled = false;
    setStatus(error?.name === "NotAllowedError" ? "MIC DENIED" : "MIC ERROR", true);
  }
}

function stopListening() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  analyser = null;
  timeBuffer = null;
  smoothedDb = null;
  rmsWindow = [];
  lastDisplayAt = 0;
  latestCalibrationRms = 0;
  micButton.disabled = false;
  updateMicButton(false);
  setStatus(inactiveStatus());
}

function openSettings() {
  syncSettingsInputs();
  if (typeof settingsDialog.showModal === "function") {
    settingsDialog.showModal();
    return;
  }
  settingsDialog.setAttribute("open", "");
}

function closeSettings() {
  settingsDialog.close();
}

function calibrateToReference() {
  const referenceDb = clamp(Number(referenceInput.value), 20, 120);
  settings = {
    ...settings,
    referenceDb,
  };

  if (!Number.isFinite(latestCalibrationRms) || latestCalibrationRms <= 0) {
    syncSettingsInputs();
    saveSettings();
    setStatus(audioContext ? "SING LOUDER" : "START MIC", true);
    return;
  }

  settings = {
    ...settings,
    offset: calibrationOffsetFromReference(latestCalibrationRms, referenceDb),
    calibrated: true,
    calibrationSource: settings.referencePreset === "custom" ? "meter" : "web",
  };
  smoothedDb = referenceDb;
  updateCurrent(referenceDb);
  syncSettingsInputs();
  saveSettings();
  setStatus("CALIBRATED");
}

resetButton.addEventListener("click", resetSession);

micButton.addEventListener("click", () => {
  if (audioContext) {
    stopListening();
    return;
  }
  startListening();
});

settingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);

referencePresetInput.addEventListener("change", () => {
  const preset = referencePresetById(referencePresetInput.value);
  settings = {
    ...settings,
    referencePreset: referencePresetInput.value,
    ...(preset ? { referenceDb: preset.db, calibrationSource: "web" } : {}),
  };
  syncSettingsInputs();
  saveSettings();
});

offsetInput.addEventListener("change", () => {
  settings = {
    ...settings,
    offset: clamp(Number(offsetInput.value), DEFAULT_OFFSET_MIN, DEFAULT_OFFSET_MAX),
    calibrated: true,
    calibrationSource: "meter",
  };
  syncSettingsInputs();
  saveSettings();
  setStatus(audioContext ? activeStatus() : inactiveStatus());
});

smoothingInput.addEventListener("input", () => {
  settings = {
    ...settings,
    smoothing: clamp(Number(smoothingInput.value), 0.06, 0.3),
  };
  saveSettings();
});

referenceInput.addEventListener("change", () => {
  settings = {
    ...settings,
    referenceDb: clamp(Number(referenceInput.value), 20, 120),
    referencePreset: "custom",
    calibrationSource: "meter",
  };
  syncSettingsInputs();
  saveSettings();
});

calibrateButton.addEventListener("click", calibrateToReference);

syncSettingsInputs();
renderStats();
updateCurrent(null);
updateMicButton(false);
setStatus(inactiveStatus());

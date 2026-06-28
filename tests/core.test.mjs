import test from "node:test";
import assert from "node:assert/strict";

import {
  clamp,
  createSessionStats,
  calibrationOffsetFromReference,
  decibelsFromRms,
  displayDbFromRms,
  getRms,
  median,
  shouldTrackDb,
  smoothDisplayDb,
  smoothValue,
  updateSessionStats,
} from "../assets/meter-core.js";

test("getRms returns the root mean square for a signal buffer", () => {
  const buffer = new Float32Array([1, -1, 1, -1]);

  assert.equal(getRms(buffer), 1);
});

test("getRms returns 0 for an empty buffer", () => {
  assert.equal(getRms(new Float32Array()), 0);
});

test("decibelsFromRms converts full-scale and half-scale amplitudes", () => {
  assert.equal(decibelsFromRms(1), 0);
  assert.equal(decibelsFromRms(0.5), -6);
});

test("decibelsFromRms clamps silence to the configured floor", () => {
  assert.equal(decibelsFromRms(0), -100);
  assert.equal(decibelsFromRms(Number.NaN), -100);
});

test("displayDbFromRms maps dBFS-style input into a practical display range", () => {
  assert.equal(displayDbFromRms(0.1, { offset: 85 }), 65);
  assert.equal(displayDbFromRms(10, { offset: 85 }), 105);
});

test("displayDbFromRms defaults closer to a normal vocal practice range", () => {
  assert.equal(displayDbFromRms(0.03162277660168379), 60);
});

test("calibrationOffsetFromReference matches an external meter reading", () => {
  const rms = 0.03162277660168379;
  const offset = calibrationOffsetFromReference(rms, 72);

  assert.equal(offset, 102);
  assert.equal(displayDbFromRms(rms, { offset }), 72);
});

test("calibrationOffsetFromReference clamps unsafe calibration results", () => {
  assert.equal(calibrationOffsetFromReference(0, 72), 90);
  assert.equal(calibrationOffsetFromReference(1, 190), 140);
  assert.equal(calibrationOffsetFromReference(1, -20), 20);
});

test("smoothValue blends previous and next readings", () => {
  assert.equal(smoothValue(null, 60, 0.4), 60);
  assert.equal(smoothValue(50, 60, 0.4), 54);
});

test("smoothDisplayDb holds small changes inside the display deadband", () => {
  assert.equal(smoothDisplayDb(60, 61), 60);
  assert.equal(smoothDisplayDb(60, 58), 60);
});

test("smoothDisplayDb follows larger changes slowly enough for singing practice", () => {
  assert.equal(smoothDisplayDb(60, 75, { response: 0.12, deadband: 2 }), 62);
  assert.equal(smoothDisplayDb(75, 60, { response: 0.12, deadband: 2 }), 73);
});

test("median resists single-frame input spikes", () => {
  assert.equal(median([0.01, 0.011, 0.8, 0.012, 0.013]), 0.012);
});

test("median averages the middle pair for even sample windows", () => {
  assert.equal(median([4, 1, 2, 100]), 3);
});

test("shouldTrackDb ignores readings below the quiet threshold", () => {
  assert.equal(shouldTrackDb(39.9, 40), false);
  assert.equal(shouldTrackDb(40, 40), true);
});

test("updateSessionStats tracks min mean and max for the practice session", () => {
  let stats = createSessionStats();
  stats = updateSessionStats(stats, 50);
  stats = updateSessionStats(stats, 70);
  stats = updateSessionStats(stats, 60);

  assert.deepEqual(stats, {
    count: 3,
    min: 50,
    max: 70,
    mean: 60,
    sum: 180,
  });
});

test("clamp keeps values inside an inclusive range", () => {
  assert.equal(clamp(4, 10, 90), 10);
  assert.equal(clamp(94, 10, 90), 90);
  assert.equal(clamp(40, 10, 90), 40);
});

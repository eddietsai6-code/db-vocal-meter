# DB Vocal Meter

A minimal browser dB meter for checking a cappella vocal volume while practicing. It is designed for a quick glance: one large current loudness reading, `min / mean / max` for the current practice session, and three bottom controls.

## Features

- Phone-first black-and-white interface
- Current approximate dB readout
- Current-session `min`, `mean`, and `max`
- Start/stop microphone control
- Reset button for a fresh practice pass
- Compact settings for calibration offset and smoothing
- No runtime dependencies, backend, CDN, or account required

## Quick Start

Serve the project from localhost so the browser can request microphone access:

```powershell
npm run serve
```

Then open:

```text
http://127.0.0.1:4190/
```

Tap the microphone button and allow microphone access.

## Tests

```powershell
npm test
```

The test suite covers RMS calculation, dB conversion, smoothing, quiet-input rejection, value clamping, and `min / mean / max` aggregation.

## Reading Accuracy

This app is for vocal-practice reference, not certified sound level measurement. Browser microphones and device audio pipelines vary widely, so readings are approximate unless you calibrate them against a known sound level meter.

The default display maps browser input level into a practical singing-practice range. Use the settings panel's calibration offset if you want to align the displayed number with another meter.

## Project Structure

```text
db-vocal-meter/
  index.html
  assets/
    app.js
    meter-core.js
    styles.css
  tests/
    core.test.mjs
```

## License

MIT

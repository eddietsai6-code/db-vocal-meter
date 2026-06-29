# DB Vocal Meter

A minimal browser dB SPL meter for checking a cappella vocal volume while practicing. It is designed for a quick glance after calibration: one large current loudness reading, `min / mean / max` for the current practice session, and three bottom controls.

## Features

- Phone-first black-and-white interface
- Calibrated dB SPL readout
- Current-session `min`, `mean`, and `max`
- Start/stop microphone control
- Reset button for a fresh practice pass
- Compact settings for web-reference matching, external meter matching, calibration offset, and smoothing
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

Tap the microphone button and allow microphone access. The app shows `--` until you match it against a web reference or an external meter.

## Tests

```powershell
npm test
```

The test suite covers RMS calculation, dB conversion, smoothing, quiet-input rejection, value clamping, and `min / mean / max` aggregation.

## Reading Accuracy

This app follows the dB SPL conversion model only after calibration. Browser microphone samples are normalized digital audio, not Pascals, so an uncalibrated browser cannot produce an objective sound-pressure number.

To make the reading objective for your device, start the microphone, make a steady sound, choose a `Web reference` or enter an external meter value in `Reference dB`, then press `Match`. After that, the saved offset maps the measured RMS signal to the same dB SPL scale as the chosen reference.

The built-in web references are practical anchors for users without a sound level meter. `Normal talk 65 dB` is based on the NIH/NIDCD average sound-level range for normal conversation. The vocal presets are practice anchors around common voice-effort steps; they are useful for relative singing practice, but an external meter remains the better calibration source.

Sources:

- [NIH/NIDCD](https://www.nidcd.nih.gov/health/noise-induced-hearing-loss): normal conversation is commonly listed around 60-70 dBA.
- [CDC/NIOSH Sound Level Meter App](https://www.cdc.gov/niosh/noise/about/app.html): device calibration matters, and microphone/device differences affect accuracy.
- [Research on singing/voice levels](https://ar5iv.labs.arxiv.org/html/2204.04006): recordings need calibration because the recorded power to physical voice level depends on recording conditions.

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

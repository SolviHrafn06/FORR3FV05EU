# Hologram demo performance and bug fixes — 2026-11-26

## Goal and project

Reduce hand-tracking delay, review all demo source files, fix verified interaction and lifecycle bugs, and simplify obstructive UI. The user authorized removing unnecessary complexity. Preserve the original hologram identity and existing uncommitted work. No paid services, account changes, or extra dependencies.

Project: `C:\Users\solvi\OneDrive\Documents\FORR3FV05EU\.claude\worktrees\graphify-8951d4\æfingar fyrir öll verkefni\Gesture recognition\test 1 - ai hjálp`

## Current state

Changes are applied locally and are not committed. Pre-existing edits and backups were retained. Additional dated backups are under `work/backup-*`; the initial snapshot is `work/backup-20261126-012730`.

The main bottleneck was competition between unrestricted 3D drawing and inference, compounded by gesture confirmation counted in slow tracking frames and multiple smoothing stages. CPU performed reasonably on empty frames but poorly with a recognized hand, so the final default is GPU with CPU fallback inside the worker.

## Files changed

- `script.js`: camera-frame-driven tracking with one outstanding frame; immediate processing of the latest frame when the worker finishes; 60 fps rendering budget and 720p internal postprocessing budget; removal of main-thread inference and obsolete injection hook; faster smoothing and rotation recovery; real delivered-camera/tracking/latency counters; worker errors/timeouts, stale-hand cleanup, camera/page lifecycle cleanup; reset and pointer/wheel/keyboard fixes; portrait framing; environment resource cleanup.
- `greinir-worker.js`: GPU-first initialization with CPU fallback, model warm-up before reporting ready, frame disposal and explicit error reporting.
- `hond.js`, `hond.test.mjs`: elapsed-time gesture confirmation, faster filtering with jitter and response tests, globally consistent hand matching with regression tests.
- `hlutir.js`: dispose deleted geometry/materials/textures, handle late model loads after deletion, preserve x-ray state across asynchronous model loading.
- `agnir.js`: stop drawing the particle pool when all particles have expired.
- `bendingar.js`, `kerfi.test.mjs`: accept only explicitly defined gesture commands and test the guard.
- `index.html`, `style.css`: collapsible keyboard-accessible instructions, measured tracking counters, status announcements, readable text and corrected hover contrast; retain the established colors and hologram presentation.
- New `browser.test.cjs`, `tracking.test.cjs`, `performance.test.cjs`: repeatable Playwright CLI checks.

## Verification

Passed `node hond.test.mjs`, `node kerfi.test.mjs`, syntax checks for all changed JS/test scripts, and `git diff --check` (only Git's existing LF/CRLF informational warnings).

Browser checks use an isolated Microsoft Edge session. They cover dragging/throwing, resizing and wheel targeting, x-ray, reset while held, keyboard after button focus, disposal and idle particles, collapsible help, portrait object visibility, 320/390/1920 px layouts, reduced CSS motion, worker startup/runtime failure, stalled worker timeout, and camera/worker restoration after page-cache lifecycle events.

Synthetic landmark checks deliberately impose 100 ms tracking frames. Grab, movement, release, a large wrist rotation, shrink, quick bunch-to-spread enlargement, and lost-hand cleanup pass. A representative run measured grab at 220 ms and release at 112 ms including the injected delay and polling.

The final real-model test uses Google's public `thumbs_up.jpg` painted into a 30 fps video stream. It runs the production worker and recognizes `Thumb_Up`; it is not a webcam-motion test. Three samples, five seconds apart, reported:

```
60 fps · rakning 29 ms (GPU, worker) · 1 hendur · 4 hlutir
60 fps · rakning 34 ms (GPU, worker) · 1 hendur · 4 hlutir
60 fps · rakning 31 ms (GPU, worker) · 1 hendur · 4 hlutir
```

Delivered video and completed inference were approximately 29–31 frames/s; capture-to-applied-result latency was approximately 31–38 ms. No page errors. Earlier, with the same hand-image fixture before render scheduling was changed, GPU inference was 70–84 ms and approximately 11–13 results/s; CPU inference was 124–136 ms. Direct full-resolution VideoFrame transfer made performance worse and was removed.

## Reproduce

Keep the existing server running on localhost:5500. From the project directory:

```powershell
node hond.test.mjs
node kerfi.test.mjs
playwright-cli -s=hologram open --browser=msedge 'http://localhost:5500/%C3%A6fingar%20fyrir%20%C3%B6ll%20verkefni/Gesture%20recognition/test%201%20-%20ai%20hj%C3%A1lp/index.html'
playwright-cli -s=hologram --raw run-code --filename=browser.test.cjs
playwright-cli -s=hologram --raw run-code --filename=tracking.test.cjs
playwright-cli -s=hologram --raw run-code --filename=performance.test.cjs
playwright-cli -s=hologram close
```

The browser tests mock camera input only within their own temporary pages. The performance test downloads a public Google test photo; all inference runs locally. It reports timings rather than asserting hardware-specific speed thresholds.

## Limits and next step

The isolated browser received `Device in use` from the physical webcam. The user's existing Edge page reported an active camera, but live hand movement and calibration were not verified. Next: refresh the actual demo and test fists, pinches, fast motion, two hands, and reacquisition in the user's lighting. The visible HUD now reports actual delivered rates, not only the camera's configured 30 fps.

Rendering is deliberately capped at 60 fps and postprocessing at a 720p pixel budget to prioritize tracking; large-screen 3D output is less sharp than full native-resolution postprocessing. Other hardware, lighting, and two simultaneously recognized hands can change timings. No claim is made that every possible bug has been eliminated. Graphify hooks and account configurations were not changed.

## Update 2026-11-26: HandLandmarker instead of GestureRecognizer

- `greinir-worker.js` now runs MediaPipe `HandLandmarker` (`hand_landmarker.task`, float16) and returns only `landmarks`/`worldLandmarks`.
- `hond.js` adds `flokkaBendingu(lm, aspect)`, which classifies Closed_Fist, Open_Palm, Pointing_Up, Victory, Thumb_Up, Thumb_Down, ILoveYou or None from finger curl and thumb position (world landmarks preferred). `script.js` calls it where it used to read `r.gestures`. Pointing_Up needs the thumb tucked against the middle finger so it does not collide with the zoom pose.
- Backup: `work/backup-20261126-handlandmarker`.
- Passed: `node hond.test.mjs` (new classifier cases), `node kerfi.test.mjs`, browser/tracking/performance Playwright suites. The real model classified the thumbs_up photo as Thumb_Up; tracking was 50–58 ms GPU in this run.
- Not verified: live webcam with real hands; thresholds (curl 1.3/1.55, thumb 0.65, tuck 0.3) may need tuning.

## Update 2026-11-26: fewer lost hands during fast motion

- `script.js`: camera asks for 60 fps (ideal, falls back to what the camera supports); HandLandmarker presence/tracking confidence 0.5/0.4 -> 0.3/0.3; re-matching uses predicted palm position (last + image-space velocity x time, capped 300 ms) with radius 0.45 instead of last position with 0.35; grip survives 300 ms out of sight (was 200); hand state kept 600 ms (was 400).
- `tracking.test.cjs`: new fast-swipe + dropout + 0.38 jump case; lost-hand wait raised to 1000 ms. New code passed 6/6; old script.js failed 3/3. Browser and performance suites still pass.
- Backup: `work/backup-20261126-hradar-hendur`.
- Not verified on a live webcam. Hands leaving the frame or fully blurred cannot be tracked by any model. Lower confidence may produce more false hands in clutter; raise to 0.4 if so.

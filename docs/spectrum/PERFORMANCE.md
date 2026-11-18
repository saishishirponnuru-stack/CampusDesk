# Spectrum performance measurements

Measured against the final application source on 17 November 2026. Production asset sizes come from the same complete passing verification run. Navigation/search/register samples use the local Vite development server, headless Chromium, a real isolated API and Docker MongoDB. They include browser automation/assertion overhead. No before/after responsiveness claim is made: there is no comparable controlled baseline latency sample.

## Production build

| Asset | Preserved Nova 4 gzip | Spectrum gzip |
| --- | ---: | ---: |
| Main JavaScript | 134.67 kB | 153.46 kB |
| Main CSS | 11.66 kB | 13.56 kB |
| Deferred chart chunk | 110.76 kB | 110.81 kB |
| Deferred entity picker chunk | — | 2.96 kB |

The main JavaScript increased 18.79 kB gzip (about 14%); CSS increased 1.90 kB. Supported data-router navigation protection contributes to the shared bundle. This is a functional/visual tradeoff, not a bundle-size reduction. Charts remain deferred; records, settings, import, register, profiles and reports retain separate chunks. No dependency/lockfile change, WebGL library or background animation engine was added. Build durations of 779 ms before and 827 ms after are individual samples, not a benchmark conclusion.

## Local navigation

Click to visible route heading, milliseconds (does not imply every lazy chart/data request has settled):

| Route | First traversal | Repeat traversal |
| --- | ---: | ---: |
| Students | 444 | 197 |
| Courses | 98 | 111 |
| Reports | 924 | 157 |

## Large directory and register

105 fictional performance students were created using the actual atomic CSV API, in batches of 100 and 5. Picker first search, including its 250 ms debounce, measured **331 ms**. Subsequent page-settle measurements were **39, 104, 48, 43, 197 ms**. Pages request 20 results; the five-page window rendered 85 options after reaching page six and remains capped at 100. Earlier/later records remain available through Previous/Load More. Search keys, cancellation signals and independent selected records prevent stale results from replacing a choice.

105 compatible enrollments were then created through the real API for a new fictional course. The register rendered only 25 rows per page. Course selection to visible roster measured **372 ms**; one status change to confirmed draft feedback measured **148 ms**; marking the displayed page present measured **93 ms**. These actions did not save attendance or mark undisplayed students. Drafts were explicitly cleared after measurement. Existing transactional/conflict browser tests separately verify persisted bulk saves.

The picker and large register passed document-width checks at 320, 375, 390, 768, 1024, 1366, 1440 and 1920 px. `PERFORMANCE-MEASUREMENTS.json` contains raw observations. No measured need justified virtualization, row memoization or a heavy rendering dependency; the existing 25-row register page keeps the rendered set bounded.

## Interpretation

These samples do not measure slow-network production behavior, user-device frame rate, memory retention over days, CLS, INP or Core Web Vitals. No historical latency improvement percentage is claimed. Layout assertions detect document overflow; they do not constitute a laboratory CLS score. Reduced motion disables transitions; reduced transparency removes navigation blur. Sensitive query results remain in memory, not persistent browser caches.

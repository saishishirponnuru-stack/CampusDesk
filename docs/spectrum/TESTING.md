# Spectrum verification — 17 November 2026

## Executed verification

From `/workspace/nova-4-experience-lab`, with Node 24, Docker and system Chromium:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:isolated
```

The final frozen application-source run exited 0. `verification.log` contains its complete output. No tests failed or were skipped.

| Suite | Preserved Nova 4 baseline, rerun | Final Spectrum |
| --- | ---: | ---: |
| Backend, real owned MongoDB | 64 | 67 |
| Frontend components | 28 | 42 |
| Process supervisor | 2 | 2 |
| Chromium browser, desktop + mobile | 34 | 40 |
| Total | 128 | 151 |

The runner also completed the production frontend build. Browser groups use separate owned API/database instances, preserving real authentication rate limits. Discovery precedes execution, so a selected group with zero tests cannot masquerade as a passed group. The runner rejects a zero-total selection. Targeted Spectrum verification was also executed during development; the table above records the final full run, not a sum of reruns.

## Coverage and actual behavior

New backend cases cover complete first/last-name search, literal escaping of regex characters, populated academic metadata, backward-compatible ordinary updates and rejection of stale timestamp preconditions. New component cases cover debounced/obsolete queries, bounded paginated results, selected-value persistence, failure/retry, keyboard handling and focus, grading constraints and save failures, background-refresh protection, and router Back protection. A regression check verifies that successfully saving thresholds does not leave an untouched password form falsely dirty.

New browser journeys create 105 fictional students, discover records past the first 100, navigate with the keyboard, test no-results and selected-value preservation, reject an incompatible enrollment through the real server, then persist a compatible enrollment. Structured grading checks add/remove boundaries, required zero, failed-save retention, refresh protection, confirmed save/reload and navigation cancellation. Responsive/reduced-effects checks include both reduced motion and reduced transparency.

Existing browser/API suites remain active: real student/course CRUD, enrollment relationship safeguards, attendance persistence and revision conflicts, page-only bulk selection, individual override, transactional import with mapping/invalid/duplicate/retry cases, actual filtered report exports, grading calculations, re-login persistence, authentication and session revocation. The full academic journey uses real isolated writes and reloads. Fixture screenshots supplement these tests; they do not substitute for database integration.

## Browser inspection and evidence

`index.html` is an offline screenshot gallery. Corresponding filenames show before/after captures. `nova-*` captures are actual UI rendered with deliberately fictional API-contract fixtures. `phase2-*` and `spectrum-*` captures use actual disposable MongoDB records; an injected API failure is explicitly used for the grading retry case. Comparison picker captures use the exact preserved pre-Spectrum frontend. No production or institutional records are present.

Evidence includes login, dashboard, directories and profiles, student/course selection, compatible enrollment, attendance register/review/conflict/success, grade forms, structured settings, CSV uploader/preview/errors/success, reports, command search and mobile navigation. Both light/dark themes and desktop/mobile are covered. Additional live-data Spectrum captures fill the new picker, card, grade and navigation states in all four theme/device combinations. Contact-sheet and full-resolution inspection checked readability, focus, clipping, dialog/picker placement and action reachability; dashboard captures were repeated after charts finished loading.

All eight requested widths (320, 375, 390, 768, 1024, 1366, 1440, 1920) were checked for document overflow in course cards, paginated picker and a 105-person register. The broader screen gallery uses representative desktop/mobile viewports; it is not a claim that every screen/state was exercised at every width. Tables intentionally retain their own horizontal scroll containers where needed.

## Defects found and corrected

- Native disabled paging controls could blur and close a picker during fetch; guarded aria-disabled controls now preserve focus.
- Chromium made the scrolling listbox a Tab stop; explicit tabIndex=-1 now moves Tab to pagination. Escape from that button closes the picker and returns focus to its input.
- Picking after keyboard paging could reopen the popup through focus restoration; selection now closes deterministically.
- Undefined password defaults caused phantom unsaved changes after grading saves; defaults are explicitly empty.
- A corrected validation error persisted after changing the offending entity; editing clears outdated 422 feedback while preserving conflict errors.
- Student filtering previously could not match a complete first/last name; the escaped server-side search now does.

## Practical limits

Headless Chromium on Linux and jsdom were used. No Safari/Firefox, physical touchscreen, Windows execution, assistive-technology session or independent WCAG conformance audit was performed. Keyboard semantics, labels, focus and reduced-preference behavior have coverage; visual review is not certification of every contrast ratio. Timing samples are local automation measurements, not field Core Web Vitals or guarantees for a user's machine. The disposable launcher is a review tool, not a durable production deployment. No Git write, deployment or production database test was performed.

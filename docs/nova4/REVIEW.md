# CampusDesk Nova 4.0 — isolated experience lab

This is an uncommitted local experiment based on `f5752a7db0cba804e132298031c3ca983503a398`. Review it before authorizing any Git publication or deployment. The production implementation is preserved.

## Product changes

The CSV import page now has an obvious primary Browse files action, a true native-file drop target, a staged progress indicator and a separate template/guidance panel. File selection becomes a compact readable filename/size summary with replace/remove controls. After selection, preparation guidance collapses into an accessible disclosure so the preview stays closer, especially on mobile. Reading and validation states describe real work, never synthetic upload percentages. Empty, wrong-format, oversized and multiple-file selections have actionable errors. API preview failure retains the CSV and offers retry; the retry preserves automatic mapping when the first preview never completed.

The existing mapping, explicit ignored columns, row-level errors, duplicate counts, preview digest, transaction confirmation, durable request ID and replay semantics remain. Mapping changes still invalidate the preview; no record can be imported through a newly enabled bypass. Replacing/removing a read selection requests discard confirmation. Successful server persistence alone shows the completion state and actual created count; View students and Start another import both work.

The shared presentation layer supplies iris/cyan/mint/amber SVG module icons, identifiable page headings, coordinated focus/hover/press states, clearer search and table focus, refined profile identity and form sections. Dashboard adds a real Import students shortcut when the API reports transaction support. Existing directories, course rosters, student history, enrollment and grade forms, reports and settings inherit the shared controls; their API/data logic remains intact. Attendance uses mint Present, coral Absent and amber Late with text/checks as well as color. Login exposes validation state and field error relationships to assistive technology while preserving visibility, loading, session expiry and secure authentication.

No dependency, schema, backend application, deployment or lockfile changes are part of this experiment. No extra animation library, fake metrics, notifications or sign-up route was introduced. Academic records come from the API. The multiuser design is a [separate security proposal](MULTIUSER_SECURITY.md), not an activated feature.

## Before and after

| Baseline problem | Nova 4 treatment |
| --- | --- |
| Browser file input competes with explanatory copy | Prominent Browse files control inside a clearly bounded dropzone |
| No native drag target or drag state | File-only drag enter/over/leave/drop; depth counter avoids child flicker |
| Filename alone provides little confidence | Filename, measured size, selection status and explicit replacement/removal |
| Workflow stages require inference | Ordered five-step progress with current/completed/future distinctions |
| Generic loading leaves the operation unclear | Local reading and API validation announcements; no made-up progress |
| Failed initial preview has no clear retry | Retained file, actionable error and retry with API mapping suggestions |
| Attendance selections share one accent | Semantic status colors plus text and checkmarks |
| Modules rely on one icon accent | Cohesive colored SVG module language and heading identifiers |
| Narrow layouts need dedicated review | Import controls, stepper, summaries and guidance adapt to narrow viewports |

## Components and interactions

- `FileDropzone`: ordinary file-picker and keyboard alternatives, scoped file drags, controlled selected/busy states, live status, no global drag listener.
- `ModuleIcon`: small original inline SVGs for modules, import/export and search; decorative SVGs are hidden from screen readers. Ordinary utility controls retain Lucide.
- `Heading`: route-appropriate module identity without changing page titles.
- `nova4.css`: semantic tone and interaction tokens, responsive import layout, solid record surfaces, finite motion, focus rings and reduced-motion override. The existing reduced-transparency fallback stays intact.

Buttons retain native disabled semantics. Native dialogs retain Escape handling, focus containment and unsaved-form protection; explicit opener restoration fixes the Escape focus defect found by the new browser test. Status and error messages describe actual events. Navigation/search/filters/CSV exports continue to use existing real routes and bounded API requests.

## Local review

Use `/workspace/nova-4-experience-lab`, local branch `feature/nova-4-experience-lab`. Do not switch, reset or edit `/workspace/campusdesk-sms`. Do not commit, push, merge or deploy without explicit user approval. Do not use an Atlas URI.

Requirements: Node 24, Docker daemon and dependencies installed with `npm ci` at root, backend and frontend. Start from the isolated checkout:

```sh
node scripts/nova4-preview.js
```

This starts an owned digest-pinned disposable MongoDB replica set on a random loopback port, the isolated API on 5000 and Vite on 5173. Ports must be free. It ignores production MongoDB/JWT variables and uses the repository's test database guard, generated database ownership and cleanup. A deliberately fictional reviewer account and three fictional students, a course, enrollments, assessments and two recorded attendance statuses are created only there. The third student remains unmarked.

Use your local/private forwarded Vite port. Sign in as `reviewer@example.test` with the deliberately synthetic password `Synthetic-Nova4-Review-2026`. Never reuse this account outside the disposable preview. Inspect Students → Import CSV, download the template, fill fictional values, drag/select, validate/map, review and import. Inspect attendance, course roster, profiles, reports, themes and keyboard search. Refresh intentionally requires sign-in again. Ctrl+C stops owned processes and removes its temporary database/container; preview records are disposable.

Verification:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:isolated
```

The verifier now gives the extra Nova 4 browser group a fresh owned API/database for each device project. This preserves the existing ten-login/15-minute application limit; no security control is weakened for tests. Existing and new groups are logged separately. The injected preview-503 case is explicitly test interception; its subsequent retry/import runs against the real owned API. Other fixture rendering tests remain fixture-only evidence.

## Safety and review boundaries

Only the new checkout was edited. Protected remote branch matched the supplied baseline when inspected. No production frontend/backend request, Atlas connection, record access, migration, account reset, deployment configuration mutation, commit, push, merge or PR-close operation was performed. Original checkout stayed at its original HEAD with no changes. Environment configuration/publication was not modified.

Download the review archive to retain this work independently of cloud task retention. It contains the uncommitted source changes, baseline identity, full source snapshot and screenshot evidence. Services do not persist across task restarts; use the preview command to restart them. An archive is not a deployment or a Git publication.

## Limits

This milestone concentrates the complete CSV interaction redesign and shared application polish. Existing profile/course/directory/report capabilities are preserved rather than replaced with new academic models. No faculty permissions, tenancy, registration, immutable audit history, offline writes or fabricated profile/history metrics are enabled. Chromium desktop/mobile checks and targeted accessibility assertions do not certify all WCAG criteria, screen readers, Safari/Firefox or production load. No latency or speedup claim is inferred from bundle size.

Measured production asset sizes are recorded in [Performance](PERFORMANCE.md).

## Executed verification

| Check | Result |
| --- | --- |
| Unchanged baseline | 64 backend, 22 frontend, 2 supervisor, 30 browser passed |
| Full Nova 4 regression | 64 backend, 28 frontend, 2 supervisor, 34 browser passed |
| After compact import refinement | Backend 64, frontend 28, supervisor 2, build passed; 12 browser executions covering all 8 distinct affected import cases passed (4 repeated by combined group filtering) |
| Final About-version copy change | Frontend 28 and production build passed; live Settings version confirmed in browser |
| Skipped / blocked checks | 0 / 0 in the full isolated run |
| Local launcher functional smoke | Synthetic login, real seeded records, controlled pending API validation, mapping, atomic 2-student import and API count 5 confirmed |
| Launcher stop/restart | Owned resources stopped cleanly; restart returns 3 fresh fictional students, functional auth and both HTTP services |
| Repository checks | Git whitespace check passed; no staged changes; HEAD remains the exact baseline |

The 34 full browser cases comprise the original 30 regressions plus 4 Nova 4 cases across desktop/mobile and both themes. New frontend tests cover file-picker reselection, drag depth/leave recovery, text-drag/busy guards, metadata/remove controls, initial API-error retry and empty/oversized rejection before API access. Existing integration/browser tests continue to cover duplicates, mapping, transactional rollback, idempotency/replay, attendance conflicts, academic CRUD, enrollment, grades, filtered CSV, sessions, search, theme and navigation. Responsive assertions cover 320, 375, 390, 768, 1024, 1366, 1440 and 1920 pixels.

The first experimental runs found and fixed initial-preview retry mapping, native dialog opener restoration, and test isolation hitting the preserved production login limiter. These failed runs are not counted as final passes. Source remained stable during each browser run; the compact import change was followed by affected-scope revalidation. The last change is only the Settings version string, subsequently built/tested and viewed against the running local API.

Open `index.html` in the extracted review archive for before/after captures. Desktop/mobile light/dark module screenshots use explicit fictional browser fixtures; import/register/filtered-report and local-launcher images use actual requests to an owned disposable MongoDB database. The pending-validation capture deliberately holds a request for inspection, then releases it to the real local API. It is not a timing measurement. Representative desktop/mobile screens were visually inspected; optional guide collapse addresses the overly long selected-file mobile flow discovered during review.

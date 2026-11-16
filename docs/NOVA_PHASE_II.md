# CampusDesk Nova — Phase II functional delivery

Branch: `campusdesk-implementation`. Started from remote `f99c6d15904896edd8ea62ba2db5678f5da71147`. Existing frontend, backend, documentation, branding, themes and academic implementation were preserved. No Atlas connection, data access, seeding, migration, public deployment, history rewrite, force-push or merge was performed.

## Completed scope

| Area | Delivered behavior | Verification |
| --- | --- | --- |
| Isolated database infrastructure | Official digest-pinned MongoDB 7.0.24 container, disposable tmpfs, random loopback port, replica set, owned database/process cleanup | Original 23 previously blocked integration cases now execute |
| Full authenticated lifecycle | UI student create/edit/reload/relogin, compatible course and enrollment, attendance edit/reload, grades and percentages, dashboard, filtered reports/CSV, thresholds, logout/revocation | Real MongoDB desktop and mobile journeys |
| Bulk attendance | Eligible paginated course/date roster; individual overrides; page-only mark-all/selected actions; unmarked rows untouched; review, atomic save, real counts and conflict recovery | Actual transaction and light/dark desktop/320px browser checks |
| Student CSV import | UTF-8 upload/template, mapping/ignored columns, bounded server preview, normalized field errors, duplicate conflicts, explicit atomic confirmation, durable retry receipt | Actual transaction rollback, concurrency and browser persistence checks |
| Academic hardening | Canonical resource IDs, individual attendance revisions, existing relationship/index/auth safeguards retained; empty date and recovery states fixed | Existing CRUD/security suite plus targeted regressions |
| Reports | All five database aggregates accept meaningful academic scope, term and attendance dates; JSON/CSV share strict validation and scope; empty CSVs retain headers | API aggregate/CSV assertions and filtered browser download |
| Visual quality | Nova identity unchanged; new semantic theme controls, native review dialogs, responsive workflows; corrected radio hit targets, labels, stale preview copy and toolbar overlap | Actual screenshots; [Phase II gallery](SCREENSHOTS.md#phase-ii-real-database-workflows) |

## Database isolation and evidence

The direct official binary URL remains blocked by proxy HTTP 403 at `fastdl.mongodb.org`; the running policy does not include the saved draft rule. A saved draft was never treated as activation. Docker is supported and the normal official image pull succeeded without changing network policy or disabling verification.

Pinned image: `mongo@sha256:4c65244b50910461b9641a76131f84a2dcfd4da487f928298cea626b3842842c` (MongoDB 7.0.24). The verifier initializes a real replica set and waits for writable-primary readiness. Its randomly named `campusdesk_test_*` databases hold only synthetic records and are dropped after exact ownership checks. The container uses `--rm` and tmpfs. Production `MONGODB_URI` is not consumed. Explicit test service overrides reject remote/SRV/authenticated URIs.

Tests actually insert, query, update, aggregate and delete records in this disposable MongoDB. Transaction failure tests perform a real write within a session, inject a failure, then assert no partial records or import receipt persisted. Browser previews are checked against zero matching students before confirmation; committed counts, individual revision conflicts, idempotent replay and duplicate rejection are verified over authenticated HTTP.

## Backend and schema changes

`services/transactions.js` combines the original single-process integrity queue with snapshot-read/majority-write transactions for new batches. All existing relationship-sensitive CRUD also uses that queue. **Exactly one API instance remains required.** External writers or multiple instances can invalidate relationship decisions and need a separate shared coordination design.

Attendance adds `revision`, default zero. Missing legacy revisions are read as zero without a data migration. Individual attendance edits increment it; batch inserts start at one and updates increment once. Before changing a status, its expected revision must match. A requested status already saved is an explicit no-op, even on a stale retry, preserving timestamps and avoiding duplicates. Conflicts reject the entire batch with 409; invalid eligibility rejects with 422. No implicit absences or missing-session denominator changes occur.

`OperationReceipt` is a new collection with actor, UUID request ID, SHA-256 content digest, generated student IDs/counts, and createdAt. Unique `(actor, requestId)` and seven-day TTL indexes support safe retry. No uploaded CSV, personal fields, password, token or sensitive request body is stored in receipts. Students and their receipt commit together. Identical replays return the prior result with `replayed: true`; different content under the same key conflicts. After receipt expiration, existing unique indexes still reject duplicate students. A replay describes the original committed operation; it does not recreate a student subsequently deleted through normal controls.

Other additive indexes support course academic context, enrollment course/term/status/roster, attendance course/date/student, and grade course/term. All existing unique indexes remain. There is no `syncIndexes`, destructive migration or Atlas index operation in this work; model initialization creates indexes in the isolated test database and on an explicitly authorized future deployment.

### New authenticated API endpoints

| Method | Endpoint | Input / result |
| --- | --- | --- |
| GET | `/api/operations/capabilities` | Actual topology capability and limits |
| GET | `/api/attendance/register` | Course ID, ISO date, page and limit; eligible roster with saved statuses/revisions |
| POST | `/api/attendance/bulk` | Course, date, 1–100 distinct student/status/expectedRevision rows; created/updated/unchanged counts and confirmed records |
| GET | `/api/students/import/template.csv` | Actual student schema headings only |
| POST | `/api/students/import/preview` | CSV, optional mapping, explicit ignoredColumns; rows, errors, summary, digest; no writes |
| POST | `/api/students/import` | Same content, `confirm: true`, previewDigest and UUID requestId; atomic result or rejection |

Bulk UI links require capability support. Direct batch writes on unsupported MongoDB fail with an actionable 503; individual CRUD is preserved. The unsupported-transaction response is fault-injected in tests, not claimed as a real standalone deployment test.

CSV limits: 64 KiB UTF-8 source, 100 data rows, 20 unique headers, bounded heading/record sizes. The import JSON envelope is 160 KiB to accommodate escaping; ordinary API JSON remains 100 KiB. `csv-parse` is pinned to patched 7.0.3 after audit identified an advisory in the initial candidate. Malformed CSV, replacement/control characters, unknown/unmapped columns, invalid fields, internal and existing duplicates prevent commit. Required student values are never invented; phone alone is optional. Department/year remain the existing validated free-text schema, not a new institutional taxonomy.

## Frontend behavior

Two lazy routes extend the existing Nova shell: `/attendance/register` and `/students/import`. Course discovery uses 250ms debounce and at most 30 options per search; register pages contain 25 students. A selected course remains available when search results change. No per-student write request loop is used. Saved records invalidate query caches.

Register edits retain the revision captured on first change, even if a query refreshes. Status controls have full clickable/touch targets and keyboard focus indicators. Review lists only pending changes; save counts come from the API. A conflict preserves edits and offers explicit reload/discard. Unmarked students are clearly identified. The toolbar stays accessible while avoiding the original bottom overlay over student rows.

Imports distinguish file selection, validation, mapping, preview, review, saving and committed success. Mapping edits invalidate the preview. Generations suppress stale preview responses/errors; file-read failures and request errors remain actionable. A failed network confirmation retains its request ID for a safe retry. Validation preview is hidden after success, so it never claims “nothing written” after commit. Changing file/mapping starts a new request ID. Navigating by ordinary links or closing/reloading prompts for unsaved work; browser Back/Forward within the SPA is not covered by this guard.

Sessions remain memory-only and 15 minutes. Refresh reauthentication is intentional. Existing timeout/401/stale-response handling and cache clearing remain; no sensitive draft, token, password or academic data is persisted to localStorage.

## Reporting contract

`GET /api/reports` and each existing `GET /api/reports/:type.csv` accept the same strict optional fields: department, academicYear, semester (1–12), course ID, term, dateFrom and dateTo. Invalid/unknown filters return 422. Unknown export categories return 404 before running aggregates.

Department/year/semester scope academic records exactly. Course/term selections scope student distributions to non-withdrawn enrollments; term matches enrollment/assessment term and course year. Date bounds are inclusive and filter attendance only, since grades have no session-date field. The UI explains this policy and applies filters explicitly. Unapplied edits are labeled; exports use the applied query. A failed filtered query disables export rather than serving old results.

CSV includes explicit headers even with no matching data. Department/year labels are present (the original inferred-column exporter omitted `_id` labels). Quotes, commas and Unicode are retained; formula-like prefixes, including those after whitespace, are escaped. Attendance remains `(present + late) / recorded`, excluding missing records. Performance remains summed marks / summed maximum marks; no GPA or inferred statistics were introduced.

## Verification results

The reproducible command is:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:isolated
```

| Check | Observed result |
| --- | --- |
| Backend Vitest/Supertest | 64 passed, including original 23 previously blocked integration cases |
| Frontend Vitest/Testing Library | 22 passed |
| Root supervisor | 2 passed |
| Playwright desktop | 15 passed |
| Playwright mobile | 15 passed |
| Skipped / blocked in the full isolated run | 0 / 0 |
| Production build | Passed |
| Frozen backend/frontend installs | Passed |
| Production dependency audits | 0 reported advisories in each service |

Detailed observations are recorded in PROGRESS.md. The backend total comprises 42 real database cases and 22 independent checks. Twelve browser cases exercise real disposable MongoDB; the other 18 cover public/fixture UI behavior. A subsequent capture-only rerun passed all four CSV browser cases with full-page previews. Unit/frontend/API results are separated from browser fixture cases; CI results are separate from local execution. No blocked test is counted as a pass.

The backend covers original CRUD, relationship restrictions, authentication/CORS/rate limits/hash/revocation, reports, grades, seeding idempotency and new batch/import/filter behavior. Frontend checks cover recovery/error and dirty states as well as existing forms/themes/session handling. Real browser cases use the owned API; fixture tests retain their explicit test interception.

Production dependency audits report zero known advisories in both services after patching the parser. This is not a full application security certification. Chromium desktop/mobile and targeted accessibility are verified; Safari/Firefox, full WCAG/screen-reader review, load testing, production monitoring and public hosting are not certified.

## Performance findings

Register fetching uses one course lookup, one paginated roster aggregation and one attendance lookup for that page, rather than N queries per student. Batch saving uses one bounded bulk write. Imports use a bounded existing-conflict query and ordered insertMany inside the transaction. Additive compound indexes support these predicates. Lists retain server pagination; report aggregates still read all matching records and are not materialized analytics.

Workflow routes and charts are lazy; no animation or large CSV framework was introduced. Vite reports main JS 134.55 kB gzip, lazy charts 110.75 kB gzip, register route 3.08 kB gzip, import route 3.33 kB gzip, CSS 9.87 kB gzip and the self-hosted font 24.83 kB. A recursive manifest walk measured 139,630 gzip bytes across statically imported entry JS using Node's default gzip; compression settings differ from Vite's displayed estimate. The production asset measurements and counts are also recorded in PROGRESS.md. Bundle sizes are build observations, not latency, Core Web Vitals, throughput, FPS or percentage-speedup claims. No real institutional-scale benchmark was executed.

## Deferred or externally blocked

- **Durable activity audit:** deferred. Legacy CRUD supports standalone MongoDB; a dependable all-mutation audit requires a broader transaction/topology contract. No misleading Activity page or backfilled events were created. Existing dashboard recent updates are explicitly not immutable audit history.
- **RBAC, PWA/offline writes, PDF:** deferred behind the completed core workflows. There are no placeholder controls or sensitive service-worker caches.
- **Distributed integrity:** unsupported. Keep one API instance; external writers need coordination. Attendance optimistic concurrency does not add optimistic locks to every legacy editor.
- **Direct MongoDB download:** still blocked by runtime proxy policy; the verified official Docker alternative resolves local database testing.
- **Production/Atlas, Render/Vercel deployment:** not accessed or performed. Authorized staging and operational checks remain required.
- **PR metadata/hosted CI:** GitHub GraphQL returns `Forbidden` in this environment. Git push and PR head ref can be checked, but live open/merged metadata, check results and PR-body editing cannot be independently completed through that API. No merge/close operation was issued.

## Isolated interactive demonstration

Node 24, Docker, installed dependencies and free private ports 5000/5173 are required. These commands create a new disposable local container; do not substitute Atlas. The password below is deliberately fictional and must never be reused outside this local demo.

```sh
# From repository root
npm ci
npm ci --prefix backend
npm ci --prefix frontend
docker run --detach --rm --name campusdesk-nova-demo --publish 127.0.0.1:27018:27018 --tmpfs /data/db mongo@sha256:4c65244b50910461b9641a76131f84a2dcfd4da487f928298cea626b3842842c mongod --replSet rs0 --bind_ip_all --port 27018
# After mongod is listening:
docker exec campusdesk-nova-demo mongosh --port 27018 --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27018"}]})'
# Wait until this succeeds:
docker exec campusdesk-nova-demo mongosh --port 27018 --quiet --eval 'if(!db.hello().isWritablePrimary)quit(1)'
```

In a terminal opened in `backend`:

```sh
TEST_MONGODB_URI='mongodb://127.0.0.1:27018/?directConnection=true&replicaSet=rs0' E2E_ADMIN_EMAIL='demo@example.test' E2E_ADMIN_PASSWORD='Synthetic-demo-password-2026' node scripts/test-api.js
```

In another terminal at repository root:

```sh
VITE_API_URL='' npm run dev --prefix frontend -- --host 127.0.0.1
```

Open the private forwarded frontend, sign in with the fictional demo credentials, and choose Light/Dark/System. Start with an empty database: create a student and compatible course (same department, year, semester), enroll for that year, open Attendance → Open register, select the course/date, mark/review/save, then verify individual records and reports. Create a grade, check its weighted percentage, and adjust thresholds in Settings. Download the CSV template under Students → Import CSV, fill a new fictional student's required fields, preview/map/review/import, and confirm duplicates are rejected on a new attempt. Apply report filters and compare CSV to the exact table. Refresh requires signing in again; log out to verify access revocation.

Ctrl+C the API to drop only its generated disposable database; stop Vite; then `docker stop campusdesk-nova-demo` removes only this demo container and tmpfs. No production provisioning or seeding is involved. Automated verification performs the same lifecycle without manual credentials.

## Git and review

Milestone `6c5de5b` established isolated MongoDB verification and the complete lifecycle, and was pushed to `campusdesk-implementation`. Feature milestone `5ee4ee3` adds atomic attendance, CSV imports and filtered reports; it is pushed. The following documentation/gallery commit completes delivery; see `git log` for its exact hash. Commits are pushed normally without force. PR #1 remains the intended review destination; no merge or close operation was performed. Public deployment is a separate authorized step.

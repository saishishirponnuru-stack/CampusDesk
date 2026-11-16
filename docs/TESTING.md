# Testing

Use Node 24. Install with `npm ci` at root, backend and frontend. Never point tests at Atlas or any persistent user database.

## Reproducible full verification

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:isolated
```

Requires a Docker daemon and Chromium (or omit the executable override after `npx playwright install --with-deps chromium` in frontend). The runner pulls the official MongoDB 7.0.24 image by digest, creates a uniquely named `--rm` container with tmpfs storage, publishes a random **loopback-only** port, initializes a single-node replica set and waits for its primary. No TLS or binary verification is disabled.

It runs backend tests, frontend tests, supervisor tests, build, then Playwright desktop and mobile. Each browser project gets a fresh randomly named database and a synthetic administrator with a generated password. Passwords/tokens are not printed. Production's login limit and session revocation stay intact. IPC readiness ensures tests target the API process this runner owns; occupied API/Vite ports fail instead of reusing another service. `VITE_API_URL` is overridden to the local proxy; `MONGODB_URI` and `JWT_SECRET` are removed from child environments.

Cleanup closes owned process groups, drops only the generated `campusdesk_test_*` database, and stops only the runner's container. Docker tmpfs is discarded. SIGINT/SIGTERM also trigger cleanup. Do not kill the runner with SIGKILL if normal shutdown is possible.

Targeted browser reruns can use `npm run verify:isolated -- --grep='Phase II'`; the preceding component/API/build checks still execute. Browser output directories are separate per project; genuine captures remain under `frontend/test-results/phase2-*.png`.

## Backend

`npm test --prefix backend` uses MongoMemoryServer 7.0.24 (a replica set for transaction tests). The official download needs `fastdl.mongodb.org`, still denied in this cloud runtime. The saved environment draft does not activate its allowlist. The Docker command above is the verified alternative.

For an already **owned disposable loopback** replica set:

```sh
TEST_MONGODB_URI='mongodb://127.0.0.1:27018/?directConnection=true&replicaSet=rs0' npm test --prefix backend
```

`tests/database.js` rejects remote hosts, SRV URIs, and embedded credentials. It always chooses a new random database, initializes all model indexes, verifies exact cleanup ownership and never reads production `MONGODB_URI`. Do not substitute the application's ordinary local database. Tests exercise real MongoDB operations, not database mocks. Failure injection performs an actual transaction write and then throws to verify rollback.

Coverage includes authentication/hash/CORS/rate limits, CRUD/search/sort/pagination, relationship deletion/update restrictions, grade boundaries, thresholds, session revocation, seeding idempotency, attendance revisions/concurrency/retries, CSV parsing/mapping/duplicates/confirmation/receipts/rollback, and all five report aggregates/filtered CSVs. Unsupported-transaction response is fault-injected; a real standalone deployment's fallback is not claimed as an end-to-end result.

`npx vitest run tests/unit.test.js tests/isolation.test.js tests/import-validation.test.js` from backend runs independent validation/security/CSV/isolation checks without MongoDB.

## Frontend and browser boundaries

- `npm test --prefix frontend`: components, API/session handling, themes, form validation, dirty context protection, empty dates, fetch recovery, and report filter/error behavior.
- `npm run build`: production Vite assets; dynamic workflow/chart routes remain split.
- `npm run test:dev`: controlled child-process supervisor fixtures for exit propagation and cleanup.
- `npm run test:e2e --prefix frontend`: public and explicitly fixture-backed UI regressions. Real academic tests skip unless isolated credentials/API are supplied. Use the full runner to execute them instead of interpreting skips as successes.

`e2e/lifecycle.spec.js` uses the actual UI to create/edit/reload/re-authenticate students and attendance, create courses/enrollments/grades, verify percentages, compare dashboard/report aggregates, apply report filters and validate CSV, update thresholds, and revoke sessions on logout. No direct DB manipulation makes invalid workflows pass.

`e2e/operations.spec.js` uses authenticated API setup for synthetic compatible relationships, then the actual bulk/import UI in both themes on desktop and 320px mobile. It asserts real persistence, omitted/unmarked students, replay counts, concurrent edit conflicts, mapping errors, read-only previews, and duplicate rejection. These are real HTTP requests to the owned API, not Playwright route fixtures.

`nova.spec.js`, `ui-contract.spec.js`, `preferences.spec.js` retain explicitly fictional API fixtures for visual/accessibility regressions. Their screenshots prove rendering and behavior, not persistence. Preferences cover targeted 4.5:1 semantic contrast, reduced motion/transparency, system themes and keyboard/mobile focus. This is not a full WCAG, Safari, Firefox or screen-reader certification.

Screenshots are real renders inspected alongside assertions, not golden-image diffs. Source must stay stable during a browser run. Final counts and remaining boundaries live in [Phase II delivery](NOVA_PHASE_II.md); previous blocked results remain historical in PROGRESS.md. GitHub Actions uses the same Docker runner; local success is not a claim of hosted CI success or production deployment.

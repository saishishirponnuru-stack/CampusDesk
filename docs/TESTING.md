# Testing

Use Node 24. Install separately with npm ci in backend and frontend. Never point automated tests at production.

## Backend

- npm test (backend): Vitest + Supertest integration suite creates a fresh MongoDB database using mongodb-memory-server 7.0.24; teardown stops it. No external MONGODB_URI is consumed.
- npx vitest run tests/unit.test.js: independent validation/security/CSV/health checks that need no database.
- The integration suite verifies authentication, duplicate indexes, CRUD, filtering/sorting/pagination, relationships, attendance editing, grade boundaries, reports, CSV, session revocation and repeated demo seeding.
- MongoDB's official binary is fetched from fastdl.mongodb.org with verification enabled. If policy denies the domain, request environment settings access; do not disable TLS or checksum verification.

## Frontend

- npm test: React Testing Library and Vitest login/error/modal tests.
- npm run build: optimized Vite build.
- npm run test:e2e -- e2e/public.spec.js: desktop/mobile real-browser login layout, keyboard, protected direct routes and refresh.
- npm run test:e2e: also includes an authenticated student CRUD/persistence flow when E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are explicitly set. Without them this flow is skipped, not passed.

For authenticated E2E, start the isolated local API from backend with ADMIN_EMAIL and ADMIN_PASSWORD matching the E2E credentials. dev:local must report ready before running tests. Use a disposable LOCAL_DB_PATH. Playwright starts Vite itself. Install browsers with npx playwright install --with-deps chromium. In a cloud machine with Chromium already installed, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium.

CI runs full API tests, frontend tests/build, and desktop/mobile browser tests against a disposable real MongoDB. CI-only credentials are synthetic test values and have no production access. CI itself has not been executed until GitHub runs the workflow.

## Evidence in this cloud instance

Consult docs/PROGRESS.md for current observed outcomes. A failed beforeAll MongoDB startup means integration tests did not execute; they must not be described as passing. Public browser tests do not demonstrate authenticated academic operations. An Atlas health check and an authenticated persistence test remain required for production readiness.


## Recovery regression commands

At root, `npm run test:dev` uses controlled child-process fixtures to verify sibling cleanup, Ctrl+C/SIGTERM handling, and failure exit propagation without a database. A separate live `npm run dev` check with missing MONGODB_URI confirmed failure reporting and sibling shutdown; successful full-stack startup is not yet verified here.

`npm test --prefix frontend` now covers theme selection, OS changes, persistence, invalid preferences, unsaved-edit discard confirmation, stale-session responses, expired exports and actionable network failures in addition to the existing form tests.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e --prefix frontend` covers light/dark workspace navigation and dialogs, global search results and course-directory navigation, filters, Escape discard cancellation, and theme reload/system behavior. Workspace tests use explicit API fixtures, not MongoDB. Layout overflow assertions include 320, 768, 1366 and 1920px widths, alongside desktop/mobile projects. Screenshots are written under frontend/test-results; committed documentation screenshots are labeled with their fixture limitations.

The real-database student lifecycle tests remain skipped unless isolated E2E credentials and a running disposable API are supplied. The full cross-module authenticated browser workflow is still incomplete. Full WCAG certification and production verification are not claimed.

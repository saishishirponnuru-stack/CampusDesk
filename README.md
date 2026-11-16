# CampusDesk

Academic administration built with React + Vite, Express, and MongoDB Atlas.
One monorepo, two deployable services: `frontend/` (Vercel) and `backend/` (Render).

## Cloud development

Open this repository in GitHub Codespaces. The dev container installs Node 24 and dependencies and forwards 5173 and 5000. No software on your laptop is required.

1. Run `npm ci --prefix backend && npm ci --prefix frontend`.
2. Copy `backend/.env.example` to `backend/.env`. Supply a real Atlas URI and a cryptographically random JWT secret of at least 32 characters through cloud secret management. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12–128 characters), and `ADMIN_NAME` for initial provisioning.
3. From `backend/`, run `npm run admin:init`. Existing administrators and passwords are preserved.
4. From `backend/`, run `npm run dev`. From `frontend/`, run `npm run dev` in a second terminal.
5. Verify `/api/health` returns HTTP 200 with `database: connected`, then sign in.

For Codespaces, set `CORS_ORIGINS` to the exact forwarded frontend origin if you call the backend directly. The default Vite proxy uses relative `/api` requests. Keep ports private.

### Isolated local cloud demo

Without Atlas, `npm run dev:local` in `backend/` starts a real MongoDB subprocess managed by mongodb-memory-server. Supply `ADMIN_EMAIL` and `ADMIN_PASSWORD` as environment variables. Set `DEMO_DATA=yes` explicitly to add fictional records. This development-only process requires access to `fastdl.mongodb.org` to download MongoDB with MD5 verification enabled. Persistent local data is stored at `LOCAL_DB_PATH` (default `/tmp/campusdesk-local-db`); this is not cloud storage or production persistence. The ephemeral signing secret invalidates sessions on restart.

### Demo data in an explicit development database

From `backend/`, run `CONFIRM_DEMO_SEED=yes npm run seed` with a non-production `MONGODB_URI`. This creates 36 fictional students, six courses, 72 enrollments, 360 attendance records, and 72 assessments, idempotently. Administrator initialization is separate. Normal startup never seeds demo data. Never seed a real institution's database.

## Capabilities

- Administrator authentication, 15-minute in-memory bearer sessions, session invalidation, password changes, login rate limiting.
- Validated student and course CRUD, search, filters, sorting, pagination, profiles, explicit deletion confirmation.
- Compatible academic-term enrollments, editable attendance registers, marks and configurable grade thresholds.
- MongoDB aggregation dashboard, department/year/enrollment/attendance/performance reports, authenticated CSV exports.
- Responsive navigation, accessible labeled forms, native modal dialogs, loading, empty, and API error states.

Missing attendance does not count as absent. Present and late both count as attended. Grade percentages are marks / maximum; aggregate performance is weighted by maximum marks. No GPA is calculated.

## Verification and deployment

- [Architecture and data rules](docs/ARCHITECTURE.md)
- [Tests and verification evidence](docs/TESTING.md)
- [Atlas, Render, and Vercel deployment](docs/DEPLOYMENT.md)
- [Implementation progress and remaining blockers](docs/PROGRESS.md)

The implementation is not yet certified complete: cloud MongoDB download access blocks integration execution, and Atlas/hosting credentials are absent. See the progress log for exact executed checks. No services have been deployed.

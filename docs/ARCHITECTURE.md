# Architecture

React 19 / Vite frontend uses TanStack Query for server state, React Hook Form + Zod for input, Lucide for icons, Recharts (lazy loaded) for database-driven charts, Tailwind CSS and shared CSS for the component system. Native HTML dialogs supply focus containment and Escape dismissal without an additional UI toolkit. React Router handles SPA navigation. Refresh intentionally requires signing in again: bearer tokens exist only in memory, expire after 15 minutes, and never enter localStorage or URLs.

Express 5 REST API separates Mongoose models, Zod validators, authentication middleware, integrity services, controllers, and aggregation services. All API operations except health and login require an administrator JWT with issuer/audience checks and a database token-version check. Logout and password changes revoke all sessions for that administrator.

MongoDB is the only application record store. Production uses Atlas. Development tests use a real isolated mongod subprocess, not a mock API or mock database. Health returns 503 unless Mongoose is connected. Server waits for database connection and unique indexes before listening. Server shutdown closes HTTP and MongoDB resources.

## Data constraints

- Students: unique student ID, roll number, normalized email; indexed department/year/status.
- Courses: unique uppercase code.
- Enrollments: unique student/course/academic term. Department, semester and academic year must match. Term equals course academic year. Active enrollment requires an active student.
- Attendance: unique student/course/ISO calendar date; an active or completed enrollment is required. No implicit absence rows are generated.
- Grades: unique student/course/term/assessment, positive maximum, marks in [0, maximum]. Assessment percentages and configurable per-administrator grade labels are returned by the API.
- Dependencies block parent deletion and incompatible academic field edits. Remove child records first; there is no destructive cascade.
- Enrollment removal, reassignment or withdrawal is blocked while academic records depend on it.

Integrity-sensitive API writes are serialized in this single-process deployment. **Render must run one API instance.** Multiple instances or external concurrent writers require transaction-aware shared locking before scaling. Database unique indexes remain authoritative for duplicates. Administrator/demo scripts are explicit operational tools, not concurrent production writers.

List endpoints use database pagination (default 20, maximum 100), whitelisted sorts and filters, and escaped literal regex search. Student history returns at most 500 records per category, clearly disclosed in the UI; attendance percentage uses all records. Report aggregates read all matching database records. CSV cells escape quotes and formula prefixes.

## API surface

- GET /api/health
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout
- POST /api/auth/password
- PUT /api/auth/thresholds
- GET, POST /api/{students,courses,enrollments,attendance,grades}
- GET, PUT, DELETE /api/{collection}/:id
- GET /api/students/:id/history
- GET /api/reports
- GET /api/reports/{departments,years,courseEnrollments,attendance,performance}.csv

PUT replaces all validated editable fields. Invalid input returns 422, conflicts 409, absent resources 404, authentication failures 401. Invalid query values can return 400. JSON body limit is 100 KB. Unknown fields are rejected. No public admin registration exists. CORS accepts only exact configured origins. Helmet provides security headers. Authorization headers, request bodies and credential values are excluded from request logs.

Operational limitations: no audit-event collection (dashboard activity shows latest updates to actual records, not an immutable historical audit log); no multi-institution tenancy; no timezone inference for attendance dates (explicit YYYY-MM-DD); no refresh-token session recovery; no automated production database migrations or backups. Use Atlas backups and operational monitoring before institutional use.

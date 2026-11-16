# CampusDesk engineering case study

CampusDesk organizes the student, course, enrollment, attendance and assessment records that academic administrators otherwise reconcile across separate spreadsheets. The design goal is a useful daily workspace with explicit data rules and real aggregate reports.

React and TanStack Query separate interactive UI state from cached server records. React Hook Form and Zod validate forms; the Express API validates again because clients are not a trust boundary. Mongoose provides indexed collections and the aggregation pipeline supplies reports. Vite produces a static frontend compatible with Vercel; one Express service on Render connects to Atlas.

The important relationships are student → enrollment ← course, with attendance and assessments referencing the same pair. Matching department, semester, academic year and term are enforced in the API. Unique indexes prevent duplicates. Parent deletion and incompatible edits fail when dependent academic history exists. There are no destructive cascading deletes.

Security favors a narrow administrator surface: explicit provisioning, bcrypt password hashes, issuer/audience-checked short-lived JWTs, revocation versions checked in MongoDB, exact-origin CORS, rate-limited authentication and validated request limits. Sessions are memory-only. The tradeoff is deliberate sign-in after refresh rather than unsafe credential persistence. Appearance preferences can safely persist independently.

The recovery milestone preserved the original implementation and progressively extracted theme, feedback and search components. Semantic colors now cover surfaces, text, borders and status states across both themes. An early bootstrap avoids showing a light page before a saved dark preference is read. Search reuses bounded authenticated list endpoints instead of transferring the database to the browser. Dirty forms retain edits when users decline discard, including native Escape cancellation.

A single-process write queue protects multi-record integrity decisions, alongside database uniqueness. This is a deployment constraint, not distributed transaction safety. Multiple API instances or external concurrent writers require a transaction-aware coordination design before scaling. No migration or Atlas mutation was used in this recovery work.

Verification separates unit behavior, frontend API contracts, browser interaction and real persistence. The browser fixture screenshots show actual rendered components but cannot prove database behavior. The recovery environment passes its independent checks; the official MongoDB test binary is denied by the egress proxy, so integration execution and authenticated browser persistence remain blocked here. See PROGRESS.md for exact results rather than interpreting authored tests as executed evidence.

Current measured production output is approximately 142.28 kB gzip for the main JavaScript bundle and 110.20 kB gzip for the lazy chart chunk. This is an asset-size observation, not a user latency or percentage-improvement claim. Route-level page splitting remains further work.

Bulk attendance, validated CSV import, a durable audit log and faculty authorization are later capabilities. They require explicit policies, database-backed tests and a coherent user experience before becoming visible controls. The current application does not advertise them as completed features.

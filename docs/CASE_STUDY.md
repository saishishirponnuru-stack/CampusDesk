# CampusDesk engineering case study

Current engineering evidence: [Phase II delivery](NOVA_PHASE_II.md). Earlier paragraphs describe historical recovery/Nova checkpoints.

CampusDesk organizes the student, course, enrollment, attendance and assessment records that academic administrators otherwise reconcile across separate spreadsheets. The design goal is a useful daily workspace with explicit data rules and real aggregate reports.

React and TanStack Query separate interactive UI state from cached server records. React Hook Form and Zod validate forms; the Express API validates again because clients are not a trust boundary. Mongoose provides indexed collections and the aggregation pipeline supplies reports. Vite produces a static frontend compatible with Vercel; one Express service on Render connects to Atlas.

The important relationships are student → enrollment ← course, with attendance and assessments referencing the same pair. Matching department, semester, academic year and term are enforced in the API. Unique indexes prevent duplicates. Parent deletion and incompatible edits fail when dependent academic history exists. There are no destructive cascading deletes.

Security favors a narrow administrator surface: explicit provisioning, bcrypt password hashes, issuer/audience-checked short-lived JWTs, revocation versions checked in MongoDB, exact-origin CORS, rate-limited authentication and validated request limits. Sessions are memory-only. The tradeoff is deliberate sign-in after refresh rather than unsafe credential persistence. Appearance preferences can safely persist independently.

The recovery milestone preserved the original implementation and progressively extracted theme, feedback and search components. Semantic colors now cover surfaces, text, borders and status states across both themes. An early bootstrap avoids showing a light page before a saved dark preference is read. Search reuses bounded authenticated list endpoints instead of transferring the database to the browser. Dirty forms retain edits when users decline discard, including native Escape cancellation.

A single-process write queue protects multi-record integrity decisions, alongside database uniqueness. This is a deployment constraint, not distributed transaction safety. Multiple API instances or external concurrent writers require a transaction-aware coordination design before scaling. No migration or Atlas mutation was used in this recovery work.

Verification separates unit behavior, frontend API contracts, browser interaction and real persistence. The browser fixture screenshots show actual rendered components but cannot prove database behavior. The recovery environment passes its independent checks; the official MongoDB test binary is denied by the egress proxy, so integration execution and authenticated browser persistence remain blocked here. See PROGRESS.md for exact results rather than interpreting authored tests as executed evidence.

The pre-Nova recovery baseline was approximately 142.28 kB gzip for the main JavaScript bundle and 110.20 kB gzip for the lazy chart chunk. This is an asset-size observation, not a user latency or percentage-improvement claim. Nova subsequently implemented feature-route splitting; final graph measurements are recorded in NOVA_DELIVERY.md.

Bulk attendance, validated CSV import, a durable audit log and faculty authorization are later capabilities. They require explicit policies, database-backed tests and a coherent user experience before becoming visible controls. The current application does not advertise them as completed features.

## Nova: product design and workflow refinement

Nova's original mark depicts an open courtyard C connected by a record rail. The same geometric language appears in the duotone module icons and editorial illustrations. The interface uses Manrope, porcelain/midnight surfaces, iris actions and mint success states. There are no purchased theme templates or copied Apple assets.

Liquid Glass is treated as a material hierarchy rather than a global effect. Navigation uses subtle translucency, search uses a more elevated layer, and quick actions receive a restrained highlight. Academic tables and forms remain opaque. Unsupported blur and user transparency/motion preferences have solid, static fallbacks. CSS handles finite interactions; an additional animation dependency was unnecessary.

The redesign also changes workflow: students and courses have compact mobile cards; the same pattern extends to enrollments, attendance and marks. Course details expose a paginated roster through existing APIs. Students' academic histories use focused sections, and reports combine one chosen visualization with its exact underlying table and a working authenticated export. No invented trends or placeholder features were added.

Feature-level route boundaries replace the oversized entry module. A separate bootstrap avoids re-creating the React root on hot reload. Query cancellation propagates to fetch while retaining timeouts on supporting browsers. The measured main chunk is smaller, but shared entry imports must also be counted; NOVA_DELIVERY.md records the dependency-graph measurement without claiming a production speedup.

The main tradeoff remains verification infrastructure: the running cloud policy still denies the official MongoDB download even though the draft contains its allowlist entry. UI fixtures support design and request-contract testing without touching Atlas; they cannot establish persistence. Bulk attendance, imports and audit/RBAC changes remain deliberately deferred until isolated real-database tests execute.


## Phase II: closing the persistence gap

The binary download policy remained unchanged: a saved allowlist draft had not enabled runtime access. Instead of weakening TLS/integrity checks or touching Atlas, the test runner uses the supported Docker daemon with the official MongoDB image pinned by digest. Loopback publication, tmpfs, random database names, generated synthetic credentials, process ownership and guarded teardown keep verification isolated. The original integration suite now executes; the complete UI lifecycle verifies persistence across refresh and reauthentication without changing memory-only sessions.

Bulk attendance is a distinct domain operation, not a loop of browser POST requests. The API validates a bounded batch, reads eligible academic relationships and existing revisions in a snapshot, then performs one atomic bulk write. Conflicts reject all changes. Repeating an identical desired state is a no-op; missing records remain unrecorded. Legacy single-process serialization still protects parent/child checks, so transactions are not presented as distributed integrity.

CSV imports separate file selection, server preview, column mapping, confirmation and commit. Every required field comes from the file; unused columns need explicit consent. Existing students are never overwritten. A content digest detects stale previews; a receipt created with the students in the same transaction makes lost-response retries safe. Fault-injection tests write inside the real transaction before failing and verify no student, attendance or receipt leaked through rollback. The parser was upgraded to the patched release after the dependency audit identified an advisory.

Reports use one validated filter contract for JSON and CSV, inclusive attendance-only dates and exact academic scope. Empty exports keep headers; formula-like values are escaped even after leading whitespace. Bounded roster pages, debounced course discovery, bulk writes, additive indexes and lazy routes avoid common per-student request and frontend preload costs. No production latency, Lighthouse or load-test result is inferred from these choices.

Audit history remains a deliberate deferral. Making every legacy standalone mutation and audit insertion consistently commit together requires a broader topology/transaction contract. A plausible-looking activity page without dependable events would weaken the product. Roles, PWA/offline writes and PDF remain outside this verified milestone; sensitive records are not cached by a service worker.

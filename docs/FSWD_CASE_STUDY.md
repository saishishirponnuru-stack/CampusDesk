# CampusDesk
## Full Stack Web Development — Individual Case Study

**Project:** Design and Development of a Full-Stack Student Information and Academic Management System  
**Submitted by:** P. Sai Shishir (A24126552105)  
**Course:** Full Stack Web Development (23CM4121)  
**Guide:** Mr. P. Santosh Kumar  
**Department:** Computer Science and Engineering (AI & ML)  
**Institution:** Anil Neerukonda Institute of Technology and Sciences, Visakhapatnam  
**Academic year:** 2026–2027

> This Markdown companion records the project case study in the source repository. The formatted Word/PDF version is intended for formal printing and signatures.

## Abstract

CampusDesk is a full-stack, browser-based academic administration application integrating student records, courses, enrollments, attendance, assessment marks, CSV imports and reports. It addresses repeated manual entry and inconsistent academic relationships that arise when related records are maintained in disconnected spreadsheets. The interface is built with React and Vite; a Node.js/Express API handles validation, authentication, academic rules and database operations; MongoDB with Mongoose stores the related records. The project includes responsive academic workflows, search and pagination, guarded bulk operations and report exports. Testing evidence is from fictional data and an isolated database; it does not itself establish the health of a public deployment.

## 1. Introduction and problem statement

College administration routinely needs a consistent understanding of which student belongs to which course, when attendance was recorded, which assessments are valid and how academic summaries were calculated. Standalone spreadsheet files provide limited protection against duplicate identifiers, inconsistent course relationships and conflicting revisions. CampusDesk approaches academic records as linked entities rather than independent screens.

The case study's central problem is to implement a secure, navigable administrative workspace that maintains those relationships, validates modifications and produces reports from authoritative stored records.

## 2. Objectives and scope

The implementation addresses authenticated administrator workflows; student and course record management; compatible enrollment; attendance recording and conflict checks; assessment marks and grade thresholds; validated CSV student imports; filtered academic reports and CSV exports; responsive layouts; and error handling that does not silently discard unsaved edits. It is an administrator-oriented prototype. Faculty roles, student self-service registration, multi-institution tenancy, immutable audit-event history, offline academic writes and email account recovery are not represented as delivered functionality.

## 3. Technology stack

| Layer | Main tools and responsibilities |
| --- | --- |
| Frontend | React 19, Vite, React Router, component styles and accessible form controls |
| Client data/forms | TanStack Query, React Hook Form, Zod |
| Charts | Deferred Recharts visualizations |
| Backend | Node.js and Express 5 REST services |
| Database | MongoDB with Mongoose schemas and indexes |
| Security | Hashed administrator passwords, short-lived JWTs, origin controls, server-side validation |
| Verification | Backend tests, frontend component tests, Playwright Chromium, isolated Docker MongoDB |
| Deployment pattern | Vercel frontend, Render API, MongoDB Atlas |

## 4. Architecture

The browser submits authenticated requests to the Express API. Controllers and middleware enforce access and validate inputs. Domain services apply academic rules and invoke Mongoose models and transactions where required. The API returns structured outcomes to the React interface, which refreshes server state and displays successes or errors. Report aggregation and CSV exports use consistent server-side filter contracts. For integrity-sensitive operations, the documented deployment contract assumes a single API instance; this is not a claim of distributed concurrent-write safety.

## 5. Data model and integrity

The principal entities are **Student**, **Course**, **Enrollment**, **Attendance**, **Grade**, **Administrator** and **Import Receipt**. Enrollment connects students with courses for the correct academic context. Department, semester, academic year and term compatibility are enforced for relevant operations. Unique indexes prevent duplicate records. Dependent academic history blocks unsafe parent deletion or incompatible changes rather than allowing uncontrolled cascades.

Attendance distinguishes recorded status from an unrecorded session; **present** and **late** count as attended in the documented policy. Marks are bounded by the applicable assessment maximum; weighted performance uses total awarded marks divided by total maximum marks, without inventing institutional GPA rules.

## 6. Implemented modules

**Dashboard and navigation:** Database-derived summary information, contextual actions, deferred charts, bounded workspace search and light/dark/system appearance preferences.

**Students and courses:** Validated creation and editing, search, pagination, academic history, course rosters, responsive record views and genuine course edit/delete actions.

**Enrollments:** Searchable student/course pickers with readable names, identifiers and academic metadata; compatibility hints in the UI and authoritative server-side rejection of invalid pairings. Picker requests are paginated and bounded, with keyboard support and cancellation of obsolete searches.

**Attendance:** Individual and atomic batch updates, eligible course rosters, review of changes, conflict detection and visible-page-only selection that does not silently mark undisplayed students.

**Assessments and settings:** Validated assessment marks, grade-band configuration with structured threshold rows, interactive previews and failed-save retention. Navigation protection warns before unsaved work is discarded.

**Student CSV import:** File selection/drag-and-drop, template, column mapping, server preview, validation, atomic confirmation and safe replay using digests and import receipts. Existing students are not automatically overwritten.

**Reports:** Department, year, course enrollment, attendance and performance categories; validated filters, database-derived views and spreadsheet-safe authenticated CSV exports.

## 7. Security and reliability

Administrator accounts are explicitly provisioned. Password hashes are stored instead of plain passwords. Short-lived bearer sessions use JWT issuer/audience checking and token-version revocation; the session token remains in browser memory rather than localStorage. Server-side validation is authoritative. Exact-origin CORS, bounded searches, rate limits, duplicate indexes and relationship guards reduce common misuse. Optional timestamp preconditions allow ordinary edits to detect stale versions with HTTP 409; they are not a substitute for a distributed concurrency architecture.

## 8. Interface design

CampusDesk's interface balances academic density with legibility. Search-first relationship selectors show names/titles as primary text and identifiers as contextual detail. Course cards offer an alternate view. The form system presents actual loading, empty, failed and saved states rather than simulated progress. Keyboard navigation, focus management, unsaved-work prompts, mobile layouts, reduced-motion and reduced-transparency settings support usability.

## 9. Verification and performance

Repository testing records dated **17 November 2026** describe a controlled isolated run with **67 backend**, **42 frontend**, **2 supervisor** and **40 desktop/mobile Chromium browser** checks: **151 total**. These tests exercise authentication, CRUD operations, relationships, attendance conflicts, transactional imports, search, grade settings and navigation behavior using fictional records and a separate MongoDB instance.

Recorded production-asset observations give a main JavaScript bundle of **153.46 kB gzip** for the reviewed application, versus **134.67 kB gzip** for the earlier build; the increase reflects functionality and navigation-guard tradeoffs, not an asset-size optimization. Selected local browser automation timings include first student search with debounce (**331 ms**) and course-to-105-person roster display (**372 ms**). These are isolated lab samples, **not production performance guarantees**.

## 10. Deployment and demonstration

The intended hosted topology is a Vercel static frontend, Render Express API and MongoDB Atlas data store. Environment secrets belong only in protected hosting settings; the frontend exposes only a non-secret API origin. A proper release verifies a staging environment, database connectivity, authentication, critical records, imports, attendance, exports and rollback readiness.

For classroom review, the project also contains an isolated local launcher:

```bash
node scripts/nova4-preview.js
```

It starts a disposable fictional-data demonstration using loopback services and an isolated MongoDB replica set. It must not be confused with the institutional production database. Reviewers can walk through dashboard, students, courses, enrollment, import preview, attendance, grading and reports.

## 11. Limitations and future work

Potential future extensions include independently authorized faculty/student roles, institution-level isolation, durable audit events, recovery flows, operational monitoring, backup policy, broader browser/accessibility audits and multi-instance coordination. These are proposed improvements rather than claims about present features.

## 12. Conclusion

CampusDesk demonstrates the full-stack integration of interactive browser interfaces, authenticated REST services and relational integrity modeled in a document database. Its contribution is not merely a collection of pages, but a coherent workflow in which academic records, business rules, user feedback and reports remain consistent. The experimental source is preserved separately from the working production branch until deployment checks are completed.

## References

- `README.md` — project overview and architecture.
- `docs/ARCHITECTURE.md` — API, models, security and integrity requirements.
- `docs/CASE_STUDY.md` — original engineering rationale.
- `docs/spectrum/IMPLEMENTATION.md` — implementation decisions.
- `docs/spectrum/TESTING.md` — isolated regression evidence.
- `docs/spectrum/PERFORMANCE.md` — measured local performance and assets.
- `docs/DEPLOYMENT.md` — intended deployment configuration.
- Branch: `feature/nova-4-experience-lab`; foundational feature commit: `4f55aad`.

**Submitted by:** P. Sai Shishir  
**Under the guidance of:** Mr. P. Santosh Kumar

# CampusDesk Nova 4.0 Spectrum — implementation report

This is an isolated, uncommitted implementation based on f5752a7db0cba804e132298031c3ca983503a398 and the preserved Nova 4.0 experimental source. No production, Atlas, Vercel, Render, GitHub write or publication operation is part of this work.

## Delivered source changes

EntityCombobox, StudentPicker, CoursePicker and SelectedEntitySummary replace the relationship-form native dropdown/search pairs. Student names and course titles have primary hierarchy, with identifiers and academic metadata underneath. Student search also matches the complete first/last name while retaining literal escaping of regex metacharacters. Debounced API queries forward cancellation signals and keep results keyed by search. Selected objects are retained separately from search results. Each page requests 20 records; a five-page window caps rendered results at 100, with forward/back paging so later records remain discoverable. The popup provides keyboard arrows/Home/End/Enter/Escape/Tab, with its scroll container excluded from the Tab sequence and Escape from paging returning focus to the input, bounded results, explicit retry, empty/loading states and labeled controls. Inside dialogs/mobile it participates in layout to avoid clipping into a native dialog's inert background. Pickers also serve the register, report-course selection and academic directory course filters.

Record forms show academic compatibility guidance from selected entities while keeping server validation authoritative. Assessment marks show a mathematically bounded live percentage. Failed writes retain form state; a validation error clears when its inputs change, while edit-conflict instructions remain actionable. A populated relationship response now includes the academic metadata needed by selectors; no fields or schema/index changes were introduced.

GradeThresholdEditor replaces comma-separated input with structured rows, add/remove/sort controls, boundary validation, real band previews and a clearly labeled hypothetical score. It enforces the API's 2–10 row limits, unique labels and minimums, valid percentages and a zero boundary. Inputs survive failed saves and background profile refreshes while dirty. Save success comes from the actual API. Current/new password fields have explicit empty defaults to prevent false dirty-state protection after grading changes.

The entry now uses a React Router data router with an UnsavedWorkProvider. Existing dirty hooks register with a central blocker, so browser Back/Forward, Links and programmatic router navigation use the supported router mechanism. Before-unload protection remains. Dialog close protection remains in forms; explicit sign-out warns about dirty work. No sensitive drafts or tokens were added to browser persistence. Session-expiry handling and memory-only sessions remain unchanged; forced expiry ends access rather than retaining a cross-user resumable draft.

Ordinary record editors now send an optional If-Match timestamp precondition. Inside the existing exclusive write queue, PUT compares it with the current updatedAt and returns 409 on a stale edit. The UI retains edits and refreshes query data, asking the user to close/reopen and review the current record. This is opt-in protection for updated clients, not a universal multi-instance/concurrent external-writer guarantee. Missing headers remain backward-compatible. No database migration/index operation is required. Attendance's existing revision logic, bulk transactions, import digests and durable receipts remain intact.

Spectrum presentation adds semantic blue/iris/teal/rose accents, a geometric SVG dashboard hero, textured login lighting, bounded glass navigation, coordinated charts, numeric hierarchy, selected summaries, readable validation and responsive styles. Course cards are a real alternative to the existing directory list, with actual metadata and edit/delete controls. Student profiles expose existing academic-context badges. Directory filter summaries show applied values. Loading uses labeled skeletons with no artificial percentage. Motion remains finite and reduced preferences remove decoration/blur. Tables/forms/register rows stay opaque; no new animation or 3D dependency was added.

## Preserved behaviors

Existing student/course CRUD, relationship guards, paginated rosters/history bounds, enrollment, individual/bulk attendance, assessment calculations, all report categories/filtered CSV exports, authenticated import/template/preview/atomic commit/retry, appearance, login/logout/password revocation and bounded workspace search remain in the application. No public sign-up or role/tenant capability was enabled. Native select controls remain appropriate for short enumerations such as status and semester.

## Known limits

- The default lab launcher remains intentionally disposable: stopping its database removes fictional review data. Persistent institutional operation is separate scope.
- Multiuser/tenancy, recovery-email delivery and durable audit history remain separate security architecture work. Dashboard recent updates are not immutable history.
- If-Match is optional for compatibility and scoped to ordinary PUT. The single-API-instance integrity requirement remains.
- Popovers are inline in native dialogs/mobile for reliable accessibility/clipping behavior; they are not a separate mobile full-screen sheet.
- No WebGL background, offline sensitive-data cache, inferred GPA, fabricated trend or invented academic model was added.
- Supported router navigation is guarded. Arbitrary code setting window.location receives browser unload protection, not an SPA router dialog.
- Cloud modifications do not automatically reach the user's separate WSL app. The package includes explicit restoration and incremental update instructions. No unsupported public download URL is invented.

## Safety and preservation

The original Nova 4 ZIP and a separate pre-Spectrum snapshot are retained unchanged. The current source remains uncommitted in feature/nova-4-experience-lab. Production checkout and protected baseline are checked at delivery. Packaging excludes runtime env files, credentials, tokens, node_modules, live database files and browser traces that might capture bearer headers. Test screenshots use only fictional fixtures or owned isolated database records.


## API compatibility and security

No database schema, index, dependency, deployment configuration or authentication-policy change was introduced. Additive relationship metadata is returned only through existing authenticated routes. PUT supports an optional quoted updatedAt value in If-Match; the updated editor sends it, and old clients can continue without it. Existing API body schemas and academic constraints remain authoritative. Server-state caches stay in memory and clear on logout. Only theme preferences use browser localStorage. Test APIs strip production MONGODB_URI and JWT_SECRET from their child process environment, and owned database guards reject remote/SRV/credential-bearing test URIs.

The previous MULTIUSER_SECURITY.md remains the separate proposal for invitations, faculty access, tenancy and recovery. Spectrum activates none of these. Optional edit preconditions do not replace server authorization, duplicate indexes, transaction protections or the single-instance deployment contract.

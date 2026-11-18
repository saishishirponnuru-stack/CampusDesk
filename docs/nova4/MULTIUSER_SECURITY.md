# Multiuser access — proposal for separate approval

Status: design only. Nova 4 adds no registration route, no new role, no tenant schema, and no public sign-up. Existing administrators remain explicitly provisioned. Production is outside this experiment.

## Recommended sequence

Start with invitation-only institution accounts (A), then add restricted faculty access (D). Offer reviewers a separate fictional demonstration instance (C). Treat self-service institutional workspaces (B) as a separate tenancy project, rather than adding sign-up to the current institution.

| Option | Value | Required boundary | Decision |
| --- | --- | --- | --- |
| Invitation-only | Controlled staff onboarding | Expiring single-use invitation, server authorization, verified identity | Recommended first |
| Institutional workspaces | Independent organizations can register | Every academic query, relationship and write scoped by tenant | Separate migration/review |
| Reviewer demo | Safe portfolio walkthrough | Separate API/database, generated fictional records and reset lifecycle | Suitable for demonstration |
| Faculty | Assigned roster and assessment access | Explicit course assignments and scoped actions on the server | After RBAC |

## Authorization model

Deny access by default. A user is an identity, membership grants access to one workspace, and role permissions belong to that membership. Do not accept a role or institution ID from a registration body as authority. Resolve active membership server-side for every request, including CSV exports, search, dashboard aggregates and bulk operations.

Proposed roles for review:

- Owner: manage institution configuration, invitations and staff memberships; enforce at least one active owner.
- Registrar: student/course/enrollment administration and academic corrections under approved policy.
- Faculty: read assigned course rosters and record attendance/grades only for assigned courses; no institution-wide export or student deletion.
- Read-only reviewer: explicitly scoped read permissions; a public demo reviewer belongs only to the fictional demo.

Split actions into capabilities, rather than scattering role-name checks through controllers. Validate ownership of referenced student/course/enrollment IDs before using them. Authorize every row of an atomic batch before any write. Never trust a hidden UI button as enforcement. Assess whether sensitive exports warrant a separate permission.

## Invitations and account lifecycle

Only an authorized institution administrator can invite. Bind an invitation to normalized email, workspace and approved role, with a cryptographically random token. Store only a token hash, expiry and consumption state. Use a single transaction to consume it and create membership. Concurrent acceptance must succeed once only. Do not log or place tokens in analytics; exchange tokens promptly and remove them from the browser URL. Require email verification and rate-limit initiation and acceptance without revealing account existence.

Keep bcrypt password hashing and minimum password policy; assess a calibrated work factor under realistic load. Recovery uses single-use expiring hashed tokens, generic responses and session revocation after reset. Role changes, suspension and membership removal revoke authority immediately. Existing 15-minute in-memory bearer sessions can remain initially; a future refresh-cookie model needs HttpOnly/Secure/SameSite cookies, CSRF defense, rotation, replay detection and separate approval.

## Tenancy prerequisites before Option B

Introduce Workspace, User and Membership entities. Add tenant ownership to every academic record, operation receipt, course assignment and eventual audit event. Replace global uniqueness with reviewed tenant-scoped compound indexes where business policy permits. Validate both sides of relationships belong to the active tenant. Include tenant in receipt uniqueness, aggregation filters, cache keys and authorization context. No cross-tenant MongoDB lookup may be unscoped, even when the caller supplies a valid object ID.

The current single-process integrity queue is not a multi-instance authorization design. Review shared transaction/coordination strategy before scaling. A user can never select an arbitrary existing institution during self-service registration. New signup creates a new empty workspace after verification; membership in an existing institution still needs an invitation.

Do not migrate production as part of this milestone. Design a reviewed, backed-up, reversible migration with ownership mapping, dry-run count checks and rollback criteria. Test it only on synthetic data before any separately authorized staging or production step.

## Verification and rollout gates

Add endpoint-level tests for anonymous access, revoked membership, expired sessions, every forbidden capability, cross-tenant IDs, nested references, filtered reports/CSV, search, bulk attendance, import receipts and ID reuse. Prove partial batch authorization failures roll back. Test concurrent invitation acceptance, expired/reused tokens, owner removal restrictions, faculty assignment changes and recovery replay. UI tests should confirm forbidden actions are absent, but API tests remain authoritative.

An authorized staging security review must precede activation. Review email delivery, secret handling, invitation abuse/rate limits, monitoring, immutable security audit events and backup recovery. No existing institution record should become visible to a new account by default. User approval of the role and tenant model is required before implementation/activation; deployment requires separate approval.

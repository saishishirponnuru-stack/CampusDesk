# CampusDesk — FSWD External Examination Demo

**Project:** CampusDesk — Full-Stack Student Information and Academic Management System  
**Student:** P. Sai Shishir (A24126552105)  
**Course:** Full Stack Web Development (23CM4121)  
**Guide:** Mr. P. Santosh Kumar  
**Institution:** ANITS, CSE (AI & ML)  
**Academic year:** 2026–2027

## Presentation links

- **Application:** https://campusdesk-nova.vercel.app
- **API health:** https://campusdesk-nova-api.onrender.com/api/health
- **Case study:** [FSWD_CASE_STUDY.md](FSWD_CASE_STUDY.md)
- **Source branch:** [feature/nova-4-experience-lab](https://github.com/saishishirponnuru-stack/campusdesk-sms/tree/feature/nova-4-experience-lab)
- **Testing evidence:** [Spectrum testing](spectrum/TESTING.md)

The application URL is the existing production domain, not the Vercel per-deployment preview URL. The Settings screen can be used to identify the 4.0 Spectrum edition. Use the Vercel and Render deployment dashboards to confirm the **exact current production commits**.

## 8-minute demonstration

| Time | Activity | What to explain |
| --- | --- | --- |
| 0:00–0:45 | Problem and architecture | Why linked records beat separate spreadsheets; React → Express → MongoDB |
| 0:45–1:30 | Sign in and dashboard | Authenticated API, database-backed summary and navigation |
| 1:30–2:30 | Students and courses | Search, filters, pagination, create/edit, real relationships |
| 2:30–3:30 | Enrollment | Searchable student/course pickers and academic compatibility checks |
| 3:30–4:45 | Attendance | Eligible roster, page scope, individual/bulk marking, review |
| 4:45–5:45 | CSV import | File selection, mapping, preview, validation and atomic confirmation |
| 5:45–6:45 | Grades and reports | Threshold editor, report filters and CSV export |
| 6:45–8:00 | Settings and conclusion | Theme, 4.0 edition, security and future work |

## Before presenting

1. Confirm **https://campusdesk-nova.vercel.app** loads and the Settings page displays the correct version.
2. Open **/api/health** before the examiner arrives; free Render instances can take time to start after inactivity. Verify the response indicates database connectivity.
3. Sign in using a legitimate administrator account. **Never put passwords, tokens, API keys or Atlas URIs in this document or screenshots.**
4. Test Students, Courses, Enrollments, Attendance, Grades and Reports, including one harmless read-only workflow.
5. Use only authorized or fictional records when demonstrating writes. Do not delete or change actual student data to create a demo effect.
6. Keep the spiral-bound case study, a local PDF copy, and a locally tested disposable prototype as contingency options.
7. If the browser refreshes, sign in again: the session token is intentionally memory-only.
8. Confirm that the backend/frontend API URLs and exact allowed CORS origins are consistent.

## If the hosted demo is unavailable

The isolated local launcher is a fallback **only after it has been tested on the presentation laptop**. In an existing Linux/WSL project checkout with Node 24, Docker and dependencies installed:

```bash
node scripts/nova4-preview.js
```

Open http://127.0.0.1:5173 after the launcher reports readiness. This launches a **separate disposable MongoDB database with fictional records**, not the production Atlas database. Shutting it down deletes its owned test data. Consult [RESTORE.md](spectrum/RESTORE.md) for environment setup and synthetic reviewer credentials.

## Engineering evidence and boundaries

The versioned Spectrum test report records 151 automated checks passing in an isolated Linux environment (67 backend, 42 frontend, 2 supervisor and 40 Chromium browser). Do not claim that those checks establish production uptime or production response time. The backend is designed for a single API instance; faculty roles, student self-registration, multi-institution tenancy, immutable auditing, offline academic writes and email recovery are future work.

## Release safety

Vercel and Render deployment branch settings may be independent. Avoid a last-minute branch switch, configuration change or database migration during the examination. If a deployment breaks, use the hosting provider's verified previous working deployment, not a force push. Preserve the prior implementation commit `f5752a7` and keep environment secrets outside Git.

**Examination presentation title:** *CampusDesk: Design and Development of a Full-Stack Student Information and Academic Management System.*

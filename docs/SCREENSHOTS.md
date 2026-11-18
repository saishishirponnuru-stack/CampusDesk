# Nova screenshot gallery

The original Nova images in this first section are genuine Chromium application renders from that visual milestone. Populated screens use fictional API-contract fixtures in frontend/e2e/fixtures/nova.js. They are not evidence of Atlas access, real MongoDB persistence, or a public deployment. Login renders the real unauthenticated page.

Desktop: 1280px CSS viewport. Mobile: Playwright Pixel 7 viewport. Fonts were loaded and finite animations settled before capture. Layout assertions additionally exercised 320, 375, 390, 768, 1024, 1366, 1440 and 1920px.

| Screen | Light desktop | Dark desktop | Light mobile | Dark mobile |
| --- | --- | --- | --- | --- |
| Login | [View](screenshots/nova/login-light.png) | [View](screenshots/nova/login-dark.png) | [View](screenshots/nova/login-light-mobile.png) | [View](screenshots/nova/login-dark-mobile.png) |
| Dashboard | [View](screenshots/nova/dashboard-light.png) | [View](screenshots/nova/dashboard-dark.png) | [View](screenshots/nova/dashboard-light-mobile.png) | [View](screenshots/nova/dashboard-dark-mobile.png) |
| Students | [View](screenshots/nova/students-light.png) | [View](screenshots/nova/students-dark.png) | [View](screenshots/nova/students-light-mobile.png) | [View](screenshots/nova/students-dark-mobile.png) |
| Student Form | [View](screenshots/nova/student-form-light.png) | [View](screenshots/nova/student-form-dark.png) | [View](screenshots/nova/student-form-light-mobile.png) | [View](screenshots/nova/student-form-dark-mobile.png) |
| Student Profile | [View](screenshots/nova/student-profile-light.png) | [View](screenshots/nova/student-profile-dark.png) | [View](screenshots/nova/student-profile-light-mobile.png) | [View](screenshots/nova/student-profile-dark-mobile.png) |
| Courses | [View](screenshots/nova/courses-light.png) | [View](screenshots/nova/courses-dark.png) | [View](screenshots/nova/courses-light-mobile.png) | [View](screenshots/nova/courses-dark-mobile.png) |
| Course Profile | [View](screenshots/nova/course-profile-light.png) | [View](screenshots/nova/course-profile-dark.png) | [View](screenshots/nova/course-profile-light-mobile.png) | [View](screenshots/nova/course-profile-dark-mobile.png) |
| Enrollments | [View](screenshots/nova/enrollments-light.png) | [View](screenshots/nova/enrollments-dark.png) | [View](screenshots/nova/enrollments-light-mobile.png) | [View](screenshots/nova/enrollments-dark-mobile.png) |
| Attendance | [View](screenshots/nova/attendance-light.png) | [View](screenshots/nova/attendance-dark.png) | [View](screenshots/nova/attendance-light-mobile.png) | [View](screenshots/nova/attendance-dark-mobile.png) |
| Grades | [View](screenshots/nova/grades-light.png) | [View](screenshots/nova/grades-dark.png) | [View](screenshots/nova/grades-light-mobile.png) | [View](screenshots/nova/grades-dark-mobile.png) |
| Reports | [View](screenshots/nova/reports-light.png) | [View](screenshots/nova/reports-dark.png) | [View](screenshots/nova/reports-light-mobile.png) | [View](screenshots/nova/reports-dark-mobile.png) |
| Settings | [View](screenshots/nova/settings-light.png) | [View](screenshots/nova/settings-dark.png) | [View](screenshots/nova/settings-light-mobile.png) | [View](screenshots/nova/settings-dark-mobile.png) |
| Search | [View](screenshots/nova/search-light.png) | [View](screenshots/nova/search-dark.png) | [View](screenshots/nova/search-light-mobile.png) | [View](screenshots/nova/search-dark-mobile.png) |

Visual review corrected password labeling, decorative-name duplication, mobile filter clipping, drawer focus, form-footer clipping, and report layout. The attendance image is an individual-record workspace, not a completed bulk register. Empty-state coverage remains in ui-contract.spec.js. Native status/error alerts reflect real request outcomes; no synthetic notifications exist in application code.


## Phase II: real database workflows

The 36 images below are actual Chromium application renders using authenticated HTTP requests to an owned disposable MongoDB 7.0.24 replica set. They use synthetic records, not Playwright API fixtures, Atlas records or public hosting. Desktop is 1280px; register/import mobile is deliberately 320px; filtered reports use the Pixel 7 project viewport. Images were captured after fonts loaded, with finite animations disabled and the page returned to the top; native dialogs use viewport capture.

Representative desktop/mobile views in both themes were visually inspected. Corrections include status-control click targets, precise label association, duplicate preview copy after a committed import, stale file responses and a save toolbar that covered register rows. Browser assertions also check no horizontal page overflow and actual saving/conflict behavior. The CSV mapping UI is shown collapsed after successful mapping; expand “Match your columns” to change it.

| Workflow/state | Light desktop | Dark desktop | Light mobile | Dark mobile |
| --- | --- | --- | --- | --- |
| Attendance register | [View](screenshots/phase2/register-light-desktop.png) | [View](screenshots/phase2/register-dark-desktop.png) | [View](screenshots/phase2/register-light-mobile.png) | [View](screenshots/phase2/register-dark-mobile.png) |
| Bulk review | [View](screenshots/phase2/attendance-review-light-desktop.png) | [View](screenshots/phase2/attendance-review-dark-desktop.png) | [View](screenshots/phase2/attendance-review-light-mobile.png) | [View](screenshots/phase2/attendance-review-dark-mobile.png) |
| Persisted attendance | [View](screenshots/phase2/attendance-saved-light-desktop.png) | [View](screenshots/phase2/attendance-saved-dark-desktop.png) | [View](screenshots/phase2/attendance-saved-light-mobile.png) | [View](screenshots/phase2/attendance-saved-dark-mobile.png) |
| Rejected concurrent edit | [View](screenshots/phase2/attendance-conflict-light-desktop.png) | [View](screenshots/phase2/attendance-conflict-dark-desktop.png) | [View](screenshots/phase2/attendance-conflict-light-mobile.png) | [View](screenshots/phase2/attendance-conflict-dark-mobile.png) |
| CSV field/duplicate errors | [View](screenshots/phase2/import-errors-light-desktop.png) | [View](screenshots/phase2/import-errors-dark-desktop.png) | [View](screenshots/phase2/import-errors-light-mobile.png) | [View](screenshots/phase2/import-errors-dark-mobile.png) |
| Mapped read-only CSV preview | [View](screenshots/phase2/import-preview-light-desktop.png) | [View](screenshots/phase2/import-preview-dark-desktop.png) | [View](screenshots/phase2/import-preview-light-mobile.png) | [View](screenshots/phase2/import-preview-dark-mobile.png) |
| Atomic import confirmation | [View](screenshots/phase2/import-review-light-desktop.png) | [View](screenshots/phase2/import-review-dark-desktop.png) | [View](screenshots/phase2/import-review-light-mobile.png) | [View](screenshots/phase2/import-review-dark-mobile.png) |
| Committed import | [View](screenshots/phase2/import-saved-light-desktop.png) | [View](screenshots/phase2/import-saved-dark-desktop.png) | [View](screenshots/phase2/import-saved-light-mobile.png) | [View](screenshots/phase2/import-saved-dark-mobile.png) |
| Filtered reports | [View](screenshots/phase2/filtered-reports-light-desktop.png) | [View](screenshots/phase2/filtered-reports-dark-desktop.png) | [View](screenshots/phase2/filtered-reports-light-mobile.png) | [View](screenshots/phase2/filtered-reports-dark-mobile.png) |

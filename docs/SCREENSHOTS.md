# Nova screenshot gallery

All images are genuine Chromium application renders from the final Nova browser regression run. Populated screens use fictional API-contract fixtures in frontend/e2e/fixtures/nova.js. They are not evidence of Atlas access, real MongoDB persistence, or a public deployment. Login renders the real unauthenticated page.

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

# CampusDesk
Use Node 24 LTS. This cloud task is already isolated; use the existing checkout, not a worktree.
Install with npm ci separately in backend and frontend. Never commit secrets or .env files.
Backend: npm test, npm start (requires MONGODB_URI and JWT_SECRET).
Frontend: npm test, npm run build, npm run dev.
Use an isolated test database; never run tests or demo seeding against production.
Keep validation on both client and API, and retain unique database indexes.
See docs/ARCHITECTURE.md, docs/TESTING.md, and docs/DEPLOYMENT.md.

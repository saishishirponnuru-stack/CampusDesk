# Deployment: MongoDB Atlas → Render → Vercel

No deployment has been performed by this task. Credentials belong in each platform's encrypted settings, never in Git, issue comments or chat.

## 1. Atlas

Create a cluster and a dedicated database user with read/write access only to the CampusDesk database. Choose a strong password and URL-encode it in the SRV connection URI. Use a separate database/user for staging. Configure Atlas network access to permit the Render service's outbound IP ranges (shown in Render), and the approved cloud development egress where available. Avoid broad public network access.

The cloud development platform must support MongoDB's TCP/TLS protocol and DNS SRV lookups. An HTTPS-only secret proxy cannot substitute for a raw MongoDB URI in the server process. If TCP egress is unavailable, use the isolated cloud test database for development and connect the Render service directly to Atlas. This task has not verified Atlas connectivity.

## 2. Render API

Connect the GitHub repository. Use the root render.yaml blueprint or create a Node web service:

- Root directory: backend
- Node: 24 LTS
- Build: npm ci --omit=dev
- Start: npm start
- Health: /api/health
- Instances: exactly one (see architecture integrity constraint).

Set NODE_ENV=production, TRUST_PROXY=1 for Render's single trusted reverse proxy, MONGODB_URI to Atlas, and JWT_SECRET to at least 32 cryptographically random characters. PORT comes from Render. Set CORS_ORIGINS to the eventual exact Vercel origin, comma-separated if a separate staging frontend is authorized; do not use a wildcard.

Provision the administrator once using Render Shell (or an authorized one-off cloud process in backend): supply ADMIN_EMAIL, ADMIN_PASSWORD (12–128 characters), ADMIN_NAME and run npm run admin:init. Existing passwords are never reset. Remove ADMIN_PASSWORD from persistent service settings after initialization. Never run demo seeding in production. Verify the public /api/health is 200 and reports database connected.

## 3. Vercel frontend

Import the same repository with root directory frontend, framework Vite, build npm run build, output dist. Use Node 24. Set VITE_API_URL to the Render HTTPS origin with no /api suffix. This variable is public and must contain no credentials. frontend/vercel.json provides direct-route SPA fallback.

After Vercel assigns an HTTPS production URL, put that exact origin into Render CORS_ORIGINS and restart/redeploy the backend. For custom domains update the exact allowlist. Do not automatically allow every preview deployment: authorize staging origins explicitly. Redeploy Vercel when VITE_API_URL changes because Vite embeds it at build time.

## 4. Production verification

Sign in, create a synthetic temporary student, edit it, reload and sign in again, confirm persistence, then remove it. Verify the browser uses the Render API, no mixed-content or CORS errors occur, direct /students navigation works, and health reports connected. Check dashboard and CSV against actual records. Check sign-out invalidates the old token and invalid passwords are rejected. Remove verification data and enable Atlas backups.

Do not claim deployment success until both services and Atlas pass these checks. Hosting permissions, accounts, secrets, public URLs and Atlas network access are external prerequisites.


## Recovery environment status

The recovery cloud workspace starts successfully. No deployment or Atlas access occurred during this milestone. Codespaces Atlas connectivity was reported by the user; it has not been independently revalidated here. Backend schema/index and single-instance contracts remain unchanged.

Root development supervision does not change Render's `npm start` or Vercel's frontend build command. The theme bootstrap is inline in the frontend HTML; if a frontend Content Security Policy is introduced, authorize that exact script using a hash or nonce rather than enabling arbitrary inline scripts.

Cloud environment settings contain a saved draft adding `fastdl.mongodb.org` to the custom network allowlist (package-manager presets retained), plus installation and startup instructions. Review/save the settings and publish to activate the prepared environment. A saved draft alone does not change the current runtime; retry the isolated integration suite after network access is applied. Do not bypass the proxy or disable TLS/checksum verification.

## Nova delivery

The frontend now includes same-origin SVG branding and a self-hosted variable font with its OFL license. Feature routes are dynamically split; the existing Vercel SPA fallback remains. Render and API environment contracts are unchanged. No service worker or offline academic cache was added. Frontend builds, contract/browser tests and the gallery are verified independently of production infrastructure; see NOVA_DELIVERY.md for exact remaining gates.

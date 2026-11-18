# Restore or update Spectrum safely

Original implementation baseline: f5752a7db0cba804e132298031c3ca983503a398.
Experimental local branch: feature/nova-4-experience-lab.
Original Nova 4 review ZIP is preserved unchanged; Spectrum uses a separate package.

## Choose one recovery path

1. **Existing Nova 4 source:** use `spectrum-incremental.patch` only on a separate copy matching the earlier Nova 4 experimental source. This includes untracked Nova 4 components; a clean production-branch checkout alone is not that source. Run `git apply --check` first, then `git apply` once. For a Windows/WSL copy with CRLF line endings, use `git -c core.autocrlf=true apply --check` and `git -c core.autocrlf=true apply`; the command-scoped setting does not modify your Git configuration. This line-ending variant is separately checked during packaging. Do not reapply the old 2,281-line patch. Preserve any newer local changes separately before updating.
2. **Original implementation branch:** clone to a fresh directory, create the local experimental branch at the exact baseline above, and apply `spectrum-full.patch` after a successful `git apply --check`. This full patch includes both Nova 4 and Spectrum additions, including new files. No commit or push is needed.
3. **Source snapshot:** extract `spectrum-source.tar.gz` into a fresh directory. It contains the complete source in `nova-4-spectrum/`; no Git or patch application is needed for this path. Git metadata and installed dependencies are intentionally excluded.

Both patch paths are verified in separate temporary baseline/source trees, with every resulting source file compared byte-for-byte. RESTORATION-VERIFIED.json records the exact source hashes and incremental changed paths. SHA256.json covers the package contents.

## Example from the original branch

After extracting the package locally, substitute the actual patch path below. Run each command separately and stop if it fails. Use a new directory; preserve your existing Windows/WSL copy and local backup ZIP.

```sh
git clone --branch campusdesk-implementation --no-checkout https://github.com/saishishirponnuru-stack/campusdesk-sms.git CampusDesk-Spectrum-Review
cd CampusDesk-Spectrum-Review
git switch -c feature/nova-4-experience-lab f5752a7db0cba804e132298031c3ca983503a398
git apply --check /path/to/spectrum-review/spectrum-full.patch
git apply /path/to/spectrum-review/spectrum-full.patch
git status --short
```

## Local preview

Use your already-installed Node 24 and Docker in Ubuntu/WSL2. Do not reinstall them. Work from a fresh Linux source directory and install Linux dependencies rather than reusing Windows node_modules. The environment is already isolated; no worktree is necessary for normal cloud development.

```sh
npm ci
MONGOMS_DISABLE_POSTINSTALL=1 npm ci --prefix backend
npm ci --prefix frontend
node scripts/nova4-preview.js
```

The supported memory-server install option skips an unnecessary standalone MongoDB binary download; this preview uses the official digest-pinned Docker image instead. No TLS/checksum verification is disabled. The preview initializes an owned loopback replica set, three fictional students and a fictional course with academic records. The demo account is `reviewer@example.test`, password `Synthetic-Nova4-Review-2026`; never reuse these deliberately synthetic credentials outside this local lab. After readiness, open localhost port 5173 in the Windows browser. Keep the terminal open; Ctrl+C stops owned processes and removes the disposable lab database/container.

The default preview is disposable. Before stopping an existing preview, preserve any local review records you need through an appropriate owned-local-database backup. Never substitute Atlas. Runtime environment files, credentials, database files and active processes are not part of this source recovery package.

Your WSL app and this cloud checkout are separate computers. Cloud changes do not update the WSL app automatically. This ChatGPT web session has no supported cloud-file attachment or HTTP preview-forwarding tool. Workspace paths are not public download links. Obtain the package through a client with workspace file downloads, or use an explicitly agreed copy-safe text transfer of the incremental patch; no public deployment or Git push is needed or authorized. Do not erase the old local backup while transfer remains unresolved.

### Updating an already-running WSL review

There are no dependency/lockfile changes. An existing Nova 4 Linux installation can reuse its Linux node_modules after a successful incremental patch application; a fresh restored directory needs the installations above. Apply changes to the active Linux project directory, not merely its Windows backup: the source launcher previously created a fresh /home/saish/campusdesk-nova4.* directory. The terminal that started the preview identifies that working directory. Preserve any subsequent local code edits before applying a patch.

This package includes backend changes, so frontend hot reload alone is insufficient: the API must restart. The default launcher also discards its temporary database when stopped. Back up any local review data you need before a restart. Do not delete or reset data to make an update work. File transfer, data preservation and an API restart are distinct from deploying or publishing the application.


## Copy-safe text transfer alternative

`spectrum-transfer-powershell.txt` encodes only the incremental patch, compressed with gzip and base64. If your interface can display text files but cannot download ZIPs, copy that complete text into PowerShell. It verifies the patch's SHA-256 before writing `Downloads/spectrum-incremental.patch`; it does not apply changes, run Git, stop services or touch database records. An incomplete copy must fail rather than silently write an incomplete patch. Payload round-trip integrity is checked in the package generator; PowerShell execution itself was not tested on the user's Windows machine. After recovering the file, use the incremental preflight instructions above in the intended source copy.

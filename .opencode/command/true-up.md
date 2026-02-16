---
description: Sync skynetcms branch with upstream OpenCode
---

# True-Up: Sync with Upstream OpenCode

Synchronize the `skynetcms` branch with the latest upstream `dev` branch.

## Workflow

1. Fetch upstream changes
2. Update local dev branch from upstream/dev
3. Merge dev into skynetcms branch
4. Handle conflicts (auto-resolve favoring SkyNetCMS, stop if complex)
5. Commit if merge successful (do NOT push)

## Conflict Resolution Strategy

When resolving conflicts, prioritize keeping SkyNetCMS modifications:

**Always keep ours (skynetcms):**

- `packages/opencode/src/util/base-path.ts`
- `packages/opencode/src/server/app.ts`
- `packages/opencode/script/generate-app-manifest.ts`
- Any basePath-related code in config, network, server files

**Accept upstream for:**

- Unrelated feature additions
- Bug fixes that don't touch SkyNetCMS-modified areas
- Documentation updates

**Stop and notify if:**

- Conflict affects core SkyNetCMS functionality
- Multiple valid resolution paths exist
- Upstream refactored files we modified

## Execution Steps

```bash
# 1. Ensure we're on skynetcms branch
git checkout skynetcms

# 2. Fetch upstream
git fetch upstream

# 3. Check upstream version
git log upstream/dev -1 --oneline

# 4. Update local dev from upstream
git checkout dev
git merge upstream/dev --ff-only

# 5. Return to skynetcms and merge
git checkout skynetcms
git merge dev -m "chore: true-up with upstream dev"
```

If `--ff-only` fails on dev, investigate - the fork's dev branch may have diverged from upstream.

## Post-Merge Checklist

After successful merge, verify before pushing:

1. `bun install` - Update dependencies if package.json changed
2. `bun test` - Ensure tests pass
3. `bun run typecheck` - Check for type errors
4. Test OpenCode locally with basePath if server code changed

## Important

- Do NOT push automatically - let user verify first
- If merge conflicts occur that can't be auto-resolved, output the conflicting files and stop
- After user resolves conflicts manually, they should run: `git add . && git commit`

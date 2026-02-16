---
description: Sync skynetcms branch with upstream OpenCode release
---

# True-Up: Sync with Upstream OpenCode

Synchronize the `skynetcms` branch with a specific upstream release tag.

## Arguments

`$ARGUMENTS` - Target version (optional)

Examples:

- `/true-up v1.1.65` - Specific version with v prefix
- `/true-up 1.1.65` - Without v prefix (normalized internally)
- `/true-up 65` - Short form (assumes current minor v1.1.x)
- `/true-up latest` - Resolve to latest upstream tag

If no argument provided: list last 10 upstream release tags and ask user to choose.

## Workflow

### Step 1: Version Resolution

If no argument provided:

1. Fetch upstream tags: `git fetch upstream --tags`
2. List last 10 release tags: `git tag -l 'v1.*' --sort=-v:refname | head -10`
3. Highlight "stable" releases (patch version divisible by 10: v1.1.60, v1.1.50)
4. Ask user to select a version

If argument provided:

1. Normalize version to `vX.Y.Z` format
2. Handle short forms: `65` → `v1.1.65`, `1.1.65` → `v1.1.65`
3. Handle `latest`: resolve to most recent tag

### Step 2: Validation

1. Fetch upstream: `git fetch upstream --tags`
2. Verify tag exists: `git tag -l "{version}"` must return the tag
3. Check if `{version}-sn` already exists - warn user if so
4. If tag doesn't exist, show error and list similar tags

### Step 3: Merge

```bash
git checkout skynetcms
git merge {version} -m "chore: true-up with upstream {version}"
```

Note: Merge the TAG directly, not the dev branch.

### Step 4: Create SkyNetCMS Tag

After successful merge:

```bash
git tag {version}-sn
```

Example: `v1.1.65` → `v1.1.65-sn`

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

## Post-Merge Checklist

After successful merge, verify before pushing:

1. `bun install` - Update dependencies if package.json changed
2. `bun test` - Ensure tests pass
3. `bun run typecheck` - Check for type errors
4. Test OpenCode locally with basePath if server code changed

## Important

- Do NOT push automatically - let user verify first
- Do NOT push tags until user confirms everything works
- If merge conflicts occur that can't be auto-resolved, output the conflicting files and stop
- After user resolves conflicts manually, they should run: `git add . && git commit`
- Then create the tag manually: `git tag {version}-sn`

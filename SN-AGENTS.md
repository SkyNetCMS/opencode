# SkyNetCMS OpenCode Fork

Fork of [OpenCode](https://github.com/anomalyco/opencode) for [SkyNetCMS](https://github.com/SkyNetCMS/SkyNetCMS).

## Branch Topology

| Branch         | Purpose                                      |
| -------------- | -------------------------------------------- |
| `upstream/dev` | Upstream OpenCode (anomalyco/opencode)       |
| `origin/dev`   | Fork's dev, kept in sync with upstream       |
| `skynetcms`    | **Working branch** - SkyNetCMS modifications |

## Why This Fork Exists

SkyNetCMS embeds OpenCode at `opencode-src/` (submodule). Required modifications:

1. **Base Path Support** - Run behind nginx at `/sn_admin/oc/`
2. **Embedded Assets** - Self-hosted without external CDN

## Key Modified Files

- `packages/opencode/src/util/base-path.ts` - Path utilities
- `packages/opencode/src/server/app.ts` - Asset serving
- `packages/opencode/src/config/config.ts` - basePath config
- `packages/opencode/script/generate-app-manifest.ts` - Asset bundling

## Syncing with Upstream

Run `/true-up` to merge latest upstream changes.

## Proposing Upstream Changes

1. Branch from `dev`
2. Implement generically (no SkyNetCMS-specific code)
3. PR to `anomalyco/opencode`
4. Flows back via `/true-up` after merge

# SkyNetCMS OpenCode Fork

Fork of [OpenCode](https://github.com/anomalyco/opencode) for [SkyNetCMS](https://github.com/SkyNetCMS/SkyNetCMS).

## Branch Topology

| Branch         | Purpose                                      |
| -------------- | -------------------------------------------- |
| `upstream/dev` | Upstream OpenCode (anomalyco/opencode)       |
| `origin/dev`   | Fork's dev, kept in sync with upstream       |
| `skynetcms`    | **Working branch** - SkyNetCMS modifications |

## Why This Fork Exists

SkyNetCMS uses the OpenCode binary from a Docker image published by this fork. Required modifications:

1. **Base Path Support** - Run behind nginx at `/sn_admin/oc/`
2. **Embedded Assets** - Self-hosted without external CDN

## Integration with SkyNetCMS

SkyNetCMS consumes the `opencode` binary from the Docker image rather than embedding this repo as a git submodule. In a SkyNetCMS Dockerfile:

```dockerfile
COPY --from=ghcr.io/skynetcms/opencode:latest /usr/local/bin/opencode /usr/local/bin/opencode
```

Pin to a specific version for reproducible builds:

```dockerfile
COPY --from=ghcr.io/skynetcms/opencode:1.2.10-sn /usr/local/bin/opencode /usr/local/bin/opencode
```

## Docker Image

**Registry:** `ghcr.io/skynetcms/opencode`

**Workflow:** `.github/workflows/publish-docker.yml` (SkyNetCMS-specific, not from upstream)

| Trigger                              | Docker Tags                                                           |
| ------------------------------------ | --------------------------------------------------------------------- |
| Tag push `v*-sn` (e.g. `v1.2.10-sn`) | `:{version}` + `:latest` (e.g. `:1.2.10-sn`, `:latest`)               |
| Push to `skynetcms` branch           | `:skynetcms-preview`                                                  |
| Manual dispatch (Actions UI)         | `:{version}` + `:latest`, or `:skynetcms-preview` if no version given |

The workflow builds all 11 platform targets via the existing upstream `packages/opencode/script/build.ts`, then produces a multi-arch Docker image (`linux/amd64` + `linux/arm64`) using `packages/opencode/Dockerfile.debian` (Debian bookworm-slim, glibc). No upstream files are modified by this workflow.

The upstream `packages/opencode/Dockerfile` (Alpine, musl) is left untouched but not used by this workflow. The Debian variant is required because SkyNetCMS runs on Debian-based images where musl binaries are incompatible.

**Important:** The `v*-sn` tag and `:latest` Docker tag always correspond. Running `opencode --version` inside the container reports the same version as the Docker tag.

## Key Modified Files

- `packages/opencode/src/util/base-path.ts` - Path utilities
- `packages/opencode/src/server/app.ts` - Asset serving
- `packages/opencode/src/config/config.ts` - basePath config
- `packages/opencode/script/generate-app-manifest.ts` - Asset bundling
- `.github/workflows/publish-docker.yml` - SkyNetCMS Docker publish workflow

## SkyNetCMS-Only Files

These files exist only in this fork and should never be sent upstream:

- `.github/workflows/publish-docker.yml` - Docker image CI/CD
- `packages/opencode/Dockerfile.debian` - Debian-based Docker image (glibc)
- `SN-AGENTS.md` - This file

## Syncing with Upstream

Run `/true-up` to merge latest upstream changes. This creates a `v{version}-sn` tag which triggers the Docker image build automatically when pushed.

Typical flow:

```bash
/true-up 1.2.10                      # merge upstream tag, create v1.2.10-sn
git push origin skynetcms --tags     # pushes branch + tag, triggers Docker build
```

## Proposing Upstream Changes

1. Branch from `dev`
2. Implement generically (no SkyNetCMS-specific code)
3. PR to `anomalyco/opencode`
4. Flows back via `/true-up` after merge

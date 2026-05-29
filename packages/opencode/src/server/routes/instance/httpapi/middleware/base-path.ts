import { Effect } from "effect"
import { HttpMiddleware, HttpServerRequest } from "effect/unstable/http"
import { normalizeBasePath } from "@/util/base-path"

// SkyNetCMS: strip the configured base path prefix from the incoming request
// URL *before* routing so existing routes (e.g. `/global`, `/session/...`) match
// whether the server is reached at the root or behind a reverse proxy mounting
// it under `basePath`. Requests that already arrive at the root (because the
// proxy stripped the prefix) are left unchanged.
//
// This is implemented as a top-level HttpMiddleware (wrapping the whole app
// effect) rather than a router middleware, because route matching happens before
// router-level middleware runs — only a top-level wrapper can rewrite the URL in
// time to influence which route is selected.
//
// basePath is read synchronously from the environment (set per-listener by
// `Server.listen`). The outgoing side (asset URLs, history API) is handled by
// the UI rewriters in `server/shared/ui.ts`.
export const basePathMiddleware: HttpMiddleware.HttpMiddleware = (effect) =>
  Effect.gen(function* () {
    const basePath = normalizeBasePath(process.env["OPENCODE_BASE_PATH"])
    if (!basePath) return yield* effect

    const request = yield* HttpServerRequest.HttpServerRequest
    const stripped = stripBasePath(request.url, basePath)
    if (stripped === request.url) return yield* effect

    return yield* Effect.provideService(effect, HttpServerRequest.HttpServerRequest, request.modify({ url: stripped }))
  })

export function composeMiddleware(...middlewares: HttpMiddleware.HttpMiddleware[]): HttpMiddleware.HttpMiddleware {
  return (effect) => middlewares.reduceRight((acc, mw) => mw(acc), effect)
}

function stripBasePath(url: string, basePath: string): string {
  if (url === basePath) return "/"
  if (url.startsWith(`${basePath}/`)) return url.slice(basePath.length)
  if (url.startsWith(`${basePath}?`)) return `/${url.slice(basePath.length)}`
  return url
}

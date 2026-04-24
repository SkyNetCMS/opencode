import { Flag } from "@/flag/flag"
import { Hono } from "hono"
import { proxy } from "hono/proxy"
import { getMimeType } from "hono/utils/mime"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import { currentBasePath } from "../base-path-state"
import {
  rewriteHtmlForBasePath,
  rewriteJsForBasePath,
  rewriteCssForBasePath,
} from "../../util/base-path"

const embeddedUIPromise = Flag.OPENCODE_DISABLE_EMBEDDED_WEB_UI
  ? Promise.resolve(null)
  : // @ts-expect-error - generated file at build time
    import("opencode-web-ui.gen.ts").then((module) => module.default as Record<string, string>).catch(() => null)

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' data:"

const csp = (hash = "") =>
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'${hash ? ` 'sha256-${hash}'` : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' data:`

// CSP that allows the basePath inline script
const basePathCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' data:"

export const UIRoutes = (): Hono =>
  new Hono().all("/*", async (c) => {
    const embeddedWebUI = await embeddedUIPromise
    const path = c.req.path
    const basePath = currentBasePath

    if (embeddedWebUI) {
      const match = embeddedWebUI[path.replace(/^\//, "")] ?? embeddedWebUI["index.html"] ?? null
      if (!match) return c.json({ error: "Not Found" }, 404)

      if (await fs.exists(match)) {
        const mime = getMimeType(match) ?? "text/plain"
        c.header("Content-Type", mime)

        // When basePath is configured, rewrite asset content to include the prefix
        if (basePath) {
          const raw = await fs.readFile(match)
          if (mime.startsWith("text/html")) {
            c.header("Content-Security-Policy", basePathCsp)
            return c.body(rewriteHtmlForBasePath(new TextDecoder().decode(raw), basePath))
          }
          if (mime.includes("javascript")) {
            return c.body(rewriteJsForBasePath(new TextDecoder().decode(raw), basePath))
          }
          if (mime.includes("css")) {
            return c.body(rewriteCssForBasePath(new TextDecoder().decode(raw), basePath))
          }
          return c.body(new Uint8Array(raw))
        }

        if (mime.startsWith("text/html")) {
          c.header("Content-Security-Policy", DEFAULT_CSP)
        }
        return c.body(new Uint8Array(await fs.readFile(match)))
      } else {
        return c.json({ error: "Not Found" }, 404)
      }
    } else {
      const response = await proxy(`https://app.opencode.ai${path}`, {
        raw: c.req.raw,
        headers: {
          ...Object.fromEntries(c.req.raw.headers.entries()),
          host: "app.opencode.ai",
        },
      })

      // When basePath is configured, rewrite proxied HTML content
      if (basePath && response.headers.get("content-type")?.includes("text/html")) {
        const html = await response.text()
        const rewritten = rewriteHtmlForBasePath(html, basePath)
        return new Response(rewritten, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            "Content-Security-Policy": basePathCsp,
            "Content-Length": String(new TextEncoder().encode(rewritten).length),
          },
        })
      }

      const match = response.headers.get("content-type")?.includes("text/html")
        ? (await response.clone().text()).match(
            /<script\b(?![^>]*\bsrc\s*=)[^>]*\bid=(['"])oc-theme-preload-script\1[^>]*>([\s\S]*?)<\/script>/i,
          )
        : undefined
      const hash = match ? createHash("sha256").update(match[2]).digest("base64") : ""
      response.headers.set("Content-Security-Policy", csp(hash))
      return response
    }
  })

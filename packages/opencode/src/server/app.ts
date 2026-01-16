/**
 * Serves the embedded frontend application assets.
 * Assets are embedded into the binary at build time using Bun's file embedding.
 */

import { assets, indexHtmlPath, type Asset } from "./app-manifest"
import { rewriteHtmlForBasePath, rewriteJsForBasePath, rewriteCssForBasePath } from "../util/base-path"

// Static file extensions that should be served directly (not as SPA fallback)
const staticExtensions = new Set([
  ".js",
  ".css",
  ".json",
  ".woff2",
  ".woff",
  ".ttf",
  ".svg",
  ".png",
  ".ico",
  ".aac",
  ".webmanifest",
  ".map",
])

function isStaticAsset(path: string): boolean {
  // Check if path starts with /assets/ (Vite's default output)
  if (path.startsWith("/assets/")) return true

  // Check known static files at root
  const staticRootFiles = [
    "/favicon.ico",
    "/favicon.svg",
    "/favicon-96x96.png",
    "/apple-touch-icon.png",
    "/site.webmanifest",
    "/social-share.png",
    "/social-share-zen.png",
    "/web-app-manifest-192x192.png",
    "/web-app-manifest-512x512.png",
    "/oc-theme-preload.js",
  ]
  if (staticRootFiles.includes(path)) return true

  // Check by extension
  const ext = path.substring(path.lastIndexOf("."))
  return staticExtensions.has(ext)
}

/**
 * Serve an embedded asset with proper headers and optional basePath rewriting
 */
export async function serveApp(requestPath: string, basePath?: string): Promise<Response> {
  // Normalize path
  let path = requestPath
  if (path === "" || path === "/") {
    path = "/index.html"
  }

  // Try to find the asset
  let asset = assets.get(path)

  // If not found and not a static asset, serve index.html for SPA routing
  if (!asset && !isStaticAsset(path)) {
    asset = assets.get("/index.html")
    path = "/index.html"
  }

  // 404 if still not found
  if (!asset) {
    return new Response("Not Found", { status: 404 })
  }

  // Read the file content
  const file = Bun.file(asset.path)
  let content: string | ArrayBuffer = await file.arrayBuffer()

  // Apply basePath rewriting if needed
  if (basePath) {
    const mime = asset.mime
    if (mime.includes("text/html")) {
      content = rewriteHtmlForBasePath(await file.text(), basePath)
    } else if (mime.includes("javascript") || path.endsWith(".js")) {
      content = rewriteJsForBasePath(await file.text(), basePath)
    } else if (mime.includes("text/css") || path.endsWith(".css")) {
      content = rewriteCssForBasePath(await file.text(), basePath)
    }
  }

  // Determine cache headers
  // Hashed assets (in /assets/) can be cached forever
  // Other files should revalidate
  const isHashedAsset = path.startsWith("/assets/")
  const cacheControl = isHashedAsset ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate"

  const headers: Record<string, string> = {
    "Content-Type": asset.mime,
    "Cache-Control": cacheControl,
  }

  // Add CSP header for HTML (only when not using basePath with inline scripts)
  if (asset.mime.includes("text/html") && !basePath) {
    headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  }

  return new Response(content, { headers })
}

/**
 * Check if embedded app assets are available
 */
export function hasEmbeddedApp(): boolean {
  return assets.size > 0
}

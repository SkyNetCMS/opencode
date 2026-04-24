// Shared mutable state for the current server basePath.
// Extracted to its own module to avoid circular imports between
// server.ts and routes/ui.ts.
export let currentBasePath = ""

export function setCurrentBasePath(value: string) {
  currentBasePath = value
}

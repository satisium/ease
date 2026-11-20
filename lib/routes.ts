export const ROUTES = {
  home: "/",
  app: "/app",
  stage: "/app",
  docs: "/docs",
  docsPresets: "/docs/presets",
  docsSprings: "/docs/springs",
  docsExports: "/docs/exports",
  changelog: "/docs/changelog",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
} as const

export type RouteKey = keyof typeof ROUTES
export type Route = (typeof ROUTES)[RouteKey]

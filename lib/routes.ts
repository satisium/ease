export const ROUTES = {
  home: "/",
  app: "/app",
  stage: "/app",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
} as const

export type RouteKey = keyof typeof ROUTES
export type Route = (typeof ROUTES)[RouteKey]

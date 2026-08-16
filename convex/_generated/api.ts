import { anyApi } from 'convex/server'

// Hand-written stand-in for Convex's CLI-generated api.ts.
// The Convex CLI (`npx convex dev`) cannot reach the network in this
// environment, so `anyApi` (a proxy that resolves any `api.module.function`
// path at call time) stands in for the fully-typed generated api object.
// Regenerate with the CLI once network access is restored.
export const api = anyApi
export const internal = anyApi

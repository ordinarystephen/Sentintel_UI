/** The app-wide API instance. Components go through the hooks in ./hooks. */
import { createApi } from './client'

export const api = createApi()
export { ApiError } from './client'
export type { SentinelApi } from './client'
export * from './types'

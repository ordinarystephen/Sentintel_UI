/**
 * `sentinel.lastApp` — which application the user entered last (localStorage,
 * NOT mock state: it is a UI preference like the theme). The entry decision
 * at `/` sends a multi-entitlement user back to their last-used app;
 * `/apps` always shows the landing page regardless.
 */
import { isAppId, type AppId } from '@/apps'
import { storageKey } from '@/lib/usePersistedState'

const KEY = storageKey('lastApp')

export function readLastApp(): AppId | null {
  try {
    const raw = localStorage.getItem(KEY)
    return isAppId(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeLastApp(id: AppId): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* storage unavailable: the landing shows again next visit */
  }
}

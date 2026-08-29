/**
 * Deep links (build-spec §4/§5.3): `/review/:id#sec-2` and friends. On every
 * navigation whose hash names an element, scroll the canvas to it and flash it
 * once in a neutral tone (the `flash-once` utility in base.css, ~1.4s). The
 * class is toggled directly on the DOM node — React never owns it — and the
 * `void offsetWidth` reflow restarts the animation on repeat clicks, exactly
 * as the mockup does. Smooth scrolling yields to prefers-reduced-motion.
 *
 * `ready` lets a screen defer the scroll until its content has rendered.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useHashTarget(ready = true): void {
  const { hash, key } = useLocation()
  const id = hash.startsWith('#') ? decodeURIComponent(hash.slice(1)) : ''

  useEffect(() => {
    if (!ready || !id) return
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
    el.classList.remove('flash-once')
    void el.offsetWidth
    el.classList.add('flash-once')
    const t = window.setTimeout(() => el.classList.remove('flash-once'), 1500)
    return () => window.clearTimeout(t)
  }, [id, key, ready])
}

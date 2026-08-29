/** Derived item/section state shared by the work paper components. */
import type { Section, WorkItem } from '@/api/types'

/** Flagged on screen = below the floor and not yet verified — the same rule the export applies. */
export const isFlagged = (item: WorkItem) =>
  item.flags.includes('review_required') && !item.verifiedAt

export function sectionCounts(section: Section) {
  return {
    reviewRequired: section.items.filter(isFlagged).length,
    unresolved: section.items.filter((i) => i.via === 'unresolved').length,
  }
}

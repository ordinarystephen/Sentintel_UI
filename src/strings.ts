/**
 * ALL user-facing navigation and tab names live here (build-spec §2).
 *
 * The left-nav items ("My reviews", "All reviews") and the right-rail tab names
 * ("Why", "Respond", "Debate", "Prior") are placeholders Steve intends to rename.
 * Every rendered instance must read from this file — never inline these strings
 * in a component, so a rename is a one-file change.
 */
export const strings = {
  app: {
    brand: 'Sentinel',
    healthReady: 'ready',
  },
  nav: {
    home: 'Home',
    myReviews: 'My reviews',
    allReviews: 'All reviews',
    documents: 'Documents',
    policyLibrary: 'Policy library',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
  },
  contextRail: {
    header: 'Context',
    tabs: {
      why: 'Why',
      respond: 'Respond',
      debate: 'Debate',
      prior: 'Prior',
    },
  },
  theme: {
    selectLabel: 'Theme',
    stone: 'Stone',
    cobalt: 'Cobalt',
    toggleDark: 'Toggle dark mode',
  },
} as const

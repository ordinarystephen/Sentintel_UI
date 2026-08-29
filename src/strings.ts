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
    overview: 'Overview',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
  },
  contextRail: {
    header: 'Context',
    toggle: 'Toggle context rail',
    noSelection: 'No item selected',
    emptyBody: 'Select a work paper item to see how it got here.',
    tabs: {
      why: 'Why',
      respond: 'Respond',
      debate: 'Debate',
      prior: 'Prior',
    },
  },
  reviews: {
    title: 'Reviews',
    tabs: { my: 'My', all: 'All' },
    myIntro: 'Your reviews, most recent first.',
    allIntro:
      'Every review across the team. Open any review to read it; editing stays with its owner.',
  },
  documents: {
    title: 'Documents',
    sub: 'Search everything Sentinel has read — every document, every parsed passage.',
  },
  review: {
    exportReview: 'Export Review',
    workpaperHeading: 'Work paper',
    sectionPending: 'Not yet populated.',
    disclaimer:
      'Sentinel is not the system of record. Confirm figures against the source documents before relying on them.',
  },
  policy: {
    stub: 'The policy corpus the checks run against. Browsing arrives after the MVP.',
  },
  notFound: {
    title: 'Nothing here',
    body: 'That address does not match a screen in Sentinel.',
    home: 'Back to Start a review',
  },
  theme: {
    selectLabel: 'Theme',
    stone: 'Stone',
    cobalt: 'Cobalt',
    toggleDark: 'Toggle dark mode',
  },
} as const

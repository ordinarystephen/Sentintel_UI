/**
 * ALL user-facing copy lives in this file — nav names, screen titles and
 * subtitles, button labels, hints and placeholders, empty states, toasts,
 * micro-labels, the disclaimer. Components never carry their own words, so
 * changing wording never requires opening a component file.
 *
 * How to edit safely (see docs/editing-copy.md for the full map):
 *  - Change only the text between the quotes. Keep the quotes, keep the
 *    trailing commas.
 *  - Pieces in {curly braces} like '{n}' or '{owner}' are fill-ins the app
 *    replaces at runtime (a count, a name, a date). Keep them — you may move
 *    them within the sentence, but don't delete or rename them.
 *  - Where wording differs by count there is a pair: `...One` is used for
 *    exactly one, `...Other` for any other number.
 *
 * Naming note: the left-nav items ("My reviews", "All reviews") and the
 * context-rail tab names ("Why", "Respond", "Debate", "Prior") are
 * placeholders pending the naming workshop — rename them right here.
 */
export const strings = {
  /* ════════ Shared bits used on several screens ════════ */
  common: {
    pageRef: 'p. {n}', // the mono page reference on quotes, items, and search hits
  },

  /* ════════ Masthead & app chrome ════════ */
  app: {
    brand: 'Sentinel',
    healthReady: 'ready',
    skipToContent: 'Skip to content',
    dismissToast: 'Dismiss',
  },
  theme: {
    selectLabel: 'Theme',
    stone: 'Stone',
    cobalt: 'Cobalt',
    toggleDark: 'Toggle dark mode',
    textSizeLabel: 'Text size',
    textSizeS: 'S',
    textSizeM: 'M',
    textSizeL: 'L',
    textSizeSmall: 'Small text',
    textSizeMedium: 'Medium text (default)',
    textSizeLarge: 'Large text',
  },

  /* ════════ Suite landing + application switcher ════════ */
  suite: {
    apps: {
      /* Descriptions are single-line Steve-drafts — wordsmithing later. */
      crr: {
        short: 'CRR',
        full: 'Credit Risk Review',
        description: 'Deep-dive credit review files, purpose-built for CRR.',
      },
      erm: {
        short: 'ERM',
        full: 'Enterprise Risk Management',
        description: 'Portfolio-level insights and analysis.',
      },
      vantage: {
        short: 'Vantage',
        full: 'P&C',
        description: 'Generic document extraction and insights.',
      },
    },
    landingAria: 'Applications',
    open: 'Open',
    inDesign: 'In design',
    allApplications: 'All applications',
    switcherAria: 'Switch application',
    currentApp: 'Current application',
    fictionalNote: 'All data in this demonstration build is fictional.',
  },

  /* ════════ Left rail (app navigation) ════════ */
  nav: {
    appNavAria: 'App navigation',
    home: 'Home',
    myReviews: 'My reviews',
    allReviews: 'All reviews',
    documents: 'Documents',
    policyLibrary: 'Policy library',
    overview: 'Overview',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
  },

  /* ════════ Landing — Start a review (/) ════════ */
  landing: {
    eyebrow: 'Credit analysis',
    title: 'Start a review',
    sub: 'Drop the documents for one borrower. Sentinel reads them, runs the policy checks, and assembles the work paper.',
    dropBig: 'Drag documents here',
    dropOr: 'or',
    browse: 'browse files',
    dropHint: 'PDF · one borrower per review',
    dropAria: 'Upload documents',
    chooseFilesAria: 'Choose PDF files',
    fileListAria: 'Documents to review',
    removeFile: 'Remove file',
    onlyPdf: 'Only PDF files can be reviewed — skipped:',
    contextLabel: 'Anything Sentinel should know?',
    optional: 'optional',
    contextPlaceholder:
      'Context or questions, one per line — e.g. Focus on covenant headroom. What is revolver availability at close?',
    begin: 'Begin review',
    documentCountOne: '1 document',
    documentCountOther: '{n} documents',
    advanced: 'Advanced extraction settings',
    parser: 'Parser',
    preset: 'Section preset',
    concurrency: 'Concurrency',
    recent: 'Recent',
    noRecents: 'Your reviews will appear here once you start one.',
    newReview: 'New review — reading…',
    openBadge: '{n} open',
    sectionsComplete: '{n}/6 sections',
  },

  /* ════════ Processing state of /review/:id ════════ */
  /* (The cycling status line itself comes from the backend — in demo mode,
     edit it in src/api/mock/mockApi.ts › MESSAGES.) */
  processing: {
    title: 'Reading the documents',
    away: 'This usually takes a few minutes. You can leave — the review will be waiting in your recents.',
    cancel: 'Cancel this review',
    cancelled: 'This review was cancelled.',
    failedEyebrow: 'Processing failed',
    startAnother: 'Start another review',
  },

  /* ════════ Review page (/review/:id) ════════ */
  review: {
    loading: 'Opening the review…',
    exportReview: 'Export Review',
    exporting: 'Exporting…',
    exported: 'Exported {fileName}',
    runCompleted: 'Run completed {time} · {documents}',
    documentsOne: '1 document',
    documentsOther: '{n} documents',
    storyHeading: 'The story',
    storyAside: 'what the documents say is going on',
    priorArrow: 'prior {prior} → current {current}',
    attentionHeading: 'Needs your attention',
    openBadge: '{n} open',
    reviewedTally: '{n} reviewed',
    attentionEmpty:
      'Nothing needs your attention. Every value was read above the confidence floor and no flags were raised.',
    sectionLink: 'Section {n} →',
    reviewRequired: 'review required',
    reviewRequiredMark: '⚠ review required',
    unresolved: 'unresolved',
    question: 'question',
    reviewedNote: 'Reviewed — "{note}"',
    reviewedPlain: 'Reviewed',
    dismissed: 'Dismissed',
    workpaperHeading: 'Work paper',
    workpaperAside: '6 sections · {n} populated',
    populated: 'populated',
    notPopulated: 'not yet populated',
    reviewReqChip: '{n} review req.',
    unresolvedChip: '{n} unresolved',
    flagLine: 'Read below the OCR confidence floor — the Word export flags this value.',
    unresolvedText: 'No content extracted for this concept.',
    reasoningStubbed: 'reasoning stubbed',
    verdict: 'Verdict: {verdict}',
    verdictNone: '—',
    snippets: '{n} retrieved snippet(s)',
    viewSource: 'View source',
    reRunning: 're-running…',
    verified: 'verified',
    clearedChip: 'cleared — {reason} · struck on screen, omitted from the exported review',
    notApplicable: 'not applicable',
    incorrect: 'incorrect',
    disclaimer: 'This tool augments your analysis; it is not the system of record.',
    /* — Areas of assessment (the management-summary verdicts) — */
    areasHeading: 'Areas of assessment',
    areasPendingBadge: '{n} pending',
    areasCount: '{n} areas',
    areasTallySat: '{n} satisfactory',
    areasTallyUnsat: '{n} unsatisfactory',
    areasTallyNa: '{n} n/a',
    ratingSatisfactory: 'satisfactory',
    ratingUnsatisfactory: 'unsatisfactory',
    ratingNa: 'n/a',
    ratingPending: 'pending',
    supportingLink: 'Supporting: Section {n} →',
    resolveLink: 'Resolve in Section {n} →',
    thenSet: 'then set:',
    setSatisfactory: 'Satisfactory',
    setUnsatisfactory: 'Unsatisfactory',
    /* — Reference data disclosure — */
    refData: 'Reference data',
    refDataMeta: 'upstream · as of {date}',
    refUpstream: 'upstream',
    refCrr: 'CRR',
  },

  /* ════════ Attention row actions (on the review page) ════════ */
  attention: {
    dismiss: 'dismiss',
    dismissAria: 'Dismiss flag: {title}',
    markReviewed: 'mark reviewed',
    markReviewedAria: 'Mark reviewed: {title}',
    edit: 'edit',
    editAria: 'Edit note: {title}',
    unreview: 'un-review',
    unreviewAria: 'Un-review: {title}',
    notePlaceholder: 'What you checked, in a line',
    noteLabel: 'Review note',
    save: 'Save',
    cancel: 'Cancel',
  },

  /* ════════ Right context rail (review page) ════════ */
  contextRail: {
    header: 'Context',
    toggle: 'Toggle context rail',
    resizeHandle: 'Resize context rail',
    resizeHint: 'Drag to resize · double-click to reset',
    noSelection: 'No item selected',
    emptyBody: 'Select a work paper item to see how it got here.',
    tabs: {
      why: 'Why',
      respond: 'Respond',
      debate: 'Debate',
      prior: 'Prior',
    },
  },
  rail: {
    selectItem: 'Select this item',
    readOnly:
      'Read-only — this review belongs to {owner}. Open it to read; editing stays with its owner.',
    howHeading: 'How this got here',
    policiesHeading: 'Applied policies & standards',
    viewStandard: 'View standard',
    viewPolicy: 'View policy',
    noPolicies: 'No policy or standard cited this item.',
    whyNote:
      'Every output shows its reasoning chain and the standards it was held to — the same trail the export and the audit record carry.',
    respondHeading: 'Respond to Sentinel',
    respondPlaceholder:
      'Correct the value, add context, or say what to re-check — Sentinel re-runs this item with your direction.',
    sendRerun: 'Send & re-run',
    markVerified: 'Mark verified',
    respondedNote: 'Sent: “{note}”',
    clearHeading: 'Clear from workpaper',
    notApplicable: 'Not applicable',
    incorrect: 'Incorrect',
    cleared: 'cleared',
    undo: 'undo',
    cancel: 'Cancel',
    rationaleLabel: 'Clear rationale',
    rationalePlaceholder: 'Why — one line, recorded with the clear',
    rationaleRequired: 'Add a one-line rationale — it is recorded with the clear.',
    confirmClear: 'Clear — {reason}',
    clearNote:
      'Cleared content stays on screen — struck through, with your rationale beside it — so the QC trail is visible while you work. The exported review simply renders without it. Nothing is silently deleted.',
    advocate: 'Advocate',
    dissent: 'Dissent',
    cites: 'cites: {citations}',
    debateNote:
      'Positions are advisory. The analyst’s disposition decides — and both positions ride into the review record.',
    debateEmpty: 'No advocate or dissent positions were produced for this item.',
    sinceHeading: 'Since the {date} review',
    openPrior: 'Open the {date} review',
    priorNote:
      'Shown only when the borrower has prior reviews. The story’s timeline covers what changed within this run’s documents; this tab covers what changed between reviews.',
    noSelectionBody: 'Select a work paper item to see how it got here.',
  },

  /* ════════ Source modal (evidence viewer) ════════ */
  source: {
    title: 'Evidence — {section}',
    close: 'Close',
    page: 'page {n}',
    sectionImage: 'section image',
    pageImage: 'page image',
    imageAria: 'Source image',
    noImage:
      'The source image isn’t available for this passage. The quote above is the extracted text.',
  },

  /* ════════ Reviews list (/reviews, /reviews/all) ════════ */
  reviews: {
    title: 'Reviews',
    tabs: { my: 'My', all: 'All' },
    searchPlaceholder: 'Search borrower, CL number, sector…',
    searchAria: 'Search reviews',
    lobAria: 'Line of business',
    allLobs: 'All lines of business',
    ownerAria: 'Owner',
    allOwners: 'All owners',
    periodAria: 'Period',
    period12m: 'Last 12 months',
    periodAll: 'All time',
    countOne: '1 review · showing most recent',
    countOther: '{n} reviews · showing most recent',
    readOnlyNote: 'Team view — open any review to read it; editing stays with its owner.',
    you: 'you',
    readOnly: 'read-only',
    repeat: '{ordinal} in 12 mo',
    processingAria: 'Processing',
    emptyMy: 'Your reviews will appear here once you start one.',
    emptyAll: 'No reviews match. Try a borrower name, a CL number, or a sector.',
  },
  /* Short line-of-business tags shown on list rows. */
  lobShort: {
    'IB Lending': 'IB',
    'Wealth Management': 'WM',
    'Counterparty Credit Risk': 'CCR',
  } as Record<string, string>,

  /* ════════ Documents (/documents) ════════ */
  documents: {
    eyebrow: 'Document repository',
    title: 'Documents',
    sub: 'Search everything Sentinel has read — every document, every parsed passage.',
    searchPlaceholder: 'Search passages…',
    searchAria: 'Search documents',
    lobAria: 'Line of business',
    allLobs: 'All lines of business',
    counterpartyAria: 'Counterparty',
    allCounterparties: 'All counterparties',
    docTypeAria: 'Document type',
    allTypes: 'All types',
    advanced: 'Advanced search',
    advancedHelp: [
      ['"quoted phrase"', 'must appear verbatim'],
      ['-word', 'excludes passages containing it'],
      ['bare words', 'match any, by stem — more matches rank higher'],
    ] as ReadonlyArray<readonly [string, string]>,
    countLine: '{passages} in {documents} · {order}',
    passagesOne: '1 passage',
    passagesOther: '{n} passages',
    documentsOne: '1 document',
    documentsOther: '{n} documents',
    orderRelevance: 'sorted by relevance',
    orderRecent: 'most recent first',
    extracted: 'extracted',
    notExtracted: 'not yet extracted',
    browseCountOne: '1 document · newest first',
    browseCountOther: '{n} documents · newest first',
    selectDocAria: 'Select document: {fileName}',
    previewAction: 'Preview extracted text',
    previewUnavailable: 'Available once extraction completes',
    downloadAction: 'Download original',
    downloaded: 'Downloaded {fileName}',
    previewTitle: '{fileName} — extracted text',
    previewPagesOne: '1 page',
    previewPagesOther: '{n} pages',
    previewParsed: 'parsed {date}',
    previewSectionsOne: '1 section',
    previewSectionsOther: '{n} sections',
    pageRange: 'pp. {start}–{end}',
    counterpartyPill: 'Counterparty · {name}',
    typePill: 'Type · {type}',
    viewSource: 'View source',
    usedIn: 'Used in {borrower} review →',
    empty: 'No passages match. Loosen a filter, or try different words.',
  },

  /* ════════ Policy library stub (/policy) ════════ */
  policy: {
    stub: 'The policy corpus the checks run against. Browsing arrives after the MVP.',
  },

  /* ════════ Render-error screen (route error boundary) ════════ */
  errorScreen: {
    eyebrow: 'Something broke',
    title: 'This screen failed to render',
    intro: 'The error below is shown verbatim — include it if you report this.',
    back: 'Back to My reviews',
  },

  /* ════════ Not found ════════ */
  notFound: {
    title: 'Nothing here',
    body: 'That address does not match a screen in Sentinel.',
    home: 'Back to Start a review',
  },
} as const

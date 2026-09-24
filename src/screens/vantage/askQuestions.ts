/**
 * The Ask screen's question arithmetic (v1.8). A run carries one or many
 * questions: in one-off mode the typed question and the reviewed file's
 * questions COMBINE into one run — typed first, then the file's rows in
 * file order; blanks never count.
 */
export function combineQuestions(typed: string, fileQuestions: readonly string[]): string[] {
  return [typed, ...fileQuestions].map((q) => q.trim()).filter((q) => q.length > 0)
}

/**
 * The title "Save as a question set" prefills from a question file: the
 * file's stem, underscores/hyphens as spaces (`Watchlist_Qs.xlsx` →
 * `Watchlist Qs`). A starting point — the modal lets the user rename it.
 */
export function deriveSetTitle(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The live Policy-search browse filter — number, title or id substring. */
export function filterPolicies<T extends { id: string; title: string }>(
  docs: readonly T[],
  term: string,
): T[] {
  const q = term.trim().toLowerCase()
  if (!q) return [...docs]
  return docs.filter((d) => `${d.id} ${d.title}`.toLowerCase().includes(q))
}

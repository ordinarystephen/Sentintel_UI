/**
 * A sortable results-table header, shared by the monitor and the
 * single-question shape so the header markup exists once. aria-sort sits
 * on the <th> (the APG sortable-table pattern); inside it a real <button>
 * fills the whole cell, so the entire header is still the click target AND
 * a Tab stop — Enter/Space sort natively. The padding lives on the button,
 * not the th, so the layout is unchanged. The direction glyph is decorative
 * (aria-sort carries the state). The ring is drawn inside the cell: the
 * table's overflow-x-auto, rounded wrapper would clip an outset one.
 */
export function SortHeader({
  label,
  active,
  desc,
  onSort,
}: {
  label: string
  active: boolean
  desc: boolean
  onSort: () => void
}) {
  return (
    <th
      aria-sort={active ? (desc ? 'descending' : 'ascending') : undefined}
      className="border-b border-rule-strong bg-bg-subtle p-0 text-left"
    >
      <button
        type="button"
        onClick={onSort}
        className="block w-full px-3 py-[9px] text-left text-micro font-semibold whitespace-nowrap text-muted hover:text-ink focus-visible:-outline-offset-2"
      >
        {label}
        {active && (
          <span aria-hidden="true" className="text-ink">
            {desc ? ' ↓' : ' ↑'}
          </span>
        )}
      </button>
    </th>
  )
}

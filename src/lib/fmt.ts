/**
 * Copy helpers. All wording lives in src/strings.ts as plain quoted strings
 * with {name} fill-ins; components render them through these two functions,
 * so editing copy never means editing a component.
 */

/** Fill {name} placeholders from params. Unknown placeholders are left visible. */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in params ? String(params[key]) : m,
  )
}

/** Pick the `...One` / `...Other` template by count and fill {n}. */
export function plural(n: number, one: string, other: string): string {
  return fmt(n === 1 ? one : other, { n })
}

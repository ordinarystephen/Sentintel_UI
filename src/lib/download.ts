/** Hand the browser a file to save (export DOCX, original PDF). */
export function download(blob: Blob, fileName: string): void {
  if (typeof URL.createObjectURL !== 'function') return // jsdom
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

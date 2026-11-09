/** Balance each visual row instead of leaving a short final row aligned to the left. */
export function balancedRows<T>(items: readonly T[], width: number, minimum = 148, gap = 24): T[][] {
  if (!items.length) return []
  const capacity = Math.max(1, Math.floor((Math.max(width, minimum) + gap) / (minimum + gap)))
  const rowCount = Math.ceil(items.length / capacity)
  const base = Math.floor(items.length / rowCount)
  const extra = items.length % rowCount
  let offset = 0
  return Array.from({ length: rowCount }, (_, index) => {
    const size = base + (index < extra ? 1 : 0)
    const row = items.slice(offset, offset + size)
    offset += size
    return row
  })
}

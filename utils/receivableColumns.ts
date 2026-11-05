export interface ReceivableColumnPreference {
  hidden: boolean
  width: number
}
export interface ReceivableColumnOption {
  key: string
  title: string
  width: number
  locked?: boolean
  hidden?: boolean
}

/** 只恢复已知列；固定身份与操作列始终可见，旧配置和损坏宽度不能破坏表格。 */
export function normalizeReceivableColumns(options: ReceivableColumnOption[], stored: unknown) {
  const input =
    stored && typeof stored === 'object' ? (stored as Record<string, Partial<ReceivableColumnPreference>>) : {}
  return Object.fromEntries(
    options.map((option) => {
      const saved = input[option.key]
      return [
        option.key,
        {
          hidden: option.locked ? false : typeof saved?.hidden === 'boolean' ? saved.hidden : !!option.hidden,
          width: Number.isFinite(saved?.width) ? Math.max(90, Math.min(600, Number(saved?.width))) : option.width
        }
      ]
    })
  ) as Record<string, ReceivableColumnPreference>
}

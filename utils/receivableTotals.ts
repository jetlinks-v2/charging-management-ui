/** 本页金额以整数分累加，超出JS安全整数也不丢失尾数。正式财务计算仍由后端执行。 */
export function sumMoney(values: string[]) {
  const cents = values.reduce((total, value) => {
    if (!/^-?\d+(\.\d{1,2})?$/.test(value)) throw new Error('Invalid money value')
    const negative = value.startsWith('-'),
      [whole, fraction = ''] = value.replace('-', '').split('.')
    const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
    return total + (negative ? -amount : amount)
  }, 0n)
  const absolute = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

import dayjs from 'dayjs'
import type { EChartsCoreOption } from 'echarts/core'
import type { OverviewResult } from '../api/financeOverview'

/** 大额金额先用十进制整数换单位，避免展示数字经过浮点计算丢失分位。 */
export function overviewMoney(value: string | undefined, tenThousands = true): string {
  if (value == null || !/^-?\d+(\.\d{1,2})?$/.test(value)) return '—'
  const negative = value.startsWith('-'),
    [whole, decimals = ''] = value.replace('-', '').split('.')
  const cents = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'))
  const scaled = tenThousands ? (cents + 5000n) / 10000n : cents
  return `${negative && scaled ? '-' : ''}${(scaled / 100n).toLocaleString('zh-CN')}.${(scaled % 100n).toString().padStart(2, '0')}`
}

type Translator = (key: string) => string
const blue = '#1677ff',
  pale = '#c8defa',
  red = '#d35c50',
  green = '#269b79',
  orange = '#d99746'
const plotted = (amount: string) => Number(amount) / 10000
const base = (): EChartsCoreOption => ({
  animation: false,
  aria: { enabled: true },
  textStyle: { fontFamily: 'inherit', color: '#595959', fontSize: 12 },
  tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
  grid: { top: 12, right: 16, bottom: 12, left: 8, containLabel: true }
})

interface BarRow {
  name: string
  amount: string
  paid?: string
  unpaid?: string
}
function horizontal(rows: BarRow[], t: Translator, stacked = false, color = blue): EChartsCoreOption {
  const series = stacked
    ? [
        { key: 'paid', name: t('Overview.paid'), color: blue },
        { key: 'unpaid', name: t('Overview.unpaid'), color: pale }
      ]
    : [{ key: 'amount', name: t('Overview.amount'), color }]
  return {
    ...base(),
    legend: stacked ? { top: 0, left: 8, itemWidth: 9, itemHeight: 9 } : undefined,
    grid: { top: stacked ? 35 : 12, right: 32, bottom: 12, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: { hideOverlap: true },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((r) => r.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { width: 100, overflow: 'truncate' }
    },
    dataZoom:
      rows.length > 8
        ? [
            { type: 'slider', yAxisIndex: 0, right: 0, width: 12, startValue: 0, endValue: 7, showDetail: false },
            { type: 'inside', yAxisIndex: 0, zoomOnMouseWheel: false, moveOnMouseWheel: true }
          ]
        : [],
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      stack: 'amount',
      barMaxWidth: 18,
      itemStyle: { color: s.color },
      data: rows.map((r) => {
        const amount = r[s.key as keyof BarRow] || '0.00'
        return { value: plotted(amount), rawAmount: amount }
      })
    })),
    tooltip: {
      trigger: 'axis',
      confine: true,
      renderMode: 'richText',
      formatter: (input: unknown) => {
        const values = input as { name: string; seriesName: string; data: { rawAmount: string } }[]
        return [
          values[0]?.name || '',
          ...values.map((v) => `${v.seriesName}  ${overviewMoney(v.data.rawAmount)} ${t('Overview.wan')}`)
        ].join('\n')
      }
    }
  }
}

export function collectionOption(result: OverviewResult, t: Translator) {
  return horizontal(
    result.receivables.subjects.map((row) => ({
      name: row.subjectName || t('Overview.unknownSubject'),
      amount: row.amounts.netAmount,
      paid: row.amounts.receivedAmount,
      unpaid: row.amounts.unreceivedAmount
    })),
    t,
    true
  )
}
export function arrearsOption(result: OverviewResult, dimension: string, t: Translator) {
  const rows =
    dimension === 'age'
      ? result.receivables.ageBuckets.map((row) => ({ name: t('Overview.' + row.key), amount: row.amount }))
      : result.receivables.subjects
          .filter((row) => Number(row.amounts.overdueAmount) > 0)
          .map((row) => ({ name: row.subjectName || t('Overview.unknownSubject'), amount: row.amounts.overdueAmount }))
  return horizontal(rows, t, false, red)
}
export function balanceOption(result: OverviewResult, type: string, t: Translator) {
  return horizontal(
    result.balances.items
      .filter((row) => row.type === type)
      .map((row) => ({ name: row.subjectName || t('Overview.unknownSubject'), amount: row.amount })),
    t,
    false,
    type === 'ADVANCE' ? blue : green
  )
}
export function trendOption(result: OverviewResult, start: string, end: string, t: Translator): EChartsCoreOption {
  const grain = result.cash.grain === 'MONTH' ? 'month' : 'day'
  const values = new Map(result.cash.trend.map((row) => [row.period, row]))
  const points: OverviewResult['cash']['trend'] = []
  for (let date = dayjs(start).startOf(grain); !date.isAfter(dayjs(end), grain); date = date.add(1, grain)) {
    const period = date.format(grain === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD')
    points.push(values.get(period) || { period, incomeAmount: '0.00', refundAmount: '0.00', netAmount: '0.00' })
  }
  const series = [
    { key: 'incomeAmount', name: t('Overview.income'), type: 'bar', color: blue },
    { key: 'refundAmount', name: t('Overview.refund'), type: 'bar', color: orange },
    { key: 'netAmount', name: t('Overview.netCash'), type: 'line', color: green }
  ]
  return {
    ...base(),
    legend: { top: 0, left: 8, itemWidth: 9, itemHeight: 9 },
    grid: { top: 40, left: 8, right: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.period),
      axisLabel: {
        hideOverlap: true,
        formatter: (value: string) => dayjs(value).format(grain === 'month' ? 'YYYY-MM' : 'M/D')
      }
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: { hideOverlap: true },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: series.map((s) => ({
      name: s.name,
      type: s.type as 'bar' | 'line',
      barMaxWidth: 18,
      showSymbol: points.length <= 14,
      symbolSize: 5,
      itemStyle: { color: s.color },
      data: points.map((p) => ({ value: plotted(p[s.key as 'incomeAmount']), rawAmount: p[s.key as 'incomeAmount'] }))
    })),
    tooltip: {
      trigger: 'axis',
      confine: true,
      renderMode: 'richText',
      formatter: (input: unknown) => {
        const values = input as { name: string; seriesName: string; data: { rawAmount: string } }[]
        return [
          values[0]?.name || '',
          ...values.map((v) => `${v.seriesName}  ${overviewMoney(v.data.rawAmount)} ${t('Overview.wan')}`)
        ].join('\n')
      }
    }
  }
}

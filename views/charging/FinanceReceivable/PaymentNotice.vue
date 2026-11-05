<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { PaymentNotice } from '../../../api/financeReceivable'
const props = defineProps<{ notice: PaymentNotice }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const paper = ref<HTMLElement>()
const printing = ref(false)
function print() {
  if (!paper.value || printing.value) return
  printing.value = true
  const frame = document.createElement('iframe')
  frame.title = t('Notice.title')
  Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0' })
  const cleanup = () => {
    frame.remove()
    printing.value = false
  }
  frame.onload = () => {
    const target = frame.contentWindow
    if (!target) {
      cleanup()
      onlyMessage(t('Notice.printFailed'), 'error')
      return
    }
    target.onafterprint = cleanup
    void target.document.fonts.ready
      .then(() => {
        target.focus()
        target.print()
      })
      .catch(() => {
        cleanup()
        onlyMessage(t('Notice.printFailed'), 'error')
      })
  }
  // 复制Vue已经转义的只读纸面，不把客户名称或备注拼进可执行HTML。
  frame.srcdoc = `<!doctype html><html lang="${document.documentElement.lang || 'zh-CN'}"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{margin:0;color:#111;font:14px 'Microsoft YaHei',sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:10px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}h1{text-align:center;margin:16px 0 28px}.notice-paper-heading{display:flex;justify-content:space-between;gap:20px}.notice-paper-heading p{margin:4px 0 20px}td:last-child,th:last-child{text-align:right;white-space:nowrap}.notice-paper-total{display:flex;justify-content:space-between;gap:20px;border:1px solid #333;border-top:0;padding:14px}.notice-paper-sign{text-align:right;line-height:2;margin-top:28px}</style></head><body>${paper.value.outerHTML}</body></html>`
  document.body.appendChild(frame)
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1120"
    icon="PrinterOutlined"
    :title="t('Notice.title')"
    :sub="notice.fullName"
    @update:open="emit('close')"
  >
    <p class="notice-hint">{{ t('Notice.hint') }}</p>
    <div class="notice-scroll">
      <article
        ref="paper"
        class="notice-paper"
      >
        <h1>{{ t('Notice.title') }}</h1>
        <div class="notice-paper-heading">
          <p>{{ t('Archive.project') }}：{{ notice.projectName }}</p>
          <p>{{ t('Notice.date') }}：{{ notice.printedOn }}</p>
        </div>
        <div class="notice-paper-heading">
          <p>{{ t('Setting.house') }}：{{ notice.fullName }}</p>
          <p>{{ t('Setting.customer') }}：{{ notice.customers.join('、') }}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th
                v-for="key in ['subject', 'customer', 'start', 'end', 'months', 'quantity', 'price', 'amount']"
                :key="key"
              >
                {{ t('Notice.' + key) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in notice.rows"
              :key="row.id"
            >
              <td>{{ row.subjectName }}</td>
              <td>{{ row.customerName }}</td>
              <td>{{ row.start }}</td>
              <td>{{ row.end }}</td>
              <td>{{ row.months }}</td>
              <td>{{ row.quantity }}</td>
              <td>{{ row.price }}</td>
              <td>{{ row.amount }}</td>
            </tr>
          </tbody>
        </table>
        <div class="notice-paper-total">
          <span>{{ t('Notice.total') }}：{{ notice.total }}</span>
          <span>{{ t('Notice.uppercase') }}：{{ notice.totalUppercase }}</span>
        </div>
        <div class="notice-paper-sign">
          <div>{{ notice.projectName }}{{ t('Notice.serviceCenter') }}</div>
          <time>{{ notice.printedOn }}</time>
        </div>
      </article>
    </div>
    <template #foot>
      <a-button @click="emit('close')">{{ t('Finance.close') }}</a-button>
      <a-button
        type="primary"
        :loading="printing"
        @click="print"
      >
        <AIcon type="PrinterOutlined" />
        {{ t('Notice.print') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.notice-hint {
  color: var(--ant-color-text-secondary, #595959);
  margin-bottom: 20px;
}
.notice-scroll {
  overflow-x: auto;
  background: var(--ant-color-fill-alter, #f5f5f5);
  padding: 24px;
}
.notice-paper {
  min-width: 880px;
  padding: 28px;
  background: #fff;
  color: #111;
}
.notice-paper h1 {
  text-align: center;
  font-size: 24px;
  margin: 12px 0 32px;
}
.notice-paper-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}
.notice-paper-heading p {
  margin: 0 0 18px;
}
.notice-paper table {
  width: 100%;
  border-collapse: collapse;
}
.notice-paper th,
.notice-paper td {
  padding: 12px 8px;
  border: 1px solid #333;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.notice-paper td:last-child,
.notice-paper th:last-child {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.notice-paper-total {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 10px;
  border: 1px solid #333;
  border-top: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.notice-paper-sign {
  text-align: right;
  line-height: 2;
  margin-top: 32px;
}
@media (max-width: 560px) {
  .notice-scroll {
    padding: 12px;
  }
}
</style>

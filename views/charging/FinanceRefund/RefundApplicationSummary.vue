<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { useI18n } from 'vue-i18n'
import type { RefundApplication } from '../../../api/financeRefundApplication'
defineProps<{ application: RefundApplication }>()
const { t } = useI18n()
</script>
<template>
  <SectionCard
    icon="AuditOutlined"
    :title="t('Refund.application')"
  >
    <a-tag
      :color="application.status === 'PENDING' ? 'orange' : application.status === 'SUCCEEDED' ? 'green' : 'default'"
    >
      {{ t('Refund.applicationStatus.' + application.status) }}
    </a-tag>
    <KvGrid
      :cols="2"
      :items="[
        { label: t('Refund.applicationNumber'), value: application.number },
        { label: t('Refund.amount'), value: application.amount },
        { label: t('Refund.receiver'), value: application.receiverName },
        { label: t('Refund.refundedAt'), value: formatFinanceTime(application.refundedAt) },
        { label: t('Cashier.company'), value: application.companyName },
        { label: t('Refund.method'), value: application.methodText },
        { label: t('Refund.reason'), value: application.reason },
        { label: t('Refund.reviewReason'), value: application.reviewReason || '—' },
        { label: t('Refund.reviewer'), value: application.reviewerName || '—' }
      ]"
    />
  </SectionCard>
</template>

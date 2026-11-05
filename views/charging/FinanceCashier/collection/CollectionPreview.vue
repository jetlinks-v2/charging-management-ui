<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useCashier } from '../../../../hooks/finance-cashier/useCashier'
import CashierBills from '../CashierBills.vue'
const props = defineProps<{ state: ReturnType<typeof useCashier>; hideHouse: boolean }>()
const { model, preview, uncertain, funding } = props.state
const { t } = useI18n()
</script>
<template>
  <div
    v-if="preview"
    class="cashier-editor"
  >
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Cashier.paymentInfo')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Cashier.company'), value: preview.companyName },
          { label: t('Cashier.payer'), value: preview.payerName },
          { label: t('Cashier.paidAt'), value: model.paidAt.replace('T', ' ') },
          ...(model.remark ? [{ label: t('Setting.remark'), value: model.remark }] : [])
        ]"
      />
    </SectionCard>
    <SectionCard
      icon="UnorderedListOutlined"
      :title="t('Cashier.bills')"
    >
      <CashierBills
        :rows="preview.rows"
        :amounts="model.items"
        :hide-house="hideHouse"
      />
    </SectionCard>
    <SectionCard
      icon="WalletOutlined"
      :title="t('Cashier.funding')"
    >
      <div
        v-for="(tender, index) in model.tenders"
        :key="index"
        class="cashier-preview-tender"
      >
        <span>
          {{
            funding.find((item) => item.id === tender.optionId)?.text ||
            preview.allocations.find((item) => item.tenderIndex === index)?.methodText
          }}
          <small>
            {{
              funding.find((item) => item.id === tender.optionId)?.bankName ||
              preview.allocations.find((item) => item.tenderIndex === index)?.bankName
            }}
          </small>
        </span>
        <strong>{{ tender.amount }}</strong>
      </div>
    </SectionCard>
    <a-alert
      v-if="uncertain"
      type="warning"
      show-icon
      :message="t('Cashier.unknownResult')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDocumentRule } from '../../../hooks/finance-document/useDocumentRule'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import '../FinanceDocument/document.css'
const { t } = useI18n()
const { projectId, loading, saving, failed, editing, current, model, load, edit, save } = useDocumentRule()
</script>
<template>
  <j-page-container>
    <ProjectScopeBar />
    <section class="document-workspace">
      <CloudEmpty
        v-if="!projectId"
        :description="t('ProjectContext.choose')"
      />
      <a-spin
        v-else
        :spinning="loading"
      >
        <SectionCard
          v-if="current && !failed"
          icon="SettingOutlined"
          :title="t('Document.ruleTitle')"
          :sub="t('Document.ruleHint')"
        >
          <template #actions>
            <a-space>
              <j-permission-button
                v-if="!editing"
                :hasPermission="'charging/FinanceDocumentRule:save'"
                @click="edit"
              >
                {{ t('Finance.edit') }}
              </j-permission-button>
              <a-button
                :disabled="saving"
                :aria-label="t('Finance.refresh')"
                @click="load"
              >
                <AIcon type="ReloadOutlined" />
              </a-button>
            </a-space>
          </template>
          <KvGrid
            v-if="!editing"
            :cols="2"
            :items="[
              { label: t('Document.rule.timeLimitType'), value: t('Document.rule.' + current.timeLimitType) },
              { label: t('Document.rule.limitDays'), value: current.limitDays ?? '—' },
              {
                label: t('Document.rule.maxReopenTimes'),
                value: current.maxReopenTimes ?? t('Document.rule.unlimited')
              }
            ]"
          />
          <a-form
            v-else
            layout="vertical"
            :model="model"
            :disabled="saving"
            @finish="save"
          >
            <div class="document-grid">
              <a-form-item
                :label="t('Document.rule.timeLimitType')"
                name="timeLimitType"
              >
                <a-radio-group
                  v-model:value="model.timeLimitType"
                  :options="['NATURAL_YEAR', 'CUSTOM_DAYS'].map((v) => ({ value: v, label: t('Document.rule.' + v) }))"
                />
              </a-form-item>
              <a-form-item
                v-if="model.timeLimitType === 'CUSTOM_DAYS'"
                :label="t('Document.rule.limitDays')"
                name="limitDays"
                :rules="[
                  { required: true, type: 'integer', min: 1, max: 36500, message: t('Document.rule.daysInvalid') }
                ]"
                required
              >
                <a-input-number
                  :value="model.limitDays ?? undefined"
                  :min="1"
                  :max="36500"
                  :precision="0"
                  @update:value="(value) => (model.limitDays = typeof value === 'number' ? value : null)"
                />
              </a-form-item>
              <a-form-item
                :label="t('Document.rule.maxReopenTimes')"
                name="maxReopenTimes"
                :extra="t('Document.rule.maxHint')"
              >
                <a-input-number
                  :value="model.maxReopenTimes ?? undefined"
                  :min="0"
                  :precision="0"
                  :placeholder="t('Document.rule.unlimited')"
                  @update:value="(value) => (model.maxReopenTimes = typeof value === 'number' ? value : null)"
                />
              </a-form-item>
            </div>
            <a-form-item
              :label="t('Document.reason')"
              name="reason"
              :rules="[{ required: true, whitespace: true, message: t('Document.reasonHint') }]"
              required
            >
              <a-textarea
                v-model:value="model.reason"
                :maxlength="500"
                :rows="3"
              />
            </a-form-item>
            <a-space>
              <a-button
                :disabled="saving"
                @click="editing = false"
              >
                {{ t('Finance.cancel') }}
              </a-button>
              <j-permission-button
                type="primary"
                html-type="submit"
                :hasPermission="'charging/FinanceDocumentRule:save'"
                :loading="saving"
                :disabled="!model.reason.trim()"
              >
                {{ t('Finance.save') }}
              </j-permission-button>
            </a-space>
          </a-form>
        </SectionCard>
        <CloudEmpty
          v-else-if="!loading"
          :description="t('Finance.failed')"
        >
          <a-button @click="load">{{ t('Finance.refresh') }}</a-button>
        </CloudEmpty>
      </a-spin>
    </section>
  </j-page-container>
</template>

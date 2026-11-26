<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { EvidenceFilesApi } from '../../../discrepancy-and-evidence-management/infrastructure/evidence-files-api.js';
import { storedPhotoPath } from '../../../discrepancy-and-evidence-management/domain/stored-photo.js';
import { useDiscrepancyStore } from '../../../discrepancy-and-evidence-management/application/discrepancy.store.js';
import EvidenceUpload from '../../../discrepancy-and-evidence-management/presentation/components/evidence-upload.vue';
import ProtectedEvidencePhoto from '../../../discrepancy-and-evidence-management/presentation/components/protected-evidence-photo.vue';
import { ReceptionApi } from '../../infrastructure/reception-api.js';
import { useReceptionStore } from '../../application/reception.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import {
  clearPendingReceptionRequest,
  readPendingReceptionRequest,
  savePendingReceptionRequest
} from '../../domain/reception-verification.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const files = new EvidenceFilesApi();
const api = new ReceptionApi();
const receptionStore = useReceptionStore();
const discrepancyStore = useDiscrepancyStore();
const iamStore = useIamStore();

const reception = ref(null);
const loading = ref(false);
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');
const observations = ref('');

const busy = computed(() => uploading.value || submitting.value);
const photos = computed(() => (reception.value?.evidences || [])
    .filter(e => storedPhotoPath(e.fileUrl, reception.value.id)));
const reported = computed(() => reception.value?.status === 'DiscrepancyReported');
const closed = computed(() => !!reception.value?.closedAt);
const linkedCase = computed(() => {
  const rid = String(reception.value?.id ?? '');
  return discrepancyStore.cases.find(c => String(c.receptionId) === rid) || null;
});
const pendingKey = computed(() => `vigia.reception.verify.${iamStore.currentUserId}.${route.params.id}`);

onBeforeRouteLeave(() => !busy.value);
onBeforeRouteUpdate(() => !busy.value);

let generation = 0;

async function load() {
  const current = ++generation;
  loading.value = true;
  error.value = '';
  try {
    const result = await files.context(route.params.id);
    if (current !== generation) return;
    reception.value = result.data;
    if (result.data?.status === 'DiscrepancyReported' || result.data?.closedAt) {
      const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      clearPendingReceptionRequest(storage, pendingKey.value);
      await discrepancyStore.loadCases();
    }
  } catch {
    if (current === generation) {
      reception.value = null;
      error.value = 'missing';
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}

watch(() => route.params.id, () => {
  reception.value = null;
  observations.value = '';
  load();
}, { immediate: true });

async function report() {
  if (busy.value || !reception.value || reported.value || closed.value) return;
  if (!photos.value.length) {
    error.value = 'photoFirst';
    return;
  }
  if (!observations.value.trim()) return;

  submitting.value = true;
  error.value = '';
  const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  const existing = readPendingReceptionRequest(storage, pendingKey.value);
  const requestId = existing?.action === 'verify-discrepant' ? existing.requestId : crypto.randomUUID();
  savePendingReceptionRequest(storage, pendingKey.value, {
    requestId,
    action: 'verify-discrepant',
    dispatchId: String(reception.value.dispatchId || ''),
    guideNumber: String(reception.value.deliveryNoteNumber || '')
  });

  try {
    const r = reception.value;
    await api.verifyReception(r.id, {
      status: 'VERIFIED_DISCREPANT',
      requestId,
      observations: observations.value.trim(),
      checklist: {
        materialGoodCondition: r.materialGoodCondition,
        quantityVerified: r.quantityVerified,
        deliveryGuideReceived: r.deliveryGuideReceived,
        observationsRecorded: true,
        photographicEvidence: true
      }
    });
    clearPendingReceptionRequest(storage, pendingKey.value);
    await Promise.allSettled([load(), receptionStore.fetchReceptions(), discrepancyStore.loadCases()]);
  } catch (failure) {
    const status = Number(failure?.status ?? failure?.response?.status ?? 0);
    await load();
    if (reported.value) {
      clearPendingReceptionRequest(storage, pendingKey.value);
      await Promise.allSettled([receptionStore.fetchReceptions(), discrepancyStore.loadCases()]);
      return;
    }
    if (status === 403 || status === 404) {
      clearPendingReceptionRequest(storage, pendingKey.value);
      error.value = 'missing';
    } else if (status >= 400 && status < 500) {
      clearPendingReceptionRequest(storage, pendingKey.value);
      error.value = 'reportError';
    } else {
      error.value = 'uncertainReport';
    }
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <section class="report-evidence" :aria-busy="loading || busy">
    <pv-button :label="t('evidenceFiles.back')" :disabled="busy" @click="router.back()" />
    <h1>{{ t('evidenceFiles.report') }}</h1>
    <p v-if="error" role="alert">{{ t(`evidenceFiles.${error}`) }}</p>
    <pv-button v-if="!reception && !loading" :label="t('evidenceFiles.reload')" @click="load" />
    <template v-if="reception">
      <p>{{ reception.siteName }} · {{ reception.deliveryNoteNumber }} · #{{ reception.id }}</p>
      <div v-if="reported" class="flex align-items-center gap-3 flex-wrap" role="status" aria-live="polite">
        <span>{{ t('evidenceFiles.reported') }}</span>
        <pv-button
          v-if="linkedCase"
          :label="t('evidenceFiles.viewCase')"
          icon="pi pi-external-link"
          class="p-button-sm btn-secondary"
          @click="router.push(`/problemas/${linkedCase.id}`)"
        />
      </div>
      <EvidenceUpload :disabled="submitting" v-if="!closed" :reception-id="reception.id" @busy="uploading = $event" @uploaded="load" />
      <div class="photos">
        <ProtectedEvidencePhoto v-for="photo in photos" :key="photo.id" :url="photo.fileUrl" :reception-id="reception.id" :caption="photo.description" />
      </div>
      <template v-if="!reported && !closed">
        <label for="discrepancy-observations">{{ t('evidenceFiles.observations') }}</label>
        <textarea
          id="discrepancy-observations"
          v-model="observations"
          maxlength="500"
          :disabled="busy"
          rows="4"
          aria-required="true"
          aria-describedby="discrepancy-observations-meta discrepancy-submit-hint"
        />
        <small id="discrepancy-observations-meta">{{ t('receptions.a11y.observationsCount', { count: observations.length }) }}</small>
        <p id="discrepancy-submit-hint" v-if="!photos.length || !observations.trim()" class="m-0 text-sm text-secondary" role="status" aria-live="polite">
          {{ t('receptions.a11y.discrepancyHint') }}
        </p>
        <pv-button :label="t('evidenceFiles.report')" :loading="submitting" :disabled="busy || !photos.length || !observations.trim()" @click="report" />
      </template>
    </template>
  </section>
</template>
<style scoped>.report-evidence{display:grid;gap:1rem;max-width:960px;margin:1rem auto;padding:1rem}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}textarea{width:100%;box-sizing:border-box}</style>

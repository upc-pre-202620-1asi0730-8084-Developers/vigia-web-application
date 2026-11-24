<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue';
import { useReceptionStore } from '../../application/reception.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import {
  canActorEditReception,
  clearPendingReceptionRequest,
  hasAuthoritativeGuide,
  mapReceptionErrorKey,
  readPendingReceptionRequest,
  savePendingReceptionRequest
} from '../../domain/reception-verification.js';

/**
 * Page to register the reception of a dispatch at the site (US-09).
 * Query ?arrival=<id> preloads an upcoming arrival and ?reception=<id> an existing reception.
 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const receptionStore = useReceptionStore();
const iamStore = useIamStore();

const isSubmitting = ref(false);
const errorMessage = ref('');
const selectedArrivalId = ref(null);
const existingReception = ref(null);

const isEditingExisting = computed(() => Boolean(route.query.reception));

const form = reactive({
  siteName: '',
  origin: '',
  dispatchId: '',
  deliveryGuideNumber: '',
  truckPlate: '',
  driverName: '',
  observations: '',
  checklist: {
    materialGoodCondition: true,
    quantityVerified: true,
    deliveryGuideReceived: true,
    photographicEvidence: false,
    observationsRecorded: false
  },
  items: []
});

const canEditTarget = computed(() => !isEditingExisting.value ||
    canActorEditReception(existingReception.value, iamStore.currentUserId, iamStore.currentRole));

const canSubmit = computed(() => !isSubmitting.value && canEditTarget.value &&
    hasAuthoritativeGuide(form) && form.items.length > 0);

const pendingRequestKey = computed(() => form.dispatchId
    ? `vigia.reception.register.${iamStore.currentUserId}.${form.dispatchId}`
    : '');

// Opciones de despachos próximos en tránsito
const arrivalOptions = computed(() => {
  return receptionStore.upcomingArrivals.map(a => ({
    label: `${a.id || a.dispatchId} · ${a.deliveryGuideNumber || '—'} · ${a.material} (${a.origin})`,
    value: a.id || a.dispatchId,
    arrival: a
  }));
});

onMounted(async () => {
  try {
    if (!receptionStore.upcomingArrivals.length) await receptionStore.fetchUpcomingArrivals();
    if (route.query.reception) await receptionStore.fetchReceptions();
  } catch (err) {
    errorMessage.value = t(mapReceptionErrorKey(err));
  }
  applyQuerySelection();
});

// Reapply the selection when only the query changes (e.g. browser back/forward between arrivals).
watch(() => route.query, applyQuerySelection);

function resetForm() {
  selectedArrivalId.value = null;
  existingReception.value = null;
  form.origin = '';
  form.dispatchId = '';
  form.deliveryGuideNumber = '';
  form.truckPlate = '';
  form.driverName = '';
  form.siteName = '';
  form.observations = '';
  form.items = [];
}

/** Preloads the arrival (?arrival=) or reception (?reception=) named in the URL, or the first upcoming arrival. */
function applyQuerySelection() {
  errorMessage.value = '';
  if (route.query.reception) {
    const found = receptionStore.receptions.find(r => String(r.id) === String(route.query.reception));
    if (!found) {
      resetForm();
      errorMessage.value = t('receptions.errors.notFound');
      return;
    }
    existingReception.value = found;
    applyArrival(found);
    if (!canActorEditReception(found, iamStore.currentUserId, iamStore.currentRole)) {
      errorMessage.value = found.isClosed ? t('receptions.errors.conflict') : t('receptions.errors.forbidden');
    }
    return;
  }
  existingReception.value = null;
  const preselected = receptionStore.upcomingArrivals.find(a => String(a.id || a.dispatchId) === String(route.query.arrival));
  const target = preselected || receptionStore.upcomingArrivals[0];
  if (target) applyArrival(target);
  else resetForm();
}

function applyArrival(arrival) {
  if (!arrival) return;
  selectedArrivalId.value = arrival.id || arrival.dispatchId;
  form.origin = arrival.origin || '';
  form.dispatchId = String(arrival.dispatchId || arrival.id || '');
  form.deliveryGuideNumber = arrival.deliveryGuideNumber || '';
  form.truckPlate = arrival.truckPlate || arrival.truck || '';
  form.driverName = arrival.driverName || '';
  form.siteName = arrival.siteName || '';
  form.observations = arrival.observations || '';
  if (arrival.checklist) {
    form.checklist = { ...form.checklist, ...arrival.checklist };
  }

  form.items = arrival.items?.length ? arrival.items.map((item, index) => ({
    ...item,
    id: item.id ?? index + 1
  })) : [];
}

function onArrivalSelect(e) {
  errorMessage.value = '';
  const chosen = receptionStore.upcomingArrivals.find(a => (a.id || a.dispatchId) === e.value);
  if (chosen) {
    applyArrival(chosen);
  }
}

async function onSubmit() {
  if (!hasAuthoritativeGuide(form) || !form.items.length) {
    errorMessage.value = t('receptions.dialog.requiredFields');
    return;
  }
  if (!canEditTarget.value) {
    errorMessage.value = t('receptions.errors.forbidden');
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  let requestId = null;
  if (!isEditingExisting.value && pendingRequestKey.value) {
    const existingPending = readPendingReceptionRequest(storage, pendingRequestKey.value);
    if (existingPending && existingPending.dispatchId === form.dispatchId &&
        existingPending.guideNumber === form.deliveryGuideNumber) {
      requestId = existingPending.requestId;
    } else {
      requestId = crypto.randomUUID();
      savePendingReceptionRequest(storage, pendingRequestKey.value, {
        requestId,
        action: 'register',
        dispatchId: form.dispatchId,
        guideNumber: form.deliveryGuideNumber
      });
    }
  }

  try {
    const payload = {
      id: route.query.reception ? Number(route.query.reception) : null,
      dispatchId: form.dispatchId,
      requestId,
      verifiedByUserId: iamStore.currentUserId,
      verifiedByUserName: iamStore.currentUsername,
      siteName: form.siteName,
      origin: form.origin,
      truckPlate: form.truckPlate,
      driverName: form.driverName,
      deliveryGuideNumber: form.deliveryGuideNumber,
      arrivedAt: new Date().toISOString(),
      observations: form.observations,
      checklist: { ...form.checklist },
      items: form.items.map(item => ({
        materialName: item.materialName,
        dispatchedQuantity: Number(item.dispatchedQuantity),
        receivedQuantity: Number(item.receivedQuantity),
        unit: item.unit
      }))
    };

    const newReception = await receptionStore.registerReception(payload);
    if (pendingRequestKey.value) clearPendingReceptionRequest(storage, pendingRequestKey.value);
    toast.add({ severity: 'success', summary: t('receptions.dialog.saved'), detail: newReception?.id, life: 3000 });
    goBack();
  } catch (err) {
    const status = Number(err?.status ?? 0);
    if (status >= 400 && status < 500 && pendingRequestKey.value) {
      clearPendingReceptionRequest(storage, pendingRequestKey.value);
    }
    errorMessage.value = t(mapReceptionErrorKey(err));
  } finally {
    isSubmitting.value = false;
  }
}

function goBack() {
  router.push('/recepciones');
}
</script>

<template>
  <div class="p-4">
    <div class="page-header">
      <pv-button :label="t('nav.receptions')" icon="pi pi-arrow-left" link class="back-link" @click="goBack" />
      <h1 class="m-0">{{ t('receptions.dialog.registerTitle') }}</h1>
    </div>
    <div class="vigia-card register-dialog-content">
      <div v-if="errorMessage" class="error-banner mb-3">
        <i class="pi pi-exclamation-triangle mr-2"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Selector de Despacho en camino -->
      <div v-if="!isEditingExisting" class="form-section mb-4">
        <label class="section-label">
          <i class="pi pi-truck mr-1 text-primary"></i>
          {{ t('receptions.dialog.selectArrival') }}
        </label>
        <pv-select input-id="receipt-arrival"
          v-model="selectedArrivalId"
          :options="arrivalOptions"
          optionLabel="label"
          optionValue="value"
          :disabled="!arrivalOptions.length || isSubmitting"
          :placeholder="t('receptions.dialog.selectArrival')"
          class="w-full"
          @change="onArrivalSelect"
        />
        <small class="caption">{{ arrivalOptions.length ? t('receptions.dialog.selectArrivalHelp') : t('receptions.dialog.noUpcomingArrivals') }}</small>
      </div>

      <!-- Datos del Despacho y Transporte (emitidos por el servidor) -->
      <div class="grid grid-nogutter form-grid mb-3">
        <div class="col-12 md:col-6 pr-md-2 mb-3">
          <label for="receipt-dispatchId" class="field-label">{{ t('receptions.dialog.dispatchId') }} *</label>
          <pv-input-text id="receipt-dispatchId" v-model="form.dispatchId" class="w-full" readonly disabled />
        </div>
        <div class="col-12 md:col-6 pl-md-2 mb-3">
          <label for="receipt-deliveryGuideNumber" class="field-label">{{ t('receptions.dialog.deliveryGuide') }} *</label>
          <pv-input-text id="receipt-deliveryGuideNumber" v-model="form.deliveryGuideNumber" class="w-full" readonly disabled />
        </div>

        <div class="col-12 md:col-6 pr-md-2 mb-3">
          <label for="receipt-origin" class="field-label">{{ t('receptions.dialog.origin') }}</label>
          <pv-input-text id="receipt-origin" v-model="form.origin" class="w-full" readonly disabled />
        </div>
        <div class="col-12 md:col-6 pl-md-2 mb-3">
          <label for="receipt-siteName" class="field-label">{{ t('receptions.dialog.site') }}</label>
          <pv-input-text id="receipt-siteName" v-model="form.siteName" class="w-full" readonly disabled />
        </div>

        <div class="col-12 md:col-6 pr-md-2 mb-3">
          <label for="receipt-truckPlate" class="field-label">{{ t('receptions.dialog.truckPlate') }}</label>
          <pv-input-text id="receipt-truckPlate" v-model="form.truckPlate" class="w-full" readonly disabled />
        </div>
        <div class="col-12 md:col-6 pl-md-2 mb-3">
          <label for="receipt-driverName" class="field-label">{{ t('receptions.dialog.driver') }}</label>
          <pv-input-text id="receipt-driverName" v-model="form.driverName" class="w-full" readonly disabled />
        </div>
      </div>
      <small class="caption block mb-3">{{ t('receptions.dialog.lockedGuideHelp') }}</small>

      <!-- Ítems y Cantidades a Cotejar -->
      <div class="items-section mb-4">
        <div class="flex justify-content-between align-items-center mb-2">
          <label class="section-label m-0">
            <i class="pi pi-box mr-1 text-primary"></i>
            {{ t('receptions.dialog.itemsToVerify') }}
          </label>
        </div>

        <div class="items-table-container">
          <table class="w-full items-table">
            <thead>
              <tr>
                <th>{{ t('receptions.table.material') }}</th>
                <th style="width: 130px;">{{ t('receptions.table.sent') }}</th>
                <th style="width: 130px;">{{ t('receptions.table.received') }}</th>
                <th style="width: 90px;">{{ t('receptions.table.unit') }}</th>
                <th style="width: 100px;">{{ t('receptions.table.diff') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.id">
                <td>
                  <pv-input-text v-model="item.materialName" class="w-full" readonly disabled />
                </td>
                <td>
                  <pv-input-number v-model="item.dispatchedQuantity" :min="0" :maxFractionDigits="3" class="w-full" disabled />
                </td>
                <td>
                  <pv-input-number :aria-label="`${t('receptions.table.received')}: ${item.materialName}`" v-model="item.receivedQuantity" :min="0" :maxFractionDigits="3" class="w-full" :disabled="!canEditTarget || isSubmitting" />
                </td>
                <td>
                  <pv-input-text v-model="item.unit" class="w-full" readonly disabled />
                </td>
                <td class="text-center font-bold">
                  <span :class="(item.dispatchedQuantity - item.receivedQuantity) > 0 ? 'text-red-500' : 'text-green-600'">
                    {{ (item.dispatchedQuantity - item.receivedQuantity).toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Checklist de Verificación en Obra -->
      <div class="checklist-section mb-4">
        <label class="section-label mb-2">
          <i class="pi pi-check-square mr-1 text-primary"></i>
          {{ t('receptions.checklist.title') }}
        </label>
        <div class="grid grid-nogutter checklist-grid">
          <div class="col-12 sm:col-6 mb-2 flex align-items-center">
            <pv-checkbox v-model="form.checklist.materialGoodCondition" :binary="true" inputId="chk-good" />
            <label for="chk-good" class="ml-2 cursor-pointer">{{ t('receptions.checklist.goodCondition') }}</label>
          </div>
          <div class="col-12 sm:col-6 mb-2 flex align-items-center">
            <pv-checkbox v-model="form.checklist.quantityVerified" :binary="true" inputId="chk-qty" />
            <label for="chk-qty" class="ml-2 cursor-pointer">{{ t('receptions.checklist.verifiedQuantity') }}</label>
          </div>
          <div class="col-12 sm:col-6 mb-2 flex align-items-center">
            <pv-checkbox v-model="form.checklist.deliveryGuideReceived" :binary="true" inputId="chk-guide" />
            <label for="chk-guide" class="ml-2 cursor-pointer">{{ t('receptions.checklist.guideReceived') }}</label>
          </div>
          <div class="col-12 sm:col-6 mb-2 flex align-items-center">
            <pv-checkbox v-model="form.checklist.observationsRecorded" :binary="true" inputId="chk-obs" />
            <label for="chk-obs" class="ml-2 cursor-pointer">{{ t('receptions.checklist.observationsRecorded') }}</label>
          </div>
        </div>
      </div>

      <!-- Observaciones -->
      <div class="mb-3">
        <label for="receipt-observations" class="field-label">{{ t('receptions.dialog.observations') }}</label>
        <pv-textarea id="receipt-observations" maxlength="500"
          v-model="form.observations"
          rows="2"
          class="w-full"
          :placeholder="t('receptions.dialog.observationsPlaceholder')"
        />
      </div>

      <div class="form-footer">
        <pv-button
          :label="t('common.cancel')"
          class="btn-secondary"
          @click="goBack"
          :disabled="isSubmitting"
        />
        <pv-button
          :label="t('receptions.dialog.saveAction')"
          icon="pi pi-check"
          class="btn-accent"
          @click="onSubmit"
          :disabled="!canSubmit"
          :loading="isSubmitting"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: var(--sp-16);
}

.back-link {
  padding-left: 0;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-8);
  margin-top: var(--sp-16);
  padding-top: var(--sp-16);
  border-top: 1px solid var(--p-content-border-color);
}

.register-dialog-content {
  max-width: 56rem;
}

.error-banner {
  background-color: #FDE8E8;
  color: var(--color-error);
  padding: var(--sp-8) var(--sp-16);
  border-radius: var(--radius-actionable);
  display: flex;
  align-items: center;
  font-size: 13px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: var(--sp-8);
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--sp-4);
}

.items-table {
  border-collapse: collapse;
  font-size: 13px;
}

.items-table th {
  background-color: #F3F4F6;
  padding: 8px;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid #E5E7EB;
}

.items-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #F3F4F6;
}

.checklist-grid {
  background-color: #F9FAFB;
  padding: var(--sp-12, 12px);
  border-radius: var(--radius-actionable);
  border: 1px solid #E5E7EB;
}

.checklist-grid label {
  font-size: 13px;
  color: var(--color-text-main);
}
</style>

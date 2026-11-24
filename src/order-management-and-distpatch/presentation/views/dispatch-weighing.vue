<script setup>
import {computed, ref, watch} from 'vue';
import {useRoute, onBeforeRouteUpdate, onBeforeRouteLeave} from 'vue-router';
import {useI18n} from 'vue-i18n';
import useOrderManagementStore from '../../application/order-management.store.js';
import {useFleetStore} from '../../../fleet-and-device-management/application/fleet.store.js';
import {useIamStore} from '../../../iam/application/iam.store.js';
import {validWeighing, weighingStorageKey, readPendingWeighing} from '../../domain/dispatch-weighing.js';

const {t, locale} = useI18n();
const route = useRoute();
const store = useOrderManagementStore();
const fleet = useFleetStore();
const iam = useIamStore();
const dispatch = ref(null);
const history = ref([]);
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const errorKey = ref('');
const success = ref(false);
const vehicleId = ref(null);
const vehicleError = ref(false);
const pending = ref(null);
const form = ref({weightKg: null, expectedWeightKg: null, toleranceKg: null});
const storageKey = computed(() => weighingStorageKey(iam.currentUserId, route.params.id));
const canWeigh = computed(() => ready.value && !dispatch.value?.deliveryGuide && dispatch.value?.status === 'IN_PREPARATION' && Boolean(dispatch.value?.vehicleId));
const editable = computed(() => canWeigh.value && !saving.value && !pending.value && !loading.value);
const vehicles = computed(() => fleet.vehicles.map(v => ({label: v.licensePlate, value: v.id})));
const kg = value => value == null ? '—' : `${new Intl.NumberFormat(locale.value, {maximumFractionDigits: 3}).format(value)} kg`;
const date = value => new Intl.DateTimeFormat(locale.value, {dateStyle: 'short', timeStyle: 'medium'}).format(new Date(value));
let loadVersion = 0;
onBeforeRouteUpdate(() => !saving.value);
onBeforeRouteLeave(() => !saving.value);

async function load() {
  const version = ++loadVersion;
  loading.value = true;
  ready.value = false;
  errorKey.value = '';
  try {
    const [current, records] = await Promise.all([
      store.fetchDispatch(route.params.id), store.fetchDispatchWeighings(route.params.id)
    ]);
    if (version !== loadVersion) return;
    dispatch.value = current;
    history.value = records;
    vehicleId.value = current.vehicleId;
    ready.value = true;
  } catch (error) {
    if (version !== loadVersion) return;
    errorKey.value = error.response?.status === 404 ? 'missing' : error.response?.status === 403 ? 'forbidden' : 'loadError';
  } finally { if (version === loadVersion) loading.value = false; }
}

async function loadVehicles() {
  vehicleError.value = false;
  try { await fleet.fetchVehicles(); }
  catch { vehicleError.value = true; }
}

async function assign() {
  const vehicle = fleet.vehicles.find(v => v.id === vehicleId.value);
  if (!vehicle || saving.value || pending.value) return;
  saving.value = true;
  success.value = false;
  errorKey.value = '';
  try {
    await store.assignDispatchVehicle(route.params.id, vehicle);
    await load();
  } catch { ready.value = false; errorKey.value = 'vehicleError'; }
  finally { saving.value = false; }
}

async function save() {
  if (saving.value || loading.value || !ready.value || (!pending.value && !canWeigh.value)) return;
  success.value = false;
  errorKey.value = '';
  if (!pending.value) {
    if (!validWeighing(form.value)) { errorKey.value = 'invalid'; return; }
    const measurement = {...form.value, requestId: crypto.randomUUID()};
    try { sessionStorage.setItem(storageKey.value, JSON.stringify(measurement)); }
    catch { errorKey.value = 'storageError'; return; }
    pending.value = measurement;
  }
  saving.value = true;
  try {
    await store.recordDispatchWeighing(route.params.id, pending.value);
    sessionStorage.removeItem(storageKey.value);
    pending.value = null;
    form.value = {weightKg: null, expectedWeightKg: null, toleranceKg: null};
    success.value = true;
    await load();
  } catch (error) {
    const status = error.response?.status;
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      sessionStorage.removeItem(storageKey.value);
      pending.value = null;
      ready.value = false;
      errorKey.value = status === 409 ? 'conflict' : status === 403 ? 'forbidden' : 'saveError';
    } else {
      errorKey.value = 'uncertain';
    }
  } finally { saving.value = false; }
}

watch(() => route.params.id, () => {
  dispatch.value = null;
  history.value = [];
  success.value = false;
  pending.value = readPendingWeighing(sessionStorage, storageKey.value);
  form.value = pending.value ? {...pending.value} : {weightKg: null, expectedWeightKg: null, toleranceKg: null};
  load();
}, {immediate: true});
loadVehicles();
</script>

<template>
  <main class="weighing-page p-4" :aria-busy="loading || saving">
    <router-link :to="{name: 'ordering-dispatches'}">{{ t('weighing.back') }}</router-link>
    <h1>{{ t('weighing.title') }} <span v-if="dispatch">— {{ dispatch.code || dispatch.id }}</span></h1>
    <p>{{ t('weighing.description') }}</p>
    <p v-if="success" role="status" class="notice">{{ t('weighing.saved') }}</p>
    <div v-if="errorKey" role="alert" class="notice error">
      {{ t(`weighing.${errorKey}`) }}
    </div>
    <p v-if="loading" role="status">{{ t('weighing.loading') }}</p>
    <pv-button :label="t('weighing.reload')" severity="secondary" :disabled="saving || loading" @click="load" />
    <template v-if="ready && dispatch">
      <section class="panel">
        <h2>{{ dispatch.projectName }}</h2>
        <p>{{ t('dispatches.table.status') }}: {{ t(`dispatches.status.${dispatch.status}`) }}</p>
        <p>{{ t('dispatches.table.transport') }}: {{ dispatch.vehiclePlate || t('dispatches.unassigned') }}</p>
        <ul :aria-label="t('dispatches.table.materials')">
          <li v-for="(item, index) in dispatch.items" :key="index">{{ item.code }} — {{ item.material }}: {{ item.quantity }} {{ item.unit }}</li>
        </ul>
        <p v-if="dispatch.requiresWeightReview" class="notice">{{ t('weighing.review') }}</p>
        <p v-if="dispatch.status !== 'IN_PREPARATION'">{{ t('weighing.closed') }}</p>
        <p v-if="dispatch.deliveryGuide">{{ t('guide.locked') }}</p>
        <router-link :to="{name:'ordering-dispatch-guide',params:{id:dispatch.id}}">{{ t('guide.open') }}</router-link>
        <template v-if="dispatch.status === 'IN_PREPARATION' && !dispatch.deliveryGuide && !pending">
          <label for="weighing-vehicle">{{ t('weighing.vehicle') }}</label>
          <div class="vehicle-controls">
            <pv-select inputId="weighing-vehicle" :aria-label="t('weighing.vehicle')" v-model="vehicleId" :options="vehicles" optionLabel="label" optionValue="value" :disabled="saving" />
            <pv-button :label="t('weighing.assign')" :disabled="!vehicleId || saving || vehicleId === dispatch.vehicleId" @click="assign" />
          </div>
          <div v-if="vehicleError" role="alert">
            {{ t('weighing.vehicleError') }}
            <pv-button :label="t('weighing.reload')" severity="secondary" @click="loadVehicles" />
          </div>
          <p v-if="!dispatch.vehicleId">{{ t('weighing.needVehicle') }}</p>
        </template>
      </section>
      <section v-if="canWeigh || pending" class="panel">
        <h2>{{ t('weighing.record') }}</h2>
        <p>{{ t('weighing.precision') }}</p>
        <p v-if="pending" role="status" class="notice">{{ t('weighing.pending') }}</p>
        <form @submit.prevent="save">
          <div class="fields">
            <div v-for="field in ['weightKg', 'expectedWeightKg', 'toleranceKg']" :key="field" class="field">
              <label :for="field">{{ t(`weighing.${field}`) }}</label>
              <input :id="field" v-model.number="form[field]" type="number" :min="field === 'toleranceKg' ? 0 : 0.001" max="999999999.999" step="0.001" required :disabled="!editable" />
            </div>
          </div>
          <pv-button type="submit" :label="t(pending ? 'weighing.retry' : 'weighing.save')" :loading="saving" :disabled="saving || loading" />
        </form>
      </section>
      <section class="panel">
        <h2>{{ t('weighing.history') }}</h2>
        <p v-if="!history.length">{{ t('weighing.empty') }}</p>
        <ol v-else class="history">
          <li v-for="record in history" :key="record.id" class="measurement">
            <strong>{{ kg(record.weightKg) }} — {{ t(`weighing.comparison.${record.comparisonStatus}`) }}</strong>
            <p v-if="record.requiresReview" class="notice">{{ t('weighing.review') }}</p>
            <p v-if="!record.isCurrent">{{ t('weighing.stale') }}</p>
            <dl>
              <dt>{{ t('weighing.expectedWeightKg') }}</dt><dd>{{ kg(record.expectedWeightKg) }}</dd>
              <dt>{{ t('weighing.toleranceKg') }}</dt><dd>{{ kg(record.toleranceKg) }}</dd>
              <dt>{{ t('weighing.difference') }}</dt><dd>{{ kg(record.differenceKg) }}</dd>
              <dt>{{ t('weighing.vehicle') }}</dt><dd>{{ record.vehiclePlate }}</dd>
              <dt>{{ t('weighing.operator') }}</dt><dd>{{ record.recordedBy }}</dd>
              <dt>{{ t('weighing.date') }}</dt><dd>{{ date(record.weighedAt) }}</dd>
            </dl>
          </li>
        </ol>
      </section>
    </template>
  </main>
</template>

<style scoped>
.weighing-page { max-width: 72rem; margin: auto; }
.panel { border: 1px solid var(--color-border); border-radius: .75rem; padding: 1.25rem; margin-top: 1rem; }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1rem; }
.field { display: flex; flex-direction: column; gap: .5rem; }
input { width: 100%; padding: .75rem; border: 1px solid var(--color-text-secondary); border-radius: .4rem; font: inherit; color: var(--color-text-main); background: var(--color-surface); }
.notice { border-left: .25rem solid var(--color-warning); padding: .75rem; }
.error { border-color: var(--color-error); }
.vehicle-controls { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: .5rem; }
.history { padding-left: 1.25rem; }
.measurement { margin: 1rem 0; border-bottom: 1px solid var(--color-border); padding-bottom: .75rem; }
dl { display: grid; grid-template-columns: minmax(8rem, 1fr) 2fr; gap: .5rem; }
dd { margin: 0; overflow-wrap: anywhere; }
</style>

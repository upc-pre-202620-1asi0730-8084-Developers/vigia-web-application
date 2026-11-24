<script setup>
import {computed, ref, watch} from 'vue';
import {useRoute, onBeforeRouteLeave, onBeforeRouteUpdate} from 'vue-router';
import {useI18n} from 'vue-i18n';
import useOrderManagementStore from '../../application/order-management.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import {validGuideDetails, readPendingGuide} from '../../domain/dispatch-guide.js';

const {t, locale} = useI18n();
const route = useRoute();
const store = useOrderManagementStore();
const iam = useIamStore();
const dispatch = ref(null);
const ready = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const feedback = ref('');
const pending = ref(null);
const details = ref({driverName:'', carrierName:''});
const storageKey = computed(() => `vigia.guide.${iam.currentUserId}.${route.params.id}`);
const guide = computed(() => dispatch.value?.deliveryGuide);
const canIssue = computed(() => ready.value && !guide.value && dispatch.value?.status === 'IN_PREPARATION' &&
    Boolean(dispatch.value?.vehicleId) && !dispatch.value?.requiresWeightReview);
let loadVersion = 0;
onBeforeRouteLeave(() => !saving.value);
onBeforeRouteUpdate(() => !saving.value);

async function load() {
  const version = ++loadVersion;
  loading.value = true;
  ready.value = false;
  error.value = '';
  try {
    const current = await store.fetchDispatch(route.params.id);
    if (version !== loadVersion) return;
    dispatch.value = current;
    ready.value = true;
  } catch (failure) {
    if (version === loadVersion) error.value = failure.response?.status === 404 ? 'missing' : 'loadError';
  } finally { if (version === loadVersion) loading.value = false; }
}

async function issue() {
  if (saving.value || loading.value || !ready.value || (!pending.value && !canIssue.value)) return;
  error.value = '';
  feedback.value = '';
  if (!pending.value) {
    if (!validGuideDetails(details.value)) {error.value = 'invalid';return;}
    const payload = {driverName:details.value.driverName.trim(), carrierName:details.value.carrierName.trim(), requestId:crypto.randomUUID()};
    try {sessionStorage.setItem(storageKey.value,JSON.stringify(payload));}
    catch {error.value = 'storageError';return;}
    pending.value = payload;
  }
  saving.value = true;
  try {
    await store.issueDeliveryGuide(route.params.id,pending.value);
    sessionStorage.removeItem(storageKey.value);
    pending.value = null;
    feedback.value = 'issued';
    await load();
  } catch (failure) {
    const status = failure.response?.status;
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      sessionStorage.removeItem(storageKey.value);
      pending.value = null;
      await load();
      error.value = status === 409 ? 'conflict' : 'saveError';
    } else {error.value = 'uncertain';}
  } finally {saving.value = false;}
}

async function depart() {
  if (saving.value || loading.value || !ready.value || !dispatch.value?.canDepart) return;
  saving.value = true;
  error.value = '';
  feedback.value = '';
  try {
    dispatch.value = await store.departDispatch(route.params.id);
    feedback.value = 'departed';
  } catch {
    await load();
    error.value = 'departureError';
  } finally {saving.value = false;}
}

const kg = value => `${new Intl.NumberFormat(locale.value,{maximumFractionDigits:3}).format(value)} kg`;
const date = value => new Intl.DateTimeFormat(locale.value,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
watch(() => route.params.id, () => {
  dispatch.value = null;
  feedback.value = '';
  pending.value = readPendingGuide(sessionStorage,storageKey.value);
  details.value = pending.value ? {...pending.value} : {driverName:'',carrierName:''};
  load();
},{immediate:true});
</script>

<template>
  <main class="guide-page p-4" :aria-busy="saving || loading">
    <router-link :to="{name:'ordering-dispatches'}">{{ t('weighing.back') }}</router-link>
    <h1>{{ t('guide.title') }}<span v-if="dispatch"> — {{ dispatch.code || dispatch.id }}</span></h1>
    <p>{{ t('guide.description') }}</p>
    <p v-if="feedback" role="status" class="notice">{{ t(`guide.${feedback}`) }}</p>
    <p v-if="error" role="alert" class="notice error">{{ t(`guide.${error}`) }}</p>
    <p v-if="loading" role="status">{{ t('guide.loading') }}</p>
    <pv-button :label="t('weighing.reload')" severity="secondary" :disabled="saving || loading" @click="load" />
    <template v-if="ready && dispatch">
      <section class="panel">
        <h2>{{ dispatch.projectName }}</h2>
        <p>{{ t('dispatches.table.status') }}: {{ t(`dispatches.status.${dispatch.status}`) }}</p>
        <p>{{ t('weighing.vehicle') }}: {{ dispatch.vehiclePlate || t('dispatches.unassigned') }}</p>
        <p v-if="dispatch.isAuthorized" role="status">{{ t('guide.authorized') }}</p>
        <p v-else>{{ t('guide.notAuthorized') }}</p>
        <router-link :to="{name:'ordering-dispatch-weighing',params:{id:dispatch.id}}">{{ t('weighing.open') }}</router-link>
      </section>
      <section v-if="!guide || pending" class="panel">
        <h2>{{ t('guide.issue') }}</h2>
        <p v-if="!canIssue && !pending">{{ t('guide.requirements') }}</p>
        <p v-if="pending" role="status">{{ t('guide.pending') }}</p>
        <form v-if="canIssue || pending" @submit.prevent="issue">
          <div class="fields">
            <div class="field"><label for="guide-driver">{{ t('guide.driver') }}</label>
              <pv-input-text id="guide-driver" v-model="details.driverName" required maxlength="150" :disabled="saving || !!pending" /></div>
            <div class="field"><label for="guide-carrier">{{ t('guide.carrier') }}</label>
              <pv-input-text id="guide-carrier" v-model="details.carrierName" required maxlength="150" :disabled="saving || !!pending" /></div>
          </div>
          <p>{{ t('guide.confirmation') }}</p>
          <pv-button type="submit" :label="t(pending ? 'guide.retry' : 'guide.issue')" :loading="saving" :disabled="saving || loading" />
        </form>
      </section>
      <section v-if="guide" class="panel">
        <h2>{{ guide.guideNumber }}</h2>
        <p>{{ t('guide.locked') }}</p>
        <dl>
          <dt>{{ t('guide.driver') }}</dt><dd>{{ guide.driverName }}</dd>
          <dt>{{ t('guide.carrier') }}</dt><dd>{{ guide.carrierName }}</dd>
          <dt>{{ t('weighing.vehicle') }}</dt><dd>{{ guide.vehiclePlate }}</dd>
          <dt>{{ t('guide.destination') }}</dt><dd>{{ guide.projectName }} — {{ guide.address }}</dd>
          <dt>{{ t('weighing.weightKg') }}</dt><dd>{{ kg(guide.weightKg) }}</dd>
          <dt>{{ t('weighing.expectedWeightKg') }}</dt><dd>{{ kg(guide.expectedWeightKg) }}</dd>
          <dt>{{ t('weighing.toleranceKg') }}</dt><dd>{{ kg(guide.toleranceKg) }}</dd>
          <dt>{{ t('guide.issuedBy') }}</dt><dd>{{ guide.issuedBy }}</dd>
          <dt>{{ t('guide.issuedAt') }}</dt><dd>{{ date(guide.issuedAt) }}</dd>
        </dl>
        <h3>{{ t('dispatches.table.materials') }}</h3>
        <ul><li v-for="item in guide.items" :key="item.itemId">{{ item.code }} — {{ item.material }}: {{ item.quantity }} {{ item.unit }}</li></ul>
        <template v-if="dispatch.canDepart">
          <p>{{ t('guide.departHint') }}</p>
          <pv-button :label="t('guide.depart')" :disabled="saving || loading || !!pending" :loading="saving" @click="depart" />
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.guide-page { max-width: 72rem; margin: auto; }
.panel { border: 1px solid var(--color-border); border-radius: .75rem; padding: 1.25rem; margin-top: 1rem; }
.fields { display: grid; grid-template-columns: repeat(auto-fit,minmax(12rem,1fr)); gap: 1rem; }
.field { display: flex; flex-direction: column; gap: .5rem; }
.notice { border-left: .25rem solid var(--color-info); padding: .75rem; }
.error { border-color: var(--color-error); }
dl { display: grid; grid-template-columns: minmax(8rem,1fr) 2fr; gap: .5rem; }
dd { margin: 0; overflow-wrap: anywhere; }
</style>

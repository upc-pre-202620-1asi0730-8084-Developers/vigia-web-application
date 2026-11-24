<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate} from "vue-router";
import {computed, ref, watch} from "vue";
import useOrderManagementStore from "../../application/order-management.store.js";
import {Order} from "../../domain/model/order.entity.js";
import {ORDER_STATUS, orderPrioritySeverity, orderStatusSeverity} from "../../domain/order-status.js";
import useIamStore from '../../../iam/application/iam.store.js';

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useOrderManagementStore();
const iam = useIamStore();
const ready = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const feedback = ref('');
let loadVersion = 0;
const canReview = computed(() => ready.value && ['ADMIN', 'WAREHOUSE_MANAGER'].includes(iam.currentRole) &&
    ['PENDING', 'UNDER_REVIEW'].includes(order.value?.status));
const {updateOrder} = store;

const order = computed(() => store.getOrderById(route.params.id));

async function load() {
  const version = ++loadVersion;
  const id = route.params.id;
  ready.value = false;
  loading.value = true;
  error.value = '';
  try {
    await store.fetchOrder(id);
    if (version === loadVersion) ready.value = true;
  } catch (failure) {
    if (version === loadVersion) error.value = failure.response?.status === 404 ? 'orders.detail.notFound' : 'orders.detail.loadError';
  } finally { if (version === loadVersion) loading.value = false; }
}
watch(() => route.params.id, () => { feedback.value = ''; load(); }, {immediate: true});
onBeforeRouteLeave(() => !saving.value);
onBeforeRouteUpdate(() => !saving.value);

/**
 * Applies a decision (approve / request changes / reject) to the current order.
 * @param {string} newStatus - Status the order moves to.
 * @param {string} noteKey - i18n key of the history note.
 */
const decide = async (newStatus, noteKey) => {
  if (!canReview.value || saving.value) return;
  saving.value = true;
  error.value = '';
  feedback.value = '';
  const note = t(noteKey);
  const timeline = [...order.value.timeline, {
    id: order.value.timeline.length + 1,
    title: note,
    user: iam.currentUsername,
    description: note,
    date: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }];
  try {
    const updated = await updateOrder(new Order({...order.value, status: newStatus, timeline}));
    feedback.value = updated.status;
  } catch {
    await load();
    error.value = 'orders.detail.feedbackError';
  } finally { saving.value = false; }
};

/**
 * Navigates back to the orders list.
 */
const navigateBack = () => {
  router.push({name: 'ordering-orders'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ t('orders.detail.title') }}</h1>
    <pv-button :label="t('orders.detail.back')" icon="pi pi-arrow-left" severity="secondary" class="mb-3" :disabled="saving" @click="navigateBack" />
    <p v-if="loading" role="status">{{ t('orders.detail.loading') }}</p>
    <p v-if="error" role="alert" class="text-red-500">{{ t(error) }}</p>
    <p v-if="feedback" role="status">{{ t('orders.detail.feedbackSaved', {status: t(`orders.status.${feedback}`)}) }}</p>
    <pv-button :label="t('orders.request.refresh')" severity="secondary" :disabled="loading || saving" @click="load" />
    <div v-if="ready && order" :aria-busy="saving">
      <h2>{{ order.code || order.id }}
        <pv-tag :value="t(`orders.status.${order.status}`)" :severity="orderStatusSeverity(order.status)" class="ml-2" />
        <pv-tag :value="t(`orders.priority.${order.priority}`)" :severity="orderPrioritySeverity(order.priority)" class="ml-2" />
      </h2>
      <p v-if="iam.currentRole === 'SITE_MANAGER'" role="status">
        {{ t(order.status === 'PENDING' ? 'orders.request.awaiting' : 'orders.request.acknowledged') }}
      </p>
      <p><strong>{{ t('orders.detail.work') }}:</strong> {{ order.projectName }}</p>
      <p><strong>{{ t('orders.detail.date') }}:</strong> {{ order.date }}</p>
      <p><strong>{{ t('orders.detail.requester') }}:</strong> {{ order.requesterName }}</p>
      <p><strong>{{ t('orders.detail.mainMaterial') }}:</strong> {{ order.mainMaterial }}</p>

      <h3>{{ t('orders.detail.requestedMaterials') }}</h3>
      <pv-data-table :value="order.items" striped-rows class="mb-3">
        <pv-column field="material" :header="t('orders.detail.material')" />
        <pv-column field="quantity" :header="t('orders.detail.qty')" />
        <pv-column field="unit" :header="t('orders.detail.unit')" />
        <pv-column field="observation" :header="t('orders.detail.observation')" />
      </pv-data-table>

      <h3>{{ t('orders.detail.observations') }}</h3>
      <p>{{ order.observations || t('orders.detail.noObservations') }}</p>

      <h3>{{ t('orders.detail.attachedFiles') }}</h3>
      <ul v-if="order.attachedFiles.length">
        <li v-for="file in order.attachedFiles" :key="file.id">
          <i class="pi pi-file mr-2" />{{ file.name }} ({{ file.type }} · {{ file.size }})
        </li>
      </ul>
      <p v-else>{{ t('orders.detail.noFiles') }}</p>

      <template v-if="canReview">
      <h3>{{ t('orders.detail.makeDecision') }}</h3>
      <pv-button :label="t('orders.detail.approve')" icon="pi pi-check" class="btn-primary"
                 :disabled="saving"
                 @click="decide(ORDER_STATUS.APPROVED, 'orders.detail.notes.approved')" />
      <pv-button :label="t('orders.detail.requestChanges')" icon="pi pi-pencil" severity="secondary" class="ml-2"
                 :disabled="saving || order.status === ORDER_STATUS.UNDER_REVIEW"
                 @click="decide(ORDER_STATUS.UNDER_REVIEW, 'orders.detail.notes.changes')" />
      <pv-button :label="t('orders.detail.reject')" icon="pi pi-times" severity="danger" class="ml-2"
                 :disabled="saving"
                 @click="decide(ORDER_STATUS.REJECTED, 'orders.detail.notes.rejected')" />
      </template>

      <h3 class="mt-4">{{ t('orders.detail.history') }}</h3>
      <pv-timeline :value="order.timeline">
        <template #content="slotProps">
          <strong>{{ slotProps.item.title }}</strong>
          <p class="m-0">{{ slotProps.item.description }}</p>
          <small>{{ slotProps.item.user }} · {{ slotProps.item.date }}</small>
        </template>
      </pv-timeline>
    </div>
  </div>
</template>

<style scoped>

</style>

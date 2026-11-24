<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {computed, onBeforeUnmount, onMounted, ref, toRefs, watch} from "vue";
import useOrderManagementStore from "../../application/order-management.store.js";
import {ORDER_STATUS, orderPrioritySeverity, orderStatusSeverity} from "../../domain/order-status.js";
import useIamStore from '../../../iam/application/iam.store.js';

const {t} = useI18n();
const router = useRouter();
const store = useOrderManagementStore();
const iam = useIamStore();
const canCreate = computed(() => ['ADMIN', 'SITE_MANAGER'].includes(iam.currentRole));
const receivedCount = ref(0);
let knownPendingIds = null;
let refreshTimer;
watch(() => store.orders, current => {
  const ids = new Set(current.filter(order => order.status === 'PENDING').map(order => order.id));
  if (knownPendingIds) receivedCount.value = [...ids].filter(id => !knownPendingIds.has(id)).length;
  knownPendingIds = ids;
});
const {orders, ordersLoading, errors, pendingCount, approvedCount, underReviewCount, urgentCount} = toRefs(store);
const {fetchOrders} = store;

const search = ref('');
const status = ref('ALL');
const statusOptions = computed(() => [
  {label: t('orders.filters.all'), value: 'ALL'},
  ...Object.values(ORDER_STATUS).map(value => ({label: t(`orders.status.${value}`), value}))
]);

const filteredOrders = computed(() => orders.value.filter(order => {
  const q = search.value.trim().toLowerCase();
  const matchesStatus = status.value === 'ALL' || order.status === status.value;
  const matchesSearch = !q || [order.id, order.code, order.projectName, order.mainMaterial].some(v => String(v).toLowerCase().includes(q));
  return matchesStatus && matchesSearch;
}));

onMounted(() => {
  fetchOrders();
  refreshTimer = setInterval(() => {
    if (iam.currentRole !== 'SITE_MANAGER' && !store.ordersLoading && document.visibilityState === 'visible') fetchOrders();
  }, 15000);
});
onBeforeUnmount(() => clearInterval(refreshTimer));

/**
 * Navigate to the order detail page.
 * @param {string} id - The ID of the order.
 */
const navigateToDetail = (id) => {
  router.push({ name: 'ordering-order-detail', params: { id } });
};

/** @param {Order} order - Order whose total quantity is displayed. */
const totalQuantity = (order) => order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
</script>

<template>
  <div class="p-4">
    <h1>{{ t('orders.title') }}</h1>
    <p v-if="receivedCount" role="status">{{ t('orders.request.received', {count: receivedCount}) }}</p>
    <pv-button v-if="canCreate" :label="t('orders.request.new')" icon="pi pi-plus" class="mb-3"
               @click="router.push({name: 'ordering-order-new'})" />
    <div class="grid mb-3">
      <div class="col-12 md:col-3"><div class="border-1 surface-border border-round p-3"><i class="pi pi-clock mr-2" />{{ t('orders.kpi.pending') }}<h2 class="m-0 mt-2">{{ pendingCount }}</h2></div></div>
      <div class="col-12 md:col-3"><div class="border-1 surface-border border-round p-3"><i class="pi pi-check-circle mr-2" />{{ t('orders.kpi.approved') }}<h2 class="m-0 mt-2">{{ approvedCount }}</h2></div></div>
      <div class="col-12 md:col-3"><div class="border-1 surface-border border-round p-3"><i class="pi pi-search mr-2" />{{ t('orders.kpi.underReview') }}<h2 class="m-0 mt-2">{{ underReviewCount }}</h2></div></div>
      <div class="col-12 md:col-3"><div class="border-1 surface-border border-round p-3"><i class="pi pi-exclamation-triangle mr-2" />{{ t('orders.kpi.urgent') }}<h2 class="m-0 mt-2">{{ urgentCount }}</h2></div></div>
    </div>
    <div class="flex gap-3 mb-3">
      <pv-icon-field class="flex-1">
        <pv-input-icon class="pi pi-search" />
        <pv-input-text v-model="search" :placeholder="t('orders.filters.search')" class="w-full" />
      </pv-icon-field>
      <pv-select v-model="status" :options="statusOptions" optionLabel="label" optionValue="value" />
      <pv-button icon="pi pi-refresh" :label="t('orders.request.refresh')" :disabled="ordersLoading" @click="fetchOrders" />
    </div>
    <pv-data-table
        :value="filteredOrders"
        :loading="ordersLoading"
        striped-rows
        table-style="min-width: 50rem"
        paginator
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
    >
      <pv-column :header="t('orders.table.id')"><template #body="{data}">{{ data.code || data.id }}</template></pv-column>
      <pv-column field="projectName" :header="t('orders.table.work')" sortable />
      <pv-column field="mainMaterial" :header="t('orders.table.materials')" />
      <pv-column :header="t('orders.table.quantity')">
        <template #body="slotProps">{{ totalQuantity(slotProps.data) }}</template>
      </pv-column>
      <pv-column field="date" :header="t('orders.table.date')" sortable />
      <pv-column :header="t('orders.table.status')">
        <template #body="slotProps">
          <pv-tag :value="t(`orders.status.${slotProps.data.status}`)" :severity="orderStatusSeverity(slotProps.data.status)" />
        </template>
      </pv-column>
      <pv-column :header="t('orders.table.priority')">
        <template #body="slotProps">
          <pv-tag :value="t(`orders.priority.${slotProps.data.priority}`)" :severity="orderPrioritySeverity(slotProps.data.priority)" />
        </template>
      </pv-column>
      <pv-column :header="t('common.actions')">
        <template #body="slotProps">
          <pv-button icon="pi pi-eye" :aria-label="t('orders.request.view', {code: slotProps.data.code || slotProps.data.id})" text rounded @click="navigateToDetail(slotProps.data.id)" />
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ t('errors.occurred') }}: {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>

<style scoped>

</style>

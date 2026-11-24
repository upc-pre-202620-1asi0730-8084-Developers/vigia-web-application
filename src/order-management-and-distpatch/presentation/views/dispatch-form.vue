<script setup>
import {useI18n} from "vue-i18n";
import {useRouter, onBeforeRouteLeave} from "vue-router";
import {computed, onMounted, ref, watch} from "vue";
import useOrderManagementStore from "../../application/order-management.store.js";
import {Dispatch} from "../../domain/model/dispatch.entity.js";
import {DISPATCH_PRIORITY, DISPATCH_STATUS, DISPATCH_TYPE} from "../../domain/dispatch-status.js";
import {ORDER_STATUS} from "../../domain/order-status.js";
import useIamStore from '../../../iam/application/iam.store.js';

const {t} = useI18n();
const router = useRouter();
const store = useOrderManagementStore();
const iam = useIamStore();
const {addDispatch, fetchOrders} = store;
const saving = ref(false);
const error = ref('');
const created = ref(false);
onBeforeRouteLeave(() => !saving.value);

const steps = ['information', 'materials', 'transportation', 'confirmation'];
const form = ref({
  projectName: '', relatedOrderId: null, departureDate: '', estimatedTime: '',
  dispatchType: DISPATCH_TYPE.DEPARTURE_TO_WORK, priority: DISPATCH_PRIORITY.AVERAGE, observations: ''
});

const approvedOrders = computed(() => store.orders
    .filter(order => order.status === ORDER_STATUS.APPROVED)
    .map(order => ({label: `${order.code || order.id} — ${order.projectName}`, value: order.id})));
const selectedOrder = computed(() => store.getOrderById(form.value.relatedOrderId));
watch(selectedOrder, order => {form.value.projectName = order?.projectName || '';});
const typeOptions = computed(() => Object.values(DISPATCH_TYPE).map(value => ({label: t(`dispatches.types.${value}`), value})));
const priorityOptions = computed(() => Object.values(DISPATCH_PRIORITY).map(value => ({label: t(`dispatches.priority.${value}`), value})));

onMounted(() => {
  fetchOrders();
});

const saveDispatch = async () => {
  if (saving.value || created.value || store.ordersLoading) return;
  if (selectedOrder.value?.status !== ORDER_STATUS.APPROVED || !form.value.departureDate || !form.value.estimatedTime) {
    error.value = 'dispatches.new.validationError'; return;
  }
  saving.value = true;
  error.value = '';
  /**
   * Saves the dispatch as a new dispatch in preparation.
   */
  const dispatch = new Dispatch({
    ...form.value,
    projectName: selectedOrder.value.projectName,
    status: DISPATCH_STATUS.IN_PREPARATION,
    createdBy: iam.currentUsername,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
  });
  try {
    await addDispatch(dispatch);
    created.value = true;
    saving.value = false;
    navigateBack();
  } catch { error.value = 'dispatches.new.saveError'; }
  finally { saving.value = false; }
};

/**
 * Navigates back to the dispatches list.
 */
const navigateBack = () => {
  router.push({name: 'ordering-dispatches'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ t('dispatches.new.title') }}</h1>
    <pv-stepper :value="1" class="mb-3">
      <pv-step-list>
        <pv-step v-for="(step, index) in steps" :key="step" :value="index + 1">{{ t(`dispatches.new.steps.${step}`) }}</pv-step>
      </pv-step-list>
    </pv-stepper>
    <form @submit.prevent="saveDispatch">
      <div class="field mb-3">
        <label for="work">{{ t('dispatches.new.work') }} *</label>
        <pv-input-text id="work" :model-value="form.projectName" readonly required class="w-full" :placeholder="t('dispatches.new.workPlaceholder')" />
      </div>
      <div class="field mb-3">
        <label for="order">{{ t('dispatches.new.relatedOrder') }}</label>
        <pv-select inputId="order" :aria-label="t('dispatches.new.relatedOrder')" v-model="form.relatedOrderId" :options="approvedOrders" optionLabel="label" optionValue="value" :disabled="saving || store.ordersLoading"
                   showClear class="w-full" :placeholder="t('dispatches.new.relatedOrderPlaceholder')" />
      </div>
      <div class="field mb-3">
        <label for="date">{{ t('dispatches.new.departureDate') }} *</label>
        <pv-input-text id="date" v-model="form.departureDate" type="date" required class="w-full" />
      </div>
      <div class="field mb-3">
        <label for="time">{{ t('dispatches.new.estimatedTime') }} *</label>
        <pv-input-text id="time" v-model="form.estimatedTime" type="time" required class="w-full" />
      </div>
      <div class="field mb-3">
        <label for="type">{{ t('dispatches.new.dispatchType') }} *</label>
        <pv-select id="type" v-model="form.dispatchType" :options="typeOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <div class="field mb-3">
        <label for="priority">{{ t('dispatches.new.priority') }}</label>
        <pv-select id="priority" v-model="form.priority" :options="priorityOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <div class="field mb-3">
        <label for="observations">{{ t('dispatches.new.observations') }}</label>
        <pv-textarea id="observations" v-model="form.observations" rows="3" maxlength="500" class="w-full"
                     :placeholder="t('dispatches.new.observationsPlaceholder')" />
      </div>
      <pv-button type="submit" :label="t('dispatches.new.create')" icon="pi pi-save" class="btn-primary" :loading="saving" :disabled="saving || created || store.ordersLoading || !selectedOrder" />
      <pv-button :label="t('common.cancel')" severity="secondary" class="ml-2" :disabled="saving" @click="navigateBack" />
    </form>
    <p v-if="error" role="alert" class="text-red-500 mt-3">{{ t(error) }}</p>
    <div v-if="store.errors.length && !error" role="alert" class="text-red-500 mt-3">{{ t('orders.detail.loadError') }}</div>
  </div>
</template>

<style scoped>
:deep(.p-step-title) { color: var(--color-text-main); }
</style>

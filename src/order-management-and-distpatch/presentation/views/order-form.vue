<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useRouter} from 'vue-router';
import useOrderManagementStore from '../../application/order-management.store.js';

const {t} = useI18n();
const router = useRouter();
const store = useOrderManagementStore();
const catalog = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
let nextRow = 1;
const date = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
const form = ref({projectId: null, priority: 'AVERAGE', date, observations: '', items: [{key: nextRow++, materialId: null, quantity: 1}]});
const project = computed(() => catalog.value.find(p => p.id === form.value.projectId));
const materials = computed(() => project.value?.materials || []);
const priorities = computed(() => ['LOW', 'AVERAGE', 'HIGH'].map(value => ({value, label: t(`orders.priority.${value}`)})));
const selectedMaterial = row => materials.value.find(m => m.id === row.materialId);
watch(() => form.value.projectId, () => {form.value.items = [{key: nextRow++, materialId: null, quantity: 1}];});

async function loadCatalog() {
  loading.value = true;
  error.value = '';
  try {catalog.value = await store.fetchRequestCatalog();}
  catch {error.value = t('orders.request.errors.catalog');}
  finally {loading.value = false;}
}

async function submit() {
  if (saving.value) return;
  const items = form.value.items;
  if (!project.value || !form.value.date || !items.length || items.some(row => !selectedMaterial(row) ||
      !Number.isInteger(row.quantity) || row.quantity <= 0 || row.quantity > 2147483647) ||
      new Set(items.map(row => row.materialId)).size !== items.length) {
    error.value = t('orders.request.errors.invalid');
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const created = await store.addOrder({projectId: form.value.projectId, priority: form.value.priority,
      date: form.value.date, observations: form.value.observations.trim() || null,
      items: items.map(({materialId, quantity}) => ({materialId, quantity, observation: null}))});
    await router.push({name: 'ordering-order-detail', params: {id: created.id}});
  } catch (failure) {
    error.value = t(failure.response?.status === 403 ? 'orders.request.errors.forbidden' : 'orders.request.errors.submit');
  } finally {saving.value = false;}
}

onMounted(loadCatalog);
</script>

<template>
  <main class="p-4 order-form">
    <h1>{{ t('orders.request.new') }}</h1>
    <p>{{ t('orders.request.description') }}</p>
    <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
    <p v-if="loading" role="status">{{ t('orders.request.loading') }}</p>
    <pv-button v-else-if="!catalog.length && error" :label="t('orders.request.retry')" @click="loadCatalog" />
    <p v-else-if="!catalog.length" role="status">{{ t('orders.request.empty') }}</p>
    <form v-else @submit.prevent="submit" :aria-busy="saving">
      <fieldset :disabled="saving" class="border-none p-0">
        <legend class="font-semibold mb-3">{{ t('orders.request.information') }}</legend>
        <div class="grid">
          <div class="col-12 md:col-6 flex flex-column gap-2">
            <label for="request-project">{{ t('orders.request.project') }}</label>
            <pv-select inputId="request-project" v-model="form.projectId" :options="catalog" optionLabel="name" optionValue="id"
                       :placeholder="t('orders.request.selectProject')" :disabled="saving" aria-required="true" />
          </div>
          <div class="col-12 md:col-3 flex flex-column gap-2">
            <label for="request-date">{{ t('orders.request.date') }}</label>
            <input id="request-date" type="date" v-model="form.date" required class="p-2 border-round" />
          </div>
          <div class="col-12 md:col-3 flex flex-column gap-2">
            <label for="request-priority">{{ t('orders.request.priority') }}</label>
            <pv-select inputId="request-priority" v-model="form.priority" :options="priorities" optionLabel="label" optionValue="value" :disabled="saving" />
          </div>
        </div>
        <h2>{{ t('orders.detail.requestedMaterials') }}</h2>
        <p v-if="project && !materials.length" role="status">{{ t('orders.request.noMaterials') }}</p>
        <div v-for="(row, index) in form.items" :key="row.key" class="grid align-items-end mb-2">
          <div class="col-12 md:col-6 flex flex-column gap-2">
            <label :for="`request-material-${row.key}`">{{ t('orders.request.material', {number: index + 1}) }}</label>
            <pv-select :inputId="`request-material-${row.key}`" v-model="row.materialId" :options="materials" optionLabel="name" optionValue="id"
                       :disabled="saving || !project" :placeholder="t('orders.request.selectMaterial')" aria-required="true" />
          </div>
          <div class="col-8 md:col-4 flex flex-column gap-2">
            <label :for="`request-quantity-${row.key}`">{{ t('orders.detail.qty') }} {{ selectedMaterial(row)?.unit || '' }}</label>
            <pv-input-number :inputId="`request-quantity-${row.key}`" v-model="row.quantity" :min="1" :max="2147483647" :maxFractionDigits="0" :useGrouping="false" :disabled="saving" aria-required="true" />
          </div>
          <div class="col-4 md:col-2">
            <pv-button icon="pi pi-trash" severity="danger" type="button" :aria-label="t('orders.request.remove', {number: index + 1})"
                       :disabled="saving || form.items.length === 1" @click="form.items.splice(index, 1)" />
          </div>
        </div>
        <pv-button type="button" :label="t('orders.request.add')" icon="pi pi-plus" severity="secondary" class="mb-3"
                   :disabled="saving || !project || form.items.length >= 100" @click="form.items.push({key: nextRow++, materialId: null, quantity: 1})" />
        <div class="flex flex-column gap-2 mb-3">
          <label for="request-observations">{{ t('orders.detail.observations') }}</label>
          <pv-textarea inputId="request-observations" id="request-observations" v-model="form.observations" :maxlength="350" rows="3" :disabled="saving" />
        </div>
        <div class="flex gap-2">
          <pv-button type="submit" :label="t('orders.request.send')" icon="pi pi-send" :loading="saving" :disabled="saving || !materials.length" />
          <pv-button type="button" :label="t('orders.request.cancel')" severity="secondary" :disabled="saving" @click="router.push({name: 'ordering-orders'})" />
        </div>
      </fieldset>
    </form>
  </main>
</template>

<style scoped>
.order-form { max-width: 1100px; margin: 0 auto; }
</style>

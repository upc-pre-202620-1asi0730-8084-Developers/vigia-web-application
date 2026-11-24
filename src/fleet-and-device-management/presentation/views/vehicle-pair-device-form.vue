<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useToast } from 'primevue';
import { useFleetStore } from '../../application/fleet.store.js';
import { fleetErrorMessage } from '../../domain/fleet-validation.js';
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const fleetStore = useFleetStore();
const isPairing = ref(false);
const loading = ref(false);
const targetVehicle = ref(null);
const deviceId = ref('');
const failure = ref(null);
const validation = ref('');
const pairErrors = computed(() => {
  const message = validation.value ? t(`fleet.errors.${validation.value}`) : fleetErrorMessage(failure.value,t);
  const deviceError = !!validation.value || ['FLEET_DEVICE_ALREADY_ASSIGNED','FLEET_INVALID_GPS_DEVICE'].includes(failure.value?.code);
  return {deviceId:deviceError ? message : '',general:deviceError ? '' : message};
});
let loadVersion = 0;
async function loadVehicle() {
  const version = ++loadVersion;
  loading.value = true; targetVehicle.value = null; failure.value = null; deviceId.value = ''; validation.value = '';
  try {
    if (!/^[1-9]\d*$/.test(String(route.params.id))) throw {status:404};
    const vehicle = await fleetStore.fetchVehicleById(route.params.id);
    if (version === loadVersion) { targetVehicle.value = vehicle; deviceId.value = vehicle.gpsDeviceId || ''; }
  } catch (error) { if (version === loadVersion) failure.value = error; }
  finally { if (version === loadVersion) loading.value = false; }
}
watch(() => route.params.id, loadVehicle, {immediate:true});
onBeforeRouteLeave(() => !isPairing.value);
onBeforeRouteUpdate(() => !isPairing.value);
const goBack = () => { if (!isPairing.value) router.push('/transporte'); };
const handlePair = async () => {
  if (isPairing.value || loading.value || !targetVehicle.value) return;
  validation.value = ''; failure.value = null;
  const trimmed = deviceId.value.trim().toUpperCase();
  if (!trimmed || trimmed.length > 64 || /\p{Cc}/u.test(trimmed)) { validation.value = 'deviceInvalid'; return; }
  const vehicle = targetVehicle.value;
  isPairing.value = true;
  try {
    const updated = await fleetStore.pairDevice(vehicle.id, trimmed);
    targetVehicle.value = updated;
    toast.add({severity:'success', summary:t('fleet.vehicles.pairedToast'), detail:`${trimmed} / ${updated.licensePlate}`, life:5000});
    isPairing.value = false;
    await router.push('/transporte');
  } catch (error) { failure.value = {...error, deviceId:trimmed}; }
  finally { isPairing.value = false; }
};
</script>

<template>
  <div class="p-4">
    <div class="page-header">
      <pv-button :label="t('fleet.title')" icon="pi pi-arrow-left" link class="back-link" :disabled="isPairing" @click="goBack" />
      <h1 class="m-0">{{ t('fleet.vehicles.dialog.pairTitle') }}</h1>
    </div>

    <p v-if="loading" role="status">{{ t('common.loading') }}</p>
    <pv-button v-if="!loading && !targetVehicle" :label="t('fleet.errors.retry')" @click="loadVehicle" />
    <form class="vigia-card page-form" novalidate @submit.prevent="handlePair">
      <fieldset :disabled="isPairing || loading || !targetVehicle" style="border:0;padding:0;margin:0">
      <div v-if="targetVehicle" class="vehicle-summary mb-3">
        <i class="pi pi-truck" aria-hidden="true" />
        <div>
          <strong>{{ t('fleet.vehicles.plate') }}: {{ targetVehicle.licensePlate }}</strong>
          <div class="subtitle">{{ targetVehicle.brand }} {{ targetVehicle.model }}</div>
        </div>
      </div>

      <div class="form-field">
        <label for="pair-gps-input" class="field-label">{{ t('fleet.vehicles.dialog.gpsDeviceLabel') }} *</label>
        <pv-input-text
            id="pair-gps-input"
            v-model="deviceId" maxlength="64"
            placeholder="Ej. GPS-TR-105"
            :invalid="!!pairErrors.deviceId"
            :disabled="!targetVehicle"
        />
        <!-- 409 se muestra en línea con borde rojo (§3.5) -->
        <div v-if="pairErrors.deviceId" class="error-message" role="alert">{{ pairErrors.deviceId }}</div>
      </div>

      <div v-if="pairErrors.general" class="error-message mt-3" role="alert">{{ pairErrors.general }}</div>

      <div class="form-footer">
        <pv-button type="button" :label="t('fleet.vehicles.dialog.cancel')" class="btn-secondary" @click="goBack" />
        <pv-button
            type="submit"
            :label="t('fleet.vehicles.dialog.submitPair')"
            icon="pi pi-link"
            class="btn-accent"
            :loading="isPairing"
            :disabled="isPairing || !targetVehicle"
        />
      </div>
    </fieldset>
    </form>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: var(--sp-16);
}

.back-link {
  padding-left: 0;
}

.page-form {
  max-width: 32rem;
}

.subtitle {
  color: var(--color-text-secondary);
}

.vehicle-summary {
  display: flex;
  align-items: center;
  gap: var(--sp-16);
  padding: var(--sp-16);
  border-radius: var(--radius-actionable);
  background-color: var(--color-bg);
}

.vehicle-summary .pi {
  font-size: 1.25rem;
  color: var(--color-primary);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.field-label {
  font-weight: 600;
  font-size: 13px;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-8);
  margin-top: var(--sp-24);
  padding-top: var(--sp-16);
  border-top: 1px solid var(--p-content-border-color);
}
</style>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useToast } from 'primevue';
import { useFleetStore } from '../../application/fleet.store.js';
import { Vehicle } from '../../domain/vehicle.entity.js';
import { vehicleValidation, fleetErrorMessage } from '../../domain/fleet-validation.js';
import useIamStore from '../../../iam/application/iam.store.js';
const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const fleetStore = useFleetStore();
const iamStore = useIamStore();
const isSubmitting = ref(false);
const form = ref({ plate: '', brand: '', model: '', capacity: null, gpsDeviceId: '' });
const validation = ref('');
const failure = ref(null);
const formErrors = computed(() => {
  const message = validation.value ? t(`fleet.errors.${validation.value}`) : fleetErrorMessage(failure.value,t);
  const field = {plateInvalid:'plate',capacityInvalid:'capacity',deviceInvalid:'gpsDevice'}[validation.value] ||
    {FLEET_DUPLICATE_LICENSE_PLATE:'plate',FLEET_INVALID_LICENSE_PLATE:'plate'}[failure.value?.code];
  return {general:field ? '' : message,...(field ? {[field]:message} : {})};
});
onBeforeRouteLeave(() => !isSubmitting.value);
const goBack = () => { if (!isSubmitting.value) router.push('/transporte'); };
const handleRegister = async () => {
  if (isSubmitting.value) return;
  failure.value = null;
  validation.value = vehicleValidation(form.value) || '';
  if (validation.value) return;
  const data = { ...form.value };
  isSubmitting.value = true;
  try {
    const { vehicle, pairingError } = await fleetStore.registerVehicle({
      companyId: iamStore.companyId,
      licensePlate: Vehicle.normalizeLicensePlate(data.plate),
      brand: data.brand.trim(), model: data.model.trim(), maxCapacityTons: Number(data.capacity)
    }, data.gpsDeviceId);
    toast.add({severity: 'success', summary: t('fleet.vehicles.registeredToast'), detail: vehicle.licensePlate, life: 5000});
    if (pairingError) toast.add({severity: 'warn', summary: t('fleet.errors.vehicleSavedGpsPending'), detail: fleetErrorMessage({...pairingError, deviceId: data.gpsDeviceId}, t), life: 10000});
    isSubmitting.value = false;
    await router.push('/transporte');
  } catch (error) { failure.value = {...error, plate: data.plate}; }
  finally { isSubmitting.value = false; }
};
</script>

<template>
  <div class="p-4">
    <div class="page-header">
      <pv-button :label="t('fleet.title')" icon="pi pi-arrow-left" link class="back-link" :disabled="isSubmitting" @click="goBack" />
      <h1 class="m-0">{{ t('fleet.vehicles.dialog.registerTitle') }}</h1>
    </div>

    <form class="vigia-card page-form" novalidate @submit.prevent="handleRegister">
      <fieldset :disabled="isSubmitting" style="border:0;padding:0;margin:0;min-width:0">
      <div class="form-grid">
        <div class="form-field">
          <label for="plate-input" class="field-label">{{ t('fleet.vehicles.dialog.plateLabel') }} *</label>
          <pv-input-text
            id="plate-input"
            v-model="form.plate" maxlength="12"
            :placeholder="t('fleet.vehicles.dialog.platePlaceholder')"
            :invalid="!!formErrors.plate"
            @input="form.plate = form.plate.toUpperCase().replace(/\s+/g, '')"
          />
          <div v-if="formErrors.plate" class="error-message">{{ formErrors.plate }}</div>
        </div>

        <div class="form-field">
          <label for="capacity-input" class="field-label">{{ t('fleet.vehicles.dialog.capacityLabel') }} *</label>
          <pv-input-number
            input-id="capacity-input"
            v-model="form.capacity"
            :min="0.01" :max="150"
            :step="0.5"
            mode="decimal"
            :min-fraction-digits="1"
            :max-fraction-digits="2"
            suffix=" t"
            :invalid="!!formErrors.capacity"
          />
          <div v-if="formErrors.capacity" class="error-message">{{ formErrors.capacity }}</div>
        </div>

        <div class="form-field">
          <label for="brand-input" class="field-label">{{ t('fleet.vehicles.dialog.brandLabel') }} *</label>
          <pv-input-text id="brand-input" v-model="form.brand" maxlength="100" required :placeholder="t('fleet.vehicles.dialog.brandPlaceholder')" />
        </div>

        <div class="form-field">
          <label for="model-input" class="field-label">{{ t('fleet.vehicles.dialog.modelLabel') }} *</label>
          <pv-input-text id="model-input" v-model="form.model" maxlength="100" required :placeholder="t('fleet.vehicles.dialog.modelPlaceholder')" />
        </div>

        <div class="form-field">
          <label for="gps-input" class="field-label">{{ t('fleet.vehicles.dialog.gpsLabel') }}</label>
          <pv-input-text
            id="gps-input"
            v-model="form.gpsDeviceId" maxlength="64"
            :placeholder="t('fleet.vehicles.dialog.gpsPlaceholder')"
            :invalid="!!formErrors.gpsDevice"
          />
          <div v-if="formErrors.gpsDevice" class="error-message">{{ formErrors.gpsDevice }}</div>
        </div>
      </div>

      <div v-if="formErrors.general" class="error-message mt-3" role="alert">{{ formErrors.general }}</div>

      <div class="form-footer">
        <pv-button type="button" :label="t('fleet.vehicles.dialog.cancel')" class="btn-secondary" @click="goBack" />
        <!-- Deshabilitado y loading durante la espera para evitar envíos duplicados (§3.5) -->
        <pv-button
          type="submit"
          :label="t('fleet.vehicles.dialog.submitRegister')"
          icon="pi pi-check"
          class="btn-accent"
          :loading="isSubmitting"
          :disabled="isSubmitting"
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
  max-width: 48rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--sp-16);
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

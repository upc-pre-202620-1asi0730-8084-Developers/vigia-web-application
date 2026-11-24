import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { FleetApi } from '../infrastructure/fleet-api.js';
import { VehicleAssembler } from '../infrastructure/vehicle.assembler.js';
import { GeofenceAssembler } from '../infrastructure/geofence.assembler.js';

const fleetApi = new FleetApi();

/**
 * Store Pinia de aplicación para el Bounded Context BC-04 Fleet and Device Management.
 * Gestiona el estado reactivo de las unidades de transporte y las geocercas perimetrales.
 */
export const useFleetStore = defineStore('fleet', () => {
    const vehicles = ref([]);
    const geofences = ref([]);
    const loadingVehicles = ref(false);
    const loadingGeofences = ref(false);
    const errors = ref([]);

    const vehiclesCount = computed(() => vehicles.value.length);
    const geofencesCount = computed(() => geofences.value.length);

    /**
     * Carga las unidades de transporte desde la API y mapea a entidades del dominio.
     */
    async function fetchVehicles() {
        loadingVehicles.value = true;
        try {
            const response = await fleetApi.getVehicles();
            vehicles.value = VehicleAssembler.toEntitiesFromResponse(response);
        } catch (error) {
            errors.value.push(error);
            throw error;
        } finally {
            loadingVehicles.value = false;
        }
    }

    function upsertVehicle(vehicle) {
        const index = vehicles.value.findIndex(v => String(v.id) === String(vehicle.id));
        if (index < 0) vehicles.value.push(vehicle); else vehicles.value[index] = vehicle;
        return vehicle;
    }

    async function fetchVehicleById(id) {
        const response = await fleetApi.getVehicleById(id);
        return upsertVehicle(VehicleAssembler.toEntityFromResource(response.data));
    }

    async function fetchProjects() { return (await fleetApi.getProjects()).data; }

    /**
     * Registra una unidad de transporte y, si se indica un dispositivo GPS, intenta vincularlo (§3.5).
     * Si la vinculación GPS falla con 409, la unidad permanece registrada y se reporta el error del dispositivo.
     * @param {Object} vehicleData - { companyId, licensePlate, brand, model, maxCapacityTons }
     * @param {string|null} [optionalGpsDeviceId=null]
     * @returns {Promise<{ vehicle: Vehicle, pairingError: Object|null }>}
     */
    async function registerVehicle(vehicleData, optionalGpsDeviceId = null) {
        const payload = VehicleAssembler.toResourceFromEntity({
            ...vehicleData,
            gpsDeviceId: null // El registro base de la unidad
        });

        // 1. Registrar unidad
        let registeredVehicle;
        try {
            registeredVehicle = VehicleAssembler.toEntityFromResource((await fleetApi.createVehicle(payload)).data);
        } catch (error) {
            if (error.status !== 0 && error.status < 500) throw error;
            try {
                const rows = VehicleAssembler.toEntitiesFromResponse(await fleetApi.getVehicles());
                registeredVehicle = rows.find(v => v.licensePlate === payload.licensePlate && v.companyId === payload.companyId &&
                    v.brand === payload.brand && v.model === payload.model && v.maxCapacityTons === payload.maxCapacityTons);
            } catch { /* Keep the original uncertain write result. */ }
            if (!registeredVehicle) throw error;
        }
        upsertVehicle(registeredVehicle);

        let pairingError = null;

        // 2. Si se ingresó un dispositivo opcional, intentar vincularlo
        if (optionalGpsDeviceId && optionalGpsDeviceId.trim().length > 0) {
            try {
                await pairDevice(registeredVehicle.id, optionalGpsDeviceId.trim());
            } catch (err) {
                // 409 u otro error de vinculación: la unidad se conserva registrada
                pairingError = err;
            }
        }

        return { vehicle: registeredVehicle, pairingError };
    }

    /**
     * Vincula un dispositivo GPS a una unidad registrada (US-18).
     * @param {string|number} vehicleId
     * @param {string} gpsDeviceId
     */
    async function pairDevice(vehicleId, gpsDeviceId) {
        let updatedEntity;
        try {
            updatedEntity = VehicleAssembler.toEntityFromResource((await fleetApi.pairGpsDevice(vehicleId, gpsDeviceId)).data);
        } catch (error) {
            if (error.status !== 0 && error.status < 500) throw error;
            const current = await fetchVehicleById(vehicleId).catch(() => null);
            if (current?.gpsDeviceId !== gpsDeviceId.trim().toUpperCase()) throw error;
            return current;
        }

        const index = vehicles.value.findIndex(v => String(v.id) === String(vehicleId));
        if (index !== -1) {
            vehicles.value[index] = updatedEntity;
        }
        return updatedEntity;
    }

    /**
     * Carga las geocercas registradas.
     * @param {string} [type]
     */
    async function fetchGeofences(type) {
        loadingGeofences.value = true;
        try {
            const response = await fleetApi.getGeofences(type);
            geofences.value = GeofenceAssembler.toEntitiesFromResponse(response);
        } catch (error) {
            errors.value.push(error);
            throw error;
        } finally {
            loadingGeofences.value = false;
        }
    }

    /**
     * Define y persiste una nueva geocerca perimetral para un predio (US-19).
     * @param {Object} geofenceData - { companyId, siteId, name, type, centerPoint, radiusMeters }
     */
    async function defineGeofence(geofenceData) {
        const payload = GeofenceAssembler.toResourceFromEntity(geofenceData);
        const response = await fleetApi.createGeofence(payload);
        const newGeofence = GeofenceAssembler.toEntityFromResource(response.data);
        geofences.value.push(newGeofence);
        return newGeofence;
    }

    return {
        vehicles,
        geofences,
        loadingVehicles,
        loadingGeofences,
        errors,
        vehiclesCount,
        geofencesCount,
        fetchVehicles,
        fetchVehicleById,
        fetchProjects,
        registerVehicle,
        pairDevice,
        fetchGeofences,
        defineGeofence
    };
});

export default useFleetStore;

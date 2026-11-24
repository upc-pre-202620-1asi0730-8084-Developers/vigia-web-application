import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ReceptionApi } from '../infrastructure/reception-api.js';
import { ReceptionAssembler } from '../infrastructure/reception.assembler.js';
import { RECEPTION_STATUS } from '../domain/reception-status.js';
import useOrderManagementStore from '../../order-management-and-distpatch/application/order-management.store.js';
import useTransitTraceabilityStore from '../../transit-traceability/application/transit-traceability.store.js';

const receptionApi = new ReceptionApi();

/**
 * Store Pinia de aplicación para el Bounded Context BC-07 Site Reception and Verification.
 * Gestiona el estado reactivo de las recepciones en obra, cotejo físico y evidencias.
 */
export const useReceptionStore = defineStore('reception', () => {
    // Estado
    const receptions = ref([]);
    const upcomingArrivals = ref([]);
    const selectedReception = ref(null);
    const loading = ref(false);
    const loadingArrivals = ref(false);
    const errors = ref([]);

    // Filtros reactivos
    const filterProject = ref('');
    const filterStatus = ref('');
    const searchQuery = ref('');

    // Computados: KPIs operativos del Dashboard (§4.4.3 mockups)
    const totalCount = computed(() => receptions.value.length);

    const todayReceptionsCount = computed(() => {
        const today = new Date().toDateString();
        return receptions.value.filter(r => {
            const date = new Date(r.arrivedAt);
            return date.toDateString() === today || r.status === RECEPTION_STATUS.ARRIVED;
        }).length;
    });

    const completedCount = computed(() => {
        return receptions.value.filter(r => r.status === RECEPTION_STATUS.VERIFIED_CONFORMANT).length;
    });

    const discrepantCount = computed(() => {
        return receptions.value.filter(r => r.status === RECEPTION_STATUS.VERIFIED_DISCREPANT || r.hasDiscrepancy).length;
    });

    const pendingCount = computed(() => {
        return receptions.value.filter(r => r.status === RECEPTION_STATUS.ARRIVED).length;
    });

    // Lista filtrada reactiva
    const filteredReceptions = computed(() => {
        return receptions.value.filter(r => {
            // Filtro por obra/proyecto
            if (filterProject.value && filterProject.value !== 'all') {
                const projMatches = r.siteName?.toLowerCase().includes(filterProject.value.toLowerCase())
                    || r.siteId?.toLowerCase() === filterProject.value.toLowerCase();
                if (!projMatches) return false;
            }

            // Filtro por estado
            if (filterStatus.value && filterStatus.value !== 'all') {
                if (r.status !== filterStatus.value) return false;
            }

            // Búsqueda libre por ID, material, conductor o guía
            if (searchQuery.value && searchQuery.value.trim()) {
                const q = searchQuery.value.toLowerCase().trim();
                const idMatches = String(r.id || '').toLowerCase().includes(q);
                const dispatchMatches = String(r.dispatchId || '').toLowerCase().includes(q);
                const materialMatches = r.items?.some(i => i.materialName.toLowerCase().includes(q));
                const guideMatches = String(r.deliveryGuideNumber || '').toLowerCase().includes(q);
                const driverMatches = String(r.driverName || '').toLowerCase().includes(q);
                if (!idMatches && !dispatchMatches && !materialMatches && !guideMatches && !driverMatches) {
                    return false;
                }
            }

            return true;
        });
    });

    /**
     * Carga el listado de recepciones desde la API.
     */
    async function fetchReceptions() {
        loading.value = true;
        try {
            const response = await receptionApi.getReceptions();
            receptions.value = ReceptionAssembler.toEntitiesFromResponse(response);

            // Seleccionar por defecto la primera o conservar la seleccionada si existe
            if (receptions.value.length > 0) {
                if (selectedReception.value) {
                    const currentId = String(selectedReception.value.id);
                    const fresh = receptions.value.find(r => String(r.id) === currentId);
                    selectedReception.value = fresh || receptions.value[0];
                } else {
                    selectedReception.value = receptions.value[0];
                }
            }
        } catch (error) {
            errors.value.push(error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Carga los despachos en camino (Upcoming Arrivals in transit).
     */
    async function fetchUpcomingArrivals() {
        loadingArrivals.value = true;
        try {
            const response = await receptionApi.getUpcomingArrivals();
            upcomingArrivals.value = response.data || [];
            return true;
        } catch (error) {
            errors.value.push(error);
            return false;
        } finally {
            loadingArrivals.value = false;
        }
    }

    /**
     * Selecciona una recepción para el panel de detalle lateral.
     * @param {Object|string|number} itemOrId
     */
    function selectReception(itemOrId) {
        if (!itemOrId) {
            selectedReception.value = null;
            return;
        }
        if (typeof itemOrId === 'object') {
            selectedReception.value = itemOrId;
            return;
        }
        const found = receptions.value.find(r => String(r.id) === String(itemOrId));
        if (found) {
            selectedReception.value = found;
        }
    }

    async function syncAfterReceptionChange() {
        const orderStore = useOrderManagementStore();
        const transitStore = useTransitTraceabilityStore();
        const tasks = [fetchReceptions(), fetchUpcomingArrivals()];
        if (orderStore.dispatchesLoaded) tasks.push(orderStore.fetchDispatches());
        if (transitStore.routesLoaded) tasks.push(transitStore.fetchRoutes());
        await Promise.allSettled(tasks);
    }

    /**
     * Registra una nueva recepción de material en obra (US-09).
     * @param {Object} formData
     * @returns {Promise<Reception>}
     */
    async function registerReception(formData) {
        const payload = ReceptionAssembler.toResourceFromEntity(formData);
        const response = await receptionApi.createReception(payload);
        const entity = ReceptionAssembler.toEntityFromResource(response.data);
        await syncAfterReceptionChange();
        selectedReception.value = receptions.value.find(r => String(r.id) === String(entity.id)) || entity;
        return selectedReception.value;
    }

    /**
     * Endpoint TS-04: Ejecuta la comparación entre lo despachado y lo recibido.
     * @param {string|number} receptionId
     * @param {Array<{ id: string|number, receivedQuantity: number }>} items
     */
    async function compareQuantities(receptionId, items) {
        const response = await receptionApi.compareQuantities(receptionId, items);
        return response.data;
    }

    /**
     * Confirma la conformidad o cierre de la recepción (US-09).
     * @param {string|number} receptionId
     * @param {Object} verificationData
     */
    async function verifyReception(receptionId, verificationData = {}) {
        const current = receptions.value.find(r => String(r.id) === String(receptionId));
        const response = await receptionApi.verifyReception(receptionId, {
            ...verificationData,
            checklist: { ...current?.checklist, ...verificationData.checklist },
            observations: verificationData.observations ?? current?.observations
        });
        const updatedEntity = ReceptionAssembler.toEntityFromResource(response.data);
        await syncAfterReceptionChange();
        const refreshed = receptions.value.find(r => String(r.id) === String(receptionId));
        if (selectedReception.value && String(selectedReception.value.id) === String(receptionId)) {
            selectedReception.value = refreshed || updatedEntity;
        }
        return refreshed || updatedEntity;
    }

    /**
     * Registra un reporte de discrepancia con evidencia fotográfica (US-10).
     * @param {string|number} receptionId
     * @param {Object} payload - { observations, evidence, requestId }
     */
    async function reportDiscrepancy(receptionId, { observations, evidence, requestId = null }) {
        const hasPhotographicEvidence = Boolean(
            evidence || receptions.value.find(r => String(r.id) === String(receptionId))?.evidences?.length
        );
        return await verifyReception(receptionId, {
            status: RECEPTION_STATUS.VERIFIED_DISCREPANT,
            requestId,
            observations,
            checklist: {
                observationsRecorded: true,
                photographicEvidence: hasPhotographicEvidence
            }
        });
    }

    /**
     * Adjunta una foto o documento de evidencia a una recepción abierta.
     * @param {string|number} receptionId
     * @param {Object} evidenceData
     */
    async function addEvidence(receptionId, evidenceData) {
        const response = await receptionApi.addEvidence(receptionId, evidenceData);
        const updatedEntity = ReceptionAssembler.toEntityFromResource(response.data);

        const index = receptions.value.findIndex(r => String(r.id) === String(receptionId));
        if (index !== -1) {
            receptions.value[index] = updatedEntity;
        }
        if (selectedReception.value && String(selectedReception.value.id) === String(receptionId)) {
            selectedReception.value = updatedEntity;
        }
        return updatedEntity;
    }

    return {
        receptions,
        upcomingArrivals,
        selectedReception,
        loading,
        loadingArrivals,
        errors,
        filterProject,
        filterStatus,
        searchQuery,
        totalCount,
        todayReceptionsCount,
        completedCount,
        discrepantCount,
        pendingCount,
        filteredReceptions,
        fetchReceptions,
        fetchUpcomingArrivals,
        selectReception,
        registerReception,
        compareQuantities,
        verifyReception,
        reportDiscrepancy,
        addEvidence
    };
});

export default useReceptionStore;

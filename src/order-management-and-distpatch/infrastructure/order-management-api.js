import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const ordersEndpointPath     = import.meta.env.VITE_ORDERS_ENDPOINT_PATH;
const dispatchesEndpointPath = import.meta.env.VITE_DISPATCHES_ENDPOINT_PATH;

/**
 * Infrastructure gateway for Order Management and Dispatch bounded-context endpoints.
 *
 * @class OrderManagementApi
 * @extends BaseApi
 */
export class OrderManagementApi extends BaseApi {
    /**
     * @type {BaseEndpoint}
     * @private
     */
    #ordersEndpoint;
    /**
     * @type {BaseEndpoint}
     * @private
     */
    #dispatchesEndpoint;

    /** Creates endpoint clients for orders and dispatches. */
    constructor() {
        super();
        this.#ordersEndpoint = new BaseEndpoint(this, ordersEndpointPath);
        this.#dispatchesEndpoint = new BaseEndpoint(this, dispatchesEndpointPath);
    }

    /**
     * Fetches all orders.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the orders' response.
     */
    getOrders() {
        return this.#ordersEndpoint.getAll();
    }

    /**
     * Fetches a order by its ID.
     * @param {number|string} id - The ID of the order.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the order response.
     */
    getOrderById(id) {
        return this.#ordersEndpoint.getById(id);
    }

    /**
     * Creates a order resource.
     * @param {Object} resource - Order resource payload.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the created order response.
     */
    createOrder(resource) {
        return this.#ordersEndpoint.create(resource);
    }

    getRequestCatalog() {
        return this.http.get(`${ordersEndpointPath}/request-catalog`);
    }

    submitMaterialRequest(resource) {
        return this.http.post(`${ordersEndpointPath}/requests`, resource);
    }

    /**
     * Updates a order resource.
     * @param {Object} resource - Order resource payload (must include id).
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the updated order response.
     */
    async updateOrder(resource) {
        const latest = (await this.getOrderById(resource.id)).data;
        if (latest.status === resource.status) return {data: latest};
        const event = resource.timeline?.at(-1);
        if (latest.status === 'PENDING' && ['APPROVED', 'REJECTED'].includes(resource.status)) {
            await this.http.patch(`${ordersEndpointPath}/${resource.id}/status`, {status: 'UNDER_REVIEW', performedBy: 'Current user'});
        }
        return this.http.patch(`${ordersEndpointPath}/${resource.id}/status`, {
            status: resource.status, performedBy: 'Current user', description: event?.description || null
        });
    }

    /**
     * Deletes a order by its ID.
     * @param {number|string} id - The ID of the order to delete.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the delete response.
     */
    deleteOrder(id) {
        return this.#ordersEndpoint.delete(id);
    }

    /**
     * Fetches all dispatches.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the dispatches' response.
     */
    getDispatches() {
        return this.#dispatchesEndpoint.getAll();
    }

    /**
     * Fetches a dispatch by its ID.
     * @param {number|string} id - The ID of the dispatch.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the dispatch response.
     */
    getDispatchById(id) {
        return this.#dispatchesEndpoint.getById(id);
    }

    getDispatchWeighings(id) {
        return this.http.get(`${dispatchesEndpointPath}/${id}/weighing`);
    }

    recordDispatchWeighing(id, measurement) {
        return this.http.post(`${dispatchesEndpointPath}/${id}/weighing`, measurement, {timeout: 15000});
    }

    assignDispatchVehicle(id, vehicle) {
        return this.http.put(`${dispatchesEndpointPath}/${id}/vehicle`, {
            vehicleId: Number(vehicle.id), vehiclePlate: vehicle.licensePlate, performedBy: 'Current user'
        });
    }

    /**
     * Creates a dispatch resource.
     * @param {Object} resource - Dispatch resource payload.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the created dispatch response.
     */
    createDispatch(resource) {
        return this.http.post(`${dispatchesEndpointPath}/from-order`, {...resource, relatedOrderId: String(resource.relatedOrderId || '')});
    }

    /**
     * Updates a dispatch resource.
     * @param {Object} resource - Dispatch resource payload (must include id).
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the updated dispatch response.
     */
    async updateDispatch(resource) {
        let response = await this.getDispatchById(resource.id);
        if (resource.vehicleId && Number(resource.vehicleId) !== response.data.vehicleId) {
            response = await this.http.put(`${dispatchesEndpointPath}/${resource.id}/vehicle`, {
                vehicleId: Number(resource.vehicleId), vehiclePlate: resource.vehiclePlate, performedBy: 'Current user'
            });
        }
        const status = resource.status === 'DELIVERED' ? 'COMPLETED' : resource.status;
        if (status && status !== response.data.status) {
            response = status === 'CANCELLED'
                ? await this.http.post(`${dispatchesEndpointPath}/${resource.id}/cancellation`, {reason: resource.observations || 'Cancelled by user', performedBy: 'Current user'})
                : await this.http.patch(`${dispatchesEndpointPath}/${resource.id}/status`, {status, performedBy: 'Current user'});
        }
        return response;
    }

    /**
     * Deletes a dispatch by its ID.
     * @param {number|string} id - The ID of the dispatch to delete.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the delete response.
     */
    deleteDispatch(id) {
        return this.#dispatchesEndpoint.delete(id);
    }
}

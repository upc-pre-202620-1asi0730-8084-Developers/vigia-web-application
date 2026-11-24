import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const routesEndpointPath = import.meta.env.VITE_ROUTES_ENDPOINT_PATH || '/routes';

/**
 * Infrastructure gateway for Transit Traceability bounded-context endpoints.
 *
 * @class TransitTraceabilityApi
 * @extends BaseApi
 */
export class TransitTraceabilityApi extends BaseApi {
    /**
     * @type {BaseEndpoint}
     * @private
     */
    #routesEndpoint;

    /** Creates the endpoint client for routes. */
    constructor() {
        super();
        this.http.defaults.timeout = 15000;
        this.#routesEndpoint = new BaseEndpoint(this, routesEndpointPath);
    }

    /**
     * Fetches all routes.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the routes' response.
     */
    departureOptions(id) { return this.http.get(`/dispatches/${id}/departure`); }
    depart(id, plan) { return this.http.post(`/dispatches/${id}/departure`, plan); }

    getRoutes() {
        return this.#routesEndpoint.getAll();
    }

    /**
     * Fetches a route by its ID.
     * @param {number|string} id - The ID of the route.
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the route response.
     */
    getRouteById(id) {
        return this.#routesEndpoint.getById(id);
    }

    /**
     * Updates a route resource (accumulated telemetry, alerts and status).
     * @param {Object} resource - Route resource payload (must include id).
     * @returns {Promise<import('axios').AxiosResponse>} Promise resolving to the updated route response.
     */
    async updateRoute(resource) {
        const path = `${routesEndpointPath}/${resource.id}`;
        let response = await this.getRouteById(resource.id);
        const lastTime = response.data.positions.length ? Date.parse(response.data.positions.at(-1).reportedAt) : -Infinity;
        for (const position of resource.positions || []) {
            if (Date.parse(position.reportedAt) > lastTime) {
                const result = await this.http.post(`${path}/positions`, position);
                response = {...result, data: result.data.route};
            }
        }
        if (resource.status === 'SIGNAL_LOST' && response.data.status !== 'SIGNAL_LOST') {
            const result = await this.http.post(`${path}/signal-lost`, {});
            response = {...result, data: result.data.route};
        }
        for (const alert of resource.alerts || []) {
            const saved = response.data.alerts.find(a => String(a.id) === String(alert.id));
            if (saved && alert.notifiedAt && !saved.notifiedAt) await this.http.post(`${path}/alerts/${saved.id}/notify`);
        }
        return this.getRouteById(resource.id);
    }
}

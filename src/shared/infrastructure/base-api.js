import axios from "axios";
import {authorizationInterceptor} from '../../iam/infrastructure/authorization.interceptor.js';
import {clearSession} from '../../iam/infrastructure/session.js';



const platformApi = import.meta.env.VITE_LEARNING_PLATFORM_API_URL;
// Static hosting (Firebase) has no json-server: answer requests from the in-browser mock API.
const useInMemoryApi = import.meta.env.VITE_USE_IN_MEMORY_API === 'true';

/**
 * Shared infrastructure base class that configures the HTTP client.
 *
 * @class BaseApi
 */
export class BaseApi {
    /**
     * @private
     * Axios HTTP client instance
     * @type {import('axios').AxiosInstance}
     */
    #http;

    /**
     * Initializes the Axios HTTP client with the base URL from environment variables
     */
    constructor() {
        this.#http = axios.create({
            baseURL: platformApi,
            headers: {
                'Content-Type': 'application/json'
            },
        });
        if (useInMemoryApi) {
            // Loaded on demand so development builds never include the mock API.
            this.#http.defaults.adapter = config => import('./in-memory-api.js').then(module => module.inMemoryAdapter(config));
        }
        this.#http.interceptors.request.use(authorizationInterceptor);
        this.#http.interceptors.response.use(response => response, error => {
            if (error.response?.status === 401 && !error.config?.url?.includes('/authentication/')) {
                clearSession();
                window.dispatchEvent(new Event('vigia:session-expired'));
            }
            return Promise.reject(error);
        });
    }

    /**
     * Returns the configured Axios HTTP client.
     * @returns {import('axios').AxiosInstance}
     */
    get http() {
        return this.#http;
    }

}

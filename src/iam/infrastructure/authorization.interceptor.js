import {readSession} from './session.js';

export function authorizationInterceptor(config) {
    const session = readSession();
    if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
    return config;
}

export function authErrorKey(failure) {
    const status = Number(failure?.response?.status ?? 0);
    if (status === 401) return 'authErrors.credentials';
    if (status === 403) return 'authErrors.forbidden';
    if (status === 409) return 'authErrors.username';
    if (status === 400) return 'authErrors.validation';
    if (status === 429) return 'authErrors.rateLimit';
    return status === 0 ? 'authErrors.connection' : 'authErrors.server';
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks whether a reception resource contains a server-issued dispatch ID and delivery guide number.
 * @param {?Object} source
 * @returns {boolean}
 */
export function hasAuthoritativeGuide(source) {
    if (!source) return false;
    const dispatchId = String(source.dispatchId ?? '').trim();
    const guide = String(source.deliveryGuideNumber ?? '').trim();
    return dispatchId.length > 0 && guide.length > 0;
}

/**
 * Determines whether the active user can modify or close an open reception.
 * @param {?Object} reception
 * @param {string|number|null} currentUserId
 * @param {string} currentRole
 * @returns {boolean}
 */
export function canActorEditReception(reception, currentUserId, currentRole) {
    if (!reception || reception.isClosed) return false;
    if (currentRole === 'ADMIN') return true;
    if (currentRole !== 'SITE_MANAGER' || !currentUserId) return false;
    return String(reception.verifiedByUserId) === String(currentUserId);
}

/**
 * Reads a persisted idempotent reception request from storage if valid.
 * @param {?Storage} storage
 * @param {string} key
 * @returns {?{ requestId: string, action: string, dispatchId: string, guideNumber: string }}
 */
export function readPendingReceptionRequest(storage, key) {
    if (!storage || !key) return null;
    try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!UUID_PATTERN.test(String(parsed.requestId ?? ''))) return null;
        if (typeof parsed.action !== 'string' || !parsed.action) return null;
        return {
            requestId: String(parsed.requestId),
            action: parsed.action,
            dispatchId: String(parsed.dispatchId ?? ''),
            guideNumber: String(parsed.guideNumber ?? '')
        };
    } catch {
        return null;
    }
}

/**
 * Saves an idempotent reception request to storage so retries after lost responses keep the same UUID.
 * @param {?Storage} storage
 * @param {string} key
 * @param {{ requestId: string, action: string, dispatchId?: string, guideNumber?: string }} record
 * @returns {boolean}
 */
export function savePendingReceptionRequest(storage, key, record) {
    if (!storage || !key || !record || !UUID_PATTERN.test(String(record.requestId ?? ''))) return false;
    try {
        storage.setItem(key, JSON.stringify({
            requestId: String(record.requestId),
            action: String(record.action || ''),
            dispatchId: String(record.dispatchId ?? ''),
            guideNumber: String(record.guideNumber ?? '')
        }));
        return true;
    } catch {
        return false;
    }
}

/**
 * Clears a persisted idempotent reception request from storage.
 * @param {?Storage} storage
 * @param {string} key
 */
export function clearPendingReceptionRequest(storage, key) {
    if (!storage || !key) return;
    try {
        storage.removeItem(key);
    } catch {
        // Ignore blocked storage
    }
}

/**
 * Maps normalized API errors from reception endpoints to localized i18n keys.
 * @param {?Object} error
 * @returns {string}
 */
export function mapReceptionErrorKey(error) {
    const status = Number(error?.status ?? error?.response?.status ?? 0);
    const message = String(error?.message ?? error?.response?.data?.message ?? '').toLowerCase();
    const code = String(error?.code ?? error?.response?.data?.code ?? '').toUpperCase();

    if (status === 401 || status === 403) return 'receptions.errors.forbidden';
    if (status === 404) return 'receptions.errors.notFound';
    if (message.includes('delivery guide') || message.includes('guía') || message.includes('guide number')) {
        return 'receptions.errors.invalidGuide';
    }
    if (status === 409 || code === 'DUPLICATE_RECORD' || code === 'CONCURRENT_MODIFICATION') {
        if (message.includes('already has a reception')) return 'receptions.errors.duplicateReception';
        return 'receptions.errors.conflict';
    }
    if (status === 400) return 'receptions.errors.validation';
    if (status === 0 || code === 'NETWORK_ERROR') return 'receptions.errors.networkUncertain';
    return 'receptions.dialog.errorSaving';
}

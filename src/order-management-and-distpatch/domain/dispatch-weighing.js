const MAX_KG = 999999999.999;

export function validWeighing(values) {
    return ['weightKg', 'expectedWeightKg', 'toleranceKg'].every(key => {
        const value = values[key];
        return typeof value === 'number' && Number.isFinite(value) && value <= MAX_KG &&
            (key === 'toleranceKg' ? value >= 0 : value > 0) &&
            Number(value.toFixed(3)) === value;
    });
}

// Retain the exact payload after an ambiguous response, even across page reloads.
export function weighingStorageKey(accountId, dispatchId) {
    return `vigia.weighing.${accountId}.${dispatchId}`;
}

export function readPendingWeighing(storage, key) {
    try {
        const value = JSON.parse(storage.getItem(key));
        return value && validWeighing(value) &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)
            ? value : null;
    } catch { return null; }
}

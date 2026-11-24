export function validGuideDetails(value) {
    return value && ['driverName', 'carrierName'].every(key => typeof value[key] === 'string' &&
        value[key].trim().length > 0 && value[key].trim().length <= 150 && !/\p{Cc}/u.test(value[key]));
}

export function readPendingGuide(storage, key) {
    try {
        const value = JSON.parse(storage.getItem(key));
        return validGuideDetails(value) && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)
            ? value : null;
    } catch { return null; }
}

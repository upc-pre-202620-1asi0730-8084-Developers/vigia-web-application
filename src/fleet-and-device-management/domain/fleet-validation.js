export function vehicleValidation(data) {
    const plate = String(data.plate || '').toUpperCase().replace(/\s+/g, '');
    if (plate.length < 5 || plate.length > 12 || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(plate)) return 'plateInvalid';
    const capacity = Number(data.capacity);
    if (!Number.isFinite(capacity) || capacity < 0.01 || capacity > 150) return 'capacityInvalid';
    if (!String(data.brand || '').trim() || !String(data.model || '').trim() || data.brand.trim().length > 100 || data.model.trim().length > 100) return 'vehicleDetailsInvalid';
    if (data.gpsDeviceId?.trim().length > 64 || /\p{Cc}/u.test(data.gpsDeviceId || '')) return 'deviceInvalid';
    return null;
}

export function validGeofenceRadius(value) {
    return value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 10 && Number(value) <= 50000;
}

export function fleetErrorMessage(error, t) {
    if (!error) return '';
    const key = {
        FLEET_DEVICE_ALREADY_ASSIGNED: 'deviceAlreadyAssigned',
        FLEET_DUPLICATE_LICENSE_PLATE: 'plateDuplicate',
        FLEET_SITE_ALREADY_HAS_GEOFENCE: 'siteAlreadyHasGeofence',
        FLEET_CONCURRENT_MODIFICATION: 'concurrentChange',
        FLEET_INVALID_LICENSE_PLATE: 'plateInvalid',
        FLEET_INVALID_CAPACITY: 'capacityInvalid',
        FLEET_INVALID_GPS_DEVICE: 'deviceInvalid',
        FLEET_VEHICLE_NOT_FOUND: 'vehicleMissing',
    }[error.code];
    if (key) return t(`fleet.errors.${key}`, {plate: error.assignedLicensePlate || error.plate || t('fleet.errors.anotherVehicle'), deviceId: error.deviceId || ''});
    if (error.status === 0) return t('fleet.errors.uncertainRequest');
    if (error.status === 403) return t('fleet.errors.forbidden');
    if (error.status === 404) return t('fleet.errors.vehicleMissing');
    if (error.status === 400) return t('fleet.errors.invalidInput');
    return t('fleet.errors.requestFailed');
}

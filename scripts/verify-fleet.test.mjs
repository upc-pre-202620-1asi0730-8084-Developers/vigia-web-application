import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleValidation, validGeofenceRadius, fleetErrorMessage} from '../src/fleet-and-device-management/domain/fleet-validation.js';

const vehicle = {plate:'abc-123',capacity:8,brand:'Volvo',model:'FMX',gpsDeviceId:''};
test('vehicle input accepts minimum capacity and normalized plate, rejects invalid persisted values', () => {
    assert.equal(vehicleValidation(vehicle),null);
    assert.equal(vehicleValidation({...vehicle,capacity:0.01}),null);
    assert.equal(vehicleValidation({...vehicle,capacity:0.001}),'capacityInvalid');
    assert.equal(vehicleValidation({...vehicle,capacity:Infinity}),'capacityInvalid');
    assert.equal(vehicleValidation({...vehicle,plate:'!!!!!'}),'plateInvalid');
    assert.equal(vehicleValidation({...vehicle,brand:'B'.repeat(101)}),'vehicleDetailsInvalid');
    assert.equal(vehicleValidation({...vehicle,gpsDeviceId:'G'.repeat(65)}),'deviceInvalid');
});
test('circular radius matches both API boundaries and rejects absent or non-finite input', () => {
    for (const value of [10,200,50000]) assert.equal(validGeofenceRadius(value),true);
    for (const value of [null,'',NaN,Infinity,9.99,50000.01]) assert.equal(validGeofenceRadius(value),false);
});
test('GPS conflict retains actual owning plate and delegates messages to the active locale', () => {
    const error={code:'FLEET_DEVICE_ALREADY_ASSIGNED',assignedLicensePlate:'ABC-123',deviceId:'GPS-1'};
    const translate=(key,values)=>({key,...values});
    assert.deepEqual(fleetErrorMessage(error,translate),{key:'fleet.errors.deviceAlreadyAssigned',plate:'ABC-123',deviceId:'GPS-1'});
    assert.equal(fleetErrorMessage({status:0},key=>key),'fleet.errors.uncertainRequest');
});

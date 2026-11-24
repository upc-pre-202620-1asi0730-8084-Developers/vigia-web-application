import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDeparture,validDeparture} from '../src/transit-traceability/domain/departure-plan.js';
import {RouteAssembler} from '../src/transit-traceability/infrastructure/route.assembler.js';
const plan={originGeofenceId:1,estimatedArrival:'2026-11-25T10:00:00-05:00',plannedPath:[{latitude:0,longitude:0},{latitude:-12,longitude:-77}],requestId:'965236ac-8e11-4c3a-b821-18bfe612419e'};
test('recovers the exact pending departure, including UUID and route after response loss',()=>{
 const storage={getItem:()=>JSON.stringify(plan)};assert.deepEqual(readDeparture(storage,'departure'),plan);
 assert.equal(readDeparture({getItem:()=>'{bad'},'departure'),null);
 assert.equal(readDeparture({getItem:()=>{throw Error('denied');}},'departure'),null);
});
test('blocks invalid paths and timestamps while accepting coordinates at zero',()=>{
 assert.equal(validDeparture(plan),true);
 for(const override of [{estimatedArrival:''},{plannedPath:[{latitude:0,longitude:0}]},{plannedPath:[{latitude:91,longitude:0},{latitude:0,longitude:0}]},{plannedPath:[{longitude:0},{latitude:0,longitude:0}]}])assert.equal(validDeparture({...plan,...override}),false);
});
test('preserves device binding and closed tracking across API-to-UI round trips',()=>{
 const resource={id:2,dispatchId:'3',trackingSource:'DEVICE',trackingActive:false,gpsDeviceId:'GPS-3',departureRequestId:plan.requestId,status:'IN_TRANSIT'};
 const entity=RouteAssembler.toEntityFromResource(resource);assert.equal(entity.isActive,false);
 const next=RouteAssembler.toResourceFromEntity(entity);for(const k of ['trackingSource','trackingActive','gpsDeviceId','departureRequestId'])assert.equal(next[k],resource[k]);
});

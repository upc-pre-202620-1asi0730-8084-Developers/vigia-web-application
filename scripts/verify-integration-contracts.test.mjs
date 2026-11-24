import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DispatchAssembler} from '../src/order-management-and-distpatch/infrastructure/dispatch.assembler.js';
import {RouteAssembler} from '../src/transit-traceability/infrastructure/route.assembler.js';

test('dispatch numeric identity and immutable weighing/guide survive the UI boundary',()=>{
 const resource={id:42,code:'DS-42',relatedOrderId:'17',vehicleId:8,vehiclePlate:'ABC-123',status:'IN_TRANSIT',isAuthorized:true,canDepart:false,requiresWeightReview:false,latestWeighing:{id:5,weightKg:100,expectedWeightKg:100,toleranceKg:2},deliveryGuide:{guideNumber:'GD-00000042',dispatchId:42,weighingId:5}};
 const entity=DispatchAssembler.toEntityFromResource(resource);
 assert.equal(entity.id,42);assert.equal(entity.relatedOrderId,'17');assert.equal(entity.vehicleId,8);
 assert.equal(entity.deliveryGuide.dispatchId,entity.id);assert.equal(entity.deliveryGuide.weighingId,entity.latestWeighing.id);
 assert.equal(entity.isAuthorized,true);assert.equal(entity.canDepart,false);
});

test('dispatch UI completion and route arrival remain different contracts',()=>{
 assert.equal(DispatchAssembler.toEntityFromResource({id:42,status:'COMPLETED'}).status,'DELIVERED');
 const route=RouteAssembler.toEntityFromResource({id:9,dispatchId:'42',vehicleId:8,status:'ARRIVED',trackingSource:'DEVICE',trackingActive:false,gpsDeviceId:'GPS-8'});
 assert.equal(route.dispatchId,'42');assert.equal(route.isActive,false);
 assert.equal(DispatchAssembler.toEntityFromResource({id:42,status:'IN_TRANSIT'}).status,'IN_TRANSIT');
});

test('device tracking retains the active dispatch, GPS and departure request after resource conversion',()=>{
 const resource={id:9,dispatchId:'42',vehicleId:8,gpsDeviceId:'GPS-8',departureRequestId:'2ce653ea-f1d2-4b52-a4fd-996487885608',trackingSource:'DEVICE',trackingActive:true,status:'IN_TRANSIT',positions:[{latitude:0,longitude:0,speedKmh:20,reportedAt:'2026-11-24T12:00:00.123456Z'}]};
 const entity=RouteAssembler.toEntityFromResource(resource);const saved=RouteAssembler.toResourceFromEntity(entity);
 assert.equal(entity.isActive,true);for(const key of ['dispatchId','vehicleId','gpsDeviceId','departureRequestId','trackingSource','trackingActive'])assert.equal(saved[key],resource[key]);
 assert.equal(saved.positions[0].latitude,0);assert.equal(saved.positions[0].reportedAt,resource.positions[0].reportedAt);
});

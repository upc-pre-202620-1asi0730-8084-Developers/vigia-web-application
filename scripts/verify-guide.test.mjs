import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validGuideDetails,readPendingGuide} from '../src/order-management-and-distpatch/domain/dispatch-guide.js';
import {DispatchAssembler} from '../src/order-management-and-distpatch/infrastructure/dispatch.assembler.js';

test('driver/carrier validation accepts real names and rejects blank, oversized or control text',()=>{
  const details={driverName:'José López',carrierName:'Transportes del Sur'};
  assert.ok(validGuideDetails(details));
  for(const value of [null,'','   ','x'.repeat(151),'Line\nBreak','Control\u0085']) {
    assert.equal(!!validGuideDetails({...details,driverName:value}),false);
  }
});
test('pending guide retains exact request ID and names after reload',()=>{
  const details={driverName:'José López',carrierName:'Transportes del Sur',requestId:'11d33ad0-d38a-4234-a13d-932645322a44'};
  assert.deepEqual(readPendingGuide({getItem:()=>JSON.stringify(details)},'key'),details);
  for(const raw of ['{','null','{}',JSON.stringify({...details,requestId:'invalid'})])
    assert.equal(readPendingGuide({getItem:()=>raw},'key'),null);
});
test('authorization is taken from the API instead of inferred from a guide number',()=>{
  const guide={guideNumber:'GD-00000001',driverName:'Driver'};
  const dispatch=DispatchAssembler.toEntityFromResource({id:1,deliveryGuide:guide,isAuthorized:false,canDepart:false});
  assert.equal(dispatch.deliveryGuide.guideNumber,guide.guideNumber);
  assert.equal(dispatch.isAuthorized,false);
  assert.equal(dispatch.canDepart,false);
  assert.equal(DispatchAssembler.toEntityFromResource({id:1,isAuthorized:true,canDepart:true}).canDepart,true);
});

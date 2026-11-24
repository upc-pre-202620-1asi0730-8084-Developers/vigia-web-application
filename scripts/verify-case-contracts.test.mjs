import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DiscrepancyCaseAssembler} from '../src/discrepancy-and-evidence-management/infrastructure/discrepancy-case.assembler.js';

test('case keeps reception/dispatch identity and authoritative closure metadata',()=>{
 const resource={id:7,dispatchId:'42',receptionId:'19',caseNumber:'CASE-7',openedAt:'2026-11-24T12:00:00Z',closedAt:'2026-11-24T13:00:00Z',status:'Closed',responsibility:'Transport',resolutionSummary:'Received replacement material',projectName:'Site',reportedAt:'2026-11-24T12:00:00Z',evidences:[]};
 const entity=DiscrepancyCaseAssembler.toEntity(resource);
 for(const key of ['id','dispatchId','receptionId','caseNumber','closedAt','resolutionSummary'])assert.equal(entity[key],resource[key]);
 assert.equal(entity.status,'Closed');assert.equal(entity.responsibility,'Transport');
});

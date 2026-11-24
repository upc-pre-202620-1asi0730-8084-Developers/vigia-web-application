import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validWeighing, readPendingWeighing, weighingStorageKey} from '../src/order-management-and-distpatch/domain/dispatch-weighing.js';
import {DispatchAssembler} from '../src/order-management-and-distpatch/infrastructure/dispatch.assembler.js';

const measurement = {weightKg: 101.001, expectedWeightKg: 100, toleranceKg: 1.001};
test('net kg validation preserves zero tolerance and decimal boundary', () => {
    assert.ok(validWeighing(measurement));
    assert.ok(validWeighing({...measurement, toleranceKg: 0}));
    assert.ok(validWeighing({...measurement, weightKg: 999999999.999}));
    for (const value of [null, '', NaN, Infinity, -1, 0, 0.00000001, 1.0001, 1000000000]) {
        assert.equal(validWeighing({...measurement, weightKg: value}), false, String(value));
    }
    assert.equal(validWeighing({...measurement, expectedWeightKg: null}), false);
    assert.equal(validWeighing({...measurement, toleranceKg: -0.001}), false);
});
test('an ambiguous submission survives reload with the original payload and UUID', () => {
    const pending = {...measurement, requestId: '31d33ad0-d38a-4234-a13d-932645322a44'};
    const storage = {getItem: () => JSON.stringify(pending)};
    assert.deepEqual(readPendingWeighing(storage, 'key'), pending);
    assert.notEqual(weighingStorageKey(1, 2), weighingStorageKey(3, 2));
    assert.notEqual(weighingStorageKey(1, 2), weighingStorageKey(1, 3));
    for (const raw of ['broken', 'null', '{}', JSON.stringify({...pending, requestId: 'invalid'}), JSON.stringify({...pending, weightKg: 0})]) {
        assert.equal(readPendingWeighing({getItem: () => raw}, 'key'), null);
    }
    assert.equal(readPendingWeighing({getItem: () => {throw Error('blocked');}}, 'key'), null);
});
test('dispatch resources retain numeric identity and authoritative weighing flags', () => {
    const latestWeighing = {...measurement, id: 12, isCurrent: false, requiresReview: true};
    const dispatch = DispatchAssembler.toEntityFromResource({id: 7, code: 'DS-104', latestWeighing, requiresWeightReview: true});
    assert.equal(dispatch.id, 7);
    assert.equal(dispatch.code, 'DS-104');
    assert.equal(dispatch.latestWeighing.isCurrent, false);
    assert.equal(dispatch.requiresWeightReview, true);
    assert.equal(DispatchAssembler.toEntityFromResource({id: 8, requiresWeightReview: false}).requiresWeightReview, false);
});

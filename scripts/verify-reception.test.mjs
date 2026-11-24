import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    canActorEditReception,
    clearPendingReceptionRequest,
    hasAuthoritativeGuide,
    mapReceptionErrorKey,
    readPendingReceptionRequest,
    savePendingReceptionRequest
} from '../src/site-reception-and-verification/domain/reception-verification.js';
import { ReceptionAssembler } from '../src/site-reception-and-verification/infrastructure/reception.assembler.js';

const REQUEST_UUID = '33333333-3333-4333-8333-333333333333';

test('authoritative guide requires both dispatchId and deliveryGuideNumber', () => {
    assert.equal(hasAuthoritativeGuide({ dispatchId: '12', deliveryGuideNumber: 'GD-00000012' }), true);
    assert.equal(hasAuthoritativeGuide({ dispatchId: '12', deliveryGuideNumber: '' }), false);
    assert.equal(hasAuthoritativeGuide({ dispatchId: '', deliveryGuideNumber: 'GD-00000012' }), false);
    assert.equal(hasAuthoritativeGuide(null), false);
});

test('reception edit permission enforces open status and assigned resident or admin role', () => {
    const open = { isClosed: false, verifiedByUserId: '101' };
    const closed = { isClosed: true, verifiedByUserId: '101' };
    assert.equal(canActorEditReception(open, '101', 'SITE_MANAGER'), true);
    assert.equal(canActorEditReception(open, '202', 'SITE_MANAGER'), false);
    assert.equal(canActorEditReception(open, '202', 'WAREHOUSE_MANAGER'), false);
    assert.equal(canActorEditReception(open, '1', 'ADMIN'), true);
    assert.equal(canActorEditReception(closed, '101', 'SITE_MANAGER'), false);
    assert.equal(canActorEditReception(closed, '1', 'ADMIN'), false);
});

test('idempotent reception request persistence recovers UUID on retry and rejects invalid storage payloads', () => {
    const map = new Map();
    const storage = {
        getItem: k => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: k => map.delete(k)
    };
    const key = 'vigia.reception.register.101.45';
    assert.equal(savePendingReceptionRequest(storage, key, {
        requestId: REQUEST_UUID,
        action: 'register',
        dispatchId: '45',
        guideNumber: 'GD-00000045'
    }), true);
    assert.deepEqual(readPendingReceptionRequest(storage, key), {
        requestId: REQUEST_UUID,
        action: 'register',
        dispatchId: '45',
        guideNumber: 'GD-00000045'
    });
    clearPendingReceptionRequest(storage, key);
    assert.equal(readPendingReceptionRequest(storage, key), null);
    assert.equal(readPendingReceptionRequest({ getItem: () => '{"requestId":"bad","action":"register"}' }, key), null);
});

test('reception API error mapper classifies permission, guide mismatch, duplicate, conflict and network uncertainty', () => {
    assert.equal(mapReceptionErrorKey({ status: 403 }), 'receptions.errors.forbidden');
    assert.equal(mapReceptionErrorKey({ status: 404 }), 'receptions.errors.notFound');
    assert.equal(mapReceptionErrorKey({ status: 400, message: 'Delivery guide number does not match.' }), 'receptions.errors.invalidGuide');
    assert.equal(mapReceptionErrorKey({ status: 409, message: 'This dispatch already has a reception.' }), 'receptions.errors.duplicateReception');
    assert.equal(mapReceptionErrorKey({ status: 409, code: 'CONCURRENT_MODIFICATION' }), 'receptions.errors.conflict');
    assert.equal(mapReceptionErrorKey({ status: 0, code: 'NETWORK_ERROR' }), 'receptions.errors.networkUncertain');
});

test('reception assembler preserves requestId, verifiedByUserId, siteId and canonical evidence URLs', () => {
    const entity = ReceptionAssembler.toEntityFromResource({
        id: 7,
        dispatchId: '12',
        siteId: 3,
        siteName: 'Torre A',
        verifiedByUserId: '101',
        deliveryNoteNumber: 'GD-00000012',
        status: 'UnitArrived',
        evidences: [{ id: 5, fileUrl: '/api/v1/receptions/7/evidence/files/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', description: 'Photo', attachedAt: '2026-11-24T12:00:00Z' }]
    });
    assert.equal(entity.verifiedByUserId, '101');
    assert.equal(entity.deliveryGuideNumber, 'GD-00000012');
    assert.equal(entity.evidences[0].evidenceUrl, '/api/v1/receptions/7/evidence/files/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const dto = ReceptionAssembler.toResourceFromEntity({ ...entity, requestId: REQUEST_UUID });
    assert.equal(dto.requestId, REQUEST_UUID);
});

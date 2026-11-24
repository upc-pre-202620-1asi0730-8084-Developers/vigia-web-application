import test from 'node:test';
import assert from 'node:assert/strict';
import {storedPhotoPath,validatePhoto,photoIdentity,readPendingPhoto,samePhoto} from '../src/discrepancy-and-evidence-management/domain/stored-photo.js';
const id='12345678-1234-4234-8234-123456789abc';
test('authenticated downloads accept only the canonical receipt file route',()=>{
 assert.equal(storedPhotoPath(`/api/v1/receptions/7/evidence/files/${id}`,7),`/receptions/7/evidence/files/${id}`);
 for(const url of [`https://evil.test/api/v1/receptions/7/evidence/files/${id}`,`//evil.test/api/v1/receptions/7/evidence/files/${id}`,`/api/v1/receptions/8/evidence/files/${id}`,`/api/v1/receptions/7/evidence/files/${id}?x=1`,`/api/v1/receptions/7/../8/evidence/files/${id}`])assert.equal(storedPhotoPath(url,7),null);
});
test('photo validation rejects empty, oversized, unsupported and undescribed files',()=>{
 const file={name:'photo.png',type:'image/png',size:32};assert.equal(validatePhoto(file,'Evidence'),true);
 for(const bad of [{...file,size:0},{...file,size:5*1024*1024+1},{...file,type:'image/svg+xml'},{...file,name:'x'.repeat(121)}])assert.equal(validatePhoto(bad,'Evidence'),false);
 for(const caption of ['', ' ', 'x'.repeat(251),'line\nbreak'])assert.equal(validatePhoto(file,caption),false);
});
test('ambiguous upload recovery matches bytes and metadata, not only filename',async()=>{
 const file={name:'photo.png',type:'image/png',size:3,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};
 const identity=await photoIdentity(file);assert.equal(identity.sha256,'039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
 assert.equal(samePhoto(identity,{...identity}),true);assert.equal(samePhoto(identity,{...identity,sha256:'a'.repeat(64)}),false);
 const pending={requestId:id,identity,description:'Evidence'};assert.deepEqual(readPendingPhoto({getItem:()=>JSON.stringify(pending)},'key'),pending);
 for(const storage of [{getItem:()=>'{bad'},{getItem:()=>JSON.stringify({...pending,requestId:'invalid'})},{getItem:()=>{throw Error('blocked');}}])assert.equal(readPendingPhoto(storage,'key'),null);
});

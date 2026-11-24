import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {initialLocale,saveLocale,LOCALE_STORAGE_KEY} from '../src/shared/presentation/locale-policy.js';
import {authErrorKey} from '../src/iam/domain/auth-error.js';
const en=JSON.parse(fs.readFileSync(new URL('../src/locales/en.json',import.meta.url)));
const es=JSON.parse(fs.readFileSync(new URL('../src/locales/es.json',import.meta.url)));
const read=(obj,path)=>path.split('.').reduce((v,k)=>v?.[k],obj);
test('first visit and invalid preferences use English without following inherited object properties',()=>{
 for(const value of [null,'','fr','constructor','__proto__','toString'])assert.equal(initialLocale({getItem:()=>value}),'en');
 for(const value of ['es','en'])assert.equal(initialLocale({getItem:()=>value}),value);
 assert.equal(initialLocale({getItem(){throw Error('blocked');}}),'en');
});
test('language preference persists and restores while blocked storage does not prevent switching',()=>{
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(saveLocale(storage,'es'),true);assert.equal(values.get(LOCALE_STORAGE_KEY),'es');assert.equal(initialLocale(storage),'es');
 assert.equal(saveLocale(storage,'constructor'),false);assert.equal(initialLocale(storage),'es');
 assert.equal(saveLocale({setItem(){throw Error('blocked');}},'en'),false);
});
test('authentication failures map to translated keys, never raw server detail',()=>{
 const cases={0:'connection',400:'validation',401:'credentials',403:'forbidden',409:'username',429:'rateLimit',500:'server',502:'server'};
 for(const [status,key] of Object.entries(cases)){
  const result=authErrorKey({response:{status:Number(status),data:{message:'Private raw failure'}}});assert.equal(result,'authErrors.'+key);
  for(const messages of [en,es])assert.equal(typeof read(messages,result),'string');
 }
});
test('all bilingual keys and interpolation placeholders match across the catalogs',()=>{
 function leaves(object,prefix=''){return Object.entries(object).flatMap(([k,v])=>typeof v==='object'&&v!==null?leaves(v,prefix+k+'.'):[prefix+k]);}
 assert.deepEqual(leaves(en).sort(),leaves(es).sort());
 for(const key of leaves(en)){
  const placeholders=value=>[...String(value).matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(placeholders(read(en,key)),placeholders(read(es,key)),key);
 }
});
test('every route title key exists in both languages',()=>{
 function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(dir+'/'+x.name):[dir+'/'+x.name]);}
 const paths=files(fileURLToPath(new URL('../src',import.meta.url))).filter(p=>p.endsWith('routes.js')||p.endsWith('/router.js'));
 let count=0;for(const path of paths){for(const m of fs.readFileSync(path,'utf8').matchAll(/titleKey:\s*'([^']+)'/g)){count++;assert.ok(read(en,m[1]),m[1]);assert.ok(read(es,m[1]),m[1]);}}
 assert.ok(count>=20);
});

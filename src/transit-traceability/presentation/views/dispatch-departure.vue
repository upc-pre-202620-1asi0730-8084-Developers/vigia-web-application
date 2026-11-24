<script setup>
import {computed,ref,watch} from 'vue';
import {useRoute,onBeforeRouteLeave,onBeforeRouteUpdate} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {LMap,LTileLayer,LPolyline,LCircle} from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';
import {TransitTraceabilityApi} from '../../infrastructure/transit-traceability-api.js';
import {readDeparture,validDeparture} from '../../domain/departure-plan.js';
import useIamStore from '../../../iam/application/iam.store.js';
const api=new TransitTraceabilityApi();
const route=useRoute();const iam=useIamStore();const {t}=useI18n();
const data=ref(null),loading=ref(false),saving=ref(false),error=ref(''),success=ref(false),pending=ref(null);
const originId=ref(null),eta=ref(''),points=ref([]),confirmed=ref(false);
const key=computed(()=>`vigia.departure.${iam.currentUserId}.${route.params.id}`);
const origin=computed(()=>data.value?.origins.find(o=>o.id===Number(originId.value)));
const destination=computed(()=>data.value?.destination);
const locked=computed(()=>saving.value||!!pending.value);
const center=computed(()=>origin.value?[origin.value.centerPoint.latitude,origin.value.centerPoint.longitude]:[-12.0464,-77.0428]);
const path=computed(()=>points.value.map(p=>[p.latitude,p.longitude]));
let version=0;
onBeforeRouteLeave(()=>!saving.value);onBeforeRouteUpdate(()=>!saving.value);
async function load() {
 const current=++version;loading.value=true;error.value='';
 try {const response=await api.departureOptions(route.params.id);if(current===version)data.value=response.data;}
 catch(failure){if(current===version)error.value=failure.response?.status===404?'missing':'loadError';}
 finally{if(current===version)loading.value=false;}
}
function resetPath(){if(locked.value)return;points.value=origin.value&&destination.value?[{...origin.value.centerPoint},{...destination.value.centerPoint}]:[];confirmed.value=false;}
function addPoint(event){if(locked.value||points.value.length<2||points.value.length>=500)return;points.value.splice(points.value.length-1,0,{latitude:Number(event.latlng.lat.toFixed(6)),longitude:Number(event.latlng.lng.toFixed(6))});confirmed.value=false;}
watch(originId,resetPath);
watch(()=>route.params.id,async()=>{
 data.value=null;success.value=false;pending.value=readDeparture(sessionStorage,key.value);
 if(pending.value){originId.value=pending.value.originGeofenceId;points.value=pending.value.plannedPath;eta.value=new Date(Date.parse(pending.value.estimatedArrival)-new Date(pending.value.estimatedArrival).getTimezoneOffset()*60000).toISOString().slice(0,16);confirmed.value=true;}
 await load();
},{immediate:true});
async function depart(){
 if(saving.value||loading.value)return;
 error.value='';
 if(!pending.value){
  if(!Number.isFinite(Date.parse(eta.value))){error.value='invalid';return;}
  const estimatedArrival=new Date(eta.value).toISOString();
  const plan={originGeofenceId:Number(originId.value),estimatedArrival,plannedPath:points.value.map(p=>({...p})),requestId:crypto.randomUUID()};
  if(!confirmed.value||!validDeparture(plan)||Date.parse(estimatedArrival)<=Date.now()){error.value='invalid';return;}
  try{sessionStorage.setItem(key.value,JSON.stringify(plan));}catch{error.value='storageError';return;}
  pending.value=plan;
 }
 saving.value=true;
 try{
  const response=await api.depart(route.params.id,pending.value);
  sessionStorage.removeItem(key.value);pending.value=null;success.value=true;
  data.value={...data.value,routeId:response.data.id};
 }catch(failure){
  const status=failure.response?.status;
  if(status>=400&&status<500&&![408,429].includes(status)){
   sessionStorage.removeItem(key.value);pending.value=null;
   await load();error.value=status===409?'conflict':'saveError';
  }else error.value='uncertain';
 }finally{saving.value=false;}
}
</script>
<template>
 <main class="departure-page p-4" :aria-busy="saving||loading">
  <router-link :to="{name:'ordering-dispatch-guide',params:{id:route.params.id}}">{{t('departure.back')}}</router-link>
  <h1>{{t('departure.title')}}</h1><p>{{t('departure.description')}}</p>
  <p v-if="error" class="error" role="alert">{{t(`departure.${error}`)}}</p>
  <p v-if="loading" role="status">{{t('common.loading')}}</p>
  <p v-if="success" role="status">{{t('departure.started')}}</p>
  <pv-button :label="t('departure.reload')" :disabled="saving||loading" @click="load" />
  <template v-if="data&&!loading">
   <p>{{t('departure.gps')}}: {{data.gpsDeviceId||t('departure.noGps')}}</p>
   <p v-if="data.routeId&&!pending">{{t('departure.existing',{id:data.routeId})}}</p>
   <router-link v-if="data.routeId" :to="{path:'/transporte',query:{route:data.routeId}}">{{t('departure.tracking')}}</router-link>
   <p v-if="!data.canPlan&&!data.routeId">{{t('departure.requirements')}}</p>
   <p v-if="!data.origins.length||!data.destination">{{t('departure.geofencesRequired')}}</p>
   <p v-if="pending" role="status">{{t('departure.pending')}}</p>
   <form v-if="pending||(data.canPlan&&!data.routeId&&data.origins.length&&data.destination)" @submit.prevent="depart">
    <fieldset :disabled="locked" class="fields">
     <label for="departure-origin">{{t('departure.origin')}}</label>
     <pv-select input-id="departure-origin" v-model="originId" :options="data.origins" option-label="name" option-value="id" @change="resetPath" />
     <p>{{t('departure.destination')}}: {{data.destination?.name}}</p>
     <label for="departure-eta">{{t('departure.eta')}}</label><input id="departure-eta" v-model="eta" type="datetime-local" required class="p-inputtext" />
     <p>{{t('departure.pathHint')}}</p>
     <div class="map" v-if="origin">
      <l-map :center="center" :zoom="12" :use-global-leaflet="false" @click="addPoint">
       <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
       <l-polyline :lat-lngs="path" color="#1b3a5c" />
       <l-circle :lat-lng="center" :radius="origin.radiusMeters" :interactive="false" color="#1b3a5c" />
       <l-circle v-if="destination" :lat-lng="[destination.centerPoint.latitude,destination.centerPoint.longitude]" :radius="destination.radiusMeters" :interactive="false" color="#d38616" />
      </l-map>
     </div>
     <pv-button type="button" :label="t('departure.resetPath')" @click="resetPath" />
     <p>{{t('departure.points',{count:points.length})}}</p>
     <label><input v-model="confirmed" type="checkbox" required /> {{t('departure.confirm')}}</label>
    </fieldset>
    <pv-button type="submit" :label="t(pending?'departure.retry':'departure.submit')" :loading="saving" :disabled="saving||(!pending&&!confirmed)" />
   </form>
  </template>
 </main>
</template>
<style scoped>
.departure-page{max-width:72rem;margin:auto}.fields{display:grid;gap:.8rem;border:0;padding:1rem 0}.map{height:24rem;width:100%;border:1px solid #abb8c6}.error{color:var(--color-error);padding:.8rem}
</style>

<script setup>
import {computed,ref,watch} from 'vue';
import {useRoute,useRouter,onBeforeRouteLeave,onBeforeRouteUpdate} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {EvidenceFilesApi} from '../../../discrepancy-and-evidence-management/infrastructure/evidence-files-api.js';
import {storedPhotoPath} from '../../../discrepancy-and-evidence-management/domain/stored-photo.js';
import EvidenceUpload from '../../../discrepancy-and-evidence-management/presentation/components/evidence-upload.vue';
import ProtectedEvidencePhoto from '../../../discrepancy-and-evidence-management/presentation/components/protected-evidence-photo.vue';
import {ReceptionApi} from '../../infrastructure/reception-api.js';
const {t}=useI18n(),route=useRoute(),router=useRouter(),files=new EvidenceFilesApi(),api=new ReceptionApi();
const reception=ref(null),loading=ref(false),uploading=ref(false),submitting=ref(false),error=ref(''),observations=ref('');
const busy=computed(()=>uploading.value||submitting.value);
const photos=computed(()=>(reception.value?.evidences||[]).filter(e=>storedPhotoPath(e.fileUrl,reception.value.id)));
const reported=computed(()=>reception.value?.status==='DiscrepancyReported');
const closed=computed(()=>!!reception.value?.closedAt);
onBeforeRouteLeave(()=>!busy.value);onBeforeRouteUpdate(()=>!busy.value);
let generation=0;
async function load(){
 const current=++generation;loading.value=true;error.value='';
 try{const result=await files.context(route.params.id);if(current===generation)reception.value=result.data;}
 catch{if(current===generation){reception.value=null;error.value='missing';}}
 finally{if(current===generation)loading.value=false;}
}
watch(()=>route.params.id,()=>{reception.value=null;observations.value='';load();},{immediate:true});
async function report(){
 if(busy.value||!reception.value||reported.value||closed.value)return;
 if(!photos.value.length){error.value='photoFirst';return;}
 if(!observations.value.trim())return;
 submitting.value=true;error.value='';
 try{
  const r=reception.value;
  await api.verifyReception(r.id,{status:'VERIFIED_DISCREPANT',observations:observations.value.trim(),checklist:{
   materialGoodCondition:r.materialGoodCondition,quantityVerified:r.quantityVerified,deliveryGuideReceived:r.deliveryGuideReceived,
   observationsRecorded:true,photographicEvidence:true}});
  await load();
 }catch{await load();if(!reported.value)error.value='reportError';}
 finally{submitting.value=false;}
}
</script>
<template>
 <main class="report-evidence" :aria-busy="loading||busy">
  <pv-button :label="t('evidenceFiles.back')" :disabled="busy" @click="router.back()" />
  <h1>{{t('evidenceFiles.report')}}</h1>
  <p v-if="error" role="alert">{{t(`evidenceFiles.${error}`)}}</p>
  <pv-button v-if="!reception&&!loading" :label="t('evidenceFiles.reload')" @click="load" />
  <template v-if="reception">
   <p>{{reception.siteName}} · {{reception.deliveryNoteNumber}} · #{{reception.id}}</p>
   <p v-if="reported" role="status">{{t('evidenceFiles.reported')}}</p>
   <EvidenceUpload :disabled="submitting" v-if="!closed" :reception-id="reception.id" @busy="uploading=$event" @uploaded="load" />
   <div class="photos"><ProtectedEvidencePhoto v-for="photo in photos" :key="photo.id" :url="photo.fileUrl" :reception-id="reception.id" :caption="photo.description" /></div>
   <template v-if="!reported&&!closed">
    <label for="discrepancy-observations">{{t('evidenceFiles.observations')}}</label>
    <textarea id="discrepancy-observations" v-model="observations" maxlength="2000" :disabled="busy" rows="4" />
    <pv-button :label="t('evidenceFiles.report')" :loading="submitting" :disabled="busy||!photos.length||!observations.trim()" @click="report" />
   </template>
  </template>
 </main>
</template>
<style scoped>.report-evidence{display:grid;gap:1rem;max-width:960px;margin:1rem auto;padding:1rem}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}textarea{width:100%;box-sizing:border-box}</style>

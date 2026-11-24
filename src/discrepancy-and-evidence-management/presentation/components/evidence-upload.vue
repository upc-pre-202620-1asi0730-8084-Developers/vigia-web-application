<script setup>
import {computed,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import useIamStore from '../../../iam/application/iam.store.js';
import {EvidenceFilesApi} from '../../infrastructure/evidence-files-api.js';
import {validatePhoto,photoIdentity,readPendingPhoto,samePhoto} from '../../domain/stored-photo.js';
const props=defineProps({receptionId:{type:[String,Number],required:true},disabled:{type:Boolean,default:false}});
const emit=defineEmits(['uploaded','busy']);const {t}=useI18n();const iam=useIamStore();const api=new EvidenceFilesApi();
const fileInput=ref(null);
const file=ref(null),description=ref(''),pending=ref(null),busy=ref(false),error=ref(''),saved=ref(null);
const key=computed(()=>`vigia.photo.${iam.currentUserId}.${props.receptionId}`);
const inputId=computed(()=>`evidence-file-${props.receptionId}`);const captionId=computed(()=>`evidence-caption-${props.receptionId}`);
watch(key,()=>{file.value=null;saved.value=null;pending.value=readPendingPhoto(sessionStorage,key.value);description.value=pending.value?.description||'';error.value='';},{immediate:true});
function selectFile(event){file.value=event.target.files?.[0]||null;error.value='';saved.value=null;}
async function upload(){
 if(busy.value||props.disabled)return;error.value='';saved.value=null;
 if(!validatePhoto(file.value,description.value)){error.value='invalid';return;}
 busy.value=true;emit('busy',true);
 try{
  const identity=await photoIdentity(file.value);
  if(pending.value && (!samePhoto(identity,pending.value.identity)||description.value.trim()!==pending.value.description)){error.value='sameFile';return;}
  if(!pending.value){
   const plan={requestId:crypto.randomUUID(),identity,description:description.value.trim()};
   try{sessionStorage.setItem(key.value,JSON.stringify(plan));}catch{error.value='storageError';return;}
   pending.value=plan;
  }
  const response=await api.upload(props.receptionId,file.value,pending.value.description,pending.value.requestId);
  saved.value=response.data;sessionStorage.removeItem(key.value);pending.value=null;file.value=null;if(fileInput.value)fileInput.value.value='';description.value='';emit('uploaded',response.data);
 }catch(failure){
  const status=failure.response?.status;
  if([400,401,403,404,413].includes(status)||['SITE_RECEPTION_ALREADY_CLOSED','SITE_RECEPTION_DISCREPANCY_ALREADY_REPORTED'].includes(failure.response?.data?.code)){sessionStorage.removeItem(key.value);pending.value=null;error.value=status===413?'invalid':status===403||status===404?'forbidden':'saveError';}
  else error.value=status===409?'conflict':'uncertain';
 }finally{busy.value=false;emit('busy',false);}
}
</script>
<template>
 <section class="upload-photo" :aria-busy="busy">
  <h3>{{t('evidenceFiles.uploadTitle')}}</h3><p>{{t('evidenceFiles.limits')}}</p>
  <p v-if="pending" role="status">{{t('evidenceFiles.pending')}}</p>
  <p v-if="error" role="alert">{{t(`evidenceFiles.${error}`)}}</p>
  <p v-if="saved" role="status">{{t('evidenceFiles.saved')}}</p>
  <label :for="inputId">{{t('evidenceFiles.photo')}}</label>
  <input ref="fileInput" :id="inputId" type="file" accept="image/png,image/jpeg" :disabled="busy||disabled" @change="selectFile" />
  <label :for="captionId">{{t('evidenceFiles.description')}}</label>
  <input :id="captionId" v-model="description" maxlength="250" :disabled="busy||disabled||!!pending" class="p-inputtext" />
  <pv-button :label="t(pending?'evidenceFiles.retry':'evidenceFiles.upload')" :loading="busy" :disabled="busy||disabled||!file||!description.trim()" @click="upload" />
 </section>
</template>
<style scoped>.upload-photo{display:grid;gap:.7rem;padding:1rem;border:1px solid var(--color-border);border-radius:.5rem}.upload-photo h3,.upload-photo p{margin:0}</style>

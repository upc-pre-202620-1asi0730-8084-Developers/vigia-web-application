<script setup>
import {ref,watch,onUnmounted} from 'vue';
import {useI18n} from 'vue-i18n';
import useIamStore from '../../../iam/application/iam.store.js';
import {EvidenceFilesApi} from '../../infrastructure/evidence-files-api.js';
import {storedPhotoPath} from '../../domain/stored-photo.js';
const props=defineProps({url:String,receptionId:[String,Number],caption:String});
const {t}=useI18n();const iam=useIamStore();const api=new EvidenceFilesApi();
const source=ref(''),loading=ref(false),error=ref(false),legacy=ref(false);
let generation=0,controller;
function clear(){controller?.abort();if(source.value)URL.revokeObjectURL(source.value);source.value='';}
watch(()=>[props.url,props.receptionId,iam.currentUserId],async()=>{
 const version=++generation;clear();error.value=false;legacy.value=!storedPhotoPath(props.url,props.receptionId);loading.value=false;
 if(legacy.value)return;
 controller=new AbortController();loading.value=true;
 try{const response=await api.photo(props.url,props.receptionId,controller.signal);if(version!==generation)return;source.value=URL.createObjectURL(response.data);}
 catch(failure){if(version===generation&&failure.code!=='ERR_CANCELED')error.value=true;}
 finally{if(version===generation)loading.value=false;}
},{immediate:true});
onUnmounted(()=>{generation++;clear();});
</script>
<template>
 <div class="protected-photo" :aria-busy="loading">
  <p v-if="legacy" class="reference">{{t('evidenceFiles.externalReference')}}</p>
  <p v-else-if="loading" role="status">{{t('common.loading')}}</p>
  <p v-else-if="error" role="alert">{{t('evidenceFiles.unavailable')}}</p>
  <template v-if="source"><img :src="source" :alt="caption||t('evidenceFiles.photo')" /><a :href="source" download="evidence-photo">{{t('evidenceFiles.download')}}</a></template>
 </div>
</template>
<style scoped>
.protected-photo{display:grid;gap:.6rem}.protected-photo img{width:100%;max-height:22rem;object-fit:contain}.reference{padding:1rem;background:var(--color-surface)}
</style>

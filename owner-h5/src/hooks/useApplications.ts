import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {useRouter} from 'vue-router'
import {discoverApplications,selectApplication} from '../services/applications'
import {state} from '../services/session'
import {errorText} from '../api/http'
export function useApplications(){
 const router=useRouter(),loading=ref(false),error=ref('')
 let disposed=false,sequence=0,pendingRevision=-1
 async function load(){
  if(loading.value&&pendingRevision===state.revision)return
  const version=++sequence;pendingRevision=state.revision
  loading.value=true;error.value=''
  try{await discoverApplications();if(!disposed&&version===sequence&&state.session)await router.replace('/')}
  catch(e){if(!disposed&&version===sequence)error.value=errorText(e)}finally{if(!disposed&&version===sequence)loading.value=false}
 }
 async function choose(id:string){
  if(loading.value)return
  const version=++sequence;pendingRevision=state.revision;loading.value=true;error.value=''
  try{await selectApplication(id);if(!disposed&&version===sequence)await router.replace('/')}
  catch(e){if(!disposed&&version===sequence)error.value=errorText(e)}finally{if(!disposed&&version===sequence)loading.value=false}
 }
 async function showAll(){state.requestedApplicationId=undefined;await load()}
 // 宿主可在选择页再次交接身份；旧请求仍在进行时，也必须为新身份重新核验。
 watch(()=>state.identity,identity=>{if(identity&&!state.ready)void load()})
 onMounted(load);onBeforeUnmount(()=>{disposed=true})
 return {loading,error,load,choose,showAll}
}

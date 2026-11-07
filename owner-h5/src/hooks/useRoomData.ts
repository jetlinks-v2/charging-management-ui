import {ref,watch,onScopeDispose} from 'vue'
import {currentRoom} from '../services/rooms'
import {errorText} from '../api/http'
import type {Room,Pager} from '../types'
/** 换房后丢弃旧请求，清空旧数据；失败不显示上一套房金额。 */
export function useRoomData<T>(loader:(room:Room)=>Promise<T>){
 const data=ref<T>(),loading=ref(false),error=ref('');let generation=0
 async function refresh(){const version=++generation,room=currentRoom.value;data.value=undefined;error.value='';if(!room)return;loading.value=true
 try{const result=await loader(room);if(version===generation)data.value=result}catch(e){if(version===generation)error.value=errorText(e)}finally{if(version===generation)loading.value=false}}
 watch(currentRoom,()=>void refresh(),{immediate:true});onScopeDispose(()=>generation++)
 return {data,loading,error,refresh}
}
export function useRoomPage<T>(loader:(room:Room,page:number)=>Promise<Pager<T>>){
 const rows=ref<T[]>([]),loading=ref(false),error=ref(''),total=ref(0);let page=0,generation=0
 async function load(reset=false){const room=currentRoom.value;if(!room)return;if(loading.value&&!reset)return
 if(reset){generation++;page=0;rows.value=[];total.value=0}const version=generation;loading.value=true;error.value=''
 try{const result=await loader(room,page);if(version!==generation)return;rows.value.push(...result.data as typeof rows.value);total.value=result.total;page++}catch(e){if(version===generation)error.value=errorText(e)}finally{if(version===generation)loading.value=false}}
 watch(currentRoom,()=>{generation++;rows.value=[];total.value=0;loading.value=false;if(currentRoom.value)void load(true)},{immediate:true});onScopeDispose(()=>generation++)
 return {rows,loading,error,total,load}
}

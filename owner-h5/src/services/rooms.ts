import {computed,reactive} from 'vue'
import {getRooms} from '../api/finance'
import {state} from './session'
import type {Room} from '../types'
export const roomsState=reactive<{rooms:Room[];selected?:Room;loading:boolean;error:string;choosing:boolean}>({rooms:[],loading:false,error:'',choosing:false})
let generation=0
const storageKey=()=>`finance-owner:room:${state.session?.tenantDomain}:${state.session?.applicationId}:${state.authorization?.user.id}`
export function resetRooms(){generation++;roomsState.rooms=[];roomsState.selected=undefined;roomsState.error='';roomsState.choosing=false;roomsState.loading=false}
export async function loadRooms(){
 const version=++generation;roomsState.loading=true;roomsState.error=''
 try{const rooms=await getRooms();if(version!==generation)return;roomsState.rooms=rooms
  const saved=sessionStorage.getItem(storageKey());roomsState.selected=rooms.find(r=>r.projectId+':'+r.spaceId===saved)||(rooms.length===1?rooms[0]:undefined)
  roomsState.choosing=rooms.length>1&&!roomsState.selected
 }catch(e){if(version===generation)roomsState.error=e instanceof Error?e.message:'房屋加载失败'}finally{if(version===generation)roomsState.loading=false}
}
export function selectRoom(room:Room){roomsState.selected=room;roomsState.choosing=false;sessionStorage.setItem(storageKey(),room.projectId+':'+room.spaceId)}
export const currentRoom=computed(()=>roomsState.selected)

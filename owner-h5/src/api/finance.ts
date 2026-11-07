import {request} from './http'
import type {Authorization,Room,Pager,Bill,Account,Entry,PaymentRecord,Setting,Quote,QuoteInput} from '../types'
export const authorize=()=>request<Authorization>('/authorize/me')
const base='/property/finance/owner'
const roomPath=(room:Room)=>`${base}/projects/${encodeURIComponent(room.projectId)}/spaces/${encodeURIComponent(room.spaceId)}`
export const getRooms=()=>request<Room[]>(base+'/rooms')
export const getBills=(room:Room,paid=false,page=0)=>request<Pager<Bill>&{totalAmount:string}>(`${roomPath(room)}/bills?paid=${paid}&pageIndex=${page}&pageSize=20`)
export const getAccounts=(room:Room)=>request<Account[]>(roomPath(room)+'/accounts')
export const getEntries=(room:Room,id:string,page=0)=>request<Pager<Entry>>(`${roomPath(room)}/accounts/${encodeURIComponent(id)}/entries?pageIndex=${page}&pageSize=20`)
export const getRecords=(room:Room,page=0)=>request<Pager<PaymentRecord>>(`${roomPath(room)}/records?pageIndex=${page}&pageSize=20`)
export const getOptions=(room:Room)=>request<Setting[]>(roomPath(room)+'/prepay/options')
export const createQuote=(room:Room,input:QuoteInput)=>request<Quote>(roomPath(room)+'/prepay/quote',input)
export const revalidate=(room:Room,quoteId:string)=>request<Quote>(roomPath(room)+'/prepay/revalidate',{quoteId})

export const getRoomEntries=(room:Room,page=0)=>request<Pager<Entry>>(`${roomPath(room)}/entries?pageIndex=${page}&pageSize=20`)

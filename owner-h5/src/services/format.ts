import dayjs from 'dayjs'
export const money=(value?:string)=>value===undefined?'—':new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value))
export const time=(value?:string)=>value&&dayjs(value).isValid()?dayjs(value).format('YYYY-MM-DD HH:mm'):'—'
export const period=(start:string,end:string)=>`${start} 至 ${end}`
export const nature=(value:string)=>({owner:'业主',tenant:'租户',other:'其他'}[value]||'客户')
export const periodType=(value:string)=>({ARREARS:'历史欠费',CURRENT:'当前账期',FUTURE:'未来账期'}[value]||'费用账期')
export const entryAction=(value:string)=>({TOPUP:'费用预存',REVOKE_TOPUP:'预存撤销',DEPOSIT:'存入',OFFSET:'抵扣',REFUND:'退款',TRANSFER_IN:'转入',TRANSFER_OUT:'转出',REVOKE:'撤销',RETURN:'退回',CARRY_FORWARD:'自动结转'}[value]||'账户变动')
export const paidStatus=(value:string)=>({PAID:'已收款',SUCCESS:'已收款',COMPLETED:'已完成',REFUNDED:'已退款',PARTIAL_REFUNDED:'部分退款',POSTED:'已入账'}[value]||'已收款')
export function months(method:string){return method==='QUARTERLY'?[3,6,9,12]:[1,2,3,4,5,6,7,8,9,10,11,12]}
export const cents=(value:string)=>BigInt(value.replace('.','').padEnd(value.includes('.')?value.length-1+(2-(value.split('.')[1]?.length||0)):value.length+2,'0'))
export const subtract=(a:string,b:string)=>{const v=cents(a)-cents(b);return `${v<0?'-':''}${(v<0?-v:v)/100n}.${String((v<0?-v:v)%100n).padStart(2,'0')}`}

export const signedMoney=(value:string)=>`${cents(value)>0n?'+':cents(value)<0n?'−':''}${money(value.replace(/^-/,'')).replace(/^−/,'')}`

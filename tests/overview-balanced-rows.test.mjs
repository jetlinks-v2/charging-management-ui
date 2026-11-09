import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'
const compiled = await build({entryPoints:['utils/balancedRows.ts'],bundle:true,write:false,platform:'node',format:'cjs'})
const mod={exports:{}}
new Function('module','exports',compiled.outputFiles[0].text)(mod,mod.exports)
const {balancedRows}=mod.exports
for (const [count,width,expected] of [[12,1200,[6,6]],[13,1200,[7,6]],[12,800,[4,4,4]],[1,1200,[1]],[0,1200,[]],[20,1920,[10,10]]]) {
  test(`balances ${count} states at ${width}px without losing items`,()=>{
    const values=Array.from({length:count},(_,i)=>i)
    const rows=balancedRows(values,width)
    assert.deepEqual(rows.map(r=>r.length),expected)
    assert.deepEqual(rows.flat(),values)
    if(rows.length) assert.ok(Math.max(...rows.map(r=>r.length))-Math.min(...rows.map(r=>r.length))<=1)
  })
}

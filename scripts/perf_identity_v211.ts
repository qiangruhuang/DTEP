import { verifyOidcToken } from '../src/lib/security/identity'

function percentile(xs:number[], q:number){ const a=[...xs].sort((x,y)=>x-y); const i=Math.min(a.length-1,Math.max(0,Math.ceil(q*a.length)-1)); return a[i] }

async function main(){
  const token=process.env.TEST_TOKEN
  if(!token) throw new Error('TEST_TOKEN missing')
  const n=Number(process.env.PERF_N || '100')
  const times:number[]=[]
  let actor=''
  for(let i=0;i<n;i++){
    const t0=performance.now(); const x=await verifyOidcToken(token); times.push(performance.now()-t0); actor=x.actorId || ''
  }
  console.log(JSON.stringify({test:'OIDC-RS256-JWKS-verify',iterations:n,actorId:actor,p50Ms:percentile(times,.5),p95Ms:percentile(times,.95),p99Ms:percentile(times,.99),meanMs:times.reduce((a,b)=>a+b,0)/times.length,decision:actor==='ACT-LIU'?'PASS':'FAIL'}))
}
main().catch(e=>{console.error(e);process.exit(1)})

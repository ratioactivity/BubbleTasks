const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const M=require('../daily-tracker-model.js');
const code=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/daily-tracker-sync/index.ts'),'utf8');
assert(code.startsWith(fs.readFileSync(require('node:path').join(__dirname,'../daily-tracker-model.js'),'utf8')));
const DAILY='246162c5-d30d-44a2-a04b-8fdc269ff8a5',READINGS='96298643-8f41-4d97-b0fc-bd3f9282915c',ARTISTS='59385886-0371-4790-b157-fbf889570be8';
const owner='11111111-1111-1111-1111-111111111111',date='2026-10-31',plain=x=>(x||[]).map(v=>v.text?.content||v.plain_text||'').join('');
let handler,leaseHeld=false,failNotion=false,notionCalls=0;const pages=new Map(),blocks=new Map(),env={SUPABASE_URL:'https://project.test',SUPABASE_SERVICE_ROLE_KEY:'backend-service-test',NOTION_TOKEN:'backend-notion-test',NOTION_OWNER_USER_ID:owner};
const tracker=M.normalize({version:1,artists:[{name:'Heart',genres:['Rock']}],days:{[date]:{revision:'v1',timezone:'America/Chicago',music:{title:'Dreamboat Annie',artists:['Heart']},sleep:{bed:'2026-10-31T08:00',wake:'2026-10-31T14:30',bedAt:'2026-10-31T13:00:00Z',wakeAt:'2026-10-31T19:30:00Z'},mood:[{id:'m1',time:'2026-10-31T18:00:00Z',rating:8,note:'okay'},{id:'m2',time:'2026-10-31T20:00:00Z',rating:4,note:''}],pain:[{id:'p1',time:'2026-10-31T20:00:00Z',rating:6,note:''}],symptoms:[{id:'s1',name:'Bladder cramps',area:'Pelvic',time:'2026-10-31T20:00:00Z',rating:7,note:'A note'}]}}});
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function fetchMock(url,options={}){
 const u=new URL(url),body=options.body?JSON.parse(options.body):{},method=options.method||'GET';
 if(u.hostname==='project.test'){
  if(u.pathname==='/auth/v1/user')return options.headers.Authorization==='Bearer valid-owner'?respond({id:owner}):options.headers.Authorization==='Bearer other'?respond({id:'other-user'}):respond({},401);
  assert.equal(options.headers.Authorization,'Bearer backend-service-test');
  if(u.pathname.endsWith('bubbletasks_claim_notion_sync')){if(leaseHeld)return respond(false);leaseHeld=true;return respond(true);}
  if(u.pathname.endsWith('bubbletasks_release_notion_sync')){leaseHeld=false;return respond(null);}
  if(u.pathname.endsWith('bubbletasks_saves')){assert.equal(u.searchParams.get('user_id'),'eq.'+owner);return respond([{data:{dailyTracker:tracker}}]);}
  throw Error('Unexpected Supabase path');
 }
 assert.equal(u.hostname,'api.notion.com');notionCalls++;assert.equal(options.headers.Authorization,'Bearer backend-notion-test');assert.equal(options.headers['Notion-Version'],'2025-09-03');
 if(failNotion){failNotion=false;return respond({},429);}
 let match=u.pathname.match(/^\/v1\/data_sources\/([^/]+)\/query$/);
 if(match){const source=match[1],filter=body.filter;return respond({results:[...pages.values()].filter(p=>p.parent.data_source_id===source&&!p.archived).filter(p=>!filter||filter.title?plain(p.properties[filter.property]?.title)===filter.title.equals:filter.rich_text?plain(p.properties[filter.property]?.rich_text)===filter.rich_text.equals:filter.relation?(p.properties[filter.property]?.relation||[]).some(r=>r.id===filter.relation.contains):true),has_more:false});}
 if(u.pathname==='/v1/pages'&&method==='POST'){const p={id:crypto.randomUUID(),...body};p.url='https://www.notion.so/'+p.id;pages.set(p.id,p);blocks.set(p.id,[{id:crypto.randomUUID(),type:'paragraph',paragraph:{rich_text:[{text:{content:'Unrelated user note'}}]}}]);return respond(p);}
 match=u.pathname.match(/^\/v1\/pages\/([^/]+)$/);if(match){const p=pages.get(match[1]);assert(p);if(body.properties)p.properties={...p.properties,...body.properties};if(body.archived)p.archived=true;return respond(p);}
 match=u.pathname.match(/^\/v1\/blocks\/([^/]+)\/children$/);if(match){const children=blocks.get(match[1])||[];if(method==='GET')return respond({results:children,has_more:false});for(const b of body.children)children.push({id:crypto.randomUUID(),...b});blocks.set(match[1],children);return respond({results:children});}
 match=u.pathname.match(/^\/v1\/blocks\/([^/]+)$/);if(match){for(const children of blocks.values()){const block=children.find(b=>b.id===match[1]);if(block){Object.assign(block,body);return respond(block);}}}
 throw Error('Unexpected Notion path');
}
vm.runInNewContext(code,{Deno:{env:{get:k=>env[k]},serve:fn=>handler=fn},fetch:fetchMock,crypto,Response,Request,URL,AbortSignal,TextEncoder,setTimeout:(fn)=>setTimeout(fn,0),clearTimeout,console});
const request=(body={date},token='valid-owner',origin='https://ratioactivity.github.io')=>handler(new Request('https://project.test/functions/v1/daily-tracker-sync',{method:'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
(async()=>{
 assert.equal((await request({},'valid-owner','https://other.test')).status,403);assert.equal((await request({date},'')).status,401);assert.equal((await request({date},'invalid')).status,401);assert.equal((await request({date},'other')).status,403);assert.equal(notionCalls,0);
 delete env.NOTION_OWNER_USER_ID;assert.equal((await request()).status,503);env.NOTION_OWNER_USER_ID=owner;
 assert.equal((await request({date:'2026-02-30'})).status,400);
 let r=await request();assert.equal(r.status,200);let result=await r.json();assert.equal(result.revision,'v1');
 const daily=[...pages.values()].find(p=>p.parent.data_source_id===DAILY);assert(daily);assert.equal(daily.properties['Average Mood'].number,6);assert.equal(daily.properties['Average Pain'].number,6);assert.equal(daily.properties['Mood Color'].select.name,'Mint');assert.equal(daily.properties['Song of the Day'].title[0].text.content,'Dreamboat Annie');assert.equal([...pages.values()].filter(p=>p.parent.data_source_id===READINGS&&!p.archived).length,4);assert.equal([...pages.values()].filter(p=>p.parent.data_source_id===ARTISTS).length,1);
 const count=pages.size;r=await request();assert.equal(r.status,200);assert.equal(pages.size,count);assert.equal(blocks.get(daily.id).length,2);assert.equal(plain(blocks.get(daily.id)[0].paragraph.rich_text),'Unrelated user note');
 tracker.days[date].pain=[];tracker.days[date].revision='v2';r=await request();assert.equal(r.status,200);assert.equal(pages.size,count);assert.equal(daily.properties['Average Pain'].number,null);assert.equal(daily.properties['Peak Pain'].number,null);assert.equal([...pages.values()].filter(p=>p.parent.data_source_id===READINGS&&!p.archived).length,3);
 leaseHeld=true;assert.equal((await request()).status,409);leaseHeld=false;
 const statuses=await Promise.all([request(),request()]);assert.deepEqual(statuses.map(r=>r.status).sort(),[200,409]);
 failNotion=true;r=await request();assert.equal(r.status,500);assert(!leaseHeld);r=await request();assert.equal(r.status,200);assert.equal(pages.size,count);
 assert(!JSON.stringify(await r.json()).includes('backend-notion-test'));
 console.log('PASS: owner-only auth, fail-closed config, canonical online reads, artist reuse, idempotent daily/reading upserts, averages, deleted readings, preserved user blocks, concurrent leases, and retry after Notion failure. All services mocked.');
})().catch(e=>{console.error(e);process.exit(1)});

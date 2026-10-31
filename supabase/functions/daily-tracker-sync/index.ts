/* Shared pure helpers for the Day dashboard and the bundled Notion function. */
(() => {
  const AREAS=['Gastrointestinal','Immune','Neurological','Musculoskeletal','Pelvic','Urinary','Cardiovascular','Respiratory','Energy & Sleep','Dermatological','Mental & Emotional','Misc.'];
  const COLORS=['#c9b7e8','#bdc9ef','#aed1ec','#addddc','#bce1c7','#e4e6b7','#eee0ae','#efc9ad','#eebcba','#ecb1cd'];
  const text=(v,max=2000)=>typeof v==='string'?v.slice(0,max):'';
  const tags=v=>[...new Map((Array.isArray(v)?v:[]).slice(0,100).map(x=>text(x,100).trim().replace(/^#+/,'')).filter(Boolean).map(x=>[x.toLowerCase(),x])).values()];
  const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const validDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return Number.isFinite(+d)&&dateKey(d)===s;};
  const localTime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)&&validDate(s.slice(0,10))&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.slice(11));
  const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():'';
  const rating=v=>Number.isInteger(v)&&v>=1&&v<=10?v:null;
  const mean=a=>a.length?a.reduce((s,x)=>s+x.rating,0)/a.length:null;
  const sleepHours=day=>{const a=day.sleep?.bed,b=day.sleep?.wake;if(!localTime(a)||!localTime(b))return null;const hours=((day.sleep.bedAt&&day.sleep.wakeAt)?(new Date(day.sleep.wakeAt)-new Date(day.sleep.bedAt)):(new Date(b)-new Date(a)))/3600000;return hours>=0&&hours<=48?hours:null;};
  const moodColor=day=>{const avg=mean(day.mood);return avg===null?'#eee8f7':COLORS[Math.max(0,Math.min(9,Math.round(avg)-1))];};
  const moodBand=day=>{const m=mean(day.mood);return m===null?null:m<2.5?'Purple':m<4.5?'Blue':m<6.5?'Mint':m<7.5?'Yellow':m<9.5?'Peach':'Pink';};
  function emptyDay(){return {revision:'',updatedAt:'',timezone:'',sleep:{bed:'',wake:'',bedAt:'',wakeAt:''},music:{title:'',artists:[],genres:null},mood:[],pain:[],symptoms:[],cycle:{menstruating:null,flow:'',note:''},activities:[],focus:[],watching:[],meals:[],learned:[],notes:''};}
  function day(value){
    const v=value&&typeof value==='object'?value:{}, d=emptyDay();
    d.revision=text(v.revision,100);d.updatedAt=iso(v.updatedAt);d.timezone=text(v.timezone,100);
    d.sleep={bed:localTime(v.sleep?.bed)?v.sleep.bed:'',wake:localTime(v.sleep?.wake)?v.sleep.wake:'',bedAt:iso(v.sleep?.bedAt),wakeAt:iso(v.sleep?.wakeAt)};
    d.music={title:text(v.music?.title,200),artists:tags(v.music?.artists),genres:v.music?.genres===null||v.music?.genres===undefined?null:tags(v.music.genres)};
    for(const type of ['mood','pain'])d[type]=(Array.isArray(v[type])?v[type]:[]).slice(0,300).filter(e=>e&&text(e.id,100)&&iso(e.time)&&rating(e.rating)!==null).map(e=>({id:text(e.id,100),time:iso(e.time),rating:rating(e.rating),note:text(e.note)}));
    d.symptoms=(Array.isArray(v.symptoms)?v.symptoms:[]).slice(0,300).filter(e=>e&&text(e.id,100)&&text(e.name,100)&&iso(e.time)).map(e=>({id:text(e.id,100),time:iso(e.time),name:text(e.name,100),area:AREAS.includes(e.area)?e.area:'Misc.',rating:rating(e.rating),note:text(e.note)}));
    d.cycle={menstruating:typeof v.cycle?.menstruating==='boolean'?v.cycle.menstruating:null,flow:['Spotting','Light','Medium','Heavy'].includes(v.cycle?.flow)?v.cycle.flow:'',note:text(v.cycle?.note)};
    d.activities=tags(v.activities);
    for(const type of ['focus','watching'])d[type]=(Array.isArray(v[type])?v[type]:[]).slice(0,100).filter(e=>e&&text(e.id,100)&&text(e.name,100)).map(e=>({id:text(e.id,100),name:text(e.name,100),note:text(e.note),...(type==='focus'?{onMind:e.onMind===true,worked:e.worked===true}:{})}));
    for(const type of ['meals','learned'])d[type]=(Array.isArray(v[type])?v[type]:[]).slice(0,100).filter(e=>e&&text(e.id,100)&&text(e.text,4000)&&iso(e.time)).map(e=>({id:text(e.id,100),time:iso(e.time),text:text(e.text,4000),...(type==='meals'?{label:text(e.label,30)}:{})}));
    d.notes=text(v.notes,10000);return d;
  }
  function normalize(v){
    if(v!==undefined&&(!v||typeof v!=='object'||Array.isArray(v)))throw Error('Invalid daily tracker data');
    if(v?.version!==undefined&&v.version!==1)throw Error('This daily tracker version needs a newer BubbleTasks app.');
    const result={version:1,days:{},symptoms:[],artists:[]};
    for(const [key,value] of Object.entries(v?.days||{})){if(validDate(key))result.days[key]=day(value);}
    result.symptoms=(Array.isArray(v?.symptoms)?v.symptoms:[]).slice(0,2000).filter(s=>s&&text(s.name,100)).map(s=>({name:text(s.name,100),area:AREAS.includes(s.area)?s.area:'Misc.'}));
    result.artists=(Array.isArray(v?.artists)?v.artists:[]).slice(0,2000).filter(a=>a&&text(a.name,100)).map(a=>({name:text(a.name,100),genres:tags(a.genres)}));
    return result;
  }
  const genres=(d,t)=>d.music.genres===null?tags(d.music.artists.flatMap(name=>t.artists.find(a=>a.name.toLowerCase()===name.toLowerCase())?.genres||[])):d.music.genres;
  function summary(date,d,t,formatTime){
    const time=formatTime||((s)=>s), lines=[d.music.title||date,'Date: '+date];
    const add=(label,value)=>{if(value!==null&&value!==undefined&&value!=='')lines.push(label+': '+value);};
    add('Artist(s)',d.music.artists.join(', '));add('Song genres',genres(d,t).join(', '));
    add('Bed time',d.sleep.bed);add('Wake time',d.sleep.wake);const hours=sleepHours(d);add('Hours slept',hours===null?null:Math.round(hours*100)/100);
    add('Average mood',mean(d.mood)?.toFixed(1));add('Average pain',mean(d.pain)?.toFixed(1));add('Peak pain',d.pain.length?Math.max(...d.pain.map(e=>e.rating)):null);
    for(const kind of ['mood','pain'])for(const e of d[kind])add(kind==='mood'?'Mood reading':'Pain reading',time(e.time)+' · '+e.rating+'/10'+(e.note?' · '+e.note:''));
    for(const e of d.symptoms)add('Symptom',time(e.time)+' · '+e.area+' · '+e.name+(e.rating?' · '+e.rating+'/10':'')+(e.note?' · '+e.note:''));
    add('Menstruating',d.cycle.menstruating===null?null:d.cycle.menstruating?'Yes':'No');
    if(d.cycle.menstruating===true)add('Flow',d.cycle.flow);add('Cycle notes',d.cycle.note);
    add('Activities',d.activities.join(', '));
    for(const e of d.focus)add('Hyperfixation',e.name+' · '+[e.onMind?'On my mind':'',e.worked?'Worked on':'',e.note].filter(Boolean).join(' · '));
    for(const e of d.watching)add('Watching',e.name+(e.note?' · '+e.note:''));
    for(const e of d.meals)add('Meal',time(e.time)+' · '+(e.label?e.label+' · ':'')+e.text);
    for(const e of d.learned)add('Learned',time(e.time)+' · '+e.text);
    add('Notes',d.notes);return lines.join('\n\n');
  }
  const api={AREAS,COLORS,text,tags,dateKey,validDate,localTime,iso,rating,mean,sleepHours,moodColor,moodBand,emptyDay,day,normalize,genres,summary};
  globalThis.BubbleTasksDailyModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();

// Deploy as daily-tracker-sync. The source above bundles the same pure model as the browser.
const MODEL=globalThis.BubbleTasksDailyModel;
const ORIGIN='https://ratioactivity.github.io';
const DAILY='246162c5-d30d-44a2-a04b-8fdc269ff8a5',READINGS='96298643-8f41-4d97-b0fc-bd3f9282915c',ARTISTS='59385886-0371-4790-b157-fbf889570be8';
const HEADERS={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store',Vary:'Origin'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...HEADERS,'Content-Type':'application/json'}});
const chunks=text=>{const parts=[];for(let n=0;n<text.length;n+=1800)parts.push({type:'text',text:{content:text.slice(n,n+1800)}});return parts;};
const rt=value=>({rich_text:chunks(String(value||''))}),ttl=value=>({title:chunks(String(value||''))}),num=value=>({number:value??null}),sel=value=>({select:value?{name:value}:null}),multi=values=>({multi_select:MODEL.tags(values).map(name=>({name}))}),dt=value=>({date:value?{start:value}:null});
const plain=items=>(items||[]).map(e=>e.plain_text??e.text?.content??'').join('');
const compactId=id=>String(id).replace(/-/g,'');
function sameProps(page,wanted){
  return Object.entries(wanted).every(([name,value])=>{
    const current=page.properties?.[name]||{},type=Object.keys(value)[0],a=value[type],b=current[type];
    if(type==='title'||type==='rich_text')return plain(a)===plain(b);
    if(type==='number')return (a??null)===(b??null);
    if(type==='select')return (a?.name??null)===(b?.name??null);
    if(type==='multi_select')return JSON.stringify(a.map(e=>e.name).sort())===JSON.stringify((b||[]).map(e=>e.name).sort());
    if(type==='relation')return JSON.stringify(a.map(e=>compactId(e.id)).sort())===JSON.stringify((b||[]).map(e=>compactId(e.id)).sort());
    if(type==='date')return a?.start?.includes('T')?Date.parse(a.start)===Date.parse(b?.start):(a?.start??null)===(b?.start??null);
    return false;
  });
}
Deno.serve(async req=>{
  if(req.headers.get('origin')&&req.headers.get('origin')!==ORIGIN)return reply({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(req.method!=='POST')return reply({error:'Use POST.'},405);
  const start=Date.now(),lease=crypto.randomUUID();let locked=false,userId='',date='',db;
  try{
    const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!service)return reply({error:'Supabase backend configuration is missing.'},503);
    const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Sign in to BubbleTasks first.'},401);
    const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:service,Authorization:authorization},signal:AbortSignal.timeout(15000)});
    const user=await auth.json().catch(()=>({}));if(!auth.ok||!user.id)return reply({error:'Your BubbleTasks session has expired. Sign in again.'},401);
    const owner=Deno.env.get('NOTION_OWNER_USER_ID');
    if(!owner)return reply({error:'Add NOTION_OWNER_USER_ID in Supabase secrets. Day → Connection setup shows your account ID.'},503);
    if(user.id!==owner)return reply({error:'This Notion connection belongs to another BubbleTasks account.'},403);
    const secret=Deno.env.get('NOTION_TOKEN');if(!secret)return reply({error:'Add NOTION_TOKEN in Supabase secrets.'},503);
    const raw=await req.text();if(raw.length>2000)return reply({error:'Request too large.'},413);
    const body=JSON.parse(raw);date=body.date;userId=user.id;if(!MODEL.validDate(date))return reply({error:'Choose a valid log date.'},400);
    db=async(path,method='GET',body)=>{
      const res=await fetch(url+'/rest/v1/'+path,{method,signal:AbortSignal.timeout(15000),headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(!res.ok)throw Error('Run the daily-tracker Notion SQL migration in Supabase before uploading.');
      return res.status===204?null:await res.json();
    };
    // A single owner-wide lease also prevents duplicate artist creation on concurrent dates.
    locked=await db('rpc/bubbletasks_claim_notion_sync','POST',{p_user_id:userId,p_date:'1900-01-01',p_lease:lease});
    if(locked!==true)return reply({error:'Another daily upload is running. Try again shortly.'},409);
    const saved=await db('bubbletasks_saves?user_id=eq.'+encodeURIComponent(userId)+'&select=data');
    const tracker=MODEL.normalize(saved?.[0]?.data?.dailyTracker),day=tracker.days[date];
    if(!day?.revision)return reply({error:'This day has not reached your BubbleTasks online save yet. Wait for Synced, then retry.'},409);
    let timeZone=day.timezone||'UTC';try{new Intl.DateTimeFormat('en',{timeZone}).format(new Date());}catch{timeZone='UTC';}
    let lastCall=0;
    const notion=async(path,method='GET',body)=>{
      if(Date.now()-start>100000)throw Error('Upload paused to stay within the time limit. Retry to continue; saved entries will not be duplicated.');
      const wait=Math.max(0,360-(Date.now()-lastCall));if(wait)await new Promise(r=>setTimeout(r,wait));lastCall=Date.now();
      const res=await fetch('https://api.notion.com/v1/'+path,{method,signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+secret,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){if(res.status===429)throw Error('Notion is rate limiting uploads. Wait a moment, then retry.');if(res.status===401||res.status===403||res.status===404)throw Error('Notion access needs attention. Check NOTION_TOKEN and connect the BubbleTasks integration to the tracker parent page.');throw Error('Notion could not save this update. Existing entries are kept; retry shortly.');}
      return data;
    };
    const query=async(source,filter)=>{const rows=[];let cursor;do{const data=await notion('data_sources/'+source+'/query','POST',{page_size:100,...(filter?{filter}:{}),...(cursor?{start_cursor:cursor}:{})});rows.push(...data.results);cursor=data.has_more?data.next_cursor:null;}while(cursor);return rows;};
    const upsert=async(source,existing,properties)=>{
      if(existing){if(!sameProps(existing,properties))await notion('pages/'+existing.id,'PATCH',{properties});return {...existing,properties:{...existing.properties,...properties}};}
      return await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:source},properties});
    };
    const artistPages=[];
    for(const name of day.music.artists){
      const existing=(await query(ARTISTS,{property:'Artist',title:{equals:name}}))[0],defaults=tracker.artists.find(a=>a.name.toLowerCase()===name.toLowerCase())?.genres||[];
      const page=await upsert(ARTISTS,existing,{Artist:ttl(name),Genres:multi(defaults)});artistPages.push(page.id);
    }
    const key=userId+':'+date;
    const existing=(await query(DAILY,{property:'Log Key',rich_text:{equals:key}}))[0];
    const properties={
      'Song of the Day':ttl(day.music.title||date),Date:dt(date),'Log Key':rt(key),
      'Song Artists':{relation:artistPages.map(id=>({id}))},'Song Genres':multi(MODEL.genres(day,tracker)),
      'Bed Time':dt(day.sleep.bedAt),'Wake Time':dt(day.sleep.wakeAt),
      'Average Mood':num(MODEL.mean(day.mood)),'Average Pain':num(MODEL.mean(day.pain)),'Peak Pain':num(day.pain.length?Math.max(...day.pain.map(e=>e.rating)):null),
      'Mood Color':sel(MODEL.moodBand(day)),Symptoms:multi(day.symptoms.map(e=>e.name)),'Symptom Areas':multi(day.symptoms.map(e=>e.area)),
      Menstruating:sel(day.cycle.menstruating===null?null:day.cycle.menstruating?'Yes':'No'),Flow:sel(day.cycle.menstruating===true?day.cycle.flow:null),'Cycle Notes':rt(day.cycle.note),
      Activities:multi(day.activities),Hyperfixations:multi(day.focus.map(e=>e.name)),'On My Mind':multi(day.focus.filter(e=>e.onMind).map(e=>e.name)),'Worked On':multi(day.focus.filter(e=>e.worked).map(e=>e.name)),
      'Focus Notes':rt(day.focus.map(e=>e.name+': '+[e.onMind?'On my mind':'',e.worked?'Worked on':'',e.note].filter(Boolean).join(' · ')).join('\n')),
      Watching:multi(day.watching.map(e=>e.name)),'Watching Notes':rt(day.watching.map(e=>e.name+': '+e.note).join('\n')),
      Meals:rt(day.meals.map(e=>(e.label?e.label+': ':'')+e.text).join('\n')),'Learned Today':rt(day.learned.map(e=>e.text).join('\n')),Notes:rt(day.notes),'Last Synced':dt(new Date().toISOString())
    };
    const daily=await upsert(DAILY,existing,properties);
    const readings=[...day.mood.map(e=>({...e,type:'Mood'})),...day.pain.map(e=>({...e,type:'Pain'})),...day.symptoms.map(e=>({...e,type:'Symptom'}))];
    const oldReadings=await query(READINGS,{property:'Daily Log',relation:{contains:daily.id}}),oldByKey=new Map(oldReadings.map(p=>[plain(p.properties?.['Entry Key']?.rich_text),p]));
    const wanted=new Set();
    for(const entry of readings){
      const entryKey=userId+':'+date+':'+entry.id;wanted.add(entryKey);
      await upsert(READINGS,oldByKey.get(entryKey),{
        Entry:ttl(entry.type==='Symptom'?entry.name:entry.type+' '+entry.rating+'/10'),
        'Daily Log':{relation:[{id:daily.id}]},Timestamp:dt(entry.time),Type:sel(entry.type),Rating:num(entry.rating),
        Symptom:rt(entry.name||''),'Body Area':sel(entry.area||null),Notes:rt(entry.note),'Entry Key':rt(entryKey)
      });
    }
    for(const [entryKey,page] of oldByKey)if(entryKey.startsWith(userId+':'+date+':')&&!wanted.has(entryKey))await notion('pages/'+page.id,'PATCH',{archived:true});
    const formatted=MODEL.summary(date,day,tracker,time=>new Intl.DateTimeFormat('en-US',{timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(time)));
    const summaryText='BubbleTasks daily summary\n\n'+formatted;
    const blocks=[];let cursor;do{const page=await notion('blocks/'+daily.id+'/children?page_size=100'+(cursor?'&start_cursor='+encodeURIComponent(cursor):''));blocks.push(...page.results);cursor=page.has_more?page.next_cursor:null;}while(cursor);
    const managed=blocks.find(b=>b.type==='paragraph'&&plain(b.paragraph.rich_text).startsWith('BubbleTasks daily summary\n'));
    if(managed){if(plain(managed.paragraph.rich_text)!==summaryText)await notion('blocks/'+managed.id,'PATCH',{paragraph:{rich_text:chunks(summaryText)}});}
    else await notion('blocks/'+daily.id+'/children','PATCH',{children:[{object:'block',type:'paragraph',paragraph:{rich_text:chunks(summaryText)}}]});
    return reply({date,revision:day.revision,url:daily.url||'https://www.notion.so/'+compactId(daily.id)});
  }catch(error){return reply({error:error instanceof SyntaxError?'Invalid request.':error.message||'Upload failed. Your BubbleTasks save is safe.'},error instanceof SyntaxError?400:500);}
  finally{if(locked&&db)try{await db('rpc/bubbletasks_release_notion_sync','POST',{p_user_id:userId,p_date:'1900-01-01',p_lease:lease});}catch{/* Lease expires automatically; never expose backend response details. */}}
});

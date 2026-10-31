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

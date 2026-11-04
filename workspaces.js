/* Separate local guest activity from the signed-in account's cached save. */
(() => {
  const SAVE='bubbletasks_plain_v1',SESSION='bubbletasks_cloud_session_v1',MODE='bubbletasks_workspace_v1',GUEST='bubbletasks_guest_workspace_save_v1',ACCOUNT='bubbletasks_account_workspace_v1:',UNOWNED='bubbletasks_unowned_workspace_v1';
  const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const write=(key,value)=>set.call(localStorage,key,JSON.stringify(value));
  const LEGACY=['bubblemarks.bookmarks.v1','bubblemarks.categories.v1','bubblemarks.preferences.v1'];
  const VIEWS=['bubbletasks_notes_view_v1','bubbletasks_day_view_v1','bubbletasks_schedule_view_v1','bubbletasks_details_view_v1','bubbletasks_watchlist_view_v1'];
  let state=read(MODE),blocked=false;
  const stamp=save=>({...save,_workspace:{mode:state.mode,id:state.id||null}});
  const checklistDefinitions=value=>({version:2,items:(Array.isArray(value?.items)?value.items:[]).map(e=>({id:e.id,title:e.title,list:e.list,done:false,doneOn:''})),weekly:(Array.isArray(value?.weekly)?value.weekly:[]).map(e=>({id:e.id,title:e.title,day:e.day,list:e.list,openingDoneOn:'',closingDoneOn:''})),logs:{}});
  const empty=()=>({tasks:[],archived:[],bored:[],completions:[],agenda:{dateKey:new Date().toLocaleDateString('en-CA'),items:[],previousDayItems:[]},storyDetails:{},calendarEvents:[],googleEventCategories:{},googleEventImports:[],notes:[],dailyTracker:{},dailySchedule:[],detailsChecklists:{},watchlist:{},bubblemarks:{},layout:'columns',activeTab:'Work',migratedV2Tasks:true});
  function views(){return Object.fromEntries(VIEWS.map(k=>[k,localStorage.getItem(k)]));}
  function setViews(saved,guest=false){for(const key of VIEWS){const value=guest?(key==='bubbletasks_details_view_v1'?'true':'false'):saved?.[key];if(value===null||value===undefined)remove.call(localStorage,key);else set.call(localStorage,key,value);} }
  function archiveAccount(id,save){
    const meaningful=['tasks','archived','notes','calendarEvents','dailySchedule'].some(k=>save[k]?.length)||Object.keys(save.dailyTracker?.days||{}).length||save.watchlist?.titles?.length||save.bubblemarks&&Object.keys(save.bubblemarks).length||LEGACY.some(k=>localStorage.getItem(k));
    if(id||meaningful)write(id?ACCOUNT+id:UNOWNED,{save,views:views(),legacy:Object.fromEntries(LEGACY.map(k=>[k,localStorage.getItem(k)]))});
  }
  function sharedDefinitions(owner,guest,baseline){
    if(!guest)return owner;const result={...owner,logs:guest.logs||{}};
    for(const key of ['items','weekly']){
      const old=(baseline?.[key]||[]),local=checklistDefinitions(guest)[key],latest=owner[key];
      if(JSON.stringify(local)===JSON.stringify(old)){result[key]=latest;continue;}
      result[key]=local.flatMap(g=>{const before=old.find(e=>e.id===g.id),fresh=latest.find(e=>e.id===g.id);return before&&JSON.stringify(before)===JSON.stringify(g)?(fresh?[fresh]:[]):[g];});
      for(const fresh of latest)if(!old.some(e=>e.id===fresh.id)&&!result[key].some(e=>e.id===fresh.id))result[key].push(fresh);
    }
    return result;
  }
  function atomic(action,extra=[]){
    const keys=[SAVE,SESSION,MODE,GUEST,UNOWNED,...VIEWS,...LEGACY,...extra],before=new Map(keys.map(k=>[k,localStorage.getItem(k)])),prior=state;
    try{return action();}catch(error){state=prior;for(const key of keys)remove.call(localStorage,key);for(const[key,value]of before)if(value!==null)set.call(localStorage,key,value);throw error;}
  }
  function switchGuest(){
    const current=read(SAVE)||{},from=state?.mode==='account'?state.id:null;
    if(state?.mode!=='guest')archiveAccount(from||read('bubbletasks_cloud_owner_v1'),current);
    const guest={...empty(),...(read(GUEST)||{})};
    const definitions=checklistDefinitions(current.detailsChecklists);guest.detailsChecklists=sharedDefinitions(definitions,read(GUEST)?.detailsChecklists,read(GUEST)?._checklistSource);guest._checklistSource=definitions;
    // Personal-only modules are unavailable in a guest workspace.
    guest.dailyTracker={};guest.bubblemarks={};
    write(GUEST,{...guest,_workspace:{mode:'guest',id:null}});remove.call(localStorage,SESSION);state={mode:'guest'};write(MODE,state);write(SAVE,stamp(guest));setViews(null,true);
    for(const key of LEGACY)remove.call(localStorage,key);
  }
  function restoreAccount(id){
    if(state?.mode==='account'&&state.id===id)return false;
    const current=read(SAVE)||{};
    if(state?.mode==='guest')write(GUEST,current);else if(state?.mode==='account')archiveAccount(state.id,current);
    const archived=read(ACCOUNT+id),destination=archived;
    const saved=destination?.save||{...empty(),detailsChecklists:checklistDefinitions(current.detailsChecklists)};
    state={mode:'account',id};write(MODE,state);write(SAVE,stamp(saved));setViews(destination?.views);
    for(const key of LEGACY){const canonical=saved.bubblemarks?.[key],value=canonical===undefined?destination?.legacy?.[key]:JSON.stringify(canonical);if(value===null||value===undefined)remove.call(localStorage,key);else set.call(localStorage,key,value);}
    return true;
  }
  const session=read(SESSION);
  try{
  if(!state){state=session?.user?.id?{mode:'account',id:session.user.id}:{mode:'account',id:read('bubbletasks_cloud_owner_v1')||null};if(session?.user?.id){write(MODE,state);write(SAVE,stamp(read(SAVE)||{}));}else switchGuest();}
  else if(!session?.access_token&&state.mode!=='guest')switchGuest();
  else if(state.mode==='account'&&(read(SAVE)?._workspace?.mode!=='account'||read(SAVE)?._workspace?.id!==state.id)){write(SAVE,stamp(read(ACCOUNT+state.id)?.save||empty()));}
  else if(state.mode==='guest'){
    const current=read(SAVE);if(current?._workspace?.mode!=='guest')write(SAVE,stamp(read(GUEST)||empty()));
    setViews({...views(),bubbletasks_day_view_v1:'false'});
  }
  }catch(error){blocked=true;document.documentElement.classList.add('workspace-error');window.addEventListener('DOMContentLoaded',()=>{const message=document.createElement('section');message.className='workspace-error-message';const text=document.createElement('p');text.textContent='The guest workspace could not be opened safely. Your saved data is still on this device. Sign in to reopen your account.';const button=document.createElement('button');button.textContent='Sign in';button.addEventListener('click',()=>document.querySelector('[data-cloud-login]')?.click());message.append(text,button);document.body.prepend(message);});}
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&key===SAVE){const save=stamp(JSON.parse(value));value=JSON.stringify(save);if(state.mode==='guest')write(GUEST,save);}
    return set.call(this,key,value);
  };
  window.BubbleTasksWorkspace={isGuest:()=>blocked||state.mode==='guest',canSync:id=>!blocked&&state.mode==='account'&&state.id===id,canOpen:page=>!blocked&&(!['daily','bookmarks'].includes(page)||(state.mode!=='guest'&&window.BubbleTasksPersonal?.isEnabled()===true)),enterGuest:()=>atomic(switchGuest,[ACCOUNT+(state.id||read('bubbletasks_cloud_owner_v1'))]),restoreAccount:id=>atomic(()=>{const changed=restoreAccount(id);if(blocked){blocked=false;document.documentElement.classList.remove('workspace-error');return true;}return changed;},[ACCOUNT+id,...(state.id?[ACCOUNT+state.id]:[])])};
  let changing=false;
  function checkWorkspace(){const current=read(MODE);if(!changing&&current&&(current.mode!==state.mode||current.id!==state.id||(!read(SESSION)?.access_token&&state.mode==='account'))){changing=true;document.documentElement.classList.add('workspace-switching');location.reload();}}
  window.addEventListener('pageshow',checkWorkspace);window.addEventListener('focus',checkWorkspace);
  window.addEventListener('storage',event=>{if(event.key===MODE||event.key===SESSION)checkWorkspace();});
  window.addEventListener('DOMContentLoaded',()=>{if(state.mode==='guest'){const banner=document.createElement('p');banner.className='workspace-banner';banner.textContent='Guest workspace · Changes stay on this device. Sign in for your personal pages and account data.';document.querySelector('.title-row')?.after(banner);}});
  document.documentElement.classList.toggle('guest-workspace',blocked||state.mode==='guest');
})();

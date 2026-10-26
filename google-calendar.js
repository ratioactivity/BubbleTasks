/* Google is read-only. First-seen event snapshots are saved; refreshes only add new IDs. */
window.addEventListener('DOMContentLoaded', () => {
  const ENDPOINT = 'https://ejrnkaigdstalaypyhhp.supabase.co/functions/v1/google-calendar-auth';
  const PUBLIC_KEY = 'sb_publishable_Qe_bJpZQLlm-CGoPnmhqFQ_aOxXtGhN';
  const panel = document.getElementById('googleCalendarPanel');
  const board = document.getElementById('boardContainer');
  const cloud = window.BubbleTasksCloud;
  if (!panel || !board || !cloud) return;
  const status = panel.querySelector('[data-google-status]');
  const connect = panel.querySelector('[data-google-connect]');
  const refresh = panel.querySelector('[data-google-refresh]');
  const disconnect = panel.querySelector('[data-google-disconnect]');
  const SAVE = 'bubbletasks_plain_v1';
  const TYPES = [
    ['birthdays','Birthdays & Holidays','#ff9999'], ['family','Family & Friends','#ffca99'],
    ['appointments','Appointments','#ffe799'], ['work','Work','#c2ff99'],
    ['goals','Business & Creative Goals','#99ffda'], ['reminders','Reminders & Tasks','#99ceff'],
    ['misc','Miscellaneous Events','#af99ff'],
  ];
  const readSave = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } };
  const normalizeCategories = (data) => Object.fromEntries(
    Object.entries(data && typeof data==='object' && !Array.isArray(data) ? data : {})
      .filter(([id,category]) => id.length <= 1024 && TYPES.some(([value])=>value===category)));
  const normalizeImports = data => Array.isArray(data) ? data.filter(e=>e&&typeof e.userId==='string'&&typeof e.id==='string'&&e.id&&e.start&&e.end)
    .map(e=>({userId:e.userId,id:e.id,title:String(e.title||'Untitled event').slice(0,2000),
      start:{...(typeof e.start.date==='string'?{date:e.start.date}:{}),...(typeof e.start.dateTime==='string'?{dateTime:e.start.dateTime}:{})},
      end:{...(typeof e.end.date==='string'?{date:e.end.date}:{}),...(typeof e.end.dateTime==='string'?{dateTime:e.end.dateTime}:{})},
      ...(typeof e.htmlLink==='string'?{htmlLink:e.htmlLink}:{})})) : [];
  let categories = normalizeCategories(readSave().googleEventCategories);
  let imports = normalizeImports(readSave().googleEventImports);
  const previousSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key,value) {
    if(this===localStorage && key===SAVE) {
      const data=JSON.parse(value);data.googleEventCategories=categories;data.googleEventImports=imports;value=JSON.stringify(data);
    }
    return previousSet.call(this,key,value);
  };
  window.addEventListener('bubbletasks-backup-import',event=>{
    if(event.detail?.googleEventCategories!==undefined)categories=normalizeCategories(event.detail.googleEventCategories);
    if(event.detail?.googleEventImports!==undefined)imports=normalizeImports(event.detail.googleEventImports);
    draw();
  });
  const cache = new Map();
  let user = cloud.getUserId(), connected = false, needsReconnect = false, busy = false, generation = 0;
  let controller = null, scheduled = 0, callbackNotice = '';
  const message = (text) => { status.textContent = text; };
  const paint = () => {
    connect.hidden = !user || (connected && !needsReconnect);
    connect.textContent = needsReconnect ? 'Reconnect Google Calendar' : 'Connect Google Calendar';
    refresh.hidden = !user || !connected || needsReconnect;
    disconnect.hidden = !user || !connected;
    [connect,refresh,disconnect].forEach(button => { button.disabled = busy; });
  };
  const range = () => {
    if (!board.classList.contains('calendar')) return null;
    const cells = [...board.querySelectorAll('.calendar-day[data-date]')];
    if (!cells.length) return null;
    const date = (value) => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
    const start = date(cells[0].dataset.date), end = date(cells.at(-1).dataset.date);
    end.setDate(end.getDate()+1);
    return {start:start.toISOString(), end:end.toISOString(), key:cells[0].dataset.date+':'+cells.at(-1).dataset.date};
  };
  const request = async (body, version) => {
    const token = await cloud.getAccessToken();
    if (version !== generation) throw new DOMException('Account changed', 'AbortError');
    const activeController = new AbortController();
    controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 25000);
    try {
      const response = await fetch(ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+token},
        body:JSON.stringify(body),signal:activeController.signal});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) {
        const error = new Error(data.error || data.message || 'Google Calendar could not be reached. Check the deployed function settings.');
        error.code = data.code; throw error;
      }
      return data;
    } finally { clearTimeout(timeout); if(controller===activeController)controller = null; }
  };
  let editingCategory=null, categoryOpener=null;
  const categoryDialog=document.createElement('dialog');categoryDialog.className='google-category-dialog';
  categoryDialog.setAttribute('aria-labelledby','googleCategoryHeading');
  const categoryHeading=document.createElement('h2');categoryHeading.id='googleCategoryHeading';categoryHeading.textContent='Event category';
  const categoryTitle=document.createElement('p'), categoryChoices=document.createElement('div');categoryChoices.className='google-category-choices';
  const cancelCategory=document.createElement('button');cancelCategory.type='button';cancelCategory.textContent='Cancel';
  cancelCategory.addEventListener('click',()=>categoryDialog.close());
  categoryDialog.append(categoryHeading,categoryTitle,categoryChoices,cancelCategory);document.body.appendChild(categoryDialog);
  categoryDialog.addEventListener('close',()=>{if(categoryOpener?.isConnected)categoryOpener.focus();});
  function openCategory(event,opener){
    editingCategory={id:event.id,user};categoryOpener=opener;categoryTitle.textContent=String(event.title||'Untitled event');
    categoryChoices.replaceChildren();
    [['','Default Google color','#e4edff'],...TYPES].forEach(([value,label,color])=>{
      const choice=document.createElement('button');choice.type='button';choice.className='google-category-choice';
      choice.setAttribute('aria-pressed',String((categories[event.id]||'')===value));
      const swatch=document.createElement('span');swatch.style.backgroundColor=color;
      choice.append(swatch,document.createTextNode(label));
      choice.addEventListener('click',()=>{
        if(!editingCategory||editingCategory.user!==user)return;
        const id=editingCategory.id;
        if(value)categories[id]=value;else delete categories[id];
        localStorage.setItem(SAVE,JSON.stringify({...readSave(),googleEventCategories:categories}));
        categoryDialog.close();draw();
        [...board.querySelectorAll('.google-calendar-event')].find(el=>el.dataset.googleEventId===String(id))?.querySelector('.google-category-dot')?.focus();
      });
      categoryChoices.appendChild(choice);
    });
    categoryDialog.showModal();
    (categoryChoices.querySelector('[aria-pressed="true"]')||categoryChoices.firstElementChild)?.focus();
  }
  const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const validDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const eventSpan = (event) => {
    if (validDay(event.start?.date) && validDay(event.end?.date)) return {allDay:true,start:event.start.date,end:event.end.date};
    const start = new Date(event.start?.dateTime), end = new Date(event.end?.dateTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
    return {allDay:false,start,end};
  };
  const googleLink = (link) => {
    try { const url = new URL(link); return url.protocol==='https:' && (url.hostname==='google.com'||url.hostname.endsWith('.google.com')) ? url.href : null; }
    catch { return null; }
  };
  const draw = () => {
    board.querySelectorAll('.google-calendar-event').forEach(el=>el.remove());
    const view = range();
    if (!user || !view) return;
    const cells = [...board.querySelectorAll('.calendar-day[data-date]')];
    const time = (value) => value.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    const append = (tag, text, parent) => { const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el; };
    for (const event of imports.filter(e=>e.userId===user)) {
      const span = eventSpan(event);if(!span)continue;
      for (const cell of cells) {
        const day = cell.dataset.date;
        const [y,m,d]=day.split('-').map(Number), startOfDay=new Date(y,m-1,d), endOfDay=new Date(y,m-1,d+1);
        const intersects = span.allDay ? day>=span.start&&day<span.end : span.start<endOfDay&&span.end>startOfDay;
        if (!intersects) continue;
        const bubble=document.createElement('article');bubble.className='google-calendar-event';bubble.dataset.googleEventId=String(event.id);
        const category=TYPES.find(([id])=>id===categories[event.id]);
        if(category){bubble.style.backgroundColor=category[2];bubble.style.borderColor=category[2];}
        append('small','Google · read-only',bubble);append('strong',String(event.title||'Untitled event'),bubble);
        const label=span.allDay?'All day':(formatDate(span.start)===day?time(span.start):'Continues')+' – '+(span.end<=endOfDay?time(span.end):'continues');
        append('time',label,bubble);
        const link=googleLink(event.htmlLink);
        if(link){const a=append('a','Open in Google',bubble);a.href=link;a.target='_blank';a.rel='noopener noreferrer';}
        const dot=document.createElement('button');dot.type='button';dot.className='google-category-dot';
        dot.setAttribute('aria-label','Change category for '+String(event.title||'Untitled event'));
        dot.title=category?category[1]:'Choose color/category';
        const swatch=document.createElement('span');swatch.style.backgroundColor=category?category[2]:'#e4edff';
        dot.appendChild(swatch);
        dot.addEventListener('click',()=>openCategory(event,dot));
        bubble.appendChild(dot);
        cell.appendChild(bubble);
      }
    }
  };
  async function loadEvents(force=false) {
    const view=range();
    if(!user||!connected||needsReconnect||busy)return;
    if(!view){if(force)message('Connected. Switch to Calendar layout to view Google events.');return;}
    const saved=cache.get(view.key);
    if(!force&&saved&&Date.now()-saved.time<60000){draw();return;}
    busy=true;paint();message('Loading Google events…');const version=generation, account=user;
    try {
      const data=await request({action:'events',start:view.start,end:view.end},version);
      if(version!==generation||account!==user)return;
      if(!Array.isArray(data.events))throw new Error('Google returned an unexpected event response.');
      const known = new Set(imports.filter(e=>e.userId===account).map(e=>e.id));
      const additions = normalizeImports(data.events.filter(e=>e&&e.status!=='cancelled').map(e=>({...e,userId:account})))
        .filter(e=>{if(!eventSpan(e)||known.has(e.id))return false;known.add(e.id);return true;});
      if(additions.length) {
        const previous=imports;imports=[...imports,...additions];
        try {localStorage.setItem(SAVE,JSON.stringify({...readSave(),googleEventImports:imports}));}
        catch(error){imports=previous;throw new Error('New Google events could not be saved on this device. Free some browser storage and try again.');}
      }
      cache.set(view.key,{user:account,time:Date.now()});
      // Only fetch timestamps are cached; saved event snapshots never expire.
      if(cache.size>12)cache.delete(cache.keys().next().value);
      draw();
      message(data.partial?'Some Google events could not fit in this range. Open Google Calendar to see the full list.':'Google events checked · '+additions.length+' new · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
    } catch(error) {
      if(version!==generation)return;
      if(error.code==='reconnect_required'||error.code==='connect_required'){needsReconnect=true;draw();}
      message(error.name==='AbortError'?'Google Calendar timed out. Try Refresh.':error.message+' Previously imported events and their colors are kept.');
    } finally {
      if(version===generation){busy=false;paint();const next=range();if(next&&next.key!==view.key)schedule();}
    }
  }
  async function checkConnection() {
    if(!user||busy)return;busy=true;paint();const version=generation;
    message('Checking Google Calendar connection…');
    try {
      const data=await request({action:'status'},version);
      if(version!==generation)return;
      connected=data.connected===true;needsReconnect=false;
      message(callbackNotice + (connected?'Connected · imports add new events only; existing events and colors stay unchanged.':'Connect Google Calendar to add new events. Previously imported events are kept.'));
    } catch(error) {if(version===generation)message(error.message);}
    finally {if(version===generation){busy=false;paint();if(connected)loadEvents();}}
  }
  function schedule(){cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>{draw();loadEvents();});}
  connect.addEventListener('click',async()=>{
    if(!user||busy)return;callbackNotice='';busy=true;paint();const version=generation;
    try {
      const data=await request({action:'connect'},version);if(version!==generation)return;
      const destination=new URL(data.url);
      if(destination.protocol!=='https:'||destination.hostname!=='accounts.google.com'||destination.pathname!=='/o/oauth2/v2/auth')throw new Error('Google returned an unexpected sign-in address.');
      location.assign(destination.href);
    }catch(error){if(version===generation){busy=false;paint();message(error.message);}}
  });
  refresh.addEventListener('click',()=>loadEvents(true));
  disconnect.addEventListener('click',async()=>{
    if(busy||!confirm('Disconnect Google Calendar? New events will stop importing. Previously imported events and their colors will stay in BubbleTasks.'))return;
    busy=true;paint();const version=generation;
    try{await request({action:'disconnect'},version);if(version!==generation)return;connected=false;needsReconnect=false;cache.clear();draw();message('Google Calendar disconnected. Previously imported events and colors are kept.');}
    catch(error){if(version===generation)message(error.message);}
    finally{if(version===generation){busy=false;paint();}}
  });
  window.addEventListener('bubbletasks-account-changed',()=>{
    categoryDialog.close();editingCategory=null;
    generation++;controller?.abort();busy=false;user=cloud.getUserId();connected=false;needsReconnect=false;cache.clear();draw();paint();
    if(user)checkConnection();else message('Sign in to BubbleTasks to connect Google Calendar.');
  });
  new MutationObserver(schedule).observe(board,{childList:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(!connected)checkConnection();else loadEvents();}});
  window.addEventListener('online',()=>connected?loadEvents(true):checkConnection());
  setInterval(()=>{if(document.visibilityState==='visible'&&range())loadEvents(true);},60000);
  const result=new URL(location.href).searchParams.get('google_calendar');
  if(result){const clean=new URL(location.href);clean.searchParams.delete('google_calendar');history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
    if(result!=='connected'){callbackNotice=result==='cancelled'?'Google connection cancelled. ':'Google connection was not completed. Try Connect again and allow Calendar read access. ';message(callbackNotice);}
  }
  paint();draw();if(user)checkConnection();
});


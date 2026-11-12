/* Synced definitions and dated completion snapshots; guest saves stay in their own workspace. */
(() => {
  const SAVE='bubbletasks_plain_v1',VIEW='bubbletasks_details_view_v1',TAB='bubbletasks_details_tab_v1';
  const LISTS=['opening','closing','other'],NAMES={opening:'Opening',closing:'Closing',other:'Other'},DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const date=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';const d=new Date(s+'T12:00:00');return Number.isFinite(+d)&&d.getFullYear()===Number(s.slice(0,4))&&d.getMonth()+1===Number(s.slice(5,7))&&d.getDate()===Number(s.slice(8))?s:'';};
  const rowKey=(id,weekly,list)=>(weekly?'weekly:':'item:')+id+':'+list;
  const normalize=value=>{
    const seen=new Set(),clean=(rows,weekly)=>Array.isArray(rows)?rows.filter(e=>e&&typeof e.id==='string'&&!seen.has(e.id)&&seen.add(e.id)&&typeof e.title==='string'&&e.title.trim()&&(weekly?Number.isInteger(e.day)&&e.day>=0&&e.day<7&&['opening','closing','both'].includes(e.list):LISTS.includes(e.list))).map(e=>weekly?{id:e.id,title:e.title.trim().slice(0,500),day:e.day,list:e.list,openingDoneOn:date(e.openingDoneOn),closingDoneOn:date(e.closingDoneOn)}:{id:e.id,title:e.title.trim().slice(0,500),list:e.list,done:e.done===true,doneOn:date(e.doneOn)}):[];
    const result={version:2,items:clean(value?.items,false),weekly:clean(value?.weekly,true),logs:{}};
    for(const [day,log]of Object.entries(value?.logs&&typeof value.logs==='object'&&!Array.isArray(value.logs)?value.logs:{})){
      if(!date(day)||!Array.isArray(log?.rows))continue;const keys=new Set();
      const rows=log.rows.filter(r=>r&&typeof r.itemId==='string'&&typeof r.title==='string'&&LISTS.includes(r.list)).map(r=>({key:rowKey(r.itemId,r.weekly===true,r.list),itemId:r.itemId,weekly:r.weekly===true,list:r.list,title:r.title.slice(0,500),done:r.done===true,note:typeof r.note==='string'?r.note.slice(0,5000):'',carried:r.carried===true})).filter(r=>!keys.has(r.key)&&keys.add(r.key));
      result.logs[day]={source:['legacy','template'].includes(log.source)?log.source:'live',updatedAt:typeof log.updatedAt==='string'?log.updatedAt:'',rows};
    }
    // Old saves retain only the most recent completion date; recover those facts without inventing missed tasks.
    function recover(item,weekly,list,day){if(!day)return;const log=result.logs[day]||(result.logs[day]={source:'legacy',updatedAt:'',rows:[]}),key=rowKey(item.id,weekly,list);if(!log.rows.some(r=>r.key===key))log.rows.push({key,itemId:item.id,weekly,list,title:item.title,done:true,note:'',carried:false});}
    for(const item of result.items)if(item.list!=='other')recover(item,false,item.list,item.doneOn);
    for(const item of result.weekly)for(const list of ['opening','closing'])recover(item,true,list,item[list+'DoneOn']);
    return result;
  };
  const read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  let data=normalize(read().detailsChecklists),active=false,view,board,taskForm,status,menu,editor,historyDialog,midnightTimer,editorDirty=()=>false,selected=localStorage.getItem(TAB)||'opening';
  if(!LISTS.includes(selected))selected='opening';
  let reordering=false;
  const drafts={opening:'',closing:'',other:''},previousSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===SAVE){const save=JSON.parse(value);save.detailsChecklists=data;value=JSON.stringify(save);}return previousSet.call(this,key,value);};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,action,cls='')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
  const field=(name,input)=>{const label=el('label','',name);input.setAttribute('aria-label',name);label.append(input);return label;};
  function save(next){const before=data;data=normalize(next);if(data.logs[today()])reconcile(data,today());try{localStorage.setItem(SAVE,JSON.stringify({...read(),detailsChecklists:data}));return true;}catch{data=before;if(status)status.textContent='Could not save this change. Free some browser storage and try again.';return false;}}
  window.BubbleTasksDetails={
    isActive:()=>active,
    show(){active=true;localStorage.setItem(VIEW,'true');view.hidden=false;board.hidden=true;taskForm.hidden=true;render();armMidnight();},
    hide(){if(!active)return true;if(Object.values(drafts).some(s=>s.trim())&&!confirm('Discard the checklist item you have not added yet?'))return false;for(const key of LISTS)drafts[key]='';active=false;view.hidden=true;board.hidden=false;taskForm.hidden=false;localStorage.setItem(VIEW,'false');return true;}
  };
  function armMidnight(){clearTimeout(midnightTimer);const next=new Date();next.setHours(24,0,0,30);midnightTimer=setTimeout(()=>{if(active)render();armMidnight();},Math.max(50,+next-Date.now()));}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(active)render();armMidnight();}});
  window.addEventListener('focus',()=>{if(active&&!menu?.open&&!editor?.open)render();});
  window.addEventListener('bubbletasks-backup-import',event=>{if(event.detail?.detailsChecklists!==undefined){data=normalize(event.detail.detailsChecklists);if(active)render();}});
  function done(item,weekly,list){return weekly?item[list+'DoneOn']===today():list==='other'?item.done:item.doneOn===today();}
  function rowsFor(state,day){
    const result=[],weekday=new Date(day+'T12:00:00').getDay();
    for(const list of LISTS){
      for(const item of state.items.filter(e=>e.list===list))result.push({key:rowKey(item.id,false,list),itemId:item.id,weekly:false,list,title:item.title,done:list==='other'?(day===today()&&item.done):item.doneOn===day,note:'',carried:list==='other'&&day===today()&&item.done&&item.doneOn!==day});
      if(list!=='other')for(const item of state.weekly.filter(e=>e.day===weekday&&(e.list===list||e.list==='both')))result.push({key:rowKey(item.id,true,list),itemId:item.id,weekly:true,list,title:item.title,done:item[list+'DoneOn']===day,note:'',carried:false});
    }
    return result;
  }
  function reconcile(state,day){
    const log=state.logs[day];if(!log)return;const current=rowsFor(state,day),known=new Map(log.rows.map(r=>[r.key,r]));
    log.rows=current.map(r=>known.has(r.key)?{...known.get(r.key),title:r.title}:r).concat(log.rows.filter(r=>!current.some(e=>e.key===r.key)));if(day===today())log.source='live';
  }
  function ensureLog(state,day){if(!state.logs[day])state.logs[day]={source:day===today()?'live':'template',updatedAt:'',rows:rowsFor(state,day)};else if(day===today())reconcile(state,day);return state.logs[day];}
  function record(day,key,value,note){
    const next=normalize(data),log=ensureLog(next,day),row=log.rows.find(r=>r.key===key);if(!row)return false;
    row.done=value;row.carried=false;if(note!==undefined)row.note=note.trim().slice(0,5000);log.updatedAt=new Date().toISOString();
    if(day===today()){
      if(row.weekly)next.weekly=next.weekly.map(e=>e.id===row.itemId?{...e,[row.list+'DoneOn']:value?day:''}:e);
      else next.items=next.items.map(e=>e.id===row.itemId?{...e,...(row.list==='other'?{done:value,doneOn:value?day:''}:{doneOn:value?day:''})}:e);
    }
    return save(next);
  }
  function setDone(item,weekly,list,value){
    const key=rowKey(item.id,weekly,list);if(record(today(),key,value)){render();const row=[...view.querySelectorAll('[data-detail-key]')].find(e=>e.dataset.detailKey===key);row?.querySelector(value?'.details-note-button':'.details-check input')?.focus({preventScroll:true});}
  }
  function closeEditor(){if(editorDirty()&&!confirm('Discard these unsaved changes?'))return;editor.close();}
  function noteEditor(day,row){
    editor.setAttribute('aria-label','Checklist completion note');editor.replaceChildren();const form=el('form'),note=el('textarea'),checked=el('input'),error=el('p','details-feedback');note.value=row.note||'';note.rows=5;note.maxLength=5000;checked.type='checkbox';checked.checked=row.done;error.setAttribute('role','alert');
    form.append(el('h2','',row.title),el('p','',new Date(day+'T12:00:00').toLocaleDateString([],{dateStyle:'full'})),field('Completed',checked),field('Completion note',note),error);const submit=el('button','','Save note');submit.type='submit';const actions=el('div','details-actions');actions.append(button('Cancel',closeEditor),submit);form.append(actions);editor.append(form);
    form.addEventListener('submit',e=>{e.preventDefault();if(record(day,row.key,checked.checked,note.value)){editor.close();render();if(historyDialog.open)renderHistory();}else error.textContent='Could not save this note. Please try again.';});editorDirty=()=>note.value!==(row.note||'')||checked.checked!==row.done;editor.showModal();note.focus();
  }
  function moveItem(id,weekly,targetId,after=false){
    if(id===targetId)return;const focusLabel=document.activeElement?.getAttribute('aria-label'),key=weekly?'weekly':'items',rows=[...data[key]],item=rows.find(e=>e.id===id),rest=rows.filter(e=>e.id!==id),index=rest.findIndex(e=>e.id===targetId);if(!item||index<0)return;rest.splice(index+(after?1:0),0,item);if(save({...data,[key]:rest})){if(menu.open)renderMenu();render();const row=[...(menu.open?menu:view).querySelectorAll('[data-detail-id]')].find(e=>e.dataset.detailId===id);const target=[...(row?.querySelectorAll('.details-order button')||[])].find(b=>b.getAttribute('aria-label')===focusLabel&&!b.disabled)||row?.querySelector('.details-order button');target?.focus({preventScroll:true});}
  }
  function orderControls(item,weekly,rows){
    const order=el('div','details-order');order.hidden=!reordering;const grip=button('⠿',()=>{});grip.draggable=true;grip.setAttribute('aria-label','Drag to reorder '+item.title);const index=rows.findIndex(e=>e.id===item.id);
    grip.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({id:item.id,weekly}));e.dataTransfer.effectAllowed='move';});
    const up=button('↑',()=>moveItem(item.id,weekly,rows[index-1]?.id)),down=button('↓',()=>moveItem(item.id,weekly,rows[index+1]?.id,true));up.disabled=index===0;down.disabled=index===rows.length-1;up.setAttribute('aria-label','Move '+item.title+' up');down.setAttribute('aria-label','Move '+item.title+' down');order.append(grip,up,down);return order;
  }
  function dropTarget(row,item,weekly){
    row.addEventListener('dragover',e=>{if(!reordering)return;e.preventDefault();e.dataTransfer.dropEffect='move';});row.addEventListener('drop',e=>{if(!reordering)return;e.preventDefault();try{const dragged=JSON.parse(e.dataTransfer.getData('text/plain'));if(dragged.weekly===weekly)moveItem(dragged.id,weekly,item.id,e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2);}catch{}});
  }
  function reorderToggle(){const b=button(reordering?'Done reordering':'Reorder tasks',()=>{reordering=!reordering;render();if(menu.open)renderMenu();(menu.open?menu:view).querySelector('.details-reorder-toggle')?.focus({preventScroll:true});},'details-reorder-toggle');b.setAttribute('aria-pressed',String(reordering));return b;}
  let historyDay=today(),historyList='opening';
  function renderHistory(){
    historyDialog.replaceChildren();const heading=el('div','details-section-heading');heading.append(el('h2','','Daily Checklist History'),button('Close',()=>historyDialog.close()));historyDialog.append(heading);
    const dates=Object.keys(data.logs).sort().reverse(),picker=el('input');picker.type='date';picker.value=historyDay;picker.addEventListener('change',()=>{if(date(picker.value)){historyDay=picker.value;renderHistory();}});historyDialog.append(field('Log date',picker));
    if(dates.length){const select=choices(dates.map(d=>[d,new Date(d+'T12:00:00').toLocaleDateString([],{dateStyle:'medium'})]),dates.includes(historyDay)?historyDay:dates[0]);select.addEventListener('change',()=>{historyDay=select.value;renderHistory();});historyDialog.append(field('Recorded days',select));}
    const log=data.logs[historyDay];
    if(!log){historyDialog.append(el('p','','No checklist activity recorded for this date.'),button('Start a log for this date',()=>{if(!confirm('Create this log using the current checklist setup? Past changes to task definitions cannot be reconstructed.'))return;const next=normalize(data);ensureLog(next,historyDay);if(save(next))renderHistory();}));return;}
    if(log.source==='legacy')historyDialog.append(el('p','details-history-notice','Recovered from the older checklist: only retained completion dates are known, using current task names. A full checklist snapshot was not saved for this day.'));
    if(log.source==='template')historyDialog.append(el('p','details-history-notice','This missed-day log uses the current checklist setup. Correct the checks and add notes as needed.'));
    if(log.source!=='live')historyDialog.append(button('Add missing tasks from current checklist',()=>{if(!confirm('Add tasks from the current setup to this historical log? They may differ from the tasks originally due.'))return;const next=normalize(data),existing=next.logs[historyDay];for(const r of rowsFor(next,historyDay))if(!existing.rows.some(e=>e.key===r.key))existing.rows.push({...r,done:false,carried:false});existing.source='template';if(save(next))renderHistory();}));
    const completed=log.rows.filter(r=>r.done&&!r.carried).length,missed=log.rows.filter(r=>!r.done).length;historyDialog.append(el('p','details-progress-text',completed+' completed · '+missed+' not completed'+(log.rows.some(r=>r.carried)?' · some Other checks carried over':'')));
    const tabs=el('div','details-tabs');for(const list of LISTS){const b=button(NAMES[list],()=>{historyList=list;renderHistory();});b.setAttribute('aria-pressed',String(historyList===list));tabs.append(b);}historyDialog.append(tabs);
    const rows=el('ul','details-list');for(const r of log.rows.filter(e=>e.list===historyList)){
      const item=el('li','details-item details-history-row'),label=el('label','details-check'),check=el('input');check.type='checkbox';check.checked=r.done;check.setAttribute('aria-label',r.title);check.addEventListener('change',()=>{if(record(historyDay,r.key,check.checked)){renderHistory();if(historyDay===today())render();}else{check.checked=r.done;const error=el('p','details-feedback','Could not save this check. Please try again.');error.setAttribute('role','alert');historyDialog.append(error);}});label.append(check,el('span',r.done?'details-complete':'',r.title));item.append(label,button(r.note?'Edit note':'Add note',()=>noteEditor(historyDay,r),'details-note-button'));if(r.carried)item.append(el('small','','Already checked before this day'));if(r.note)item.append(el('p','details-item-note',r.note));rows.append(item);
    }historyDialog.append(rows);if(!rows.children.length)historyDialog.append(el('p','details-empty','No '+historyList+' items in this log.'));
  }
  const choices=(pairs,value)=>{const select=el('select');for(const [key,label]of pairs){const option=el('option','',label);option.value=key;select.append(option);}select.value=String(value);return select;};
  function edit(item,weekly=false){
    editor.setAttribute('aria-label','Edit checklist item');editor.replaceChildren();const form=el('form'),title=el('input'),error=el('p','details-feedback');title.value=item.title;title.required=true;title.maxLength=500;error.setAttribute('role','alert');
    form.append(el('h2','','Edit checklist item'),field('Task',title));let day,list;
    if(weekly){day=choices(DAYS.map((name,i)=>[i,name]),item.day);list=choices([['opening','Opening'],['closing','Closing'],['both','Opening & Closing']],item.list);form.append(field('Weekday',day),field('Show under',list));}
    const submit=el('button','','Save');submit.type='submit';const actions=el('div','details-actions');actions.append(button('Cancel',closeEditor),submit);form.append(error,actions);editor.append(form);
    form.addEventListener('submit',e=>{e.preventDefault();if(!title.value.trim())return;const key=weekly?'weekly':'items';if(save({...data,[key]:data[key].map(row=>row.id===item.id?{...row,title:title.value.trim(),...(weekly?{day:Number(day.value),list:list.value}:{})}:row)})){editor.close();if(menu.open)renderMenu();render();}else error.textContent='Could not save. Please try again.';});editorDirty=()=>title.value!==item.title||(weekly&&(Number(day.value)!==item.day||list.value!==item.list));editor.showModal();title.focus();
  }
  function remove(item,weekly){if(!confirm('Delete “'+item.title+'” from this checklist?'))return;const key=weekly?'weekly':'items';if(save({...data,[key]:data[key].filter(e=>e.id!==item.id)})){if(menu.open)renderMenu();render();}}
  function icon(label,path,action){const b=button('',action,'details-icon');b.setAttribute('aria-label',label);b.title=label;const image=el('img');image.src=path;image.alt='';b.append(image);return b;}
  function checklistRow(item,weekly,list,ordered){
    const row=el('li','details-item'),label=el('label','details-check'),check=el('input'),key=rowKey(item.id,weekly,list);row.dataset.detailKey=key;row.dataset.detailId=item.id;check.type='checkbox';check.checked=done(item,weekly,list);check.setAttribute('aria-label',item.title);check.addEventListener('change',()=>{const was=done(item,weekly,list);setDone(item,weekly,list,check.checked);if(row.isConnected)check.checked=was;});
    label.append(check,el('span',check.checked?'details-complete':'',item.title));const controls=el('div','details-item-actions'),savedRow=data.logs[today()]?.rows.find(r=>r.key===key),note=savedRow?.note||'';
    const noteButton=button(note?'Note ●':'Note',()=>noteEditor(today(),{key,itemId:item.id,weekly,list,title:item.title,done:done(item,weekly,list),note}),'details-note-button');noteButton.setAttribute('aria-label','Completion note for '+item.title);
    controls.append(noteButton,icon('Edit '+item.title,'assets/pencil.png',()=>edit(item,weekly)),icon('Delete '+item.title,'assets/delete.png',()=>remove(item,weekly)));row.append(orderControls(item,weekly,ordered),label,controls);if(note)row.append(el('p','details-item-note',note));dropTarget(row,item,weekly);return row;
  }
  let menuDay=new Date().getDay(),weeklyDraft='',weeklyPlacement='both';
  function closeMenu(){if(weeklyDraft.trim()&&!confirm('Discard this unsaved weekly task?'))return;weeklyDraft='';menu.close();}
  function renderMenu(){
    menu.replaceChildren();const header=el('div','details-section-heading');header.append(el('h2','','Weekly Cleaning'),reorderToggle(),button('Done',closeMenu));menu.append(header,el('p','','Choose a weekday and add the cleaning tasks due that day. Checks reset at local midnight.'));
    const day=choices(DAYS.map((name,i)=>[i,name]),menuDay);day.addEventListener('change',()=>{weeklyDraft=menu.querySelector('[name=weeklyTask]')?.value||weeklyDraft;menuDay=Number(day.value);renderMenu();});menu.append(field('Choose weekday',day));
    const form=el('form','details-weekly-form'),title=el('input');title.name='weeklyTask';title.value=weeklyDraft;title.required=true;title.maxLength=500;title.placeholder='Deep clean bathrooms…';title.addEventListener('input',()=>weeklyDraft=title.value);
    const placement=choices([['both','Opening & Closing'],['opening','Opening'],['closing','Closing']],weeklyPlacement);placement.addEventListener('change',()=>weeklyPlacement=placement.value);
    const add=el('button','','Add weekly task');add.type='submit';form.append(field('Weekly task',title),field('Show under',placement),add);menu.append(form);
    const list=el('ul','details-list');for(const item of data.weekly.filter(e=>e.day===menuDay)){const row=el('li','details-item');row.dataset.detailId=item.id;row.append(orderControls(item,true,data.weekly.filter(e=>e.day===menuDay)),el('span','details-weekly-name',item.title),el('small','',item.list==='both'?'Opening & Closing':NAMES[item.list]),icon('Edit '+item.title,'assets/pencil.png',()=>edit(item,true)),icon('Delete '+item.title,'assets/delete.png',()=>remove(item,true)));list.append(row);}menu.append(list);if(!list.children.length)menu.append(el('p','details-empty','No weekly cleaning tasks for '+DAYS[menuDay]+' yet.'));
    form.addEventListener('submit',e=>{e.preventDefault();if(!title.value.trim())return;if(save({...data,weekly:[...data.weekly,{id:crypto.randomUUID(),title:title.value.trim(),day:menuDay,list:placement.value}]})){weeklyDraft='';renderMenu();render();menu.querySelector('[name=weeklyTask]').focus();}});
  }
  function render(){
    if(!active)return;const hadFocus=document.activeElement?.id==='detailsNewItem',selection=hadFocus?document.activeElement.selectionStart:null;
    view.replaceChildren();const heading=el('header','details-top'),titles=el('div');titles.append(el('h2','','Details'),el('p','','Your shift, one check at a time.'));const headerActions=el('div','details-header-actions');headerActions.append(reorderToggle(),button('History',()=>{historyDay=data.logs[today()]?today():Object.keys(data.logs).sort().at(-1)||today();historyList=selected;renderHistory();historyDialog.showModal();}),button('Weekly cleaning',()=>{menuDay=new Date().getDay();renderMenu();menu.showModal();},'details-primary'));heading.append(titles,headerActions);view.append(heading);
    const tabs=el('div','details-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Details checklists');
    for(const list of LISTS){const tab=button(NAMES[list],()=>{selected=list;localStorage.setItem(TAB,list);render();});tab.id='detailsTab-'+list;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(selected===list));tab.setAttribute('aria-controls','detailsListPanel');tab.tabIndex=selected===list?0:-1;tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=LISTS.indexOf(selected);selected=e.key==='Home'?'opening':e.key==='End'?'other':LISTS[(i+(e.key==='ArrowLeft'?2:1))%3];localStorage.setItem(TAB,selected);render();view.querySelector('#detailsTab-'+selected).focus();});tabs.append(tab);}view.append(tabs);
    const panel=el('section','details-panel');panel.id='detailsListPanel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','detailsTab-'+selected);panel.append(el('h3','',NAMES[selected]));
    panel.append(el('p','details-help',selected==='other'?'Reset removes all items from this checklist. Recorded history stays.':'Resets at local midnight · '+new Date().toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'})));
    const items=data.items.filter(e=>e.list===selected),weekly=selected==='other'?[]:data.weekly.filter(e=>e.day===new Date().getDay()&&(e.list===selected||e.list==='both'));
    const completed=items.filter(e=>done(e,false,selected)).length+weekly.filter(e=>done(e,true,selected)).length,total=items.length+weekly.length;
    panel.append(el('p','details-progress-text',completed+' of '+total+' complete'));const progress=el('progress');progress.max=Math.max(1,total);progress.value=completed;progress.setAttribute('aria-label',NAMES[selected]+' checklist progress');panel.append(progress,el('p','details-help',reordering?'Drag the grip or use ↑/↓ to reorder.':'Use Note to add a completion note.'));
    const form=el('form','details-add'),input=el('input');input.id='detailsNewItem';input.placeholder=selected==='opening'?'Add an opening task…':selected==='closing'?'Add a closing task…':'Add a task…';input.setAttribute('aria-label','New '+selected+' task');input.required=true;input.maxLength=500;input.value=drafts[selected];input.addEventListener('input',()=>drafts[selected]=input.value);const add=el('button','details-primary','Add');add.type='submit';form.append(input,add);panel.append(form);
    form.addEventListener('submit',e=>{e.preventDefault();if(!input.value.trim())return;if(save({...data,items:[...data.items,{id:crypto.randomUUID(),title:input.value.trim(),list:selected}]})){drafts[selected]='';render();view.querySelector('#detailsNewItem').focus();}});
    const list=el('ul','details-list');for(const item of items)list.append(checklistRow(item,false,selected,items));panel.append(list);if(!items.length)panel.append(el('p','details-empty','Add the tasks you want on your '+selected+' checklist.'));
    if(weekly.length){const section=el('section','details-cleaning');section.append(el('h3','',DAYS[new Date().getDay()]+'’s Deep Cleaning'));const rows=el('ul','details-list');for(const item of weekly)rows.append(checklistRow(item,true,selected,weekly));section.append(rows);panel.append(section);}
    if(selected==='other')panel.append(button('Reset Other checklist',()=>{if(!confirm('Remove every task from Other? Recorded history will stay.'))return;if(save({...data,items:data.items.filter(e=>e.list!=='other')}))render();},'details-reset'));
    status=el('p','details-feedback');status.setAttribute('role','status');panel.append(status);view.append(panel);
    if(hadFocus){const input=view.querySelector('#detailsNewItem');input.focus({preventScroll:true});if(selection!==null)input.setSelectionRange(selection,selection);}
  }
  window.addEventListener('DOMContentLoaded',()=>{
    board=document.getElementById('boardContainer');taskForm=document.querySelector('.task-form');view=el('section','details-view');view.id='detailsView';view.hidden=true;view.setAttribute('aria-label','Details checklists');board.after(view);
    menu=el('dialog','details-dialog');menu.id='detailsWeeklyDialog';menu.setAttribute('aria-label','Weekly cleaning settings');menu.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
    editor=el('dialog','details-dialog');editor.setAttribute('aria-label','Edit checklist item');editor.addEventListener('cancel',event=>{if(editorDirty()&&!confirm('Discard these unsaved changes?'))event.preventDefault();});historyDialog=el('dialog','details-dialog details-history-dialog');historyDialog.id='detailsHistoryDialog';historyDialog.setAttribute('aria-label','Daily checklist history');document.body.append(menu,editor,historyDialog);armMidnight();
  });
})();


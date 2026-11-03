/* Account-synced checklist definitions; dated checks reset naturally at local midnight. */
(() => {
  const SAVE='bubbletasks_plain_v1',VIEW='bubbletasks_details_view_v1',TAB='bubbletasks_details_tab_v1';
  const LISTS=['opening','closing','other'],NAMES={opening:'Opening',closing:'Closing',other:'Other'},DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
  const normalize=value=>{
    const seen=new Set(),clean=(rows,weekly)=>Array.isArray(rows)?rows.filter(e=>e&&typeof e.id==='string'&&!seen.has(e.id)&&seen.add(e.id)&&typeof e.title==='string'&&e.title.trim()&&(weekly?Number.isInteger(e.day)&&e.day>=0&&e.day<7&&['opening','closing','both'].includes(e.list):LISTS.includes(e.list))).map(e=>weekly?{id:e.id,title:e.title.trim().slice(0,500),day:e.day,list:e.list,openingDoneOn:date(e.openingDoneOn),closingDoneOn:date(e.closingDoneOn)}:{id:e.id,title:e.title.trim().slice(0,500),list:e.list,done:e.done===true,doneOn:date(e.doneOn)}):[];
    return {version:1,items:clean(value?.items,false),weekly:clean(value?.weekly,true)};
  };
  const read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  let data=normalize(read().detailsChecklists),active=false,view,board,taskForm,status,menu,editor,midnightTimer,selected=localStorage.getItem(TAB)||'opening';
  if(!LISTS.includes(selected))selected='opening';
  const drafts={opening:'',closing:'',other:''},previousSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===SAVE){const save=JSON.parse(value);save.detailsChecklists=data;value=JSON.stringify(save);}return previousSet.call(this,key,value);};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,action,cls='')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
  const field=(name,input)=>{const label=el('label','',name);input.setAttribute('aria-label',name);label.append(input);return label;};
  function save(next){const before=data;data=normalize(next);try{localStorage.setItem(SAVE,JSON.stringify({...read(),detailsChecklists:data}));return true;}catch{data=before;if(status)status.textContent='Could not save this change. Free some browser storage and try again.';return false;}}
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
  function setDone(item,weekly,list,value){
    const rows=weekly?'weekly':'items',patch=weekly?{[list+'DoneOn']:value?today():''}:list==='other'?{done:value}:{doneOn:value?today():''};
    if(save({...data,[rows]:data[rows].map(e=>e.id===item.id?{...e,...patch}:e)}))render();
  }
  const choices=(pairs,value)=>{const select=el('select');for(const [key,label]of pairs){const option=el('option','',label);option.value=key;select.append(option);}select.value=String(value);return select;};
  function edit(item,weekly=false){
    editor.replaceChildren();const form=el('form'),title=el('input'),error=el('p','details-feedback');title.value=item.title;title.required=true;title.maxLength=500;error.setAttribute('role','alert');
    form.append(el('h2','','Edit checklist item'),field('Task',title));let day,list;
    if(weekly){day=choices(DAYS.map((name,i)=>[i,name]),item.day);list=choices([['opening','Opening'],['closing','Closing'],['both','Opening & Closing']],item.list);form.append(field('Weekday',day),field('Show under',list));}
    const submit=el('button','','Save');submit.type='submit';const actions=el('div','details-actions');actions.append(button('Cancel',()=>editor.close()),submit);form.append(error,actions);editor.append(form);
    form.addEventListener('submit',e=>{e.preventDefault();if(!title.value.trim())return;const key=weekly?'weekly':'items';if(save({...data,[key]:data[key].map(row=>row.id===item.id?{...row,title:title.value.trim(),...(weekly?{day:Number(day.value),list:list.value}:{})}:row)})){editor.close();if(menu.open)renderMenu();render();}else error.textContent='Could not save. Please try again.';});editor.showModal();title.focus();
  }
  function remove(item,weekly){if(!confirm('Delete “'+item.title+'” from this checklist?'))return;const key=weekly?'weekly':'items';if(save({...data,[key]:data[key].filter(e=>e.id!==item.id)})){if(menu.open)renderMenu();render();}}
  function icon(label,path,action){const b=button('',action,'details-icon');b.setAttribute('aria-label',label);b.title=label;const image=el('img');image.src=path;image.alt='';b.append(image);return b;}
  function checklistRow(item,weekly,list){
    const row=el('li','details-item'),label=el('label','details-check'),check=el('input');check.type='checkbox';check.checked=done(item,weekly,list);check.setAttribute('aria-label',item.title);check.addEventListener('change',()=>{const was=done(item,weekly,list);setDone(item,weekly,list,check.checked);if(row.isConnected)check.checked=was;});
    label.append(check,el('span',check.checked?'details-complete':'',item.title));row.append(label);
    row.append(icon('Edit '+item.title,'assets/pencil.png',()=>edit(item,weekly)),icon('Delete '+item.title,'assets/delete.png',()=>remove(item,weekly)));return row;
  }
  let menuDay=new Date().getDay(),weeklyDraft='',weeklyPlacement='both';
  function closeMenu(){if(weeklyDraft.trim()&&!confirm('Discard this unsaved weekly task?'))return;weeklyDraft='';menu.close();}
  function renderMenu(){
    menu.replaceChildren();const header=el('div','details-section-heading');header.append(el('h2','','Weekly Cleaning'),button('Done',closeMenu));menu.append(header,el('p','','Choose a weekday and add the cleaning tasks due that day. Checks reset at local midnight.'));
    const day=choices(DAYS.map((name,i)=>[i,name]),menuDay);day.addEventListener('change',()=>{weeklyDraft=menu.querySelector('[name=weeklyTask]')?.value||weeklyDraft;menuDay=Number(day.value);renderMenu();});menu.append(field('Choose weekday',day));
    const form=el('form','details-weekly-form'),title=el('input');title.name='weeklyTask';title.value=weeklyDraft;title.required=true;title.maxLength=500;title.placeholder='Deep clean bathrooms…';title.addEventListener('input',()=>weeklyDraft=title.value);
    const placement=choices([['both','Opening & Closing'],['opening','Opening'],['closing','Closing']],weeklyPlacement);placement.addEventListener('change',()=>weeklyPlacement=placement.value);
    const add=el('button','','Add weekly task');add.type='submit';form.append(field('Weekly task',title),field('Show under',placement),add);menu.append(form);
    const list=el('ul','details-list');for(const item of data.weekly.filter(e=>e.day===menuDay)){const row=el('li','details-item');row.append(el('span','details-weekly-name',item.title),el('small','',item.list==='both'?'Opening & Closing':NAMES[item.list]),icon('Edit '+item.title,'assets/pencil.png',()=>edit(item,true)),icon('Delete '+item.title,'assets/delete.png',()=>remove(item,true)));list.append(row);}menu.append(list);if(!list.children.length)menu.append(el('p','details-empty','No weekly cleaning tasks for '+DAYS[menuDay]+' yet.'));
    form.addEventListener('submit',e=>{e.preventDefault();if(!title.value.trim())return;if(save({...data,weekly:[...data.weekly,{id:crypto.randomUUID(),title:title.value.trim(),day:menuDay,list:placement.value}]})){weeklyDraft='';renderMenu();render();menu.querySelector('[name=weeklyTask]').focus();}});
  }
  function render(){
    if(!active)return;const hadFocus=document.activeElement?.id==='detailsNewItem',selection=hadFocus?document.activeElement.selectionStart:null;
    view.replaceChildren();const heading=el('header','details-top'),titles=el('div');titles.append(el('h2','','Details'),el('p','','Your shift, one check at a time.'));heading.append(titles,button('Weekly cleaning',()=>{menuDay=new Date().getDay();renderMenu();menu.showModal();},'details-primary'));view.append(heading);
    const tabs=el('div','details-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Details checklists');
    for(const list of LISTS){const tab=button(NAMES[list],()=>{selected=list;localStorage.setItem(TAB,list);render();});tab.id='detailsTab-'+list;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(selected===list));tab.setAttribute('aria-controls','detailsListPanel');tab.tabIndex=selected===list?0:-1;tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=LISTS.indexOf(selected);selected=e.key==='Home'?'opening':e.key==='End'?'other':LISTS[(i+(e.key==='ArrowLeft'?2:1))%3];localStorage.setItem(TAB,selected);render();view.querySelector('#detailsTab-'+selected).focus();});tabs.append(tab);}view.append(tabs);
    const panel=el('section','details-panel');panel.id='detailsListPanel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','detailsTab-'+selected);panel.append(el('h3','',NAMES[selected]));
    panel.append(el('p','details-help',selected==='other'?'Stays checked until you reset it manually.':'Resets at local midnight · '+new Date().toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'})));
    const items=data.items.filter(e=>e.list===selected),weekly=selected==='other'?[]:data.weekly.filter(e=>e.day===new Date().getDay()&&(e.list===selected||e.list==='both'));
    const completed=items.filter(e=>done(e,false,selected)).length+weekly.filter(e=>done(e,true,selected)).length,total=items.length+weekly.length;
    panel.append(el('p','details-progress-text',completed+' of '+total+' complete'));const progress=el('progress');progress.max=Math.max(1,total);progress.value=completed;progress.setAttribute('aria-label',NAMES[selected]+' checklist progress');panel.append(progress);
    const form=el('form','details-add'),input=el('input');input.id='detailsNewItem';input.placeholder=selected==='opening'?'Add an opening task…':selected==='closing'?'Add a closing task…':'Add a task…';input.setAttribute('aria-label','New '+selected+' task');input.required=true;input.maxLength=500;input.value=drafts[selected];input.addEventListener('input',()=>drafts[selected]=input.value);const add=el('button','details-primary','Add');add.type='submit';form.append(input,add);panel.append(form);
    form.addEventListener('submit',e=>{e.preventDefault();if(!input.value.trim())return;if(save({...data,items:[...data.items,{id:crypto.randomUUID(),title:input.value.trim(),list:selected}]})){drafts[selected]='';render();view.querySelector('#detailsNewItem').focus();}});
    const list=el('ul','details-list');for(const item of items)list.append(checklistRow(item,false,selected));panel.append(list);if(!items.length)panel.append(el('p','details-empty','Add the tasks you want on your '+selected+' checklist.'));
    if(weekly.length){const section=el('section','details-cleaning');section.append(el('h3','',DAYS[new Date().getDay()]+'’s Deep Cleaning'));const rows=el('ul','details-list');for(const item of weekly)rows.append(checklistRow(item,true,selected));section.append(rows);panel.append(section);}
    if(selected==='other')panel.append(button('Reset Other checklist',()=>{if(!confirm('Uncheck every item in Other? Your checklist items will stay.'))return;if(save({...data,items:data.items.map(e=>e.list==='other'?{...e,done:false}:e)}))render();},'details-reset'));
    status=el('p','details-feedback');status.setAttribute('role','status');panel.append(status);view.append(panel);
    if(hadFocus){const input=view.querySelector('#detailsNewItem');input.focus({preventScroll:true});if(selection!==null)input.setSelectionRange(selection,selection);}
  }
  window.addEventListener('DOMContentLoaded',()=>{
    board=document.getElementById('boardContainer');taskForm=document.querySelector('.task-form');view=el('section','details-view');view.id='detailsView';view.hidden=true;view.setAttribute('aria-label','Details checklists');board.after(view);
    menu=el('dialog','details-dialog');menu.id='detailsWeeklyDialog';menu.setAttribute('aria-label','Weekly cleaning settings');menu.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
    editor=el('dialog','details-dialog');editor.setAttribute('aria-label','Edit checklist item');document.body.append(menu,editor);armMidnight();
  });
})();

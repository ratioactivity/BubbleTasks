/* Schedule entries share the task save, cloud revision checks and backups. */
(() => {
  const SAVE='bubbletasks_plain_v1',VIEW='bubbletasks_schedule_view_v1',DATE='bubbletasks_schedule_date_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(new Date(s+'T12:00:00'))===s;
  const normalize=list=>Array.isArray(list)?list.filter(e=>e&&typeof e.id==='string'&&validDate(e.date)&&typeof e.title==='string'&&Number.isInteger(e.start)&&e.start>=0&&e.start<1440&&Number.isInteger(e.end)&&e.end>e.start&&e.end<=1440).map(e=>({id:e.id,date:e.date,title:e.title.slice(0,500),start:e.start,end:e.end,done:e.done===true})):[];
  let entries=normalize(read().dailySchedule),active=false,view,board,taskForm,selected=sessionStorage.getItem(DATE),draft=null,editor,refreshEvents=()=>{};
  if(!validDate(selected))selected=dateKey(new Date());
  const previousSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===SAVE){const data=JSON.parse(value);data.dailySchedule=entries;value=JSON.stringify(data);}return previousSet.call(this,key,value);};
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const button=(text,action,cls='')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
  const clock=minutes=>new Date(2000,0,1,Math.floor(minutes/60),minutes%60).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const timeValue=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const minutes=s=>/^\d{2}:\d{2}$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):NaN;
  const COLORS={birthdays:'#e8aec5',family:'#edc5ae',appointments:'#e9dbac',work:'#bbd8b6',goals:'#add8d0',reminders:'#aecdec',misc:'#c9b7e8'};
  const announce=()=>window.dispatchEvent(new Event('bubbletasks-schedule-view-changed'));
  function canLeave(){return !draft?.input.value.trim()||confirm('Discard this unsaved schedule item?');}
  window.BubbleTasksSchedule={
    isActive:()=>active,
    show(){active=true;localStorage.setItem(VIEW,'true');view.hidden=false;board.hidden=true;taskForm.hidden=true;render();announce();},
    hide(){if(!active)return true;if(!canLeave())return false;draft=null;active=false;view.hidden=true;board.hidden=false;taskForm.hidden=false;localStorage.setItem(VIEW,'false');announce();return true;},
    getGoogleRange(){if(!active)return null;const start=new Date(selected+'T00:00:00'),end=new Date(selected+'T00:00:00');end.setDate(end.getDate()+1);return {start:start.toISOString(),end:end.toISOString(),key:'schedule:'+selected};}
  };
  window.addEventListener('bubbletasks-backup-import',event=>{if(event.detail?.dailySchedule!==undefined){entries=normalize(event.detail.dailySchedule);if(active&&!draft&&!editor?.open)render();}});
  window.addEventListener('bubbletasks-calendar-updated',()=>{if(active)refreshEvents();});
  window.addEventListener('bubbletasks-account-changed',()=>{if(active)refreshEvents();});
  let status;
  function persist(next){const before=entries;entries=normalize(next);try{localStorage.setItem(SAVE,JSON.stringify({...read(),dailySchedule:entries}));status.textContent='Saved';return true;}catch{entries=before;status.textContent='Could not save. Free some browser storage and try again.';return false;}}
  function changeDate(date){if(!validDate(date)||!canLeave())return;draft=null;selected=date;sessionStorage.setItem(DATE,date);render();announce();}
  function calendarEvents(){
    const data=read(),start=new Date(selected+'T00:00:00'),end=new Date(selected+'T00:00:00');end.setDate(end.getDate()+1);const found=[];
    const add=(title,from,to,color,allDay=false,endKnown=true)=>{
      if(allDay){found.push({title,color,allDay:true});return;}
      if(!Number.isFinite(+from)||!Number.isFinite(+to)||from>=to||from>=end||to<=start)return;
      const a=from<start?0:from.getHours()*60+from.getMinutes(),b=to>=end?1440:to.getHours()*60+to.getMinutes();
      if(b<=a)return;
      const stamp=d=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+(dateKey(d)!==selected?' ('+d.toLocaleDateString([],{month:'short',day:'numeric'})+')':'');
      found.push({title,start:a,end:b,color,label:stamp(from)+(endKnown?' – '+stamp(to):' (end not set)')});
    };
    for(const e of data.calendarEvents||[]){
      if(e.allDay){if(e.date===selected)add(e.title,null,null,COLORS[e.category]||COLORS.misc,true);continue;}
      if(!validDate(e.date)||!e.startTime)continue;
      const from=new Date(e.date+'T'+e.startTime),to=e.endTime?new Date(e.date+'T'+e.endTime):new Date(+from+3600000);
      if(e.endTime&&to<=from)to.setDate(to.getDate()+1);
      add(e.title,from,to,COLORS[e.category]||COLORS.misc,false,Boolean(e.endTime));
    }
    const uid=window.BubbleTasksCloud?.getUserId();
    for(const e of data.googleEventImports||[]){if(!uid||e.userId!==uid)continue;const color=COLORS[data.googleEventCategories?.[e.id]]||'#cad8ef';
      if(e.start?.date&&e.end?.date){if(selected>=e.start.date&&selected<e.end.date)add(e.title,null,null,color,true);}
      else add(e.title,new Date(e.start?.dateTime),new Date(e.end?.dateTime),color);
    }
    return found;
  }
  window.addEventListener('DOMContentLoaded',()=>{
    board=document.getElementById('boardContainer');taskForm=document.querySelector('.task-form');view=node('section','schedule-view');view.id='dailyScheduleView';view.hidden=true;view.setAttribute('aria-label','Daily schedule');board.after(view);
    editor=node('dialog','schedule-editor');editor.setAttribute('aria-label','Edit scheduled task');document.body.append(editor);
    editor.addEventListener('close',()=>{if(active)render();});
  });
  function edit(entry){
    editor.replaceChildren();const form=node('form'),title=node('input'),start=node('input'),end=node('input'),error=node('p','schedule-feedback');
    title.value=entry.title;title.required=true;title.maxLength=500;start.type=end.type='time';start.required=end.required=true;start.value=timeValue(entry.start);end.value=timeValue(entry.end);error.setAttribute('role','alert');
    const field=(text,input)=>{const label=node('label','',text);label.append(input);return label;};
    form.append(node('h2','','Edit scheduled task'),field('Task',title),field('Starts',start),field('Ends',end),node('small','','An end time of midnight means the end of this day.'),error);
    const actions=node('div','schedule-editor-actions'),save=node('button','','Save');save.type='submit';
    actions.append(button('Delete',()=>{if(confirm('Delete this scheduled task?')&&persist(entries.filter(e=>e.id!==entry.id)))editor.close();}),button('Cancel',()=>editor.close()),save);form.append(actions);editor.append(form);
    form.addEventListener('submit',event=>{event.preventDefault();const a=minutes(start.value),rawEnd=minutes(end.value),b=rawEnd===0?1440:rawEnd;if(!title.value.trim()||!Number.isInteger(a)||!Number.isInteger(b)||b<=a){error.textContent='Enter a task and an end time after its start.';return;}if(persist(entries.map(e=>e.id===entry.id?{...e,title:title.value.trim(),start:a,end:b}:e)))editor.close();});
    editor.showModal();title.focus();
  }
  let packing=null;
  function render(){
    if(!active)return;packing?.disconnect();view.replaceChildren();
    const top=node('header','schedule-top'),heading=node('div'),nav=node('div','schedule-date-actions');heading.append(node('h2','','Daily Schedule'),node('p','',new Date(selected+'T12:00:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})));
    const picker=node('input');picker.type='date';picker.value=selected;picker.setAttribute('aria-label','Choose schedule date');picker.addEventListener('change',()=>{const before=selected;changeDate(picker.value);picker.value=selected||before;});
    const move=n=>{const date=new Date(selected+'T12:00:00');date.setDate(date.getDate()+n);changeDate(dateKey(date));};
    nav.append(button('‹',()=>move(-1)),button('Today',()=>changeDate(dateKey(new Date()))),button('Now',()=>{if(!canLeave())return;const now=new Date();changeDate(dateKey(now));requestAnimationFrame(()=>view.querySelector('[data-hour="'+now.getHours()+'"]')?.scrollIntoView({block:'center',behavior:'smooth'}));}),button('›',()=>move(1)),picker);top.append(heading,nav);
    const help=node('p','schedule-help','Click an hour, type a task, and press Enter. Calendar events stay in the background so you can plan within them.');status=node('p','schedule-feedback');status.setAttribute('role','status');
    const allDay=node('div','schedule-all-day'),timeline=node('div','schedule-timeline'),background=node('div','schedule-event-layer');timeline.append(background);view.append(top,help,status,allDay,timeline);
    const rows=[];
    for(let hour=0;hour<24;hour++){
      const row=node('section','schedule-hour');row.dataset.hour=hour;row.append(node('span','schedule-hour-label',clock(hour*60)));
      const lane=node('div','schedule-hour-lane'),add=button('+',()=>openQuick(hour,lane),'schedule-slot-add');add.setAttribute('aria-label','Add task at '+clock(hour*60));lane.append(add);
      for(const entry of entries.filter(e=>e.date===selected&&Math.floor(e.start/60)===hour).sort((a,b)=>a.start-b.start)){
        const card=node('div','schedule-task'+(entry.done?' is-done':'')),check=node('input');check.type='checkbox';check.checked=entry.done;check.setAttribute('aria-label','Complete '+entry.title);
        check.addEventListener('change',()=>{if(persist(entries.map(e=>e.id===entry.id?{...e,done:check.checked}:e)))render();else check.checked=entry.done;});
        const editButton=button('',()=>edit(entry),'schedule-task-edit');editButton.append(node('small','',clock(entry.start)+' – '+clock(entry.end)),node('strong','',entry.title));editButton.setAttribute('aria-label','Edit '+entry.title);card.append(check,editButton);lane.append(card);
      }
      row.append(lane);timeline.append(row);rows.push(row);
    }
    function openQuick(hour,lane){
      if(!canLeave())return;draft?.form.remove();
      const form=node('form','schedule-quick'),input=node('input');input.placeholder='What are you working on?';input.maxLength=500;input.required=true;input.setAttribute('aria-label','New task at '+clock(hour*60));
      const add=node('button','','Add');add.type='submit';const cancel=button('×',()=>{form.remove();draft=null;lane.querySelector('.schedule-slot-add').focus();});cancel.setAttribute('aria-label','Cancel quick add');form.append(input,add,cancel);lane.append(form);draft={form,input};
      form.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancel.click();}});
      form.addEventListener('submit',e=>{e.preventDefault();const title=input.value.trim();if(!title)return;if(persist([...entries,{id:crypto.randomUUID(),date:selected,title,start:hour*60,end:(hour+1)*60,done:false}])){draft=null;render();view.querySelector('[data-hour="'+hour+'"] .schedule-slot-add').focus();}});input.focus();
    }
    let visibleEvents=[];
    const position=m=>{if(m>=1440)return rows[23].offsetTop+rows[23].offsetHeight;const i=Math.floor(m/60),row=rows[i];return row.offsetTop+(m%60)/60*row.offsetHeight;};
    const paintPositions=()=>{visibleEvents.forEach(({event,el})=>{el.style.top=position(event.start)+'px';el.style.height=Math.max(22,position(event.end)-position(event.start))+'px';});};
    refreshEvents=()=>{
      if(!active)return;const events=calendarEvents();allDay.replaceChildren();background.replaceChildren();visibleEvents=[];
      for(const e of events.filter(e=>e.allDay)){const chip=node('span','schedule-all-day-event','All day · '+e.title);chip.style.setProperty('--schedule-event-color',e.color);allDay.append(chip);}
      const timed=events.filter(e=>!e.allDay).sort((a,b)=>a.start-b.start||b.end-a.end),laneEnds=[];
      for(const e of timed){let lane=laneEnds.findIndex(end=>end<=e.start);if(lane<0)lane=laneEnds.length;laneEnds[lane]=e.end;e.lane=lane;}
      for(const e of timed){const block=node('div','schedule-event');block.style.setProperty('--schedule-event-color',e.color);block.style.left=(e.lane/Math.max(1,laneEnds.length)*100)+'%';block.style.width=(100/Math.max(1,laneEnds.length))+'%';block.append(node('strong','',e.title),node('small','',e.label));background.append(block);visibleEvents.push({event:e,el:block});}
      paintPositions();
    };
    refreshEvents();packing=new ResizeObserver(paintPositions);packing.observe(timeline);
  }
})();

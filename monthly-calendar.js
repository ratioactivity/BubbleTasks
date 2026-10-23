/* Calendar events live in the same save as tasks, while the viewed month is device-local. */
(() => {
  const SAVE = 'bubbletasks_plain_v1';
  const MONTH = 'bubbletasks_calendar_month_v1';
  const TYPES = [
    ['birthdays', 'Birthdays & Holidays', '#ff9999'],
    ['family', 'Family & Friends', '#ffca99'],
    ['appointments', 'Appointments', '#ffe799'],
    ['work', 'Work', '#c2ff99'],
    ['goals', 'Business & Creative Goals', '#99ffda'],
    ['reminders', 'Reminders & Tasks', '#99ceff'],
    ['misc', 'Miscellaneous Events', '#af99ff'],
  ];
  const read = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } };
  const validDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split('-').map(Number), date = new Date(y,m-1,d);
    return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d;
  };
  const validTime = (value) => typeof value==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const key = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const localDate = (value) => { const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d); };
  const normalize = (items) => Array.isArray(items) ? items.filter(e=>e&&validDate(e.date)&&typeof e.id==='string'&&typeof e.title==='string').map(e=>({
    id:e.id,title:e.title.slice(0,200),date:e.date,category:TYPES.some(([id])=>id===e.category)?e.category:'misc',
    allDay:e.allDay!==false,startTime:validTime(e.startTime)?e.startTime:'',endTime:validTime(e.endTime)?e.endTime:'',
  })) : [];
  let events = normalize(read().calendarEvents);
  const previousSet = Storage.prototype.setItem;
  // The original task save code does not own calendar edits. Preserve their latest value on every save.
  Storage.prototype.setItem = function(name, value) {
    if(this===localStorage && name===SAVE){
      const data=JSON.parse(value);data.calendarEvents=events;value=JSON.stringify(data);
    }
    return previousSet.call(this,name,value);
  };
  const node = (tag, className, text) => {
    const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;
  };
  const button = (label, text, click, className='') => {
    const el=node('button',className,text);el.type='button';el.setAttribute('aria-label',label);el.title=label;el.addEventListener('click',click);return el;
  };
  const timeText = (value) => { const [h,m]=value.split(':').map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); };
  const download = (data) => {
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='bubbletasks-backup-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('boardContainer'), layout=document.getElementById('layoutToggleButton');
    const dialog=document.getElementById('calendarEventDialog'), form=document.getElementById('calendarEventForm');
    const feedback=document.getElementById('calendarEventError');
    let viewing=new Date(new Date().getFullYear(),new Date().getMonth(),1), editing=null, opener=null;
    const savedMonth=localStorage.getItem(MONTH);
    if(savedMonth&&validDate(savedMonth+'-01'))viewing=localDate(savedMonth+'-01');
    TYPES.forEach(([id,label])=>form.elements.eventCategory.add(new Option(label,id)));
    const persist=()=>{localStorage.setItem(SAVE,JSON.stringify({...read(),calendarEvents:events}));render();};
    const timedFields=()=>{
      const allDay=form.elements.eventAllDay.checked;
      form.querySelector('.calendar-time-fields').hidden=allDay;
      form.elements.eventStart.disabled=allDay;form.elements.eventEnd.disabled=allDay;
      form.elements.eventStart.required=!allDay;
    };
    const open=(date,event,source,focusTime=false)=>{
      editing=event?.id||null;opener=source;feedback.textContent='';form.reset();
      document.getElementById('calendarEventHeading').textContent=event?'Edit event':'Add event';
      form.elements.eventTitle.value=event?.title||'';form.elements.eventDate.value=date;
      form.elements.eventCategory.value=event?.category||'misc';
      form.elements.eventAllDay.checked=event?.allDay!==false;
      form.elements.eventStart.value=event?.startTime||'';form.elements.eventEnd.value=event?.endTime||'';
      document.getElementById('deleteCalendarEvent').hidden=!event;
      timedFields();dialog.showModal();
      (focusTime?(form.elements.eventAllDay.checked?form.elements.eventAllDay:form.elements.eventStart):form.elements.eventTitle).focus();
    };
    const move=(offset)=>{viewing=new Date(viewing.getFullYear(),viewing.getMonth()+offset,1);render();};
    function render(){
      if(!board.matches('.day, .calendar'))return;
      board.className='board calendar';layout.textContent='Layout: calendar';
      const active=document.activeElement;
      const restore=board.contains(active)?active.dataset.calendarFocus:null;
      board.replaceChildren();localStorage.setItem(MONTH,key(viewing).slice(0,7));
      const headingText=viewing.toLocaleDateString(undefined,{month:'long',year:'numeric'});
      const toolbar=node('div','calendar-toolbar');
      const heading=node('h2','calendar-heading',headingText);heading.id='calendarMonthHeading';heading.setAttribute('aria-live','polite');toolbar.appendChild(heading);
      const nav=node('div','calendar-navigation');
      const prev=button('Previous month','‹',()=>move(-1));prev.dataset.calendarFocus='previous';
      const today=button('Go to current month','Today',()=>{viewing=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();});today.dataset.calendarFocus='today';
      const next=button('Next month','›',()=>move(1));next.dataset.calendarFocus='next';
      const jump=node('input');jump.type='month';jump.value=key(viewing).slice(0,7);jump.setAttribute('aria-label','Choose month');jump.dataset.calendarFocus='month';
      jump.addEventListener('change',()=>{if(validDate(jump.value+'-01')){viewing=localDate(jump.value+'-01');render();}});
      nav.append(prev,today,next,jump);toolbar.appendChild(nav);board.appendChild(toolbar);
      const legend=node('ul','calendar-legend');legend.setAttribute('aria-label','Event colors');
      TYPES.forEach(([,label,color])=>{const item=node('li','',label);item.style.setProperty('--event-color',color);legend.appendChild(item);});board.appendChild(legend);
      const scroll=node('div','calendar-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label',headingText+' calendar. Scroll horizontally on smaller screens.');
      const grid=node('div','calendar-grid');grid.setAttribute('aria-labelledby',heading.id);
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day=>grid.appendChild(node('div','calendar-weekday',day)));
      const first=new Date(viewing.getFullYear(),viewing.getMonth(),1-viewing.getDay());
      const days=new Date(viewing.getFullYear(),viewing.getMonth()+1,0).getDate();
      const cells=Math.ceil((viewing.getDay()+days)/7)*7;
      const data=read();const tasks=[...new Map([...(data.tasks||[]),...(data.archived||[])].filter(t=>t&&validDate(t.dueDate)).map(t=>[t.id,t])).values()];
      for(let i=0;i<cells;i++){
        const date=new Date(first.getFullYear(),first.getMonth(),first.getDate()+i), dateKey=key(date);
        const label=date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
        const cell=node('section','calendar-day'+(date.getMonth()!==viewing.getMonth()?' calendar-day-outside':'')+(dateKey===key(new Date())?' calendar-day-today':''));
        cell.dataset.date=dateKey;cell.setAttribute('aria-label',label);
        const header=node('div','calendar-day-header'), dateNumber=node('time','',String(date.getDate()));dateNumber.dateTime=dateKey;
        const add=button('Add event on '+label,'+',()=>open(dateKey,null,add),'calendar-add');add.dataset.calendarFocus=dateKey;
        header.append(dateNumber,add);cell.appendChild(header);
        events.filter(e=>e.date===dateKey).sort((a,b)=>Number(b.allDay)-Number(a.allDay)||a.startTime.localeCompare(b.startTime)||a.title.localeCompare(b.title)).forEach(event=>{
          const bubble=node('article','calendar-event');bubble.dataset.eventId=event.id;
          const [,category,color]=TYPES.find(([id])=>id===event.category);bubble.style.setProperty('--event-color',color);bubble.setAttribute('aria-label',category+': '+event.title);
          const title=button('Edit event '+event.title,event.title,()=>open(event.date,event,title),'calendar-event-title');
          const time=event.allDay?'All day':event.startTime?(timeText(event.startTime)+(event.endTime?' – '+timeText(event.endTime):'')):'Set time';
          const timeButton=button('Edit time for '+event.title,time,()=>open(event.date,event,timeButton,true),'calendar-event-time');
          bubble.append(title,timeButton);cell.appendChild(bubble);
        });
        tasks.filter(t=>t.dueDate===dateKey).sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)).forEach(task=>{
          const done=task.status==='Complete';const bubble=node('article','calendar-task'+(done?' calendar-task-done':''));
          bubble.style.setProperty('--event-color','#99ceff');bubble.append(node('small','',done?'Completed task':'Task due'),node('strong','',task.title));
          cell.appendChild(bubble);
        });
        grid.appendChild(cell);
      }
      scroll.appendChild(grid);board.appendChild(scroll);
      if(restore)[...board.querySelectorAll('[data-calendar-focus]')].find(el=>el.dataset.calendarFocus===restore)?.focus();
    }
    form.elements.eventAllDay.addEventListener('change',timedFields);
    form.addEventListener('submit',event=>{
      event.preventDefault();feedback.textContent='';
      const title=form.elements.eventTitle.value.trim(),date=form.elements.eventDate.value,allDay=form.elements.eventAllDay.checked;
      const start=form.elements.eventStart.value,end=form.elements.eventEnd.value;
      if(!title||!validDate(date)){feedback.textContent='Enter a title and a valid date.';return;}
      if(!allDay&&(!validTime(start)||(end&&(!validTime(end)||end<start)))){feedback.textContent='Enter a start time and an end time at or after it.';return;}
      const value={id:editing||crypto.randomUUID(),title,date,category:form.elements.eventCategory.value,allDay,startTime:allDay?'':start,endTime:allDay?'':end};
      events=editing?events.map(e=>e.id===editing?value:e):[...events,value];
      dialog.close();persist();board.querySelector('[data-date="'+date+'"] .calendar-add')?.focus();
    });
    document.getElementById('cancelCalendarEvent').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
    document.getElementById('deleteCalendarEvent').addEventListener('click',()=>{
      if(!editing||!confirm('Delete this calendar event?'))return;
      events=events.filter(e=>e.id!==editing);dialog.close();persist();
    });
    // Export the complete saved document, including events, without authentication tokens.
    document.getElementById('backupTasksButton').addEventListener('click',(event)=>{
      event.stopImmediatePropagation();download({...read(),calendarEvents:events,exportedAt:new Date().toISOString(),taskCount:(read().tasks||[]).length});
    },true);
    const backupInput=document.getElementById('backupFileInput');let restoring=false;
    backupInput.addEventListener('change',async(event)=>{
      if(restoring)return;
      const file=backupInput.files?.[0];if(!file)return;
      event.stopImmediatePropagation();
      try{
        const parsed=JSON.parse(await file.text());const tasks=Array.isArray(parsed)?parsed:parsed.tasks;
        if(!Array.isArray(tasks)||tasks.some(t=>!t||typeof t!=='object'))throw new Error('Invalid backup');
        if(parsed.calendarEvents!==undefined){if(!Array.isArray(parsed.calendarEvents))throw new Error('Invalid events');events=normalize(parsed.calendarEvents);}
        window.dispatchEvent(new CustomEvent('bubbletasks-backup-import',{detail:parsed}));
        restoring=true;backupInput.dispatchEvent(new Event('change',{bubbles:true}));restoring=false;
      }catch{alert('Invalid backup file. Please choose a BubbleTasks JSON backup.');backupInput.value='';restoring=false;}
    },true);
    new MutationObserver(()=>{if(board.classList.contains('day'))render();}).observe(board,{childList:true});
    render();
  });
})();

/* Independent widgets, one saved document per day. No Notion credentials in the browser. */
(() => {
  const M=window.BubbleTasksDailyModel,SAVE='bubbletasks_plain_v1',VIEW='bubbletasks_day_view_v1',DATE='bubbletasks_day_date_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  let tracker;try{tracker=M.normalize(read().dailyTracker);}catch(error){console.error(error.message);return;}
  const previous=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&key===SAVE){const data=JSON.parse(value);data.dailyTracker=tracker;value=JSON.stringify(data);}
    return previous.call(this,key,value);
  };
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const btn=(text,click,cls='')=>{const n=el('button',cls,text);n.type='button';n.addEventListener('click',click);return n;};
  const input=(type,value='',label='')=>{const n=el('input');n.type=type;n.value=value;if(label)n.setAttribute('aria-label',label);return n;};
  const field=(title,n)=>{const label=el('label','day-field',title);label.append(n);return label;};
  const clock=s=>new Date(s).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const stamp=s=>new Date(s).toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
  const local=s=>{const d=new Date(s);return M.dateKey(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
  const identifier=()=>crypto.randomUUID();
  window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('boardContainer'),notes=document.getElementById('notesView'),layout=document.getElementById('layoutToggleButton'),notesButton=document.getElementById('notesToggleButton');
    const taskForm=document.querySelector('.task-form'),view=el('section','daily-view');view.id='dailyTrackerView';view.setAttribute('aria-label','Day dashboard');board.after(view);
    let showing=localStorage.getItem(VIEW)==='true', selected=sessionStorage.getItem(DATE);
    if(!M.validDate(selected))selected=M.dateKey(new Date());
    if(showing&&notesButton?.getAttribute('aria-pressed')==='true')notesButton.click();
    let dirtyForms=new Set(),lastUser=window.BubbleTasksCloud?.getUserId(),uploading=false,uploadEpoch=0;
    const dayButton=btn('Day',()=>{if(showing)leave();else enter();});dayButton.id='dayToggleButton';layout.after(dayButton);
    const dialog=el('dialog','day-dialog');dialog.id='dailyEntryDialog';document.body.append(dialog);
    const feedback=el('p','day-feedback');feedback.setAttribute('role','status');
    let dialogDirty=false;
    dialog.addEventListener('input',()=>dialogDirty=true);
    dialog.addEventListener('cancel',event=>{if(dialogDirty&&!confirm('Discard this unsaved entry?'))event.preventDefault();});
    const current=()=>tracker.days[selected]||M.emptyDay();
    const nowTime=()=>selected+'T'+local(new Date().toISOString()).slice(11);
    const message=text=>{feedback.textContent=text;};
    const confirmLeave=()=>!dirtyForms.size||confirm('Leave without saving the changes in the open widgets?');
    function enter(){
      if(notes&&!notes.hidden)notesButton.click();
      showing=true;localStorage.setItem(VIEW,'true');apply();render();
    }
    function leave(){if(!confirmLeave())return false;showing=false;localStorage.setItem(VIEW,'false');dirtyForms.clear();apply();return true;}
    function apply(){
      view.hidden=!showing;dayButton.setAttribute('aria-pressed',String(showing));
      if(showing){board.hidden=true;taskForm.hidden=true;if(notes)notes.hidden=true;if(layout.textContent!=='Layout: day')layout.textContent='Layout: day';}
      else if(notesButton?.getAttribute('aria-pressed')!=='true'){board.hidden=false;taskForm.hidden=false;layout.textContent='Layout: '+(board.classList.contains('calendar')?'calendar':board.classList.contains('tabs')?'tabs':'columns');}
    }
    layout.addEventListener('click',event=>{if(showing){event.stopImmediatePropagation();leave();}},true);
    notesButton?.addEventListener('click',event=>{if(showing){if(!leave()){event.stopImmediatePropagation();return;}}},true);
    new MutationObserver(()=>{if(showing)apply();}).observe(layout,{childList:true});
    function save(change,form){
      const before=tracker;tracker=M.normalize(tracker);
      const d=tracker.days[selected]||M.emptyDay();change(d,tracker);
      d.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;d.revision=identifier();d.updatedAt=new Date().toISOString();tracker.days[selected]=M.day(d);
      try{localStorage.setItem(SAVE,JSON.stringify({...read(),dailyTracker:tracker}));}
      catch{tracker=before;message('Could not save. Free some browser storage and try again.');return false;}
      if(form)dirtyForms.delete(form);message('Saved on this device');return true;
    }
    function widget(title,subtitle){
      const box=el('section','day-widget');box.append(el('h3','',title));if(subtitle)box.append(el('p','day-help',subtitle));return box;
    }
    function formFor(box,change){
      const form=el('form','day-form'),submit=el('button','day-primary','Save');submit.type='submit';
      form.addEventListener('input',()=>dirtyForms.add(form));form.addEventListener('change',()=>dirtyForms.add(form));
      form.addEventListener('submit',event=>{event.preventDefault();if(change(form)===false)return;if(!dirtyForms.size)render();});
      box.append(form);return {form,submit};
    }
    // Inline completion supports phrases, e.g. "bladder cr" -> "bladder cramps"; never a dropdown.
    function tagEntry(label,known,add,clear=true){
      const box=el('div','day-tag-entry'),row=el('div','day-inline'),value=input('text','',label);value.placeholder=label;value.autocomplete='off';value.maxLength=100;
      const suggestion=btn('',()=>{value.value=suggested;value.dispatchEvent(new Event('input',{bubbles:true}));update();value.focus();},'day-suggestion');suggestion.hidden=true;
      let suggested='';
      function update(){const p=value.value.trim().replace(/^#/,'').toLowerCase();suggested=p?known().find(t=>t.toLowerCase().startsWith(p)&&t.toLowerCase()!==p)||'':'';suggestion.hidden=!suggested;suggestion.textContent=suggested?'Complete '+suggested+' ↹':'';}
      const commit=()=>{const name=value.value.trim().replace(/^#+/,'');if(!name)return;add(name);if(clear)value.value='';update();};
      value.addEventListener('input',update);
      value.addEventListener('keydown',event=>{if(event.isComposing)return;if(event.key==='Tab'&&suggested&&!event.shiftKey){event.preventDefault();value.value=suggested;value.dispatchEvent(new Event('input',{bubbles:true}));update();}else if(event.key==='Enter'){event.preventDefault();commit();}});
      row.append(value,btn('+',commit));box.append(row,suggestion,el('small','day-help','Enter adds · Tab completes'));return {box,value};
    }
    function openDialog(title,build){
      if(dialog.open){if(dialogDirty&&!confirm('Discard this unsaved entry?'))return;dialog.close();}
      dialog.replaceChildren();const h=el('h2','',title);h.id='dailyEntryHeading';dialog.setAttribute('aria-labelledby',h.id);dialog.append(h);
      const form=el('form','day-form');dialog.append(form);
      const error=el('p','day-error');error.setAttribute('role','alert');
      const actions=el('div','day-actions'),cancel=btn('Cancel',()=>{if(!dialogDirty||confirm('Discard this unsaved entry?'))dialog.close();}),submit=el('button','day-primary','Save entry');submit.type='submit';actions.append(cancel,submit);
      const handlers=build(form,error)||{};
      form.append(error,actions);form.addEventListener('submit',event=>{event.preventDefault();if(handlers.submit?.()!==false){dialogDirty=false;dialog.close();if(!dirtyForms.size)render();}});
      if(handlers.remove){actions.prepend(btn('Delete entry',()=>{if(confirm('Delete this entry?')&&handlers.remove()!==false){dialogDirty=false;dialog.close();if(!dirtyForms.size)render();}},'day-delete'));}
      dialogDirty=false;dialog.showModal();form.querySelector('input,textarea,button')?.focus();
    }
    function reading(type,entry,initial){
      openDialog((entry?'Edit ':'Log ')+(type==='mood'?'mood':type==='pain'?'pain':'symptom'),(form,error)=>{
        const time=input('datetime-local',entry?local(entry.time):nowTime(),'Entry time');time.required=true;
        const score=input('number',entry?.rating??initial??'','Rating');score.min='1';score.max='10';score.step='1';score.required=type!=='symptoms';
        const note=el('textarea');note.rows=3;note.maxLength=2000;note.value=entry?.note||'';
        let name,area;
        if(type==='symptoms'){
          const all=tracker.symptoms.map(s=>s.name);const tag=tagEntry('Symptom',()=>all,n=>{name.value=n;updateArea();},false);name=tag.value;name.required=true;name.value=entry?.name||'';
          area=el('select');area.setAttribute('aria-label','Body area');M.AREAS.forEach(a=>area.add(new Option(a,a)));area.value=entry?.area||'Misc.';
          function updateArea(){const existing=tracker.symptoms.find(s=>s.name.toLowerCase()===name.value.trim().toLowerCase());if(existing)area.value=existing.area;}
          name.addEventListener('input',updateArea);name.addEventListener('change',updateArea);
          form.append(tag.box,field('Body area (remembered for this symptom)',area));
        }
        form.append(field('When',time),field(type==='symptoms'?'Severity 1–10 (optional)':'Rating 1–10',score),field('Note (optional)',note));
        return {submit:()=>{
          if(!M.localTime(time.value)||time.value.slice(0,10)!==selected){error.textContent='Use a time on the selected day.';return false;}
          const value=score.value===''?null:Number(score.value);
          if((type!=='symptoms'||value!==null)&&M.rating(value)===null){error.textContent='Choose a whole number from 1 to 10.';return false;}
          const record={id:entry?.id||identifier(),time:new Date(time.value).toISOString(),rating:value,note:note.value};
          if(type==='symptoms'){if(!name.value.trim()){error.textContent='Enter a symptom.';return false;}record.name=name.value.trim();record.area=area.value;}
          return save((d,t)=>{d[type]=entry?d[type].map(e=>e.id===entry.id?record:e):[...d[type],record];if(type==='symptoms'){const old=t.symptoms.find(s=>s.name.toLowerCase()===record.name.toLowerCase());if(old)old.area=record.area;else t.symptoms.push({name:record.name,area:record.area});}});
        },remove:entry?()=>save(d=>d[type]=d[type].filter(e=>e.id!==entry.id)):null};
      });
    }
    function focusEntry(type,entry,name){
      openDialog((entry?'Edit ':'Add ')+(type==='focus'?'hyperfixation':'watching'),form=>{
        const title=input('text',entry?.name||name||'','Name');title.required=true;title.maxLength=100;
        const note=el('textarea');note.rows=3;note.maxLength=2000;note.value=entry?.note||'';note.placeholder=type==='focus'?'e.g. worked on chapter 31':'e.g. Season 2, episode 4';
        const onMind=input('checkbox'),worked=input('checkbox');onMind.checked=entry?.onMind??false;worked.checked=entry?.worked??false;
        form.append(field('Name',title));if(type==='focus')form.append(field('On my mind',onMind),field('Worked on',worked));form.append(field('Progress / note',note));
        return {submit:()=>save(d=>{const value={id:entry?.id||identifier(),name:title.value.trim(),note:note.value,...(type==='focus'?{onMind:onMind.checked,worked:worked.checked}:{})};d[type]=entry?d[type].map(e=>e.id===entry.id?value:e):[...d[type],value];}),remove:entry?()=>save(d=>d[type]=d[type].filter(e=>e.id!==entry.id)):null};
      });
    }
    function history(name){
      openDialog(name+' · history',form=>{
        const records=Object.entries(tracker.days).sort(([a],[b])=>b.localeCompare(a)).flatMap(([date,d])=>d.focus.filter(e=>e.name.toLowerCase()===name.toLowerCase()).map(e=>({date,e})));
        if(!records.length)form.append(el('p','','No entries yet.'));
        for(const {date,e} of records){const row=el('article','day-history-row');row.append(btn(date,()=>{dialog.close();if(!showing)enter();navigate(date);}),el('p','',[e.onMind?'On my mind':'',e.worked?'Worked on':'',e.note].filter(Boolean).join(' · ')));form.append(row);}
        return {submit:()=>true};
      });
      dialog.querySelector('[type=submit]').textContent='Close';
    }
    function noteEntry(type,entry){
      openDialog(type==='meals'?'Meal':'Learned today',(form,error)=>{
        const time=input('datetime-local',entry?local(entry.time):nowTime());time.required=true;
        const text=el('textarea');text.rows=4;text.required=true;text.maxLength=4000;text.value=entry?.text||'';
        const label=el('select');label.setAttribute('aria-label','Meal');['','Breakfast','Lunch','Dinner','Snack','Other'].forEach(v=>label.add(new Option(v||'No meal label',v)));label.value=entry?.label||'';
        form.append(field('When',time));if(type==='meals')form.append(field('Meal',label));form.append(field(type==='meals'?'What did you eat?':'What did you learn?',text));
        return {submit:()=>{if(!M.localTime(time.value)||time.value.slice(0,10)!==selected){error.textContent='Use a time on the selected day.';return false;}return save(d=>{const value={id:entry?.id||identifier(),time:new Date(time.value).toISOString(),text:text.value,...(type==='meals'?{label:label.value}:{})};d[type]=entry?d[type].map(e=>e.id===entry.id?value:e):[...d[type],value];});},remove:entry?()=>save(d=>d[type]=d[type].filter(e=>e.id!==entry.id)):null};
      });
    }
    function known(type){
      if(type==='symptoms')return tracker.symptoms.map(s=>s.name);
      return M.tags(Object.values(tracker.days).flatMap(d=>type==='artists'?d.music.artists:type==='genres'?M.genres(d,tracker):type==='activities'?d.activities:d[type].map(e=>e.name)));
    }
    function artistGenres(name){
      openDialog(name+' · default genres',form=>{
        let values=[...(tracker.artists.find(a=>a.name.toLowerCase()===name.toLowerCase())?.genres||[])];
        const chips=el('div','day-tags');const redraw=()=>{chips.replaceChildren();values.forEach(v=>chips.append(btn(v+' ×',()=>{values=values.filter(t=>t!==v);redraw();dialogDirty=true;},'day-tag')));};
        const tag=tagEntry('Genre',()=>known('genres'),v=>{values=M.tags([...values,v]);redraw();dialogDirty=true;});redraw();form.append(chips,tag.box);
        return {submit:()=>{if(tag.value.value.trim())values=M.tags([...values,tag.value.value]);return save((d,t)=>{const a=t.artists.find(a=>a.name.toLowerCase()===name.toLowerCase());if(a)a.genres=values;else t.artists.push({name,genres:values});for(const [key,oldDay] of Object.entries(t.days)){if(key!==selected&&oldDay.music.genres===null&&oldDay.music.artists.some(v=>v.toLowerCase()===name.toLowerCase())){oldDay.revision=identifier();oldDay.updatedAt=new Date().toISOString();}}});}};
      });
    }
    function navigate(date){if(!M.validDate(date)||!confirmLeave())return;selected=date;dirtyForms.clear();sessionStorage.setItem(DATE,date);render();}
    function render(){
      if(!showing||dirtyForms.size)return;const scrollTop=window.scrollY,scrollLeft=window.scrollX;dirtyForms.clear();view.replaceChildren();const d=current();
      const top=el('header','day-heading');top.style.setProperty('--day-mood',M.moodColor(d));
      const heading=el('div');heading.append(el('h2','',d.music.title||'Today’s daybook'),el('p','',new Date(selected+'T12:00:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})));
      const nav=el('div','day-actions'),pick=input('date',selected,'Choose log date');pick.addEventListener('change',()=>navigate(pick.value));
      const move=n=>{const date=new Date(selected+'T12:00:00');date.setDate(date.getDate()+n);navigate(M.dateKey(date));};
      nav.append(btn('‹',()=>move(-1)),btn('Today',()=>navigate(M.dateKey(new Date()))),btn('›',()=>move(1)),pick);top.append(heading,nav);view.append(top,feedback);
      const agenda=widget('Tasks & events','Your scheduled events, due tasks, and today’s agenda.');
      const data=read(), agendaItems=data.agenda?.dateKey===selected?data.agenda.items||[]:[];
      const due=[...(data.tasks||[]),...(data.archived||[])].filter(t=>t.dueDate===selected);
      const events=(data.calendarEvents||[]).filter(e=>e.date===selected).map(e=>(e.allDay?'All day':e.startTime||'')+' · '+e.title);
      const uid=window.BubbleTasksCloud?.getUserId();
      for(const e of data.googleEventImports||[]){if(e.userId!==uid)continue;const start=e.start?.date,end=e.end?.date,dayStart=new Date(selected+'T00:00:00'),dayEnd=new Date(selected+'T00:00:00');dayEnd.setDate(dayEnd.getDate()+1);const from=new Date(e.start?.dateTime),until=new Date(e.end?.dateTime);if(start&&end?selected>=start&&selected<end:from<dayEnd&&until>dayStart)events.push((start?'All day':from<dayStart?'Continues':clock(e.start.dateTime))+' · '+e.title);}
      for(const line of [...events,...due.map(t=>t.title+' · '+t.status),...agendaItems.map(t=>t.text||t.title||'Agenda item')])agenda.append(el('p','day-schedule-line',line));
      if(!events.length&&!due.length&&!agendaItems.length)agenda.append(el('p','day-help','Nothing scheduled for this date.'));
      view.append(agenda);const grid=el('div','day-grid');view.append(grid);
      const music=widget('Song of the Day','The title of your day. Artist genres are remembered and reused.');
      const song=input('text',d.music.title,'Song title');song.maxLength=200;
      const sf=formFor(music,()=>save(day=>day.music.title=song.value.trim(),sf.form));sf.form.append(field('Song title',song),sf.submit);
      const artistChips=el('div','day-tags');d.music.artists.forEach(name=>artistChips.append(btn(name+' · genres',()=>artistGenres(name),'day-tag'),btn('×',()=>{if(save(day=>day.music.artists=day.music.artists.filter(n=>n!==name)))render();},'day-tag-remove')));
      music.append(artistChips,tagEntry('Add artist',()=>known('artists'),name=>{if(save((day,t)=>{day.music.artists=M.tags([...day.music.artists,name]);if(!t.artists.some(a=>a.name.toLowerCase()===name.toLowerCase()))t.artists.push({name,genres:[]});}))render();}).box);
      music.append(el('p','day-help','Genres: '+(M.genres(d,tracker).join(', ')||'Set genres on an artist, or add a song-specific genre below.')));
      const genreChips=el('div','day-tags');if(d.music.genres!==null)d.music.genres.forEach(g=>genreChips.append(btn(g+' ×',()=>{if(save(day=>day.music.genres=day.music.genres.filter(v=>v!==g)))render();},'day-tag')));
      music.append(genreChips,tagEntry('Song-specific genre',()=>known('genres'),name=>{if(save(day=>day.music.genres=M.tags([...M.genres(day,tracker),name])))render();}).box,btn('Use artist defaults',()=>{if(save(day=>day.music.genres=null))render();}));grid.append(music);
      const sleep=widget('Sleep','Log the sleep that ended on this date. After-midnight bedtimes use the wake-up date; choose the previous date if you slept before midnight.');
      const bed=input('datetime-local',d.sleep.bed,'Bed time'),wake=input('datetime-local',d.sleep.wake,'Wake time');
      const sl=formFor(sleep,form=>{const trial={sleep:{bed:bed.value,wake:wake.value,bedAt:bed.value?new Date(bed.value).toISOString():'',wakeAt:wake.value?new Date(wake.value).toISOString():''}};if(wake.value&&wake.value.slice(0,10)!==selected){message('Wake time must be on this log date.');return false;}if(bed.value&&wake.value&&M.sleepHours(trial)===null){message('Wake time must follow bed time, within 48 hours.');return false;}return save(day=>day.sleep=trial.sleep,form);});
      sl.form.append(field('Went to sleep',bed),field('Woke up',wake),sl.submit);sleep.append(el('p','day-stat',M.sleepHours(d)===null?'Hours slept: not recorded':M.sleepHours(d).toFixed(1)+' hours slept'));grid.append(sleep);
      for(const type of ['mood','pain']){
        const w=widget(type==='mood'?'Mood':'Pain',type==='mood'?'1 = worst · 10 = best':'1 = least pain · 10 = most pain');
        const avg=M.mean(d[type]);w.append(el('p','day-stat',avg===null?'Not recorded':'Average: '+avg.toFixed(1)+' / 10'+(type==='pain'?' · Peak: '+Math.max(...d.pain.map(e=>e.rating)):''))); 
        const ratings=el('div','day-rating-buttons');for(let n=1;n<=10;n++){const b=btn(String(n),()=>reading(type,null,n));b.setAttribute('aria-label','Log '+type+' '+n);if(type==='mood')b.style.background=M.COLORS[n-1];ratings.append(b);}w.append(ratings);
        d[type].forEach(e=>w.append(btn(clock(e.time)+' · '+e.rating+'/10'+(e.note?' · '+e.note:''),()=>reading(type,e),'day-entry')));grid.append(w);
      }
      const symptoms=widget('Symptoms','Type a symptom or create one. Each symptom remembers its body-area group.');
      const areaFilter=el('select');areaFilter.setAttribute('aria-label','Filter symptoms by body area');['All areas',...M.AREAS].forEach(a=>areaFilter.add(new Option(a,a)));const symptomRows=el('div');
      const showSymptoms=()=>{symptomRows.replaceChildren();d.symptoms.filter(e=>areaFilter.value==='All areas'||e.area===areaFilter.value).forEach(e=>symptomRows.append(btn(clock(e.time)+' · '+e.name+' · '+e.area+(e.rating?' · '+e.rating+'/10':''),()=>reading('symptoms',e),'day-entry')));};areaFilter.addEventListener('change',showSymptoms);showSymptoms();
      symptoms.append(btn('+ Log symptom',()=>reading('symptoms')),areaFilter,symptomRows);grid.append(symptoms);
      const cycle=widget('Menstrual cycle','A separate record; leaving it blank means not recorded.');
      const yes=el('select');yes.setAttribute('aria-label','Menstruating?');[['','Not recorded'],['no','No'],['yes','Yes']].forEach(([v,l])=>yes.add(new Option(l,v)));yes.value=d.cycle.menstruating===null?'':d.cycle.menstruating?'yes':'no';
      const flow=el('select');flow.setAttribute('aria-label','Flow');['','Spotting','Light','Medium','Heavy'].forEach(v=>flow.add(new Option(v||'Choose flow',v)));flow.value=d.cycle.flow;
      const flowLabel=field('Flow',flow);flowLabel.hidden=yes.value!=='yes';yes.addEventListener('change',()=>flowLabel.hidden=yes.value!=='yes');
      const cycleNote=el('textarea');cycleNote.rows=3;cycleNote.maxLength=2000;cycleNote.value=d.cycle.note;
      const cf=formFor(cycle,form=>save(day=>day.cycle={menstruating:yes.value===''?null:yes.value==='yes',flow:yes.value==='yes'?flow.value:'',note:cycleNote.value},form));
      cf.form.append(field('Menstruating?',yes),flowLabel,field('Notes',cycleNote),cf.submit);grid.append(cycle);
      const activities=widget('What did you do today?');const activityChips=el('div','day-tags');d.activities.forEach(name=>activityChips.append(btn(name+' ×',()=>{if(save(day=>day.activities=day.activities.filter(v=>v!==name)))render();},'day-tag')));activities.append(activityChips,tagEntry('Add activity',()=>known('activities'),name=>{if(save(day=>day.activities=M.tags([...day.activities,name])))render();}).box);grid.append(activities);
      for(const type of ['focus','watching']){
        const box=widget(type==='focus'?'Hyperfixations':'What are you watching?',type==='focus'?'“On my mind” and “Worked on” can both be true. Each interest has its own progress note.':null);
        box.append(tagEntry(type==='focus'?'Story, game, or interest':'Show or movie',()=>M.tags([...known(type),...(type==='focus'?['BOTA','APEX','Parallel','Black & Blue','Wild Sky','Mask','Teeth','Ruse','Horizon Line','Sleeper','Coup','Kaleidoscope']:[])]),name=>focusEntry(type,null,name)).box);
        d[type].forEach(e=>{const row=el('div','day-interest');row.append(btn(e.name+(type==='focus'?' · '+[e.onMind?'On my mind':'',e.worked?'Worked on':''].filter(Boolean).join(' / '):''),()=>focusEntry(type,e),'day-entry'));if(e.note)row.append(el('p','',e.note));if(type==='focus')row.append(btn('History',()=>history(e.name),'day-history'));box.append(row);});grid.append(box);
      }
      for(const type of ['meals','learned']){const box=widget(type==='meals'?'Meals':'Learned today');box.append(btn('+ Add entry',()=>noteEntry(type)));d[type].forEach(e=>box.append(btn(clock(e.time)+' · '+(e.label?e.label+' · ':'')+e.text,()=>noteEntry(type,e),'day-entry')));grid.append(box);}
      const noteBox=widget('Anything else?');const note=el('textarea');note.rows=5;note.maxLength=10000;note.value=d.notes;
      const nf=formFor(noteBox,form=>save(day=>day.notes=note.value,form));nf.form.append(field('Daily notes',note),nf.submit);grid.append(noteBox);
      const summary=el('details','day-summary'),summaryTitle=el('summary','','Daily summary'),pre=el('pre','',M.summary(selected,d,tracker,stamp));summary.append(summaryTitle,pre,btn('Download summary',()=>download(M.summary(selected,current(),tracker,stamp),'bubbletasks-'+selected+'.txt','text/plain')));view.append(summary);
      const sync=widget('Notion uploads','Uploads update the same page for this date. Your token stays in the backend.');
      const status=el('p');status.dataset.daySyncStatus='';status.setAttribute('role','status');
      const enabled=input('checkbox');enabled.checked=isEnabled();enabled.addEventListener('change',()=>{const user=window.BubbleTasksCloud?.getUserId();if(!user){enabled.checked=false;message('Sign in to BubbleTasks first.');return;}localStorage.setItem('bubbletasks_notion_auto_v1:'+user,String(enabled.checked));paintSync();if(enabled.checked)syncPending();});
      sync.append(field('Automatically upload saved days to Notion',enabled),status,btn('Upload this date now',()=>syncDate(selected,true)));
      const owner=window.BubbleTasksCloud?.getUserId();
      if(owner){const setup=el('details');setup.append(el('summary','','Connection setup'),el('p','day-help','Supabase secret NOTION_OWNER_USER_ID must match your signed-in BubbleTasks account ID:'),el('code','',owner));const guide=el('a','','Notion setup instructions');guide.href='https://github.com/ratioactivity/BubbleTasks/blob/v2.0/docs/day-dashboard.md';guide.target='_blank';guide.rel='noopener noreferrer';setup.append(guide);sync.append(setup);}
      else sync.append(el('p','day-help','Sign in using the online-sync panel to enable uploads.'));
      view.append(sync);paintSync();apply();window.scrollTo({top:scrollTop,left:scrollLeft,behavior:'instant'});
    }
    function download(content,name,type){const a=el('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
    const isEnabled=()=>{const user=window.BubbleTasksCloud?.getUserId();return user&&localStorage.getItem('bubbletasks_notion_auto_v1:'+user)==='true';};
    let syncText='Not connected yet · logging works without Notion.';
    function paintSync(){const n=view.querySelector('[data-day-sync-status]');if(n)n.textContent=syncText;}
    function acknowledgements(){const key='bubbletasks_notion_ack_v1:'+window.BubbleTasksCloud?.getUserId();try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}}
    async function syncDate(date,manual=false){
      const cloud=window.BubbleTasksCloud,user=cloud?.getUserId();if(!user){syncText='Sign in to BubbleTasks first.';paintSync();return;}
      if(uploading)return;if(!tracker.days[date]?.revision){syncText='Save something for this date before uploading.';paintSync();return;}
      if(!document.querySelector('[data-sync-status]')?.textContent.startsWith('Synced')){syncText='Waiting for your BubbleTasks online save to finish syncing.';paintSync();return;}
      uploading=true;const epoch=uploadEpoch;syncText='Uploading '+date+'…';paintSync();
      try{
        const token=await cloud.getAccessToken();if(epoch!==uploadEpoch||cloud.getUserId()!==user)return;
        const response=await fetch('https://ejrnkaigdstalaypyhhp.supabase.co/functions/v1/daily-tracker-sync',{method:'POST',signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_Qe_bJpZQLlm-CGoPnmhqFQ_aOxXtGhN','Content-Type':'application/json'},body:JSON.stringify({date})});
        const result=await response.json().catch(()=>({}));if(epoch!==uploadEpoch||cloud.getUserId()!==user)return;
        if(!response.ok)throw Error(result.error||'The Notion function is not available yet. Your daily log is saved in BubbleTasks.');
        const ack=acknowledgements();ack[date]=result.revision;localStorage.setItem('bubbletasks_notion_ack_v1:'+user,JSON.stringify(ack));
        syncText='Uploaded '+date+' to Notion'+(result.revision!==tracker.days[date]?.revision?' · newer changes are waiting':'');
      }catch(error){if(epoch===uploadEpoch)syncText=error.name==='TimeoutError'?'Upload timed out. Your saved log is safe; retrying will update the same Notion page.':error.message;}
      finally{uploading=false;paintSync();}
    }
    async function syncPending(){if(!isEnabled()||uploading||document.visibilityState!=='visible')return;const ack=acknowledgements(),date=Object.keys(tracker.days).sort().find(date=>tracker.days[date].revision&&ack[date]!==tracker.days[date].revision);if(date)await syncDate(date);}
    setInterval(syncPending,15000);window.addEventListener('online',syncPending);
    window.addEventListener('bubbletasks-account-changed',()=>{uploadEpoch++;lastUser=window.BubbleTasksCloud?.getUserId();syncText='Account changed · uploads use the signed-in account.';if(dialog.open)dialog.close();if(showing&&!dirtyForms.size)render();});
    window.addEventListener('bubbletasks-backup-import',event=>{if(event.detail?.dailyTracker!==undefined){tracker=M.normalize(event.detail.dailyTracker);if(showing&&!dirtyForms.size)render();}});
    // Writing-card history uses the same daily focus entries, without copying story task data.
    function storyHistory(){board.querySelectorAll('.story-column').forEach(card=>{if(card.querySelector('.day-story-history'))return;const name=card.dataset.story;if(!name)return;const b=btn('◷',()=>history(name),'day-story-history');b.title=b.ariaLabel='Daily work history for '+name;card.append(b);});}
    new MutationObserver(storyHistory).observe(board,{childList:true,subtree:true});storyHistory();
    window.addEventListener('beforeunload',event=>{if(dirtyForms.size||dialog.open&&dialogDirty){event.preventDefault();event.returnValue='';}});
    apply();render();
  });
})();

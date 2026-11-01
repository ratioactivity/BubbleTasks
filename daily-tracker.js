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
  const ACTIVITY_PRESETS=["Stayed Home","Worked","On Vacation","Procedure","Doctor's Appointment","Dentist Appointment","Hair Appointment","Therapy Appointment","Family Gathering","Friend Gathering","Went Out with Jacob","Went Out with Parents","Went to See Parents","Saw a Movie","Went on a Hike","Played with the Dogs","Ran Errands","Grocery Shopping","Tea Shopping","Antique Shopping","Clothes Shopping","Drug Shopping","Did Chores","Worked on Writing","3D Printed","Made Art","Cooked at Home","Got Takeout","Ordered Delivery","Ate Out","Smoked","Drank Alcohol"];
  const PAIN_COLORS=['#fffafa','#fcecef','#f8d6e0','#f2baca','#e99db3','#df7e99','#d9627d','#ce4c64','#c8394e','#b82438'];
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
    let refreshMusicDetails=()=>{};
    let musicLibraryMessage='';
    function save(change,form){
      const before=tracker;tracker=M.normalize(tracker);
      const d=tracker.days[selected]||M.emptyDay();change(d,tracker);
      d.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;d.revision=identifier();d.updatedAt=new Date().toISOString();tracker.days[selected]=M.day(d);
      try{localStorage.setItem(SAVE,JSON.stringify({...read(),dailyTracker:tracker}));}
      catch{tracker=before;message('Could not save. Free some browser storage and try again.');return false;}
      if(form)dirtyForms.delete(form);message('Saved on this device');refreshMusicDetails();return true;
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
    function tagEntry(label,known,add,clear=true,chooseSuggestion=false){
      const box=el('div','day-tag-entry'),row=el('div','day-inline'),value=input('text','',label);value.placeholder=label;value.autocomplete='off';value.maxLength=100;
      const suggestion=btn('',()=>{if(chooseSuggestion){add(suggested);value.value='';update();value.focus();return;}value.value=suggested;value.dispatchEvent(new Event('input',{bubbles:true}));update();value.focus();},'day-suggestion');suggestion.hidden=true;
      let suggested='';
      function update(){const p=value.value.trim().replace(/^#/,'').toLowerCase();suggested=p?known().find(t=>t.toLowerCase().startsWith(p)&&t.toLowerCase()!==p)||'':'';suggestion.hidden=!suggested;suggestion.textContent=suggested?(chooseSuggestion?'Add '+suggested:'Complete '+suggested+' ↹'):'';}
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
    function reproductiveEntry(kind,entry){
      openDialog((entry?'Edit ':'Log ')+(kind==='sex'?'sex':'self-pleasure'),(form,error)=>{
        const time=input('datetime-local',entry?local(entry.time):nowTime(),'Entry time');time.required=true;
        const area=(value,label)=>{const n=el('textarea');n.rows=3;n.maxLength=2000;n.value=value||'';form.append(field(label,n));return n;};
        form.append(field('When',time));
        const preparation=area(entry?.preparation,'Precautions / preparation'),aftercare=area(entry?.aftercare,'Aftercare');
        function choice(label,initial,level,labelLevel){
          const answer=el('select');answer.setAttribute('aria-label',label);
          [['','Not recorded'],['no','No'],['yes','Yes']].forEach(([v,l])=>answer.add(new Option(l,v)));
          answer.value=initial===true?'yes':initial===false?'no':'';
          const score=input('number',level??'',labelLevel);score.min='1';score.max='10';score.step='1';
          const wrap=field(labelLevel,score);
          const update=()=>{wrap.hidden=answer.value!=='yes';score.disabled=answer.value!=='yes';score.required=answer.value==='yes';};
          answer.addEventListener('change',update);update();form.append(field(label,answer),wrap);
          return {answer,score};
        }
        const pain=choice('Pain?',entry?.pain,entry?.painLevel,'Pain level (1–10; 10 = highest pain)');
        const orgasm=choice('Orgasm?',entry?.orgasm,entry?.pleasureLevel,'Pleasure level (1–10; 10 = highest pleasure)');
        const note=area(entry?.note,'Notes');
        return {submit:()=>{
          if(!M.localTime(time.value)||time.value.slice(0,10)!==selected){error.textContent='Use a time on the selected day.';return false;}
          for(const pair of [pain,orgasm])if(pair.answer.value==='yes'&&M.rating(Number(pair.score.value))===null){error.textContent='Choose a whole-number level from 1 to 10.';return false;}
          const value={id:entry?.id||identifier(),time:new Date(time.value).toISOString(),kind,preparation:preparation.value,aftercare:aftercare.value,
            pain:pain.answer.value===''?null:pain.answer.value==='yes',painLevel:pain.answer.value==='yes'?Number(pain.score.value):null,
            orgasm:orgasm.answer.value===''?null:orgasm.answer.value==='yes',pleasureLevel:orgasm.answer.value==='yes'?Number(orgasm.score.value):null,note:note.value};
          return save(day=>day.reproduction=entry?day.reproduction.map(e=>e.id===entry.id?value:e):[...day.reproduction,value]);
        },remove:entry?()=>save(day=>day.reproduction=day.reproduction.filter(e=>e.id!==entry.id)):null};
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
      openDialog(type==='meals'?'Meal':'What did you learn today?',(form,error)=>{
        const time=input('datetime-local',entry?local(entry.time):nowTime());time.required=true;
        const text=el('textarea');text.rows=4;text.required=true;text.maxLength=4000;text.value=entry?.text||'';
        const label=el('select');label.setAttribute('aria-label','Meal');['','Breakfast','Lunch','Dinner','Snack','Other'].forEach(v=>label.add(new Option(v||'No meal label',v)));label.value=entry?.label||'';
        form.append(field('When',time));if(type==='meals')form.append(field('Meal',label));form.append(field(type==='meals'?'What did you eat?':'What did you learn?',text));
        return {submit:()=>{if(!M.localTime(time.value)||time.value.slice(0,10)!==selected){error.textContent='Use a time on the selected day.';return false;}return save(d=>{const value={id:entry?.id||identifier(),time:new Date(time.value).toISOString(),text:text.value,...(type==='meals'?{label:label.value}:{})};d[type]=entry?d[type].map(e=>e.id===entry.id?value:e):[...d[type],value];});},remove:entry?()=>save(d=>d[type]=d[type].filter(e=>e.id!==entry.id)):null};
      });
    }
    function known(type){
      if(type==='symptoms')return tracker.symptoms.map(s=>s.name);
      return M.tags([...(type==='activities'?ACTIVITY_PRESETS:type==='artists'?tracker.artists.map(a=>a.name):type==='genres'?tracker.artists.flatMap(a=>a.genres):[]),...Object.values(tracker.days).flatMap(d=>type==='artists'?d.music.artists:type==='genres'?M.genres(d,tracker):type==='activities'?d.activities:d[type].map(e=>e.name))]);
    }
    let loadingArtists=false;
    async function loadArtistLibrary(button){
      const cloud=window.BubbleTasksCloud,user=cloud?.getUserId();if(!user){message('Sign in to BubbleTasks to load your Notion artists.');return;}
      if(loadingArtists)return;loadingArtists=true;musicLibraryMessage='';button.disabled=true;refreshMusicDetails();message('Loading artist library from Notion…');
      const epoch=uploadEpoch;
      try{
        const token=await cloud.getAccessToken();if(epoch!==uploadEpoch||cloud.getUserId()!==user)return;
        const response=await fetch('https://ejrnkaigdstalaypyhhp.supabase.co/functions/v1/daily-tracker-sync',{method:'POST',signal:AbortSignal.timeout(60000),headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_Qe_bJpZQLlm-CGoPnmhqFQ_aOxXtGhN','Content-Type':'application/json'},body:JSON.stringify({action:'artists'})});
        const result=await response.json().catch(()=>({}));if(epoch!==uploadEpoch||cloud.getUserId()!==user)return;
        if(!response.ok||!Array.isArray(result.artists))throw Error(result.error||'Redeploy the updated daily-tracker-sync function to load your artist library.');
        const before=tracker,next=M.normalize(tracker);next.artists=M.mergeArtistLibrary(next.artists,result.artists);
        for(const [date,day] of Object.entries(next.days)){
          if(day.music.genres!==null)continue;
          const oldGenres=M.genres(day,tracker),newGenres=M.genres(day,next);
          if(JSON.stringify(oldGenres)!==JSON.stringify(newGenres)){day.revision=identifier();day.updatedAt=new Date().toISOString();}
        }
        tracker=next;try{localStorage.setItem(SAVE,JSON.stringify({...read(),dailyTracker:tracker}));}catch(error){tracker=before;throw error;}
        musicLibraryMessage=result.artists.length+' artists loaded from Notion';message(musicLibraryMessage);refreshMusicDetails();
        if(!dirtyForms.size)render();
      }catch(error){if(epoch===uploadEpoch){musicLibraryMessage=error.message||'Could not refresh artists. Please try again.';message(musicLibraryMessage);}}
      finally{loadingArtists=false;if(button.isConnected)button.disabled=false;refreshMusicDetails();}
    }
    function artistGenres(name){
      openDialog(name+' · default genres',form=>{
        let values=[...(tracker.artists.find(a=>a.name.toLowerCase()===name.toLowerCase())?.genres||[])];
        const chips=el('div','day-tags');const redraw=()=>{chips.replaceChildren();values.forEach(v=>chips.append(btn(v+' ×',()=>{values=values.filter(t=>t!==v);redraw();dialogDirty=true;},'day-tag')));};
        const tag=tagEntry('Genre',()=>known('genres'),v=>{values=M.tags([...values,v]);redraw();dialogDirty=true;});redraw();form.append(chips,tag.box);
        return {submit:()=>{if(tag.value.value.trim())values=M.tags([...values,tag.value.value]);return save((d,t)=>{const a=t.artists.find(a=>a.name.toLowerCase()===name.toLowerCase());if(a){a.genres=values;a.genresUpdatedAt=new Date().toISOString();}else t.artists.push({name,genres:values,genresUpdatedAt:new Date().toISOString()});for(const [key,oldDay] of Object.entries(t.days)){if(key!==selected&&oldDay.music.genres===null&&oldDay.music.artists.some(v=>v.toLowerCase()===name.toLowerCase())){oldDay.revision=identifier();oldDay.updatedAt=new Date().toISOString();}}});}};
      });
    }
    function navigate(date){if(!M.validDate(date)||!confirmLeave())return;selected=date;dirtyForms.clear();sessionStorage.setItem(DATE,date);render();}
    function summaryContent(d){
      const body=el('div','day-summary-body'),intro=el('header','day-summary-intro');
      intro.append(el('h3','',d.music.title||'Daily Overview'),el('p','',new Date(selected+'T12:00:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})));body.append(intro);
      const stats=el('div','day-summary-stats');
      for(const [label,value] of [['Sleep',M.sleepHours(d)===null?null:M.sleepHours(d).toFixed(1)+' hours'],['Average Mood',M.mean(d.mood)===null?null:M.mean(d.mood).toFixed(1)+' / 10'],['Average Pain',M.mean(d.pain)===null?null:M.mean(d.pain).toFixed(1)+' / 10'],['Peak Pain',d.pain.length?Math.max(...d.pain.map(e=>e.rating))+' / 10':null]]){
        if(value===null)continue;const stat=el('div','day-summary-stat');stat.append(el('span','',label),el('strong','',value));stats.append(stat);
      }
      if(stats.children.length)body.append(stats);
      function section(title){const box=el('section','day-summary-section');box.append(el('h3','',title));body.append(box);return box;}
      function pairs(box,items){const dl=el('dl','day-summary-facts');items.forEach(([label,value])=>{if(value===null||value===undefined||value==='')return;dl.append(el('dt','',label),el('dd','',String(value)));});if(dl.children.length)box.append(dl);}
      function entry(box,label,note){const item=el('div','day-summary-item');item.append(el('strong','',label));if(note)item.append(el('p','',note));box.append(item);}
      if(d.music.artists.length||M.genres(d,tracker).length){const box=section('Song of the Day');pairs(box,[['Artists',d.music.artists.join(', ')],['Genres',M.genres(d,tracker).join(', ')]]);}
      for(const type of ['mood','pain'])if(d[type].length){const box=section(type==='mood'?'Mood Readings':'Pain Readings');for(const e of d[type])entry(box,clock(e.time)+' · '+e.rating+'/10',e.note);}
      if(d.sleep.bed||d.sleep.wake){const box=section('Sleep');const dateTime=value=>value?new Date(value).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):null;pairs(box,[['Went to Sleep',dateTime(d.sleep.bed)],['Woke Up',dateTime(d.sleep.wake)]]);}
      if(d.cycle.menstruating!==null||d.cycle.note||d.reproduction.length){
        const box=section('Reproductive Health');pairs(box,[['Menstruating',d.cycle.menstruating===null?null:d.cycle.menstruating?'Yes':'No'],['Flow',d.cycle.menstruating===true?d.cycle.flow:null],['Cycle Notes',d.cycle.note]]);
        for(const e of d.reproduction){const details=el('details','day-summary-private');details.append(el('summary','',(e.kind==='sex'?'👉👌':'❤️‍🔥')+' · '+clock(e.time)));pairs(details,[['Preparation',e.preparation],['Aftercare',e.aftercare],['Pain',e.pain===null?null:e.pain?'Yes · '+(e.painLevel??'—')+'/10':'No'],['Orgasm',e.orgasm===null?null:e.orgasm?'Yes · '+(e.pleasureLevel??'—')+'/10 pleasure':'No'],['Notes',e.note]]);box.append(details);}
      }
      if(d.symptoms.length){const box=section('Symptoms');for(const e of d.symptoms)entry(box,clock(e.time)+' · '+e.name+(e.rating?' · '+e.rating+'/10':''),e.area+(e.note?'\n'+e.note:''));}
      if(d.meals.length){const box=section('Meals');for(const e of d.meals)entry(box,clock(e.time)+(e.label?' · '+e.label:''),e.text);}
      if(d.activities.length){const box=section('Activities'),tags=el('div','day-tags');d.activities.forEach(v=>tags.append(el('span','day-summary-tag',v)));box.append(tags);}
      if(d.watching.length){const box=section('Watching');d.watching.forEach(e=>entry(box,e.name,e.note));}
      if(d.learned.length){const box=section('Learned Today');d.learned.forEach(e=>entry(box,clock(e.time),e.text));}
      if(d.focus.length){const box=section('Hyperfixations');for(const e of d.focus)entry(box,e.name,[e.onMind?'On my mind':'',e.worked?'Worked on':'',e.note].filter(Boolean).join('\n'));}
      if(d.notes){const box=section('Anything Else?');box.append(el('p','day-summary-note',d.notes));}
      if(body.children.length===1)body.append(el('p','day-help','Save something in a widget above to build your daily summary.'));
      return body;
    }
    function render(){
      if(!showing||dirtyForms.size)return;const scrollTop=window.scrollY,scrollLeft=window.scrollX,musicOptionsOpen=view.querySelector('.day-music-options')?.open===true,quickActivitiesOpen=view.querySelector('.day-activity-presets')?.open===true;dirtyForms.clear();view.replaceChildren();const d=current();
      const top=el('header','day-heading');top.style.setProperty('--day-mood',M.moodColor(d));
      const heading=el('div');heading.append(el('h2','',d.music.title||'Today’s Daybook'),el('p','',new Date(selected+'T12:00:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})));
      const nav=el('div','day-actions'),pick=input('date',selected,'Choose log date');pick.addEventListener('change',()=>navigate(pick.value));
      const move=n=>{const date=new Date(selected+'T12:00:00');date.setDate(date.getDate()+n);navigate(M.dateKey(date));};
      nav.append(btn('‹',()=>move(-1)),btn('Today',()=>navigate(M.dateKey(new Date()))),btn('›',()=>move(1)),pick);top.append(heading,nav);view.append(top,feedback);
      const agenda=widget('Tasks & Events','Your scheduled events and due tasks.');
      const data=read();
      const due=[...(data.tasks||[]),...(data.archived||[])].filter(t=>t.dueDate===selected);
      const events=(data.calendarEvents||[]).filter(e=>e.date===selected).map(e=>(e.allDay?'All day':e.startTime||'')+' · '+e.title);
      const uid=window.BubbleTasksCloud?.getUserId();
      for(const e of data.googleEventImports||[]){if(e.userId!==uid)continue;const start=e.start?.date,end=e.end?.date,dayStart=new Date(selected+'T00:00:00'),dayEnd=new Date(selected+'T00:00:00');dayEnd.setDate(dayEnd.getDate()+1);const from=new Date(e.start?.dateTime),until=new Date(e.end?.dateTime);if(start&&end?selected>=start&&selected<end:from<dayEnd&&until>dayStart)events.push((start?'All day':from<dayStart?'Continues':clock(e.start.dateTime))+' · '+e.title);}
      for(const line of [...events,...due.map(t=>t.title+' · '+t.status)])agenda.append(el('p','day-schedule-line',line));
      if(!events.length&&!due.length)agenda.append(el('p','day-help','Nothing scheduled for this date.'));
      view.append(agenda);const grid=el('div','day-grid');view.append(grid);
      const music=widget('Song of the Day','Choose an artist to fill in their saved genres.');
      const song=input('text',d.music.title,'Song title');song.maxLength=200;
      const sf=formFor(music,()=>save(day=>day.music.title=song.value.trim(),sf.form));sf.form.append(field('Song title',song),sf.submit);
      const artistRows=el('div','day-music-artists');
      const artistEntry=tagEntry('Add artist',()=>known('artists'),name=>{
        save((day,t)=>{const existing=t.artists.find(a=>a.name.toLowerCase()===name.toLowerCase());const canonical=existing?.name||name;day.music.artists=M.tags([...day.music.artists,canonical]);if(!existing)t.artists.push({name:canonical,genres:[]});});
      },true,true);
      artistEntry.box.querySelector('small').textContent='Choose a suggestion or press Enter to add.';
      const songGenres=el('div','day-music-genres'),genreLabel=el('p','day-help'),genreValues=el('div','day-tags');songGenres.append(genreLabel,genreValues);
      const options=el('details','day-music-options');options.open=musicOptionsOpen;options.append(el('summary','','More Music Options'));
      const optionsBody=el('div','day-music-options-body');
      optionsBody.append(el('p','day-help','Genres normally come from the selected artists. Customize them below only if this song is different.'));
      const genreChips=el('div','day-tags');
      const genreEntry=tagEntry('Song-specific genre',()=>known('genres'),name=>save(day=>day.music.genres=M.tags([...M.genres(day,tracker),name])));
      const defaults=btn('Use artist genres',()=>save(day=>day.music.genres=null));
      const libraryStatus=el('p','day-help');libraryStatus.setAttribute('role','status');
      const loadArtists=btn('Refresh Artists from Notion',()=>loadArtistLibrary(loadArtists));
      optionsBody.append(genreChips,genreEntry.box,defaults,libraryStatus,loadArtists);options.append(optionsBody);
      music.append(artistRows,artistEntry.box,songGenres,options);grid.append(music);
      refreshMusicDetails=()=>{
        if(!showing||!music.isConnected)return;
        const value=current();artistRows.replaceChildren();
        for(const name of value.music.artists){
          const row=el('div','day-music-artist'),top=el('div','day-music-artist-top');top.append(el('strong','',name));
          const edit=btn('Edit genres',()=>artistGenres(name),'day-music-edit');edit.setAttribute('aria-label','Edit genres for '+name);
          const remove=btn('×',()=>save(day=>day.music.artists=day.music.artists.filter(v=>v.toLowerCase()!==name.toLowerCase())),'day-music-remove');remove.setAttribute('aria-label','Remove artist '+name);
          top.append(edit,remove);row.append(top);
          const genres=tracker.artists.find(a=>a.name.toLowerCase()===name.toLowerCase())?.genres||[];
          const tags=el('div','day-tags');genres.forEach(g=>tags.append(el('span','day-music-genre',g)));
          if(!genres.length)tags.append(el('span','day-help','No genres saved yet'));row.append(tags);artistRows.append(row);
        }
        const effective=M.genres(value,tracker);songGenres.hidden=value.music.genres===null;genreLabel.textContent='Custom genres for this song';genreValues.replaceChildren();effective.forEach(g=>genreValues.append(el('span','day-music-genre',g)));
        genreChips.replaceChildren();if(value.music.genres!==null)value.music.genres.forEach(g=>genreChips.append(btn(g+' ×',()=>save(day=>day.music.genres=day.music.genres.filter(v=>v!==g)),'day-tag')));
        defaults.hidden=value.music.genres===null;loadArtists.disabled=loadingArtists;
        libraryStatus.textContent=musicLibraryMessage||(loadingArtists?'Refreshing artist library…':tracker.artists.length+' artists in your library');
      };
      refreshMusicDetails();
      const sleep=widget('Sleep','Log the sleep that ended on this date. After-midnight bedtimes use the wake-up date; choose the previous date if you slept before midnight.');
      const bed=input('datetime-local',d.sleep.bed,'Bed time'),wake=input('datetime-local',d.sleep.wake,'Wake time');
      const sl=formFor(sleep,form=>{const trial={sleep:{bed:bed.value,wake:wake.value,bedAt:bed.value?new Date(bed.value).toISOString():'',wakeAt:wake.value?new Date(wake.value).toISOString():''}};if(wake.value&&wake.value.slice(0,10)!==selected){message('Wake time must be on this log date.');return false;}if(bed.value&&wake.value&&M.sleepHours(trial)===null){message('Wake time must follow bed time, within 48 hours.');return false;}return save(day=>day.sleep=trial.sleep,form);});
      sl.form.append(field('Went to sleep',bed),field('Woke up',wake),sl.submit);sleep.append(el('p','day-stat',M.sleepHours(d)===null?'Hours slept: not recorded':M.sleepHours(d).toFixed(1)+' hours slept'));grid.append(sleep);
      for(const type of ['mood','pain']){
        const w=widget(type==='mood'?'Mood':'Pain',type==='mood'?'1 = worst · 10 = best':'1 = least pain · 10 = most pain');
        w.classList.add('day-rating-widget');
        const avg=M.mean(d[type]);w.append(el('p','day-stat',avg===null?'Not recorded':'Average: '+avg.toFixed(1)+' / 10'+(type==='pain'?' · Peak: '+Math.max(...d.pain.map(e=>e.rating)):''))); 
        const ratings=el('div','day-rating-buttons');for(let n=1;n<=10;n++){const b=btn(String(n),()=>reading(type,null,n));b.setAttribute('aria-label','Log '+type+' '+n);b.style.backgroundColor=type==='mood'?M.COLORS[n-1]:PAIN_COLORS[n-1];if(type==='pain')b.style.color=n>=7?'#fff':'#443451';ratings.append(b);}w.append(ratings);
        d[type].forEach(e=>w.append(btn(clock(e.time)+' · '+e.rating+'/10'+(e.note?' · '+e.note:''),()=>reading(type,e),'day-entry')));grid.append(w);
      }
      const symptoms=widget('Symptoms','Type a symptom or create one. Each symptom remembers its body-area group.');
      const areaFilter=el('select');areaFilter.setAttribute('aria-label','Filter symptoms by body area');['All areas',...M.AREAS].forEach(a=>areaFilter.add(new Option(a,a)));const symptomRows=el('div');
      const showSymptoms=()=>{symptomRows.replaceChildren();d.symptoms.filter(e=>areaFilter.value==='All areas'||e.area===areaFilter.value).forEach(e=>symptomRows.append(btn(clock(e.time)+' · '+e.name+' · '+e.area+(e.rating?' · '+e.rating+'/10':''),()=>reading('symptoms',e),'day-entry')));};areaFilter.addEventListener('change',showSymptoms);showSymptoms();
      symptoms.append(btn('+ Log symptom',()=>reading('symptoms')),areaFilter,symptomRows);grid.append(symptoms);
      const cycle=widget('Reproductive Health');
      const yes=el('select');yes.setAttribute('aria-label','Menstruating?');[['','Not recorded'],['no','No'],['yes','Yes']].forEach(([v,l])=>yes.add(new Option(l,v)));yes.value=d.cycle.menstruating===null?'':d.cycle.menstruating?'yes':'no';
      const flow=el('select');flow.setAttribute('aria-label','Flow');['','Spotting','Light','Medium','Heavy'].forEach(v=>flow.add(new Option(v||'Choose flow',v)));flow.value=d.cycle.flow;
      const flowLabel=field('Flow',flow);flowLabel.hidden=yes.value!=='yes';yes.addEventListener('change',()=>flowLabel.hidden=yes.value!=='yes');
      const cycleNote=el('textarea');cycleNote.rows=3;cycleNote.maxLength=2000;cycleNote.value=d.cycle.note;
      const cf=formFor(cycle,form=>save(day=>day.cycle={menstruating:yes.value===''?null:yes.value==='yes',flow:yes.value==='yes'?flow.value:'',note:cycleNote.value},form));
      cf.form.append(field('Menstruating?',yes),flowLabel,field('Notes',cycleNote),cf.submit);
      cf.form.hidden=true;
      const reproductiveActions=el('div','day-reproductive-actions');
      const menstrualButton=btn('🩸',()=>{cf.form.hidden=!cf.form.hidden;menstrualButton.setAttribute('aria-expanded',String(!cf.form.hidden));});
      menstrualButton.setAttribute('aria-label','Menstrual cycle');menstrualButton.setAttribute('aria-expanded','false');
      const sexButton=btn('👉👌',()=>reproductiveEntry('sex'));sexButton.setAttribute('aria-label','Log sex');
      const selfButton=btn('❤️‍🔥',()=>reproductiveEntry('selfPleasure'));selfButton.setAttribute('aria-label','Log self-pleasure');
      reproductiveActions.append(menstrualButton,sexButton,selfButton);cycle.querySelector('h3').after(reproductiveActions);
      for(const entry of d.reproduction){const entryButton=btn((entry.kind==='sex'?'👉👌':'❤️‍🔥')+' · '+clock(entry.time),()=>reproductiveEntry(entry.kind,entry),'day-entry');entryButton.setAttribute('aria-label','Edit '+(entry.kind==='sex'?'sex':'self-pleasure')+' entry at '+clock(entry.time));cycle.append(entryButton);}
      grid.append(cycle);
      const activities=widget('What did you do today?');const activityChips=el('div','day-tags');d.activities.forEach(name=>activityChips.append(btn(name+' ×',()=>{if(save(day=>day.activities=day.activities.filter(v=>v!==name)))render();},'day-tag')));activities.append(activityChips,tagEntry('Add activity',()=>known('activities'),name=>{if(save(day=>day.activities=M.tags([...day.activities,name])))render();}).box);const presets=el('details','day-activity-presets');presets.open=quickActivitiesOpen;presets.append(el('summary','','Quick Activities'));
      const presetButtons=el('div','day-tags');ACTIVITY_PRESETS.forEach(name=>{const selected=d.activities.some(v=>v.toLowerCase()===name.toLowerCase());const b=btn(name,()=>{if(save(day=>day.activities=selected?day.activities.filter(v=>v.toLowerCase()!==name.toLowerCase()):M.tags([...day.activities,name])))render();},'day-tag');b.setAttribute('aria-pressed',String(selected));presetButtons.append(b);});presets.append(presetButtons);activities.append(presets);grid.append(activities);
      for(const type of ['focus','watching']){
        const box=widget(type==='focus'?'Hyperfixations':'What are you watching?',type==='focus'?'“On my mind” and “Worked on” can both be true. Each interest has its own progress note.':null);
        box.append(tagEntry(type==='focus'?'Story, game, or interest':'Show or movie',()=>M.tags([...known(type),...(type==='focus'?['BOTA','APEX','Parallel','Black & Blue','Wild Sky','Mask','Teeth','Ruse','Horizon Line','Sleeper','Coup','Kaleidoscope']:[])]),name=>focusEntry(type,null,name)).box);
        d[type].forEach(e=>{const row=el('div','day-interest');row.append(btn(e.name+(type==='focus'?' · '+[e.onMind?'On my mind':'',e.worked?'Worked on':''].filter(Boolean).join(' / '):''),()=>focusEntry(type,e),'day-entry'));if(e.note)row.append(el('p','',e.note));if(type==='focus')row.append(btn('History',()=>history(e.name),'day-history'));box.append(row);});grid.append(box);
      }
      for(const type of ['meals','learned']){const box=widget(type==='meals'?'Meals':'What did you learn today?');box.append(btn('+ Add entry',()=>noteEntry(type)));d[type].forEach(e=>box.append(btn(clock(e.time)+' · '+(e.label?e.label+' · ':'')+e.text,()=>noteEntry(type,e),'day-entry')));grid.append(box);}
      const noteBox=widget('Anything else?');const note=el('textarea');note.rows=5;note.maxLength=10000;note.value=d.notes;
      const nf=formFor(noteBox,form=>save(day=>day.notes=note.value,form));nf.form.append(field('Daily notes',note),nf.submit);grid.append(noteBox);
      const widgetOrder=["Song of the Day","Mood","Pain","Sleep","Reproductive Health","Symptoms","Meals","What did you do today?","What are you watching?","What did you learn today?","Hyperfixations","Anything else?"];
      [...grid.children].sort((a,b)=>widgetOrder.indexOf(a.querySelector('h3').textContent)-widgetOrder.indexOf(b.querySelector('h3').textContent)).forEach(card=>grid.append(card));
      const summary=el('details','day-summary'),summaryTitle=el('summary','','Daily Summary'),content=summaryContent(d);summary.append(summaryTitle,content,btn('Download summary',()=>download(M.summary(selected,current(),tracker,stamp),'bubbletasks-'+selected+'.txt','text/plain')));view.append(summary);
      const sync=widget('Notion Uploads','Uploads update the same page for this date. Your token stays in the backend.');
      const status=el('p');status.dataset.daySyncStatus='';status.setAttribute('role','status');
      const enabled=input('checkbox');enabled.checked=isEnabled();enabled.addEventListener('change',()=>{const user=window.BubbleTasksCloud?.getUserId();if(!user){enabled.checked=false;message('Sign in to BubbleTasks first.');return;}localStorage.setItem('bubbletasks_notion_auto_v1:'+user,String(enabled.checked));paintSync();if(enabled.checked)syncPending();});
      sync.append(field('Automatically upload saved days to Notion',enabled),status,btn('Upload this date now',()=>syncDate(selected,true)));
      if(!window.BubbleTasksCloud?.getUserId())sync.append(el('p','day-help','Sign in using the online-sync panel to enable uploads.'));
      view.append(sync);paintSync();apply();
      window.scrollTo({top:scrollTop,left:scrollLeft,behavior:'instant'});
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





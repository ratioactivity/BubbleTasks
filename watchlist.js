/* An ordered queue plus a private watched-title library, stored in the shared account save. */
(() => {
  const SAVE='bubbletasks_plain_v1',VIEW='bubbletasks_watchlist_view_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  const key=s=>String(s).trim().toLocaleLowerCase(),text=(s,max=500)=>typeof s==='string'?s.slice(0,max):'';
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(new Date(s+'T12:00:00'))===s;
  const rating=n=>Number.isInteger(n)&&n>=0&&n<=100?n:null;
  const normalize=value=>{
    const ids=new Set(),titles=(Array.isArray(value?.titles)?value.titles:[]).filter(e=>e&&typeof e.id==='string'&&!ids.has(e.id)&&ids.add(e.id)&&typeof e.name==='string'&&e.name.trim()&&['movie','series'].includes(e.type)).map(e=>{
      const seen=new Set(),viewings=(Array.isArray(e.viewings)?e.viewings:[]).filter(v=>v&&typeof v.id==='string'&&!seen.has(v.id)&&seen.add(v.id)&&validDate(v.date)).map(v=>({id:v.id,date:v.date,note:text(v.note,5000),queueNotes:text(v.queueNotes,5000),seasons:text(v.seasons,100),rating:rating(v.rating),rewatch:v.rewatch===true}));
      return {id:e.id,name:e.name.trim().slice(0,500),type:e.type,seasons:e.type==='series'?text(e.seasons,100):'',rating:rating(e.rating),viewings};
    });
    const queued=new Set(),queue=(Array.isArray(value?.queue)?value.queue:[]).filter(e=>e&&typeof e.id==='string'&&!queued.has(e.id)&&queued.add(e.id)&&titles.some(t=>t.id===e.titleId)).map(e=>({id:e.id,titleId:e.titleId,seasons:text(e.seasons,100),notes:text(e.notes,5000),rewatch:e.rewatch===true,shelved:e.shelved===true,shelfNote:text(e.shelfNote,5000)}));
    return {version:1,titles:titles.filter(t=>t.viewings.length||queue.some(e=>e.titleId===t.id)),queue};
  };
  let data=normalize(read().watchlist),active=false,view,board,taskForm,status,editor,history,section='queue',search='',editorSignature=()=>'',originalSignature='',dragged=null;
  const previousSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===SAVE){const save=JSON.parse(v);save.watchlist=data;v=JSON.stringify(save);}return previousSet.call(this,k,v);};
  const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;};
  const button=(label,action,cls='')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',action);return b;};
  const field=(label,input)=>{const wrap=el('label','watch-field',label);input.setAttribute('aria-label',label);wrap.append(input);return wrap;};
  const input=(type,value='')=>{const n=el('input');n.type=type;n.value=value;return n;};
  const image=(path)=>{const n=el('img');n.src=path;n.alt='';return n;};
  const icon=(label,path,action,cls='')=>{const b=button('',action,'watch-icon '+cls);b.setAttribute('aria-label',label);b.title=label;b.append(image(path));return b;};
  const find=id=>data.titles.find(t=>t.id===id);
  const latest=t=>t.viewings.map(v=>v.date).sort().at(-1);
  const dateLabel=s=>new Date(s+'T12:00:00').toLocaleDateString([],{year:'numeric',month:'short',day:'numeric'});
  const kind=(t,seasons=t.seasons)=>t.type==='movie'?'Movie':'Series'+(seasons?' · Seasons '+seasons:'');
  function save(next){const before=data;data=normalize(next);try{localStorage.setItem(SAVE,JSON.stringify({...read(),watchlist:data}));return true;}catch{data=before;if(status)status.textContent='Could not save this change. Free some browser storage and try again.';return false;}}
  window.BubbleTasksWatchlist={
    isActive:()=>active,
    show(){active=true;view.hidden=false;board.hidden=true;taskForm.hidden=true;localStorage.setItem(VIEW,'true');render();},
    hide(){if(!active)return true;if(editor.open||history.open)return false;active=false;view.hidden=true;board.hidden=false;taskForm.hidden=false;localStorage.setItem(VIEW,'false');return true;}
  };
  window.addEventListener('bubbletasks-backup-import',event=>{if(event.detail?.watchlist!==undefined){data=normalize(event.detail.watchlist);if(active)render();}});
  function closeEditor(){if(editorSignature()!==originalSignature&&!confirm('Discard these unsaved changes?'))return;editor.close();}
  function formDialog(heading){editor.replaceChildren();const form=el('form','watch-form');form.append(el('h2','',heading));const error=el('p','watch-error');error.setAttribute('role','alert');const actions=el('div','watch-actions'),submit=el('button','watch-primary','Save');submit.type='submit';actions.append(button('Cancel',closeEditor),submit);editor.append(form);return {form,error,actions,submit};}
  function ready(form,error,actions){form.append(error,actions);editorSignature=()=>JSON.stringify([...new FormData(form).entries()]);originalSignature=editorSignature();editor.showModal();}
  function metadata(t,container){if(t.rating!==null)container.append(el('span','watch-score',t.rating+' / 100'));if(t.viewings.length)container.append(el('span','','Last finished: '+dateLabel(latest(t))));if(t.viewings.length>1)container.append(el('span','','Watched '+t.viewings.length+' times'));}
  function noteButton(t){const count=t.viewings.filter(v=>v.note.trim()||v.queueNotes.trim()).length;return count?icon('View viewing notes for '+t.name,'assets/pencil.png',()=>showHistory(t.id),'watch-note-indicator'):null;}
  function addOrEdit(entry=null,preset=null){
    const original=entry?find(entry.titleId):preset,{form,error,actions,submit}=formDialog(entry?'Edit queued title':'Add to Watchlist');submit.textContent=entry?'Save changes':'Add to queue';
    const name=input('text',original?.name||'');name.name='name';name.required=true;name.maxLength=500;name.autocomplete='off';name.placeholder='Movie or series name';
    const type=el('select');type.name='type';for(const [value,label]of [['movie','Movie'],['series','Series']]){const option=el('option','',label);option.value=value;type.append(option);}type.value=original?.type||'movie';
    const seasons=input('text',entry?.seasons??original?.seasons??'');seasons.name='seasons';seasons.maxLength=100;seasons.placeholder='e.g. 1, 2–3, or all';const seasonField=field('Season(s)',seasons);seasonField.hidden=type.value!=='series';
    const notes=el('textarea');notes.name='notes';notes.rows=3;notes.maxLength=5000;notes.value=entry?.notes||'';
    const modes=el('fieldset','watch-modes');modes.append(el('legend','','Viewing'));const newMode=input('radio','new'),rewatch=input('radio','rewatch');newMode.name=rewatch.name='mode';newMode.checked=!(entry?.rewatch??!!preset);rewatch.checked=!newMode.checked;const nl=field('New',newMode),rl=field('Rewatch',rewatch);nl.prepend(el('span','watch-star','★'));rl.prepend(image('assets/reload.png'));modes.append(nl,rl);
    const wrap=el('div','watch-name-wrap'),suggestions=el('div','watch-suggestions'),preview=el('div','watch-preview');suggestions.id='watchTitleSuggestions';suggestions.setAttribute('role','listbox');suggestions.hidden=true;
    name.setAttribute('role','combobox');name.setAttribute('aria-autocomplete','list');name.setAttribute('aria-controls',suggestions.id);name.setAttribute('aria-expanded','false');wrap.append(field('Name',name),suggestions);
    let selectedId=original?.id||null,matches=[],index=0,modeTouched=false;
    modes.addEventListener('change',()=>modeTouched=true);
    const hideSuggestions=()=>{suggestions.hidden=true;name.setAttribute('aria-expanded','false');name.removeAttribute('aria-activedescendant');};
    function paintPreview(){preview.replaceChildren();const t=find(selectedId);if(!t?.viewings.length)return;metadata(t,preview);const note=noteButton(t);if(note)preview.append(note);}
    function choose(t){selectedId=t.id;name.value=t.name;type.value=t.type;seasonField.hidden=t.type!=='series';seasons.value=t.seasons;newMode.checked=false;rewatch.checked=true;modeTouched=false;hideSuggestions();paintPreview();name.focus();}
    function suggest(){if(name.value!==find(selectedId)?.name)selectedId=null;paintPreview();const q=key(name.value);matches=q?data.titles.filter(t=>t.viewings.length&&key(t.name).includes(q)).slice(0,8):[];index=0;suggestions.replaceChildren();
      matches.forEach((t,i)=>{const b=button(t.name+' · '+kind(t)+(t.rating!==null?' · '+t.rating+'/100':''),()=>choose(t));b.id='watchSuggestion-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===index));b.addEventListener('mousedown',e=>e.preventDefault());suggestions.append(b);});
      suggestions.hidden=!matches.length;name.setAttribute('aria-expanded',String(!!matches.length));if(matches.length)name.setAttribute('aria-activedescendant','watchSuggestion-0');else name.removeAttribute('aria-activedescendant');
    }
    name.addEventListener('input',suggest);name.addEventListener('keydown',e=>{if(suggestions.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hideSuggestions();return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();index=(index+(e.key==='ArrowDown'?1:matches.length-1))%matches.length;[...suggestions.children].forEach((b,i)=>b.setAttribute('aria-selected',String(i===index)));name.setAttribute('aria-activedescendant','watchSuggestion-'+index);}if(e.key==='Enter'||e.key==='Tab'){if(e.key==='Enter')e.preventDefault();choose(matches[index]);}});
    type.addEventListener('change',()=>{seasonField.hidden=type.value!=='series';if(find(selectedId)?.type!==type.value)selectedId=null;paintPreview();});
    form.addEventListener('click',e=>{if(!wrap.contains(e.target))hideSuggestions();});form.append(wrap,field('Movie or series',type),seasonField,modes,field('Additional notes',notes),preview);paintPreview();
    form.addEventListener('submit',e=>{e.preventDefault();if(!name.value.trim())return;let t=data.titles.find(t=>t.id===selectedId&&key(t.name)===key(name.value)&&t.type===type.value)||data.titles.find(t=>key(t.name)===key(name.value)&&t.type===type.value);
      if(!t)t={id:crypto.randomUUID(),name:name.value.trim(),type:type.value,seasons:type.value==='series'?seasons.value.trim():'',rating:null,viewings:[]};
      const item={id:entry?.id||crypto.randomUUID(),titleId:t.id,seasons:type.value==='series'?seasons.value.trim():'',notes:notes.value.trim(),rewatch:(entry||modeTouched)?rewatch.checked:(rewatch.checked||t.viewings.length>0),shelved:entry?.shelved===true,shelfNote:entry?.shelfNote||''};
      const titles=data.titles.some(row=>row.id===t.id)?data.titles:[...data.titles,t],queue=entry?data.queue.map(row=>row.id===entry.id?item:row):[...data.queue,item];
      if(save({...data,titles,queue})){editor.close();section=entry?.shelved?'shelved':'queue';render();}else error.textContent='Could not save this title. Please try again.';
    });ready(form,error,actions);name.focus();
  }
  function shelve(entry){
    const t=find(entry.titleId),{form,error,actions,submit}=formDialog('Shelve · '+t.name),note=el('textarea');note.name='shelfNote';note.rows=4;note.maxLength=5000;note.value=entry.shelfNote||'';note.placeholder='e.g. Waiting until I have this streaming service';submit.textContent=entry.shelved?'Save shelf note':'Move to Shelved';form.append(el('p','','Keep this title for later without taking up a place in Up Next.'),field('Why can’t you watch it right now? (optional)',note));
    form.addEventListener('submit',e=>{e.preventDefault();if(save({...data,queue:data.queue.map(row=>row.id===entry.id?{...row,shelved:true,shelfNote:note.value.trim()}:row)})){editor.close();section='shelved';render();}else error.textContent='Could not shelve this title. Please try again.';});ready(form,error,actions);note.focus();
  }
  function renderShelved(){
    view.append(el('p','watch-help','Saved for later. Return a title to Up Next when you can watch it.'));const list=el('div','watch-library');view.append(list);
    for(const entry of data.queue.filter(e=>e.shelved)){
      const t=find(entry.titleId),row=el('article','watch-card watch-library-card'),content=el('div','watch-content'),facts=el('div','watch-facts');row.dataset.shelvedId=entry.id;content.append(el('h3','',t.name),el('p','watch-kind',kind(t,entry.seasons)));metadata(t,facts);content.append(facts);if(entry.notes)content.append(el('p','watch-note-text',entry.notes));content.append(el('strong','','Shelved reason'),el('p','watch-note-text',entry.shelfNote||'No reason added.'));
      const actions=el('div','watch-card-actions');actions.append(button('Back to Up Next',()=>{if(save({...data,queue:[...data.queue.filter(e=>e.id!==entry.id),{...entry,shelved:false}]})){section='queue';render();}},'watch-primary'),button('Edit shelf note',()=>shelve(entry)),icon('Edit shelved '+t.name,'assets/pencil.png',()=>addOrEdit(entry)),icon('Remove '+t.name+' from shelf','assets/delete.png',()=>{if(confirm('Remove “'+t.name+'” from Shelved? Its viewing history will stay.')&&save({...data,queue:data.queue.filter(e=>e.id!==entry.id)}))render();}));const note=noteButton(t);if(note)actions.append(note);row.append(content,actions);list.append(row);
    }
    if(!list.children.length)list.append(el('p','watch-empty','Nothing shelved yet. Use Shelve on a title in Up Next.'));
  }
  function finish(entry){
    const t=find(entry.titleId),{form,error,actions,submit}=formDialog('Finished watching · '+t.name);submit.textContent='Save viewing';form.append(el('p','',kind(t,entry.seasons)));
    const score=input('number');score.name='rating';score.min=0;score.max=100;score.step=1;score.required=!entry.rewatch;
    if(entry.rewatch){form.append(el('p','',t.rating===null?'Rewatch · rating is optional.':'Rewatch · previous rating: '+t.rating+'/100. No need to rate it again.'));const optional=el('details','watch-optional-rating');optional.append(el('summary','','Change rating (optional)'),field('Rating out of 100',score));form.append(optional);}else form.append(field('Rating out of 100',score));
    const date=input('date',dateKey(new Date()));date.name='date';date.required=true;const note=el('textarea');note.name='note';note.rows=4;note.maxLength=5000;note.placeholder='Content warnings, where you stopped, or anything to remember…';form.append(field('Finished on',date),field('Viewing note',note));
    form.addEventListener('submit',e=>{e.preventDefault();const value=score.value===''?null:Number(score.value);if((!entry.rewatch&&value===null)||(value!==null&&rating(value)===null)||!validDate(date.value)){error.textContent='Choose a valid date and a whole-number rating from 0 to 100.';return;}
      const viewing={id:crypto.randomUUID(),date:date.value,note:note.value.trim(),queueNotes:entry.notes,seasons:entry.seasons,rating:value,rewatch:entry.rewatch};
      if(save({...data,titles:data.titles.map(row=>row.id===t.id?{...row,rating:value===null?row.rating:value,seasons:entry.seasons,viewings:[...row.viewings,viewing]}:row),queue:data.queue.filter(row=>row.id!==entry.id)})){editor.close();render();}else error.textContent='Could not save this viewing. Your queued title is still here.';
    });ready(form,error,actions);(entry.rewatch?note:score).focus();
  }
  function editTitle(t){
    const {form,error,actions}=formDialog('Edit watched title'),name=input('text',t.name),seasons=input('text',t.seasons),score=input('number',t.rating===null?'':t.rating);name.name='name';name.required=true;name.maxLength=500;seasons.name='seasons';seasons.maxLength=100;score.name='rating';score.min=0;score.max=100;score.step=1;
    form.append(field('Name',name));if(t.type==='series')form.append(field('Season(s)',seasons));form.append(field('Rating out of 100',score));
    form.addEventListener('submit',e=>{e.preventDefault();const value=score.value===''?null:Number(score.value);if(!name.value.trim()||(value!==null&&rating(value)===null)){error.textContent='Use a title and a whole-number rating from 0 to 100.';return;}if(data.titles.some(row=>row.id!==t.id&&row.type===t.type&&key(row.name)===key(name.value))){error.textContent='Another title already has that name. Add a year or version to distinguish them.';return;}
      if(save({...data,titles:data.titles.map(row=>row.id===t.id?{...row,name:name.value.trim(),seasons:seasons.value.trim(),rating:value}:row)})){editor.close();render();}else error.textContent='Could not save. Please try again.';
    });ready(form,error,actions);name.focus();
  }
  function historyDirty(){return [...history.querySelectorAll('[data-original]')].some(n=>n.value!==n.dataset.original);}
  function closeHistory(){if(historyDirty()&&!confirm('Discard the unsaved viewing-note changes?'))return;history.close();}
  function showHistory(id){
    const t=find(id);if(!t)return;history.replaceChildren();const top=el('div','watch-history-heading');top.append(el('h2','',t.name+' · Viewing History'),button('Close',closeHistory));history.append(top);
    const facts=el('div','watch-facts');metadata(t,facts);history.append(facts);
    for(const v of [...t.viewings].reverse().sort((a,b)=>b.date.localeCompare(a.date))){
      const row=el('article','watch-viewing');row.append(el('h3','',dateLabel(v.date)+(v.rewatch?' · Rewatch':' · New watch')),el('small','',kind(t,v.seasons)+(v.rating===null?'':' · Rated '+v.rating+'/100')),el('p','watch-note-text',v.note||'No viewing note.'));
      if(v.queueNotes)row.append(el('small','', 'Queue note'),el('p','watch-note-text',v.queueNotes));
      row.append(button('Edit viewing note',()=>{row.querySelector('button').hidden=true;history.querySelectorAll('.watch-viewing > button').forEach(b=>b.disabled=true);const form=el('form','watch-form'),note=el('textarea'),date=input('date',v.date);note.name='note';note.value=v.note;note.maxLength=5000;note.rows=3;date.required=true;note.dataset.original=v.note;date.dataset.original=v.date;const error=el('p','watch-error');error.setAttribute('role','alert');const submit=el('button','watch-primary','Save note');submit.type='submit';form.append(field('Finished on',date),field('Viewing note',note),error,button('Cancel note edit',()=>showHistory(id)),submit);row.append(form);
        form.addEventListener('submit',e=>{e.preventDefault();if(!validDate(date.value))return;if(save({...data,titles:data.titles.map(title=>title.id===id?{...title,viewings:title.viewings.map(entry=>entry.id===v.id?{...entry,date:date.value,note:note.value.trim()}:entry)}:title)})){showHistory(id);render();}else error.textContent='Could not save the note. Please try again.';});note.focus();
      }));history.append(row);
    }
    if(!history.open)history.showModal();
  }
  function move(id,targetId,after=false){if(id===targetId)return;const moving=data.queue.find(e=>e.id===id);if(!moving)return;const queue=data.queue.filter(e=>e.id!==id),index=queue.findIndex(e=>e.id===targetId);if(index<0)return;queue.splice(index+(after?1:0),0,moving);if(save({...data,queue})){render();const row=[...view.querySelectorAll('[data-queue-id]')].find(n=>n.dataset.queueId===id);row?.querySelector('.watch-drag')?.focus({preventScroll:true});status.textContent=find(moving.titleId).name+' moved to position '+(data.queue.filter(e=>!e.shelved).findIndex(e=>e.id===id)+1)+'.';}}
  function render(){
    if(!active)return;view.replaceChildren();const top=el('header','watch-top'),heading=el('div');heading.append(el('h2','','Watchlist'),el('p','','Your next watch, with a little memory of the last one.'));top.append(heading,button('+ Add title',()=>addOrEdit(),'watch-primary'));view.append(top);
    const tabs=el('div','watch-tabs');for(const [key,label]of [['queue','Up Next'],['shelved','Shelved'],['watched','Watched']]){const b=button(label,()=>{section=key;render();});b.setAttribute('aria-pressed',String(key===section));tabs.append(b);}view.append(tabs);status=el('p','watch-status');status.setAttribute('role','status');view.append(status);
    if(section==='queue')renderQueue();else if(section==='shelved')renderShelved();else renderLibrary();
  }
  function renderQueue(){
    view.append(el('p','watch-help','Drag the grip to reorder, or use ↑ and ↓. The top title is what you’ll watch next.'));
    const list=el('ol','watch-queue');view.append(list);
    const queued=data.queue.filter(e=>!e.shelved);queued.forEach((entry,i)=>{const t=find(entry.titleId),row=el('li','watch-card');row.dataset.queueId=entry.id;
      const order=el('div','watch-order'),grip=button('⠿',()=>{},'watch-drag');grip.draggable=true;grip.setAttribute('aria-label','Drag to reorder '+t.name);grip.title='Drag to reorder';
      grip.addEventListener('dragstart',e=>{dragged=entry.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',entry.id);row.classList.add('watch-dragging');});grip.addEventListener('dragend',()=>{dragged=null;view.querySelectorAll('.watch-card').forEach(n=>n.classList.remove('watch-drop-before','watch-drop-after','watch-dragging'));});
      row.addEventListener('dragover',e=>{if(!dragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';const after=e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;row.classList.toggle('watch-drop-before',!after);row.classList.toggle('watch-drop-after',after);});row.addEventListener('dragleave',e=>{if(!row.contains(e.relatedTarget))row.classList.remove('watch-drop-before','watch-drop-after');});row.addEventListener('drop',e=>{e.preventDefault();if(dragged)move(dragged,entry.id,e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2);dragged=null;});
      const up=button('↑',()=>move(entry.id,queued[i-1]?.id),'watch-move'),down=button('↓',()=>move(entry.id,queued[i+1]?.id,true),'watch-move');up.disabled=i===0;down.disabled=i===queued.length-1;up.setAttribute('aria-label','Move '+t.name+' up');down.setAttribute('aria-label','Move '+t.name+' down');order.append(grip,up,down);
      const content=el('div','watch-content'),head=el('div','watch-card-heading'),badge=el('span','watch-badge');badge.title=entry.rewatch?'Rewatch':'New';badge.setAttribute('role','img');badge.setAttribute('aria-label',badge.title);if(entry.rewatch)badge.append(image('assets/reload.png'));else badge.append(el('span','watch-star','★'));head.append(el('h3','',t.name),badge);content.append(head,el('p','watch-kind',kind(t,entry.seasons)));const facts=el('div','watch-facts');metadata(t,facts);content.append(facts);if(entry.notes)content.append(el('p','watch-note-text',entry.notes));
      const actions=el('div','watch-card-actions');actions.append(icon('Mark '+t.name+' watched','assets/check.png',()=>finish(entry)));const notes=noteButton(t);if(notes)actions.append(notes);const shelf=button('Shelve',()=>shelve(entry));shelf.setAttribute('aria-label','Shelve '+t.name);actions.append(shelf);actions.append(icon('Edit queued '+t.name,'assets/pencil.png',()=>addOrEdit(entry)),icon('Remove '+t.name+' from queue','assets/delete.png',()=>{if(confirm('Remove “'+t.name+'” from the queue? Its viewing history will be kept.')&&save({...data,queue:data.queue.filter(e=>e.id!==entry.id)}))render();}));row.append(order,content,actions);list.append(row);
    });
    if(!queued.length)view.append(el('p','watch-empty','Nothing queued yet. Add a movie or series to choose your next watch.'));
  }
  function renderLibrary(){
    const searchInput=input('search',search);searchInput.placeholder='Search watched titles or viewing notes';searchInput.setAttribute('aria-label','Search watched titles');const list=el('div','watch-library');view.append(searchInput,list);
    function paint(){list.replaceChildren();const titles=data.titles.filter(t=>t.viewings.length&&key(t.name+' '+t.viewings.map(v=>v.note+' '+v.queueNotes).join(' ')).includes(key(search))).sort((a,b)=>latest(b).localeCompare(latest(a))||a.name.localeCompare(b.name));
      for(const t of titles){const row=el('article','watch-card watch-library-card'),content=el('div','watch-content');content.append(el('h3','',t.name),el('p','watch-kind',kind(t)));const facts=el('div','watch-facts');metadata(t,facts);content.append(facts);const actions=el('div','watch-card-actions');actions.append(button('Watch again',()=>addOrEdit(null,t),'watch-primary'));const note=noteButton(t);if(note)actions.append(note);actions.append(button('Viewing history',()=>showHistory(t.id)),icon('Edit watched '+t.name,'assets/pencil.png',()=>editTitle(t)));row.append(content,actions);list.append(row);}
      if(!titles.length)list.append(el('p','watch-empty',search?'No watched titles match.':'Finished movies and series will appear here, ready to autocomplete next time.'));
    }searchInput.addEventListener('input',()=>{search=searchInput.value;paint();});paint();
  }
  window.addEventListener('DOMContentLoaded',()=>{
    board=document.getElementById('boardContainer');taskForm=document.querySelector('.task-form');view=el('section','watch-view');view.id='watchlistView';view.hidden=true;view.setAttribute('aria-label','Watchlist');board.after(view);
    editor=el('dialog','watch-dialog');editor.setAttribute('aria-label','Watchlist editor');editor.addEventListener('cancel',e=>{e.preventDefault();closeEditor();});history=el('dialog','watch-dialog');history.setAttribute('aria-label','Viewing history');history.addEventListener('cancel',e=>{e.preventDefault();closeHistory();});document.body.append(editor,history);
  });
})();

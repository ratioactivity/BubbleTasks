/* Local calendar annotations share the account save; Google events remain read-only. */
(() => {
  const SAVE='bubbletasks_plain_v1',read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  const normalize=value=>Object.fromEntries(Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{}).filter(([key,v])=>key.length<=1500&&v&&typeof v==='object').map(([key,v])=>[key,{hidden:v.hidden===true,note:typeof v.note==='string'?v.note.slice(0,5000):'',title:typeof v.title==='string'?v.title.slice(0,2000):'Event',source:v.source==='google'?'google':'native',userId:typeof v.userId==='string'?v.userId:''}]));
  let extras=normalize(read().calendarEventExtras);const previous=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===SAVE){const data=JSON.parse(value);data.calendarEventExtras=extras;value=JSON.stringify(data);}return previous.call(this,key,value);};
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const button=(text,action,cls='')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
  window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('boardContainer');if(!board)return;
    const user=()=>window.BubbleTasksCloud?.getUserId()||'',available=([,v])=>v.source!=='google'||v.userId===user();
    const editor=node('dialog','calendar-extra-dialog');editor.setAttribute('aria-label','Event note');const manager=node('dialog','calendar-extra-dialog');manager.setAttribute('aria-label','Hidden events');document.body.append(editor,manager);
    let dirty=()=>false,opener=null;
    function persist(key,value){const before=extras;extras={...extras,[key]:value};try{localStorage.setItem(SAVE,JSON.stringify({...read(),calendarEventExtras:extras}));paint();return true;}catch{extras=before;alert('Could not save the event change. Free some browser storage and try again.');return false;}}
    function edit(key,meta,source){opener=source;editor.replaceChildren();const original=extras[key]?.note||'',form=node('form'),heading=node('h2','','Event note'),title=node('p','',meta.title),label=node('label','','Notes'),text=node('textarea'),actions=node('div','calendar-extra-actions'),save=node('button','','Save note');text.rows=6;text.maxLength=5000;text.value=original;label.append(text);save.type='submit';actions.append(button('Cancel',()=>{if(!dirty()||confirm('Discard this unsaved note?'))editor.close();}),save);form.append(heading,title,node('small','','Saved in BubbleTasks; the original calendar event is unchanged.'),label,actions);editor.append(form);dirty=()=>text.value!==original;form.addEventListener('submit',e=>{e.preventDefault();if(persist(key,{...meta,...extras[key],note:text.value})){dirty=()=>false;editor.close();if(manager.open)showHidden();}});editor.showModal();text.focus();}
    editor.addEventListener('cancel',e=>{if(dirty()&&!confirm('Discard this unsaved note?'))e.preventDefault();});editor.addEventListener('close',()=>opener?.isConnected&&opener.focus({preventScroll:true}));
    function showHidden(){manager.replaceChildren();const top=node('div','calendar-extra-actions');top.append(node('h2','','Hidden events'),button('Close',()=>manager.close()));manager.append(top,node('p','','Hidden only in this calendar. Your original events and scheduled work hours are unchanged.'));const rows=Object.entries(extras).filter(available).filter(([,v])=>v.hidden).sort((a,b)=>a[1].title.localeCompare(b[1].title));
      for(const [key,value]of rows){const row=node('section','calendar-hidden-row'),actions=node('div','calendar-extra-actions');row.append(node('strong','',value.title));if(value.note)row.append(node('p','calendar-extra-note',value.note));const note=button(value.note?'Edit note':'Add note',()=>edit(key,value,note));actions.append(note,button('Show event',()=>{if(persist(key,{...value,hidden:false}))showHidden();}));row.append(actions);manager.append(row);}if(!rows.length)manager.append(node('p','','No hidden events.'));
    }
    function paint(){
      if(!board.classList.contains('calendar'))return;
      const nav=board.querySelector('.calendar-navigation');if(nav){let manage=nav.querySelector('.calendar-hidden-events');if(!manage){manage=button('',()=>{showHidden();manager.showModal();},'calendar-hidden-events');nav.append(manage);}const count=Object.entries(extras).filter(available).filter(([,v])=>v.hidden).length,label='Hidden events ('+count+')';if(manage.textContent!==label)manage.textContent=label;}
      for(const bubble of board.querySelectorAll('.calendar-event,.google-calendar-event')){
        const google=bubble.classList.contains('google-calendar-event'),id=google?bubble.dataset.googleEventId:bubble.dataset.eventId;if(!id||google&&!user())continue;
        const key=google?'google:'+user()+':'+id:'native:'+id,title=bubble.querySelector(google?'strong':'.calendar-event-title')?.textContent||'Event',meta={title,source:google?'google':'native',userId:google?user():''},value=extras[key];bubble.hidden=value?.hidden===true;
        let actions=bubble.querySelector('.calendar-event-extra-actions');if(!actions){actions=node('div','calendar-event-extra-actions');const note=button('Note',()=>edit(key,meta,note),'calendar-event-note');note.setAttribute('aria-label','Notes for '+title);const hide=button('Hide',()=>persist(key,{...meta,...extras[key],hidden:true}),'calendar-event-hide');hide.setAttribute('aria-label','Hide event '+title);actions.append(note,hide);bubble.append(actions);}
        const note=actions.querySelector('.calendar-event-note'),label=value?.note?'Note ●':'Note';if(note.textContent!==label)note.textContent=label;
        let preview=bubble.querySelector('.calendar-extra-note');if(value?.note){if(!preview){preview=node('p','calendar-extra-note');bubble.append(preview);}if(preview.textContent!==value.note)preview.textContent=value.note;}else preview?.remove();
      }
    }
    window.addEventListener('bubbletasks-backup-import',e=>{if(e.detail?.calendarEventExtras!==undefined){extras=normalize(e.detail.calendarEventExtras);paint();}});
    window.addEventListener('bubbletasks-account-changed',()=>{if(editor.open)editor.close();if(manager.open)manager.close();paint();});
    new MutationObserver(paint).observe(board,{childList:true,subtree:true});paint();
  });
})();

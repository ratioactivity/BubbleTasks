/* Bubblemarks shares BubbleTasks' save, backups and cloud account. Legacy keys are read once. */
(() => {
  const SAVE='bubbletasks_plain_v1';
  const KEYS=['bubblemarks.bookmarks.v1','bubblemarks.categories.v1','bubblemarks.preferences.v1'];
  const read=()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{};}catch{return {};}};
  const valid=value=>value&&typeof value==='object'&&!Array.isArray(value);
  let library=read().bubblemarks;
  const previousSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&key===SAVE){
      const data=JSON.parse(value);
      if(library!==undefined)data.bubblemarks=library;
      value=JSON.stringify(data);
    }
    return previousSet.call(this,key,value);
  };
  // Both GitHub Pages apps use the same origin. Leave the original library intact.
  if(read().bubblemarks===undefined){
    const legacy={};
    for(const key of KEYS){try{const value=JSON.parse(localStorage.getItem(key));if(value!==null)legacy[key]=value;}catch{}}
    if(Object.keys(legacy).length){library=legacy;localStorage.setItem(SAVE,JSON.stringify({...read(),bubblemarks:library}));}
  }
  let active=false,view,frame,settings;
  window.BubbleTasksBookmarks={
    isActive:()=>active,
    getItem(key){if(!KEYS.includes(key))throw Error('Unknown bookmark setting');const value=library?.[key];return value===undefined?null:JSON.stringify(value);},
    setItem(key,value){
      if(!KEYS.includes(key))throw Error('Unknown bookmark setting');
      const parsed=JSON.parse(value);
      if(key==='bubblemarks.preferences.v1'?!valid(parsed):!Array.isArray(parsed))throw Error('Invalid bookmark data');
      const before=library;library={...(library||{}),[key]:parsed};
      try{localStorage.setItem(SAVE,JSON.stringify({...read(),bubblemarks:library}));}catch(error){library=before;throw error;}
    },
    show(){
      active=true;view.hidden=false;settings.hidden=false;document.body.classList.add('bookmarks-active');
      document.getElementById('boardContainer').hidden=true;document.querySelector('.task-form').hidden=true;
      fitFrame();
      if(view.getBoundingClientRect().top>innerHeight-400)view.scrollIntoView({block:'start',behavior:'instant'});
      if(!frame.src)frame.src='bubblemarks/index.html';
    },
    focusView(){fitFrame();view.scrollIntoView({block:'start',behavior:'instant'});},
    hide(){
      if(!active)return;active=false;view.hidden=true;settings.hidden=true;document.body.classList.remove('bookmarks-active');
      document.getElementById('boardContainer').hidden=false;document.querySelector('.task-form').hidden=false;
    }
  };
  window.addEventListener('bubbletasks-backup-import',event=>{
    if(event.detail?.bubblemarks===undefined)return;
    if(!valid(event.detail.bubblemarks))return;
    library=event.detail.bubblemarks;
    localStorage.setItem(SAVE,JSON.stringify({...read(),bubblemarks:library}));
    if(frame?.src)frame.contentWindow.location.reload();
  });
  function fitFrame(){if(active&&view)frame.style.height=Math.max(400,innerHeight-32)+'px';}
  window.addEventListener('resize',fitFrame);
  window.addEventListener('DOMContentLoaded',()=>{
    view=document.createElement('section');view.id='bookmarksView';view.hidden=true;view.setAttribute('aria-label','Bubblemarks');
    frame=document.createElement('iframe');frame.title='Bubblemarks bookmark library';frame.id='bubblemarksFrame';
    view.append(frame);document.getElementById('boardContainer').after(view);
    settings=document.createElement('button');settings.type='button';settings.className='bookmarks-settings';settings.hidden=true;
    settings.textContent='⚙';settings.setAttribute('aria-label','Bubblemarks settings');settings.setAttribute('aria-haspopup','dialog');
    settings.addEventListener('click',()=>{window.BubbleTasksBookmarks.focusView();frame.contentDocument?.getElementById('settings-btn')?.click();});document.body.append(settings);
  });
})();

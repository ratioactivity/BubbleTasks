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
  let active=false,view,frame,settings,contentHeight=600,modalOpen=false,savedScroll=null,previousOverflow;
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
      if(window.BubbleTasksPersonal&&!window.BubbleTasksPersonal.isEnabled())return;
      active=true;view.hidden=false;settings.hidden=false;document.body.classList.add('bookmarks-active');
      document.getElementById('boardContainer').hidden=true;document.querySelector('.task-form').hidden=true;
      fitFrame();
      if(!frame.src)frame.src='bubblemarks/index.html?v=flow-3';
    },
    focusView(){},
    setContentHeight(height){if(Number.isFinite(height)&&height>0){contentHeight=Math.ceil(height);fitFrame();}},
    setModal(open){
      if(modalOpen===open)return;
      modalOpen=open;
      if(open){
        savedScroll={x:scrollX,y:scrollY};previousOverflow=document.body.style.overflow;
        view.style.minHeight=contentHeight+'px';document.body.style.overflow='hidden';
      }
      frame.classList.toggle('bookmarks-modal-open',open);settings.style.visibility=open?'hidden':'';
      if(!open){
        view.style.minHeight='';document.body.style.overflow=previousOverflow||'';fitFrame();
        if(savedScroll)scrollTo(savedScroll.x,savedScroll.y);
        settings.focus({preventScroll:true});
      }
    },
    hide(){
      if(!active)return;window.BubbleTasksBookmarks.setModal(false);active=false;view.hidden=true;settings.hidden=true;document.body.classList.remove('bookmarks-active');
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
  function fitFrame(){if(active&&view&&!modalOpen)frame.style.height=contentHeight+'px';}
  window.addEventListener('resize',fitFrame);
  window.addEventListener('DOMContentLoaded',()=>{
    view=document.createElement('section');view.id='bookmarksView';view.hidden=true;view.setAttribute('aria-label','Bubblemarks');
    frame=document.createElement('iframe');frame.title='Bubblemarks bookmark library';frame.id='bubblemarksFrame';frame.setAttribute('scrolling','no');
    view.append(frame);document.getElementById('boardContainer').after(view);
    settings=document.createElement('button');settings.type='button';settings.className='bookmarks-settings';settings.hidden=true;
    settings.textContent='⚙';settings.setAttribute('aria-label','Bubblemarks settings');settings.setAttribute('aria-haspopup','dialog');
    settings.addEventListener('click',()=>{frame.contentDocument?.getElementById('settings-btn')?.click();});document.body.append(settings);
  });
})();

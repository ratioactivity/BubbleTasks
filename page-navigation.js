/* Direct navigation adapts the existing views without replacing their saved data. */
window.addEventListener('DOMContentLoaded',()=>{
  const layout=document.getElementById('layoutToggleButton'),day=document.getElementById('dayToggleButton'),notes=document.getElementById('notesToggleButton'),toolbar=document.querySelector('.toolbar'),board=document.getElementById('boardContainer');
  const nav=document.createElement('nav');nav.className='page-navigation';nav.setAttribute('aria-label','BubbleTasks pages');toolbar.before(nav);
  const readLayout=()=>{try{return JSON.parse(localStorage.getItem('bubbletasks_plain_v1'))?.layout||'columns';}catch{return 'columns';}};
  const active=()=>window.BubbleTasksBookmarks.isActive()?'bookmarks':day.getAttribute('aria-pressed')==='true'?'daily':notes.getAttribute('aria-pressed')==='true'?'notes':readLayout();
  const views=[['day','Calendar'],['daily','Daily Tracker'],['columns','Columns'],['tabs','Tabbed'],['notes','Notes'],['bookmarks','Bubblemarks']];
  const tasks=document.createElement('div');tasks.className='page-navigation-tasks';tasks.setAttribute('role','group');tasks.setAttribute('aria-label','Tasks');
  const tasksLabel=document.createElement('span');tasksLabel.className='page-navigation-tasks-label';tasksLabel.textContent='Tasks';tasksLabel.setAttribute('aria-hidden','true');tasks.append(tasksLabel);
  const buttons=new Map();
  function paint(){const current=active();buttons.forEach((button,key)=>{button.setAttribute('aria-pressed',String(key===current));if(key===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
  function navigate(target){
    if(active()===target)return;
    if(day.getAttribute('aria-pressed')==='true'){day.click();if(day.getAttribute('aria-pressed')==='true'){paint();return;}}
    if(notes.getAttribute('aria-pressed')==='true')notes.click();
    window.BubbleTasksBookmarks.hide();
    if(target==='bookmarks')window.BubbleTasksBookmarks.show();
    else if(target==='daily')day.click();
    else if(target==='notes')notes.click();
    else{
      layout.dataset.directNavigation='true';
      try{for(let n=0;n<3&&readLayout()!==target;n++)layout.click();}
      finally{delete layout.dataset.directNavigation;}
    }
    paint();
  }
  views.forEach(([key,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.page=key;button.addEventListener('click',()=>navigate(key));buttons.set(key,button);if(key==='columns'||key==='tabs'){if(!tasks.isConnected)nav.append(tasks);tasks.append(button);}else nav.append(button);});
  const observer=new MutationObserver(paint);observer.observe(layout,{childList:true});observer.observe(day,{attributes:true,attributeFilter:['aria-pressed']});observer.observe(notes,{attributes:true,attributeFilter:['aria-pressed']});observer.observe(board,{attributes:true,attributeFilter:['class']});
  paint();
});


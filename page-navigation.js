/* Direct navigation adapts the existing views without replacing their saved data. */
window.addEventListener('DOMContentLoaded',()=>{
  const layout=document.getElementById('layoutToggleButton'),day=document.getElementById('dayToggleButton'),notes=document.getElementById('notesToggleButton'),toolbar=document.querySelector('.toolbar'),board=document.getElementById('boardContainer');
  const nav=document.createElement('nav');nav.className='page-navigation';nav.setAttribute('aria-label','BubbleTasks pages');toolbar.before(nav);
  const readLayout=()=>{try{return JSON.parse(localStorage.getItem('bubbletasks_plain_v1'))?.layout||'columns';}catch{return 'columns';}};
  const active=()=>window.BubbleTasksWatchlist.isActive()?'watchlist':window.BubbleTasksDetails.isActive()?'details':window.BubbleTasksSchedule.isActive()?'schedule':window.BubbleTasksBookmarks.isActive()?'bookmarks':day.getAttribute('aria-pressed')==='true'?'daily':notes.getAttribute('aria-pressed')==='true'?'notes':readLayout();
  const views=[['day','Calendar'],['schedule','Schedule'],['daily','Tracker'],['columns','Columns'],['tabs','Tabbed'],['notes','Notes'],['watchlist','Watchlist'],['bookmarks','Bubblemarks'],['details','Details']];
  const tasks=document.createElement('div');tasks.className='page-navigation-tasks';tasks.setAttribute('role','group');tasks.setAttribute('aria-label','Tasks');
  const tasksLabel=document.createElement('span');tasksLabel.className='page-navigation-tasks-label';tasksLabel.textContent='Tasks';tasksLabel.setAttribute('aria-hidden','true');tasks.append(tasksLabel);
  const daily=document.createElement('div');daily.className='page-navigation-tasks';daily.setAttribute('role','group');daily.setAttribute('aria-label','Daily');
  const dailyLabel=document.createElement('span');dailyLabel.className='page-navigation-tasks-label';dailyLabel.textContent='Daily';dailyLabel.setAttribute('aria-hidden','true');daily.append(dailyLabel);
  const buttons=new Map();
  function paint(){const current=active();buttons.forEach((button,key)=>{button.setAttribute('aria-pressed',String(key===current));if(key===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
  function navigate(target){
    if(active()===target)return;
    if(!window.BubbleTasksWatchlist.hide())return;
    if(!window.BubbleTasksDetails.hide())return;
    if(!window.BubbleTasksSchedule.hide())return;
    if(day.getAttribute('aria-pressed')==='true'){day.click();if(day.getAttribute('aria-pressed')==='true'){paint();return;}}
    if(notes.getAttribute('aria-pressed')==='true')notes.click();
    window.BubbleTasksBookmarks.hide();
    if(target==='watchlist')window.BubbleTasksWatchlist.show();
    else if(target==='details')window.BubbleTasksDetails.show();
    else if(target==='schedule')window.BubbleTasksSchedule.show();
    else if(target==='bookmarks')window.BubbleTasksBookmarks.show();
    else if(target==='daily')day.click();
    else if(target==='notes')notes.click();
    else{
      layout.dataset.directNavigation='true';
      try{for(let n=0;n<3&&readLayout()!==target;n++)layout.click();}
      finally{delete layout.dataset.directNavigation;}
    }
    paint();
  }
  views.forEach(([key,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.page=key;button.addEventListener('click',()=>navigate(key));buttons.set(key,button);if(key==='columns'||key==='tabs'){if(!tasks.isConnected)nav.append(tasks);tasks.append(button);}else if(key==='schedule'||key==='daily'){if(!daily.isConnected)nav.append(daily);daily.append(button);}else nav.append(button);});
  const home=document.createElement('a');home.className='page-navigation-home';home.textContent='Notion Home ↗';home.href='https://app.notion.com/p/Home-ff42302797964ca0aa31c9d81ab26979';home.target='_blank';home.rel='noopener noreferrer';home.setAttribute('aria-label','Notion Home (opens in a new tab)');nav.append(home);
  const observer=new MutationObserver(paint);observer.observe(layout,{childList:true});observer.observe(day,{attributes:true,attributeFilter:['aria-pressed']});observer.observe(notes,{attributes:true,attributeFilter:['aria-pressed']});observer.observe(board,{attributes:true,attributeFilter:['class']});
  if(localStorage.getItem('bubbletasks_watchlist_view_v1')==='true')navigate('watchlist');
  else if(localStorage.getItem('bubbletasks_details_view_v1')==='true')navigate('details');
  else if(localStorage.getItem('bubbletasks_schedule_view_v1')==='true')navigate('schedule');
  paint();
});





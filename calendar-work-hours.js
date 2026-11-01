/* Weekly totals use saved timed "Details" events; calendar entries themselves are unchanged. */
(() => {
  const validDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return Number.isFinite(+d)&&d.getFullYear()===Number(s.slice(0,4))&&d.getMonth()+1===Number(s.slice(5,7))&&d.getDate()===Number(s.slice(8,10));};
  const validTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const details=e=>e&&typeof e.title==='string'&&e.title.trim().toLowerCase()==='details';
  function minutesForWeek(start,end,data,userId){
    const intervals=[],from=+start,until=+end;
    const add=(a,b)=>{a=Math.max(+a,from);b=Math.min(+b,until);if(Number.isFinite(a)&&Number.isFinite(b)&&b>a)intervals.push([a,b]);};
    for(const event of Array.isArray(data.calendarEvents)?data.calendarEvents:[]){
      if(!details(event)||event.allDay!==false||!validDate(event.date)||!validTime(event.startTime)||!validTime(event.endTime))continue;
      const a=new Date(event.date+'T'+event.startTime),b=new Date(event.date+'T'+event.endTime);
      if(event.endTime===event.startTime)continue;
      if(b<a)b.setDate(b.getDate()+1);
      add(a,b);
    }
    if(userId)for(const event of Array.isArray(data.googleEventImports)?data.googleEventImports:[]){
      if(!details(event)||event.userId!==userId||!event.start?.dateTime||!event.end?.dateTime)continue;
      add(new Date(event.start.dateTime),new Date(event.end.dateTime));
    }
    // Count overlapping copies of the same work period once, including local/Google duplicates.
    intervals.sort((a,b)=>a[0]-b[0]);let total=0,active=null;
    for(const interval of intervals){if(active&&interval[0]<=active[1])active[1]=Math.max(active[1],interval[1]);else{if(active)total+=active[1]-active[0];active=[...interval];}}
    if(active)total+=active[1]-active[0];return Math.round(total/60000);
  }
  const duration=minutes=>{const h=Math.floor(minutes/60),m=minutes%60;return h+'h'+(m?' '+m+'m':'');};
  if(typeof module!=='undefined'&&module.exports)module.exports={minutesForWeek,duration};
  if(typeof document==='undefined')return;
  window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('boardContainer');if(!board)return;
    let scheduled=0;
    function render(){
      scheduled=0;if(!board.classList.contains('calendar'))return;
      let data;try{data=JSON.parse(localStorage.getItem('bubbletasks_plain_v1'))||{};}catch{data={};}
      const user=window.BubbleTasksCloud?.getUserId(),format=d=>d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
      for(const cell of board.querySelectorAll('.calendar-day[data-date]')){
        if(!validDate(cell.dataset.date))continue;
        const end=new Date(cell.dataset.date+'T00:00:00');if(end.getDay()!==6)continue;
        end.setDate(end.getDate()+1);const start=new Date(+end);start.setDate(start.getDate()-7);
        const minutes=minutesForWeek(start,end,data,user),text='Work: '+duration(minutes);
        let badge=cell.querySelector('.calendar-week-hours');
        if(!badge){badge=document.createElement('span');badge.className='calendar-week-hours';cell.append(badge);}
        cell.classList.add('has-weekly-hours');if(badge.textContent!==text)badge.textContent=text;
        const saturday=new Date(+end);saturday.setDate(saturday.getDate()-1);
        badge.title='Saved timed Details events · '+format(start)+' – '+format(saturday)+' · overlapping time counted once';
        badge.setAttribute('aria-label','Work hours for '+format(start)+' through '+format(saturday)+': '+duration(minutes));
      }
    }
    const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(render);};
    new MutationObserver(schedule).observe(board,{childList:true,subtree:true});
    window.addEventListener('bubbletasks-account-changed',schedule);
    window.addEventListener('bubbletasks-backup-import',schedule);
    render();
  });
})();

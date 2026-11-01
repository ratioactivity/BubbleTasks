/* This copy lives on the same origin; only its three library keys enter the shared save. */
(() => {
  if(window.parent===window||!window.parent.BubbleTasksBookmarks)return;
  const library=window.parent.BubbleTasksBookmarks;
  const keys=new Set(['bubblemarks.bookmarks.v1','bubblemarks.categories.v1','bubblemarks.preferences.v1']);
  window.addEventListener('DOMContentLoaded',()=>{
    const shell=document.querySelector('.app-shell'),grid=document.getElementById('bookmarks');
    let scheduled=false;
    function update(){
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        let prefs={};try{prefs=JSON.parse(library.getItem('bubblemarks.preferences.v1'))||{};}catch{}
        const columns=Math.min(Math.max(1,Number(prefs.cardsPerRow)||3),Math.max(1,Math.floor(grid.clientWidth/210)));
        if(grid.style.getPropertyValue('--bm-columns')!==String(columns))grid.style.setProperty('--bm-columns',columns);
        library.setModal(!!document.querySelector('[role="dialog"]:not([hidden])'));
        library.setContentHeight(shell.offsetTop+shell.getBoundingClientRect().height+16);
      });
    }
    new ResizeObserver(update).observe(shell);
    new MutationObserver(update).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
    window.addEventListener('resize',update);document.fonts.ready.then(update);update();
  });
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  Storage.prototype.getItem=function(key){return this===localStorage&&keys.has(key)?library.getItem(key):get.call(this,key);};
  Storage.prototype.setItem=function(key,value){return this===localStorage&&keys.has(key)?library.setItem(key,String(value)):set.call(this,key,value);};
})();

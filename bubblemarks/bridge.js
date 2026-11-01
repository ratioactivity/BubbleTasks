/* This copy lives on the same origin; only its three library keys enter the shared save. */
(() => {
  if(window.parent===window||!window.parent.BubbleTasksBookmarks)return;
  const library=window.parent.BubbleTasksBookmarks;
  const keys=new Set(['bubblemarks.bookmarks.v1','bubblemarks.categories.v1','bubblemarks.preferences.v1']);
  window.addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(records=>{if(records.some(record=>record.attributeName==='hidden'&&!record.target.hidden&&record.target.matches('[role=dialog]')))library.focusView();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
  });
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  Storage.prototype.getItem=function(key){return this===localStorage&&keys.has(key)?library.getItem(key):get.call(this,key);};
  Storage.prototype.setItem=function(key,value){return this===localStorage&&keys.has(key)?library.setItem(key,String(value)):set.call(this,key,value);};
})();

const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[];
 async function device(seed){
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
  if(seed)await context.addInitScript(seed=>{if(!sessionStorage.seeded){for(const [k,v] of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));sessionStorage.seeded='yes'}},seed);
  const p=await context.newPage();p.setDefaultTimeout(15000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>{
   const u=new URL(r.request().url());
   if(u.hostname!=='bubble.test')return r.fulfill({status:200,contentType:'application/json',body:'{}'});
   const f=path.join(__dirname,'..',u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
   try{return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':'application/octet-stream'})}catch{return r.fulfill({status:404,body:''})}
  });await p.goto('https://bubble.test/');return p;
 }
 const legacy=[{name:'My existing library',url:'https://example.test/existing',category:'Stories',image:''}];
 const a=await device({'bubblemarks.bookmarks.v1':legacy,'bubblemarks.preferences.v1':{showAxolotl:false}});
 const open=async p=>{await p.locator('[data-page=bookmarks]').click();await p.frameLocator('#bubblemarksFrame').locator('#bookmarks .bookmark-card').first().waitFor();return p.frameLocator('#bubblemarksFrame')};
 let f=await open(a);assert.match(await f.locator('#bookmarks').innerText(),/My existing library/);
 assert.equal(await f.locator('#bookmarks .bookmark-card').count(),1);
 assert.equal(await f.locator('.app-logo').count(),0);
 await f.locator('#add-bookmark').click();await f.locator('#bookmark-name').fill('Added in BubbleTasks');await f.locator('#bookmark-url').fill('https://example.test/new');await f.locator('#bookmark-category').selectOption('Stories');await f.locator('#bookmark-form button[type=submit]').click();
 let library=await a.evaluate(()=>JSON.parse(localStorage.getItem('bubbletasks_plain_v1')).bubblemarks);
 assert.equal(library['bubblemarks.bookmarks.v1'].length,2);
 assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('bubblemarks.bookmarks.v1')).length),1);
 await a.locator('.bookmarks-settings').click();await f.locator('#settings-modal').waitFor({state:'visible'});
 await f.locator('#toggle-heading').uncheck();await f.locator('#settings-modal button[data-settings-dismiss=true]').first().click();
 assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('bubbletasks_plain_v1')).bubblemarks['bubblemarks.preferences.v1'].showHeading),false);
 for(const page of ['notes','daily','day','columns','tabs']){await a.locator('[data-page='+page+']').click();assert(!(await a.locator('#bookmarksView').isVisible()));assert(!(await a.locator('.bookmarks-settings').isVisible()));await a.locator('[data-page=bookmarks]').click();assert(await a.locator('#bookmarksView').isVisible());}
 await a.reload();f=await open(a);assert.equal(await f.locator('#bookmarks .bookmark-card').count(),2);
 await a.locator('[data-page=columns]').click();await a.locator('#taskTitleInput').fill('Unrelated task');await a.locator('#addTaskButton').click();
 assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('bubbletasks_plain_v1')).bubblemarks['bubblemarks.bookmarks.v1'].length),2);
 const download=a.waitForEvent('download');await a.locator('#backupTasksButton').click();const backup=JSON.parse(fs.readFileSync(await(await download).path()));assert.equal(backup.bubblemarks['bubblemarks.bookmarks.v1'].length,2);
 const b=await device({'bubbletasks_plain_v1':backup});const bf=await open(b);assert.equal(await bf.locator('#bookmarks .bookmark-card').count(),2);
 // Import and empty libraries must be respected, including after reopening the app.
 await b.evaluate(()=>{const data=JSON.parse(localStorage.getItem('bubbletasks_plain_v1'));data.bubblemarks['bubblemarks.bookmarks.v1']=[];window.dispatchEvent(new CustomEvent('bubbletasks-backup-import',{detail:data}));localStorage.setItem('bubbletasks_plain_v1',JSON.stringify(data))});
 await bf.locator('#empty-state').waitFor({state:'visible'});await b.reload();await b.locator('[data-page=bookmarks]').click();await b.frameLocator('#bubblemarksFrame').locator('#empty-state').waitFor({state:'visible'});
 const fresh=await device();await fresh.locator('[data-page=bookmarks]').click();const freshf=fresh.frameLocator('#bubblemarksFrame');await freshf.locator('#empty-state').waitFor({state:'visible'});
 await fresh.setViewportSize({width:390,height:844});await fresh.locator('.bookmarks-settings').click();await freshf.locator('#settings-modal').waitFor({state:'visible'});assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await fresh.screenshot({path:'/tmp/bubblemarks-mobile.png'});await a.locator('[data-page=bookmarks]').click();await a.screenshot({path:'/tmp/bubblemarks-desktop.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: legacy migration, CRUD persistence, shared backups, restored library, empty library, navigation, settings, private fresh installs and mobile layout.');
})().catch(e=>{console.error(e);process.exit(1)});

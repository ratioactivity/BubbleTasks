const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');const fs=require('fs');const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 let remote=null,offline=false,writeCount=0,forceRace=false,notionCalls=0;const errors=[];
 const user={id:'11111111-1111-1111-1111-111111111111',email:'owner@example.test'};
 const session=()=>({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user});
 async function device(initial){const c=await browser.newContext({acceptDownloads:true});if(initial)await c.addInitScript((data)=>{if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));sessionStorage.setItem('seeded','yes')}},initial);const p=await c.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await p.route('**/*',async r=>{const u=new URL(r.request().url()),method=r.request().method();if(u.hostname.endsWith('.supabase.co')){
  if(offline)return r.abort();
  if(u.pathname==='/auth/v1/user')return r.fulfill({json:user});
  if(u.pathname.startsWith('/auth/v1/token'))return r.fulfill({json:session()});
  if(u.pathname==='/auth/v1/logout')return r.fulfill({json:{}});
  if(u.pathname.startsWith('/auth/v1/otp'))return r.fulfill({json:{}});
  if(u.pathname.includes('/functions/v1/daily-tracker-sync')){notionCalls++;const d=r.request().postDataJSON().date;return r.fulfill({json:{revision:remote.data.dailyTracker.days[d].revision,url:'https://www.notion.so/test-day'}})}if(u.pathname.includes('/functions/v1/'))return r.fulfill({json:{connected:false}});assert.equal(u.pathname,'/rest/v1/bubbletasks_saves');assert.equal(r.request().headers().authorization,'Bearer test-access');
  if(method==='GET')return r.fulfill({json:remote?[remote]:[]});
  const body=r.request().postDataJSON();
  if(method==='POST'){if(remote)return r.fulfill({status:409,json:{}});remote={data:body.data,revision:1};writeCount++;return r.fulfill({status:201,json:[remote]})}
  if(method==='PATCH'){
   if(forceRace){forceRace=false;remote={data:{...remote.data,tasks:[...remote.data.tasks,{id:'race',title:'Race task',category:'Work',priority:3,status:'Not Started',createdAt:new Date().toISOString()}]},revision:remote.revision+1}}
   if(u.searchParams.get('revision')!=='eq.'+remote.revision)return r.fulfill({json:[]});
   remote={data:body.data,revision:remote.revision+1};writeCount++;return r.fulfill({json:[remote]})
  }
 }
 if(u.hostname==='api.open-meteo.com')return r.fulfill({json:{current:{temperature_2m:70,apparent_temperature:70}}});
 const f=require('node:path').join(__dirname,'..')+(u.pathname==='/'?'/index.html':u.pathname);try{return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream'})}catch{return r.fulfill({status:404,body:''})}
 });await p.goto('https://bubble.test');await p.locator('#cloudSyncPanel').waitFor();return p;}
 async function login(p){await p.locator('[data-cloud-login]').click();await p.locator('#cloudAuthForm [name="email"]').fill(user.email);await p.locator('#cloudAuthForm [name="password"]').fill('sample-password');await p.locator('#cloudAuthForm button[value="login"]').click();await p.locator('[data-cloud-upload]').waitFor({state:'visible'});await p.waitForFunction(()=>!document.querySelector('[data-cloud-upload]').disabled)}
 async function task(p,title){await p.locator('#taskTitleInput').fill(title);await p.locator('#addTaskButton').click();}
 async function upload(p){await p.locator('[data-cloud-upload]').click();await p.waitForFunction(()=>document.querySelector('[data-sync-status]').textContent.startsWith('Synced'));}


 const a=await device();await a.locator('#dayToggleButton').click();await a.locator('#dailyTrackerView').waitFor();
 await a.getByLabel('Choose log date').fill('2026-10-31');
 const widget=(p,name)=>p.locator('.day-widget').filter({has:p.getByRole('heading',{name,exact:true})});
 async function saveEntry(p){await p.locator('#dailyEntryDialog').getByRole('button',{name:'Save entry',exact:true}).click();}
 await widget(a,'Song Of The Day').getByLabel('Song title').fill('Dreamboat Annie');await widget(a,'Song Of The Day').getByRole('button',{name:'Save',exact:true}).click();
 assert.equal(await a.locator('.day-heading h2').innerText(),'Dreamboat Annie');
 await a.getByLabel('Add artist',{exact:true}).fill('Heart');await a.getByLabel('Add artist',{exact:true}).press('Enter');
 await a.getByRole('button',{name:'Heart · genres',exact:true}).click();await a.getByLabel('Genre',{exact:true}).fill('Rock');await a.getByLabel('Genre',{exact:true}).press('Enter');await saveEntry(a);
 assert.match(await widget(a,'Song Of The Day').innerText(),/Rock/);
 await a.getByLabel('Bed time',{exact:true}).fill('2026-10-31T08:00');await a.getByLabel('Wake time',{exact:true}).fill('2026-10-31T14:30');await widget(a,'Sleep').getByRole('button',{name:'Save',exact:true}).click();assert.match(await widget(a,'Sleep').innerText(),/6.5 hours/);
 for(const n of [8,4]){await a.getByRole('button',{name:'Log mood '+n,exact:true}).click();await saveEntry(a);}
 await a.getByRole('button',{name:'Log pain 6',exact:true}).click();await saveEntry(a);
 assert.match(await widget(a,'Mood').innerText(),/Average: 6.0/);assert.match(await widget(a,'Pain').innerText(),/Peak: 6/);
 await a.getByRole('button',{name:'+ Log symptom',exact:true}).click();await a.getByLabel('Symptom',{exact:true}).fill('Bladder cramps');await a.getByLabel('Body area',{exact:true}).selectOption('Pelvic');await a.getByLabel('Rating',{exact:true}).fill('7');await saveEntry(a);
 await a.getByRole('button',{name:'+ Log symptom',exact:true}).click();await a.getByLabel('Symptom',{exact:true}).fill('bladder cr');await a.getByLabel('Symptom',{exact:true}).press('Tab');assert.equal(await a.getByLabel('Symptom',{exact:true}).inputValue(),'Bladder cramps');assert.equal(await a.getByLabel('Body area',{exact:true}).inputValue(),'Pelvic');await saveEntry(a);
 await a.getByLabel('Menstruating?',{exact:true}).selectOption('yes');await a.getByLabel('Flow',{exact:true}).selectOption('Spotting');await widget(a,'Menstrual Cycle').getByRole('button',{name:'Save',exact:true}).click();
 await a.getByLabel('Add activity',{exact:true}).fill('Went out with parents');await a.getByLabel('Add activity',{exact:true}).press('Enter');
 await a.getByLabel('Story, game, or interest').fill('Cove');await a.getByLabel('Story, game, or interest').press('Enter');
 await a.getByLabel('On my mind',{exact:true}).check();await a.getByLabel('Worked on',{exact:true}).check();await a.getByLabel('Progress / note',{exact:true}).fill('Worked on chapter 31');await saveEntry(a);
 await a.getByRole('button',{name:'History',exact:true}).click();assert.match(await a.locator('#dailyEntryDialog').innerText(),/Worked on chapter 31/);await a.locator('#dailyEntryDialog').getByRole('button',{name:'Close',exact:true}).click();
 await a.getByLabel('Show or movie').fill('The Empress');await a.getByLabel('Show or movie').press('Enter');await saveEntry(a);
 for(const name of ['Meals','Learned Today']){await widget(a,name).getByRole('button',{name:'+ Add entry',exact:true}).click();await a.getByLabel(name==='Meals'?'What did you eat?':'What did you learn?',{exact:true}).fill(name==='Meals'?'Garlic noodles':'A new Russian word');await saveEntry(a);}
 await a.getByLabel('Daily notes',{exact:true}).fill('<script>safe plain text</script>');await widget(a,'Anything Else?').getByRole('button',{name:'Save',exact:true}).click();
 let data=await a.evaluate(()=>JSON.parse(localStorage.getItem('bubbletasks_plain_v1')).dailyTracker);assert.equal(data.days['2026-10-31'].mood.length,2);assert.equal(data.days['2026-10-31'].symptoms.length,2);assert.equal(data.days['2026-10-31'].focus[0].worked,true);assert.equal(data.days['2026-10-31'].cycle.flow,'Spotting');
 await a.getByLabel('Choose log date').fill('2026-10-30');assert.match(await widget(a,'Mood').innerText(),/Not recorded/);await a.getByLabel('Choose log date').fill('2026-10-31');await a.reload();await a.locator('#dailyTrackerView').waitFor();assert.equal(await a.locator('.day-heading h2').innerText(),'Dreamboat Annie');
 await a.locator('#notesToggleButton').click();await a.locator('#notesView').waitFor();await a.locator('#dayToggleButton').click();await a.locator('#dailyTrackerView').waitFor();assert(!(await a.locator('#notesView').isVisible()));
 await a.getByLabel('Daily notes').fill('Keep this draft');await a.getByRole('button',{name:'Log mood 7',exact:true}).click();await saveEntry(a);assert.equal(await a.getByLabel('Daily notes').inputValue(),'Keep this draft');await widget(a,'Anything Else?').getByRole('button',{name:'Save',exact:true}).click();
 const dl=a.waitForEvent('download');await a.locator('#backupTasksButton').click();const backup=JSON.parse(fs.readFileSync(await (await dl).path()));assert.equal(backup.dailyTracker.days['2026-10-31'].mood.length,3);
 await a.screenshot({path:'/tmp/bubbletasks-day-desktop.png',fullPage:true});
 await a.waitForTimeout(300);
 assert(await a.locator('.day-grid > .day-widget').evaluateAll(cards=>cards.every(card=>card.style.gridRowEnd.startsWith('span '))));
 await a.setViewportSize({width:1920,height:1080});await a.waitForTimeout(300);
 await a.screenshot({path:'/tmp/bubbletasks-day-wide.png',fullPage:true});
 const layout=await a.locator('.day-grid > .day-widget').evaluateAll(cards=>cards.map(c=>({x:c.offsetLeft,y:c.offsetTop,height:c.getBoundingClientRect().height})));
 assert(layout.slice(0,4).some((v,i)=>i&&Math.abs(v.height-layout[0].height)>50));
await a.setViewportSize({width:390,height:844});assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await a.screenshot({path:'/tmp/bubbletasks-day-mobile.png',fullPage:true});await a.setViewportSize({width:1280,height:900});
 await login(a);await upload(a);assert.equal(remote.data.dailyTracker.days['2026-10-31'].mood.length,3);
 await a.getByLabel('Automatically upload saved days to Notion').check();await a.waitForFunction(()=>document.querySelector('[data-day-sync-status]').textContent.startsWith('Uploaded'));assert(notionCalls>=1);
 const b=await device();await login(b);await b.locator('[data-cloud-download]').click();await b.waitForFunction(()=>JSON.parse(localStorage.getItem('bubbletasks_plain_v1')).dailyTracker?.days?.['2026-10-31']?.mood.length===3);
 await b.locator('#dayToggleButton').click();await b.getByLabel('Choose log date').fill('2026-10-31');assert.equal(await b.locator('.day-heading h2').innerText(),'Dreamboat Annie');
 await b.getByLabel('Daily notes').fill('Updated on second device');await widget(b,'Anything Else?').getByRole('button',{name:'Save',exact:true}).click();await b.waitForFunction(()=>document.querySelector('[data-sync-status]').textContent.startsWith('Synced'));
 await a.locator('[data-sync-now]').click();await a.waitForFunction(()=>JSON.parse(localStorage.getItem('bubbletasks_plain_v1')).dailyTracker.days['2026-10-31'].notes==='Updated on second device');await a.locator('#dailyTrackerView').waitFor();assert.equal(await a.getByLabel('Daily notes').inputValue(),'Updated on second device');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: all Day widgets, average mood, symptom completion/group recall, focus history, sleep duration, notes/Day navigation, draft preservation, backups, reload, mobile sizing, two-device sync, and revision-aware Notion upload. Simulated services.');
})().catch(e=>{console.error(e);process.exit(1)});

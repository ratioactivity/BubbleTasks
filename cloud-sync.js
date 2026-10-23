/* Public browser credentials; access to saves is enforced by Supabase RLS. */
(() => {
  const URL_BASE = 'https://ejrnkaigdstalaypyhhp.supabase.co';
  const API_KEY = 'sb_publishable_Qe_bJpZQLlm-CGoPnmhqFQ_aOxXtGhN';
  const SAVE = 'bubbletasks_plain_v1';
  const SESSION = 'bubbletasks_cloud_session_v1';
  const BACKUP_OPTION = 'bubbletasks_cloud_download_backup_v1';
  const OWNER = 'bubbletasks_cloud_owner_v1';
  const META = 'bubbletasks_cloud_meta_v1:';
  const FIELDS = ['tasks', 'archived', 'bored', 'completions', 'agenda', 'storyDetails', 'calendarEvents'];
  const rawSet = Storage.prototype.setItem;
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => rawSet.call(localStorage, key, JSON.stringify(value));
  const stable = (v) => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
  const snapshot = () => {
    const local = read(SAVE) || {};
    return Object.fromEntries(FIELDS.map(k => [k, local[k] ?? (['agenda','storyDetails'].includes(k) ? {} : [])]));
  };
  const valid = (data) => data && typeof data === 'object' && !Array.isArray(data)
    && ['tasks','archived','bored','completions'].every(k => Array.isArray(data[k]))
    && data.agenda && typeof data.agenda === 'object' && !Array.isArray(data.agenda)
    && data.storyDetails && typeof data.storyDetails === 'object' && !Array.isArray(data.storyDetails)
    && (data.calendarEvents === undefined || Array.isArray(data.calendarEvents));
  let session = read(SESSION), meta = null, ready = false, running = false, epoch = 0, refreshPromise = null;
  let conflict = false, pendingRemote = null, timer = null, ui, authDialog;
  let message = 'Local save · not signed in';
  const dirty = () => !meta || stable(snapshot()) !== meta.base;
  const persistMeta = () => write(META + session.user.id, meta);
  const setMessage = (text) => { message = text; paint(); };
  const paint = () => {
    if (!ui) return;
    ui.querySelector('[data-sync-status]').textContent = message;
    ui.querySelector('[data-account]').textContent = session?.user?.email || '';
    ui.querySelector('[data-cloud-login]').hidden = !!session?.user && !message.includes('sign in again');
    ui.querySelector('[data-cloud-logout]').hidden = !session;
    ui.querySelector('[data-sync-now]').hidden = !session?.user;
    ui.querySelector('[data-cloud-upload]').hidden = !session?.user || (!conflict && ready);
    ui.querySelector('[data-cloud-download]').hidden = !pendingRemote;
    ui.querySelectorAll('button').forEach(b => b.disabled = running);
  };
  const keepRecovery = (reason, data = read(SAVE)) => {
    const key = 'bubbletasks_recovery_v1';
    const backups = read(key) || [];
    backups.push({savedAt:new Date().toISOString(), reason, data});
    write(key, backups.slice(-10));
  };
  const downloadLocal = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(read(SAVE), null, 2)], {type:'application/json'}));
    a.download = 'bubbletasks-before-cloud-change-' + Date.now() + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const authRequest = async (path, body, token) => {
    const response = await fetch(URL_BASE + '/auth/v1/' + path, {
      method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
      headers:{apikey:API_KEY, 'Content-Type':'application/json', ...(token ? {Authorization:'Bearer ' + token} : {})},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Sign-in request failed.');
    return data;
  };
  const saveSession = (data) => {
    session = {...data, expires_at:data.expires_at || Math.floor(Date.now()/1000) + (data.expires_in || 3600)};
    write(SESSION, session);
  };
  const token = async () => {
    if (!session?.access_token) throw new Error('Please sign in again. Your local save is safe.');
    if ((session.expires_at || 0) * 1000 > Date.now() + 60000) return session.access_token;
    if (!refreshPromise) {
      const refresh = session.refresh_token, version = epoch;
      refreshPromise = authRequest('token?grant_type=refresh_token', {refresh_token:refresh})
        .then(data => { if (epoch !== version) throw new Error('Account changed.'); saveSession(data); return data.access_token; })
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  };
  const request = async (path, method='GET', body) => {
    const accessToken = await token();
    const response = await fetch(URL_BASE + '/rest/v1/bubbletasks_saves' + path, {
      method, signal:AbortSignal.timeout(15000),
      headers:{apikey:API_KEY, Authorization:'Bearer ' + accessToken, 'Content-Type':'application/json', Prefer:'return=representation'},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 409) return null;
      if (response.status === 401) throw new Error('Please sign in again. Your changes remain saved on this device.');
      throw new Error(data?.message || 'Could not reach your online save. Your changes remain on this device.');
    }
    return data;
  };
  const fetchRemote = async (id) => {
    const rows = await request('?user_id=eq.' + encodeURIComponent(id) + '&select=data,revision');
    if (!Array.isArray(rows)) throw new Error('Could not read the online save.');
    if (!rows.length) return null;
    if (!valid(rows[0].data) || !Number.isSafeInteger(rows[0].revision)) throw new Error('Online save format is unexpected; no saves were replaced.');
    return rows[0];
  };
  const canReload = () => !document.querySelector('dialog[open]') && !document.activeElement?.matches('input,textarea,select,[contenteditable=true]');
  const applyRemote = (remote) => {
    keepRecovery('Before loading online save');
    const current = read(SAVE) || {};
    write(SAVE, {...current, ...remote.data, migratedV2Tasks:true});
    meta = {revision:remote.revision, base:stable(remote.data)};
    persistMeta(); write(OWNER, session.user.id);
    location.reload();
  };
  const showConflict = (remote, text) => {
    ready = false; conflict = true; pendingRemote = remote;
    setMessage(text || 'Both saves changed. Choose which version to keep.');
  };
  const acknowledge = (remote, sent) => {
    meta = {revision:remote.revision, base:stable(sent)};
    persistMeta(); write(OWNER, session.user.id);
    ready = true; conflict = false; pendingRemote = null;
    setMessage(dirty() ? 'Changes saved locally · waiting to upload' : 'Synced · ' + new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}));
    if (dirty()) schedule();
  };
  async function sync() {
    if (!session?.user?.id || running) return;
    running = true; paint();
    const id = session.user.id, version = epoch;
    try {
      const remote = await fetchRemote(id);
      if (epoch !== version) return;
      if (!ready) {
        if (conflict) { pendingRemote = remote; paint(); return; }
        if (!meta || read(OWNER) !== id) {
          showConflict(remote, remote ? 'Online save found. Choose “Use online save” to load it, or explicitly replace it with this device’s save.' : 'No online save yet. On your most up-to-date device, choose “Upload this device’s save” to start.');
          return;
        }
        ready = true;
      }
      const local = snapshot();
      if (!remote) {
        showConflict(null, 'The online save is missing. Choose Upload to recreate it from this device.'); return;
      }
      if (stable(remote.data) === stable(local)) { acknowledge(remote, local); return; }
      if (remote.revision !== meta.revision) {
        if (!dirty()) {
          pendingRemote = remote;
          if (canReload()) { applyRemote(remote); return; }
          setMessage('New online save ready · finish editing, then choose Use online save.');
          return;
        }
        showConflict(remote); return;
      }
      if (!dirty()) { setMessage('Synced'); return; }
      setMessage('Syncing…');
      const rows = await request('?user_id=eq.' + encodeURIComponent(id) + '&revision=eq.' + remote.revision, 'PATCH', {data:local});
      if (epoch !== version) return;
      if (!Array.isArray(rows) || rows.length !== 1) { showConflict(await fetchRemote(id)); return; }
      if (!Number.isSafeInteger(rows[0].revision) || rows[0].revision <= remote.revision) throw new Error('The save revision trigger needs setup. Keep this device open and check the SQL setup.');
      acknowledge(rows[0], local);
    } catch (error) {
      if (epoch === version) setMessage(navigator.onLine ? error.message : 'Offline · changes saved on this device');
    } finally { running = false; paint(); }
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(sync, 1000); };
  Storage.prototype.setItem = function(key, value) {
    rawSet.call(this, key, value);
    if (this === localStorage && key === SAVE && session && ready && dirty()) {
      setMessage('Changes saved locally · waiting to upload'); schedule();
    }
  };
  const startSession = async (data) => {
    epoch++; const version = epoch; ready = false; conflict = false; pendingRemote = null;
    saveSession(data);
    meta = data.user?.id ? read(META + data.user.id) : null;
    const user = await authRequest('user', undefined, await token());
    if (epoch !== version) return;
    session.user = user; write(SESSION, session);
    meta = read(META + user.id);
    setMessage('Checking your online save…');
    authDialog.close(); await sync();
  };
  async function chooseUpload() {
    if (!session?.user?.id || running) return;
    if (!confirm('Upload this device’s current save? If an online save exists, it will be replaced.' + (ui.querySelector('[data-cloud-backup]').checked ? ' A backup of the online save will be downloaded first.' : ''))) return;
    running = true; paint();
    const id = session.user.id, version = epoch;
    try {
      const remote = await fetchRemote(id);
      if (epoch !== version) return;
      if (remote) {
        keepRecovery('Online save before explicit replacement', remote.data);
        if (ui.querySelector('[data-cloud-backup]').checked) {
        const a = document.createElement('a');
        a.href=URL.createObjectURL(new Blob([JSON.stringify(remote.data,null,2)],{type:'application/json'}));
        a.download='bubbletasks-online-before-replace-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        }
      }
      keepRecovery('Before uploading this device');
      const sent = snapshot();
      const rows = await request(remote ? '?user_id=eq.' + encodeURIComponent(id) + '&revision=eq.' + remote.revision : '', remote ? 'PATCH' : 'POST', remote ? {data:sent} : {user_id:id,data:sent});
      if (epoch !== version) return;
      if (!Array.isArray(rows) || rows.length !== 1) { showConflict(await fetchRemote(id)); return; }
      acknowledge(rows[0], sent);
    } catch(error) { if(epoch===version)setMessage(error.message); }
    finally { running=false;paint(); }
  }
  window.addEventListener('DOMContentLoaded', async () => {
    ui = document.getElementById('cloudSyncPanel');
    authDialog = document.getElementById('cloudAuthDialog');
    if (!ui || !authDialog) return;
    const backupOption = ui.querySelector('[data-cloud-backup]');
    backupOption.checked = read(BACKUP_OPTION) === true;
    backupOption.addEventListener('change', () => write(BACKUP_OPTION, backupOption.checked));
    paint();
    ui.querySelector('[data-cloud-login]').onclick=()=>authDialog.showModal();
    ui.querySelector('[data-sync-now]').onclick=sync;
    ui.querySelector('[data-cloud-upload]').onclick=chooseUpload;
    ui.querySelector('[data-cloud-download]').onclick=()=>{
      if (!pendingRemote || !session) return;
      if (!confirm('Load the online save on this device? This replaces the current local save.' + (backupOption.checked ? ' A backup of this device’s save will be downloaded first.' : ''))) return;
      if (backupOption.checked) downloadLocal();
      applyRemote(pendingRemote);
    };
    ui.querySelector('[data-cloud-logout]').onclick=async()=>{
      if(running)return;
      if(dirty() && !confirm('Some changes may only be saved on this device. Sign out and keep the local copy?'))return;
      const old=session; epoch++;session=null;ready=false;meta=null;conflict=false;pendingRemote=null;
      localStorage.removeItem(SESSION);clearTimeout(timer);setMessage('Signed out · local save kept on this device');
      authRequest('logout?scope=local',{},old.access_token).catch(()=>{});
    };
    document.getElementById('cancelCloudAuth').onclick=()=>authDialog.close();
    const form=document.getElementById('cloudAuthForm'), feedback=document.getElementById('cloudAuthFeedback');
    form.addEventListener('submit',async(event)=>{
      event.preventDefault();const action=event.submitter?.value || 'login';
      const email=form.elements.email.value.trim(),password=form.elements.password.value;
      if(!email || (action!=='link'&&!password)){feedback.textContent='Enter your email and password, or choose the email-link option.';return;}
      if(action==='signup'&&password.length<8){feedback.textContent='Use a password with at least 8 characters.';return;}
      form.querySelectorAll('button').forEach(b=>b.disabled=true);feedback.textContent='Connecting…';
      try{
        if(action==='link'){
          await authRequest('otp?redirect_to='+encodeURIComponent('https://ratioactivity.github.io/BubbleTasks/'),{email,create_user:true});
          feedback.textContent='Check your email for a sign-in link. Open it on this device.';
        }else{
          const data=await authRequest(action==='signup'?'signup?redirect_to='+encodeURIComponent('https://ratioactivity.github.io/BubbleTasks/'):'token?grant_type=password',{email,password});
          if(data.access_token){await startSession(data);form.elements.password.value='';}
          else feedback.textContent='Check your email to confirm your account, then return here to sign in.';
        }
      }catch(error){feedback.textContent=error.message;}
      finally{form.querySelectorAll('button').forEach(b=>b.disabled=false);}
    });
    const hash=new URLSearchParams(location.hash.slice(1));
    if(hash.has('access_token') || hash.has('error_description')){
      history.replaceState(null,'',location.pathname+location.search);
      if(hash.has('error_description')){feedback.textContent=hash.get('error_description');authDialog.showModal();}
      else try{await startSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in'))||3600});}
      catch(error){setMessage(error.message);}
    }
    else if(session?.access_token){try{await startSession(session);}catch(error){setMessage(error.message);}}
    setInterval(()=>{if(document.visibilityState==='visible')sync();},15000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
    window.addEventListener('online',sync);
    window.addEventListener('offline',()=>{if(session)setMessage('Offline · changes saved on this device');});
    window.addEventListener('storage',(event)=>{
      if(event.key===SESSION){location.reload();}
      else if(event.key===SAVE&&event.newValue!==event.oldValue){location.reload();}
    });
  });
})();


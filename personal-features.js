/* Account-bound feature activation. This is a UI gate, not encryption or server authorization. */
(() => {
  const SAVE='bubbletasks_plain_v1',MODE='bubbletasks_workspace_v1',SESSION='bubbletasks_cloud_session_v1';
  const read=key=>{try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}};
  const account=()=>{const mode=read(MODE),session=read(SESSION);return mode.mode==='account'&&mode.id&&session.user?.id===mode.id?mode.id:null;};
  const isEnabled=()=>{const id=account(),activation=read(SAVE).personalFeatures;return Boolean(id&&!window.BubbleTasksWorkspace?.isGuest()&&activation?.version===1&&activation.accountId===id&&activation.enabled===true);};
  window.BubbleTasksPersonal={isEnabled};
  document.documentElement.classList.toggle('personal-features-locked',!isEnabled());
  window.addEventListener('DOMContentLoaded',()=>{
    if(isEnabled())return;
    const button=document.createElement('button');button.type='button';button.className='personal-features-button';button.textContent='Activate personal features';button.hidden=!account();document.querySelector('.toolbar')?.append(button);
    const dialog=document.createElement('dialog');dialog.className='personal-features-dialog';dialog.setAttribute('aria-label','Activate personal features');
    const form=document.createElement('form'),heading=document.createElement('h2'),description=document.createElement('p'),label=document.createElement('label'),input=document.createElement('input'),error=document.createElement('p'),actions=document.createElement('div'),cancel=document.createElement('button'),submit=document.createElement('button');
    heading.textContent='Activate Personal Features';description.textContent='Unlock Bubblemarks, Daily Tracker, and Today’s Agenda for this account. Existing saved data stays intact.';label.textContent='Activation password';input.type='password';input.required=true;input.autocomplete='off';label.append(input);error.setAttribute('role','alert');cancel.type='button';cancel.textContent='Cancel';submit.type='submit';submit.textContent='Activate';actions.append(cancel,submit);form.append(heading,description,label,error,actions);dialog.append(form);document.body.append(dialog);
    button.addEventListener('click',()=>{input.value='';error.textContent='';dialog.showModal();input.focus();});cancel.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>input.value='');
    form.addEventListener('submit',async event=>{
      event.preventDefault();const id=account();if(!id){error.textContent='Sign in to your account first.';return;}submit.disabled=true;error.textContent='';
      try{
        const password=input.value;input.value='';const token=await window.BubbleTasksCloud.getAccessToken();
        const response=await fetch('https://ejrnkaigdstalaypyhhp.supabase.co/functions/v1/personal-features-activate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({password}),signal:AbortSignal.timeout(15000)});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw Error(response.status===403?'That password doesn’t match. Please try again.':result.error||'The activation service is not ready yet. Please try again after setup.');
        if(result.accountId!==id||result.enabled!==true)throw Error('Activation could not be confirmed. Please try again.');
        if(account()!==id)throw Error('Your account changed. Please sign in and try again.');
        localStorage.setItem(SAVE,JSON.stringify({...read(SAVE),personalFeatures:{version:1,accountId:id,enabled:true}}));location.reload();
      }catch(e){error.textContent=e.message||'Could not activate. Please try again.';}finally{submit.disabled=false;}
    });
  });
})();

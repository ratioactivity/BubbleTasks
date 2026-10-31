/* Notes share the existing task save, online sync, and backup document. */
(() => {
  const SAVE = 'bubbletasks_plain_v1', VIEW = 'bubbletasks_notes_view_v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } };
  const tagKey = tag => tag.toLocaleLowerCase();
  const tagParts = text => String(text).split(/[\s,#]+/u).map(t => t.replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 80)).filter(Boolean);
  const unique = tags => { const seen=new Set();return tags.filter(t=>{const key=tagKey(t);if(seen.has(key))return false;seen.add(key);return true;}); };
  const normalize = value => Array.isArray(value) ? value.filter(n => n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string')
    .map(n => ({id:n.id, title:n.title.slice(0,200), body:n.body.slice(0,50000), tags:unique((Array.isArray(n.tags)?n.tags:[]).flatMap(tagParts)),
      createdAt:typeof n.createdAt==='string'?n.createdAt:'', updatedAt:typeof n.updatedAt==='string'?n.updatedAt:''})) : [];
  let notes = normalize(read().notes);
  const previousSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    if (this===localStorage && key===SAVE) {
      const data=JSON.parse(value); data.notes=notes; value=JSON.stringify(data);
    }
    return previousSet.call(this,key,value);
  };
  window.addEventListener('bubbletasks-backup-import', event => {
    if (event.detail?.notes!==undefined) {
      notes=normalize(event.detail.notes);
      window.dispatchEvent(new Event('bubbletasks-notes-restored'));
    }
  });
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const button=(text,action,cls='')=>{const el=node('button',cls,text);el.type='button';el.addEventListener('click',action);return el;};
  window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('boardContainer'), layout=document.getElementById('layoutToggleButton');
    const taskForm=document.querySelector('.task-form');
    const toggle=button('Notes',()=>setView(!showing));
    toggle.id='notesToggleButton';layout.after(toggle);
    const view=node('section','notes-view');view.id='notesView';view.setAttribute('aria-label','Notes');board.after(view);
    const top=node('div','notes-top'), heading=node('h2','','Notes');
    const add=button('+ New note',()=>openEditor(), 'notes-primary');add.id='addNoteButton';top.append(heading,add);
    const search=node('input','notes-search');search.type='search';search.placeholder='Search notes or #hashtags';
    search.setAttribute('aria-label','Search notes or hashtags');search.id='notesSearch';
    const quick=node('div','notes-quick-tags');quick.setAttribute('aria-label','Frequently used hashtags');
    const count=node('p','notes-count');count.setAttribute('role','status');
    const list=node('div','notes-grid');view.append(top,search,quick,count,list);

    const dialog=node('dialog','notes-dialog');dialog.setAttribute('aria-labelledby','noteEditorHeading');dialog.id='noteEditorDialog';
    const form=node('form'), editorHeading=node('h2','','New note');editorHeading.id='noteEditorHeading';
    function field(labelText, el) { const label=node('label','',labelText);label.append(el);return label; }
    const title=node('input');title.name='noteTitle';title.maxLength=200;title.placeholder='A little idea…';
    const body=node('textarea');body.name='noteBody';body.rows=9;body.maxLength=50000;body.placeholder='Write your note here…';
    const tags=node('div','notes-editor-tags');
    const tagInput=node('input');tagInput.id='noteTagInput';tagInput.autocomplete='off';tagInput.spellcheck=false;
    tagInput.setAttribute('aria-label','Add hashtags');tagInput.setAttribute('aria-describedby','noteTagHelp');tagInput.placeholder='#Parallel #BOTA';
    const ghost=node('div','notes-tag-ghost');ghost.setAttribute('aria-hidden','true');
    const tagWrap=node('div','notes-tag-input');tagWrap.append(ghost,tagInput);
    const completion=button('',()=>acceptSuggestion(),'notes-completion');completion.hidden=true;
    completion.setAttribute('aria-label','Accept hashtag suggestion');
    const help=node('small','','Type a hashtag. Tab or → completes a suggestion; Enter or space adds it.');help.id='noteTagHelp';
    const tagLabel=node('label','','Hashtags');tagLabel.htmlFor='noteTagInput';
    const feedback=node('p','notes-error');feedback.setAttribute('role','alert');
    const actions=node('div','notes-editor-actions'), remove=button('Delete note',()=>{
      if(editing && confirm('Delete this note?')) {
        const before=notes;notes=notes.filter(n=>n.id!==editing);
        if(persist(before)){dialog.close();render();add.focus();}
      }
    },'notes-delete');
    const cancel=button('Cancel',()=>closeEditor()), save=node('button','notes-primary','Save note');save.type='submit';
    actions.append(remove,cancel,save);form.append(editorHeading,field('Title',title),field('Note',body),tagLabel,tags,tagWrap,completion,help,feedback,actions);
    dialog.append(form);document.body.append(dialog);
    let showing=localStorage.getItem(VIEW)==='true', editing=null, draftTags=[], initial='', opener=null, suggestion='';
    const signature=()=>JSON.stringify([title.value,body.value,draftTags,tagInput.value]);
    const catalogue=()=>{
      const map=new Map();
      [...notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).forEach(note=>note.tags.forEach(tag=>{
        const key=tagKey(tag), entry=map.get(key);if(entry)entry.count++;else map.set(key,{tag,count:1,used:note.updatedAt});
      }));
      return [...map.values()].sort((a,b)=>b.count-a.count||b.used.localeCompare(a.used)||a.tag.localeCompare(b.tag));
    };
    function setView(on) {
      showing=on;localStorage.setItem(VIEW,String(on));applyView();if(on)render();
    }
    function applyView() {
      if(!showing&&document.getElementById('dayToggleButton')?.getAttribute('aria-pressed')==='true')return;
      board.hidden=showing;taskForm.hidden=showing;view.hidden=!showing;toggle.setAttribute('aria-pressed',String(showing));
      const label=showing?'Layout: notes':'Layout: '+(board.classList.contains('calendar')?'calendar':board.classList.contains('tabs')?'tabs':'columns');
      if(layout.textContent!==label)layout.textContent=label;
    }
    // Add Notes after Calendar in the layout cycle, while retaining direct access from the toolbar.
    layout.addEventListener('click',event=>{
      if(showing){setView(false);return;}
      if(board.classList.contains('calendar')){event.stopImmediatePropagation();setView(true);}
    },true);
    new MutationObserver(applyView).observe(layout,{childList:true});
    function persist(before) {
      try { localStorage.setItem(SAVE,JSON.stringify({...read(),notes}));return true; }
      catch {notes=before;feedback.textContent='Your note could not be saved. Please free some browser storage and try again.';return false;}
    }
    function filterBy(tag) {search.value='#'+tag;render();search.focus();}
    function render() {
      if(!showing)return;
      quick.replaceChildren();
      const known=catalogue(), query=search.value.trim(), terms=query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      if(known.length) {
        quick.append(node('span','','Quick tags:'));
        known.slice(0,8).forEach(({tag})=>{
          const chip=button('#'+tag,()=>filterBy(tag),'notes-tag');
          chip.setAttribute('aria-pressed',String(tagKey(query)==='#'+tagKey(tag)));quick.append(chip);
        });
        if(query)quick.append(button('Show all',()=>{search.value='';render();},'notes-clear'));
      }
      const matching=notes.filter(note=>terms.every(term=>term.startsWith('#')
        ? note.tags.some(tag=>tagKey(tag).includes(term.slice(1)))
        : (note.title+' '+note.body+' '+note.tags.join(' ')).toLocaleLowerCase().includes(term)))
        .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.title.localeCompare(b.title));
      count.textContent=matching.length+' '+(matching.length===1?'note':'notes')+(query?' found':'');
      list.replaceChildren();
      if(!matching.length)list.append(node('p','notes-empty',notes.length?'No notes match. Try another word or hashtag.':'A little space for your ideas. Add your first note above.'));
      matching.forEach(note=>{
        const card=node('article','note-card');
        const heading=node('h3');heading.append(button(note.title||'Untitled note',()=>openEditor(note),'note-title'));
        const text=node('p','note-body',note.body), tagRow=node('div','note-tags');
        note.tags.forEach(tag=>tagRow.append(button('#'+tag,()=>filterBy(tag),'notes-tag')));
        const footer=node('div','note-footer'), edited=node('small');
        const date=new Date(note.updatedAt);if(!Number.isNaN(date.getTime()))edited.textContent='Updated '+date.toLocaleDateString();
        footer.append(edited,button('Edit',()=>openEditor(note),'note-edit'));
        card.append(heading,text,tagRow,footer);list.append(card);
      });
    }
    function redrawTags() {
      tags.replaceChildren();
      draftTags.forEach(tag=>{
        const chip=button('#'+tag+' ×',()=>{draftTags=draftTags.filter(t=>tagKey(t)!==tagKey(tag));redrawTags();updateSuggestion();tagInput.focus();},'notes-tag');
        chip.setAttribute('aria-label','Remove hashtag '+tag);tags.append(chip);
      });
    }
    function addTags(text) {
      const known=catalogue();draftTags=unique([...draftTags,...tagParts(text).map(tag=>known.find(t=>tagKey(t.tag)===tagKey(tag))?.tag||tag)]);
      tagInput.value='';redrawTags();updateSuggestion();
    }
    function updateSuggestion() {
      const text=tagInput.value, prefix=text.replace(/^#/,'');
      suggestion=prefix && !/[\s,#]/u.test(prefix) ? (catalogue().find(({tag})=>tagKey(tag).startsWith(tagKey(prefix))&&!draftTags.some(t=>tagKey(t)===tagKey(tag)))?.tag||'') : '';
      ghost.replaceChildren();
      if(suggestion) {
        const typed=node('span','',text);typed.style.visibility='hidden';ghost.append(typed,document.createTextNode(suggestion.slice(prefix.length)));
      }
      completion.hidden=!suggestion;completion.textContent=suggestion?'Complete #'+suggestion+' ↹':'';
    }
    function acceptSuggestion() {if(suggestion)addTags(suggestion);tagInput.focus();}
    function openEditor(note) {
      editing=note?.id||null;opener=document.activeElement;draftTags=[...(note?.tags||[])];
      title.value=note?.title||'';body.value=note?.body||'';tagInput.value='';feedback.textContent='';
      editorHeading.textContent=note?'Edit note':'New note';remove.hidden=!note;redrawTags();updateSuggestion();
      initial=signature();dialog.showModal();title.focus();
    }
    function closeEditor() {if(signature()===initial||confirm('Discard your unsaved note changes?'))dialog.close();}
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
    dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
    tagInput.addEventListener('input',updateSuggestion);
    tagInput.addEventListener('keydown',event=>{
      if(event.isComposing)return;
      if((event.key==='Tab'||event.key==='ArrowRight')&&suggestion&&tagInput.selectionStart===tagInput.value.length&&tagInput.selectionEnd===tagInput.value.length&&!event.shiftKey){
        event.preventDefault();acceptSuggestion();
      } else if((event.key==='Enter'||event.key===' '||event.key===',')&&tagInput.value.trim()){
        event.preventDefault();addTags(tagInput.value);
      }
    });
    tagInput.addEventListener('paste',event=>{
      const text=event.clipboardData?.getData('text')||'';
      if(/[\s,]/u.test(text)){event.preventDefault();addTags(tagInput.value+text);}
    });
    tagInput.addEventListener('scroll',()=>{ghost.scrollLeft=tagInput.scrollLeft;});
    form.addEventListener('submit',event=>{
      event.preventDefault();feedback.textContent='';
      if(!title.value.trim()&&!body.value.trim()){feedback.textContent='Give your note a title or some text.';title.focus();return;}
      if(tagInput.value.trim())addTags(tagInput.value);
      const now=new Date().toISOString(), existing=notes.find(n=>n.id===editing), before=notes;
      const note={id:editing||crypto.randomUUID(),title:title.value.trim(),body:body.value,tags:[...draftTags],createdAt:existing?.createdAt||now,updatedAt:now};
      notes=editing?notes.map(n=>n.id===editing?note:n):[note,...notes];
      if(persist(before)){dialog.close();render();}
    });
    search.addEventListener('input',render);
    window.addEventListener('bubbletasks-notes-restored',render);
    applyView();render();
  });
})();


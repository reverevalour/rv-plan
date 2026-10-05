const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];
const STORAGE_KEY='rvplan.tasks.v1';
let tasks=loadTasks();
let currentView='today';
let notified=new Set(JSON.parse(localStorage.getItem('rvplan.notified')||'[]'));

function loadTasks(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}}
function saveTasks(){localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks)); updateBadge();}
function uid(){return (crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2))}
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function endOfDay(d){const x=new Date(d);x.setHours(23,59,59,999);return x}
function tomorrow(){const d=new Date();d.setDate(d.getDate()+1);return d}
function fmtDateTime(iso){if(!iso)return 'Без дати';const d=new Date(iso);return new Intl.DateTimeFormat('uk-UA',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d)}
function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function inferCategory(text){const t=text.toLowerCase();
  if(/rvmove|sprinter|crafter|переїзд|перевез|машин|бус|клієнт|вантаж|мебл/.test(t))return 'RVMOVE';
  if(/revere|valour|годин|laser|лазер|грав|3d|друк|supplier|виробник|циферблат/.test(t))return 'Revere Valour';
  if(/документ|рахунок|invoice|rechnung|gemeinde|соціал|vertrag|договір|лист|unterlagen/.test(t))return 'Documents';
  return 'Personal';
}

function parseNatural(input){
  let text=input.trim(); const now=new Date(); let due=null;
  let d=new Date(now); let matchedDate=false;
  if(/післязавтра/i.test(text)){d.setDate(d.getDate()+2);matchedDate=true;text=text.replace(/післязавтра/ig,'').trim()}
  else if(/завтра/i.test(text)){d.setDate(d.getDate()+1);matchedDate=true;text=text.replace(/завтра/ig,'').trim()}
  else if(/сьогодні/i.test(text)){matchedDate=true;text=text.replace(/сьогодні/ig,'').trim()}
  else {
    const m=text.match(/\b(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?\b/);
    if(m){const year=m[3]?(m[3].length===2?2000+Number(m[3]):Number(m[3])):now.getFullYear();d=new Date(year,Number(m[2])-1,Number(m[1]));matchedDate=true;text=text.replace(m[0],'').trim()}
  }
  const tm=text.match(/(?:\bо\s*|\bв\s*)?(\d{1,2})(?::|\.)(\d{2})\b|\b(?:о|в)\s*(\d{1,2})\b/i);
  let hh=9,mm=0;
  if(tm){hh=Number(tm[1]??tm[3]);mm=Number(tm[2]??0);text=text.replace(tm[0],'').trim();matchedDate=true}
  if(matchedDate){d.setHours(hh,mm,0,0);due=d.toISOString()}
  text=text.replace(/^[-,;:\s]+|[-,;:\s]+$/g,'').replace(/\s{2,}/g,' ');
  return {title:text||input.trim(),due};
}

function addTask(){const raw=$('#quickInput').value.trim();if(!raw)return toast('Напиши або продиктуй задачу');
  const parsed=parseNatural(raw);const selected=$('#categorySelect').value;const category=selected==='auto'?inferCategory(parsed.title):selected;
  tasks.unshift({id:uid(),title:parsed.title,due:parsed.due,category,done:false,createdAt:new Date().toISOString()});
  saveTasks();$('#quickInput').value='';render();toast('Додано');
}

function inView(task){if(currentView==='all')return true;if(!task.due)return currentView==='later';const d=new Date(task.due), now=new Date();
  if(currentView==='today')return d>=startOfDay(now)&&d<=endOfDay(now);
  if(currentView==='tomorrow'){const t=tomorrow();return d>=startOfDay(t)&&d<=endOfDay(t)}
  if(currentView==='later')return d>endOfDay(tomorrow())||!task.due;
}

function render(){
  const visible=tasks.filter(inView).sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;if(!a.due)return 1;if(!b.due)return -1;return new Date(a.due)-new Date(b.due)});
  $('#taskList').innerHTML=visible.map(t=>`<article class="task ${t.done?'done':''}" data-id="${t.id}">
    <button class="check" data-action="toggle" aria-label="Виконано">${t.done?'✓':''}</button>
    <div><div class="task-title">${escapeHtml(t.title)}</div><div class="meta"><span class="chip">${escapeHtml(t.category)}</span><span class="chip time">${fmtDateTime(t.due)}</span></div></div>
    <button class="menu-btn" data-action="delete" aria-label="Видалити">⋯</button>
  </article>`).join('');
  $('#emptyState').classList.toggle('hidden',visible.length>0);
  $('#openCount').textContent=tasks.filter(t=>!t.done).length;$('#doneCount').textContent=tasks.filter(t=>t.done).length;
  updateBadge();
}

$('#taskList').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;const card=e.target.closest('.task');const t=tasks.find(x=>x.id===card.dataset.id);if(!t)return;
  if(btn.dataset.action==='toggle'){t.done=!t.done;saveTasks();render()}
  if(btn.dataset.action==='delete'){if(confirm('Видалити цю задачу?')){tasks=tasks.filter(x=>x.id!==t.id);saveTasks();render()}}
});
$('#addBtn').addEventListener('click',addTask);
$('#quickInput').addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')addTask()});
$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentView=btn.dataset.view;render()}));

function setupVoice(){const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;const hint=$('#voiceHint');
  if(!SpeechRecognition){hint.textContent='На цьому iPhone використай мікрофон на системній клавіатурі для диктування.';$('#micBtn').addEventListener('click',()=>{$('#quickInput').focus();toast('Відкрий клавіатуру й натисни 🎙 диктування')});return}
  const rec=new SpeechRecognition();rec.lang='uk-UA';rec.interimResults=true;rec.continuous=false;
  rec.onstart=()=>{$('#micBtn').classList.add('listening');hint.textContent='Слухаю…'};
  rec.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript;$('#quickInput').value=text};
  rec.onerror=()=>{hint.textContent='Голос не розпізнано. Можна використати диктування клавіатури.'};
  rec.onend=()=>{$('#micBtn').classList.remove('listening');hint.textContent=''};
  $('#micBtn').addEventListener('click',()=>rec.start());
}
setupVoice();

$('#settingsBtn').addEventListener('click',()=>$('#settingsDialog').showModal());
$('#notifyBtn').addEventListener('click',async()=>{if(!('Notification' in window))return toast('Сповіщення не підтримуються');const p=await Notification.requestPermission();toast(p==='granted'?'Сповіщення дозволені':'Дозвіл не надано')});
$('#testNotifyBtn').addEventListener('click',()=>{if(Notification.permission!=='granted')return toast('Спочатку увімкни сповіщення');new Notification('RV Plan',{body:'Тестове сповіщення працює ✓',icon:'icons/icon-192.png'})});
$('#clearDoneBtn').addEventListener('click',()=>{tasks=tasks.filter(t=>!t.done);saveTasks();render();toast('Виконані очищено')});

function checkDue(){if(!('Notification'in window)||Notification.permission!=='granted')return;const now=Date.now();for(const t of tasks){if(t.done||!t.due||notified.has(t.id))continue;const due=new Date(t.due).getTime();if(due<=now&&due>now-10*60*1000){new Notification('RV Plan',{body:t.title,icon:'icons/icon-192.png',tag:t.id});notified.add(t.id)}}localStorage.setItem('rvplan.notified',JSON.stringify([...notified]))}
setInterval(checkDue,30000);checkDue();

async function updateBadge(){const n=tasks.filter(t=>!t.done).length;try{if(n&&navigator.setAppBadge)await navigator.setAppBadge(n);else if(navigator.clearAppBadge)await navigator.clearAppBadge()}catch{}}

$('#backupBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rv-plan-backup.json';a.click();URL.revokeObjectURL(a.href);toast('Резервну копію створено')});

function toast(msg){const old=$('.toast');if(old)old.remove();const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
render();

/* ============================================================================
 *  1. 데이터 모델 & 샘플 데이터
 *  스키마: { id, title, type, customType?, date, startTime?, endTime?, memo?, source }
 *  type: "exam" | "assignment" | "etc" | "custom"
 * ========================================================================== */
const TYPE_LABEL = { exam:"시험", assignment:"과제", present:"발표", etc:"기타", custom:"기타", todo:"할일" };
const TYPE_PRIORITY = { exam:0, assignment:1, present:2, etc:3, custom:4, todo:5 }; // 시험·과제·발표 우선
const TYPE_COLOR = { exam:'#3F6B8E', assignment:'#5E87A8', present:'#4E86A0', etc:'#8AA6BC', custom:'#5C93A6', todo:'#9DB4C4' };

const SAMPLE_EVENTS = [
  // 기본 일정 없음 — 사용자가 추가한 일정/할일만 표시됩니다.
];

/* ============================================================================
 *  2. 저장소 어댑터 계층
 *  - 지금은 LocalStorage 사용
 *  - 나중에 Firebase / Supabase 로 교체할 수 있도록 동일 인터페이스로 분리
 * ========================================================================== */
const LocalStorageAdapter = {
  _note:(date)=>`planner:note:${date}`,
  _USER_EVENTS:"planner:userEvents",
  _DONE:"planner:doneMap",
  getDayNote(date){
    try { return localStorage.getItem(this._note(date)) || ""; }
    catch(e){ return ""; }
  },
  setDayNote(date, text){
    try { localStorage.setItem(this._note(date), text); } catch(e){}
  },
  getUserEvents(){
    try { return JSON.parse(localStorage.getItem(this._USER_EVENTS) || "[]"); }
    catch(e){ return []; }
  },
  setUserEvents(arr){
    try { localStorage.setItem(this._USER_EVENTS, JSON.stringify(arr)); } catch(e){}
  },
  getDoneMap(){
    try { return JSON.parse(localStorage.getItem(this._DONE) || "{}"); }
    catch(e){ return {}; }
  },
  setDoneMap(map){
    try { localStorage.setItem(this._DONE, JSON.stringify(map)); } catch(e){}
  },
  getDeleted(){
    try { return JSON.parse(localStorage.getItem("planner:deleted") || "[]"); }
    catch(e){ return []; }
  },
  setDeleted(arr){
    try { localStorage.setItem("planner:deleted", JSON.stringify(arr)); } catch(e){}
  },
  getTypeMap(){
    try { return JSON.parse(localStorage.getItem("planner:typeMap") || "{}"); }
    catch(e){ return {}; }
  },
  setTypeMap(map){
    try { localStorage.setItem("planner:typeMap", JSON.stringify(map)); } catch(e){}
  },
  getTodoMeta(){
    try { return JSON.parse(localStorage.getItem("planner:todoMeta") || "{}"); }
    catch(e){ return {}; }
  },
  setTodoMeta(map){
    try { localStorage.setItem("planner:todoMeta", JSON.stringify(map)); } catch(e){}
  },
  getSubjectTags(){
    try { const v = localStorage.getItem("planner:subjectTags"); return v ? JSON.parse(v) : null; }
    catch(e){ return null; }
  },
  setSubjectTags(arr){
    try { localStorage.setItem("planner:subjectTags", JSON.stringify(arr)); } catch(e){}
  },
  getTemplates(){
    try { const v = localStorage.getItem("planner:templates"); return v ? JSON.parse(v) : null; }
    catch(e){ return null; }
  },
  setTemplates(arr){
    try { localStorage.setItem("planner:templates", JSON.stringify(arr)); } catch(e){}
  },
  getPinnedDday(){
    try { return JSON.parse(localStorage.getItem("planner:pinnedDday") || "[]"); }
    catch(e){ return []; }
  },
  setPinnedDday(arr){
    try { localStorage.setItem("planner:pinnedDday", JSON.stringify(arr)); } catch(e){}
  },
  getExamRecords(){
    try { return JSON.parse(localStorage.getItem("planner:examRecords") || "[]"); }
    catch(e){ return []; }
  },
  setExamRecords(arr){
    try { localStorage.setItem("planner:examRecords", JSON.stringify(arr)); } catch(e){}
  },
  getWeeklyPlans(){
    try { return JSON.parse(localStorage.getItem("planner:weeklyPlans") || "[]"); }
    catch(e){ return []; }
  },
  setWeeklyPlans(arr){
    try { localStorage.setItem("planner:weeklyPlans", JSON.stringify(arr)); } catch(e){}
  }
};

/* 향후 클라우드 동기화 어댑터 (갤럭시 ↔ 아이패드 동일 데이터) — 인터페이스만 정의 */
const CloudSyncAdapter = {
  async getDayNote(date){ /* TODO: Firestore/Supabase 에서 읽기 */ return ""; },
  async setDayNote(date, text){ /* TODO: Firestore/Supabase 에 쓰기 */ },
  async getUserEvents(){ /* TODO: 원격 events 컬렉션 읽기 */ return []; },
  async setUserEvents(arr){ /* TODO: 원격에 쓰기/동기화 */ },
  async getDoneMap(){ /* TODO */ return {}; },
  async setDoneMap(map){ /* TODO */ },
  async getDeleted(){ /* TODO */ return []; },
  async setDeleted(arr){ /* TODO */ },
  async getTypeMap(){ /* TODO */ return {}; },
  async setTypeMap(map){ /* TODO */ },
  async getTemplates(){ /* TODO */ return null; },
  async setTemplates(arr){ /* TODO */ },
  async getPinnedDday(){ /* TODO */ return []; },
  async setPinnedDday(arr){ /* TODO */ },
  async getExamRecords(){ /* TODO */ return []; },
  async setExamRecords(arr){ /* TODO */ },
  async getWeeklyPlans(){ /* TODO */ return []; },
  async setWeeklyPlans(arr){ /* TODO */ },
  async fetchEvents(){ /* TODO: 원격 events 컬렉션 읽기 */ return []; }
};

/* 사용자가 지정한 유형(자동분류보다 우선) — id 기준 */
let typeOverrides = {};

/* ===== 할일 과목 태그 + 할일 메타(시작/종료/태그) ===== */
const DEFAULT_TAGS = [
  { name:'수학', color:'#5E87A8' },
  { name:'물리', color:'#6FA08B' },
  { name:'화학', color:'#C58F6E' },
  { name:'현강', color:'#4E86A0' },
  { name:'종합', color:'#8E7BB0' },
  { name:'정리', color:'#7B9BB0' },
  { name:'휴식', color:'#B6C5D0' },
  { name:'기타', color:'#9DB4C4' }
];
const TAG_PALETTE = ['#5E87A8','#6FA08B','#C58F6E','#9DB4C4','#8E7BB0','#B07B97','#7B9BB0','#A8995E','#6E9CC5'];
let subjectTags = DEFAULT_TAGS.slice();      // [{name,color}]
let todoMeta = {};                            // { todoId: {start,end,tag} }

let studyTemplates = [];
let selectedTemplateId = null;
let pinnedDdayIds = [];
let examRecords = [];
let weeklyPlans = [];
let weeklyModalMonth = null;
let weeklyEditingId = null;
let weeklyEditDraft = null;
let weeklySummaryOpen = false;
let timerLogs = [];
let activeFocusTimer = null;
let focusTickHandle = null;
let selectedTimerSubject = '수학';

const DEFAULT_TEMPLATES = [
  { id:'tpl-standard', name:'표준형', blocks:[
    {start:'08:00',end:'09:30',title:'수학',tag:'수학'},
    {start:'09:40',end:'11:10',title:'물리',tag:'물리'},
    {start:'11:20',end:'12:00',title:'종합',tag:'종합'},
    {start:'12:00',end:'12:40',title:'점심/휴식',tag:'휴식'},
    {start:'12:40',end:'14:10',title:'화학',tag:'화학'},
    {start:'14:20',end:'15:50',title:'수학',tag:'수학'},
    {start:'16:00',end:'17:00',title:'물리',tag:'물리'},
    {start:'17:00',end:'18:40',title:'저녁/휴식',tag:'휴식'},
    {start:'18:40',end:'20:10',title:'화학',tag:'화학'},
    {start:'20:20',end:'21:50',title:'종합',tag:'종합'},
    {start:'21:50',end:'22:00',title:'정리',tag:'정리'}
  ]},
  { id:'tpl-math-physics', name:'수물형', blocks:[
    {start:'08:00',end:'09:30',title:'수학',tag:'수학'},
    {start:'09:40',end:'11:10',title:'물리',tag:'물리'},
    {start:'11:20',end:'12:00',title:'수학',tag:'수학'},
    {start:'12:00',end:'12:40',title:'점심/휴식',tag:'휴식'},
    {start:'12:40',end:'14:10',title:'수학',tag:'수학'},
    {start:'14:20',end:'15:50',title:'물리',tag:'물리'},
    {start:'16:00',end:'17:00',title:'종합',tag:'종합'},
    {start:'17:00',end:'18:40',title:'저녁/휴식',tag:'휴식'},
    {start:'18:40',end:'20:10',title:'수학',tag:'수학'},
    {start:'20:20',end:'21:50',title:'물리',tag:'물리'},
    {start:'21:50',end:'22:00',title:'정리',tag:'정리'}
  ]},
  { id:'tpl-math-focus', name:'수학집중', blocks:[
    {start:'08:00',end:'09:30',title:'수학',tag:'수학'},
    {start:'09:40',end:'11:10',title:'수학',tag:'수학'},
    {start:'11:20',end:'12:00',title:'물리',tag:'물리'},
    {start:'12:00',end:'12:40',title:'점심/휴식',tag:'휴식'},
    {start:'12:40',end:'14:10',title:'물리',tag:'물리'},
    {start:'14:20',end:'15:50',title:'수학',tag:'수학'},
    {start:'16:00',end:'17:00',title:'화학',tag:'화학'},
    {start:'17:00',end:'18:40',title:'저녁/휴식',tag:'휴식'},
    {start:'18:40',end:'20:10',title:'수학',tag:'수학'},
    {start:'20:20',end:'21:50',title:'수학',tag:'수학'},
    {start:'21:50',end:'22:00',title:'정리',tag:'정리'}
  ]},
  { id:'tpl-physics-focus', name:'물리집중', blocks:[
    {start:'08:00',end:'09:30',title:'물리',tag:'물리'},
    {start:'09:40',end:'11:10',title:'물리',tag:'물리'},
    {start:'11:20',end:'12:00',title:'수학',tag:'수학'},
    {start:'12:00',end:'12:40',title:'점심/휴식',tag:'휴식'},
    {start:'12:40',end:'14:10',title:'수학',tag:'수학'},
    {start:'14:20',end:'15:50',title:'물리',tag:'물리'},
    {start:'16:00',end:'17:00',title:'화학',tag:'화학'},
    {start:'17:00',end:'18:40',title:'저녁/휴식',tag:'휴식'},
    {start:'18:40',end:'20:10',title:'물리',tag:'물리'},
    {start:'20:20',end:'21:50',title:'물리',tag:'물리'},
    {start:'21:50',end:'22:00',title:'정리',tag:'정리'}
  ]},
  { id:'tpl-chem-focus', name:'화학집중', blocks:[
    {start:'08:00',end:'09:30',title:'화학',tag:'화학'},
    {start:'09:40',end:'11:10',title:'화학',tag:'화학'},
    {start:'11:20',end:'12:00',title:'수학',tag:'수학'},
    {start:'12:00',end:'12:40',title:'점심/휴식',tag:'휴식'},
    {start:'12:40',end:'14:10',title:'수학',tag:'수학'},
    {start:'14:20',end:'15:50',title:'화학',tag:'화학'},
    {start:'16:00',end:'17:00',title:'물리',tag:'물리'},
    {start:'17:00',end:'18:40',title:'저녁/휴식',tag:'휴식'},
    {start:'18:40',end:'20:10',title:'화학',tag:'화학'},
    {start:'20:20',end:'21:50',title:'화학',tag:'화학'},
    {start:'21:50',end:'22:00',title:'정리',tag:'정리'}
  ]},
  { id:'tpl-live-13-17', name:'현강 13-17', blocks:[
    {start:'08:00',end:'09:30',title:'수학',tag:'수학'},
    {start:'09:40',end:'10:50',title:'물리',tag:'물리'},
    {start:'11:00',end:'13:00',title:'이동/휴식/식사',tag:'휴식'},
    {start:'13:00',end:'17:00',title:'현강',tag:'현강'},
    {start:'17:00',end:'17:30',title:'이동/휴식',tag:'휴식'},
    {start:'17:30',end:'19:00',title:'화학',tag:'화학'},
    {start:'19:10',end:'20:30',title:'종합',tag:'종합'}
  ]},
  { id:'tpl-live-08-17', name:'현강 08-17', blocks:[
    {start:'08:00',end:'17:00',title:'현강',tag:'현강'},
    {start:'17:00',end:'19:30',title:'이동/휴식/식사',tag:'휴식'},
    {start:'19:30',end:'20:50',title:'수학',tag:'수학'},
    {start:'21:00',end:'22:00',title:'물리',tag:'물리'}
  ]}
];

function cloneDefaultTemplates(){ return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)); }
function sortTemplateBlocks(blocks){
  return (blocks || []).slice().sort((a,b)=> (a.start || '').localeCompare(b.start || ''));
}
function loadTemplates(){
  const saved = Storage.getTemplates && Storage.getTemplates();
  studyTemplates = Array.isArray(saved) && saved.length ? saved : cloneDefaultTemplates();
  studyTemplates.forEach(t => { if(!Array.isArray(t.blocks)) t.blocks = []; });
  const migrated = normalizeTemplateLabels();
  selectedTemplateId = studyTemplates[0] ? studyTemplates[0].id : null;
  if((!saved || !saved.length) || migrated) saveTemplates(false);
}
function saveTemplates(sync){
  if(Storage.setTemplates) Storage.setTemplates(studyTemplates);
  if(sync !== false) scheduleNotesSave();
}
function currentTemplate(){
  return studyTemplates.find(t => t.id === selectedTemplateId) || studyTemplates[0] || null;
}
function normalizeTemplateLabels(){
  let changed = false;
  const comboLabels = new Set(['수학/물리','수물','물리/수학','수학+물리']);
  studyTemplates.forEach(t => {
    (t.blocks || []).forEach(b => {
      if(comboLabels.has((b.title || '').trim())){ b.title = '종합'; changed = true; }
      if(comboLabels.has((b.tag || '').trim())){ b.tag = '종합'; changed = true; }
    });
  });
  return changed;
}
function isNonStudyBlock(e){
  const tg = (e && (e.tag || '')) || '';
  const title = (e && (e.title || '')) || '';
  return tg === '휴식' || tg === '정리'
    || title === '점심/휴식' || title === '저녁/휴식'
    || title === '이동/휴식/식사' || title === '이동/휴식'
    || title === '정리';
}

function loadTimerLogs(){
  try{ timerLogs = JSON.parse(localStorage.getItem('planner:timerLogs') || '[]'); }
  catch(e){ timerLogs = []; }
}
function saveTimerLogs(){
  try{ localStorage.setItem('planner:timerLogs', JSON.stringify(timerLogs)); }catch(e){}
}
function loadActiveFocusTimer(){
  try{ activeFocusTimer = JSON.parse(localStorage.getItem('planner:activeFocusTimer') || 'null'); }
  catch(e){ activeFocusTimer = null; }
}
function saveActiveFocusTimer(){
  try{
    if(activeFocusTimer) localStorage.setItem('planner:activeFocusTimer', JSON.stringify(activeFocusTimer));
    else localStorage.removeItem('planner:activeFocusTimer');
  }catch(e){}
}
function pad2(n){ return String(n).padStart(2,'0'); }
function fmtHMS(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
function fmtHMFromDate(ms){
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDurKrFromSec(sec){
  const mins = Math.max(0, Math.round((sec || 0)/60));
  const h = Math.floor(mins/60), m = mins%60;
  if(h && m) return `${h}시간 ${m}분`;
  if(h) return `${h}시간`;
  return `${m}분`;
}
function currentFocusElapsedSec(){
  if(!activeFocusTimer) return 0;
  let sec = activeFocusTimer.accumSec || 0;
  if(activeFocusTimer.running && activeFocusTimer.lastStartAt){
    sec += Math.floor((Date.now() - activeFocusTimer.lastStartAt)/1000);
  }
  return Math.max(0, sec);
}
function timerLogsForDate(date, subject){
  return timerLogs.filter(x => x.date === date && (!subject || x.subject === subject));
}
function timerLogSeconds(date, subject){
  return timerLogsForDate(date, subject).reduce((a,x)=>a+(x.durationSec||0), 0);
}

function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function templateTagOptions(selected){
  const set = new Set(subjectTags.map(t => t.name));
  ['수학','물리','화학','현강','종합','정리','휴식','기타'].forEach(x => set.add(x));
  return Array.from(set).map(name => `<option value="${escapeHtml(name)}" ${name===selected?'selected':''}>${escapeHtml(name)}</option>`).join('');
}


function loadPinnedDday(){
  pinnedDdayIds = (Storage.getPinnedDday && Storage.getPinnedDday()) || [];
}
function savePinnedDday(sync){
  pinnedDdayIds = Array.from(new Set(pinnedDdayIds.filter(Boolean)));
  if(Storage.setPinnedDday) Storage.setPinnedDday(pinnedDdayIds);
  if(sync !== false) scheduleNotesSave();
}
function isCalendarEvent(e){ return e && e.type !== 'todo'; }
function addDays(dateStr, days){
  const d = parseDate(dateStr); d.setDate(d.getDate()+days); return fmt(d);
}
function calendarEventsFrom(date, days){
  const end = addDays(date, days);
  return EventsStore.getAll()
    .filter(isCalendarEvent)
    .filter(e => e.date && e.date >= date && e.date <= end)
    .sort((a,b)=> a.date === b.date ? ((a.startTime||'99:99').localeCompare(b.startTime||'99:99')) : a.date.localeCompare(b.date));
}
function pinnedDdayEvents(fromDate){
  const all = EventsStore.getAll().filter(isCalendarEvent);
  return pinnedDdayIds
    .map(id => all.find(e => e.id === id))
    .filter(e => e && e.date >= fromDate)
    .sort((a,b)=> a.date === b.date ? ((a.startTime||'99:99').localeCompare(b.startTime||'99:99')) : a.date.localeCompare(b.date));
}
function togglePinnedDday(id){
  if(!id) return;
  if(pinnedDdayIds.includes(id)) pinnedDdayIds = pinnedDdayIds.filter(x=>x!==id);
  else pinnedDdayIds.push(id);
  savePinnedDday();
  renderPlannerPage(AppState.selectedDate);
  renderCalendarManager();
}
function addPinnedDday(id){
  if(id && !pinnedDdayIds.includes(id)){ pinnedDdayIds.push(id); savePinnedDday(); }
}
function removePinnedDday(id){
  if(pinnedDdayIds.includes(id)){ pinnedDdayIds = pinnedDdayIds.filter(x=>x!==id); savePinnedDday(); }
}

function loadExamRecords(){
  examRecords = (Storage.getExamRecords && Storage.getExamRecords()) || [];
  if(!Array.isArray(examRecords)) examRecords = [];
}
function saveExamRecords(sync){
  examRecords = examRecords.filter(r => r && (r.subject || r.score || r.rank));
  if(Storage.setExamRecords) Storage.setExamRecords(examRecords);
  if(sync !== false) scheduleNotesSave();
}
function renderExamRecords(){
  const list = document.getElementById('examList');
  if(!list) return;
  const recent = examRecords.slice().sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
  if(!recent.length){
    list.innerHTML = '<div class="exam-empty">기록 없음</div>';
    return;
  }
  list.innerHTML = recent.map(r => `<div class="exam-item" data-id="${escapeHtml(r.id)}">`
    + `<span class="exam-subject">${escapeHtml(r.subject||'과목')}</span>`
    + `<span>${escapeHtml(r.score||'-')}점</span>`
    + `<span>${escapeHtml(r.rank||'-')}등</span>`
    + `<button type="button" class="exam-del" title="기록 삭제">×</button>`
    + `</div>`).join('');
  list.querySelectorAll('.exam-del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const row = btn.closest('.exam-item');
      const id = row && row.dataset.id;
      if(!id) return;
      if(!confirm('이 시험 기록을 삭제할까요?')) return;
      examRecords = examRecords.filter(r => r.id !== id);
      saveExamRecords();
      renderExamRecords();
    });
  });
}
function openExamModal(){
  const back = document.getElementById('examBack');
  if(!back) return;
  document.getElementById('examSubject').value = '';
  document.getElementById('examScore').value = '';
  document.getElementById('examRank').value = '';
  back.classList.add('open');
  setTimeout(()=>document.getElementById('examSubject').focus(), 40);
}
function closeExamModal(){
  const back = document.getElementById('examBack');
  if(back) back.classList.remove('open');
}
function saveExamModal(){
  const subject = document.getElementById('examSubject').value.trim();
  const score = document.getElementById('examScore').value.trim();
  const rank = document.getElementById('examRank').value.trim();
  if(!subject){ document.getElementById('examSubject').focus(); return; }
  examRecords.push({ id:'exam-'+Date.now()+'-'+Math.floor(Math.random()*1000), subject, score, rank, createdAt:Date.now() });
  saveExamRecords();
  renderExamRecords();
  closeExamModal();
}

/* ============================================================================
 *  V2.8.7 주간 계획
 * ========================================================================== */
const WEEKLY_AREAS = {
  math: ['미분','적분','선형대수','급수','다변수','공학수학'],
  physics: ['역학','열역학','전자기','파동','광학','현대물리','회로'],
  chemistry: ['화학양론','원자구조','주기성','화학결합','분자구조','열화학','화학평형','산염기','전기화학','반응속도','고급화학']
};
const WEEKLY_SUBJECT_META = {
  math: { label:'수학', cls:'math' },
  physics: { label:'물리', cls:'physics' },
  chemistry: { label:'화학', cls:'chemistry' }
};
function loadWeeklyPlans(){
  weeklyPlans = (Storage.getWeeklyPlans && Storage.getWeeklyPlans()) || [];
  if(!Array.isArray(weeklyPlans)) weeklyPlans = [];
  weeklyPlans = weeklyPlans.filter(Boolean).map(p=>({
    id: p.id || weeklyPlanId(p.year, p.month, p.week),
    year: Number(p.year) || new Date().getFullYear(),
    month: Number(p.month) || 1,
    week: Number(p.week) || 1,
    math: Array.isArray(p.math) ? p.math : [],
    physics: Array.isArray(p.physics) ? p.physics : [],
    chemistry: Array.isArray(p.chemistry) ? p.chemistry : [],
    createdAt: p.createdAt || Date.now(),
    updatedAt: p.updatedAt || p.createdAt || Date.now()
  }));
}
function saveWeeklyPlans(sync){
  if(Storage.setWeeklyPlans) Storage.setWeeklyPlans(weeklyPlans);
  if(sync !== false) scheduleNotesSave();
}
function weeklyPlanId(year, month, week){
  return `${year}-${String(month).padStart(2,'0')}-W${week}`;
}
function weekOfMonth(date){
  const d = date instanceof Date ? new Date(date) : parseDate(date);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = (first.getDay()+6)%7; // 월요일 시작
  return Math.ceil((d.getDate() + offset) / 7);
}
function selectedWeekInfo(){
  const d = parseDate(AppState.selectedDate);
  return { year:d.getFullYear(), month:d.getMonth()+1, week:weekOfMonth(d) };
}
function planForWeek(year, month, week){
  return weeklyPlans.find(p=>Number(p.year)===Number(year) && Number(p.month)===Number(month) && Number(p.week)===Number(week));
}
function compactArea(arr){
  return (arr && arr.length) ? arr.join(', ') : '미지정';
}
function weeklyLineHtml(label, arr, cls){
  return `<div class="weekly-line ${cls||''}"><b>${label}</b><span>${escapeHtml(compactArea(arr))}</span></div>`;
}
function renderWeeklyCurrent(){
  const el = document.getElementById('weeklyCurrent');
  if(!el) return;
  const info = selectedWeekInfo();
  const plan = planForWeek(info.year, info.month, info.week);
  if(!plan){
    el.innerHTML = `<div class="weekly-week-title">${info.month}월 ${info.week}주차</div>`
      + `<div class="weekly-empty">아직 주간 계획 없음<br>↗ 버튼으로 추가</div>`;
    return;
  }
  el.innerHTML = `<div class="weekly-week-title">${plan.month}월 ${plan.week}주차</div>`
    + weeklyLineHtml('수학', plan.math, 'math')
    + weeklyLineHtml('물리', plan.physics, 'physics')
    + weeklyLineHtml('화학', plan.chemistry, 'chemistry');
}
function weeklyMonths(){
  const info = selectedWeekInfo();
  const set = new Set([6,7,8, info.month]);
  weeklyPlans.forEach(p => { if(Number(p.year) === Number(info.year)) set.add(Number(p.month)); });
  return Array.from(set).filter(m=>m>=1 && m<=12).sort((a,b)=>a-b);
}
function ensureWeeklyModalMonth(){
  const info = selectedWeekInfo();
  if(!weeklyModalMonth || !weeklyMonths().includes(Number(weeklyModalMonth))) weeklyModalMonth = info.month;
}
function topAndLowForSubject(key){
  const all = WEEKLY_AREAS[key];
  const counts = {};
  all.forEach(x=>counts[x]=0);
  weeklyPlans.forEach(p => (p[key] || []).forEach(x => { if(counts[x] !== undefined) counts[x] += 1; }));
  const top = all.slice().sort((a,b)=> counts[b] - counts[a] || all.indexOf(a)-all.indexOf(b)).filter(x=>counts[x]>0).slice(0,2);
  const low = all.slice().sort((a,b)=> counts[a] - counts[b] || all.indexOf(a)-all.indexOf(b)).slice(0,2);
  return { top, low };
}
function renderWeeklySummary(){
  const grid = document.getElementById('weeklySummaryGrid');
  if(!grid) return;
  grid.classList.toggle('open', weeklySummaryOpen);
  grid.innerHTML = ['math','physics','chemistry'].map(key=>{
    const meta = WEEKLY_SUBJECT_META[key];
    const { top, low } = topAndLowForSubject(key);
    return `<div class="weekly-summary-card ${meta.cls}">`
      + `<div class="wsc-title">${meta.label}</div>`
      + `<div class="wsc-row"><b>많이</b><span>${escapeHtml(top.length ? top.join(', ') : '기록 없음')}</span></div>`
      + `<div class="wsc-row"><b>덜함</b><span>${escapeHtml(low.length ? low.join(', ') : '기록 없음')}</span></div>`
      + `</div>`;
  }).join('');
}
function renderWeeklyMonthTabs(){
  const tabs = document.getElementById('weeklyMonthTabs');
  if(!tabs) return;
  ensureWeeklyModalMonth();
  tabs.innerHTML = weeklyMonths().map(m => `<button type="button" class="${Number(m)===Number(weeklyModalMonth)?'active':''}" data-month="${m}">${m}월</button>`).join('');
  tabs.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      weeklyModalMonth = Number(btn.dataset.month);
      renderWeeklyModal();
    });
  });
}
function planCardHtml(plan){
  return `<div class="weekly-plan-card" data-id="${escapeHtml(plan.id)}">`
    + `<div class="wpc-head"><div class="wpc-title">${plan.month}월 ${plan.week}주차</div>`
    + `<div class="wpc-actions"><button type="button" class="edit">수정</button><button type="button" class="delete">삭제</button></div></div>`
    + `<div class="wpc-row math"><b>수학</b><span>${escapeHtml(compactArea(plan.math))}</span></div>`
    + `<div class="wpc-row physics"><b>물리</b><span>${escapeHtml(compactArea(plan.physics))}</span></div>`
    + `<div class="wpc-row chemistry"><b>화학</b><span>${escapeHtml(compactArea(plan.chemistry))}</span></div>`
    + `</div>`;
}
function renderWeeklyPlanList(){
  const list = document.getElementById('weeklyPlanList');
  if(!list) return;
  const info = selectedWeekInfo();
  const plans = weeklyPlans
    .filter(p => Number(p.year) === Number(info.year) && Number(p.month) === Number(weeklyModalMonth))
    .sort((a,b)=> Number(a.week)-Number(b.week));
  if(!plans.length){
    list.innerHTML = `<div class="weekly-list-empty">${weeklyModalMonth}월 주간 계획이 없습니다.<br>+ 주차 추가로 입력하세요.</div>`;
  } else {
    list.innerHTML = plans.map(planCardHtml).join('');
  }
  list.querySelectorAll('.weekly-plan-card .edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.closest('.weekly-plan-card')?.dataset.id;
      openWeeklyEdit(id);
    });
  });
  list.querySelectorAll('.weekly-plan-card .delete').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.closest('.weekly-plan-card')?.dataset.id;
      deleteWeeklyPlan(id);
    });
  });
}
function renderWeeklyModal(){
  renderWeeklySummary();
  renderWeeklyMonthTabs();
  renderWeeklyPlanList();
  const tgl = document.getElementById('weeklySummaryToggle');
  if(tgl) tgl.textContent = weeklySummaryOpen ? '요약 접기' : '요약 보기';
}
function openWeeklyModal(){
  ensureWeeklyModalMonth();
  weeklySummaryOpen = window.matchMedia && window.matchMedia('(min-width:721px)').matches;
  renderWeeklyModal();
  document.getElementById('weeklyBack')?.classList.add('open');
}
function closeWeeklyModal(){
  document.getElementById('weeklyBack')?.classList.remove('open');
}
function fillWeeklySelects(month, week){
  const mSel = document.getElementById('weeklyMonth');
  const wSel = document.getElementById('weeklyWeek');
  if(!mSel || !wSel) return;
  const months = weeklyMonths();
  if(!months.includes(Number(month))) months.push(Number(month));
  mSel.innerHTML = months.sort((a,b)=>a-b).map(m=>`<option value="${m}">${m}월</option>`).join('');
  wSel.innerHTML = [1,2,3,4,5,6].map(w=>`<option value="${w}">${w}주차</option>`).join('');
  mSel.value = String(month);
  wSel.value = String(week);
}
function renderWeeklyChipGroup(elId, key, selected){
  const el = document.getElementById(elId);
  if(!el) return;
  const set = new Set(selected || []);
  el.innerHTML = WEEKLY_AREAS[key].map(x => `<button type="button" class="weekly-chip ${set.has(x)?'active':''}" data-value="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('');
  el.querySelectorAll('.weekly-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btn.classList.toggle('active');
    });
  });
}
function chipValues(elId){
  const el = document.getElementById(elId);
  if(!el) return [];
  return Array.from(el.querySelectorAll('.weekly-chip.active')).map(btn=>btn.dataset.value);
}
function openWeeklyEdit(id){
  const info = selectedWeekInfo();
  const existing = id ? weeklyPlans.find(p=>p.id === id) : null;
  weeklyEditingId = existing ? existing.id : null;
  const base = existing || { year:info.year, month:weeklyModalMonth || info.month, week:info.week, math:[], physics:[], chemistry:[] };
  weeklyEditDraft = JSON.parse(JSON.stringify(base));
  document.getElementById('weeklyEditHead').textContent = existing ? `${base.month}월 ${base.week}주차 계획 수정` : '주간 계획 추가';
  fillWeeklySelects(base.month, base.week);
  renderWeeklyChipGroup('weeklyMathChips', 'math', base.math);
  renderWeeklyChipGroup('weeklyPhysicsChips', 'physics', base.physics);
  renderWeeklyChipGroup('weeklyChemistryChips', 'chemistry', base.chemistry);
  document.getElementById('weeklyEditBack')?.classList.add('open');
}
function closeWeeklyEdit(){
  weeklyEditingId = null;
  weeklyEditDraft = null;
  document.getElementById('weeklyEditBack')?.classList.remove('open');
}
function saveWeeklyEdit(){
  const info = selectedWeekInfo();
  const month = Number(document.getElementById('weeklyMonth')?.value || info.month);
  const week = Number(document.getElementById('weeklyWeek')?.value || info.week);
  const id = weeklyPlanId(info.year, month, week);
  const plan = {
    id, year: info.year, month, week,
    math: chipValues('weeklyMathChips'),
    physics: chipValues('weeklyPhysicsChips'),
    chemistry: chipValues('weeklyChemistryChips'),
    createdAt: weeklyEditingId ? (weeklyPlans.find(p=>p.id===weeklyEditingId)?.createdAt || Date.now()) : Date.now(),
    updatedAt: Date.now()
  };
  weeklyPlans = weeklyPlans.filter(p => p.id !== weeklyEditingId && p.id !== id);
  weeklyPlans.push(plan);
  weeklyPlans.sort((a,b)=> a.year-b.year || a.month-b.month || a.week-b.week);
  weeklyModalMonth = month;
  saveWeeklyPlans();
  closeWeeklyEdit();
  renderWeeklyCurrent();
  renderWeeklyModal();
}
function deleteWeeklyPlan(id){
  const plan = weeklyPlans.find(p=>p.id===id);
  if(!plan) return;
  if(!confirm(`${plan.month}월 ${plan.week}주차 계획을 삭제할까요?`)) return;
  weeklyPlans = weeklyPlans.filter(p=>p.id!==id);
  saveWeeklyPlans();
  renderWeeklyCurrent();
  renderWeeklyModal();
}
function bindWeeklyUI(){
  document.getElementById('weeklyOpen')?.addEventListener('click', openWeeklyModal);
  document.getElementById('weeklyClose')?.addEventListener('click', closeWeeklyModal);
  document.getElementById('weeklyAdd')?.addEventListener('click', ()=>openWeeklyEdit(null));
  document.getElementById('weeklyEditCancel')?.addEventListener('click', closeWeeklyEdit);
  document.getElementById('weeklyEditSave')?.addEventListener('click', saveWeeklyEdit);
  document.getElementById('weeklySummaryToggle')?.addEventListener('click', ()=>{
    weeklySummaryOpen = !weeklySummaryOpen;
    renderWeeklySummary();
    const tgl = document.getElementById('weeklySummaryToggle');
    if(tgl) tgl.textContent = weeklySummaryOpen ? '요약 접기' : '요약 보기';
  });
  const back = document.getElementById('weeklyBack');
  if(back) back.addEventListener('click', e=>{ if(e.target === back) closeWeeklyModal(); });
  const editBack = document.getElementById('weeklyEditBack');
  if(editBack) editBack.addEventListener('click', e=>{ if(e.target === editBack) closeWeeklyEdit(); });
}

function eventSubText(e, baseDate){
  const d = ddayLabel(calculateDday(e.date, baseDate || AppState.selectedDate));
  const time = e.startTime && e.endTime ? ` · ${e.startTime}~${e.endTime}` : '';
  return `${d} · ${e.date}${time}`;
}
function ddayListItem(e, baseDate){
  return `<li><span class="dl-tag">${ddayLabel(calculateDday(e.date, baseDate))}</span>`
    + `<span class="dd-dot" style="background:${TYPE_COLOR[e.type]||TYPE_COLOR.etc}"></span>`
    + `<span class="dday-title-scroll"><span class="dday-title-content up-title">${escapeHtml(displayTitle(e))}</span></span></li>`;
}

function tagColor(name){
  const t = subjectTags.find(x => x.name === name);
  return t ? t.color : '#9DB4C4';
}
function addSubjectTag(name){
  name = (name||'').trim();
  if(!name) return null;
  if(!subjectTags.find(x => x.name === name)){
    const color = TAG_PALETTE[subjectTags.length % TAG_PALETTE.length];
    subjectTags.push({ name, color });
    Storage.setSubjectTags(subjectTags);
    scheduleNotesSave();                      // Drive 동기화(태그 목록 공유)
  }
  return name;
}

/* 현재 활성 저장소 — 이 줄만 바꾸면 전체가 클라우드로 전환됨 */
const Storage = LocalStorageAdapter;

/* ============================================================================
 *  3. 이벤트 스토어
 * ========================================================================== */
const EventsStore = {
  events: [],
  googleEvents: [],
  googleTasks: [],
  doneMap: {},
  load(){
    const deleted = new Set(Storage.getDeleted());
    const user = Storage.getUserEvents();          // 사용자가 추가한 일정/할일
    this.events = SAMPLE_EVENTS.filter(e => !deleted.has(e.id)).concat(user);
    this.doneMap = Storage.getDoneMap();            // 완료 체크 상태
    this.events.forEach(e => { e.done = !!this.doneMap[e.id]; });
  },
  setGoogleEvents(arr){
    this.googleEvents = arr || [];
    // 구글 일정: ✓ 표시(normalize의 done)가 기준, 로컬 doneMap은 보조
    this.googleEvents.forEach(e => { e.done = e.done || !!this.doneMap[e.id]; });
  },
  setGoogleTasks(arr){
    this.googleTasks = arr || [];   // 완료 상태는 구글 Tasks가 기준(그대로 사용)
    this.reattachTodoMeta();
  },
  reattachTodoMeta(){
    const attach = (t)=>{
      const m = todoMeta[t.id];
      t.startTime = m && m.start ? m.start : undefined;
      t.endTime   = m && m.end   ? m.end   : undefined;
      t.tag       = m && m.tag   ? m.tag   : undefined;
    };
    this.googleTasks.forEach(attach);
    this.events.filter(e => e.type === 'todo').forEach(attach);
  },
  _all(){ return this.events.concat(this.googleEvents).concat(this.googleTasks); },
  persistUser(){
    // 샘플을 제외한 사용자 생성분만 저장
    Storage.setUserEvents(this.events.filter(e => String(e.id).startsWith("u-")));
  },
  getAll(){ return this._all(); },
  getByDate(date){ return this._all().filter(e => e.date === date); },
  addEvent(evt){
    evt.id = "u-" + Date.now() + "-" + Math.floor(Math.random()*1000);
    evt.done = false;
    this.events.push(evt);
    this.persistUser();
    return evt;
  },
  addTodo(date, title){
    return this.addEvent({ title, type:"todo", date, source:"local" });
  },
  removeEvent(id){
    this.events = this.events.filter(e => e.id !== id);
    this.googleEvents = this.googleEvents.filter(e => e.id !== id);
    if(this.doneMap[id]){ delete this.doneMap[id]; Storage.setDoneMap(this.doneMap); }
    if(!String(id).startsWith("u-")){            // 샘플/구글 삭제도 화면상 유지되도록 기록
      const del = Storage.getDeleted();
      if(!del.includes(id)){ del.push(id); Storage.setDeleted(del); }
    }
    this.persistUser();
  },
  toggleDone(id){
    const e = this._all().find(x => x.id === id);
    if(!e) return;
    e.done = !e.done;
    if(e.done) this.doneMap[id] = true; else delete this.doneMap[id];
    Storage.setDoneMap(this.doneMap);
  },
  getUpcoming(fromDate, types){
    return this._all()
      .filter(e => e.date >= fromDate)
      .filter(e => !types || types.includes(e.type))
      .sort((a,b)=> a.date === b.date
        ? TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]
        : a.date.localeCompare(b.date));
  }
};

/* ============================================================================
 *  4. 앱 상태
 * ========================================================================== */
const AppState = {
  selectedDate: todayStr(),
  view: { year: 2026, month: 5 }   // month: 0-indexed (5 = 6월)
};

/* ============================================================================
 *  5. 날짜 유틸
 * ========================================================================== */
const WK = ['일','월','화','수','목','금','토'];
function todayStr(){ return fmt(new Date()); }
function fmt(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y, m-1, d); }

/* ============================================================================
 *  6. Google Calendar 연동
 * ========================================================================== */
const GOOGLE_CLIENT_ID = '963829025495-2usp15tnpri905boo5rbjmo69eikv90f.apps.googleusercontent.com';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/drive.appdata';  // 캘린더 + 할일 + 메모(앱 전용 숨김폴더)
let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;

/* 토큰 저장/복원 (앱 껐다 켜도 유지) */
const TOKEN_KEY = 'planner:gcalToken';
const CONN_KEY  = 'planner:gcalConnected';
function saveToken(token, expiresInSec){
  tokenExpiry = Date.now() + ((expiresInSec || 3600) * 1000);
  try{
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: tokenExpiry, scope: GOOGLE_SCOPE }));
    localStorage.setItem(CONN_KEY, '1');
  }catch(e){}
}
function loadToken(){
  try{
    const raw = localStorage.getItem(TOKEN_KEY);
    if(!raw) return false;
    const o = JSON.parse(raw);
    if(o && o.scope !== GOOGLE_SCOPE) return false;   // 권한 범위 바뀌면 재인증 필요
    if(o && o.token && o.exp && o.exp > Date.now() + 30000){  // 30초 여유
      accessToken = o.token; tokenExpiry = o.exp; return true;
    }
  }catch(e){}
  return false;
}
function clearToken(){
  try{ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CONN_KEY); }catch(e){}
}
function wasConnected(){
  try{ return localStorage.getItem(CONN_KEY) === '1'; }catch(e){ return false; }
}

const TYPE_TAGS = { exam:'[시험]', assignment:'[과제]', present:'[발표]', etc:'[기타]' };
/* 제목 앞 유형 태그 제거(표시·재태깅용) */
function stripTypeTag(s){
  return (s || '').replace(/^\s*\[\s*(시험|과제|발표|기타)\s*\]\s*/, '').trim();
}
/* 유형 자동 분류: 대괄호 태그 우선 → 키워드 추론 → 기타 */
function classifyType(title, desc){
  const raw = ((title||'') + ' ' + (desc||''));
  const t = raw.toLowerCase();
  const has = (arr)=>arr.some(k => t.includes(k));
  if(/\[\s*시험\s*\]/.test(raw)) return 'exam';
  if(/\[\s*과제\s*\]/.test(raw)) return 'assignment';
  if(/\[\s*발표\s*\]/.test(raw)) return 'present';
  if(/\[\s*기타\s*\]/.test(raw)) return 'etc';
  if(has(['시험','고사','중간','기말','exam','test','quiz','퀴즈'])) return 'exam';
  if(has(['과제','숙제','제출','레포트','리포트','assignment','homework','hw','due'])) return 'assignment';
  // 발표 관련 키워드(PT 제외)
  if(has(['발표회','구두발표','조별발표','팀발표','발표','프레젠테이션','presentation','세미나','브리핑'])) return 'present';
  return 'etc';
}

function normalizeGoogleCalendarEvent(raw){
  // Google Calendar 이벤트 -> 내부 스키마로 변환
  const start = raw?.start?.dateTime || raw?.start?.date || "";
  const end   = raw?.end?.dateTime   || raw?.end?.date   || "";
  const timed = start.length > 10;
  const rawSummary = raw.summary || '';
  const doneMark = /^\s*✓\s*/.test(rawSummary);            // 완료 표시(✓) 인식
  const clean = rawSummary.replace(/^\s*✓\s*/, '');        // ✓ 제거
  return {
    id: raw.id,
    title: stripTypeTag(clean) || "(제목 없음)",            // 표시용 제목(✓·태그 제거)
    type: typeOverrides[raw.id] || classifyType(clean, raw.description),  // 사용자 지정 우선
    date: (start || "").slice(0,10),
    startTime: timed ? start.slice(11,16) : undefined,
    endTime:   end.length>10 ? end.slice(11,16) : undefined,
    memo: raw.description || "",
    done: doneMark,                                         // ✓ 기준(두 기기 공유)
    source: "google-calendar"
  };
}

async function fetchGoogleCalendarEvents(timeMin, timeMax){
  if(!accessToken) return [];
  const params = new URLSearchParams({
    timeMin, timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?' + params.toString();
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Calendar fetch failed: ' + res.status);
  }
  const data = await res.json();
  return (data.items || []).map(normalizeGoogleCalendarEvent).filter(e => e.date);
}

/* 다음날(YYYY-MM-DD) — 종일 일정 end.date(배타적)용 */
function nextDayStr(dateStr){
  const d = parseDate(dateStr); d.setDate(d.getDate()+1); return fmt(d);
}
/* 내부 일정 → 구글 이벤트 본문. 유형은 제목 태그로 보존 */
function toGoogleBody(evt){
  const tag = TYPE_TAGS[evt.type] ? TYPE_TAGS[evt.type] + ' ' : '';
  const body = {
    summary: tag + stripTypeTag(evt.title || ''),
    description: evt.memo || ''
  };
  if(evt.startTime && evt.endTime){
    body.start = { dateTime: `${evt.date}T${evt.startTime}:00`, timeZone: 'Asia/Seoul' };
    body.end   = { dateTime: `${evt.date}T${evt.endTime}:00`,   timeZone: 'Asia/Seoul' };
  } else {
    body.start = { date: evt.date };
    body.end   = { date: nextDayStr(evt.date) };
  }
  return body;
}
async function gcalInsertEvent(evt){
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGoogleBody(evt))
  });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Calendar insert failed: ' + res.status);
  }
  return res.json();
}
async function gcalDeleteEvent(googleId){
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(googleId);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  // 204 성공, 410은 이미 삭제됨 — 둘 다 OK 취급
  if(!res.ok && res.status !== 410){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Calendar delete failed: ' + res.status);
  }
}
async function gcalPatchEvent(googleId, fields){
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(googleId);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Calendar patch failed: ' + res.status);
  }
  return res.json();
}

/* ===== 구글 Tasks (할일) ===== */
const GTASK_BASE = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks';
function normalizeGoogleTask(t){
  return {
    id: t.id,
    title: t.title || '(제목 없음)',
    type: 'todo',
    date: t.due ? t.due.slice(0,10) : undefined,   // 마감일(없으면 날짜 미지정)
    done: t.status === 'completed',
    memo: t.notes || '',
    source: 'google-tasks'
  };
}
async function gtasksList(){
  if(!accessToken) return [];
  const url = GTASK_BASE + '?showCompleted=true&showHidden=true&maxResults=100';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Tasks list failed: ' + res.status);
  }
  const data = await res.json();
  return (data.items || []).map(normalizeGoogleTask).filter(t => t.date);  // 날짜 있는 할일만 표시
}
async function gtaskInsert(title, date){
  const body = { title };
  if(date) body.due = date + 'T00:00:00.000Z';
  const res = await fetch(GTASK_BASE, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Task insert failed: ' + res.status);
  }
  return res.json();
}
async function gtaskSetDone(id, done){
  const res = await fetch(GTASK_BASE + '/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: done ? 'completed' : 'needsAction' })
  });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Task patch failed: ' + res.status);
  }
  return res.json();
}
async function gtaskDelete(id){
  const res = await fetch(GTASK_BASE + '/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if(!res.ok && res.status !== 410){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Task delete failed: ' + res.status);
  }
}
async function gtaskPatchFields(id, fields){
  // fields: { title, due(YYYY-MM-DD) }
  const body = {};
  if(fields.title != null) body.title = fields.title;
  if(fields.date)  body.due = fields.date + 'T00:00:00.000Z';
  const res = await fetch(GTASK_BASE + '/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    if(res.status === 401){ accessToken = null; tokenExpiry = 0; updateAuthUI(); }
    throw new Error('Task patch fields failed: ' + res.status);
  }
  return res.json();
}
/* 할일만 다시 불러와 화면 갱신 */
async function syncTasks(){  if(!isTokenValid()) return;
  try{
    const tasks = await gtasksList();
    EventsStore.setGoogleTasks(tasks);
    renderCalendar();
    renderPlannerPage(AppState.selectedDate);
  }catch(err){ console.error(err); }
}
/* 할일 추가 — 연결 시 구글 Tasks, 아니면 로컬. meta={start,end,tag} */
function addTodoSmart(date, title, meta){
  meta = meta || {};
  const hasMeta = meta.start || meta.end || meta.tag;
  if(isTokenValid()){
    setSyncStatus('할일 추가 중…');
    return gtaskInsert(title, date)
      .then(created=>{
        if(hasMeta && created && created.id){
          todoMeta[created.id] = { start:meta.start||'', end:meta.end||'', tag:meta.tag||'' };
          Storage.setTodoMeta(todoMeta);
          scheduleNotesSave();
        }
        return syncTasks();
      })
      .catch(err=>{ console.error(err); const e=EventsStore.addTodo(date, title); if(hasMeta){ todoMeta[e.id]={start:meta.start||'',end:meta.end||'',tag:meta.tag||''}; Storage.setTodoMeta(todoMeta); EventsStore.reattachTodoMeta(); } renderCalendar(); renderPlannerPage(AppState.selectedDate); });
  } else {
    const e = EventsStore.addTodo(date, title);
    if(hasMeta){
      todoMeta[e.id] = { start:meta.start||'', end:meta.end||'', tag:meta.tag||'' };
      Storage.setTodoMeta(todoMeta);
      EventsStore.reattachTodoMeta();
    }
    renderCalendar();
    renderPlannerPage(AppState.selectedDate);
    return Promise.resolve();
  }
}

/* 일정 제목에 완료(✓) 표시 + 유형 태그 유지하여 재구성 */
function buildSummaryDoneMark(e, done){
  const tag = (e.type !== 'etc' && TYPE_TAGS[e.type]) ? TYPE_TAGS[e.type] + ' ' : '';
  return (done ? '✓ ' : '') + tag + stripTypeTag(e.title || '');
}

/* ===== 메모 ↔ 구글 Drive 앱 전용 숨김폴더(appDataFolder) ===== */
const DRIVE_FILES  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const NOTES_FILENAME = 'planner-notes.json';
let notesFileId = null;
let notesSaveTimer = null;

function collectLocalNotes(){
  const o = {};
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.indexOf('planner:note:') === 0){
      const date = k.slice('planner:note:'.length);
      const v = localStorage.getItem(k);
      if(v) o[date] = v;
    }
  }
  o._todoMeta = todoMeta;            // 할일 시간·태그 (두 기기 공유)
  o._tags = subjectTags;             // 과목 태그 목록·색
  o._templates = studyTemplates;       // 시간표 템플릿
  o._pinnedDday = pinnedDdayIds;       // 대표 D-Day 일정
  o._examRecords = examRecords;        // 간단 시험 기록
  return o;
}
function applyNotes(obj){
  Object.keys(obj || {}).forEach(key=>{
    if(key === '_todoMeta'){
      todoMeta = Object.assign({}, todoMeta, obj._todoMeta || {});
      Storage.setTodoMeta(todoMeta);
    } else if(key === '_tags'){
      if(Array.isArray(obj._tags) && obj._tags.length){
        subjectTags = obj._tags;
        Storage.setSubjectTags(subjectTags);
      }
    } else if(key === '_templates'){
      if(Array.isArray(obj._templates) && obj._templates.length){
        studyTemplates = obj._templates;
        Storage.setTemplates(studyTemplates);
        selectedTemplateId = studyTemplates[0] ? studyTemplates[0].id : null;
      }
    } else if(key === '_pinnedDday'){
      if(Array.isArray(obj._pinnedDday)){
        pinnedDdayIds = obj._pinnedDday;
        Storage.setPinnedDday(pinnedDdayIds);
      }
    } else if(key === '_examRecords'){
      if(Array.isArray(obj._examRecords)){
        examRecords = obj._examRecords;
        Storage.setExamRecords(examRecords);
        renderExamRecords();
      }
    } else if(key.indexOf('_') !== 0 && obj[key]){
      localStorage.setItem('planner:note:'+key, obj[key]);
    }
  });
}
async function gdriveFindNotes(){
  const q = encodeURIComponent("name='" + NOTES_FILENAME + "'");
  const url = DRIVE_FILES + '?spaces=appDataFolder&q=' + q + '&fields=files(id,name)';
  const res = await fetch(url, { headers:{ Authorization:'Bearer '+accessToken } });
  if(!res.ok){
    if(res.status === 401){ accessToken=null; tokenExpiry=0; updateAuthUI(); }
    throw new Error('Drive find failed: '+res.status);
  }
  const data = await res.json();
  notesFileId = (data.files && data.files[0]) ? data.files[0].id : null;
  return notesFileId;
}
async function gdriveLoadNotes(){
  if(!isTokenValid()) return;
  try{
    if(!notesFileId) await gdriveFindNotes();
    if(!notesFileId) return;   // 아직 저장된 메모 파일 없음
    const res = await fetch(DRIVE_FILES + '/' + notesFileId + '?alt=media', { headers:{ Authorization:'Bearer '+accessToken } });
    if(!res.ok) throw new Error('Drive load failed: '+res.status);
    const obj = await res.json();
    applyNotes(obj);
    EventsStore.reattachTodoMeta();   // 불러온 시간·태그를 할일에 반영
    // 현재 보고 있는 날짜 메모/할일 즉시 반영
    renderPlannerPage(AppState.selectedDate);
  }catch(e){ console.log('메모 불러오기 건너뜀', e); }
}
async function gdriveSaveNotes(){
  if(!isTokenValid()) return;
  const content = JSON.stringify(collectLocalNotes());
  try{
    if(notesFileId === null) await gdriveFindNotes();
    if(notesFileId){
      await fetch(DRIVE_UPLOAD + '/' + notesFileId + '?uploadType=media', {
        method:'PATCH',
        headers:{ Authorization:'Bearer '+accessToken, 'Content-Type':'application/json' },
        body: content
      });
    } else {
      const boundary = '----planner' + Date.now();
      const meta = { name: NOTES_FILENAME, parents:['appDataFolder'] };
      const body =
        '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+
        '\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+content+
        '\r\n--'+boundary+'--';
      const res = await fetch(DRIVE_UPLOAD + '?uploadType=multipart&fields=id', {
        method:'POST',
        headers:{ Authorization:'Bearer '+accessToken, 'Content-Type':'multipart/related; boundary='+boundary },
        body
      });
      if(res.ok){ const data = await res.json(); notesFileId = data.id; }
    }
  }catch(e){ console.log('메모 저장 건너뜀', e); }
}
function scheduleNotesSave(){
  if(!isTokenValid()) return;
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(gdriveSaveNotes, 1200);   // 입력 멈춘 뒤 저장
}
function getEventsByDate(date){ return EventsStore.getByDate(date); }
function getUpcomingEvents(fromDate, types){ return EventsStore.getUpcoming(fromDate || AppState.selectedDate, types); }

function calculateDday(eventDate, fromDate){
  const a = parseDate(fromDate || todayStr());
  const b = parseDate(eventDate);
  return Math.round((b - a) / 86400000);
}
function ddayLabel(n){ return n === 0 ? "D-DAY" : (n > 0 ? `D-${n}` : `D+${Math.abs(n)}`); }

/* ============================================================================
 *  7. 렌더링
 * ========================================================================== */
function renderCalendar(){
  const {year, month} = AppState.view;
  document.getElementById('calTitle').textContent = `${year}. ${month+1}`;
  const wrap = document.getElementById('calDays');
  wrap.innerHTML = '';

  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month+1, 0).getDate();

  // 일정이 있는 날짜 집합
  const evtDates = new Set(EventsStore.getAll()
    .filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
    .map(e => e.date));

  for(let i=0;i<first;i++){
    const c=document.createElement('div'); c.className='day empty'; wrap.appendChild(c);
  }
  for(let d=1; d<=days; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(year, month, d).getDay();
    const cell = document.createElement('div');
    cell.className = 'day' + (dow===0?' sun':'') + (dow===6?' sat':'');
    if(dateStr === todayStr())            cell.classList.add('today');
    if(dateStr === AppState.selectedDate) cell.classList.add('selected');
    cell.textContent = d;
    if(evtDates.has(dateStr)){ const dot=document.createElement('span'); dot.className='dot'; cell.appendChild(dot); }
    cell.addEventListener('click', ()=>{ AppState.selectedDate = dateStr; renderCalendar(); renderPlannerPage(dateStr); });
    wrap.appendChild(cell);
  }
}

function renderPlannerPage(date){
  const events = getEventsByDate(date);
  const d = parseDate(date);

  /* DATE */
  document.getElementById('fDate').textContent =
    `${date.replace(/-/g,'. ')} (${WK[d.getDay()]})`;

  /* CONTENTS — 그날 일정 요약 */
  const counts = {exam:0, assignment:0, etc:0, custom:0, todo:0};
  events.forEach(e => counts[e.type]++);
  const contentsEl = document.getElementById('fContents');
  if(events.length){
    const parts = [];
    if(counts.exam)       parts.push(`시험 ${counts.exam}`);
    if(counts.assignment) parts.push(`과제 ${counts.assignment}`);
    if(counts.etc)        parts.push(`기타 ${counts.etc}`);
    if(counts.custom)     parts.push(`개인 ${counts.custom}`);
    if(counts.todo)       parts.push(`할일 ${counts.todo}`);
    contentsEl.innerHTML = `오늘 항목 <b>${events.length}개</b> · ${parts.join(' · ')}`;
  } else {
    contentsEl.innerHTML = `<span style="color:#B6C5D0">등록된 일정 없음</span>`;
  }

  /* TOTAL — 완료 현황 + 할일 누적시간(태그별/전체) */
  const doneCount = events.filter(e => e.done).length;
  // 일정(시간블록) 총합은 참고용으로 유지
  let blockMin = 0;
  events.forEach(e => { if(e.type!=='todo' && e.startTime && e.endTime) blockMin += toMin(e.endTime) - toMin(e.startTime); });
  // 할일 누적시간: 태그별 합산 + 완료 시간
  const tagMin = {};
  let todoMin = 0, doneMin = 0;
  events.forEach(e => {
    if(e.type==='todo' && e.startTime && e.endTime){
      const tg = e.tag || '기타';
      if(isNonStudyBlock(e)) return;
      const d = toMin(e.endTime) - toMin(e.startTime);
      if(d > 0){ tagMin[tg] = (tagMin[tg]||0) + d; todoMin += d; if(e.done) doneMin += d; }
    }
  });
  const fmtDur = (mins)=>{ const h=Math.floor(mins/60), m=mins%60; return `${h?h+'h':''}${m?m+'m':(h?'':'0m')}`; };
  const totalEl = document.getElementById('fTotal');
  if(events.length){
    let html = `완료 <b>${doneCount} / ${events.length}</b>`;
    if(todoMin > 0){
      const pct = Math.round((doneMin/todoMin)*100);
      html += `<div class="total-study">할일 진행 <b>${fmtDur(doneMin)}</b> / ${fmtDur(todoMin)} <span class="study-pct">(${pct}%)</span></div>`;
      html += `<div class="study-bar"><div class="study-bar-fill" style="width:${pct}%"></div></div>`;
      const parts = Object.keys(tagMin).map(tg =>
        `<span class="ts-tag"><i style="background:${tagColor(tg)}"></i>${tg} ${fmtDur(tagMin[tg])}</span>`
      ).join('');
      html += `<div class="total-bytag">${parts}</div>`;
    }
    totalEl.innerHTML = html;
  } else {
    totalEl.innerHTML = '';
  }

  /* WEEKLY — 선택일 기준 주간 계획 요약 */
  if(typeof renderWeeklyCurrent === 'function') renderWeeklyCurrent();

  /* D-DAY — 선택일 기준 가장 가까운 주요 일정 (시험·과제·기타 우선, 개인 일정 제외) */
  renderDday(date);

  /* TASK — 그날 일정 목록을 줄 위에 표시 */
  renderTask(events);

  /* MEMO — 저장소에서 불러와 표시 */
  const note = Storage.getDayNote(date);
  document.getElementById('fMemo').textContent = note;
  document.getElementById('fMemoMobile').textContent = note;

  /* TIME TABLE */
  renderTimeTable(events);

  /* 공부시간 통계 (가로 전용) 갱신 */
  if(typeof renderStats === 'function') renderStats();
}

function renderDday(date){
  const el = document.getElementById('fDday');
  const pinned = pinnedDdayEvents(date).slice(0, 3);
  const upcoming7 = calendarEventsFrom(date, 7);
  let html = '';

  if(pinned.length){
    html += pinned.map(e => `<div class="dday-main pinned">`
      + `<span class="dday-tag">${ddayLabel(calculateDday(e.date, date))}</span>`
      + `<span class="dd-dot" style="background:${TYPE_COLOR[e.type]||TYPE_COLOR.etc}"></span>`
      + `<span class="dday-title-scroll"><span class="dday-title-content dday-title">${escapeHtml(displayTitle(e))}</span></span>`
      + `</div>`).join('');
  } else {
    html += `<div class="dday-empty">대표 일정 없음</div>`;
  }

  html += `<div class="dday-section-label">7일 이내 일정</div>`;
  if(upcoming7.length){
    html += `<ul class="dday-list">` + upcoming7.map(e => ddayListItem(e, date)).join('') + `</ul>`;
  } else {
    html += `<div class="dday-empty">다가오는 일정 없음</div>`;
  }
  el.innerHTML = html;
}

/* 한 항목(line) DOM 생성 — 일정/할일 공용 */
function buildTaskLine(e, showBadge){
  const line = document.createElement('div');
  line.className = 'task-line' + (e.done ? ' done' : '');
  const timeTxt = (e.startTime && e.endTime) ? `${e.startTime}~${e.endTime}` : '';

  const chk = document.createElement('span');
  chk.className = 'chk' + (e.done ? ' checked' : '');
  chk.title = '완료 체크 / 해제';
  ['mousedown','touchstart'].forEach(ev => chk.addEventListener(ev, x=>x.stopPropagation()));
  chk.addEventListener('click', (x)=>{
    x.stopPropagation();
    if(e.source === 'google-tasks' && isTokenValid()){
      // 구글 할일 → Tasks 완료 상태 변경 후 갱신
      e.done = !e.done;                       // 즉시 화면 반영
      chk.classList.toggle('checked', e.done);
      line.classList.toggle('done', e.done);
      gtaskSetDone(e.id, e.done).then(()=> syncTasks()).catch(err=> console.error(err));
      if(typeof renderStats === 'function') renderStats();
    } else if(e.source === 'google-calendar' && isTokenValid()){
      // 구글 일정 → 제목에 ✓ 표시 토글(두 기기 공유)
      e.done = !e.done;
      chk.classList.toggle('checked', e.done);
      line.classList.toggle('done', e.done);
      if(e.done) EventsStore.doneMap[e.id] = true; else delete EventsStore.doneMap[e.id];
      Storage.setDoneMap(EventsStore.doneMap);
      gcalPatchEvent(e.id, { summary: buildSummaryDoneMark(e, e.done) }).catch(err=> console.error(err));
    } else {
      EventsStore.toggleDone(e.id);
      renderPlannerPage(AppState.selectedDate);
    }
  });
  line.appendChild(chk);

  if(showBadge){
    const badge = document.createElement('span');
    badge.className = 'badge editable ' + e.type;
    badge.textContent = (e.type==='custom' && e.customType) ? e.customType : TYPE_LABEL[e.type];
    badge.title = '유형 변경';
    ['mousedown','touchstart'].forEach(ev => badge.addEventListener(ev, x=>x.stopPropagation()));
    badge.addEventListener('click', (x)=>{ x.stopPropagation(); openTypePicker(e); });
    line.appendChild(badge);
  }

  if(!showBadge && e.type === 'todo' && e.tag){
    const dot = document.createElement('span');
    dot.className = 'tag-dot';
    dot.style.background = tagColor(e.tag);
    dot.title = e.tag;
    line.appendChild(dot);
  }

  const title = document.createElement('span');
  title.className = 't-title';
  title.textContent = e.title;
  if(!showBadge && e.type === 'todo'){
    title.style.cursor = 'pointer';
    title.title = '탭하여 수정';
    title.addEventListener('click', (x)=>{ x.stopPropagation(); openTodoEdit(e); });
  }
  line.appendChild(title);

  if(timeTxt){
    const tm = document.createElement('span');
    tm.className = 't-time';
    tm.textContent = timeTxt;
    line.appendChild(tm);
  }

  const doDelete = ()=>{
    if(!confirm(`"${e.title}" 항목을 삭제할까요?`)) return;
    if(e.source === 'google-calendar' && isTokenValid()){
      // 구글 일정 → 구글에서 삭제 후 다시 동기화
      setSyncStatus('구글에서 삭제 중…');
      gcalDeleteEvent(e.id)
        .then(()=> syncFromGoogle())
        .catch(err=>{ console.error(err); setSyncStatus('구글 삭제 실패 — 다시 시도', true); });
    } else if(e.source === 'google-tasks' && isTokenValid()){
      // 구글 할일 → Tasks에서 삭제 후 갱신
      gtaskDelete(e.id).then(()=> syncTasks()).catch(err=> console.error(err));
    } else {
      // 로컬 항목(할일·로컬 일정) → 로컬 삭제
      EventsStore.removeEvent(e.id);
      renderCalendar();
      renderPlannerPage(AppState.selectedDate);
    }
  };
  const del = document.createElement('span');
  del.className = 'del-x'; del.textContent = '×'; del.title = '삭제';
  ['mousedown','touchstart'].forEach(ev => del.addEventListener(ev, x=>x.stopPropagation()));
  del.addEventListener('click', (x)=>{ x.stopPropagation(); doDelete(); });
  line.appendChild(del);

  attachLongPress(line, doDelete);
  return line;
}

function sortItems(arr){
  return arr.slice().sort((a,b)=>{
    if(!!a.done !== !!b.done) return a.done ? 1 : -1;
    const ta=a.startTime||'99:99', tb=b.startTime||'99:99';
    return ta===tb ? TYPE_PRIORITY[a.type]-TYPE_PRIORITY[b.type] : ta.localeCompare(tb);
  });
}
function fillEmptyLines(wrap, used, min){
  for(let i=used; i<min; i++){
    const empty = document.createElement('div');
    empty.className = 'task-line';
    wrap.appendChild(empty);
  }
}

function renderTask(events){
  const tdWrap = document.getElementById('fTaskTodo');
  tdWrap.innerHTML = '';

  const todoItems = sortItems(events.filter(e => e.type === 'todo'));  // 할일만

  todoItems.forEach(e => tdWrap.appendChild(buildTaskLine(e, false)));

  const inputLine = document.createElement('div');
  inputLine.className = 'task-line input-line';
  const mark = document.createElement('span');
  mark.className = 'quick-mark'; mark.textContent = '+';
  const input = document.createElement('input');
  input.className = 'quick-input';
  input.type = 'text';
  input.placeholder = '할일 입력 후 Enter';
  input.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Enter' && input.value.trim()){
      addTodoSmart(AppState.selectedDate, input.value.trim())
        .then(()=>{ const qi=document.querySelector('#fTaskTodo .quick-input'); if(qi) qi.focus(); });
    }
  });
  inputLine.appendChild(mark);
  inputLine.appendChild(input);
  tdWrap.appendChild(inputLine);
  fillEmptyLines(tdWrap, todoItems.length + 1, 8);
}

function renderTimeTable(events){
  const wrap = document.getElementById('fTime');
  // 6시 ~ 다음날 3시 (총 22행). 라벨: 6..12, 1..12, 1..3
  const hours = [];
  for(let h=6; h<=24+3; h++) hours.push(((h-1)%12)+1);

  let rows = '';
  hours.forEach(label => {
    rows += `<div class="tt-row"><span class="tt-h">${label}</span><div class="tt-cells"></div></div>`;
  });

  // 이벤트 블록 (10분 단위 정밀 배치, 06:00 기준)
  const SPAN = 22 * 60;                       // 06:00 → 04:00 = 1320분
  let blocks = '';
  events.filter(e => e.startTime && e.endTime).forEach(e => {
    const s = minutesSince6(e.startTime);
    const en = minutesSince6(e.endTime);
    if(s == null || en == null || en <= s) return;
    const duration = en - s;
    if(duration < 30) return;          // V2: 30분 미만 블록은 Task에만 표시해 잘림 방지
    const top = (s/SPAN)*100;
    const hgt = (duration/SPAN)*100;
    const isTodo = e.type === 'todo';
    const bg = isTodo ? `background:${tagColor(e.tag||'기타')};` : '';
    const cls = isTodo ? 'todo' : e.type;
    const label = displayTitle(e); // V2.1: Time Table은 제목만 표시해 '수학 · 수학' 중복 방지
    blocks += `<div class="tt-block ${cls}${e.done?' done':''}" style="top:${top}%;height:${hgt}%;${bg}">
        <div class="b-title">${label}</div>
        <div class="b-time">${e.startTime}–${e.endTime}</div>
      </div>`;
  });

  wrap.innerHTML = `<div class="tt-grid">${rows}<div class="tt-blocks">${blocks}</div></div>`;
}

/* ---------- 보조 함수 ---------- */
function toMin(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function minutesSince6(t){
  const v = toMin(t);
  return ((v - 360) + 1440) % 1440;   // 06:00=0 / 새벽시간은 아래쪽으로
}
function displayTitle(e){
  return e.type==='custom' && e.customType ? `${e.title}` : e.title;
}

/* 길게 누르기 (터치/마우스 공통) — 삭제 트리거 */
function attachLongPress(el, onLong){
  let timer = null;
  const start = ()=>{
    el.classList.add('pressing');
    timer = setTimeout(()=>{ el.classList.remove('pressing'); onLong(); }, 550);
  };
  const cancel = ()=>{ clearTimeout(timer); el.classList.remove('pressing'); };
  el.addEventListener('touchstart', start, {passive:true});
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchmove', cancel);
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
}

/* ============================================================================
 *  8. 이벤트 바인딩 & 초기화
 * ========================================================================== */
document.getElementById('prevMonth').addEventListener('click', ()=>{
  AppState.view.month--; if(AppState.view.month<0){AppState.view.month=11;AppState.view.year--;}
  renderCalendar();
  if(accessToken) syncFromGoogle();
});
document.getElementById('nextMonth').addEventListener('click', ()=>{
  AppState.view.month++; if(AppState.view.month>11){AppState.view.month=0;AppState.view.year++;}
  renderCalendar();
  if(accessToken) syncFromGoogle();
});
/* ---------- 메모 입력 모달 ---------- */
const memoBack = document.getElementById('memoBack');
function openMemoModal(){
  document.getElementById('memoInput').value = Storage.getDayNote(AppState.selectedDate);
  document.getElementById('memoHead').textContent = '메모 · ' + AppState.selectedDate;
  memoBack.classList.add('open');
  setTimeout(()=>document.getElementById('memoInput').focus(), 50);
}
function closeMemoModal(){ memoBack.classList.remove('open'); }
function saveMemo(){
  const text = document.getElementById('memoInput').value;
  Storage.setDayNote(AppState.selectedDate, text);
  document.getElementById('fMemo').textContent = text;
  document.getElementById('fMemoMobile').textContent = text;
  closeMemoModal();
  scheduleNotesSave();                 // 구글 Drive(숨김폴더)에 동기화
}
document.getElementById('memoBtn').addEventListener('click', openMemoModal);
document.getElementById('memoBtnMobile').addEventListener('click', openMemoModal);
document.getElementById('fMemo').addEventListener('click', openMemoModal);
document.getElementById('fMemoMobile').addEventListener('click', openMemoModal);
document.getElementById('cancelMemo').addEventListener('click', closeMemoModal);
document.getElementById('saveMemo').addEventListener('click', saveMemo);
memoBack.addEventListener('click', (e)=>{ if(e.target === memoBack) closeMemoModal(); });

/* ---------- 유형 변경 모달 ---------- */
const typeBack = document.getElementById('typeBack');
let typeTarget = null;   // 현재 변경 중인 이벤트
function openTypePicker(e){
  typeTarget = e;
  document.getElementById('typeHead').textContent = '유형 변경 · ' + e.title;
  document.querySelectorAll('.type-opt').forEach(b => b.classList.toggle('cur', b.dataset.type === e.type));
  typeBack.classList.add('open');
}
function closeTypePicker(){ typeBack.classList.remove('open'); typeTarget = null; }
function changeType(newType){
  const e = typeTarget;
  if(!e){ closeTypePicker(); return; }
  if(e.type === newType){ closeTypePicker(); return; }
  e.type = newType;
  // 사용자 지정 기억 (자동분류보다 우선)
  typeOverrides[e.id] = newType;
  Storage.setTypeMap(typeOverrides);

  if(e.source === 'google-calendar' && isTokenValid()){
    // 구글 일정이면 제목 태그도 갱신
    const tag = (newType !== 'etc' && TYPE_TAGS[newType]) ? TYPE_TAGS[newType] + ' ' : '';
    const summary = tag + stripTypeTag(e.title);
    gcalPatchEvent(e.id, { summary }).catch(err=> console.error(err));
  } else if(String(e.id).startsWith('u-')){
    // 로컬 일정이면 저장본도 갱신
    EventsStore.persistUser();
  }
  closeTypePicker();
  renderPlannerPage(AppState.selectedDate);
}
document.querySelectorAll('.type-opt').forEach(btn => {
  btn.addEventListener('click', ()=> changeType(btn.dataset.type));
});
document.getElementById('cancelType').addEventListener('click', closeTypePicker);
typeBack.addEventListener('click', (e)=>{ if(e.target === typeBack) closeTypePicker(); });

/* ---------- 일정 추가 모달 ---------- */
const modalBack = document.getElementById('modalBack');
const mType = document.getElementById('mType');
function openModal(){
  document.getElementById('mTitle').value = '';
  mType.value = 'etc';
  document.getElementById('mDate').value = AppState.selectedDate;
  document.getElementById('mCustom').value = '';
  document.getElementById('mStart').value = '';
  document.getElementById('mEnd').value = '';
  document.getElementById('mMemo').value = '';
  const pin = document.getElementById('mPinDday');
  if(pin) pin.checked = false;
  document.getElementById('mCustomWrap').style.display = 'none';
  modalBack.classList.add('open');
  setTimeout(()=>document.getElementById('mTitle').focus(), 50);
}
function closeModal(){ modalBack.classList.remove('open'); }

const _openAddBtn = document.getElementById('openAdd');
if(_openAddBtn) _openAddBtn.addEventListener('click', openModal);
document.getElementById('cancelAdd').addEventListener('click', closeModal);
modalBack.addEventListener('click', (e)=>{ if(e.target === modalBack) closeModal(); });
mType.addEventListener('change', ()=>{
  document.getElementById('mCustomWrap').style.display = (mType.value === 'custom') ? 'block' : 'none';
});

document.getElementById('saveAdd').addEventListener('click', ()=>{
  const title = document.getElementById('mTitle').value.trim();
  const date  = document.getElementById('mDate').value;
  if(!title){ document.getElementById('mTitle').focus(); return; }
  if(!date){ document.getElementById('mDate').focus(); return; }

  const type = mType.value;
  const start = document.getElementById('mStart').value;
  const end   = document.getElementById('mEnd').value;
  const memo  = document.getElementById('mMemo').value.trim();
  const pinDday = !!(document.getElementById('mPinDday') && document.getElementById('mPinDday').checked);

  const evt = { title, type, date, source:"local" };
  if(type === 'custom'){
    const ct = document.getElementById('mCustom').value.trim();
    if(ct) evt.customType = ct;
  }
  if(start && end){ evt.startTime = start; evt.endTime = end; }
  if(memo) evt.memo = memo;

  AppState.selectedDate = date;        // 추가한 날짜로 이동
  AppState.view = { year: parseDate(date).getFullYear(), month: parseDate(date).getMonth() };
  closeModal();

  if(isTokenValid()){
    // 연결됨 → 구글 캘린더에 직접 추가 후 다시 동기화 (중복 방지: 로컬 사본 안 만듦)
    setSyncStatus('구글에 추가 중…');
    gcalInsertEvent(evt)
      .then(created=>{ if(pinDday && created && created.id) addPinnedDday(created.id); return syncFromGoogle(); })
      .catch(err=>{ console.error(err); setSyncStatus('구글 추가 실패 — 로컬로 저장', true); const created=EventsStore.addEvent(evt); if(pinDday) addPinnedDday(created.id); renderCalendar(); renderPlannerPage(AppState.selectedDate); });
  } else {
    // 미연결 → 로컬 저장
    const created = EventsStore.addEvent(evt);
    if(pinDday) addPinnedDday(created.id);
    renderCalendar();
    renderPlannerPage(AppState.selectedDate);
  }
});

/* ---------- 할일 추가/수정 모달 (시간 + 과목 태그) ---------- */
const todoBack = document.getElementById('todoBack');
let editingTodo = null;     // 수정 중인 할일 (없으면 추가 모드)
function renderTagOptions(selected){
  const sel = document.getElementById('tdTag');
  sel.innerHTML = subjectTags.map(t => `<option value="${t.name}">${t.name}</option>`).join('')
    + `<option value="__custom">+ 직접 추가</option>`;
  if(selected) sel.value = selected;
}
function renderTagManage(){
  const box = document.getElementById('tdTagManage');
  box.innerHTML = subjectTags.map(t =>
    `<span class="tag-chip"><i style="background:${t.color}"></i>${t.name}`
    + (t.name === '기타' ? '' : `<b data-tag="${t.name}">×</b>`)
    + `</span>`
  ).join('');
  box.querySelectorAll('b[data-tag]').forEach(b=>{
    b.addEventListener('click', ()=> deleteSubjectTag(b.dataset.tag));
  });
}
function deleteSubjectTag(name){
  if(name === '기타') return;                 // 기본값은 보존
  if(!confirm(`'${name}' 태그를 삭제할까요?\n이 태그의 할일은 '기타'로 바뀝니다.`)) return;
  subjectTags = subjectTags.filter(t => t.name !== name);
  Storage.setSubjectTags(subjectTags);
  // 이 태그를 쓰던 할일 → 기타
  Object.keys(todoMeta).forEach(id=>{ if(todoMeta[id] && todoMeta[id].tag === name) todoMeta[id].tag = '기타'; });
  Storage.setTodoMeta(todoMeta);
  scheduleNotesSave();
  EventsStore.reattachTodoMeta();
  // 현재 선택값이 지워졌으면 기타로
  const sel = document.getElementById('tdTag');
  const cur = sel.value;
  renderTagOptions(cur === name ? '기타' : cur);
  renderTagManage();
  renderPlannerPage(AppState.selectedDate);
}
function openTodoModal(){
  editingTodo = null;
  document.getElementById('tdHead').textContent = '할일 추가';
  document.getElementById('saveTodo').textContent = '추가';
  document.getElementById('tdTitle').value = '';
  document.getElementById('tdDate').value = AppState.selectedDate;
  document.getElementById('tdStart').value = '';
  document.getElementById('tdEnd').value = '';
  renderTagOptions('기타');
  const cw = document.getElementById('tdTagCustom');
  cw.style.display = 'none'; cw.value = '';
  document.getElementById('tdTagManage').style.display = 'none';
  todoBack.classList.add('open');
  setTimeout(()=>document.getElementById('tdTitle').focus(), 50);
}
function openTodoEdit(e){
  editingTodo = e;
  document.getElementById('tdHead').textContent = '할일 수정';
  document.getElementById('saveTodo').textContent = '저장';
  document.getElementById('tdTitle').value = e.title || '';
  document.getElementById('tdDate').value = e.date || AppState.selectedDate;
  document.getElementById('tdStart').value = e.startTime || '';
  document.getElementById('tdEnd').value = e.endTime || '';
  renderTagOptions(e.tag || '기타');
  const cw = document.getElementById('tdTagCustom');
  cw.style.display = 'none'; cw.value = '';
  document.getElementById('tdTagManage').style.display = 'none';
  todoBack.classList.add('open');
  setTimeout(()=>document.getElementById('tdTitle').focus(), 50);
}
function closeTodoModal(){ todoBack.classList.remove('open'); }
document.getElementById('cancelTodo').addEventListener('click', closeTodoModal);
document.getElementById('tdTagManageBtn').addEventListener('click', ()=>{
  const box = document.getElementById('tdTagManage');
  const show = box.style.display === 'none';
  if(show) renderTagManage();
  box.style.display = show ? 'flex' : 'none';
});
todoBack.addEventListener('click', (e)=>{ if(e.target === todoBack) closeTodoModal(); });
document.getElementById('tdTag').addEventListener('change', (e)=>{
  const cw = document.getElementById('tdTagCustom');
  if(e.target.value === '__custom'){ cw.style.display = 'block'; cw.focus(); }
  else cw.style.display = 'none';
});
document.getElementById('tdTagCustom').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    const name = addSubjectTag(e.target.value);
    if(name){ renderTagOptions(name); e.target.style.display = 'none'; e.target.value = ''; }
  }
});
document.getElementById('saveTodo').addEventListener('click', ()=>{
  const title = document.getElementById('tdTitle').value.trim();
  const date  = document.getElementById('tdDate').value;
  if(!title){ document.getElementById('tdTitle').focus(); return; }
  if(!date){ document.getElementById('tdDate').focus(); return; }
  const start = document.getElementById('tdStart').value;
  const end   = document.getElementById('tdEnd').value;
  let tag = document.getElementById('tdTag').value;
  if(tag === '__custom'){                       // 직접 추가 입력 중 저장한 경우
    tag = addSubjectTag(document.getElementById('tdTagCustom').value) || '기타';
  }
  AppState.selectedDate = date;
  AppState.view = { year: parseDate(date).getFullYear(), month: parseDate(date).getMonth() };
  const editing = editingTodo;
  closeTodoModal();
  if(editing){ updateTodoEdit(editing, { title, date, start, end, tag }); }
  else { addTodoSmart(date, title, { start, end, tag }); }
});
/* 할일 수정 저장 */
function updateTodoEdit(e, f){
  // 시간·태그 메타 갱신
  todoMeta[e.id] = { start:f.start||'', end:f.end||'', tag:f.tag||'' };
  Storage.setTodoMeta(todoMeta);
  scheduleNotesSave();
  if(e.source === 'google-tasks' && isTokenValid()){
    // 구글 Tasks 제목·날짜 수정 후 동기화
    setSyncStatus('할일 수정 중…');
    gtaskPatchFields(e.id, { title:f.title, date:f.date })
      .then(()=> syncTasks())
      .catch(err=>{ console.error(err); setSyncStatus('할일 수정 실패', true); });
  } else {
    // 로컬 할일 수정
    e.title = f.title; e.date = f.date;
    EventsStore.persistUser();
    EventsStore.reattachTodoMeta();
    renderCalendar();
    renderPlannerPage(AppState.selectedDate);
  }
}
document.getElementById('tdTitle').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') document.getElementById('saveTodo').click();
});

/* ---------- 세로 모드 FAB 버튼 ---------- */
document.getElementById('fabTodo').addEventListener('click', openTodoModal);
document.getElementById('openAddTodoLs').addEventListener('click', openTodoModal);
const _fabEvent = document.getElementById('fabEvent');
if(_fabEvent) _fabEvent.addEventListener('click', openModal);


/* ---------- 템플릿 선택/관리 ---------- */
const templateBack = document.getElementById('templateBack');
function openTemplateModal(){
  if(!studyTemplates.length) loadTemplates();
  renderTemplateModal();
  templateBack.classList.add('open');
}
function closeTemplateModal(){ templateBack.classList.remove('open'); }
function renderTemplateModal(){
  const list = document.getElementById('tplList');
  const tpl = currentTemplate();
  list.innerHTML = studyTemplates.map(t => {
    const counts = {};
    (t.blocks||[]).forEach(b => { const k=b.tag||b.title||'기타'; if(!isNonStudyBlock(b)) counts[k]=(counts[k]||0)+1; });
    const summary = Object.keys(counts).slice(0,3).map(k=>`${k} ${counts[k]}`).join(' · ') || '시간 블록 없음';
    return `<button class="tpl-pill ${t.id===selectedTemplateId?'active':''}" data-id="${escapeHtml(t.id)}">${escapeHtml(t.name)}<small>${escapeHtml(summary)}</small></button>`;
  }).join('');
  list.querySelectorAll('.tpl-pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{ selectedTemplateId = btn.dataset.id; renderTemplateModal(); });
  });
  const editor = document.getElementById('tplEditor');
  if(!tpl){ editor.innerHTML = '<div class="tpl-empty">템플릿이 없습니다.</div>'; return; }
  const nameInput = document.getElementById('tplName');
  nameInput.value = tpl.name || '';
  const blocks = document.getElementById('tplBlocks');
  const sorted = sortTemplateBlocks(tpl.blocks).map(b => tpl.blocks.indexOf(b));
  const preview = sortTemplateBlocks(tpl.blocks).slice(0,10).map(b=>{
    const tg = b.tag || b.title || '기타';
    return `<span class="tpl-preview-chip"><i style="background:${tagColor(tg)}"></i>${escapeHtml(b.start||'--:--')} ${escapeHtml(b.title||'')}</span>`;
  }).join('');
  const previewHtml = preview ? `<div class="tpl-preview">${preview}</div>` : '';
  blocks.innerHTML = previewHtml + (sorted.map(idx => {
    const b = tpl.blocks[idx];
    return `<div class="tpl-block-row" data-idx="${idx}" data-tag="${escapeHtml(b.tag || b.title || '기타')}">`
      + `<input type="time" class="tpl-start" value="${escapeHtml(b.start||'')}">`
      + `<input type="time" class="tpl-end" value="${escapeHtml(b.end||'')}">`
      + `<input type="text" class="tpl-title" value="${escapeHtml(b.title||'')}">`
      + `<select class="tpl-tag">${templateTagOptions(b.tag || b.title || '기타')}</select>`
      + `<button type="button" class="tpl-block-del" title="시간 블록 삭제">×</button>`
      + `</div>`;
  }).join('') || '<div class="tpl-empty">시간 블록이 없습니다. + 시간 블록을 눌러 추가하세요.</div>');
  blocks.querySelectorAll('.tpl-block-row').forEach(row=>{
    const idx = Number(row.dataset.idx);
    const b = tpl.blocks[idx];
    row.querySelector('.tpl-start').addEventListener('change', e=>{ b.start=e.target.value; saveTemplates(); renderTemplateModal(); });
    row.querySelector('.tpl-end').addEventListener('change', e=>{ b.end=e.target.value; saveTemplates(); renderTemplateModal(); });
    row.querySelector('.tpl-title').addEventListener('input', e=>{ b.title=e.target.value; saveTemplates(); });
    row.querySelector('.tpl-tag').addEventListener('change', e=>{ b.tag=e.target.value; saveTemplates(); });
    row.querySelector('.tpl-block-del').addEventListener('click', ()=>{
      if(!confirm('이 시간 블록을 삭제할까요?')) return;
      tpl.blocks.splice(idx, 1);
      saveTemplates();
      renderTemplateModal();
    });
  });
}
document.getElementById('tplName').addEventListener('input', e=>{
  const tpl = currentTemplate();
  if(!tpl) return;
  tpl.name = e.target.value || '이름 없음';
  saveTemplates();
  const active = document.querySelector('#tplList .tpl-pill.active');
  if(active) active.textContent = tpl.name;
});
document.getElementById('tplNew').addEventListener('click', ()=>{
  const name = prompt('새 템플릿 이름을 입력하세요.', '새 템플릿');
  if(!name) return;
  const id = 'tpl-user-' + Date.now();
  studyTemplates.push({ id, name:name.trim(), blocks:[{start:'08:00',end:'09:30',title:'수학',tag:'수학'}] });
  selectedTemplateId = id;
  saveTemplates();
  renderTemplateModal();
});
document.getElementById('tplAddBlock').addEventListener('click', ()=>{
  const tpl = currentTemplate();
  if(!tpl) return;
  tpl.blocks.push({start:'08:00',end:'09:30',title:'수학',tag:'수학'});
  saveTemplates();
  renderTemplateModal();
});
document.getElementById('tplDelete').addEventListener('click', ()=>{
  const tpl = currentTemplate();
  if(!tpl) return;
  if(!confirm(`'${tpl.name}' 템플릿을 삭제할까요?\n이미 적용된 오늘 할일은 삭제되지 않습니다.`)) return;
  studyTemplates = studyTemplates.filter(t => t.id !== tpl.id);
  if(!studyTemplates.length) studyTemplates = cloneDefaultTemplates();
  selectedTemplateId = studyTemplates[0].id;
  saveTemplates();
  renderTemplateModal();
});
function templateMatchKey(title, start, end){ return `${title||''}|${start||''}|${end||''}`; }
function currentTemplateTodos(date, valid){
  const validKeys = new Set((valid||[]).map(b => templateMatchKey(b.title, b.start, b.end)));
  return EventsStore.getAll().filter(e => {
    if(!e || e.type !== 'todo' || e.date !== date) return false;
    const m = todoMeta[e.id] || {};
    if(m.isTemplate) return true;
    return validKeys.has(templateMatchKey(e.title, e.startTime || m.start, e.endTime || m.end));
  });
}
function allDayTodos(date){
  return EventsStore.getAll().filter(e => e && e.type === 'todo' && e.date === date);
}
function chooseTemplateApplyMode(date, tplName, valid, existing){
  const hasExisting = existing && existing.length;
  const msg = `${date}에 '${tplName}' 템플릿 ${valid.length}개 블록을 적용합니다.

`
    + (hasExisting ? `이미 템플릿으로 보이는 항목 ${existing.length}개가 있습니다.

` : '')
    + `적용 방식 번호를 입력하세요.
`
    + `1 = 기존 템플릿 항목만 교체
`
    + `2 = 기존 할일 유지하고 추가
`
    + `3 = 오늘 할일 전체 비우고 적용

`
    + `취소를 누르면 적용하지 않습니다.`;
  const ans = prompt(msg, hasExisting ? '1' : '2');
  if(ans == null) return 'cancel';
  const v = String(ans).trim();
  if(v === '1') return 'replace-template';
  if(v === '2') return 'append';
  if(v === '3') return 'clear-day';
  alert('1, 2, 3 중 하나를 입력하세요.');
  return 'cancel';
}
async function deleteTodoItemsForTemplate(items){
  let googleDeleted = false;
  for(const e of items){
    if(!e) continue;
    delete todoMeta[e.id];
    if(e.source === 'google-tasks' && isTokenValid()){
      try{ await gtaskDelete(e.id); googleDeleted = true; }
      catch(err){ console.error(err); }
    } else {
      EventsStore.removeEvent(e.id);
    }
  }
  Storage.setTodoMeta(todoMeta);
  EventsStore.reattachTodoMeta();
  if(googleDeleted) await syncTasks();
}
async function createTemplateTodos(date, tpl, valid){
  for(const b of valid){ addSubjectTag(b.tag || b.title || '기타'); }
  if(isTokenValid()){
    setSyncStatus('템플릿 적용 중…');
    for(const b of valid){
      try{
        const created = await gtaskInsert(b.title, date);
        if(created && created.id){
          todoMeta[created.id] = { start:b.start, end:b.end, tag:b.tag || b.title || '기타', isTemplate:true, templateId:tpl.id, templateName:tpl.name };
        }
      }catch(err){
        console.error(err);
        const e = EventsStore.addTodo(date, b.title);
        todoMeta[e.id] = { start:b.start, end:b.end, tag:b.tag || b.title || '기타', isTemplate:true, templateId:tpl.id, templateName:tpl.name };
      }
    }
    Storage.setTodoMeta(todoMeta);
    scheduleNotesSave();
    await syncTasks();
    setSyncStatus('템플릿 적용 완료');
  } else {
    valid.forEach(b=>{
      const e = EventsStore.addTodo(date, b.title);
      todoMeta[e.id] = { start:b.start, end:b.end, tag:b.tag || b.title || '기타', isTemplate:true, templateId:tpl.id, templateName:tpl.name };
    });
    Storage.setTodoMeta(todoMeta);
    EventsStore.reattachTodoMeta();
  }
}
async function applyCurrentTemplate(){
  const tpl = currentTemplate();
  if(!tpl || !tpl.blocks.length) return;
  const date = AppState.selectedDate;
  const valid = sortTemplateBlocks(tpl.blocks).filter(b => b.title && b.start && b.end);
  if(!valid.length) return;
  const existingTemplateItems = currentTemplateTodos(date, valid);
  const mode = chooseTemplateApplyMode(date, tpl.name, valid, existingTemplateItems);
  if(mode === 'cancel') return;
  closeTemplateModal();
  try{
    if(mode === 'replace-template'){
      await deleteTodoItemsForTemplate(existingTemplateItems);
    } else if(mode === 'clear-day'){
      await deleteTodoItemsForTemplate(allDayTodos(date));
    }
    await createTemplateTodos(date, tpl, valid);
    Storage.setTodoMeta(todoMeta);
    EventsStore.reattachTodoMeta();
    renderCalendar();
    renderPlannerPage(date);
  }catch(err){
    console.error(err);
    setSyncStatus('템플릿 적용 중 오류', true);
  }
}
document.getElementById('tplApply').addEventListener('click', applyCurrentTemplate);
document.getElementById('tplClose').addEventListener('click', closeTemplateModal);
templateBack.addEventListener('click', (e)=>{ if(e.target === templateBack) closeTemplateModal(); });
document.getElementById('openTemplateLs').addEventListener('click', openTemplateModal);
document.getElementById('fabTemplate').addEventListener('click', openTemplateModal);


/* ---------- D-Day / 캘린더 일정 관리 ---------- */
const ddayManageBack = document.getElementById('ddayManageBack');
function openDdayManager(){ renderCalendarManager(); ddayManageBack.classList.add('open'); }
function closeDdayManager(){ ddayManageBack.classList.remove('open'); }
function calendarManageItem(e){
  const pinned = pinnedDdayIds.includes(e.id);
  return `<div class="cal-item" data-id="${escapeHtml(e.id)}">`
    + `<button type="button" class="cal-pin ${pinned?'on':''}" title="D-Day 상단 표시">${pinned?'★':'☆'}</button>`
    + `<span class="dd-dot" style="background:${TYPE_COLOR[e.type]||TYPE_COLOR.etc}"></span>`
    + `<div class="cal-info"><div class="cal-title">${escapeHtml(displayTitle(e))}</div><div class="cal-sub">${escapeHtml(eventSubText(e, AppState.selectedDate))}</div></div>`
    + `<button type="button" class="cal-del" title="삭제">×</button>`
    + `</div>`;
}
function wireCalendarList(root){
  root.querySelectorAll('.cal-item').forEach(row=>{
    const id = row.dataset.id;
    const e = EventsStore.getAll().find(x=>x.id===id);
    const pin = row.querySelector('.cal-pin');
    const del = row.querySelector('.cal-del');
    if(pin) pin.addEventListener('click', ()=> togglePinnedDday(id));
    if(del) del.addEventListener('click', ()=> deleteCalendarManagedEvent(e));
  });
}
function renderCalendarManager(){
  const pinned = pinnedDdayEvents(AppState.selectedDate);
  const upcoming = calendarEventsFrom(AppState.selectedDate, 7);
  const all = EventsStore.getAll().filter(isCalendarEvent)
    .filter(e => e.date >= AppState.selectedDate)
    .sort((a,b)=> a.date === b.date ? ((a.startTime||'99:99').localeCompare(b.startTime||'99:99')) : a.date.localeCompare(b.date))
    .slice(0, 60);
  const pinEl = document.getElementById('pinnedDdayList');
  const upEl = document.getElementById('upcomingDdayList');
  const allEl = document.getElementById('allCalendarList');
  pinEl.innerHTML = pinned.length ? pinned.map(calendarManageItem).join('') : '<div class="cal-empty">별표 표시한 대표 일정이 없습니다.</div>';
  upEl.innerHTML = upcoming.length ? upcoming.map(calendarManageItem).join('') : '<div class="cal-empty">7일 이내 캘린더 일정이 없습니다.</div>';
  allEl.innerHTML = all.length ? all.map(calendarManageItem).join('') : '<div class="cal-empty">등록된 캘린더 일정이 없습니다.</div>';
  [pinEl, upEl, allEl].forEach(wireCalendarList);
}
function deleteCalendarManagedEvent(e){
  if(!e) return;
  if(!confirm(`'${displayTitle(e)}' 일정을 삭제할까요?`)) return;
  removePinnedDday(e.id);
  if(e.source === 'google-calendar' && isTokenValid()){
    gcalDeleteEvent(e.id).then(()=> syncFromGoogle()).then(()=>renderCalendarManager()).catch(err=>{ console.error(err); setSyncStatus('구글 일정 삭제 실패', true); });
  } else {
    EventsStore.removeEvent(e.id);
    renderCalendar();
    renderPlannerPage(AppState.selectedDate);
    renderCalendarManager();
  }
}
document.getElementById('openDdayManage').addEventListener('click', openDdayManager);
document.getElementById('ddayManageClose').addEventListener('click', closeDdayManager);
ddayManageBack.addEventListener('click', (e)=>{ if(e.target === ddayManageBack) closeDdayManager(); });
document.getElementById('ddayAddEvent').addEventListener('click', ()=>{ closeDdayManager(); openModal(); });

/* ---------- 시험 기록 ---------- */
const examBack = document.getElementById('examBack');
const examAddBtn = document.getElementById('examAdd');
if(examAddBtn) examAddBtn.addEventListener('click', openExamModal);
if(examBack) examBack.addEventListener('click', (e)=>{ if(e.target === examBack) closeExamModal(); });
const examCancelBtn = document.getElementById('examCancel');
if(examCancelBtn) examCancelBtn.addEventListener('click', closeExamModal);
const examSaveBtn = document.getElementById('examSave');
if(examSaveBtn) examSaveBtn.addEventListener('click', saveExamModal);
['examSubject','examScore','examRank'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('keydown', e=>{ if(e.key === 'Enter') saveExamModal(); });
});

/* ---------- 구글 연동 동작 ---------- */
function setSyncStatus(msg, isErr){
  const el = document.getElementById('gcalStatus');
  el.textContent = msg || '';
  el.classList.toggle('err', !!isErr);
}
function updateAuthUI(){
  const btn = document.getElementById('gcalBtn');
  if(accessToken){
    btn.textContent = '구글 캘린더 연결 해제';
    btn.classList.add('connected');
  } else {
    btn.textContent = '구글 캘린더 연결';
    btn.classList.remove('connected');
  }
}
function initGoogleAuth(){
  if(!(window.google && google.accounts && google.accounts.oauth2)){
    return setTimeout(initGoogleAuth, 300);   // 스크립트 로딩 대기
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    callback: (resp)=>{
      if(resp && resp.error){
        // 조용한 재연결 실패 등
        setSyncStatus('다시 연결이 필요해요', true);
        return;
      }
      accessToken = resp.access_token;
      saveToken(resp.access_token, resp.expires_in);
      updateAuthUI();
      syncFromGoogle();
    }
  });
  updateAuthUI();
  // 이전에 연결했었는데 저장된 토큰이 만료됐으면 → 조용히 재연결 시도(터치 없이)
  if(!isTokenValid() && wasConnected()){
    setSyncStatus('자동 재연결 중…');
    try{ tokenClient.requestAccessToken({ prompt: '' }); }catch(e){}
  }
}
function isTokenValid(){ return !!accessToken && tokenExpiry > Date.now() + 30000; }
function signIn(){
  if(!tokenClient){ setSyncStatus('잠시 후 다시 시도'); initGoogleAuth(); return; }
  tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
}
function signOut(){
  if(accessToken && window.google && google.accounts && google.accounts.oauth2){
    google.accounts.oauth2.revoke(accessToken, ()=>{});
  }
  accessToken = null; tokenExpiry = 0;
  clearToken();
  EventsStore.setGoogleEvents([]);
  EventsStore.setGoogleTasks([]);
  updateAuthUI();
  setSyncStatus('');
  renderCalendar();
  renderExamRecords();
  renderPlannerPage(AppState.selectedDate);
}
async function syncFromGoogle(){
  // 토큰 없거나 만료 → 조용히 재연결 시도
  if(!isTokenValid()){
    if(tokenClient && wasConnected()){ setSyncStatus('자동 재연결 중…'); tokenClient.requestAccessToken({ prompt: '' }); }
    else { setSyncStatus('구글 캘린더를 연결하세요'); }
    return;
  }
  const {year, month} = AppState.view;
  const min = new Date(year, month-1, 1).toISOString();   // 한 달 전부터
  const max = new Date(year, month+2, 1).toISOString();   // 두 달 후까지
  const refreshBtn = document.getElementById('gcalRefresh');
  try{
    refreshBtn.classList.add('spin');
    setSyncStatus('동기화 중…');
    const events = await fetchGoogleCalendarEvents(min, max);
    EventsStore.setGoogleEvents(events);
    // 할일(Tasks)도 함께 (권한 없으면 조용히 건너뜀)
    let taskCount = 0;
    try{ const tasks = await gtasksList(); EventsStore.setGoogleTasks(tasks); taskCount = tasks.length; }
    catch(te){ console.log('Tasks 동기화 건너뜀', te); }
    // 메모(Drive 숨김폴더)도 함께 불러오기
    gdriveLoadNotes();
    setSyncStatus(`구글 연결됨 · 일정 ${events.length} · 할일 ${taskCount}`);
    renderCalendar();
    renderPlannerPage(AppState.selectedDate);
  }catch(err){
    console.error(err);
    setSyncStatus('동기화 실패 — 새로고침을 눌러보세요', true);
  }finally{
    refreshBtn.classList.remove('spin');
  }
}
document.getElementById('gcalBtn').addEventListener('click', ()=>{
  if(accessToken) signOut(); else signIn();
});
document.getElementById('gcalRefresh').addEventListener('click', ()=>{
  if(isTokenValid()) syncFromGoogle();
  else if(wasConnected() && tokenClient) tokenClient.requestAccessToken({ prompt: '' });
  else signIn();
});

/* ============================================================================
 *  포스트잇 (가로 전용 · 로컬 저장, 동기화 X)
 * ========================================================================== */
const POSTIT_COLORS = ['#E8D27C','#AFCFDC','#E2B5C8','#B8D3BA','#D8D0C0'];
const POSTIT_COLOR_MAP = {
  '#FDE68A':'#E8D27C',
  '#BFE3F2':'#AFCFDC',
  '#FBCFE8':'#E2B5C8',
  '#C8E6C9':'#B8D3BA',
  '#E9E4D8':'#D8D0C0'
};
const POSTIT_SIZE_ORDER = ['s','m','l'];
function normalizePostit(p){
  if(!p) return p;
  if(POSTIT_COLOR_MAP[p.color]) p.color = POSTIT_COLOR_MAP[p.color];
  if(!POSTIT_SIZE_ORDER.includes(p.size)) p.size = 'm';
  return p;
}
function postitSizeClass(size){
  return 'size-' + (POSTIT_SIZE_ORDER.includes(size) ? size : 'm');
}
function clampPostitToArea(card, p, area){
  if(!card || !p || !area) return;
  let nx = Math.max(4, Math.min(card.offsetLeft, area.clientWidth - card.offsetWidth - 4));
  let ny = Math.max(40, Math.min(card.offsetTop, area.clientHeight - card.offsetHeight - 4));
  card.style.left = nx + 'px';
  card.style.top = ny + 'px';
  p.x = nx; p.y = ny;
}
function changePostitSize(p, delta, card, area){
  let idx = POSTIT_SIZE_ORDER.indexOf(p.size || 'm');
  if(idx < 0) idx = 1;
  idx = Math.max(0, Math.min(POSTIT_SIZE_ORDER.length - 1, idx + delta));
  p.size = POSTIT_SIZE_ORDER[idx];
  if(card){
    card.classList.remove('size-s','size-m','size-l');
    card.classList.add(postitSizeClass(p.size));
    clampPostitToArea(card, p, area || document.getElementById('postitArea'));
  }
  savePostits();
}
let postits = [];
let pdrag = null;
function loadPostits(){ try{ postits = JSON.parse(localStorage.getItem('planner:postits')||'[]').map(normalizePostit); }catch(e){ postits=[]; } }
function savePostits(){ try{ localStorage.setItem('planner:postits', JSON.stringify(postits)); }catch(e){} }
function renderPostits(){
  const area = document.getElementById('postitArea');
  if(!area) return;
  area.innerHTML = '<div class="pa-head"><span>Post-it</span><button class="add-btn" id="addPostit">+ 포스트잇</button></div>';
  postits.forEach(p=>{
    normalizePostit(p);
    const card = document.createElement('div');
    card.className = 'postit ' + postitSizeClass(p.size);
    card.style.background = p.color;
    card.style.left = (p.x||16)+'px';
    card.style.top  = (p.y||46)+'px';

    // 넓은 이동 핸들 바
    const grip = document.createElement('div'); grip.className = 'grip'; grip.textContent = '• • •'; grip.title = '드래그하여 이동';

    const pin = document.createElement('div'); pin.className = 'pin';
    const colors = document.createElement('div'); colors.className = 'colors';
    POSTIT_COLORS.forEach(c=>{
      const d = document.createElement('span'); d.className = 'cdot'; d.style.background = c;
      ['mousedown','touchstart'].forEach(ev => d.addEventListener(ev, x=>x.stopPropagation()));
      d.addEventListener('click', (e)=>{ e.stopPropagation(); p.color = c; card.style.background = c; savePostits(); });
      colors.appendChild(d);
    });
    const del = document.createElement('span'); del.className = 'del'; del.textContent = '×';
    ['mousedown','touchstart'].forEach(ev => del.addEventListener(ev, x=>x.stopPropagation()));
    del.addEventListener('click', (e)=>{ e.stopPropagation(); postits = postits.filter(x=>x.id!==p.id); savePostits(); renderPostits(); });
    pin.appendChild(colors); pin.appendChild(del);

    const ta = document.createElement('textarea'); ta.value = p.text||''; ta.placeholder = '메모...';
    ta.addEventListener('input', ()=>{ p.text = ta.value; savePostits(); });

    const sizeControls = document.createElement('div'); sizeControls.className = 'size-controls';
    const shrink = document.createElement('button'); shrink.type = 'button'; shrink.className = 'size-btn'; shrink.textContent = '−'; shrink.title = '포스트잇 축소';
    const grow = document.createElement('button'); grow.type = 'button'; grow.className = 'size-btn'; grow.textContent = '+'; grow.title = '포스트잇 확대';
    [shrink, grow].forEach(btn => ['mousedown','touchstart'].forEach(ev => btn.addEventListener(ev, x=>x.stopPropagation())));
    shrink.addEventListener('click', (e)=>{ e.stopPropagation(); changePostitSize(p, -1, card, area); });
    grow.addEventListener('click', (e)=>{ e.stopPropagation(); changePostitSize(p, 1, card, area); });
    sizeControls.appendChild(shrink); sizeControls.appendChild(grow);

    card.appendChild(grip); card.appendChild(pin); card.appendChild(ta); card.appendChild(sizeControls);
    grip.addEventListener('mousedown', (e)=> startPDrag(e, card, p, area));
    grip.addEventListener('touchstart', (e)=> startPDrag(e, card, p, area), {passive:false});
    area.appendChild(card);
  });
  const addBtn = document.getElementById('addPostit');
  if(addBtn) addBtn.addEventListener('click', addPostit);
}
function addPostit(){
  const n = postits.length;
  postits.push({ id:'p-'+Date.now(), text:'', color:POSTIT_COLORS[n%POSTIT_COLORS.length], size:'m', x:16+(n%3)*20, y:48+(n%4)*16 });
  savePostits(); renderPostits();
  const tas = document.querySelectorAll('#postitArea .postit textarea');
  if(tas.length) tas[tas.length-1].focus();
}
function startPDrag(e, card, p, area){
  const t = e.touches ? e.touches[0] : e;
  pdrag = { card, p, area, sx:t.clientX, sy:t.clientY, ox:card.offsetLeft, oy:card.offsetTop };
  card.style.zIndex = 5;
  if(e.cancelable) e.preventDefault();
}
function movePDrag(e){
  if(!pdrag) return;
  const t = e.touches ? e.touches[0] : e;
  let nx = pdrag.ox + (t.clientX - pdrag.sx);
  let ny = pdrag.oy + (t.clientY - pdrag.sy);
  nx = Math.max(4, Math.min(nx, pdrag.area.clientWidth  - pdrag.card.offsetWidth  - 4));
  ny = Math.max(40, Math.min(ny, pdrag.area.clientHeight - pdrag.card.offsetHeight - 4));
  pdrag.card.style.left = nx+'px';
  pdrag.card.style.top  = ny+'px';
  if(e.cancelable) e.preventDefault();
}
function endPDrag(){
  if(!pdrag) return;
  pdrag.p.x = pdrag.card.offsetLeft;
  pdrag.p.y = pdrag.card.offsetTop;
  pdrag.card.style.zIndex = 1;
  savePostits();
  pdrag = null;
}
window.addEventListener('mousemove', movePDrag);
window.addEventListener('mouseup', endPDrag);
window.addEventListener('touchmove', movePDrag, {passive:false});
window.addEventListener('touchend', endPDrag);

/* ============================================================================
 *  공부시간 통계 (가로 전용 · 할일 시작~종료 시간을 태그별 합산 · 주간/월간)
 * ========================================================================== */
let statsRange = 'week';   // 'week' | 'month'
function studyAggregate(range){
  // 기준: 선택일이 속한 주(월~일) 또는 달
  // V2.8.6부터 Study Time은 실제 타이머 기록만 합산한다.
  // Task 체크는 완료/진행률에만 사용하고 공부시간 통계에는 더하지 않는다.
  const base = parseDate(AppState.selectedDate);
  let from, to;
  if(range === "month"){
    from = new Date(base.getFullYear(), base.getMonth(), 1);
    to   = new Date(base.getFullYear(), base.getMonth()+1, 0);
  } else {
    const dow = (base.getDay()+6)%7;   // 월=0
    from = new Date(base); from.setDate(base.getDate()-dow);
    to   = new Date(from); to.setDate(from.getDate()+6);
  }
  const fromS = fmt(from), toS = fmt(to);
  let label;
  if(range === "month"){
    label = (base.getMonth()+1) + "월";
  } else {
    const thu = new Date(from); thu.setDate(from.getDate()+3);
    const firstThu = new Date(thu.getFullYear(), thu.getMonth(), 1);
    const wk = Math.ceil((thu.getDate() + ((firstThu.getDay()+6)%7)) / 7);
    label = (thu.getMonth()+1) + "월 " + wk + "주차";
  }
  const tagMin = {}; let total = 0;
  timerLogs.forEach(log=>{
    if(log.date >= fromS && log.date <= toS){
      const tg = log.subject || "기타";
      const d = Math.round((log.durationSec || 0) / 60);
      if(d > 0){ tagMin[tg] = (tagMin[tg]||0) + d; total += d; }
    }
  });
  return { tagMin, total, fromS, toS, label };
}

function timerLogItemsForSelectedDate(){
  const date = AppState.selectedDate;
  return timerLogs
    .filter(log => log.date === date)
    .slice()
    .sort((a,b)=>(a.startAt||0)-(b.startAt||0));
}
function deleteTimerLog(id){
  if(!id) return;
  if(!confirm('이 타이머 기록을 삭제할까요?')) return;
  timerLogs = timerLogs.filter(log => log.id !== id);
  saveTimerLogs();
  renderStats();
}
function renderTimerLogSection(){
  const logs = timerLogItemsForSelectedDate();
  const dateLabel = AppState.selectedDate ? AppState.selectedDate.slice(5).replace('-', '.') : '';
  let body = '';
  if(!logs.length){
    body = `<div class="tl-empty">선택한 날짜에 기록된<br>타이머 기록이 없어요.<br><br>집중모드에서 종료하고 기록하면<br>여기에 표시됩니다.</div>`;
  } else {
    body = logs.map((log, idx)=>{
      if(!log.id){ log.id = 'timer-legacy-' + (log.startAt || Date.now()) + '-' + idx; }
      const subject = log.subject || '기타';
      const start = log.startAt ? fmtHMFromDate(log.startAt) : '--:--';
      const end = log.endAt ? fmtHMFromDate(log.endAt) : '--:--';
      const dur = fmtDurKrFromSec(log.durationSec || 0);
      const memo = log.memo ? ` · ${escapeHtml(log.memo)}` : '';
      return `<div class="tl-item" data-id="${escapeHtml(log.id)}">`
        + `<span class="tl-dot" style="background:${tagColor(subject)}"></span>`
        + `<div class="tl-main">`
        + `<div class="tl-top"><span class="tl-subject">${escapeHtml(subject)}</span><span class="tl-duration">${escapeHtml(dur)}</span></div>`
        + `<div class="tl-time">${escapeHtml(start)}~${escapeHtml(end)}${memo}</div>`
        + `</div>`
        + `<button type="button" class="tl-del" data-id="${escapeHtml(log.id)}" aria-label="타이머 기록 삭제">×</button>`
        + `</div>`;
    }).join('');
    saveTimerLogs();
  }
  return `<div class="timer-log-section">`
    + `<div class="tl-head"><span class="tl-title">Timer Log</span><span class="tl-date">${escapeHtml(dateLabel)}</span></div>`
    + `<div class="tl-list">${body}</div>`
    + `</div>`;
}
function renderStats(){
  const area = document.getElementById("statsArea");
  if(!area) return;
  const { tagMin, total, label } = studyAggregate(statsRange);
  const fmtDur = (m)=>{ const h=Math.floor(m/60), mm=m%60; return `${h?h+"h":""}${mm?mm+"m":(h?"":"0m")}`; };
  let body;
  if(total <= 0){
    body = `<div class="st-empty">이 기간에 기록된<br>실제 공부시간이 없어요.<br><br>Task 체크 시간은 제외되고<br>타이머 기록만 합산됩니다.</div>`;
  } else {
    const max = Math.max.apply(null, Object.values(tagMin));
    const rows = Object.keys(tagMin).sort((a,b)=>tagMin[b]-tagMin[a]).map(tg=>{
      const pct = Math.round((tagMin[tg]/max)*100);
      return `<div class="st-bar-row">`
        + `<div class="st-bar-top"><span>${escapeHtml(tg)}</span><span>${fmtDur(tagMin[tg])}</span></div>`
        + `<div class="st-bar-track"><div class="st-bar-fill" style="width:${pct}%;background:${tagColor(tg)}"></div></div>`
        + `</div>`;
    }).join("");
    body = `<div class="st-total">총 <b>${fmtDur(total)}</b></div>` + rows;
  }
  area.innerHTML =
    `<div class="st-head">`
    + `<span class="st-title">Study Time<em class="st-period">${label}</em></span>`
    + `<span class="st-toggle">`
    + `<button data-r="week" class="${statsRange==="week"?"active":""}">주간</button>`
    + `<button data-r="month" class="${statsRange==="month"?"active":""}">월간</button>`
    + `</span></div>`
    + `<div class="st-body">${body}</div>`
    + renderTimerLogSection();
  area.querySelectorAll(".st-toggle button").forEach(b=>{
    b.addEventListener("click", ()=>{ statsRange = b.dataset.r; renderStats(); });
  });
  area.querySelectorAll(".tl-del").forEach(btn=>{
    btn.addEventListener("click", ()=>deleteTimerLog(btn.dataset.id));
  });
}



/* ============================================================================
 *  V2.8.2 색상 테마
 *  - 레이아웃 변경 없이 CSS 변수만 바꿈
 *  - 상단 오른쪽 고정 버튼은 44px 이상 터치 영역 확보
 * ========================================================================== */
const THEME_STORAGE_KEY = 'planner:theme';
const COLOR_THEMES = [
  { id:'default', name:'기본 블루', dots:['#5E87A8','#EEF6FA','#E3ECF2'] },
  { id:'sage', name:'세이지 그린', dots:['#6F8F80','#EEF6F1','#E5EEE8'] },
  { id:'beige', name:'웜 베이지', dots:['#A48463','#F6F0E8','#EEE6DA'] },
  { id:'lavender', name:'라벤더 그레이', dots:['#8A87AE','#F1F0F8','#E8E7F0'] },
  { id:'deep', name:'딥 블루그레이', dots:['#7FA6C7','#213342','#15232E'] }
];
let currentTheme = 'default';
function loadTheme(){
  try{ currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'default'; }
  catch(e){ currentTheme = 'default'; }
  applyTheme(currentTheme, false);
}
function saveTheme(id){
  currentTheme = id || 'default';
  try{ localStorage.setItem(THEME_STORAGE_KEY, currentTheme); }catch(e){}
}
function applyTheme(id, save){
  const themeId = COLOR_THEMES.some(t=>t.id===id) ? id : 'default';
  if(themeId === 'default') document.body.removeAttribute('data-theme');
  else document.body.setAttribute('data-theme', themeId);
  currentTheme = themeId;
  if(save !== false) saveTheme(themeId);
  renderThemeOptions();
}
function renderThemeOptions(){
  const grid = document.getElementById('themeGrid');
  if(!grid) return;
  grid.innerHTML = COLOR_THEMES.map(t=>{
    const dots = t.dots.map(c=>`<i style="background:${c}"></i>`).join('');
    return `<button type="button" class="theme-option ${t.id===currentTheme?'active':''}" data-theme-id="${t.id}">`
      + `<span class="theme-option-left"><span class="theme-dotset">${dots}</span><span>${escapeHtml(t.name)}</span></span>`
      + `<span class="theme-check">${t.id===currentTheme?'✓':''}</span>`
      + `</button>`;
  }).join('');
  grid.querySelectorAll('.theme-option').forEach(btn=>{
    btn.addEventListener('click', ()=>applyTheme(btn.dataset.themeId || 'default', true));
  });
}
function openThemeModal(){
  renderThemeOptions();
  document.getElementById('themeBack')?.classList.add('open');
}
function closeThemeModal(){
  document.getElementById('themeBack')?.classList.remove('open');
}
function bindThemeUI(){
  document.getElementById('themeBtn')?.addEventListener('click', openThemeModal);
  document.getElementById('themeClose')?.addEventListener('click', closeThemeModal);
  const back = document.getElementById('themeBack');
  if(back) back.addEventListener('click', e=>{ if(e.target === back) closeThemeModal(); });
}

/* ============================================================================
 *  V2.8 집중 타이머 / Focus Mode
 *  - 아이패드/넓은 화면의 [타이머] 버튼으로 시작
 *  - 스마트폰 FAB에는 버튼을 추가하지 않음
 *  - 기록은 planner:timerLogs에 저장하고 Study Time 통계에 반영
 * ========================================================================== */
const timerBack = document.getElementById('timerBack');
const focusBack = document.getElementById('focusBack');

function openTimerModal(){
  if(activeFocusTimer){
    openFocusMode();
    return;
  }
  if(timerBack){
    timerBack.classList.add('open');
  } else {
    alert('타이머 화면을 찾지 못했습니다. index.html과 app.js를 같은 버전으로 다시 업로드해주세요.');
  }
}
function closeTimerModal(){
  if(timerBack) timerBack.classList.remove('open');
}
function setTimerSubject(subject){
  selectedTimerSubject = subject || '수학';
  document.querySelectorAll('.timer-subject-chip').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.subject === selectedTimerSubject);
  });
}
function selectedGoalMin(){
  const checked = document.querySelector('input[name="timerGoal"]:checked');
  return checked ? Number(checked.value || 0) : 90;
}
function startFocusTimer(){
  const subject = selectedTimerSubject || '수학';
  const memo = (document.getElementById('timerMemo')?.value || '').trim();
  const now = Date.now();
  activeFocusTimer = {
    subject,
    memo,
    goalMin:selectedGoalMin(),
    startAt:now,
    lastStartAt:now,
    accumSec:0,
    running:true
  };
  saveActiveFocusTimer();
  closeTimerModal();
  openFocusMode();
  updateFocusView();
}
function openFocusMode(){
  if(!activeFocusTimer) return;
  if(focusBack){
    focusBack.classList.add('open');
    focusBack.setAttribute('aria-hidden','false');
    document.body.classList.add('focus-lock');
  }
  startFocusTick();
  updateFocusView();
}
function closeFocusMode(){
  if(focusBack){
    focusBack.classList.remove('open');
    focusBack.setAttribute('aria-hidden','true');
    document.body.classList.remove('focus-lock');
  }
}
function startFocusTick(){
  if(focusTickHandle) clearInterval(focusTickHandle);
  focusTickHandle = setInterval(updateFocusView, 1000);
}
function stopFocusTick(){
  if(focusTickHandle){ clearInterval(focusTickHandle); focusTickHandle = null; }
}
function pauseOrResumeFocus(){
  if(!activeFocusTimer) return;
  const now = Date.now();
  if(activeFocusTimer.running){
    activeFocusTimer.accumSec = currentFocusElapsedSec();
    activeFocusTimer.running = false;
    activeFocusTimer.lastStartAt = null;
  } else {
    activeFocusTimer.running = true;
    activeFocusTimer.lastStartAt = now;
  }
  saveActiveFocusTimer();
  updateFocusView();
}
function finishFocusTimer(){
  if(!activeFocusTimer) return;
  const elapsed = currentFocusElapsedSec();
  if(elapsed < 5){
    if(!confirm('기록 시간이 너무 짧습니다. 기록하지 않고 종료할까요?')) return;
    activeFocusTimer = null;
    saveActiveFocusTimer();
    closeFocusMode();
    stopFocusTick();
    updateTimerButtonLabel();
    return;
  }
  const endAt = Date.now();
  const startAt = activeFocusTimer.startAt || endAt;
  timerLogs.push({
    id:'timer-'+Date.now()+'-'+Math.floor(Math.random()*1000),
    date:fmt(new Date(startAt)),
    subject:activeFocusTimer.subject || '기타',
    memo:activeFocusTimer.memo || '',
    startAt,
    endAt,
    durationSec:elapsed
  });
  saveTimerLogs();
  activeFocusTimer = null;
  saveActiveFocusTimer();
  closeFocusMode();
  stopFocusTick();
  updateTimerButtonLabel();
  renderStats();
  renderPlannerPage(AppState.selectedDate);
}
function updateFocusView(){
  if(!activeFocusTimer) { updateTimerButtonLabel(); return; }
  const subject = activeFocusTimer.subject || '기타';
  const elapsed = currentFocusElapsedSec();
  const goalSec = (activeFocusTimer.goalMin || 0) * 60;
  const progressDeg = goalSec > 0 ? Math.min(360, (elapsed / goalSec) * 360) : ((elapsed % 5400) / 5400) * 360;
  const today = fmt(new Date(activeFocusTimer.startAt || Date.now()));
  const todaySec = timerLogSeconds(today, subject) + elapsed;

  const subEl = document.getElementById('focusSubject');
  const timeEl = document.getElementById('focusTime');
  const ringEl = document.getElementById('focusRing');
  const startEl = document.getElementById('focusStart');
  const todayEl = document.getElementById('focusToday');
  const statusEl = document.getElementById('focusStatus');
  const pauseBtn = document.getElementById('focusPause');

  if(subEl) subEl.textContent = subject;
  if(timeEl) timeEl.textContent = fmtHMS(elapsed);
  if(ringEl) ringEl.style.setProperty('--progress', `${progressDeg}deg`);
  if(startEl) startEl.textContent = `시작 ${fmtHMFromDate(activeFocusTimer.startAt || Date.now())}`;
  if(todayEl) todayEl.textContent = `오늘 ${subject} ${fmtDurKrFromSec(todaySec)}`;
  if(statusEl) statusEl.textContent = activeFocusTimer.running ? '집중 중' : '일시정지됨';
  if(pauseBtn) pauseBtn.textContent = activeFocusTimer.running ? '일시정지' : '재개';
  updateTimerButtonLabel();
}
function updateTimerButtonLabel(){
  const btn = document.getElementById('openTimerLs');
  if(!btn) return;
  if(activeFocusTimer){
    btn.textContent = `타이머 ${fmtHMS(currentFocusElapsedSec())}`;
  } else {
    btn.textContent = '타이머';
  }
}
function bindFocusTimerUI(){
  const openBtn = document.getElementById('openTimerLs');
  if(openBtn) openBtn.addEventListener('click', openTimerModal);
  if(timerBack) timerBack.addEventListener('click', e=>{ if(e.target === timerBack) closeTimerModal(); });
  document.getElementById('timerCancel')?.addEventListener('click', closeTimerModal);
  document.getElementById('timerStart')?.addEventListener('click', startFocusTimer);
  document.querySelectorAll('.timer-subject-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>setTimerSubject(btn.dataset.subject));
  });
  document.getElementById('focusPause')?.addEventListener('click', pauseOrResumeFocus);
  document.getElementById('focusFinish')?.addEventListener('click', finishFocusTimer);
  document.getElementById('focusBackPlanner')?.addEventListener('click', closeFocusMode);
  setTimerSubject(selectedTimerSubject);
}


/* V2.8.1 타이머 버튼 작동 안정화
   - app.js가 새로 로드된 경우 버튼 직접 바인딩 + 이벤트 위임을 같이 적용
   - 일부 브라우저/PWA 캐시 상황에서 초기 바인딩이 누락되는 것을 방지 */
document.addEventListener('click', function(e){
  const target = e.target && e.target.closest ? e.target.closest('#openTimerLs') : null;
  if(target){
    e.preventDefault();
    if(typeof openTimerModal === 'function') openTimerModal();
  }
}, true);

/* 초기화 */
(function init(){
  loadTheme();                          // 색상 테마 먼저 적용
  bindThemeUI();
  EventsStore.load();                  // 저장된 사용자 일정 + 완료 상태 불러오기
  typeOverrides = Storage.getTypeMap();   // 사용자가 지정한 유형 불러오기
  todoMeta = Storage.getTodoMeta();       // 할일 시간·태그
  loadTimerLogs();                      // 집중 타이머 기록
  loadActiveFocusTimer();               // 진행 중 타이머 복구
  bindFocusTimerUI();
  const savedTags = Storage.getSubjectTags();
  if(savedTags && savedTags.length) subjectTags = savedTags;
  loadTemplates();
  loadPinnedDday();
  loadExamRecords();
  loadWeeklyPlans();
  bindWeeklyUI();
  EventsStore.reattachTodoMeta();
  const t = parseDate(todayStr());
  AppState.view = { year: t.getFullYear(), month: t.getMonth() };
  renderCalendar();
  renderWeeklyCurrent();
  renderPlannerPage(AppState.selectedDate);
  loadPostits(); renderPostits();      // 포스트잇 (가로 전용)
  renderStats();                       // 공부시간 통계 (가로 전용)
  if(activeFocusTimer){ startFocusTick(); updateFocusView(); }

  loadToken();                         // 저장된 토큰 복원
  if(isTokenValid()){                  // 유효하면 바로 동기화 (터치/팝업 없음)
    updateAuthUI();
    syncFromGoogle();
  }
  initGoogleAuth();                    // 구글 로그인 준비 (+ 필요시 조용한 재연결)
})();

/* PWA: 서비스워커 등록 (홈화면 설치 + 오프라인) */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(err=> console.log('SW 등록 실패', err));
  });
}

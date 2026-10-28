/* 保活アプリ 追加機能: スケジュール / 見学メモ プラス(有料版・お試し中)
   hoikatsu.html から読み込まれます。日付や質問を直すときは、このファイルだけを編集します。 */
(function(){
'use strict';
var HK = window.HK;
if(!HK || !document.querySelector('.tabs')) return;
var $ = function(id){ return document.getElementById(id); };
var esc = HK.esc;
var PREMIUM = true; /* 決済を入れるまでは、全員にお試しで開けておく。falseにすると見学メモ プラスが閉じます */

function lsGet(k, d){ try{ var s = localStorage.getItem(k); return s === null ? d : JSON.parse(s); }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

/* ===== 区の日程(令和9年4月入園・認可保育園) ===== */
var SRC = {
  name: '世田谷区「令和9年4月入園(認可保育園)」のページ',
  url: 'https://www.city.setagaya.lg.jp/01044/1561.html',
  checked: '2026年10月28日(区のページの最終更新 2026年10月20日)'
};
var EVENTS = [
  {id:'consult', date:'2026-10-30', kind:'区', title:'個別相談(窓口・予約制)の最終日', note:'令和8年9月1日〜10月30日。申込の受付は予約なしでできます。'},
  {id:'first-mail', date:'2026-11-05', kind:'締切', title:'一次選考 申込締切(郵送・オンライン)', note:'消印有効です。'},
  {id:'first-visit', date:'2026-11-10', kind:'締切', title:'一次選考 申込締切(窓口に持っていく場合)', note:'厳守です。増点につながる変更の届けも、この日までです。'},
  {id:'first-add', date:'2026-11-24', kind:'締切', title:'不足書類の追加提出の期限', note:'締切日までに申込書類を出した人が対象です。郵送・オンラインでも出せます。'},
  {id:'second-mail', date:'2027-01-27', kind:'締切', title:'二次選考 申込締切(郵送・オンライン)', note:'消印有効です。一次で内定しなかった人は、改めて申し込む必要はありません。状況が変わったら書類を出します。'},
  {id:'second-visit', date:'2027-02-01', kind:'締切', title:'二次選考 申込締切(窓口に持っていく場合)', note:'厳守です。'},
  {id:'start', date:'2027-04-01', kind:'入園', title:'令和9年4月 入園', note:''}
];
var UNDATED = [
  '令和9年4月(一次)の入園申込者数の公表(区は「今後公開予定」としています)',
  '令和9年4月(二次)の入園可能数の公表(区は「今後公開予定」としています)',
  '選考結果の通知(時期は区のページに書かれていません。「令和9年4月入園を申し込まれる方へ」などで確認してください)'
];
/* やることの目安。ev = 基準にする区の日程、off = その何日前(マイナス)か */
var TASKS = [
  {id:'t-proof', ev:'first-mail', off:-14, title:'就労証明書など、勤務先に頼む書類を依頼する'},
  {id:'t-visit', ev:'first-mail', off:-14, title:'見学する園を決めて、予約する'},
  {id:'t-rank', ev:'first-mail', off:-7, title:'希望する園と順位を決める'},
  {id:'t-send', ev:'first-mail', off:0, title:'申込書類を見直して、郵送かオンラインで出す(11月5日の消印有効)'},
  {id:'t-hand', ev:'first-visit', off:0, title:'窓口に持っていく場合は、申込書類を持っていく'},
  {id:'t-chg', ev:'first-visit', off:0, title:'状況が変わったら、変更の届けを出す(増点につながる変更は11月10日まで)'},
  {id:'t-add', ev:'first-add', off:0, title:'不足書類の連絡があれば、追加で出す'},
  {id:'t-rate', ev:null, title:'区が申込者数を公表したら、倍率を見直す'},
  {id:'t-second', ev:'second-mail', off:-7, title:'二次選考に向けて、状況が変わった場合の書類を準備する'},
  {id:'t-result', ev:null, title:'選考結果の通知を確認する'},
  {id:'t-after', ev:null, title:'内定したら、入園の手続きと準備を始める'}
];

/* ===== 見学メモ プラス: 質問リスト ===== */
var QUESTIONS = [
  '定員、クラスの人数、先生の人数',
  '慣らし保育の期間と進め方',
  '延長保育の時間と料金',
  '持ち物(布団・おむつ・着替え)と、名前つけの量',
  '給食、アレルギー対応、離乳食の進め方',
  '発熱時のお迎えの目安と、病児・病後児保育の使い方',
  '午睡(お昼寝)の時間と方法',
  '外遊び・散歩の回数と、園庭の使い方',
  '送迎の時間帯、駐輪場、きょうだいがいる場合の配慮',
  '保育料のほかにかかる費用(用品代・行事費など)',
  '担任の決め方と、先生の入れ替わりの様子',
  '行事の数と、保護者が参加するもの',
  '連絡帳(紙・アプリ)と、保護者への連絡の方法',
  '地震・火事・不審者のときの避難と対策'
];

/* ===== 見た目 ===== */
var css = document.createElement('style');
css.textContent = [
'.tabs button.hero{grid-column:span 6; flex-direction:column; gap:4px; font-size:15px; min-height:76px; padding:10px 4px}',
'.tabs button.hero .ti{font-size:24px; line-height:1.1}',
'.hkb{display:none; align-items:center; gap:10px; margin:0 0 14px; padding:12px 14px; border-radius:20px; background:var(--note); color:var(--note-fg); font-weight:700; font-size:15px; line-height:1.5}',
'.hkb.on{display:flex}.hkb span.t{flex:1}.hkb button{min-height:40px; padding:0 14px; font-size:14px; flex:none}',
'.sc{display:inline-block; font-size:13px; font-weight:700; border-radius:999px; padding:1px 10px; background:var(--field); color:var(--muted); white-space:nowrap}',
'.sc.soon{background:var(--note); color:var(--note-fg)}.sc.hot{background:var(--pop-soft); color:var(--minus)}.sc.past{opacity:.6}',
'.nx{background:var(--accent-soft); border-radius:20px; padding:14px 16px; margin-top:8px}.nx .big{font-family:var(--font-display); font-size:30px; font-weight:700; color:var(--accent)}',
'.ev{display:grid; gap:4px; padding:12px 0; border-top:2px dotted var(--line)}.ev:first-child{border-top:0}',
'.ev.pastev{opacity:.55}.ev .d{font-family:var(--font-display); font-weight:700; font-size:16px}.ev .n{font-size:13px; color:var(--muted); line-height:1.6}',
'.ev a.cal, a.btnlike{display:inline-block; font-size:14px; font-weight:700; color:var(--accent); text-decoration:none; border:2px solid var(--line); border-radius:999px; padding:6px 14px; margin-top:4px; width:max-content}',
'.tk{display:flex; gap:10px; align-items:flex-start; padding:10px 0; border-top:2px dotted var(--line)}.tk:first-child{border-top:0}',
'.tk input{width:26px; height:26px; flex:none; margin-top:2px}.tk .x{flex:1; min-width:0; overflow-wrap:anywhere}.tk .x small{display:block; color:var(--muted); font-size:13px}',
'.tk.dn .x b{text-decoration:line-through; color:var(--muted)}',
'.addtk{display:grid; gap:8px; margin-top:10px}',
'#hkPlus details.plus{border-top:2px dotted var(--line); padding:10px 0}#hkPlus details.plus > summary{font-family:var(--font-display); font-weight:700; font-size:17px; cursor:pointer; padding:6px 0}',
'#hkPlus .badge{font-size:12px; font-weight:700; background:var(--pop-soft); color:var(--minus); border-radius:999px; padding:1px 10px}',
'.ph{display:flex; flex-wrap:wrap; gap:8px; margin-top:8px}.ph figure{margin:0; position:relative}.ph img{width:96px; height:96px; object-fit:cover; border-radius:14px; display:block}',
'.ph figure.big{width:100%}.ph figure.big img{width:100%; height:auto}.ph figure button{position:absolute; top:4px; right:4px; min-height:30px; min-width:30px; padding:0; border-radius:50%; font-size:14px}',
'.qk{display:grid; gap:6px; padding:10px 0; border-top:2px dotted var(--line)}.qk:first-child{border-top:0}.qk label{display:flex; gap:10px; align-items:flex-start}.qk input[type=checkbox]{width:24px; height:24px; flex:none; margin-top:2px}',
'#hkCmpAll table.cmp{min-width:0}#hkCmpAll .tblwrap{max-height:none}#hkCmpAll .cmp th[scope=row]{position:sticky; left:0; background:var(--surface); text-align:left; min-width:7em; font-size:13px}#hkCmpAll .cmp td{min-width:7.5em}',
'#hkPlus textarea{width:100%; min-height:90px; font:inherit; font-size:14px}',
'#hkPrint{display:none}',
'@media print{body > *:not(#hkPrint){display:none !important}#hkPrint{display:block !important; background:#fff; color:#000; font-size:11pt; line-height:1.6; padding:0}#hkPrint h1{font-size:18pt; margin:0 0 6px}#hkPrint h2{font-size:14pt; margin:14px 0 4px; page-break-after:avoid}#hkPrint table{border-collapse:collapse; width:100%; font-size:10pt}#hkPrint td, #hkPrint th{border:1px solid #999; padding:3px 6px; text-align:left; vertical-align:top}#hkPrint img{width:30%; margin:2px}#hkPrint .pg{page-break-inside:avoid}}'
].join('\n');
document.head.appendChild(css);

/* ===== 日付の道具 ===== */
function pad(n){ return ('0' + n).slice(-2); }
function fmt(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function ymd(s){ var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
function addDays(s, n){ var d = ymd(s); d.setDate(d.getDate() + n); return fmt(d); }
function md(s){ var d = ymd(s); return (d.getMonth() + 1) + '月' + d.getDate() + '日(' + '日月火水木金土'.charAt(d.getDay()) + ')'; }
function daysLeft(s){ var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((ymd(s) - t) / 864e5); }
function chip(n){
  if(n < 0) return '<span class="sc past">過ぎました</span>';
  if(n === 0) return '<span class="sc hot">今日</span>';
  return '<span class="sc' + (n <= 7 ? ' hot' : (n <= 21 ? ' soon' : '')) + '">あと' + n + '日</span>';
}
function gcal(title, date, note){
  var a = date.replace(/-/g, ''), b = addDays(date, 1).replace(/-/g, '');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('【保活】' + title) + '&dates=' + a + '/' + b + '&details=' + encodeURIComponent((note || '') + '\n出典: ' + SRC.url);
}
function icsText(){
  function e(s){ return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hoikatsu-app//JP', 'CALSCALE:GREGORIAN'];
  EVENTS.forEach(function(ev){
    var d = ev.date.replace(/-/g, ''), d2 = addDays(ev.date, 1).replace(/-/g, '');
    L.push('BEGIN:VEVENT', 'UID:' + ev.id + '@hoikatsu-app', 'DTSTAMP:20261028T000000Z', 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + d2,
      'SUMMARY:' + e('【保活】' + ev.title), 'DESCRIPTION:' + e((ev.note || '') + ' 出典: ' + SRC.url));
    if(ev.kind === '締切'){
      [['-P6DT15H', '7日前'], ['-PT15H', '前日'], ['PT9H', '当日']].forEach(function(t){
        L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(ev.title + '(' + t[1] + ')'), 'TRIGGER:' + t[0], 'END:VALARM');
      });
    }
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
function download(name, text, type){
  var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], {type: type}));
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1500);
}

/* ===== タブ・画面・お知らせ ===== */
var tabs = document.querySelector('.tabs');
var tb = document.createElement('button');
tb.type = 'button'; tb.id = 'tabSched'; tb.className = 'hero'; tb.setAttribute('role', 'tab'); tb.setAttribute('aria-selected', 'false');
tb.innerHTML = '<span class="ti">📅</span><span>スケジュール</span>';
tabs.insertBefore(tb, $('tabFind'));
var view = document.createElement('div'); view.id = 'viewSched'; view.hidden = true;
$('viewAbout').parentNode.insertBefore(view, $('viewAbout'));
var banner = document.createElement('div'); banner.className = 'hkb'; banner.id = 'hkBanner';
tabs.parentNode.insertBefore(banner, tabs);

function showSched(){
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = false;
  ['tabIndex', 'tabFind', 'tabCmp', 'tabVisit', 'tabAbout'].forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); });
  tb.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  renderSched(); window.scrollTo(0, 0);
}
tb.addEventListener('click', showSched);
Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(b){
  if(b !== tb) b.addEventListener('click', function(){ view.hidden = true; tb.setAttribute('aria-selected', 'false'); });
});

var S_KEY = 'hoikatsu-sched-v1';
var sched = lsGet(S_KEY, {done: {}, custom: []});
if(!sched.done) sched.done = {};
if(!sched.custom) sched.custom = [];
function sSave(){ lsSet(S_KEY, sched); }

function nextDeadline(){
  var a = EVENTS.filter(function(e){ return e.kind === '締切' && daysLeft(e.date) >= 0; });
  return a[0] || null;
}
function renderBanner(){
  var n = nextDeadline();
  if(!n || daysLeft(n.date) > 14){ banner.className = 'hkb'; banner.innerHTML = ''; return; }
  var k = daysLeft(n.date);
  banner.className = 'hkb on';
  banner.innerHTML = '<span class="t">📣 ' + esc(n.title) + 'まで、' + (k === 0 ? '今日です' : 'あと' + k + '日') + '(' + md(n.date) + ')</span><button type="button" class="primary" id="hkBn">見る</button>';
  $('hkBn').addEventListener('click', showSched);
}

function taskDue(t){ return t.ev ? addDays(EVENTS.filter(function(e){ return e.id === t.ev; })[0].date, t.off) : null; }
function allTasks(){
  var a = TASKS.map(function(t){ return {id: t.id, title: t.title, due: taskDue(t), own: false}; });
  sched.custom.forEach(function(c){ a.push({id: c.id, title: c.title, due: c.date || null, own: true}); });
  return a;
}
function renderSched(){
  var nx = nextDeadline(), h = '';
  h += '<section class="panel"><h2>スケジュール</h2><p class="hint" style="margin:0">令和9年4月入園(認可保育園)の、区の日程です。出典: <a href="' + SRC.url + '" target="_blank" rel="noopener">' + esc(SRC.name) + '</a>(確認日 ' + esc(SRC.checked) + ')。日程は変わることがあるので、区のページも確認してください。</p>';
  if(nx){
    h += '<div class="nx"><div style="font-size:14px; font-weight:700; color:var(--muted)">次の締切</div><div class="big">あと' + daysLeft(nx.date) + '日</div><div><b>' + esc(nx.title) + '</b></div><div style="font-size:14px">' + md(nx.date) + '</div><a class="cal" style="display:inline-block; margin-top:8px; font-size:14px; font-weight:700; color:var(--accent); border:2px solid var(--line); border-radius:999px; padding:6px 14px; background:var(--surface); text-decoration:none" href="' + gcal(nx.title, nx.date, nx.note) + '" target="_blank" rel="noopener">📅 Googleカレンダーに入れる</a></div>';
  } else {
    h += '<div class="nx"><b>令和9年4月入園の申込の締切は、すべて過ぎました。</b></div>';
  }
  h += '</section>';

  h += '<section class="panel"><h2>区の日程</h2>';
  EVENTS.forEach(function(ev){
    var k = daysLeft(ev.date);
    h += '<div class="ev' + (k < 0 ? ' pastev' : '') + '"><div class="d">' + md(ev.date) + ' ' + chip(k) + '</div><div><b>' + esc(ev.title) + '</b></div>'
      + (ev.note ? '<div class="n">' + esc(ev.note) + '</div>' : '')
      + (k >= 0 ? '<a class="cal" href="' + gcal(ev.title, ev.date, ev.note) + '" target="_blank" rel="noopener">📅 カレンダーに入れる</a>' : '') + '</div>';
  });
  h += '<button type="button" id="hkIcs" style="width:100%; margin-top:12px">📥 全部まとめてカレンダーに入れる(.icsファイル)</button><p class="hint">締切には、7日前・前日・当日の朝9時のお知らせも付きます。ダウンロードしたファイルを開くと、カレンダーアプリに入ります。</p></section>';

  h += '<section class="panel"><h2>日付が決まっていない区の発表</h2><ul class="about plain">' + UNDATED.map(function(u){ return '<li>' + esc(u) + '</li>'; }).join('') + '</ul><p class="hint">決まったら、このファイルの日程を直します。区のページ: <a href="' + SRC.url + '" target="_blank" rel="noopener">令和9年4月入園のページ</a></p></section>';

  var ts = allTasks();
  ts.sort(function(a, b){ return (a.due || '9999').localeCompare(b.due || '9999'); });
  h += '<section class="panel"><h2>やることリスト</h2><p class="hint" style="margin:0 0 6px">日付は目安です。必要な書類は、区の「保育のごあんない」で確認してください。チェックは、このスマホにだけ保存されます。</p>';
  ts.forEach(function(t){
    var dn = !!sched.done[t.id], k = t.due ? daysLeft(t.due) : null;
    h += '<div class="tk' + (dn ? ' dn' : '') + '"><input type="checkbox" data-t="' + esc(t.id) + '"' + (dn ? ' checked' : '') + ' aria-label="' + esc(t.title) + '"><div class="x"><b>' + esc(t.title) + '</b><small>' + (t.due ? '目安 ' + md(t.due) + ' ' + (dn ? '' : chip(k)) : '日付は決まっていません') + '</small>'
      + (t.own ? '<button type="button" class="mini" data-del="' + esc(t.id) + '">削除</button>' : '') + '</div></div>';
  });
  h += '<div class="addtk"><label class="field" for="hkNt" style="margin:0">自分のやることを足す</label><input id="hkNt" type="text" placeholder="例: 祖父母に送迎をお願いする"><label class="field" for="hkNd" style="margin:0">日付(なくても大丈夫です)</label><input id="hkNd" type="date"><button type="button" class="primary" id="hkNa">追加する</button></div></section>';
  view.innerHTML = h;
  $('hkIcs').addEventListener('click', function(){ download('hoikatsu-schedule.ics', icsText(), 'text/calendar'); });
  Array.prototype.forEach.call(view.querySelectorAll('input[data-t]'), function(c){
    c.addEventListener('change', function(){ if(c.checked) sched.done[c.dataset.t] = true; else delete sched.done[c.dataset.t]; sSave(); renderSched(); });
  });
  Array.prototype.forEach.call(view.querySelectorAll('button[data-del]'), function(b){
    b.addEventListener('click', function(){ sched.custom = sched.custom.filter(function(c){ return c.id !== b.dataset.del; }); delete sched.done[b.dataset.del]; sSave(); renderSched(); });
  });
  $('hkNa').addEventListener('click', function(){
    var t = $('hkNt').value.trim(); if(!t) return;
    sched.custom.push({id: 'c' + Date.now(), title: t, date: $('hkNd').value || ''}); sSave(); renderSched();
  });
}
renderBanner();

/* ===== 見学メモ プラス ===== */
var vSec = $('vList').closest('section');
var plus = document.createElement('section');
plus.className = 'panel'; plus.id = 'hkPlus';
vSec.parentNode.insertBefore(plus, vSec.nextSibling);
var CROWN = '<span class="hi" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M4 11l6 5 6-9 6 9 6-5-3 15H7z" fill="#ffd36b" stroke="#f0b429" stroke-width="1.5" stroke-linejoin="round"/><circle cx="4" cy="11" r="2" fill="#ff7b6b"/><circle cx="16" cy="6" r="2" fill="#ff7b6b"/><circle cx="28" cy="11" r="2" fill="#ff7b6b"/></svg></span>';
if(!PREMIUM){
  plus.innerHTML = '<h2 class="hasicon">' + CROWN + '見学メモ プラス <span class="badge" style="font-size:12px">有料版</span></h2><p class="hint">写真、質問リスト、すべての園を並べて比べる、PDF、家族での共有は、有料版の機能です(準備中)。</p>';
} else {
  plus.innerHTML = '<h2 class="hasicon">' + CROWN + '見学メモ プラス <span class="badge">有料版・お試し中</span></h2>'
  + '<p class="hint" style="margin:0 0 6px">いまは、お試しで全員が使えます。有料になるときは、先にお知らせします。</p>'
  + '<label class="field" for="hkSel">園を選ぶ</label><select id="hkSel"></select>'
  + '<details class="plus" id="hkD1"><summary>📷 写真をつける</summary><div id="hkPh"></div></details>'
  + '<details class="plus" id="hkD2"><summary>❓ 質問リスト</summary><div id="hkQ"></div></details>'
  + '<details class="plus" id="hkD3"><summary>📊 すべての園を並べて比べる</summary><div id="hkAll"></div></details>'
  + '<details class="plus" id="hkD4"><summary>📄 PDFにする・印刷する</summary><div><p class="hint" style="margin:0 0 8px">印刷の画面で「PDFに保存」を選ぶと、PDFになります。</p><button type="button" id="hkP1" style="width:100%; margin-bottom:8px">選んだ園のレポート(写真つき)</button><button type="button" id="hkP2" style="width:100%">すべての園のレポート</button></div></details>'
  + '<details class="plus" id="hkD5"><summary>👪 夫婦・家族で共有する</summary><div id="hkSh"></div></details>';
}

function vis(){ return HK.getVisits(); }
function realVisits(){ var a = vis().filter(function(v){ return !v.ex; }); return a.length ? a : vis(); }
function curId(){ var s = $('hkSel'); return s ? s.value : ''; }
function curVisit(){ var id = curId(); return vis().filter(function(v){ return v.id === id; })[0] || null; }
function vst(v){ var f = v.fac && HK.facMap[v.fac]; return f ? HK.stat(f, HK.cls()) : null; }

if(PREMIUM){
/* --- 写真(このスマホの中だけに保存) --- */
var dbp = null;
function db(){
  if(dbp) return dbp;
  dbp = new Promise(function(res, rej){
    try{
      var r = indexedDB.open('hoikatsu-photos', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('p', {keyPath: 'k'}); };
      r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); };
    }catch(e){ rej(e); }
  });
  return dbp;
}
function tx(mode, fn){
  return db().then(function(d){
    return new Promise(function(res, rej){
      var t = d.transaction('p', mode), out = fn(t.objectStore('p'));
      t.oncomplete = function(){ res(out ? out.result : undefined); }; t.onerror = function(){ rej(t.error); };
    });
  });
}
function photosOf(id){ return tx('readonly', function(s){ return s.getAll(); }).then(function(a){ return (a || []).filter(function(p){ return p.v === id; }).sort(function(x, y){ return x.t - y.t; }); }); }
function shrink(file, cb){
  var img = new Image(), url = URL.createObjectURL(file);
  img.onload = function(){
    var k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', 0.72));
  };
  img.onerror = function(){ URL.revokeObjectURL(url); cb(null); };
  img.src = url;
}
function renderPhotos(){
  var v = curVisit(), box = $('hkPh');
  if(!v){ box.innerHTML = '<p class="hint">先に、見学した園を追加してください。</p>'; return; }
  photosOf(v.id).then(function(ps){
    box.innerHTML = '<p class="hint" style="margin:0 0 8px">' + esc(v.name) + ' の写真(' + ps.length + '枚)。写真は、このスマホの中だけに保存され、共有コードやPDF以外では外に出ません。</p>'
      + '<label class="primary" style="display:flex; align-items:center; justify-content:center; min-height:52px; border-radius:999px; background:var(--accent); color:var(--accent-fg); font-weight:700; cursor:pointer">📷 写真を選ぶ・撮る<input id="hkFile" type="file" accept="image/*" multiple hidden></label>'
      + '<div class="ph">' + ps.map(function(p){ return '<figure data-k="' + esc(p.k) + '"><img src="' + p.d + '" alt="見学の写真"><button type="button" aria-label="写真を削除">✕</button></figure>'; }).join('') + '</div>';
    $('hkFile').addEventListener('change', function(e){
      var fs = Array.prototype.slice.call(e.target.files || []), n = fs.length;
      if(!n) return;
      var left = n; var done = function(){ if(--left === 0) renderPhotos(); };
      fs.forEach(function(f, i){
        shrink(f, function(d){
          if(!d){ done(); return; }
          tx('readwrite', function(s){ return s.put({k: v.id + ':' + Date.now() + ':' + i, v: v.id, t: Date.now() + i, d: d}); }).then(done, done);
        });
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('figure'), function(fg){
      fg.querySelector('img').addEventListener('click', function(){ fg.classList.toggle('big'); });
      fg.querySelector('button').addEventListener('click', function(){ tx('readwrite', function(s){ return s.delete(fg.dataset.k); }).then(renderPhotos, renderPhotos); });
    });
  }, function(){ box.innerHTML = '<p class="hint">このブラウザでは、写真を保存できません(プライベートモードなど)。</p>'; });
}

/* --- 質問リスト --- */
var Q_KEY = 'hoikatsu-q-v1';
var qd = lsGet(Q_KEY, {custom: [], a: {}});
if(!qd.custom) qd.custom = []; if(!qd.a) qd.a = {};
function qSave(){ lsSet(Q_KEY, qd); }
function allQ(){ return QUESTIONS.map(function(t, i){ return {id: 'q' + i, t: t}; }).concat(qd.custom.map(function(c){ return {id: c.id, t: c.t}; })); }
function renderQ(){
  var v = curVisit(), box = $('hkQ');
  if(!v){ box.innerHTML = '<p class="hint">先に、見学した園を追加してください。</p>'; return; }
  var a = qd.a[v.id] || (qd.a[v.id] = {}), qs = allQ(), n = qs.filter(function(q){ return a[q.id] && a[q.id].d; }).length;
  box.innerHTML = '<p class="hint" style="margin:0 0 6px">' + esc(v.name) + ': 聞けた質問 ' + n + ' / ' + qs.length + '。聞けたらチェックして、答えをメモします。</p>'
    + qs.map(function(q){
      var r = a[q.id] || {};
      return '<div class="qk"><label><input type="checkbox" data-q="' + esc(q.id) + '"' + (r.d ? ' checked' : '') + '><span>' + esc(q.t) + '</span></label><input type="text" data-n="' + esc(q.id) + '" value="' + esc(r.n || '') + '" placeholder="答えのメモ"></div>';
    }).join('')
    + '<div class="addtk"><label class="field" for="hkQn" style="margin:0">自分の質問を足す(全部の園に入ります)</label><input id="hkQn" type="text"><button type="button" class="primary" id="hkQa">追加する</button></div>';
  Array.prototype.forEach.call(box.querySelectorAll('input[data-q]'), function(c){
    c.addEventListener('change', function(){ (a[c.dataset.q] = a[c.dataset.q] || {}).d = c.checked; qSave(); renderQ(); renderAll(); });
  });
  Array.prototype.forEach.call(box.querySelectorAll('input[data-n]'), function(c){
    c.addEventListener('change', function(){ (a[c.dataset.n] = a[c.dataset.n] || {}).n = c.value; qSave(); });
  });
  $('hkQa').addEventListener('click', function(){
    var t = $('hkQn').value.trim(); if(!t) return;
    qd.custom.push({id: 'u' + Date.now(), t: t}); qSave(); renderQ();
  });
}
function askedCount(v){ var a = qd.a[v.id] || {}; return allQ().filter(function(q){ return a[q.id] && a[q.id].d; }).length; }

/* --- すべての園を並べて比べる --- */
function renderAll(){
  var vs = realVisits(), box = $('hkAll');
  if(!vs.length){ box.innerHTML = '<p class="hint">見学した園を追加すると、ここに並びます。</p>'; return; }
  function row(label, fn){ return '<tr><th scope="row">' + esc(label) + '</th>' + vs.map(function(v){ return '<td>' + fn(v) + '</td>'; }).join('') + '</tr>'; }
  var h = '<p class="hint" style="margin:0">園の数に上限はありません(無料版は3園まで)。横にスライドして見られます。</p><div class="tblwrap"><table class="cmp"><thead><tr><th scope="col">項目</th>' + vs.map(function(v){ return '<th scope="col">' + esc(v.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
  h += row('地域・見学日', function(v){ return esc(v.area) + (v.date ? '<br>' + esc(v.date.slice(5).replace('-', '/')) : ''); });
  h += row('評価 A / B', function(v){ return (v.ra || '―') + ' / ' + (v.rb || '―'); });
  h += row('入園可能数', function(v){ var s = vst(v); return s && s.vac !== null ? s.vac + '人' : '―'; });
  h += row('第1希望の倍率', function(v){ var s = vst(v); return s && s.r1 !== null ? HK.times(s.r1) : '―'; });
  h += row('全希望の倍率', function(v){ var s = vst(v); return s && s.r2 !== null ? '<b>' + HK.times(s.r2) + '</b>' : '―'; });
  h += row('○ △ ？', function(v){ var c = HK.counts(v); return '○' + c.g + ' △' + c.w + ' ？' + c.q; });
  HK.items.forEach(function(it){ h += row(it.l, function(v){ var s = v.st[it.id] || 'q'; return '<span class="s ' + s + '">' + HK.status[s].s + '</span>'; }); });
  h += row('聞けた質問', function(v){ return askedCount(v) + ' / ' + allQ().length; });
  h += row('メモ', function(v){ return esc(v.memo || '') || '―'; });
  box.innerHTML = h + '</tbody></table></div><p class="hint">○ 良い / △ 気になる / ？ 聞き忘れ。倍率は ' + HK.cls() + '歳児クラスの数字です。</p>';
}

/* --- PDF・印刷 --- */
var pr = document.createElement('div'); pr.id = 'hkPrint'; document.body.appendChild(pr);
function visitHtml(v, photos){
  var c = HK.counts(v), s = vst(v), a = qd.a[v.id] || {};
  var h = '<div class="pg"><h2>' + esc(v.name) + '</h2><p>' + esc(v.area) + (v.date ? ' ・ 見学日 ' + esc(v.date) : '') + ' ・ 評価 A ' + (v.ra || '―') + ' / B ' + (v.rb || '―') + '</p>';
  h += '<p>○' + c.g + ' △' + c.w + ' ？' + c.q + (s && s.vac !== null ? ' ・ ' + HK.cls() + '歳児 入園可能 ' + s.vac + '人' + (s.r2 !== null ? '、全希望の倍率 ' + HK.times(s.r2) : '') : '') + '</p>';
  h += '<table><tbody>' + HK.items.map(function(it){ var x = v.st[it.id] || 'q'; return '<tr><td>' + esc(it.l) + '</td><td style="width:3em">' + HK.status[x].s + '</td></tr>'; }).join('') + '</tbody></table>';
  if(v.memo) h += '<p>メモ: ' + esc(v.memo) + '</p>';
  var asked = allQ().filter(function(q){ return a[q.id] && (a[q.id].d || a[q.id].n); });
  if(asked.length) h += '<p><b>聞いたこと</b></p><ul>' + asked.map(function(q){ return '<li>' + esc(q.t) + (a[q.id].n ? ': ' + esc(a[q.id].n) : '') + '</li>'; }).join('') + '</ul>';
  if(photos && photos.length) h += '<div>' + photos.map(function(p){ return '<img src="' + p.d + '" alt="">'; }).join('') + '</div>';
  return h + '</div>';
}
function doPrint(html){ pr.innerHTML = '<h1>保活 見学レポート</h1><p>' + new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日 作成(保活アプリ)</p>' + html; setTimeout(function(){ window.print(); }, 150); }
$('hkP1').addEventListener('click', function(){
  var v = curVisit(); if(!v) return;
  photosOf(v.id).then(function(ps){ doPrint(visitHtml(v, ps.slice(0, 6))); }, function(){ doPrint(visitHtml(v, [])); });
});
$('hkP2').addEventListener('click', function(){ doPrint(realVisits().map(function(v){ return visitHtml(v, null); }).join('')); });

/* --- 共有 --- */
function shareText(){
  return '【見学メモ】\n' + realVisits().map(function(v){
    var c = HK.counts(v), s = vst(v);
    return '■' + v.name + '(' + v.area + (v.date ? '・' + v.date : '') + ')\n評価 A' + (v.ra || '―') + ' B' + (v.rb || '―') + ' / ○' + c.g + ' △' + c.w + ' ？' + c.q + (s && s.r2 !== null ? ' / 全希望の倍率 ' + HK.times(s.r2) : '') + (v.memo ? '\nメモ: ' + v.memo : '');
  }).join('\n\n');
}
function b64e(s){ return btoa(unescape(encodeURIComponent(s))); }
function b64d(s){ return decodeURIComponent(escape(atob(s))); }
function copy(text, done){
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
  else done(false);
}
$('hkSh').innerHTML = '<p class="hint" style="margin:0 0 8px">サーバーを使わずに、LINEなどで送って共有します。写真は共有されません。</p>'
  + '<button type="button" id="hkS1" style="width:100%; margin-bottom:8px">見学メモを文章で送る</button>'
  + '<button type="button" id="hkS2" style="width:100%">共有コードを作る(相手のアプリに取り込めます)</button>'
  + '<textarea id="hkCode" readonly hidden></textarea><p class="hint" id="hkSm"></p>'
  + '<label class="field" for="hkIn">受け取った共有コードを取り込む</label><textarea id="hkIn" placeholder="HK1:で始まるコードを貼り付けます"></textarea><button type="button" class="primary" id="hkS3" style="width:100%; margin-top:8px">取り込む</button>';
$('hkS1').addEventListener('click', function(){
  var t = shareText();
  if(navigator.share) navigator.share({text: t}).catch(function(){});
  else copy(t, function(ok){ $('hkSm').textContent = ok ? '文章をコピーしました。LINEなどに貼り付けてください。' : 'コピーできませんでした。'; });
});
$('hkS2').addEventListener('click', function(){
  var code = 'HK1:' + b64e(JSON.stringify({v: realVisits().filter(function(v){ return !v.ex; }), q: qd}));
  var ta = $('hkCode'); ta.hidden = false; ta.value = code; ta.focus(); ta.select();
  copy(code, function(ok){ $('hkSm').textContent = ok ? '共有コードをコピーしました。LINEなどに貼り付けて送ってください。' : '上のコードを全部コピーして、送ってください。'; });
});
$('hkS3').addEventListener('click', function(){
  var s = $('hkIn').value.trim(), m = $('hkSm');
  try{
    if(s.indexOf('HK1:') !== 0) throw new Error('x');
    var d = JSON.parse(b64d(s.slice(4))), have = {}, add = 0;
    vis().forEach(function(v){ have[v.id] = true; });
    var list = vis().filter(function(v){ return !v.ex; });
    (d.v || []).forEach(function(v){ if(v && v.id && !have[v.id]){ list.push(v); add++; } });
    var q = d.q || {};
    (q.custom || []).forEach(function(c){ if(!qd.custom.some(function(x){ return x.id === c.id; })) qd.custom.push(c); });
    Object.keys(q.a || {}).forEach(function(id){ if(!qd.a[id]) qd.a[id] = q.a[id]; });
    qSave(); HK.setVisits(list);
    m.textContent = add + '園を取り込みました。';
  }catch(e){ m.textContent = '共有コードを読み取れませんでした。HK1:から最後まで、全部貼り付けてください。'; }
});

/* --- 全体の更新 --- */
function refreshSel(){
  var s = $('hkSel'), keep = s.value;
  s.innerHTML = vis().map(function(v){ return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join('');
  if(keep && vis().some(function(v){ return v.id === keep; })) s.value = keep;
  renderPhotos(); renderQ(); renderAll();
}
$('hkSel').addEventListener('change', function(){ renderPhotos(); renderQ(); });
refreshSel();
var timer = null;
new MutationObserver(function(){ clearTimeout(timer); timer = setTimeout(refreshSel, 120); }).observe($('vList'), {childList: true, subtree: true});
}

/* 無料版のひとことを、プラスへの案内に差し替える */
var hint = $('vCmpHint');
if(hint){
  new MutationObserver(function(){
    if(hint.textContent.indexOf('準備中') >= 0 && PREMIUM) hint.textContent = '無料では3園まで比べられます。4園以上は、上の「見学メモ プラス」の「すべての園を並べて比べる」で見られます。';
  }).observe(hint, {childList: true, characterData: true, subtree: true});
}
})();

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
'.tk.dk{padding:6px 0; gap:8px}.tk.dk .x{font-size:15px; line-height:1.4}.tk.dk details{margin:0}.tk.dk summary{font-size:12px; line-height:1.3; min-height:0; height:auto; margin:0; color:var(--muted); cursor:pointer; padding:0; width:max-content; display:list-item}.tk.dk .x b{display:inline}.tk.dk .sc{font-size:11px; padding:0 8px}.tk.dk input{width:24px; height:24px}.tk.dk small{margin-top:2px}',
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
  view.hidden = false; var vd = document.getElementById('viewDocs'); if(vd) vd.hidden = true;
  var td = document.getElementById('tabDocs'); if(td) td.setAttribute('aria-selected', 'false');
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
  + '<details class="plus" id="hkD5"><summary>👪 夫婦・家族で共有する</summary><div id="hkSh"></div></details>'
  + '<details class="plus" id="hkD6"><summary>🏁 希望園の並べ方(第10希望まで)</summary><div id="hkWish"></div></details>';
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


/* --- 希望園の並べ方 --- */
var W_KEY = 'hoikatsu-wish-v1';
var wish = lsGet(W_KEY, []);
if(!Array.isArray(wish)) wish = [];
function wSave(){ lsSet(W_KEY, wish); }
var WSRC = {url: 'https://www.city.setagaya.lg.jp/01044/1554.html', name: '区「選考方法について」', upd: '2026年9月1日', checked: '2026年10月29日'};
function wVisit(id){ return vis().filter(function(v){ return v.id === id; })[0]; }
function wR2(v){ var s = vst(v); return s && s.r2 !== null ? s.r2 : null; }
function renderWish(){
  var box = $('hkWish'); if(!box) return;
  wish = wish.filter(function(id){ return wVisit(id); });
  var vs = realVisits(), h = '';
  h += '<p class="hint" style="margin:0 0 8px">区は「希望する園の数や順位で、有利・不利にはならない」と説明しています(出典: <a href="' + WSRC.url + '" target="_blank" rel="noopener">' + esc(WSRC.name) + '</a>、区の更新 ' + esc(WSRC.upd) + '、確認日 ' + esc(WSRC.checked) + ')。選考は指数の高い順です。だから、順位は<b>行きたい順</b>で大丈夫です。このリストは、考えを整理して、申込書に写すためのものです。</p>';
  h += '<p style="margin:0 0 8px"><b>' + wish.length + ' / 10園</b>(第10希望まで書けます)</p>';
  if(!wish.length) h += '<p class="hint">下から園を追加してください。見学メモに入れた園が出ます。</p>';
  wish.forEach(function(id, i){
    var v = wVisit(id), s = vst(v), r = wR2(v);
    h += '<div class="tk" style="align-items:center"><span class="sc soon" style="flex:none">第' + (i + 1) + '</span><span class="x"><b>' + esc(v.name) + '</b><small>' + esc(v.area || '') + ' / 評価 ' + (v.ra || '―') + '・' + (v.rb || '―') + ' / ' + (s && s.vac !== null ? '入園可能 ' + s.vac + '人・全希望の倍率 ' + (r !== null ? HK.times(r) : '―') : '昨年の数字なし') + '</small></span>'
      + '<span style="display:flex; gap:4px; flex:none"><button type="button" data-w="up" data-i="' + i + '" style="min-height:40px; min-width:40px; padding:0"' + (i === 0 ? ' disabled' : '') + ' aria-label="上へ">↑</button><button type="button" data-w="dn" data-i="' + i + '" style="min-height:40px; min-width:40px; padding:0"' + (i === wish.length - 1 ? ' disabled' : '') + ' aria-label="下へ">↓</button><button type="button" data-w="rm" data-i="' + i + '" style="min-height:40px; min-width:40px; padding:0" aria-label="外す">✕</button></span></div>';
  });
  var rest = vs.filter(function(v){ return wish.indexOf(v.id) < 0; });
  if(wish.length < 10 && rest.length){
    h += '<label class="field" for="hkWadd">園を追加する</label><div style="display:flex; gap:8px"><select id="hkWadd" style="flex:1; min-width:0">' + rest.map(function(v){ return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join('') + '</select><button type="button" id="hkWaddB" class="primary" style="flex:none">追加</button></div>';
  } else if(!rest.length && wish.length < 10){
    h += '<p class="hint">見学メモにある園は、すべて入っています。見学した園を増やすと、ここに出ます。</p>';
  }
  if(wish.length > 1){
    h += '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px"><button type="button" id="hkWs1" style="flex:1">倍率が低い順に並べる</button><button type="button" id="hkWs2" style="flex:1">評価が高い順に並べる</button></div>';
  }
  /* ひとこと */
  var notes = [], withR = wish.map(function(id){ return wR2(wVisit(id)); }).filter(function(x){ return x !== null; });
  if(wish.length && wish.length < 10) notes.push('まだ' + (10 - wish.length) + '園ぶん、空きがあります。区は数で不利にならないと説明しています。通える園は、ほかにも候補に入れておくと、選べる道が増えます。');
  if(withR.length >= 3 && withR.every(function(x){ return x >= 3; })) notes.push('いまの園は、' + HK.cls() + '歳児クラスで、昨年の全希望の倍率がすべて3倍以上です。倍率が低かった園も、見学の候補に入れてみてください。');
  if(wish.length && withR.length < wish.length) notes.push('昨年の数字がない園があります(新しい園や、クラスがない園など)。倍率だけで決めないでください。');
  notes.push('「内定したけれど辞退」をすると、「入園(転園)待機通知書」は出ません(区の「保育のごあんない」)。通えない園は、リストに入れないでください。');
  notes.push('倍率は昨年の数字で、今年の入りやすさを約束するものではありません。' + HK.cls() + '歳児クラスの数字です。');
  h += '<ul class="hint" style="margin:12px 0 0; padding-left:1.2em; display:grid; gap:6px">' + notes.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
  if(wish.length) h += '<button type="button" id="hkWcp" style="width:100%; margin-top:10px">申込書に写す用に、文字でコピーする</button><div id="hkWm" class="hint" role="status"></div>';
  box.innerHTML = h;
}
$('hkWish').addEventListener('click', function(e){
  var t = e.target, w = t.getAttribute && t.getAttribute('data-w'), i;
  if(w){
    i = +t.getAttribute('data-i');
    if(w === 'up' && i > 0){ var a = wish[i]; wish[i] = wish[i - 1]; wish[i - 1] = a; }
    if(w === 'dn' && i < wish.length - 1){ var b = wish[i]; wish[i] = wish[i + 1]; wish[i + 1] = b; }
    if(w === 'rm') wish.splice(i, 1);
    wSave(); renderWish(); return;
  }
  if(t.id === 'hkWaddB'){ var v = $('hkWadd').value; if(v && wish.length < 10 && wish.indexOf(v) < 0){ wish.push(v); wSave(); renderWish(); } }
  else if(t.id === 'hkWs1'){ wish.sort(function(x, y){ var a = wR2(wVisit(x)), b = wR2(wVisit(y)); return (a === null ? 1e9 : a) - (b === null ? 1e9 : b); }); wSave(); renderWish(); }
  else if(t.id === 'hkWs2'){ wish.sort(function(x, y){ function av(v){ var n = (v.ra ? 1 : 0) + (v.rb ? 1 : 0); return n ? ((v.ra || 0) + (v.rb || 0)) / n : 0; } return av(wVisit(y)) - av(wVisit(x)); }); wSave(); renderWish(); }
  else if(t.id === 'hkWcp'){
    var txt = '希望園リスト\n' + wish.map(function(id, k){ return '第' + (k + 1) + '希望 ' + wVisit(id).name; }).join('\n');
    copy(txt, function(ok){ $('hkWm').textContent = ok ? 'コピーしました。' : 'コピーできませんでした。画面の文字を見て写してください。'; });
  }
});

/* --- 全体の更新 --- */
function refreshSel(){
  var s = $('hkSel'), keep = s.value;
  s.innerHTML = vis().map(function(v){ return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join('');
  if(keep && vis().some(function(v){ return v.id === keep; })) s.value = keep;
  renderPhotos(); renderQ(); renderAll(); renderWish();
}
$('hkSel').addEventListener('change', function(){ renderPhotos(); renderQ(); });
refreshSel();
var timer = null;
new MutationObserver(function(){ clearTimeout(timer); timer = setTimeout(refreshSel, 120); }).observe($('vList'), {childList: true, subtree: true});
}

/* ===== 提出前チェックと書類リスト ===== */
var DSRC = {
  name: '世田谷区「保育のごあんない」(令和8年9月)・区の保育園申込のページ',
  url: 'https://www.city.setagaya.lg.jp/01044/1552.html',
  my: 'https://www.city.setagaya.lg.jp/01044/1560.html',
  checked: '2026年10月29日'
};
var SITS = [
  ['work', '就労(会社員・パートなど。内定を含む)'],
  ['self', '自営(予定を含む)'],
  ['search', '求職中'],
  ['leave', '育児休業中(復職予定)'],
  ['ill', '病気・けが'],
  ['disab', '障害'],
  ['care', '介護・看護'],
  ['study', '就学(予定を含む)'],
  ['birth', '出産(予定)']
];
var SIT_DOCS = {
  work: [['就労証明書(区指定の様式)', '勤務先に書いてもらいます。勤め先が複数あるときは、すべて必要です。シフト制などで勤務時間が決まっていないときは、シフト表やスケジュールも出します。', true]],
  self: [['就労証明書(区指定の様式)', '自営の方も区指定の様式です。', true], ['事業の実態がわかる資料', '営業許可証、登記事項証明書など。保護者か3親等内の親族が代表者の会社も、自営として扱われます。', false]],
  search: [['就労確約書', '求職で申込むときに出します。申請から3か月たってもまだ求職で申込むときは、就労確約書の出し直しと、求職活動状況報告書が必要です。', false]],
  leave: [['育児休業の確認書類', '雇用保険に入っている方は「育児休業給付金支給決定通知書」の写し。雇用保険に入っていない外勤の方は「育児・介護休業取扱通知書」の写し。自営の方は出産から子が満1歳になる年度末まで対象で、この書類は不要と案内されています。', false], ['復職証明書(入園が決まったあと)', '復職したあと2週間以内に出します。入園月の月末に育休中だと選考の対象外です。入園した月のうちに、同じ勤め先へ復職することが条件です。', false]],
  ill: [['医師の診断書', '保育ができないことが書かれたもの。', true]],
  disab: [['障害者手帳などの写し', '身体障害者手帳、精神障害者保健福祉手帳、療育手帳などの写し。', false]],
  care: [['介護状況申告書', '介護度がわかる書類なども付けます。場合によって、手帳の写しや診断書を求められます。', false]],
  study: [['就学(予定)状況証明書', '通っている(通う予定の)学校に書いてもらいます。', true]],
  birth: [['母子健康手帳の写し', '表紙と、分娩予定日のページ。出産で申込んだ場合、出産の要件の期間が終わると申込みは無効になります。', false]]
};
var DOPTS = [
  ['single', 'ひとり親(保護者がひとり)', [['ひとり親世帯の申立書', '離婚・死別などの状況がわかる資料(児童扶養手当証書、ひとり親医療証、戸籍謄本など)も付けられます。未婚や事実婚でも、保育にかかわるパートナーがいるときは、ひとり親にはなりません。', false]]],
  ['ext', '区立保育園の延長保育を使いたい(満1歳以上・月ぎめ)', [['区立保育園等延長保育申込書', 'オンライン(電子申請)ではできません。', false]]],
  ['ninka', 'いま認可外保育施設・ベビーシッターなどに預けている', [['受託証明書', '預けている施設ごとに必要です。施設に書いてもらいます。これから預けるときは、預け始めてから出します。ベビーシッターなどの場合は、認可外保育施設設置届の写しも付けます。', true]]],
  ['move', '世田谷区へ転入する予定がある', [['本人確認書類・転入に関する申立書・転入を証明する資料', '入園月の前月までに転入が確認できるときだけ、区民と同じ指数で選考されます。', false]]]
];
var DOC_COMMON = [
  ['申込書兼給付認定申請書', '「保育所等入園(転園)申込書兼教育・保育給付認定申請書(2号・3号認定用)」。世帯で1通です。区のページからダウンロードできます。'],
  ['マイナンバーの番号確認', 'マイナンバーカード、またはマイナンバーが書かれた住民票の写しなど。窓口は原本を見せます。郵送は写しを同封します。'],
  ['本人確認', '運転免許証など1点、または健康保険証など2点以上。窓口は原本、郵送は写し。保険証の写しは、記号・番号・保険者番号を黒く塗ります。'],
  ['税の書類', '令和9年4月入園は、令和8年度の住民税課税証明書(または住民税決定通知書)。税の未申告のときは先に申告が必要です(確定申告書の控えや源泉徴収票では代わりになりません)。配偶者控除の対象になっている方は、税の書類も申告も不要です。']
];
var D_KEY = 'hoikatsu-docs-v1';
var dd = lsGet(D_KEY, {a: 'work', b: 'work', opts: {}, done: {}, way: 'mail'});
if(!dd.opts) dd.opts = {}; if(!dd.done) dd.done = {}; if(!dd.way) dd.way = 'mail';
function dSave(){ lsSet(D_KEY, dd); }
function evDate(id){ return EVENTS.filter(function(e){ return e.id === id; })[0].date; }
function monthsBack(s, n){ var d = ymd(s); d.setMonth(d.getMonth() - n); return fmt(d); }

var tbD = document.createElement('button');
tbD.type = 'button'; tbD.id = 'tabDocs'; tbD.className = 'hero'; tbD.setAttribute('role', 'tab'); tbD.setAttribute('aria-selected', 'false');
tbD.style.gridColumn = 'span 12';
tbD.innerHTML = '<span class="ti">📋</span><span>提出前チェックと書類リスト</span>';
tabs.insertBefore(tbD, $('tabFind'));
var viewD = document.createElement('div'); viewD.id = 'viewDocs'; viewD.hidden = true;
view.parentNode.insertBefore(viewD, view);
var TABIDS = ['tabIndex', 'tabSched', 'tabFind', 'tabCmp', 'tabVisit', 'tabAbout'];
function showDocs(){
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = true; viewD.hidden = false;
  TABIDS.forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); });
  tbD.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  renderDocs(); window.scrollTo(0, 0);
}
tbD.addEventListener('click', showDocs);
Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(b){
  if(b !== tbD) b.addEventListener('click', function(){ viewD.hidden = true; tbD.setAttribute('aria-selected', 'false'); });
});

function docList(){
  var out = [], seen = {};
  function add(id, t, n, dated, grp){ if(seen[id]) return; seen[id] = 1; out.push({id: id, t: t, n: n, dated: dated, grp: grp}); }
  DOC_COMMON.forEach(function(x, i){ add('c' + i, x[0], x[1], false, '全員が出すもの'); });
  [['a', '保護者1'], ['b', '保護者2']].forEach(function(p){
    var s = dd[p[0]];
    if(p[0] === 'b' && s === 'none') return;
    (SIT_DOCS[s] || []).forEach(function(x, i){ add(p[0] + s + i, x[0], x[1], x[2], p[1] + 'の分'); });
  });
  DOPTS.forEach(function(o){ if(dd.opts[o[0]]) o[2].forEach(function(x, i){ add(o[0] + i, x[0], x[1], x[2], 'あてはまる方だけ'); }); });
  return out;
}
function selHtml(id, val, withNone){
  var h = '<select id="' + id + '" style="width:100%">';
  SITS.forEach(function(s){ h += '<option value="' + s[0] + '"' + (val === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; });
  if(withNone) h += '<option value="none"' + (val === 'none' ? ' selected' : '') + '>いない(ひとり親など)</option>';
  return h + '</select>';
}
function dRow(id, t, n, dated){
  var on = dd.done[id];
  return '<div class="tk dk' + (on ? ' dn' : '') + '"><input type="checkbox" data-d="' + id + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(t) + '"><span class="x"><b>' + esc(t) + '</b>' + (dated ? ' <span class="sc soon">3か月以内</span>' : '') + '<details><summary>くわしく</summary><small>' + esc(n) + '</small></details></span></div>';
}
function renderDocs(){
  var list = docList(), done = list.filter(function(d){ return dd.done[d.id]; }).length;
  var dl = dd.way === 'mail' ? evDate('first-mail') : evDate('first-visit');
  var k = daysLeft(dl);
  var h = '<section class="panel"><h2>提出前チェックと書類リスト</h2><p class="hint" style="margin:0">令和9年4月入園(認可保育園)の申込みに必要な書類を、状況に合わせて一覧にします。出典: <a href="' + DSRC.url + '" target="_blank" rel="noopener">' + esc(DSRC.name) + '</a>(確認日 ' + esc(DSRC.checked) + ')。人によって増える書類もあるので、出す前に区のページでも確認してください。</p></section>';
  h += '<section class="panel"><h2>1. あてはまる状況を選ぶ</h2>'
    + '<label class="field" for="hkDa">保護者1の状況</label>' + selHtml('hkDa', dd.a, false)
    + '<label class="field" for="hkDb">保護者2の状況</label>' + selHtml('hkDb', dd.b, true);
  DOPTS.forEach(function(o){ h += '<label class="qk" style="border-top:0"><span style="display:flex; gap:10px; align-items:flex-start"><input type="checkbox" data-o="' + o[0] + '"' + (dd.opts[o[0]] ? ' checked' : '') + ' style="width:24px; height:24px; flex:none"><span>' + esc(o[1]) + '</span></span></label>'; });
  h += '</section>';
  h += '<section class="panel"><h2>2. 出し方と、書類の日付</h2>'
    + '<label class="field" for="hkDway">出し方</label><select id="hkDway" style="width:100%"><option value="mail"' + (dd.way === 'mail' ? ' selected' : '') + '>郵送・オンライン(締切 ' + md(evDate('first-mail')) + ')</option><option value="visit"' + (dd.way === 'visit' ? ' selected' : '') + '>窓口(締切 ' + md(evDate('first-visit')) + ')</option></select>'
    + '<div class="nx"><div class="big">あと' + (k < 0 ? 0 : k) + '日</div><div>' + (k < 0 ? 'この締切は過ぎています。' : '締切 ' + md(dl)) + '</div></div>'
    + '<p class="hint">就労証明書・診断書・就学証明・受託証明書は、<b>提出日の直近3か月以内</b>に作られたものが必要です。締切日に出す場合の目安は、<b>' + md(monthsBack(dl, 3)) + '以降</b>の日付のものです。書いてもらうのに日数がかかるので、早めにお願いしましょう。</p></section>';
  h += '<section class="panel"><h2>3. 書類リスト <span class="sc ' + (done === list.length ? '' : 'soon') + '">' + done + '/' + list.length + '</span></h2>';
  var last = '';
  list.forEach(function(d){
    if(d.grp !== last){ h += '<h3 style="font-size:14px; margin:10px 0 0; color:var(--muted)">' + esc(d.grp) + '</h3>'; last = d.grp; }
    h += dRow(d.id, d.t, d.n, d.dated);
  });
  h += '<p class="hint">様式のダウンロードは <a href="' + DSRC.url + '" target="_blank" rel="noopener">区の申込みのページ</a>、マイナンバーの確認は <a href="' + DSRC.my + '" target="_blank" rel="noopener">区のマイナンバーのページ</a> へ。</p></section>';
  var CHK = [
    ['pen', '鉛筆・消せるボールペン・修正液・修正テープで書いたところがない', '使うと無効になります。'],
    ['fill', '申込書にもれなく書いて、うそがない', 'うその記載は無効になります。'],
    ['back', '申込書の裏面の「入園申込送付書類チェックリスト」で確認した', '送る前の最後の確認に使います。'],
    ['copy', '出す書類のコピーをとった', '一度出した書類は、理由にかかわらず返してもらえません。'],
    ['way', dd.way === 'mail' ? '郵送は、特定記録郵便か簡易書留にした(締切は消印有効)' : '窓口に行く日と時間を決めた', dd.way === 'mail' ? '普通郵便で届かなかったときは、区は責任を負えません。郵送の締切は窓口より早く設定されています。送ったあとに届く「提出書類等確認票」は、入園が決まるまで保管します。' : '窓口の締切は郵送より遅いですが、期限ぎりぎりは混みます。'],
    ['web', '(オンラインのとき)申請者IDとパスワードを控えた', '申請したあとの確認のたびに必要です。添付ファイルが読み取れないと、郵送での提出を求められることがあります。']
  ];
  h += '<section class="panel"><h2>4. 出す前の最終チェック</h2>';
  CHK.forEach(function(c){ h += dRow('z' + c[0], c[1], c[2], false); });
  h += '</section>';
  h += '<section class="panel"><p class="hint" style="margin:0">この一覧は、区の公開資料をもとにした目安です。申込みのルールや必要書類は、区が決めたものが正しいので、出す前に必ず区のページか窓口で確認してください。</p></section>';
  h += draftSection();
  viewD.innerHTML = h;
}

/* --- 下書き: 書き写しメモ / 勤務先への依頼文 --- */
var F_KEY = 'hoikatsu-draft-v1';
var fd = lsGet(F_KEY, {});
if(!fd || typeof fd !== 'object') fd = {};
var DFIELDS = [
  ['申込むお子さん', [['cn', 'お子さんの名前(ふりがなも)', ''], ['cb', '生年月日', '例: 令和◯年◯月◯日'], ['cm', '入園希望月', '令和9年4月']]],
  ['世帯', [['ad', '住所', ''], ['sb', 'きょうだい(名前・年齢)', '例: 上の子 4歳']]],
  ['保護者1', [['an', '氏名・続柄', ''], ['aw', '勤務先の名前・住所・電話', ''], ['at', '勤務の曜日と時間(通勤時間も)', '例: 月〜金 9:00〜18:00、通勤30分']]],
  ['保護者2', [['bn', '氏名・続柄', ''], ['bw', '勤務先の名前・住所・電話', ''], ['bt', '勤務の曜日と時間(通勤時間も)', '']]]
];
function fSave(){ lsSet(F_KEY, fd); }
function draftText(){
  var t = '【入園申込 書き写しメモ】令和9年4月入園\n';
  DFIELDS.forEach(function(g){
    var rows = g[1].filter(function(f){ return fd[f[0]]; });
    if(rows.length) t += '\n■' + g[0] + '\n' + rows.map(function(f){ return f[1] + ': ' + fd[f[0]]; }).join('\n') + '\n';
  });
  if(wish.length) t += '\n■希望園\n' + wish.map(function(id, k){ var v = wVisit(id); return '第' + (k + 1) + '希望 ' + (v ? v.name : ''); }).join('\n') + '\n';
  return t;
}
function empText(dl){
  var ak = addDays(dl, -10), ask = daysLeft(ak) > 0 ? md(ak) + 'ごろ' : null;
  return 'お疲れさまです。\n認可保育園の入園申込みのため、就労証明書(世田谷区指定の様式)の作成をお願いしたく、ご連絡しました。\n\n様式は、区のホームページからダウンロードしたものを添付します。\n区への提出期限が' + md(dl) + 'のため、' + (ask ? ask + 'までに' : 'お忙しいところ恐縮ですが、なるべく早く') + 'いただけると助かります。\n発行日は、提出日の直近3か月以内のものが必要です。(' + md(monthsBack(dl, 3)) + '以降の日付でお願いします)\n\nお手数をおかけしますが、どうぞよろしくお願いいたします。';
}
function draftSection(){
  var dl = dd.way === 'mail' ? evDate('first-mail') : evDate('first-visit');
  var h = '<section class="panel"><h2>5. 下書き</h2><p class="hint" style="margin:0 0 6px">区の申込書は、決まった様式に自分で書きます。ここでは、書く内容を先に整えておくメモと、勤務先へのお願いの文章を作ります。<b>マイナンバーや口座番号は、入れないでください。</b>入れた内容は、この端末の中だけに保存されます。</p>';
  DFIELDS.forEach(function(g){
    h += '<h3 style="font-size:15px; margin:14px 0 2px; color:var(--muted)">' + esc(g[0]) + '</h3>';
    g[1].forEach(function(f){ h += '<label class="field" for="hkF_' + f[0] + '">' + esc(f[1]) + '</label><input type="text" id="hkF_' + f[0] + '" data-f="' + f[0] + '" value="' + esc(fd[f[0]] || (f[0] === 'cm' ? '令和9年4月' : '')) + '" placeholder="' + esc(f[2]) + '" style="width:100%">'; });
  });
  h += '<p class="hint">希望園は、「見学メモ プラス」の「希望園の並べ方」で作ったリストが、メモの最後に入ります(' + wish.length + '園)。</p>'
    + '<button type="button" id="hkFcp" style="width:100%; margin-top:6px">書き写しメモを文字でコピーする</button>'
    + '<h3 style="font-size:15px; margin:18px 0 2px; color:var(--muted)">勤務先への依頼文(就労証明書)</h3>'
    + '<textarea id="hkEmp" readonly style="width:100%; min-height:200px; font:inherit; font-size:14px">' + esc(empText(dl)) + '</textarea>'
    + '<button type="button" id="hkEcp" style="width:100%; margin-top:6px">依頼文をコピーする</button><div id="hkFm" class="hint" role="status"></div></section>';
  return h;
}
viewD.addEventListener('input', function(e){
  var k = e.target.getAttribute && e.target.getAttribute('data-f');
  if(k){ fd[k] = e.target.value; fSave(); }
});
viewD.addEventListener('click', function(e){
  var id = e.target.id, m = $('hkFm');
  if(id === 'hkFcp') copy(draftText(), function(ok){ m.textContent = ok ? 'コピーしました。' : 'コピーできませんでした。'; });
  else if(id === 'hkEcp') copy($('hkEmp').value, function(ok){ m.textContent = ok ? 'コピーしました。' : 'コピーできませんでした。文字を長押しして選んでください。'; });
});

viewD.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'hkDa'){ dd.a = t.value; dSave(); renderDocs(); }
  else if(t.id === 'hkDb'){ dd.b = t.value; dSave(); renderDocs(); }
  else if(t.id === 'hkDway'){ dd.way = t.value; dSave(); renderDocs(); }
  else if(t.getAttribute('data-o')){ dd.opts[t.getAttribute('data-o')] = t.checked; dSave(); renderDocs(); }
  else if(t.getAttribute('data-d')){ dd.done[t.getAttribute('data-d')] = t.checked; dSave(); renderDocs(); }
});

/* 無料版のひとことを、プラスへの案内に差し替える */
var hint = $('vCmpHint');
if(hint){
  new MutationObserver(function(){
    if(hint.textContent.indexOf('準備中') >= 0 && PREMIUM) hint.textContent = '無料では3園まで比べられます。4園以上は、上の「見学メモ プラス」の「すべての園を並べて比べる」で見られます。';
  }).observe(hint, {childList: true, characterData: true, subtree: true});
}
})();

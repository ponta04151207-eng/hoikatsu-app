/* 保活アプリ 追加機能: スケジュール / 見学メモ プラス(有料版・お試し中)
   hoikatsu.html から読み込まれます。日付や質問を直すときは、このファイルだけを編集します。 */
(function(){
'use strict';
var HK = window.HK;
if(!HK || !document.querySelector('.tabs')) return;
var $ = function(id){ return document.getElementById(id); };
var esc = HK.esc;
var CR = '<svg class="cr" viewBox="0 0 32 32" width="18" height="18" aria-label="有料版の機能" role="img" style="vertical-align:-3px; flex:none"><path d="M4 11l6 5 6-9 6 9 6-5-3 15H7z" fill="#ffd36b" stroke="#f0b429" stroke-width="1.5" stroke-linejoin="round"/><circle cx="4" cy="11" r="2" fill="#ff7b6b"/><circle cx="16" cy="6" r="2" fill="#ff7b6b"/><circle cx="28" cy="11" r="2" fill="#ff7b6b"/></svg>';
/* ===== 有料版の設定 =====
   TRIAL = true の間は、有料の機能を全員に開けておきます(お試し)。有料を始めるときに false にします。
   PAYLINK: Stripeの「支払いリンク」のURL。空のあいだは、購入ボタンは出ません。
   CODE_HASHES: 購入コードの「ハッシュ」と有効期限の一覧(tools/make_code.py で作ります)。例: ['ハッシュ', '2026-11-30']
   コードそのものは、ここに書きません。期限が過ぎると、有料の機能は閉じます。更新のコードを入れると、また開きます。 */
var TRIAL = true;
var PAYLINK = '';
var PRICE = '490円(税込)/月';
var PAYLINK_M = ''; /* 月ごとのプランの支払いリンク */
var sel = 'month';
var UNTIL = '2027年4月30日';
var CODE_HASHES = [];
var API_URL = 'https://hoikatsu-api.ponta04151207.workers.dev'; /* 購入の確認サーバー(worker/)のアドレス。空のあいだは、手で渡すコードだけが使えます */
var UL_KEY = 'hoikatsu-unlock-v1';
function unlockTok(){ var o = lsGet(UL_KEY, null); return (o && typeof o === 'object' && o.tok) ? o.tok : null; }
function unlockUntil(){ var o = lsGet(UL_KEY, null); return (o && typeof o === 'object' && o.until) ? o.until : null; }
function unlockActive(){ var u = unlockUntil(); if(!u) return false; var t = new Date(); var today = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); return u >= today; }
var PREMIUM = TRIAL || unlockActive();
window.HK_PREMIUM = PREMIUM; if(window.HK){ try{ HK.renderFind(); HK.rerender(); }catch(e){} }

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
  {id:'first-result', date:'2027-01-20', kind:'区', title:'一次選考の結果公表(令和9年4月入園)', note:'区の「入園のご相談および申込み方法」のページの表にある日付です。'},
  {id:'second-mail', date:'2027-01-27', kind:'締切', title:'二次選考 申込締切(郵送・オンライン)', note:'消印有効です。一次で内定しなかった人は、改めて申し込む必要はありません。状況が変わったら書類を出します。'},
  {id:'second-visit', date:'2027-02-01', kind:'締切', title:'二次選考 申込締切(窓口に持っていく場合)', note:'厳守です。'},
  {id:'second-result', date:'2027-02-18', kind:'区', title:'二次選考の結果公表(令和9年4月入園)', note:'区の「入園のご相談および申込み方法」のページの表にある日付です。'},
  {id:'start', date:'2027-04-01', kind:'入園', title:'令和9年4月 入園', note:''}
];
var UNDATED = [
  '令和9年4月(一次)の入園申込者数の公表(区は「今後公開予定」としています)',
  '令和9年4月(二次)の入園可能数の公表(区は「今後公開予定」としています)',
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
  {id:'t-result', ev:'first-result', off:0, title:'一次選考の結果を確認する(結果公表日)'},
  {id:'t-after', ev:null, title:'内定したら、入園の手続きと準備を始める'}
];

/* ===== 見学メモ プラス: 質問リスト ===== */
var QUESTIONS = [
  'クラスの人数と先生の人数',
  '慣らし保育の期間と進め方',
  '発熱時のお迎え・病児保育の使い方',
  '給食・アレルギー対応・離乳食',
  '持ち物(布団・おむつ)と名前つけ',
  '延長保育の時間と料金',
  '送迎の時間帯・駐輪場・きょうだい配慮',
  '保育料以外の費用(用品代・行事費)',
  '先生の入れ替わりの様子',
  '連絡帳(紙・アプリ)と連絡方法'
];
var QOPT = {
  q0: [{p:'クラスの人数', o:['〜10人','11〜15人','16〜20人','21人以上']}, {p:'先生1人あたり', o:['3人まで','4〜5人','6人以上']}],
  q1: [{p:'期間', o:['1週間以内','2週間','3週間','1か月','1か月以上']}],
  q2: [{p:'お迎えの熱', o:['37.5度以上','38度以上','38.5度以上','園の判断']}, {p:'病児保育', o:['使える','使えない','提携あり']}],
  q3: [{p:'給食', o:['自園調理','外部搬入','お弁当']}, {p:'アレルギー', o:['除去食あり','相談して対応','対応なし']}],
  q4: [{p:'持ち物', o:['少ない','ふつう','多い']}, {p:'名前つけ', o:['少ない','ふつう','多い']}],
  q5: [{p:'終わる時間', o:['延長なし','18:30まで','19:00まで','19:30まで','20:00以降']}, {p:'料金', o:['無料','月1,000円まで','月3,000円まで','月5,000円まで','それ以上']}],
  q6: [{p:'駐輪場', o:['あり','なし','台数少ない']}, {p:'きょうだい', o:['配慮あり','配慮なし']}],
  q7: [{p:'月の費用', o:['0円','〜1,000円','〜3,000円','〜5,000円','5,000円以上']}],
  q8: [{p:'入れ替わり', o:['少ない','ふつう','多い']}],
  q9: [{p:'連絡方法', o:['紙の連絡帳','アプリ','両方']}]
};


/* ===== 有料版のカギ ===== */
function legalLinks(){ return '<a href="terms.html" target="_blank" rel="noopener">利用規約</a> / <a href="privacy.html" target="_blank" rel="noopener">プライバシー</a> / <a href="tokusho.html" target="_blank" rel="noopener">特定商取引法に基づく表記</a>'; }
function buyHtml(onlyCode){
  if(onlyCode) return '<label class="field">購入コードを持っているとき</label>' + '<p class="hint" style="margin:0 0 6px">購入コードは、有料プランを買ったことをアプリに知らせる合言葉です。<br>別のスマホや、機種変更のときに、同じコードを入れると有料版が使えます。<br>人には見せないでください。</p>' + '<div style="display:flex; gap:8px"><input type="text" class="hkCode" aria-label="購入コード" autocomplete="off" autocapitalize="characters" placeholder="購入コード" style="flex:1; min-width:0"><button type="button" data-unlock="1" style="flex:none">開く</button></div><div class="hint" data-um="1" role="status"></div>';
  return '<p style="margin:10px 0 4px"><b>' + CR + ' 毎月プラン ' + esc(PRICE) + '</b><br><span class="hint">毎月自動で更新されます。いつでも解約できます。有料の機能がすべて使えます。夫婦の2人で使えます。</span></p>'
    + (PAYLINK_M ? '<a class="primary" href="' + esc(PAYLINK_M) + '" target="_blank" rel="noopener" style="display:block; text-align:center; text-decoration:none; padding:12px; border-radius:999px; font-weight:700; margin:8px 0">購入する</a>' : '<p class="hint">購入の受付は、準備中です。</p>')
    + '<label class="field">購入コードを持っているとき</label>' + '<p class="hint" style="margin:0 0 6px">購入コードは、有料プランを買ったことをアプリに知らせる合言葉です。<br>別のスマホや、機種変更のときに、同じコードを入れると有料版が使えます。<br>人には見せないでください。</p>' + '<div style="display:flex; gap:8px"><input type="text" class="hkCode" aria-label="購入コード" autocomplete="off" autocapitalize="characters" placeholder="購入コード" style="flex:1; min-width:0"><button type="button" data-unlock="1" style="flex:none">開く</button></div><div class="hint" data-um="1" role="status"></div>'
    + '<p class="hint" style="margin-top:10px">' + legalLinks() + '</p>';
}
function lockCard(name){ return '<section class="panel"><h2>' + CR + ' ' + esc(name) + '</h2><p class="hint" style="margin:0">この機能は、有料版です。</p>' + buyHtml() + '</section>'; }
function sha256hex(t){
  var b = new TextEncoder().encode(t);
  return crypto.subtle.digest('SHA-256', b).then(function(h){ return Array.prototype.map.call(new Uint8Array(h), function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); });
}
document.addEventListener('click', function(e){
  var t = e.target; if(!t.getAttribute || !t.getAttribute('data-unlock')) return;
  var box = t.parentNode.parentNode, inp = box.querySelector('.hkCode'), msg = box.querySelector('[data-um]');
  var code = (inp.value || '').toUpperCase().replace(/[\s\-ー]/g, '');
  if(!code){ msg.textContent = 'コードを入れてください。'; return; }
  if(!(window.crypto && crypto.subtle)){ msg.textContent = 'この環境では確認できません。別のブラウザで開いてください。'; return; }
  sha256hex(code).then(function(h){
    var hit = CODE_HASHES.filter(function(x){ return x[0] === h; })[0];
    if(hit){
      var t = new Date(), today = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
      if(hit[1] < today){ msg.textContent = 'このコードは、有効期限(' + hit[1] + ')が過ぎています。新しいコードを入れてください。'; return; }
      lsSet(UL_KEY, {until: hit[1]}); msg.textContent = '開きました。画面を読み直します。'; setTimeout(function(){ location.reload(); }, 600);
    }
    else if(API_URL){
      var tk = code;
      fetch(API_URL + '/status?token=' + encodeURIComponent(tk)).then(function(r){ return r.json().then(function(j){ return [r.status, j]; }); }).then(function(a){
        if(a[0] === 200 && a[1].active){ lsSet(UL_KEY, {until: a[1].until, tok: tk}); msg.textContent = '開きました。画面を読み直します。'; setTimeout(function(){ location.reload(); }, 600); }
        else if(a[0] === 200) msg.textContent = 'このコードの有効期限が過ぎています。';
        else msg.textContent = 'コードが合いません。購入のあとに表示された、コードを確認してください。';
      }).catch(function(){ msg.textContent = '通信できませんでした。電波のよいところで、もう一度どうぞ。'; });
    }
    else msg.textContent = 'コードが合いません。購入のあとに表示された、コードを確認してください。';
  });
});

/* ===== 見た目 ===== */
var css = document.createElement('style');
css.textContent = [
    '.vmemo .vml{margin:2px 0 6px; padding-left:1.1em; font-size:12px; line-height:1.5}',
    '#viewVisit #vForm{padding:11px 12px 10px!important}',
    '#viewVisit #vForm h2{font-size:15px!important; margin:0 0 4px!important; line-height:1.35!important}',
    '#viewVisit #vForm h3.grp{font-size:12.5px!important; margin:8px 0 2px!important; padding:2px 10px!important}',
    '#viewVisit #vForm .hint{font-size:10.5px!important; line-height:1.4!important; margin:2px 0 3px!important}',
    '#viewVisit #vForm label.field{font-size:11.5px!important; margin:6px 0 2px!important; line-height:1.3!important}',
    '#viewVisit #vForm select,#viewVisit #vForm input[type=text],#viewVisit #vForm input[type=date]{height:32px!important; min-height:32px!important; font-size:12.5px!important; padding:2px 10px!important; border-radius:10px!important}',
    '#viewVisit #vForm textarea{font-size:12.5px!important; min-height:40px!important; height:44px!important; padding:5px 10px!important; border-radius:10px!important; line-height:1.4!important}',
    '#viewVisit #vForm textarea#v-memo,#viewVisit #vForm textarea#v-rmemo{height:44px!important}',
    '#viewVisit #vForm .vmic{min-height:24px!important; padding:0 10px!important; font-size:11px!important; margin:3px 0 0!important}',
    '#viewVisit #vForm .vnote{font-size:10px!important; margin-left:4px!important; white-space:nowrap!important}',
    '#viewVisit #vForm .item{padding:3px 0!important; gap:6px!important; min-height:0!important}',
    '#viewVisit #vForm .item .il{font-size:12px!important; line-height:1.3!important}',
    '#viewVisit #vForm .seg label span{min-width:34px!important; height:28px!important; min-height:28px!important; font-size:13px!important; line-height:28px!important; padding:0 6px!important}',
    '#viewVisit #vForm .gradebox{font-size:12px!important; padding:6px 10px!important; margin-top:6px!important}',
    '#viewVisit #vForm .nav{margin-top:10px!important; gap:8px!important}',
    '#viewVisit #vForm .nav button{min-height:36px!important; padding:3px 14px!important; font-size:13px!important}',
    '#viewVisit #hkQ .qsel{display:flex; gap:5px; margin:3px 0 0 21px}',
    '#viewVisit #hkQ .qsel select{flex:1; min-width:0; height:27px!important; min-height:27px!important; font-size:11.5px!important; padding:0 22px 0 8px!important; border-radius:9px!important; letter-spacing:0!important; background-position:right 6px center!important}',
    '#viewVisit #hkQ .qk{padding:3px 0!important}',
    '#viewVisit #hkQ .qk label{font-size:clamp(10.5px,3.1vw,12px)!important; gap:6px!important; align-items:center!important; letter-spacing:0!important}',
    '#viewVisit #hkQ .qk label > span{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0}',
    '#viewVisit #hkQ .qk input[type=checkbox]{width:15px!important; height:15px!important; min-width:15px!important; margin:0!important}',
    '#viewVisit #hkQ .qk input[type=text]{height:26px!important; min-height:26px!important; margin:3px 0 0 21px!important; width:calc(100% - 21px)!important; font-size:11.5px!important; padding:1px 9px!important}',
    '#hkQ .hint{font-size:11px!important; line-height:1.4!important; margin:0 0 4px!important}',
    '#hkQ .qk{padding:5px 0!important; display:block!important; border-top:1px dotted #d3dfe5!important}',
    '#hkQ .qk label{display:flex!important; align-items:flex-start!important; gap:7px!important; min-height:0!important; font-size:12.5px!important; line-height:1.4!important; font-weight:700!important}',
    '#hkQ .qk input[type=checkbox]{width:17px!important; height:17px!important; min-width:17px!important; min-height:0!important; margin:1px 0 0!important; flex:none}',
    '#hkQ .qk input[type=text]{height:30px!important; min-height:30px!important; margin:4px 0 0 24px!important; width:calc(100% - 24px)!important; font-size:12px!important; padding:2px 10px!important; border-radius:9px!important}',
    '#hkQ .addtk{margin-top:8px!important; display:flex!important; flex-wrap:wrap; gap:5px!important; align-items:center}',
    '#hkQ .addtk label{font-size:11.5px!important; flex:1 0 100%; margin:0!important}',
    '#hkQ .addtk input[type=text]{height:30px!important; min-height:30px!important; flex:1; min-width:0; font-size:12px!important; padding:2px 10px!important}',
    '#hkQ .addtk button{min-height:30px!important; padding:2px 12px!important; font-size:12px!important}',
    '.vph{display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:6px 0 0; font-weight:400}',
    '.vph .vphb{display:inline-flex; align-items:center; min-height:28px!important; padding:1px 10px!important; font-size:12px!important; border-radius:999px; border:1.5px solid #bfe3d8; background:#f1faf7; color:#1d6b5c; font-weight:700; cursor:pointer}',
    '.vph .vphg{position:relative; margin:0}',
    '.vph .vphg img{width:52px; height:52px; object-fit:cover; border-radius:8px; border:1px solid #d8e3e8; display:block}',
    '.vph .vphg.big{flex-basis:100%}.vph .vphg.big img{width:100%; height:auto; max-height:70vh; object-fit:contain}',
    '.vph .vphx{position:absolute; top:-5px; right:-5px; width:20px!important; height:20px!important; min-height:0!important; min-width:0!important; padding:0!important; border-radius:50%!important; font-size:11px!important; line-height:1; background:#fff; border:1px solid #c9d6dc!important}',
    '.vph .vphm{font-size:11px; color:#a3281f}',
    '.feat li.fpd ~ li .ft b{font-size:15.5px!important; font-weight:900!important; color:#0b5f52!important; -webkit-text-stroke:.3px #0b5f52; letter-spacing:.01em}',
    '#viewDocs a.olink{display:block; margin:8px 0 2px; padding:9px 12px; border-radius:999px; background:#0f8a7a; color:#fff!important; text-align:center; font-size:13px; font-weight:800; text-decoration:none!important; box-shadow:0 2px 0 #0a6b5e}',
    '.feat li.fpd{display:flex!important; align-items:center; gap:8px; margin:12px 0 4px!important; padding:6px 10px!important; border:1.5px solid #e8c15a!important; border-radius:10px; background:linear-gradient(135deg,#fff6d6,#fffaf0); list-style:none; font-size:13px; font-weight:800; color:#8a5a00}',
    '.feat .fbd{display:inline-block; margin-left:6px; padding:0 8px; border-radius:999px; font-size:11px; font-weight:800; line-height:1.6; vertical-align:1px; white-space:nowrap}',
    '.feat .fbd.top{background:linear-gradient(135deg,#ff6b4a,#ff9a3c); color:#fff; box-shadow:0 1px 0 #c94a2a}',
    '.feat .fbd.two{background:#fff1cc; color:#8a5a00; border:1px solid #e8c15a}',
    '#viewDocs a.primary{padding:8px 12px!important; font-size:13px!important; min-height:0!important; margin:4px 0!important; display:block!important; text-align:center!important}',
    '#viewDocs h2 span[style]{font-size:15px!important; line-height:1.3!important}',
    '#viewDocs .tk{padding:3px 0!important}',
    '#viewDocs .tk details{margin:0!important}',
    '#viewDocs .panel{padding:11px 12px 10px!important; margin-bottom:8px!important}',
    '#viewDocs .panel h2{font-size:15px!important; margin:0 0 5px!important; line-height:1.35!important}',
    '#viewDocs .panel h2::before{width:6px!important; height:15px!important}',
    '#viewDocs h3{font-size:12.5px!important; margin:8px 0 1px!important}',
    '#viewDocs .hint,#viewDocs p.hint{font-size:11px!important; line-height:1.45!important; margin:0 0 5px!important}',
    '#viewDocs .field{font-size:11.5px!important; margin:6px 0 2px!important}',
    '#viewDocs select,#viewDocs input[type=text]{min-height:34px!important; height:34px!important; font-size:13px!important; padding:2px 10px!important; border-radius:10px!important}',
    '#viewDocs .tk{padding:4px 0!important; gap:7px!important; align-items:flex-start!important}',
    '#viewDocs .tk input[type=checkbox]{width:17px!important; height:17px!important; margin:1px 0 0!important; flex:none}',
    '#viewDocs .tk .x{min-width:0; flex:1}',
    '#viewDocs .tk .x b{font-size:12.5px!important; line-height:1.4!important; font-weight:700!important; letter-spacing:0!important}',
    '#viewDocs .tk .x small{font-size:10.5px!important; line-height:1.4!important; margin-top:1px!important}',
    '#viewDocs .tk summary{font-size:10.5px!important; min-height:0!important; padding:0!important; margin-top:1px}',
    '#viewDocs .sc{font-size:10px!important; padding:0 6px!important; line-height:1.5!important}',
    '#viewDocs .qk{padding:4px 0!important; font-size:12.5px!important; line-height:1.4!important}',
    '#viewDocs .qk input[type=checkbox]{width:17px!important; height:17px!important}',
    '#viewDocs .qk > span{gap:7px!important}',
    '#viewDocs .nx{padding:6px 10px!important; margin:6px 0!important}',
    '#viewDocs .nx .big{font-size:22px!important; line-height:1.2!important}',
    '#viewDocs .nx div{font-size:12px!important}',
    '#viewDocs button{min-height:34px!important; padding:3px 12px!important; font-size:12.5px!important}',
    '#viewDocs textarea{font-size:12.5px!important; min-height:150px!important}',
    '.advl .pn{display:inline-block!important; font-weight:900!important; font-size:17px!important; line-height:1.35!important; color:#fff!important; background:#0f8a7a!important; border:0!important; border-radius:9px!important; padding:0 8px!important; margin:0 3px!important; box-shadow:0 2px 0 #0a6b5e; -webkit-text-stroke:.4px #fff; letter-spacing:0!important}',
    '.vnote{font-size:11px; color:var(--muted,#5b6b73); margin-left:6px; line-height:1.4}',
    '.vmic{display:inline-flex; align-items:center; gap:4px; margin:4px 0 0; min-height:30px!important; padding:2px 12px!important; font-size:12px!important; font-weight:700; border-radius:999px; border:1.5px solid #bfe3d8; background:#f1faf7; color:#1d6b5c; box-shadow:none!important}',
    '.vmic.on{background:#fde0df; border-color:#e9a29e; color:#a3281f}',
    '.vmsg{display:block; font-size:11px; color:#a3281f; margin-top:3px}',
    '#hkWish .mysc{display:flex; align-items:baseline; justify-content:space-between; margin:6px 0; padding:8px 14px; border-radius:12px; background:linear-gradient(135deg,#e8f6f1,#fffaf0); border:1.5px solid #bfe3d8}',
    '#hkWish .mysc span{font-size:13px; font-weight:700; color:#2f6f60}',
    '#hkWish .mysc b{font-size:28px; line-height:1; color:#0f8a7a}#hkWish .mysc b small{font-size:13px; margin-left:2px}',
    '#hkWish #hkWs1,#hkWish #hkWs2,#hkWish #hkWcp{min-height:34px!important; padding:4px 6px!important; font-size:12px!important; white-space:nowrap!important}',
    '#hkWish .tk{padding:5px 0!important; gap:6px!important; align-items:center!important}',
    '#hkWish .tk .x{min-width:0; flex:1}',
    '#hkWish .tk .x b{font-size:14px!important; line-height:1.3!important}',
    '#hkWish .tk .x .wmap{display:inline-block; margin-top:3px; font-size:12.5px; font-weight:700; color:var(--accent,#2a9d8f); text-decoration:none}',
    '.vmemo .vtot{display:flex!important; align-items:center; gap:8px}.vmemo .vtot b{display:inline!important; margin:0!important}.vmemo .vtot span{font-size:13px; font-weight:700}',
    '.vmemo li.qno{color:var(--muted)}',
    '#hkWish .tk .x .rs{font-size:12px!important; margin-top:2px!important}',
    '#hkWish .tk .x small{display:block; font-size:10.5px!important; line-height:1.35!important; margin-top:1px!important}',
    '#hkWish .tk .sc{font-size:10.5px!important; padding:0 6px!important; line-height:1.6!important}',
    '#hkWish .tk button{min-height:28px!important; min-width:28px!important; width:28px; height:28px; padding:0!important; font-size:13px!important; border-width:1.5px!important}',
    '#hkWish .tk > span:last-child{gap:3px!important}',
    '#hkWish .hint{font-size:11px!important; line-height:1.45!important}',
    '#hkWish .ezb{font-size:11px!important; padding:0 7px!important; margin:0 3px 0 0!important; white-space:nowrap}',
    '#hkWish .ezbox{padding:6px 9px!important; font-size:12px!important}',
    '.wtop{display:block; width:100%; margin:6px 0; padding:8px 10px; font-size:13px; font-weight:700; border-radius:10px; border:1px solid #e6d7a8; background:#fffaf0; color:#7a4a00; text-align:center}',
    '.advl{margin:0; padding-left:1.2em; display:grid; gap:4px; font-size:13px; line-height:1.6}',
    '.ezb{display:inline-block; font-size:11px; font-weight:700; padding:1px 7px; border-radius:99px; margin-left:4px; vertical-align:1px}',
    '.ez-easy{background:#dff3e4; color:#1d6b35}.ez-mid{background:#fff1cc; color:#8a5a00}.ez-hard{background:#fde0df; color:#a3281f}',
    '.ezbox{display:flex; flex-direction:column; gap:2px; margin-top:10px; padding:8px 10px; border:1px solid #e6d7a8; border-radius:10px; background:#fffaf0; font-size:13px}',
  '#viewAzuke button[data-azm]{font-size:12px!important; padding:0 4px!important; letter-spacing:-0.02em}',
  '.hkb .bmsg{display:block; width:100%; margin:5px 0 0!important; padding:5px 8px!important; min-height:0!important; height:auto!important; font-size:clamp(9.5px,2.8vw,11px)!important; font-weight:800!important; line-height:1.35!important; letter-spacing:-0.02em; color:#fff!important; background:#d93a2f!important; border:0!important; border-radius:999px!important; box-shadow:none!important; text-align:center}',
  '.feat .fh2{display:flex!important; align-items:center; justify-content:center; gap:5px; margin:0 0 8px!important; font-size:clamp(12px,3.6vw,14px)!important; font-weight:800!important; letter-spacing:0; white-space:nowrap; overflow:hidden; color:#0f6b5c!important}',
  '.feat .fh2::before,.feat .fh2::after{content:"";flex:1; max-width:40px; min-width:6px; height:3px; border-radius:3px; background:linear-gradient(90deg,#ffd36b,#f29a3d)}',
  '.feat .fh2::before{background:linear-gradient(270deg,#ffd36b,#f29a3d)}',
  '.feat .fh2 .ac{font-size:14px; line-height:1; flex:none}.feat .fh2 > span:not(.ac){white-space:nowrap; flex:none}',
  '.srcl{display:block; margin:6px auto 6px!important; padding:5px 4px!important; width:calc(100% - 20px); max-width:none; text-indent:0; overflow:hidden; box-sizing:border-box; font-size:clamp(9.5px,2.8vw,11px)!important; letter-spacing:-0.04em; white-space:nowrap; font-weight:800!important; line-height:1.4; color:#0b5e50!important; background:#e3f6ee; border:1.5px solid #3fa88e; border-radius:999px; text-align:center}',
  '.srcl.rs{margin:10px 0 0!important; width:100%; max-width:100%; border-radius:12px; white-space:normal}',
  '#distPanel .teaser{margin:4px 0 0; overflow:hidden}',
  '#distPanel .teaser .tm{font-size:12px; font-weight:700; line-height:1.5; margin:0 0 6px}',
  '#distPanel .teaser .blur{filter:blur(5px); pointer-events:none; user-select:none; opacity:.85; max-height:110px; overflow:hidden; position:relative; margin-bottom:0}',
  '#distPanel .teaser .blur ul{margin:0!important}',
  '#distPanel .teaser .lk{margin:-52px 0 14px; position:relative; text-align:center; font-size:12px; font-weight:700; color:#7a2a1f}',
  '#viewIndex #s3 .shbtn{width:100%!important; min-height:36px!important; height:36px!important; font-size:12.5px!important; margin:0 0 8px!important}',
  '#secFind .bk{width:100%!important; margin-top:8px!important; min-height:30px!important; font-size:12px!important; font-weight:700!important; color:#0f6b5c!important; background:#e6f5ef!important; border:1.5px solid #9fd3c3!important; border-radius:999px!important; box-shadow:none!important}',
  '#secFind .bkp{margin-top:6px; padding:8px 10px; background:var(--surface); border:1.5px dashed #9fd3c3; border-radius:12px}',
  '#secFind .bkp .hint{margin:0 0 6px!important}',
  '#secFind .bkp .bkr{display:grid; grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); gap:6px; margin:4px 0}',
  '#secFind .bkp input{min-height:32px!important; height:32px!important; font-size:12.5px!important; padding:0 8px!important; width:100%!important; box-sizing:border-box!important}',
  '#secFind .bkp .bkb{display:grid; gap:5px; margin-top:6px}',
  '#secFind .bkp .bkb a,#secFind .bkp .bkb button{display:flex; align-items:center; justify-content:center; min-height:34px!important; font-size:12px!important; font-weight:700; border-radius:999px; text-decoration:none; padding:0 10px!important; margin:0!important}',
  '#secFind .bkp .bkmsg{font-size:10.5px; color:#0f6b5c; font-weight:700; margin-top:4px; min-height:0}',
  '#viewIndex #s3 .panel{padding:10px 12px!important; margin-bottom:8px!important}',
  '#viewIndex #s3 .panel h2{font-size:14px!important; margin:0 0 4px!important; gap:7px!important}',
  '#viewIndex #s3 .panel h2 .hi,#viewIndex #s3 .panel h2 svg{width:24px!important; height:24px!important}',
  '#viewIndex #s3 .panel .score{padding:6px 12px!important; margin:4px 0!important; border-radius:14px!important}',
  '#viewIndex #s3 .panel .score .num{font-size:34px!important; line-height:1.1!important}#viewIndex #s3 .panel .score .unit{font-size:14px!important}',
  '#viewIndex #s3 .panel .rows li{padding:4px 0!important; font-size:12px!important; line-height:1.35!important}',
  '#viewIndex #s3 .panel .rows li b,#viewIndex #s3 .panel .rows li .pt{font-size:13px!important}',
  '#viewIndex #s3 .panel .rows small{font-size:9.5px!important}',
  '#viewIndex #s3 .panel summary{font-size:11.5px!important; padding:4px 0!important; min-height:0!important}',
  '#viewIndex #s3 .panel ol,#viewIndex #s3 .panel ol li{font-size:11px!important; line-height:1.45!important}',
  '#viewIndex #s3 .panel .hint{font-size:9.5px!important; line-height:1.45!important; margin:2px 0 4px!important}',
  '#viewIndex #s3 .panel label,#viewIndex #s3 .panel .field{font-size:11px!important; margin:4px 0 2px!important}',
  '#viewIndex #s3 .panel select{font-size:12px!important; min-height:32px!important; height:32px!important; padding:0 22px 0 9px!important; border-radius:11px!important}',
  '#viewIndex #s3 .panel p,#viewIndex #s3 .panel .dsum,#viewIndex #s3 .panel #dSummary{font-size:11.5px!important; line-height:1.5!important}',
  '#viewIndex #s3 .panel .dbx,#viewIndex #s3 .panel .dbar{font-size:11px!important}',
  '#viewIndex #s3 button.primary{min-height:38px!important; height:38px!important; font-size:13px!important}',
  '#viewIndex section.panel{padding:10px 12px!important; margin-bottom:8px!important}',
  '#viewIndex section.panel h2{font-size:14px!important; margin:0 0 3px!important; gap:7px!important}',
  '#viewIndex section.panel h2 .hi,#viewIndex section.panel h2 svg{width:24px!important; height:24px!important}',
  '#viewIndex section.panel .notice{font-size:10.5px!important; line-height:1.4!important; padding:5px 9px!important; margin:3px 0 5px!important; border-radius:10px!important}',
  '#viewIndex section.panel label,#viewIndex section.panel .field{font-size:11px!important; margin:5px 0 2px!important; line-height:1.3!important}',
  '#viewIndex section.panel select,#viewIndex section.panel input[type=text],#viewIndex section.panel input[type=number]{font-size:12px!important; min-height:32px!important; height:32px!important; padding:0 24px 0 9px!important; border-radius:11px!important; width:100%!important; max-width:100%!important; box-sizing:border-box!important; text-overflow:ellipsis}',
  '#viewIndex section.panel .hint{font-size:9.5px!important; line-height:1.45!important; margin:3px 0 0!important}',
  '#viewIndex section.panel h3,#viewIndex section.panel .grp{font-size:11.5px!important; margin:6px 0 2px!important}',
  '#viewIndex section.panel hr,#viewIndex section.panel .sep{margin:6px 0!important}',
  '#viewIndex section.panel button.primary{min-height:38px!important; height:38px!important; font-size:13px!important; margin-top:8px!important}',
  '#viewIndex section.panel button:not(.primary){min-height:34px!important; font-size:12px!important; padding:0 12px!important}',
  '#viewIndex section.panel .nav{gap:6px!important; margin-top:8px!important}',
  '#viewIndex section.panel .row,#viewIndex section.panel .grid2{gap:6px!important}',
  '#viewIndex section.panel table{font-size:11.5px!important}#viewIndex section.panel td,#viewIndex section.panel th{padding:4px 3px!important}',
  '#viewIndex section.panel .total,#viewIndex section.panel .big{font-size:26px!important}',
  '.tabs button#tabSched small,.tabs button#tabDocs small,.tabs button#tabPlus small,.tabs button#tabCmp3 small,.tabs button#tabDist small,.tabs button#tabAdv small,.tabs button#tabEase small,.tabs button#tabAlert small,.tabs button#tabWish small{padding-left:18px!important; text-align:center!important; box-sizing:border-box}',
  '.tabs button#tabSched,.tabs button#tabDocs,.tabs button#tabPlus,.tabs button#tabCmp3,.tabs button#tabDist,.tabs button#tabAdv,.tabs button#tabEase,.tabs button#tabAlert,.tabs button#tabWish{font-size:clamp(9.5px,2.9vw,11.5px)!important; letter-spacing:-0.04em!important; gap:4px!important; padding-left:4px!important; padding-right:4px!important; justify-content:flex-start!important}',
  '.tabs button#tabSched .ti,.tabs button#tabDocs .ti,.tabs button#tabPlus .ti,.tabs button#tabCmp3 .ti,.tabs button#tabDist .ti,.tabs button#tabAdv .ti,.tabs button#tabEase .ti,.tabs button#tabAlert .ti,.tabs button#tabWish .ti{width:22px!important; font-size:19px!important; flex:none!important}',
  '.tabs button#tabSched small,.tabs button#tabDocs small,.tabs button#tabPlus small,.tabs button#tabCmp3 small,.tabs button#tabDist small,.tabs button#tabAdv small,.tabs button#tabEase small,.tabs button#tabAlert small,.tabs button#tabWish small{font-size:clamp(8.5px,2.5vw,10px)!important; letter-spacing:-0.05em!important; padding-left:0!important}',
  '.tabs button#tabSched > span:not(.ti),.tabs button#tabDocs > span:not(.ti),.tabs button#tabPlus > span:not(.ti),.tabs button#tabCmp3 > span:not(.ti),.tabs button#tabDist > span:not(.ti),.tabs button#tabAdv > span:not(.ti),.tabs button#tabEase > span:not(.ti),.tabs button#tabAlert > span:not(.ti),.tabs button#tabWish > span:not(.ti){flex:1 1 0!important; min-width:0!important; text-align:center!important}',
  '.tabs button#tabPaid{justify-content:center!important}',
  '#tabSched,#tabDocs,#tabPlus,#tabCmp3,#tabDist,#tabPaid,#tabAdv,#tabEase,#tabAlert,#tabWish{justify-content:center!important; gap:7px!important; padding-left:6px!important; padding-right:6px!important}',
  '#tabSched .ti,#tabDocs .ti,#tabPlus .ti,#tabCmp3 .ti,#tabDist .ti,#tabAdv .ti,#tabEase .ti,#tabAlert .ti,#tabWish .ti{width:26px; text-align:center; flex:none!important}',
  '#tabSched > span:not(.ti),#tabDocs > span:not(.ti),#tabPlus > span:not(.ti),#tabCmp3 > span:not(.ti),#tabDist > span:not(.ti),#tabAdv > span:not(.ti),#tabEase > span:not(.ti),#tabAlert > span:not(.ti),#tabWish > span:not(.ti){text-align:center!important; flex:0 1 auto!important}',
  '#tabSched > span:not(.ti) > span,#tabDocs > span:not(.ti) > span,#tabPlus > span:not(.ti) > span,#tabCmp3 > span:not(.ti) > span,#tabDist > span:not(.ti) > span,#tabAdv > span:not(.ti) > span,#tabEase > span:not(.ti) > span,#tabAlert > span:not(.ti) > span,#tabWish > span:not(.ti) > span{justify-content:center!important}',
  '#tabSched small,#tabDocs small,#tabPlus small,#tabCmp3 small,#tabDist small,#tabAdv small,#tabEase small,#tabAlert small,#tabWish small{padding-left:0!important; text-align:center!important; letter-spacing:-0.04em!important; white-space:nowrap!important}',
  '#tabDist small{font-size:9px!important}',
  '#tabDist small{padding-left:0!important; font-size:9.5px!important; letter-spacing:-0.05em!important; white-space:nowrap!important}',
  '#tabDist{padding-left:4px!important; padding-right:3px!important; gap:4px!important}',
  '#tabDist .ti{font-size:20px!important}',
  '#tabPaid,#tabPaid span{white-space:nowrap!important}',
  '#tabPaid{font-size:12px!important; letter-spacing:-0.03em!important; padding-left:4px!important; padding-right:4px!important; gap:4px!important; justify-content:center!important}',
  '#tabIndex,#tabAzuke,#tabFind,#tabCmp,#tabVisit,#tabAbout,#tabSet{min-height:34px!important; font-size:10.5px!important; padding:2px 2px!important; border-radius:11px!important}',
  '#tabIndex .ti,#tabAzuke .ti,#tabFind .ti,#tabCmp .ti,#tabVisit .ti,#tabAbout .ti,#tabSet .ti{font-size:14px!important}',
  '#tabIndex,#tabAzuke{min-height:32px!important}',
  '#tabCmp small{font-size:9px!important}',
  '#tabSched,#tabDocs,#tabPlus,#tabCmp3,#tabDist,#tabPaid,#tabAdv,#tabEase,#tabAlert,#tabWish{min-height:54px!important; font-size:12.5px!important; font-weight:800!important; border-width:2.5px!important; border-color:#e8c15a!important; background:linear-gradient(180deg,#fffaf0,#fff0c8)!important; box-shadow:0 3px 0 #e3c06a!important}',
  '#tabSched .ti,#tabDocs .ti,#tabPlus .ti,#tabCmp3 .ti,#tabDist .ti,#tabPaid .ti,#tabAdv .ti,#tabEase .ti,#tabAlert .ti,#tabWish .ti{font-size:22px!important}',
  '#tabSched small,#tabDocs small,#tabPlus small,#tabCmp3 small,#tabDist small,#tabAdv small,#tabEase small,#tabAlert small,#tabWish small{font-size:10.5px!important; font-weight:600!important}',
  '#tabSched svg.cr,#tabDocs svg.cr,#tabPlus svg.cr,#tabCmp3 svg.cr,#tabDist svg.cr,#tabPaid svg.cr,#tabAdv svg.cr,#tabEase svg.cr,#tabAlert svg.cr,#tabWish svg.cr{width:15px!important; height:15px!important}',
  '#tabSched[aria-selected="true"],#tabDocs[aria-selected="true"],#tabPaid[aria-selected="true"]{background:var(--accent)!important; border-color:var(--accent)!important; box-shadow:0 3px 0 rgba(0,0,0,.15)!important}',
  '.tabs .tgl.pd{font-size:11.5px!important}',
  'html,body{overflow-x:hidden!important; max-width:100vw}',
  '.tabs{grid-template-columns:repeat(12,minmax(0,1fr))!important; gap:5px!important; margin:0 0 10px!important}',
  '.tabs button{min-width:0!important; min-height:42px!important; padding:3px 2px!important; border-radius:13px!important; font-size:11px!important; gap:0!important; box-shadow:0 1px 0 rgba(0,0,0,.06)!important}',
  '.tabs button .ti{font-size:16px!important}',
  '.tabs button.hero{min-height:40px!important; padding:3px 5px!important; gap:5px!important}',
  '.tabs button.hero .ti{font-size:17px!important}',
  '.tabs button small{font-size:9.5px!important}',
  '.tabs .tgl{font-size:10px!important; margin:0 2px!important}.tabs .tgl.pd{margin-top:3px!important}',
  '#tabAzuke,#tabIndex{font-size:11px!important}',
  '.hkb.on{padding:5px 10px!important; margin:0 0 8px!important; border-radius:14px!important; text-align:center!important}',
  '.hkb .bm{display:flex!important; align-items:baseline; justify-content:center; gap:6px; margin:0!important}',
  '.hkb .bl{font-size:10.5px!important}',
  '.hkb .bd{font-size:19px!important; line-height:1.2!important}',
  '.hkb .bdt{font-size:12px!important}',
  '.hkb .bt{font-size:10.5px!important; line-height:1.3!important; text-align:center!important}',
  '.hkb.on{display:block!important; padding:8px 12px!important; margin:0 0 10px!important; border-radius:16px!important; border:2px solid #e5483d; background:#fff1ee!important; color:#7a2a1f!important; cursor:pointer}',
  '.hkb .bl{font-size:10.5px; font-weight:700; color:#b4532a; line-height:1.3}',
  '.hkb .bm{display:flex; align-items:baseline; gap:8px; margin:1px 0}',
  '.hkb .bd{font-size:24px; font-weight:800; color:#d93a2f; line-height:1.15}',
  '.hkb .bdt{font-size:13px; font-weight:700; color:#7a2a1f}',
  '.hkb .bt{font-size:11px; font-weight:500; line-height:1.4; color:#7a2a1f}',
  '#viewSet .panel{padding:12px 14px!important}',
  '#viewSet h2{font-size:16px!important; margin:0 0 4px!important}',
  '#viewSet h2::before{width:6px!important; height:16px!important}',
  '#viewSet .srow{min-height:40px!important; font-size:13.5px!important; padding:0 4px!important; line-height:1.3!important}',
  '#viewSet .srow small{font-size:10px!important; line-height:1.4!important}',
  '#viewSet .faq{padding:5px 4px!important}',
  '#viewSet .faq summary{font-size:12.5px!important}',
  '#viewSet .faq p{font-size:11.5px!important; line-height:1.55!important; margin:4px 0 0!important}',
  '#viewSet .hint{font-size:10px!important; line-height:1.45!important; margin:4px 0 0!important}',
  '#viewSet input,#viewSet button:not(.srow){font-size:12.5px!important; min-height:34px!important}',
  '.panel:has(#vList){max-width:100%!important; box-sizing:border-box!important; overflow:hidden}',
  '.panel:has(#vList) h2{font-size:16px!important; margin:0 0 6px!important}',
  '.panel:has(#vList) h2 svg,.panel:has(#vList) h2 .hi,.panel:has(#vList) h2 img{width:26px!important; height:26px!important}',
  '.panel:has(#vList) h2 #vCount{display:none!important}',
  '.panel:has(#vList) #vSort{width:100%!important; max-width:100%!important; box-sizing:border-box!important}',
  '#secMemo{max-width:100%!important; box-sizing:border-box!important; overflow:hidden}',
  '#secMemo .hint{font-size:10px!important; line-height:1.45!important; margin:2px 0 4px!important}',
  '#secMemo .notice{font-size:10.5px!important; line-height:1.4!important; padding:5px 9px!important; border-radius:10px!important}',
  '#secMemo label.field{font-size:11px!important; margin:4px 0 2px!important}',
  '#secMemo select{width:100%!important; max-width:100%!important; min-width:0!important; box-sizing:border-box!important; text-overflow:ellipsis; font-size:12px!important; min-height:32px!important; height:32px!important; padding:0 24px 0 9px!important; border-radius:11px!important}',
  '#secMemo #vAdd{min-height:38px!important; height:38px!important; font-size:13.5px!important; margin-top:6px!important}',
  '#secMemo #vAdd + .hint{font-size:9.5px!important; margin:4px 2px 0!important}',
  '#hkPlus{padding:10px 12px!important}',
  '#hkPlus h2{font-size:14px!important; margin:0 0 3px!important}',
  '#hkPlus h2 .hi,#hkPlus h2 svg{width:26px!important; height:26px!important}',
  '#hkPlus .badge{font-size:10px!important; padding:0 8px!important}',
  '#hkPlus .hint{font-size:10px!important; line-height:1.45!important; margin:2px 0 4px!important}',
  '#hkPlus label.field{font-size:11px!important; margin:4px 0 2px!important}',
  '#hkPlus select{font-size:12px!important; min-height:32px!important; height:32px!important; padding:0 8px!important}',
  '#hkPlus details.plus{padding:0!important; margin:0!important}',
  '#hkPlus details.plus > summary{font-size:12px!important; padding:4px 2px!important; min-height:0!important; height:auto!important; line-height:1.3!important}',
  '#hkPlus details.plus > summary svg{width:11px!important; height:11px!important}',
  '#secMemo{padding:12px 14px!important}',
  '#secMemo h2{font-size:15px!important; margin:0 0 4px!important; gap:8px!important}',
  '#secMemo h2 .hi,#secMemo h2 svg,#secMemo h2 img{width:26px!important; height:26px!important; border-radius:9px!important}',
  '#secMemo .hint{font-size:10.5px!important; line-height:1.5!important; margin:3px 0 6px!important}',
  '#secMemo .notice{font-size:11.5px!important; line-height:1.45!important; padding:6px 10px!important; border-radius:12px!important; margin:0 0 6px!important}',
  '#secMemo label.field{font-size:12px!important; margin:6px 0 3px!important}',
  '#secMemo #vAdd{margin-top:8px!important}',
  '#secMemo #vAdd + .hint{font-size:10px!important; margin:5px 4px 0!important}',
  '#secFind h2{font-size:14.5px!important}',
  '#secFind select,#secFind input[type=search],#secFind input[type=text]{font-size:12px!important; min-height:32px!important; height:32px!important; padding:0 8px!important; border-radius:11px!important}',
  '#secFind .aznear input,#secFind #hkFnear input{min-height:34px!important; height:34px!important}',
  '#secFind button{min-height:32px!important; font-size:12px!important; padding:0 10px!important}',
  '#secFind label{font-size:11px!important}',
  '#secFind input[type=checkbox]{width:15px!important; height:15px!important; margin:0!important}',
  '#secFind label:has(input[type=checkbox]){gap:6px!important; line-height:1.3!important; font-size:11.5px!important}',
  '#secFind .hint{font-size:10px!important; line-height:1.45!important}',
  '#secFind .fcard{padding:8px 10px!important; margin-top:7px!important; border-radius:14px!important}',
  '#secFind .fcard h3,#secFind .fcard .fn,#secFind .fcard .nm{font-size:14px!important; line-height:1.3!important}',
  '#secFind .fcard .area{font-size:10px!important; padding:0 7px!important}',
  '#secFind .fcard .n,#secFind .fcard p,#secFind .fcard small,#secFind .fcard td,#secFind .fcard th{font-size:11.5px!important; line-height:1.45!important}',
  '#secFind .fcard button,#secFind .fcard .btnlike{min-height:26px!important; height:auto!important; font-size:11px!important; padding:2px 10px!important}',
  '#viewAzuke .panel{padding:12px 12px 10px!important}',
  '#viewAzuke h2{font-size:15px!important; margin:0 0 4px!important}',
  '#viewAzuke .hint,#viewAzuke .notice{font-size:10.5px!important; line-height:1.5!important; margin:3px 0 0!important}',
  '#viewAzuke details.faq{padding:0!important; margin:0!important; border-top:1px dotted var(--line)!important}',
  '#viewAzuke details.faq > summary{font-size:12.5px!important; padding:7px 2px!important; min-height:0!important; height:auto!important}',
  '#viewAzuke details.faq > p,#viewAzuke details.faq p{font-size:11px!important; line-height:1.55!important; margin:0 0 6px!important}',
  '#viewAzuke select,#viewAzuke input[type=search],#viewAzuke input[type=text]{font-size:12.5px!important; min-height:34px!important; height:34px!important; padding:0 10px!important; border-radius:12px!important}',
  '#viewAzuke label{font-size:11.5px!important; line-height:1.3!important}',
  '#viewAzuke input[type=checkbox]{width:16px!important; height:16px!important}',
  '#viewAzuke button{min-height:32px!important; font-size:12px!important; padding:0 10px!important}',
  '#viewAzuke .azc{padding:8px 10px 8px 12px!important; border-width:1.5px!important; border-left-width:5px!important; border-radius:14px!important; margin-top:7px!important}',
  '#viewAzuke .azc .azn{font-size:15px!important; line-height:1.3!important}',
  '#viewAzuke .azc .area{font-size:10.5px!important; padding:0 8px!important}',
  '#viewAzuke .azc .azl{font-size:11.5px!important; line-height:1.5!important}',
  '#viewAzuke .azc a.btnlike{font-size:11.5px!important; padding:3px 12px!important; min-height:0!important}',
  '#vForm{padding:12px 14px!important}',
  '#vForm h2{font-size:15px!important; margin:0 0 6px!important}',
  '#vForm h3.grp{font-size:13px!important; margin:10px 0 3px!important; padding:2px 10px!important}',
  '#vForm label.field{font-size:11.5px!important; margin:8px 0 3px!important}',
  '#vForm input[type=text],#vForm input[type=date],#vForm select{font-size:13px!important; min-height:34px!important; height:34px!important; padding:0 10px!important; border-radius:12px!important}',
  '#vForm textarea{display:block!important; margin:0!important; resize:none; height:48px!important}#vForm textarea#v-memo{height:48px!important}',
  '#vForm textarea{font-size:13px!important; min-height:0!important; padding:6px 10px!important; border-radius:12px!important; line-height:1.4!important}',
  '#vForm .hint{font-size:10.5px!important; line-height:1.45!important; margin:3px 0 0!important}',
  '#vForm .nav{margin-top:10px!important; gap:8px!important}#vForm .nav button{min-height:36px!important; height:36px!important; font-size:13px!important; padding:0 14px!important}',
  '#vForm #vItems *{font-size:12.5px!important}',
  '.tabs .tgl{grid-column:span 12!important; font-size:11px; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:6px; margin:2px 2px 0; line-height:1.2}.tabs .tgl::after{content:""; flex:1; height:1px; background:var(--line)}.tabs .tgl.pd{color:#a8730a; margin-top:6px}.tabs .tgl.pd::after{background:#f0d9a0}',
  '#tabIndex{order:2}#tabAzuke{order:3}#tabFind{order:4}#tabCmp{order:5}#tabVisit{order:6}#tabAbout{order:7}#tabSet{order:8}#tabAlert{order:10}#tabCmp3{order:11}#tabEase{order:12}#tabWish{order:13}#tabDist{order:14}#tabSched{order:15}#tabPlus{order:16}#tabDocs{order:17}#tabAdv{order:18}#tabPaid{order:19}.tabs .tgl.fr{order:1}.tabs .tgl.pd{order:9}',
  '#tabIndex,#tabAzuke,#tabAbout,#tabSet,#tabSched,#tabDocs{grid-column:span 6!important}#tabFind,#tabCmp,#tabVisit{grid-column:span 4!important}#tabPlus,#tabCmp3,#tabWish,#tabDist,#tabAdv,#tabEase,#tabAlert,#tabPaid{grid-column:span 6!important}',
  '#tabSched:not([aria-selected="true"]),#tabDocs:not([aria-selected="true"]),#tabPlus,#tabCmp3,#tabDist,#tabPaid:not([aria-selected="true"]),#tabAdv,#tabEase,#tabAlert,#tabWish{background:#fffaf0!important; border-color:#f0d9a0!important}',
  '.tabs button.hero svg.cr,.tabs button.hero .ti svg,.tabs button svg.cr,.tabs button.hero span svg{width:12px!important; height:12px!important; flex:none}',
  '#viewSched .panel:has(.tk){padding:12px 12px 10px!important}',
  '#viewSched .panel:has(.tk) h2{font-size:15px!important; margin:0 0 4px!important}',
  '#viewSched .panel:has(.tk) h2::before{width:6px!important; height:16px!important}',
  '#viewSched .panel:has(.tk) > .hint{font-size:11px!important; line-height:1.45!important; margin:0 0 4px!important}',
  '#viewSched .tk{padding:4px 0!important; gap:7px!important; align-items:center!important}',
  '#viewSched .tk input[type=checkbox]{width:16px!important; height:16px!important; margin:0!important; flex:none}',
  '#viewSched .tk .x{min-width:0; flex:1}',
  '#viewSched .tk .x b{font-size:12.5px!important; line-height:1.3!important; font-weight:700!important; letter-spacing:0!important}',
  '#viewSched .tk .x small{font-size:10px!important; margin-top:0!important; line-height:1.4!important}',
  '#viewSched .tk .x .sc,#viewSched .tk .sc{font-size:10px!important; padding:0 6px!important; line-height:1.5!important}',
  '#viewSched .tk > button.mini{min-height:24px!important; height:24px!important; padding:0 10px!important; font-size:11px!important; border-width:1.5px!important; flex:none}',
  '.panel:has(#vList){padding:12px 12px 10px!important}',
  '.panel:has(#vList) h2{font-size:16px!important; margin:0 0 6px!important; gap:6px!important}',
  '.panel:has(#vList) h2 svg,.panel:has(#vList) h2 .hi,.panel:has(#vList) h2 img{width:26px!important; height:26px!important; flex:none}',
  '.panel:has(#vList) h2 #vCount{font-size:11.5px!important}',
  '.panel:has(#vList) label.field{font-size:11.5px!important; margin:0 0 3px!important}',
  '.panel:has(#vList) #vSort{font-size:12.5px!important; min-height:34px!important; height:34px!important; padding:0 28px 0 10px!important; border-radius:12px!important}',
  '.vtbl{font-size:12px!important}',
  '.vtbl thead th{font-size:10.5px!important; padding-bottom:2px!important}',
  '.vtbl th,.vtbl td{padding:5px 2px!important; line-height:1.3!important}',
  '.vtbl tbody th{width:auto!important; min-width:0!important}',
  '.vtbl .fn{font-size:13px!important; font-weight:700!important}',
  '.vtbl .ex{font-size:10px!important; padding:0 6px!important}',
  '.vtbl small{font-size:10px!important}',
  '.vtbl b{font-size:12.5px!important}',
  '.vtbl .vmemo{margin:3px 0 0!important}',
  '.vtbl .vmemo summary{font-size:11px!important; padding:2px 8px!important}',
  '.vtbl .vmemo p{font-size:11.5px!important; padding:4px 7px!important; margin-top:4px!important}',
  '.vtbl .vb{gap:4px!important; margin-top:3px!important}',
  '.vtbl .vb button{min-height:22px!important; height:22px!important; padding:0 9px!important; font-size:11px!important; border-width:1px!important; border-radius:999px!important; box-shadow:none!important; font-weight:600!important}',
  '.vtbl input.big{width:20px!important; height:20px!important}',
'.tabs button.hero{font-size:clamp(10px,2.9vw,11.5px)!important; letter-spacing:-0.02em!important; padding:4px 5px!important; gap:5px!important; overflow:hidden}.tabs button.hero > span:not(.ti){min-width:0; flex:0 1 auto; overflow-wrap:anywhere; word-break:keep-all; white-space:normal!important; line-height:1.25}.tabs button.hero .ti{font-size:20px!important}#tabDocs,#tabSched,#tabPaid{padding-left:8px!important; padding-right:4px!important; gap:5px!important}#tabDocs small{font-size:10px!important}.tabs button.hero svg.cr,.tabs button.hero .ti svg{width:10px!important; height:10px!important}',
'#viewIndex .panel{padding:12px 14px!important; margin-bottom:10px!important}#viewIndex h2{font-size:17px!important; margin:0 0 4px!important; gap:8px!important}#viewIndex h2.hasicon .hi{width:30px!important; height:30px!important; border-radius:9px!important; flex:none}#viewIndex h2.hasicon .hi svg{width:20px!important; height:20px!important}#viewIndex h3{font-size:14px!important; margin:8px 0 2px!important}#viewIndex label.field{font-size:12.5px!important; margin:8px 0 2px!important}#viewIndex select,#viewIndex input[type=text],#viewIndex input[type=number]{min-height:40px!important; font-size:14.5px!important}#viewIndex .notice{font-size:12px!important; padding:7px 10px!important; border-radius:12px!important; line-height:1.5!important; margin:4px 0!important}#viewIndex .steps{gap:6px!important; margin:8px 0!important}#viewIndex .steps li{font-size:12.5px!important; min-height:34px!important; padding:4px 6px!important}#viewIndex .item{padding:6px 0!important; min-height:0!important}#viewIndex .item .il{font-size:13px!important; line-height:1.35!important}#viewIndex .seg span{min-height:38px!important; min-width:44px!important; font-size:14px!important}#viewIndex .check{min-height:34px!important; padding:3px 0!important; font-size:13px!important; gap:8px!important}#viewIndex .check .txt{font-size:13px!important; line-height:1.35!important}#viewIndex .check input{width:20px!important; height:20px!important}#viewIndex button.primary,#viewIndex .nav button{min-height:42px!important; font-size:14.5px!important}#viewIndex details summary{font-size:13px!important; min-height:34px!important}#viewIndex .sub,#viewIndex small{font-size:11px!important}',
'.tabs button.hero svg.cr,.tabs button.hero .ti svg{width:12px!important; height:12px!important; flex:none}.tabs button.hero .ti:has(svg){font-size:0; display:inline-flex}#tabDocs,#tabSched,#tabPaid{justify-content:flex-start!important; padding-left:12px!important; padding-right:6px!important; gap:8px!important}#tabDocs > span:last-child{text-align:left!important; white-space:nowrap}#tabDocs small{text-align:left!important; padding-left:1.35em}',
'#viewSched a.btnlike,#viewSched .ev a.cal{font-size:12.5px!important; padding:5px 12px!important; width:100%!important; max-width:100%; box-sizing:border-box; text-align:center; border-width:1.5px!important}',
'#viewSched .panel h2{font-size:17px; margin-bottom:2px}#viewSched .ev{padding:5px 0!important; gap:0!important}#viewSched .ev b{font-size:13px!important; line-height:1.3!important}#viewSched .ev .d{font-size:12px!important; display:flex; align-items:center; gap:6px; flex-wrap:wrap}#viewSched .ev .d *{font-size:10.5px!important; padding-top:1px!important; padding-bottom:1px!important}#viewSched .ev .d{line-height:1.3}#viewSched .ev .n{font-size:11px!important; line-height:1.4!important}#viewSched .ev.has b::after{font-size:10px}',
'#secFind h2{font-size:17px; margin-bottom:2px}#secFind .ctl{display:grid!important; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px 8px; margin:2px 0}#secFind .ctl>div{min-width:0}#secFind select{width:100%; max-width:100%; min-width:0; text-overflow:ellipsis}#secFind .ctl:has(#fMode){grid-template-columns:1fr}#secFind #fMode{width:100%}#secFind label.field{font-size:12px; margin:6px 0 2px}#secFind select,#secFind input[type=text],#secFind input[type=search]{min-height:38px!important; font-size:14px!important; padding-top:2px; padding-bottom:2px}#secFind .check{min-height:34px!important; padding:2px 0!important; gap:8px!important; font-size:13px!important}#secFind .check input{width:20px!important; height:20px!important}#secFind .check .txt{font-size:13px!important; line-height:1.35}#secFind #fCount{font-size:12px; margin:4px 0 0}#hkFnear{margin:6px 0!important; padding:0!important; max-width:100%; box-sizing:border-box}#hkFnear .aznear{margin-top:6px!important}#hkFnear input{min-height:42px!important; font-size:14px!important; box-sizing:border-box}#hkFnear [data-aznear=go]{flex:none; min-width:84px; min-height:42px!important; font-size:14px!important; padding:0 14px!important}#hkFnear [data-aznear=gps]{min-height:42px!important; font-size:14px!important}#hkFnear [data-aznear=off]{min-height:42px!important}#hkFnear .hint{margin:2px 0 0!important}',
'#hkPlus details.plus{padding:0; margin:0!important; border-top:1px dotted var(--line)}#hkPlus details.plus > summary{font-size:14px!important; min-height:0!important; height:auto!important; padding:6px 2px!important; margin:0!important; line-height:1.3; display:flex; align-items:center; gap:6px; list-style:none}#hkPlus details.plus > summary::-webkit-details-marker{display:none}#hkPlus details.plus > summary::after{content:"▼"; margin-left:auto; font-size:10px; color:var(--muted)}#hkPlus details.plus[open] > summary::after{content:"▲"}#hkPlus details.plus[open]{padding-bottom:8px}#hkPlus h2{font-size:17px; margin-bottom:4px}#hkPlus label.field{margin-top:6px; font-size:13px}#hkPlus .hint{margin:0 0 4px}#hkPlus select{min-height:42px; font-size:15px}',
'.hint{font-size:11px!important; line-height:1.6!important}.notice{font-size:12px!important; line-height:1.65!important}.ev .n{font-size:12px!important; line-height:1.55!important}.azc .azl{font-size:13px!important}',
'.azc{background:var(--surface); border:2px solid var(--line); border-left:7px solid var(--accent); border-radius:16px; padding:12px 12px 12px 14px; margin-top:10px; box-shadow:var(--shadow)}',
'.azc .azn{font-family:var(--font-display); font-size:20px; font-weight:700; line-height:1.35; color:var(--accent); overflow-wrap:anywhere}',
'.azc .azl{font-size:14px; line-height:1.75; color:var(--fg)}',
'.tabs{gap:6px; margin-bottom:12px}',
'.tabs button{min-height:54px; padding:4px 2px; gap:1px; border-radius:16px; font-size:12px; box-shadow:0 2px 0 rgba(0,0,0,.06)}',
'.tabs button .ti{font-size:20px}',
'.tabs button.hero{grid-column:span 6; flex-direction:row; gap:6px; font-size:12.5px; font-weight:700; line-height:1.2; min-height:50px; padding:4px 4px}',
'.tabs button.hero .ti{font-size:22px; line-height:1; flex:none}',
'.tabs button[aria-selected="true"]{box-shadow:0 2px 0 rgba(0,0,0,.12)}',
'header{padding:8px 10px 10px; margin-bottom:10px}',
'header svg.hero{height:100px; margin-bottom:8px}',
'header .tag{font-size:11px; padding:1px 8px}',
'header h1{font-size:28px; line-height:1.25; text-align:center; color:var(--accent); letter-spacing:.06em; margin:10px 0 0}',
'header h1 .sub{font-size:13px; font-weight:700; letter-spacing:0; color:var(--muted); margin-top:6px}',
'header .tag{display:block; width:max-content; max-width:100%; margin:0 auto}',
'header p.lead{text-align:center}',
'#hkUpd{text-align:center}',
'.tabs button{white-space:nowrap}',
'header p.lead{font-size:11px; line-height:1.55; margin-top:10px}',
'#hkUpd{font-size:10.5px; line-height:1.4; margin:8px 6px 0}',
'.hkb{display:none; align-items:center; gap:10px; margin:0 0 14px; padding:12px 14px; border-radius:20px; background:var(--note); color:var(--note-fg); font-weight:700; font-size:15px; line-height:1.5}',
'.hkb.on{display:flex}.hkb span.t{flex:1}.hkb button{min-height:40px; padding:0 14px; font-size:14px; flex:none}',
'.sc{display:inline-block; font-size:13px; font-weight:700; border-radius:999px; padding:1px 10px; background:var(--field); color:var(--muted); white-space:nowrap}',
'.sc.soon{background:var(--note); color:var(--note-fg)}.sc.hot{background:var(--pop-soft); color:var(--minus)}.sc.past{opacity:.6}',
'.nx{background:var(--accent-soft); border-radius:20px; padding:14px 16px; margin-top:8px}.nx .big{font-family:var(--font-display); font-size:30px; font-weight:700; color:var(--accent)}',
'.ev{display:grid; gap:1px; padding:8px 0; border-top:1px dotted var(--line); cursor:pointer}.ev:first-child{border-top:0}.ev b{font-size:15px; line-height:1.35}',
'.ev.has .n{display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden}.ev.has.open .n{-webkit-line-clamp:unset; display:block}.ev.has b::after{content:" ▾"; color:var(--muted); font-size:12px}.ev.has.open b::after{content:" ▴"}',
'.ev.pastev{opacity:.55}.ev .d{font-family:var(--font-display); font-weight:700; font-size:14px}.ev .n{font-size:12px; color:var(--muted); line-height:1.5}',
'.ev a.cal, a.btnlike{display:inline-block; font-size:14px; font-weight:700; color:var(--accent); text-decoration:none; border:2px solid var(--line); border-radius:999px; padding:6px 14px; margin-top:4px; width:max-content}',
'.tk{display:flex; gap:10px; align-items:flex-start; padding:10px 0; border-top:2px dotted var(--line)}.tk:first-child{border-top:0}',
'.tk input{width:26px; height:26px; flex:none; margin-top:2px}.tk .x{flex:1; min-width:0; overflow-wrap:anywhere}.tk .x small{display:block; color:var(--muted); font-size:13px}',
'.tk.dn .x b{text-decoration:line-through; color:var(--muted)}',
'.srow{display:flex; justify-content:space-between; align-items:center; width:100%; min-height:56px; padding:0 6px; background:none; border:0; border-top:1px solid var(--line); border-radius:0; box-shadow:none; font-size:16px; font-weight:700; text-align:left}.slist .srow:first-child{border-top:0}.faq{padding:8px 6px; border-top:1px dotted var(--line)}.faq summary{font-weight:700; font-size:15px; cursor:pointer}.faq p{margin:6px 0 0; font-size:14px; line-height:1.7}',
'.plans{display:grid; gap:12px}.plan{display:grid; gap:4px; text-align:left; position:relative; padding:16px 16px 14px; min-height:0; border:2px solid var(--line); border-radius:20px; background:var(--surface); box-shadow:none; font-weight:400}.plan.on{border-color:var(--fg,#222); box-shadow:0 6px 14px rgba(0,0,0,.18); background:var(--field)}.plan .pb{position:absolute; top:-12px; right:14px; background:#d96b6b; color:#fff; font-size:13px; font-weight:700; border-radius:999px; padding:2px 14px}.plan .pn{font-size:15px; font-weight:700}.plan .pp b{font-size:26px; font-family:var(--font-display)}.plan .ps{font-size:13px; color:var(--muted)}.buy{display:block; width:100%; box-sizing:border-box; text-align:center; text-decoration:none; background:#2b2b2b; color:#fff; font-weight:700; font-size:17px; border:0; border-radius:16px; padding:16px; min-height:0}.buy[disabled]{opacity:.55}',
'.cal7{display:grid; grid-template-columns:repeat(7,1fr); gap:4px}.cal7 .wd{text-align:center; font-size:12px; font-weight:700; color:var(--muted); padding:2px 0}.cal7 .wd.su{color:var(--minus)}.cal7 .wd.sa{color:var(--accent)}',
'.cday{position:relative; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:3px; min-height:46px; padding:5px 0 4px; border:2px solid transparent; border-radius:14px; background:var(--field); box-shadow:none; font-size:15px; font-weight:700; color:var(--fg,inherit)}',
'.cday.out{background:none; opacity:.35}.cday.today{border-color:var(--accent)}.cday.sel{background:var(--accent); color:var(--accent-fg,#fff)}.cday .dots{display:flex; gap:1px; min-height:14px; flex-wrap:nowrap; white-space:nowrap; font-size:11px; line-height:1; font-weight:400}.cday.dl{background:#fdeceb; border-color:#e0524d}.cday.dl.sel{background:var(--accent); border-color:var(--accent)}.calform{border:2px dashed var(--line); border-radius:18px; padding:12px 14px; margin-top:14px}.calsteps{margin:6px 0; padding-left:1.4em; font-size:14px; line-height:1.7}.calpick{background:var(--accent-soft); border-radius:12px; padding:8px 12px; font-size:15px}.cleg{font-size:13px}.dt{width:8px; height:8px; border-radius:50%; display:inline-block; flex:none}',
'.dt.k1{background:#e0524d}.dt.k2{background:#2a8fd0}.dt.k3{background:#3aa66a}.dt.k4{background:#e0a100}.dt.k5{background:#8a6fd0}.dt.k6{background:#17a2a2}.cday.sel .dt{outline:1.5px solid #fff}',
'.calh{display:flex; align-items:center; justify-content:space-between; margin-bottom:8px}.calh b{font-size:18px}.calh button{min-height:40px; min-width:44px; padding:0 12px}',
'.cleg{display:flex; flex-wrap:wrap; gap:4px 12px; font-size:12px; color:var(--muted); margin:8px 0}.cleg span{display:inline-flex; align-items:center; gap:4px}',
'.dd{border-top:2px dotted var(--line); padding:8px 0}.dd:first-child{border-top:0}.dd .t{font-weight:700}.dd small{display:block; color:var(--muted); font-size:13px}',
'.fimg{display:flex; gap:10px; align-items:center; margin:6px 0}.fimg .fpic{flex:none; line-height:0}.fimg .ftx{display:grid; gap:2px; min-width:0}.fimg .fcap{color:var(--muted); font-size:11px}.fimg a{font-size:14px; font-weight:700; color:var(--accent); text-decoration:none}',
'.tk.dk{padding:6px 0; gap:8px}.tk.dk .x{font-size:15px; line-height:1.4}.tk.dk details{margin:0}.tk.dk summary{font-size:12px; line-height:1.3; min-height:0; height:auto; margin:0; color:var(--muted); cursor:pointer; padding:0; width:max-content; display:list-item}.tk.dk .x b{display:inline}.tk.dk .sc{font-size:11px; padding:0 8px}.tk.dk input{width:24px; height:24px}.tk.dk small{margin-top:2px}',
'.addtk{display:grid; gap:8px; margin-top:10px}',
'.cal7{gap:3px}.cal7 .wd{font-size:11px; padding:0}',
'#viewSched .tk{padding:6px 0; gap:8px; border-top-width:1px}#viewSched .tk input{width:22px; height:22px; margin-top:1px}#viewSched .tk .x b{display:block; font-size:15px; line-height:1.35}#viewSched .tk .x small{display:inline; font-size:12px}#viewSched .tk .x .sc{font-size:11px; padding:0 7px}#viewSched .tk .x .mini{min-height:24px; height:24px; padding:0 10px; font-size:12px; margin-left:8px; border-width:1.5px; border-radius:999px; vertical-align:middle; box-shadow:none}',
'#viewSched .panel > .hint{font-size:12px; line-height:1.5}',
'#viewSched .addtk{gap:4px; margin-top:8px}#viewSched .addtk .field{font-size:12px}#viewSched .addtk input{min-height:40px; font-size:15px}#viewSched .addtk .primary{min-height:42px; font-size:15px}',
'.cal7{gap:2px}.cday{min-height:30px; line-height:1.15; padding:3px 0 2px; border-radius:8px; font-size:13px}.cday .dots{min-height:10px; font-size:9px}.cal7 .wd{font-size:10px}',
'.calh{margin-bottom:2px}.calh b{font-size:15px}.calh button{min-height:30px; min-width:36px; font-size:12px}',
'.cleg{font-size:10px; gap:1px 7px; margin:4px 0}',
'#viewSched .tk{align-items:center; padding:5px 0; gap:7px}#viewSched .tk input{width:17px; height:17px; margin:0; flex:none}#viewSched .tk .x b{font-size:14px; line-height:1.3; font-weight:800; color:var(--accent)}#viewSched .tk.dn .x b{color:var(--muted)}#viewSched .tk .x small{font-size:11px}#viewSched .tk .x .sc{font-size:10px; padding:0 6px}#viewSched .tk .mini{flex:none; margin:0 0 0 auto; min-height:22px; height:22px; padding:0 9px; font-size:11px; border-width:1px; border-radius:999px; box-shadow:none}',
'.cday{min-height:26px !important; font-size:12px !important; padding:2px 0 1px !important; border-radius:7px !important}.cday .dots{min-height:9px !important; font-size:8px !important}.cal7{gap:2px !important}.cal7 .wd{font-size:10px}',
'.calh button{min-height:28px !important; min-width:34px !important}.calh b{font-size:14px !important}',
'#hkCal h3{font-size:13px !important; margin:4px 0 2px !important}.cleg{font-size:10px !important}',
'#hkCal .calh, #hkCal .cal7, #hkCal .cleg{max-width:290px; margin-left:auto; margin-right:auto}',
'.cday{min-height:22px !important; font-size:11px !important; padding:1px 0 0 !important; border-radius:6px !important; border-width:1px !important}.cday .dots{min-height:8px !important; font-size:7px !important}.cal7{gap:1px !important}.cal7 .wd{font-size:9px !important}',
'.calh{margin-bottom:0 !important}.calh button{min-height:24px !important; min-width:30px !important; font-size:11px !important}.calh b{font-size:13px !important}',
'.cleg{font-size:9px !important; gap:0 6px !important; margin:3px auto !important}',
'.calform{padding:6px 9px !important; margin-top:6px !important}.calsteps{font-size:11px !important}.calpick{font-size:12px !important; padding:3px 9px !important}.calform input[type=text]{min-height:36px !important; font-size:14px !important}.calform .primary{min-height:38px !important; font-size:14px !important}',

'.cday{min-height:38px; padding:3px 0 2px; gap:0; border-radius:10px; font-size:14px; border-width:1.5px}.cday .dots{min-height:12px; font-size:10px}',
'.calh{margin-bottom:4px}.calh b{font-size:16px}.calh button{min-height:34px; min-width:40px; padding:0 10px; font-size:13px}',
'.cleg{gap:2px 9px; font-size:11px; margin:6px 0}.cleg span{gap:2px}',
'#hkCal h3{font-size:14px; margin:6px 0 2px}.dd{padding:5px 0}.dd .t{font-size:14px}.dd small{font-size:12px}',
'.calform{padding:8px 10px; margin-top:8px; border-radius:14px}.calform > div:first-child{font-size:14px !important}.calsteps{margin:3px 0; padding-left:1.2em; font-size:12px; line-height:1.5}.calpick{padding:4px 10px; font-size:13px; border-radius:10px}.calform .field{font-size:12px; margin:6px 0 2px !important}.calform input[type=text]{min-height:40px; font-size:15px}.calform .primary{min-height:42px; font-size:15px; margin-top:6px !important}',

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
var hsv = document.querySelector('header svg.hero'); if(hsv) hsv.setAttribute('preserveAspectRatio', 'xMidYMid slice');
var tb = document.createElement('button');
tb.type = 'button'; tb.id = 'tabSched'; tb.className = 'hero'; tb.setAttribute('role', 'tab'); tb.setAttribute('aria-selected', 'false');
tb.innerHTML = '<span class="ti">📅</span><span style="text-align:left"><span style="display:inline-flex; align-items:center; gap:3px; white-space:nowrap!important">' + CR + '<span>スケジュール</span></span><small style="display:block; font-size:11px; font-weight:500; line-height:1.2; white-space:nowrap!important; letter-spacing:-0.03em; padding-left:13px">やることリスト</small></span>';
tabs.insertBefore(tb, $('tabFind'));
var view = document.createElement('div'); view.id = 'viewSched'; view.hidden = true;
$('viewAbout').parentNode.insertBefore(view, $('viewAbout'));
var banner = document.createElement('div'); banner.className = 'hkb'; banner.id = 'hkBanner';
tabs.parentNode.insertBefore(banner, tabs);

function showSched(){
  hidePaid();
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = false; var vd = document.getElementById('viewDocs'); if(vd) vd.hidden = true;
  var td = document.getElementById('tabDocs'); if(td) td.setAttribute('aria-selected', 'false');
  ['tabIndex', 'tabFind', 'tabCmp', 'tabVisit', 'tabAbout'].forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); });
  tb.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  if(PREMIUM) renderSched(); else view.innerHTML = lockCard('スケジュール'); window.scrollTo(0, 0);
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
  banner.innerHTML = '<div class="bm"><span class="bl">📣 次の締切</span><b class="bd">' + (k === 0 ? '今日です' : 'あと' + k + '日') + '</b><span class="bdt">' + md(n.date) + '</span></div><div class="bt">' + esc(n.title) + '</div><button type="button" class="bmsg" id="hkBdoc">' + (k === 0 ? '今日が締切です。' : 'あと' + k + '日で締切です。') + '提出前チェックで書類のミスを防げます タップ ›</button>';
  banner.onclick = showSched;
  var bd = document.getElementById('hkBdoc'); if(bd) bd.onclick = function(e){ e.stopPropagation(); document.getElementById('tabDocs').click(); }; banner.setAttribute('role', 'button'); banner.tabIndex = 0;
}

function taskDue(t){ return t.ev ? addDays(EVENTS.filter(function(e){ return e.id === t.ev; })[0].date, t.off) : null; }
function allTasks(){
  var a = TASKS.map(function(t){ return {id: t.id, title: t.title, due: taskDue(t), own: false}; });
  sched.custom.forEach(function(c){ a.push({id: c.id, title: c.title, due: c.date || null, own: true}); });
  return a;
}

/* ===== 保活カレンダー(月のカレンダーで、この日は何があるかを見る) ===== */
var KIND = {1: ['申込の締切', '🚩'], 2: ['区の予定', '🏛️'], 3: ['やること', '✅'], 4: ['見学', '👀'], 5: ['自分の予定', '⭐'], 6: ['空き数の更新', '🔄']};
/* 空き数は、このアプリが、毎月1日と15日の午前10時ごろに、区のページから取り込みます(自動) */
var NOTES = {'2027-01': '区が、令和9年4月(一次)の申込者数を公表する予定です。区は「今後公開予定」としか発表していません。1月ごろは、このアプリの目安で、区が決めた日ではありません。公表されたら、倍率を差し替えます。'};
var calY = (new Date()).getFullYear(), calM = (new Date()).getMonth(), calSel = fmt(new Date());
function dayItems(d){
  var a = [];
  EVENTS.forEach(function(e){ if(e.date === d) a.push({k: e.kind === '締切' ? 1 : 2, t: e.title, n: e.note}); });
  allTasks().forEach(function(t){ if(t.due === d) a.push({k: t.own ? 5 : 3, t: t.title, n: t.own ? '自分で足した予定' : '目安の日付', done: !!sched.done[t.id]}); });
  var dd2 = ymd(d); if((dd2.getDate() === 1 || dd2.getDate() === 15) && d >= '2026-11-01' && d <= '2027-04-30') a.push({k: 6, t: 'このアプリが、区の空き数を取り込む日', n: '午前10時ごろに自動で更新します。区のページの更新が遅いと、古い数字のままのことがあります。'});
  HK.getVisits().forEach(function(v){ if(!v.ex && v.date === d) a.push({k: 4, t: v.name + ' の見学', n: v.area || ''}); });
  return a;
}
function renderCal(){
  var box = $('hkCal'); if(!box) return;
  var first = new Date(calY, calM, 1), start = first.getDay(), dim = new Date(calY, calM + 1, 0).getDate(), today = fmt(new Date());
  var h = '<div class="calh"><button type="button" data-cm="-1" aria-label="前の月">◀</button><b>' + calY + '年' + (calM + 1) + '月</b><button type="button" data-cm="1" aria-label="次の月">▶</button></div><div class="cal7">';
  '日月火水木金土'.split('').forEach(function(w, i){ h += '<div class="wd' + (i === 0 ? ' su' : i === 6 ? ' sa' : '') + '">' + w + '</div>'; });
  for(var i = 0; i < start; i++) h += '<div></div>';
  for(var d = 1; d <= dim; d++){
    var ds = calY + '-' + pad(calM + 1) + '-' + pad(d), it = dayItems(ds), kinds = {};
    it.forEach(function(x){ kinds[x.k] = 1; });
    var ks = Object.keys(kinds).map(Number).sort();
    h += '<button type="button" class="cday' + (ds === today ? ' today' : '') + (kinds[1] ? ' dl' : '') + (ds === calSel ? ' sel' : '') + '" data-cd="' + ds + '" aria-label="' + (calM + 1) + '月' + d + '日 ' + it.length + '件' + (kinds[1] ? '(申込の締切)' : '') + '"><span>' + d + '</span><span class="dots">' + ks.slice(0, 2).map(function(k){ return KIND[k][1]; }).join('') + (ks.length > 2 ? '+' : '') + '</span></button>';
  }
  h += '</div><div class="cleg">' + [1, 2, 3, 4, 5, 6].map(function(k){ return '<span>' + KIND[k][1] + ' ' + KIND[k][0] + '</span>'; }).join('') + '</div>';
  var nt = NOTES[calY + '-' + pad(calM + 1)];
  if(nt) h += '<p class="hint" style="margin:0 0 8px">📢 ' + esc(nt) + '</p>';
  var items = dayItems(calSel);
  h += '<h3 style="font-size:16px; margin:8px 0 4px">' + md(calSel) + (daysLeft(calSel) >= 0 ? ' <span class="sc">' + (daysLeft(calSel) === 0 ? '今日' : 'あと' + daysLeft(calSel) + '日') + '</span>' : '') + '</h3>';
  if(!items.length) h += '<p class="hint" style="margin:0">この日の予定は、ありません。</p>';
  items.forEach(function(x){ h += '<div class="dd"><div class="t">' + KIND[x.k][1] + ' ' + esc(x.t) + (x.done ? ' ✔' : '') + '</div><small>' + KIND[x.k][0] + (x.n ? ' / ' + esc(x.n) : '') + '</small></div>'; });
  h += '<div class="calform"><div style="font-weight:700; font-size:16px">✏️ 予定を入れる</div><div class="calsteps" style="list-style:none; padding-left:0">① 上で<b>日付をタップ</b> → ② 予定を書く → ③ ボタンを押す</div><div class="calpick">選んでいる日: <b>' + md(calSel) + '</b></div><label class="field" for="hkCalT" style="margin:10px 0 4px">予定の内容</label><input id="hkCalT" type="text" placeholder="例: ○○保育園の見学(10時)"><button type="button" class="primary" id="hkCalA" style="width:100%; margin-top:8px">' + md(calSel) + 'に入れる</button></div>';
  box.innerHTML = h;
}

function renderSched(){
  var nx = nextDeadline(), h = '';
  h += '<section class="panel"><h2>' + CR + ' スケジュール</h2><p class="hint" style="margin:0">令和9年4月入園(認可保育園)の、区の日程です。出典: <a href="' + SRC.url + '" target="_blank" rel="noopener">' + esc(SRC.name) + '</a>(確認日 ' + esc(SRC.checked) + ')。日程は変わることがあるので、区のページも確認してください。</p>';
  if(nx){
    h += '<div class="nx"><div style="font-size:14px; font-weight:700; color:var(--muted)">次の締切</div><div class="big">あと' + daysLeft(nx.date) + '日</div><div><b>' + esc(nx.title) + '</b></div><div style="font-size:14px">' + md(nx.date) + '</div></div>';
  } else {
    h += '<div class="nx"><b>令和9年4月入園の申込の締切は、すべて過ぎました。</b></div>';
  }
  h += '<a href="' + ONLINE + '" target="_blank" rel="noopener" style="display:block; text-align:center; margin-top:10px; font-weight:700; color:var(--accent)">💻 オンラインで申込む(区の電子申請)</a></section>';

  h += '<section class="panel" id="hkCal"></section>';
  h += '<section class="panel"><h2>区の日程</h2>';
  EVENTS.forEach(function(ev){
    var k = daysLeft(ev.date);
    h += '<div class="ev' + (k < 0 ? ' pastev' : '') + (ev.note ? ' has' : '') + '"><div class="d">' + md(ev.date) + ' ' + chip(k) + '</div><div><b>' + esc(ev.title) + '</b></div>'
      + (ev.note ? '<div class="n">' + esc(ev.note) + '</div>' : '')
      + '</div>';
  });
  h += '<button type="button" id="hkIcs" style="width:100%; margin-top:12px">📥 全部まとめてカレンダーに入れる(.icsファイル)</button><p class="hint">締切には、7日前・前日・当日の朝9時のお知らせも付きます。ダウンロードしたファイルを開くと、カレンダーアプリに入ります。</p></section>';

  h += '<section class="panel"><h2>今後公開予定</h2><ul class="about plain">' + UNDATED.map(function(u){ return '<li>' + esc(u) + '</li>'; }).join('') + '</ul><p class="hint">決まったら、このファイルの日程を直します。区のページ: <a href="' + SRC.url + '" target="_blank" rel="noopener">令和9年4月入園のページ</a></p></section>';

  var ts = allTasks();
  ts.sort(function(a, b){ return (a.due || '9999').localeCompare(b.due || '9999'); });
  h += '<section class="panel"><h2>やることリスト</h2><p class="hint" style="margin:0 0 6px">日付は目安です。必要な書類は、区の「保育のごあんない」で確認してください。チェックは、このスマホにだけ保存されます。</p>';
  ts.forEach(function(t){
    var dn = !!sched.done[t.id], k = t.due ? daysLeft(t.due) : null;
    h += '<div class="tk' + (dn ? ' dn' : '') + '"><input type="checkbox" data-t="' + esc(t.id) + '"' + (dn ? ' checked' : '') + ' aria-label="' + esc(t.title) + '"><div class="x"><b>' + esc(t.title) + '</b><small>' + (t.due ? '目安 ' + md(t.due) + ' ' + (dn ? '' : chip(k)) : '日付は決まっていません') + '</small>'
      + '</div>' + (t.own ? '<button type="button" class="mini" data-del="' + esc(t.id) + '">削除</button>' : '') + '</div>';
  });
  h += '<div class="addtk"><label class="field" for="hkNt" style="margin:0">自分のやることを足す</label><input id="hkNt" type="text" placeholder="例: 祖父母に送迎をお願いする"><label class="field" for="hkNd" style="margin:0">日付(なくても大丈夫です)</label><input id="hkNd" type="date"><button type="button" class="primary" id="hkNa">追加する</button></div></section>';
  view.innerHTML = h;
  renderCal();
  Array.prototype.forEach.call(view.querySelectorAll('.ev.has'), function(e){ e.addEventListener('click', function(){ e.classList.toggle('open'); }); });
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
view.addEventListener('click', function(e){
  var t = e.target, b = t.closest ? t.closest('[data-cm],[data-cd],#hkCalA') : null; if(!b) return;
  if(b.getAttribute('data-cm')){ calM += +b.getAttribute('data-cm'); if(calM < 0){ calM = 11; calY--; } if(calM > 11){ calM = 0; calY++; } calSel = ''; var f = calY + '-' + pad(calM + 1) + '-01'; calSel = f; renderCal(); }
  else if(b.getAttribute('data-cd')){ calSel = b.getAttribute('data-cd'); renderCal(); }
  else if(b.id === 'hkCalA'){
    var tx2 = $('hkCalT').value.trim(); if(!tx2) return;
    sched.custom.push({id: 'c' + Date.now(), title: tx2, date: calSel}); sSave();
    var y = window.scrollY; renderSched(); window.scrollTo(0, y);
  }
});
renderBanner();
(function(){
  var lead = document.querySelector('.lead'); if(!lead || document.getElementById('hkUpd')) return;
  var n = document.createElement('p'); n.id = 'hkUpd'; n.className = 'hint'; n.style.margin = '6px 0 0';
  n.textContent = '🔄 毎月、新しい情報に更新しています(空き数の最終更新: ' + lastUpd() + ')';
  lead.parentNode.insertBefore(n, lead.nextSibling);
})();

/* ===== 見学メモ プラス ===== */
var vSec = $('vList').closest('section');
var plus = document.createElement('section');
plus.className = 'panel'; plus.id = 'hkPlus';
vSec.parentNode.insertBefore(plus, vSec.nextSibling);
var CROWN = '<span class="hi" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M4 11l6 5 6-9 6 9 6-5-3 15H7z" fill="#ffd36b" stroke="#f0b429" stroke-width="1.5" stroke-linejoin="round"/><circle cx="4" cy="11" r="2" fill="#ff7b6b"/><circle cx="16" cy="6" r="2" fill="#ff7b6b"/><circle cx="28" cy="11" r="2" fill="#ff7b6b"/></svg></span>';
if(!PREMIUM){
  plus.innerHTML = '<h2 class="hasicon">' + CROWN + '見学メモ プラス <span class="badge" style="font-size:12px">有料版</span></h2><p class="hint" style="margin:0">すべての園を並べて比べる、PDF・印刷、夫婦の同期は、有料版の機能です。</p>' + buyHtml();
} else {
  plus.innerHTML = '<h2 class="hasicon">' + CROWN + '見学メモ プラス <span class="badge">有料版・お試し中</span></h2>'
  + '<p class="hint" style="margin:0 0 6px">いまは、お試しで全員が使えます。有料になるときは、先にお知らせします。</p>'
  + '<details class="plus" id="hkD1" hidden><summary>📷 写真をつける</summary><div id="hkPh"></div></details>'
  + '<details class="plus" id="hkD3"><summary>📊 すべての園を並べて比べる</summary><div id="hkAll"></div></details>'
  + '<details class="plus" id="hkD4"><summary>📄 PDFにする・印刷する</summary><div><label class="field" for="hkSel" style="margin-top:0">1園だけPDFにするとき、園を選ぶ</label><select id="hkSel"></select><p class="hint" style="margin:0 0 8px">印刷の画面で「PDFに保存」を選ぶと、PDFになります。</p><button type="button" id="hkP1" style="width:100%; margin-bottom:8px">選んだ園のレポート(写真つき)</button><button type="button" id="hkP2" style="width:100%">すべての園のレポート</button></div></details>'
  + '<details class="plus" id="hkD5"><summary>👪 夫婦・家族で共有する</summary><div id="hkSh"></div></details>'
  + '<details class="plus" id="hkD6"><summary>' + CR + ' 🏁 希望園を並べる</summary><div id="hkWish"></div></details>'
  + '<details class="plus" id="hkD7"><summary>' + CR + ' 🔔 空きが変わったらお知らせ</summary><div id="hkWatch"></div></details>';
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
    box.innerHTML = '<p class="hint" style="margin:0 0 8px">' + esc(v.name) + ' の写真(' + ps.length + '枚)。写真は、このスマホの中だけに保存されます。夫婦で共有するときは、下の「この園の写真を送る」を使います。</p>'
      + '<label class="primary" style="display:flex; align-items:center; justify-content:center; min-height:52px; border-radius:999px; background:var(--accent); color:var(--accent-fg); font-weight:700; cursor:pointer">📷 写真を選ぶ・撮る<input id="hkFile" type="file" accept="image/*" multiple hidden></label>'
      + (ps.length ? '<button type="button" id="hkPhSend" style="width:100%; margin-top:8px">📤 この園の写真を送る(LINEなど)</button><div class="hint" id="hkPhM" role="status"></div>' : '')
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
    var sb = $('hkPhSend');
    if(sb) sb.addEventListener('click', function(){
      var m = $('hkPhM');
      var files = ps.map(function(p, i){
        var a = p.d.split(','), bin = atob(a[1]), u = new Uint8Array(bin.length);
        for(var j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
        return new File([u], (v.name || '見学') + '-' + (i + 1) + '.jpg', {type: 'image/jpeg'});
      });
      if(navigator.canShare && navigator.canShare({files: files}))
        navigator.share({files: files, title: v.name + ' の写真', text: v.name + ' の見学の写真です。'}).catch(function(){});
      else m.textContent = 'このブラウザでは、まとめて送れません。写真を長押しして、保存してから送ってください。';
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
function qAns(q, r){
  var g = QOPT[q.id];
  if(!g) return '<input type="text" data-n="' + esc(q.id) + '" value="' + esc(r.n || '') + '" placeholder="答えのメモ">';
  var cur = String(r.n || '').split(' / ');
  return '<div class="qsel">' + g.map(function(x, i){
    return '<select data-sel="' + esc(q.id) + '" data-i="' + i + '" aria-label="' + esc(x.p) + '"><option value="">' + esc(x.p) + '</option>' + x.o.map(function(o){ return '<option' + (cur.indexOf(o) >= 0 ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
  }).join('') + '</div>';
}
function qTarget(){
  var fm = $('vForm'); if(!fm || fm.hidden) return null;
  var id = HK.formId ? HK.formId() : null;
  return {id: id || '__new', name: ''};
}
function renderQ(){
  var v = qTarget(), box = $('hkQ');
  if(!box) return;
  if(!v){ box.innerHTML = ''; return; }
  var a = qd.a[v.id] || (qd.a[v.id] = {}), qs = allQ(), n = qs.filter(function(q){ return a[q.id] && a[q.id].d; }).length;
  box.innerHTML = '<p class="hint" style="margin:0 0 6px">聞けた質問 ' + n + ' / ' + qs.length + '。聞けたらチェックして、答えを選びます。</p>'
    + qs.map(function(q){
      var r = a[q.id] || {};
      return '<div class="qk"><label><input type="checkbox" data-q="' + esc(q.id) + '"' + (r.d ? ' checked' : '') + '><span>' + esc(q.t) + '</span></label>' + qAns(q, r) + '</div>';
    }).join('')
    + '';
  Array.prototype.forEach.call(box.querySelectorAll('input[data-q]'), function(c){
    c.addEventListener('change', function(){ (a[c.dataset.q] = a[c.dataset.q] || {}).d = c.checked; qSave(); renderQ(); renderAll(); });
  });
  Array.prototype.forEach.call(box.querySelectorAll('select[data-sel]'), function(c){
    c.addEventListener('change', function(){
      var id = c.dataset.sel, vals = Array.prototype.map.call(box.querySelectorAll('select[data-sel="' + id + '"]'), function(s){ return s.value; }).filter(Boolean);
      (a[id] = a[id] || {}).n = vals.join(' / '); if(vals.length) a[id].d = true; qSave(); renderQ(); renderAll();
    });
  });
  Array.prototype.forEach.call(box.querySelectorAll('input[data-n]'), function(c){
    c.addEventListener('change', function(){ (a[c.dataset.n] = a[c.dataset.n] || {}).n = c.value; qSave(); });
  });
}
function askedCount(v){ var a = qd.a[v.id] || {}; return allQ().filter(function(q){ return a[q.id] && a[q.id].d; }).length; }

/* --- すべての園を並べて比べる --- */
function renderAll(){
  var vs = realVisits(), box = $('hkAll');
  if(!vs.length){ box.innerHTML = '<p class="hint">見学した園を追加すると、ここに並びます。</p>'; return; }
  function row(label, fn){ return '<tr><th scope="row">' + esc(label) + '</th>' + vs.map(function(v){ return '<td>' + fn(v) + '</td>'; }).join('') + '</tr>'; }
  var h = '<p class="hint" style="margin:0">園の数に上限はありません。横にスライドして見られます。</p><div class="tblwrap"><table class="cmp"><thead><tr><th scope="col">項目</th>' + vs.map(function(v){ return '<th scope="col">' + esc(v.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
  h += row('地域・見学日', function(v){ return esc(v.area) + (v.date ? '<br>' + esc(v.date.slice(5).replace('-', '/')) : ''); });
  h += row('総合評価', function(v){ var g = HK.grade(v); return HK.gbadge(v) + '<br><small>○' + g.c.g + ' △' + g.c.w + ' ✕' + g.c.b + '</small>'; });
  h += row('入園可能数', function(v){ var s = vst(v); return s && s.vac !== null ? s.vac + '人' : '―'; });
  h += row('第1希望の倍率', function(v){ var s = vst(v); return s && s.r1 !== null ? HK.times(s.r1) : '―'; });
  h += row('全希望の倍率', function(v){ var s = vst(v); return s && s.r2 !== null ? '<b>' + HK.times(s.r2) + '</b>' : '―'; });
  h += row('○ △ ✕', function(v){ var c = HK.counts(v); return '○' + c.g + ' △' + c.w + ' ✕' + c.b; });
  HK.items.forEach(function(it){ h += row(it.l, function(v){ var s = v.st[it.id] || 'q'; return '<span class="s ' + s + '">' + HK.status[s].s + '</span>'; }); });
  h += row('聞けた質問', function(v){ return askedCount(v) + ' / ' + allQ().length; });
  h += row('良かったところ', function(v){ return esc(v.good || '') || '―'; });
  h += row('気になったところ', function(v){ return esc(v.bad || '') || '―'; });
  h += row('次に聞くこと', function(v){ return esc(v.ask || '') || '―'; });
  h += row('メモ', function(v){ return esc(v.memo || '') || '―'; });
  box.innerHTML = h + '</tbody></table></div><p class="hint">○よい △ふつう ✕いまいち。倍率は ' + HK.cls() + '歳児クラスの数字です。</p>';
}

/* --- PDF・印刷 --- */
var pr = document.createElement('div'); pr.id = 'hkPrint'; document.body.appendChild(pr);
function visitHtml(v, photos){
  var c = HK.counts(v), s = vst(v), a = qd.a[v.id] || {};
  var h = '<div class="pg"><h2>' + esc(v.name) + '</h2><p>' + esc(v.area) + (v.date ? ' ・ 見学日 ' + esc(v.date) : '') + ' ・ 総合評価 ' + HK.grade(v).l + ' (○' + HK.grade(v).c.g + ' △' + HK.grade(v).c.w + ' ✕' + HK.grade(v).c.b + ')</p>';
  h += '<p>○' + c.g + ' △' + c.w + ' ✕' + c.b + (s && s.vac !== null ? ' ・ ' + HK.cls() + '歳児 入園可能 ' + s.vac + '人' + (s.r2 !== null ? '、全希望の倍率 ' + HK.times(s.r2) : '') : '') + '</p>';
  h += '<table><tbody>' + HK.items.map(function(it){ var x = v.st[it.id] || 'q'; return '<tr><td>' + esc(it.l) + '</td><td style="width:3em">' + HK.status[x].s + '</td></tr>'; }).join('') + '</tbody></table>';
  if(v.good) h += '<p>良かったところ: ' + esc(v.good) + '</p>';
  if(v.bad) h += '<p>気になったところ: ' + esc(v.bad) + '</p>';
  if(v.ask) h += '<p>次に聞くこと: ' + esc(v.ask) + '</p>';
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
    return '■' + v.name + '(' + v.area + (v.date ? '・' + v.date : '') + ')\n総合評価 ' + HK.grade(v).l + ' / ○' + c.g + ' △' + c.w + ' ✕' + c.b + (s && s.r2 !== null ? ' / 全希望の倍率 ' + HK.times(s.r2) : '') + (v.good ? '\n良かった: ' + v.good : '') + (v.bad ? '\n気になる: ' + v.bad : '') + (v.ask ? '\n次に聞く: ' + v.ask : '') + (v.memo ? '\nメモ: ' + v.memo : '');
  }).join('\n\n');
}
function b64e(s){ return btoa(unescape(encodeURIComponent(s))); }
function b64d(s){ return decodeURIComponent(escape(atob(s))); }
function copy(text, done){
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
  else done(false);
}
$('hkSh').innerHTML = '<p class="hint" style="margin:0 0 8px">LINEなどで送るだけで、夫婦で見学メモを共有できます。相手が、届いたリンクをタップして「取り込む」を押すだけです。写真は共有されません。</p>'
  + '<button type="button" id="hkS1" style="width:100%; margin-bottom:8px">見学メモを文章で送る</button>'
  + '<button type="button" class="primary" id="hkS4" style="width:100%; margin-bottom:8px">LINEなどで送る(相手がタップするだけで取り込めます)</button>'
  + '<button type="button" id="hkS2" style="width:100%">共有コードを作る(リンクが使えないとき)</button>'
  + '<textarea id="hkCode" readonly hidden></textarea><p class="hint" id="hkShM"></p>'
  + '<label class="field" for="hkIn">受け取った共有コードを取り込む</label><textarea id="hkIn" placeholder="HK1:かHK2:で始まるコードを貼り付けます"></textarea><button type="button" class="primary" id="hkS3" style="width:100%; margin-top:8px">取り込む</button>';
$('hkS1').addEventListener('click', function(){
  var t = shareText();
  if(navigator.share) navigator.share({text: t}).catch(function(){});
  else copy(t, function(ok){ $('hkShM').textContent = ok ? '文章をコピーしました。LINEなどに貼り付けてください。' : 'コピーできませんでした。'; });
});
$('hkS2').addEventListener('click', function(){
  var code = 'HK1:' + b64e(JSON.stringify({v: realVisits().filter(function(v){ return !v.ex; }), q: qd}));
  var ta = $('hkCode'); ta.hidden = false; ta.value = code; ta.focus(); ta.select();
  copy(code, function(ok){ $('hkShM').textContent = ok ? '共有コードをコピーしました。LINEなどに貼り付けて送ってください。' : '上のコードを全部コピーして、送ってください。'; });
});
/* 共有データを、いまの記録にまぜる(同じ園は、上書きしない) */
function mergeShared(d){
  var have = {}, add = 0;
  vis().forEach(function(v){ have[v.id] = true; });
  var list = vis().filter(function(v){ return !v.ex; });
  (d.v || []).forEach(function(v){ if(v && v.id && !have[v.id]){ list.push(v); add++; } });
  var q = d.q || {};
  (q.custom || []).forEach(function(c){ if(!qd.custom.some(function(x){ return x.id === c.id; })) qd.custom.push(c); });
  Object.keys(q.a || {}).forEach(function(id){ if(!qd.a[id]) qd.a[id] = q.a[id]; });
  qSave(); HK.setVisits(list);
  return add;
}
/* HK1: ふつうの文字 / HK2: ちぢめた文字(短い) */
function u8b64(u){ var s = ''; for(var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64u8(t){ t = t.replace(/-/g, '+').replace(/_/g, '/'); while(t.length % 4) t += '='; var s = atob(t), u = new Uint8Array(s.length); for(var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
function pipe(stream, data){ return new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer(); }
function encodeShare(obj){
  var js = JSON.stringify(obj);
  if(window.CompressionStream) return pipe(new CompressionStream('deflate-raw'), new TextEncoder().encode(js)).then(function(b){ return 'HK2:' + u8b64(new Uint8Array(b)); });
  return Promise.resolve('HK1:' + b64e(js));
}
function decodeShare(str){
  str = str.trim();
  if(str.indexOf('HK1:') === 0) return Promise.resolve(JSON.parse(b64d(str.slice(4))));
  if(str.indexOf('HK2:') === 0 && window.DecompressionStream) return pipe(new DecompressionStream('deflate-raw'), b64u8(str.slice(4))).then(function(b){ return JSON.parse(new TextDecoder().decode(b)); });
  return Promise.reject(new Error('x'));
}
function shareData(){ return {v: realVisits().filter(function(v){ return !v.ex; }), q: qd}; }
var SHARE_BASE = 'https://ponta04151207-eng.github.io/hoikatsu-app/hoikatsu.html';
$('hkS2').addEventListener('click', function(){
  encodeShare(shareData()).then(function(code){
    var ta = $('hkCode'); ta.hidden = false; ta.value = code; ta.focus(); ta.select();
    copy(code, function(ok){ $('hkShM').textContent = ok ? '共有コードをコピーしました。LINEなどに貼り付けて送ってください。' : '上のコードを全部コピーして、送ってください。'; });
  });
});
$('hkS4').addEventListener('click', function(){
  var m = $('hkShM');
  if(!shareData().v.length){ m.textContent = '見学した園を、先に追加してください。'; return; }
  encodeShare(shareData()).then(function(code){
    var url = SHARE_BASE + '#hk=' + code;
    var text = '見学メモを送ります。このリンクをタップすると、保活アプリで取り込めます。(写真は入りません。写真は、別に送ります)';
    if(navigator.share) navigator.share({title: '保活アプリ 見学メモ', text: text, url: url}).catch(function(){});
    else copy(text + '\n' + url, function(ok){ m.textContent = ok ? 'リンクをコピーしました。LINEなどに貼り付けて送ってください。' : 'コピーできませんでした。'; });
  });
});
$('hkS3').addEventListener('click', function(){
  var m = $('hkShM');
  decodeShare($('hkIn').value).then(function(d){ m.textContent = mergeShared(d) + '園を取り込みました。'; })
    .catch(function(){ m.textContent = '共有コードを読み取れませんでした。HK1:かHK2:から最後まで、全部貼り付けてください。'; });
});
/* 送られてきたリンクを開いたとき */
(function(){
  var m = location.hash.match(/^#hk=(HK[12]:[A-Za-z0-9+\/=_\-]+)$/);
  if(!m) return;
  var b = document.createElement('div'); b.className = 'hkb on'; b.style.flexWrap = 'wrap';
  decodeShare(m[1]).then(function(d){
    var n = (d.v || []).length;
    b.innerHTML = '<span class="t">👪 共有された見学メモ(' + n + '園)があります。取り込みますか?</span><button type="button" class="primary" id="hkImY">取り込む</button><button type="button" id="hkImN">やめる</button>';
    tabs.parentNode.insertBefore(b, tabs);
    function clear(){ history.replaceState(null, '', location.pathname + location.search); }
    $('hkImY').addEventListener('click', function(){ var a = mergeShared(d); clear(); b.innerHTML = '<span class="t">' + a + '園を取り込みました。「見学メモ」のタブで見られます。</span>'; setTimeout(function(){ b.remove(); }, 6000); });
    $('hkImN').addEventListener('click', function(){ clear(); b.remove(); });
  }).catch(function(){ b.innerHTML = '<span class="t">共有リンクを読み取れませんでした。送り直してもらってください。</span>'; tabs.parentNode.insertBefore(b, tabs); });
})();


/* --- 希望園を並べる --- */
var W_KEY = 'hoikatsu-wish-v1';
var wish = lsGet(W_KEY, []);
if(!Array.isArray(wish)) wish = [];
function wSave(){ lsSet(W_KEY, wish); }
var WSRC = {url: 'https://www.city.setagaya.lg.jp/01044/1554.html', name: '区「選考方法について」', upd: '2026年9月1日', checked: '2026年10月29日'};
function wVisit(id){ return vis().filter(function(v){ return v.id === id; })[0]; }
function wR2(v){ var s = vst(v); return s && s.r2 !== null ? s.r2 : null; }
function wsum(v){ var c = HK.counts(v); return (c.g + c.w + c.b) ? '<small class="rs"><b class="g">○' + c.g + '</b> <b class="w">△' + c.w + '</b> <b class="b">✕' + c.b + '</b></small>' : ''; }
function renderWish(){
  var box = $('hkWish'); if(!box) return;
  wish = wish.filter(function(id){ return wVisit(id); });
  var vs = realVisits(), h = '';
  h += '<p class="hint" style="margin:0 0 8px">区は「希望する園の数や順位で、有利・不利にはならない」と説明しています(出典: <a href="' + WSRC.url + '" target="_blank" rel="noopener">' + esc(WSRC.name) + '</a>、区の更新 ' + esc(WSRC.upd) + '、確認日 ' + esc(WSRC.checked) + ')。選考は点数の高い順です。だから、順位は<b>行きたい順</b>で大丈夫です。このリストは、考えを整理して、申込書に写すためのものです。</p>';
  h += '<div class="mysc"><span>あなたの予想点数</span><b>' + (HK.total ? HK.total() : '') + '<small>点</small></b></div><p class="hint" style="margin:0 0 6px">この点数からみた、各園の入りやすさの目安を、園の名前の横に出しています。</p>';
  h += '<p style="margin:0 0 8px"><b>' + wish.length + ' / 10園</b>(第10希望まで書けます)</p>';
  if(!wish.length) h += '<p class="hint">下から園を追加してください。見学メモに入れた園が出ます。</p>';
  var EZ = {easy:0, mid:0, hard:0, none:0};
  function ezOf(v){ var f = v.fac && HK.facMap[v.fac]; return f && HK.ease ? HK.ease(f) : null; }
  wish.forEach(function(id, i){
    var v = wVisit(id), s = vst(v), r = wR2(v), ez = ezOf(v);
    if(ez) EZ[ez.k]++; else EZ.none++;
    h += '<div class="tk" style="align-items:center"><span class="sc soon" style="flex:none">第' + (i + 1) + '</span><span class="x"><b>' + (v.ex ? '<span class="ex">例</span>' : '') + esc(v.name) + '</b><small>' + esc(v.area || '') + (v.date ? ' ・ ' + esc(v.date.slice(5).replace('-', '/')) : '') + '</small>' + wsum(v) + '<small>' + (ez ? '<span class="ezb ez-' + ez.k + '" title="' + esc(ez.why) + '">あなたの点:' + ez.l + '</span> ' : '') + (s && s.vac !== null ? '空き' + s.vac + '人・倍率' + (r !== null ? HK.times(r) : '―') : '昨年の数字なし') + '</small>' + (v.ex ? '' : '<a class="wmap" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.name + ' 保育園 世田谷区') + '" target="_blank" rel="noopener">🗺️ 地図・写真を見る(タップ)</a>') + '</span>'
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
  if(wish.length){
    var bal = [];
    h += '<div class="ezbox"><b>合格しやすさの目安</b><span>入りやすい ' + EZ.easy + '園 / ふつう ' + EZ.mid + '園 / 厳しい ' + EZ.hard + '園</span></div>';
    if(EZ.easy === 0 && wish.length >= 2) bal.push('「入りやすい」目安の園がありません。通える範囲で、倍率の低い園も1〜2園入れると安心です。');
    if(EZ.hard === wish.length) bal.push('すべて「厳しい」目安です。認可外や一時預かりなど、ほかの預け先も同時に探しておくと安心です。');
    if(EZ.easy === wish.length && wish.length >= 3) bal.push('入りやすい園だけです。行きたい園があれば、上の方に入れても大丈夫です。区は順位で不利にならないと説明しています。');
    if(!bal.length && wish.length >= 2) bal.push('入りやすい園と厳しい園がバランスよく入っています。');
    h += '<ul class="hint" style="margin:6px 0 0; padding-left:1.2em; display:grid; gap:4px">' + bal.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '<li>目安は、昨年の入園者の点数分布と昨年の倍率から出した参考です。合格を約束するものではありません。</li></ul>';
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
  else if(t.id === 'hkWs2'){ wish.sort(function(x, y){ function av(v){ return HK.grade(v).s; } return av(wVisit(y)) - av(wVisit(x)); }); wSave(); renderWish(); }
  else if(t.id === 'hkWcp'){
    var txt = '希望園リスト\n' + wish.map(function(id, k){ return '第' + (k + 1) + '希望 ' + wVisit(id).name; }).join('\n');
    copy(txt, function(ok){ $('hkWm').textContent = ok ? 'コピーしました。' : 'コピーできませんでした。画面の文字を見て写してください。'; });
  }
});

/* --- 全体の更新 --- */
(function(){
  var nb = $('vNoteBox'), fm = $('vForm'); if(!nb || !fm || $('hkQ')) return;
  var qb = document.createElement('div'); qb.id = 'hkQbox';
  qb.innerHTML = '<h3 class="grp" style="margin-top:14px">❓ 質問リスト</h3><div id="hkQ"></div>';
  nb.appendChild(qb);
  new MutationObserver(function(){
    if(fm.hidden) return;
    if(!(HK.formId && HK.formId())){ qd.a.__new = {}; qSave(); }
    renderQ();
  }).observe(fm, {attributes: true, attributeFilter: ['hidden']});
  $('vSave').addEventListener('click', function(){
    if(!fm.hidden || (HK.formId && HK.formId())) return;
    var vs = vis(), last = vs[vs.length - 1];
    if(last && qd.a.__new){ qd.a[last.id] = qd.a.__new; delete qd.a.__new; qSave(); renderAll(); }
  });
  $('vCancel').addEventListener('click', function(){ if(qd.a.__new){ delete qd.a.__new; qSave(); } });
})();
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
photoLookup = function(key){
  var v = vis().filter(function(x){ return !x.ex && x.fac === key; })[0];
  if(!v) return Promise.resolve(null);
  return photosOf(v.id).then(function(ps){ return ps.length ? ps[0].d : null; }, function(){ return null; });
};
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
  ['move', '世田谷区へ転入する予定がある', [['本人確認書類・転入に関する申立書・転入を証明する資料', '入園月の前月までに転入が確認できるときだけ、区民と同じ点数で選考されます。', false]]]
];
var DOC_COMMON = [
  ['申込書兼給付認定申請書', '「保育所等入園(転園)申込書兼教育・保育給付認定申請書(2号・3号認定用)」。世帯で1通です。区のページからダウンロードできます。'],
  ['マイナンバーの番号確認', 'マイナンバーカード、またはマイナンバーが書かれた住民票の写しなど。窓口は原本を見せます。郵送は写しを同封します。'],
  ['本人確認', '運転免許証など1点、または健康保険証など2点以上。窓口は原本、郵送は写し。保険証の写しは、記号・番号・保険者番号を黒く塗ります。'],
  ['税の書類', '令和9年4月入園は、令和8年度の住民税課税証明書(または住民税決定通知書)。税の未申告のときは先に申告が必要です(確定申告書の控えや源泉徴収票では代わりになりません)。配偶者控除の対象になっている方は、税の書類も申告も不要です。']
];
var ONLINE = 'https://www.city.setagaya.lg.jp/01044/1565.html', FORM_PDF = 'https://www.city.setagaya.lg.jp/documents/1552/mousikomisyo_0809.pdf', FORM_XLS = 'https://www.city.setagaya.lg.jp/documents/1552/mousikomisyo_0809.xlsx';
var D_KEY = 'hoikatsu-docs-v1';
var dd = lsGet(D_KEY, {a: 'work', b: 'work', opts: {}, done: {}, way: 'mail'});
if(!dd.opts) dd.opts = {}; if(!dd.done) dd.done = {}; if(!dd.way) dd.way = 'mail';
function dSave(){ lsSet(D_KEY, dd); }
function evDate(id){ return EVENTS.filter(function(e){ return e.id === id; })[0].date; }
function monthsBack(s, n){ var d = ymd(s); d.setMonth(d.getMonth() - n); return fmt(d); }

var tbD = document.createElement('button');
tbD.type = 'button'; tbD.id = 'tabDocs'; tbD.className = 'hero'; tbD.setAttribute('role', 'tab'); tbD.setAttribute('aria-selected', 'false');
tbD.style.gridColumn = 'span 6';
tbD.innerHTML = '<span class="ti">📋</span><span style="text-align:left"><span style="display:inline-flex; align-items:center; gap:3px; white-space:nowrap!important">' + CR + '<span>提出前チェック</span></span><small style="display:block; font-size:11px; font-weight:500; line-height:1.2; white-space:nowrap!important; letter-spacing:-0.03em; padding-left:13px">書類リスト</small></span>';
tabs.insertBefore(tbD, $('tabFind'));
var viewD = document.createElement('div'); viewD.id = 'viewDocs'; viewD.hidden = true;
view.parentNode.insertBefore(viewD, view);
var TABIDS = ['tabIndex', 'tabSched', 'tabFind', 'tabCmp', 'tabVisit', 'tabAbout'];
function showDocs(){
  hidePaid();
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = true; viewD.hidden = false;
  TABIDS.forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); });
  tbD.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  if(PREMIUM) renderDocs(); else viewD.innerHTML = lockCard('提出前チェックと書類リスト'); window.scrollTo(0, 0);
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
  var h = '<section class="panel"><h2>💻 オンラインで申込む</h2><p class="hint" style="margin:0 0 8px">区の電子申請なら、スマホから申込めます。印刷も郵送もいりません。締切は、郵送と同じ' + md(evDate('first-mail')) + 'です(あと' + Math.max(0, daysLeft(evDate('first-mail'))) + '日)。ログインや入力は、区のページで、ご自身でしてください。</p><a class="primary" href="' + ONLINE + '" target="_blank" rel="noopener" style="display:block; text-align:center; text-decoration:none; padding:14px; border-radius:999px; font-weight:700">区の電子申請のページを開く</a><p class="hint" style="margin:8px 0 0">先に、下の書類リストで、必要な書類をそろえて、写真かPDFにしておくと、早く進みます。申込書の様式は <a href="' + FORM_PDF + '" target="_blank" rel="noopener">PDF</a>・<a href="' + FORM_XLS + '" target="_blank" rel="noopener">Excel</a> です。</p></section>';
  h += '<section class="panel"><h2 style="display:flex; align-items:center; gap:8px; margin:0">' + CR + '<span style="line-height:1.35">提出前チェック<br>書類リスト</span></h2><p style="margin:2px 0 8px; font-size:12px; font-weight:700; color:var(--accent)">令和9年4月入園(認可保育園)</p><p class="hint" style="margin:0">申込みに必要な書類を、状況に合わせて一覧にします。<br>出典: <a href="' + DSRC.url + '" target="_blank" rel="noopener">' + esc(DSRC.name) + '</a>(確認日 ' + esc(DSRC.checked) + ')。<br>人によって増える書類もあるので、出す前に区のページでも確認してください。</p><a class="olink" href="' + ONLINE + '" target="_blank" rel="noopener">💻 オンライン申請のページを開く(区の電子申請) ›</a></section>';
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
  h += '<a class="olink" href="' + ONLINE + '" target="_blank" rel="noopener">💻 オンライン申請のページを開く ›</a>';
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
  h += '<p class="hint">希望園は、「見学メモ プラス」の「希望園を並べる」で作ったリストが、メモの最後に入ります(' + wish.length + '園)。</p>'
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

/* ===== 課金でできること ===== */
var tbP = document.createElement('button');
tbP.type = 'button'; tbP.id = 'tabPaid'; tbP.className = 'hero'; tbP.setAttribute('role', 'tab'); tbP.setAttribute('aria-selected', 'false');
tbP.style.gridColumn = 'span 6';
tbP.innerHTML = '<span class="ti">' + CR.replace('width="18" height="18"', 'width="26" height="26"') + '</span><span>課金でできること</span>';
tabs.insertBefore(tbP, $('tabFind'));
var viewP = document.createElement('div'); viewP.id = 'viewPaid'; viewP.hidden = true;
view.parentNode.insertBefore(viewP, view);
function hidePaid(){ viewP.hidden = true; tbP.setAttribute('aria-selected', 'false'); if(typeof viewS !== 'undefined' && viewS){ viewS.hidden = true; tbS.setAttribute('aria-selected', 'false'); } }
var PAID = [
  ['watch', '空きアラート', '見学メモの園の空きが変わったら、アプリを開いたときにお知らせ(メールなし)。毎月1日・15日のカレンダー予定も入れられます。'],
  ['cmp3', '園を比べる(2園から有料)', '無料で見られるのは1園までです。2園以上を並べて比べられます。'],
  ['ease', '合格しやすさの目安(園を並べる)', '希望園ごとに「入りやすい・ふつう・厳しい」の目安が出ます。10園のバランスの提案つき。合格の約束ではありません。'],
  ['wish', '希望園を並べる', '第10希望までのリストを作って並べ替え。昨年の倍率と見学の評価を見ながら考えられます。'],
  ['dist', '各園の点数比較', 'あなたの希望の園の入りやすさと、自分の点数の位置がわかります!※高い方でも確実に入れるわけではありません。ご了承ください。無料版は、1園だけ見られます。', '<details class="dbx" style="margin:6px 0"><summary><b style="display:inline">分布でわかること・わからないこと</b></summary><ul class="hint" style="margin:6px 0 0; padding-left:1.2em"><li><b>わかる</b>: 自分の点数が、昨年入園した人の中で高い方か低い方か。「園を探す」の各園カードに、地域ごとの分布とあなたの位置を出します。</li><li><b>わかる</b>: 同じ点数の人が多い区分は、ほかの人と並びやすいということ。並んだ場合は、区の同点時の順位で決まります。</li><li><b>わからない</b>: 入れるかどうか。入園は、点数の高い順に、希望した園の空きへ入っていく形で決まるため、人気の園は高い点数が必要になります。点数が分布の上の方でも、希望が人気の園だけなら入れないことがあります。</li><li><b>わからない</b>: 今年の申込者数。令和9年は、申込者数や点数表が変わる可能性があります。</li><li>見方のコツ: 点数が高いほど有利です。第1希望の倍率が低めの園も混ぜて、希望を多めに書くのが基本です(希望園の数の制限は区に確認してください)。</li></ul></details>' + '<details class="dbx" style="margin:6px 0"><summary><b style="display:inline">例: ひまわり保育園(仮)・1歳児</b></summary><div class="dbc"><b>1歳児</b> <small style="display:inline">昨年100人(仮の数字)</small><div class="dbar"><i class="qlo" style="flex:5"></i><i class="qlo" style="flex:5"></i><i class="qlo" style="flex:50"></i><i class="qlo" style="flex:10"></i><i class="qme" style="flex:10"></i><i class="qhi" style="flex:20"></i></div><div>最多は<b>105点</b>(50%)。あなたの107点は<b>真ん中あたり</b></div><div class="lgs"><span class="lg qlo">あなたより低い 70%(青)</span><span class="lg qme">あなたと同じ 10%(緑)</span><span class="lg qhi">あなたより高い 20%(橙)</span></div></div><small>これは仕組みを見せるための仮の例で、実際の園ではありません。<br>実際は、令和8年(2026年)4月に入園した児童の点数の分布(区の公表資料)と、あなたの予想点数(令和9年4月入園の申込み想定)を並べます。</small></details>'],
  ['sched', 'スケジュール', '区の申込みの日程と、やることリスト。締切が近づくと、画面の上にお知らせが出ます。カレンダーにも入れられます。'],
  ['plus', '見学メモ プラス', 'すべての園を並べて比べる、PDF・印刷、夫婦の同期。'],
  ['docs', '提出前チェックと書類リスト', '状況に合わせた必要書類の一覧、出す前の最終チェック、書き写しメモ、勤務先への依頼文。'],
  ['adv', '点数アップのアドバイス', 'まだ使っていない加点や、点数が届きにくいときの別の預け先を提案します。']
];
function planHtml(){
  var P = [
    ['month', '毎月プラン', '¥490', '/ 月', '毎月自動更新・いつでも解約', '', PAYLINK_M]
  ];
  var cur = P.filter(function(x){ return x[0] === sel; })[0];
  var own = unlockActive(), exp = unlockUntil() && !own;
  var h = '<div class="plans">';
  P.forEach(function(x){
    h += '<button type="button" class="plan' + (x[0] === sel ? ' on' : '') + '" data-plan="' + x[0] + '" aria-pressed="' + (x[0] === sel) + '">' + (x[5] ? '<span class="pb">' + x[5] + '</span>' : '') + '<span class="pn">' + x[1] + '</span><span class="pp"><b>' + x[2] + '</b> ' + x[3] + '</span><span class="ps">' + x[4] + '</span></button>';
  });
  h += '</div>';
  h += '<div class="hint" style="text-align:center; margin:10px 0 6px"><a href="#" data-restore="1">購入を復元(購入コードを入れる)</a></div><div data-restorebox hidden>' + buyHtml(true) + '</div>';
  h += '<p class="hint" style="text-align:center; margin:6px 0">' + legalLinks() + '</p>';
  var notes = ['有料プランは、毎月自動的に更新されます。', 'お支払いは、カード(Stripe)で行います。カード番号は、運営者には届きません。', (API_URL ? '解約は、このページの「解約・支払い方法の変更」からできます。次の更新から、請求されなくなります。' : '解約したいときは、設定の「お問い合わせ」のメールで連絡してください。次の更新から、請求されなくなります。'), '日割りの返金はできません。'];
  h += '<ul class="hint" style="padding-left:1.2em; margin:6px 0 12px; display:grid; gap:4px">' + notes.map(function(n){ return '<li>' + n + '</li>'; }).join('') + '</ul>';
  if(API_URL && unlockTok()){
    h += '<div class="hint" style="margin:10px 0"><b>あなたの購入コード</b>(別の端末や、夫婦で使うときに入れます)<br><span style="font-size:18px; letter-spacing:.08em; font-weight:700; user-select:all">' + esc(unlockTok().replace(/(.{4})/g, '$1-').replace(/-$/, '')) + '</span></div><button type="button" data-portal="1" style="width:100%; margin-bottom:10px">解約・支払い方法の変更</button><div class="hint" data-pm role="status"></div>';
  }
  if(exp && !TRIAL) h += '<p class="hint" style="color:var(--minus); text-align:center"><b>有効期限(' + esc(unlockUntil()) + ')が過ぎました。</b>更新のコードを入れてください。</p>';
  if(TRIAL) h += '<button type="button" class="buy" disabled>いまは無料(お試し中)</button><p class="hint" style="text-align:center">有料になるときは、先にお知らせします。</p>';
  else if(own) h += '<button type="button" class="buy" disabled>使えます(' + esc(unlockUntil()) + 'まで)</button><p class="hint" style="text-align:center">' + (API_URL ? '毎月、自動で更新されます。' : '更新のコードは、期限の前にお知らせします。') + '</p>';
  else if(cur[6]) h += '<a class="buy" href="' + esc(cur[6]) + '" target="_blank" rel="noopener">このプランで始める</a>';
  else h += '<button type="button" class="buy" disabled>購入の受付は、準備中です</button>';
  return h;
}
function renderPaid(){
  var own = unlockActive(), st = TRIAL ? 'お試し中' : (own ? '使えます' : '有料');
  var h = '<section class="panel"><h2>' + CR + ' 課金でできること</h2><p class="hint" style="margin:0">王冠のマークが付いた機能が、有料版の機能です。毎月、区の最新の情報に更新しています。' + (TRIAL ? '<b>いまは、お試しで全員が無料で使えます。</b>' : '') + '</p>';
  PAID.forEach(function(x){
    h += '<div class="ev"><div class="d">' + CR + ' ' + esc(x[1]) + ' <span class="badge" style="font-size:12px; font-weight:700; background:var(--pop-soft); color:var(--minus); border-radius:999px; padding:1px 10px">' + st + '</span></div><div class="n">' + esc(x[2]) + '</div>' + (x[3] || '') + '<button type="button" data-p="' + x[0] + '" style="width:max-content; min-height:40px; padding:0 18px; margin-top:4px">開く</button></div>';
  });
  h += '<p class="hint" style="margin:10px 0 0">無料のまま使えるもの: 点数シミュレーター、園を探す、園を比べる、見学メモ、園を比べる(1園まで)。</p></section>';
  h += '<section class="panel"><h2>' + CR + ' 料金プラン</h2>' + planHtml() + '</section>';
  viewP.innerHTML = h;
}
function showPaid(){
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = true; viewD.hidden = true; viewP.hidden = false; tbD.setAttribute('aria-selected', 'false'); viewS.hidden = true; tbS.setAttribute('aria-selected', 'false');
  TABIDS.forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); });
  tbP.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  renderPaid(); window.scrollTo(0, 0);
}
tbP.addEventListener('click', showPaid);
Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(b){ if(b !== tbP) b.addEventListener('click', hidePaid); });
viewP.addEventListener('click', function(e){
  if(e.target.getAttribute && e.target.getAttribute('data-portal')){
    var pm = viewP.querySelector('[data-pm]'); pm.textContent = '開いています…';
    fetch(API_URL + '/portal?token=' + encodeURIComponent(unlockTok())).then(function(r){ return r.json(); }).then(function(j){ if(j.url){ pm.textContent = ''; window.open(j.url, '_blank', 'noopener'); } else pm.textContent = '開けませんでした。お問い合わせのメールでご連絡ください。'; }).catch(function(){ pm.textContent = '通信できませんでした。'; });
    return;
  }
  var pl = e.target.closest && e.target.closest('[data-plan]');
  if(pl){ sel = pl.getAttribute('data-plan'); renderPaid(); return; }
  if(e.target.getAttribute && e.target.getAttribute('data-restore')){ e.preventDefault(); var rb = viewP.querySelector('[data-restorebox]'); rb.hidden = !rb.hidden; return; }
  var k = e.target.getAttribute && e.target.getAttribute('data-p');
  if(!k) return;
  if(k === 'sched') showSched();
  else if(k === 'docs') showDocs();
  else if(k === 'dist'){ $('tabFind').click(); }
  else if(k === 'adv'){ $('tabIndex').click(); setTimeout(function(){ var t = $('advPanel'); if(t) t.scrollIntoView(); }, 150); }
  else if(k === 'watch' || k === 'ease'){ $('tabVisit').click(); setTimeout(function(){ var d = $(k === 'watch' ? 'hkD7' : 'hkD6'); if(d){ d.open = true; d.scrollIntoView(); } }, 150); }
  else if(k === 'cmp3'){ $('tabCmp').click(); }
  else { $('tabVisit').click(); setTimeout(function(){ var d = k === 'wish' ? $('hkD6') : null; if(d) d.open = true; var t = $(k === 'plus' ? 'hkPlus' : 'hkD6'); if(t) t.scrollIntoView(); }, 120); }
});

/* ===== パスコードロック ===== */
var LK_KEY = 'hoikatsu-lock-v1';
function lkGet(){ var o = lsGet(LK_KEY, null); return (o && o.salt && o.hash) ? o : null; }
function lkHash(salt, code){ return sha256hex(salt + ':' + code); }
function lkSalt(){ var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.prototype.map.call(a, function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); }
var lockEl = null, lastHidden = 0;
function showLock(){
  if(!lkGet() || lockEl) return;
  lockEl = document.createElement('div'); lockEl.id = 'hkLock';
  lockEl.setAttribute('style', 'position:fixed; inset:0; z-index:99999; background:var(--bg,#eef8fb); color:var(--text,inherit); display:grid; place-items:center; padding:24px');
  lockEl.innerHTML = '<div style="width:100%; max-width:340px; text-align:center"><div style="font-size:44px">🔒</div><h2 style="margin:8px 0 4px; justify-content:center">パスコードを入れてください</h2><p class="hint" style="margin:0 0 14px">保活アプリ</p>'
    + '<input type="password" inputmode="numeric" autocomplete="off" id="hkLkIn" aria-label="パスコード" style="width:100%; text-align:center; font-size:24px; letter-spacing:.3em">'
    + '<button type="button" class="primary" id="hkLkGo" style="width:100%; margin-top:12px">開く</button><div class="hint" id="hkLkMsg" role="status" style="min-height:1.6em"></div>'
    + '<details style="margin-top:14px"><summary class="hint" style="cursor:pointer">パスコードを忘れたとき</summary><p class="hint">忘れたときは、このアプリの記録をすべて消して、最初からにするしかありません(見学メモ、写真、チェックなど)。</p><button type="button" id="hkLkReset" style="width:100%">記録をすべて消して、ロックを外す</button></details></div>';
  document.body.appendChild(lockEl);
  var inp = lockEl.querySelector('#hkLkIn'), msg = lockEl.querySelector('#hkLkMsg'), tries = 0;
  function tryOpen(){
    var o = lkGet(); if(!o){ lockEl.remove(); lockEl = null; return; }
    lkHash(o.salt, inp.value).then(function(h){
      if(h === o.hash){ lockEl.remove(); lockEl = null; }
      else { tries++; msg.textContent = 'パスコードが合いません。'; inp.value = ''; }
    });
  }
  lockEl.querySelector('#hkLkGo').addEventListener('click', tryOpen);
  inp.addEventListener('keydown', function(e){ if(e.key === 'Enter') tryOpen(); });
  lockEl.querySelector('#hkLkReset').addEventListener('click', function(){
    var b = this;
    if(!b.getAttribute('data-ok')){ b.setAttribute('data-ok', '1'); b.textContent = 'もう一度押すと、本当に消えます'; return; }
    try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('hoikatsu') === 0) localStorage.removeItem(k); }); }catch(e){}
    try{ indexedDB.deleteDatabase('hoikatsu-photos'); }catch(e){}
    setTimeout(function(){ location.reload(); }, 300);
  });
  setTimeout(function(){ inp.focus(); }, 50);
}
document.addEventListener('visibilitychange', function(){
  if(document.hidden) lastHidden = Date.now();
  else if(lkGet() && lastHidden && Date.now() - lastHidden > 60000) showLock();
});
showLock();

/* ===== 設定 ===== */
var CONTACT = 'ponta04151207@gmail.com', APP_URL = 'https://ponta04151207-eng.github.io/hoikatsu-app/';
var tbS = document.createElement('button');
tbS.type = 'button'; tbS.id = 'tabSet'; tbS.setAttribute('role', 'tab'); tbS.setAttribute('aria-selected', 'false');
tbS.innerHTML = '<span class="ti">⚙️</span><span>設定</span>';
tabs.appendChild(tbS);
$('tabFind').style.gridColumn = 'span 4'; $('tabCmp').style.gridColumn = 'span 4'; $('tabVisit').style.gridColumn = 'span 4';
$('tabAbout').style.gridColumn = 'span 6'; tbS.style.gridColumn = 'span 6';
var viewS = document.createElement('div'); viewS.id = 'viewSet'; viewS.hidden = true;
view.parentNode.insertBefore(viewS, view);
function lastUpd(){ return (window.SHISUU_NOW && window.SHISUU_NOW.checkedOn) || '―'; }
var FAQ = [
  ['入力した内容は、どこに保存されますか?', 'お使いのスマホのブラウザの中だけです。運営者のサーバーには送られません。ブラウザのデータを消したり、端末を変えたりすると、消えます。大切な記録は、PDFなどで控えてください。'],
  ['夫婦でメモをそろえられますか?', '「見学メモ プラス」の「夫婦で同期する」で、部屋を作り、LINEで相手に送ります。相手がリンクをタップして参加すると、2人の見学メモ・質問・希望園・書類・予定のチェックが自動でそろいます。写真は同期されません。同期をオンにすると内容がサーバーに置かれます(くわしくはプライバシーの案内)。使わないなら、LINEなどで1回だけ送る方法もあります。'],
  ['表示される点数や倍率は、正しいですか?', '区が公表した資料をもとにした目安です。実際の点数、日程、必要書類は、区の資料で決まります。申込みの前に、必ず区の資料で確認してください。'],
  ['情報は、新しいですか? いつ更新されますか?', '毎月、新しい情報に更新しています。園の空き数は、毎月1日と15日の朝に、区のページから自動で取り込みます。日程や必要書類などは、区が発表したときに、見直して直します。区の更新が古いときは、赤い印が出ます。それぞれの画面に、出典と確認日を載せています。'],
  ['有料の機能は、どうなりますか?', 'いまは、お試しで全員が無料です。有料になるときは、先にお知らせします。料金の予定は、「課金でできること」で見られます。'],
  ['ほかの区でも使えますか?', 'いまは、世田谷区だけです。ほかの区は、あとで対応する予定です。']
];
function renderSet(){
  var row = function(id, t, extra){ return '<button type="button" class="srow" data-s="' + id + '"><span>' + t + '</span><span aria-hidden="true">›</span></button>'; };
  var h = '<section class="panel"><h2>設定</h2><div class="slist">'
    + row('faq', 'よくある質問') + '<div id="hkFaq" hidden>' + FAQ.map(function(q){ return '<details class="faq"><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') + '</div>'
    + row('share', 'このアプリを友達に教える')
    + row('mail', 'お問い合わせ')
    + row('code', '購入コードを入れる・課金でできること<small style="display:block; font-size:11px; font-weight:500; color:var(--muted); line-height:1.4; margin-top:2px">購入コード: 有料プランを買ったことを知らせる合言葉です。</small>')
    + row('lock', 'パスコードロック(' + (lkGet() ? 'オン' : 'オフ') + ')') + '<div id="hkLockBox" hidden></div>'
    + row('privacy', 'プライバシーポリシー')
    + row('terms', '利用規約')
    + row('tokusho', '特定商取引法に基づく表記')
    + '</div><div id="hkSm" class="hint" role="status"></div><p class="hint" style="margin-top:14px">🔄 毎月、新しい情報に更新しています(空き数: 毎月1日・15日 / 最後の更新: ' + esc(lastUpd()) + ')。</p><p class="hint">運営: ハリケア / お問い合わせ: ' + esc(CONTACT) + '</p></section>';
  viewS.innerHTML = h;
}
function showSet(){
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = true; viewD.hidden = true; viewP.hidden = true; viewS.hidden = false;
  TABIDS.concat(['tabDocs', 'tabPaid']).forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); });
  tbS.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  renderSet(); window.scrollTo(0, 0);
}
tbS.addEventListener('click', showSet);
Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(b){ if(b !== tbS) b.addEventListener('click', function(){ if(b !== tbP) { viewS.hidden = true; tbS.setAttribute('aria-selected', 'false'); } }); });
viewS.addEventListener('click', function(e){
  var b = e.target.closest ? e.target.closest('[data-s]') : null; if(!b) return;
  var k = b.getAttribute('data-s'), m = $('hkSm');
  if(k === 'faq'){ var f = $('hkFaq'); f.hidden = !f.hidden; }
  else if(k === 'share'){
    var txt = '保活アプリ(世田谷区の保育園の申込みを手伝うアプリ)';
    if(navigator.share) navigator.share({title: '保活アプリ', text: txt, url: APP_URL}).catch(function(){});
    else copy(txt + '\n' + APP_URL, function(ok){ m.textContent = ok ? 'アドレスをコピーしました。LINEなどに貼り付けてください。' : APP_URL; });
  }
  else if(k === 'mail') location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('保活アプリについて');
  else if(k === 'code') showPaid();
  else if(k === 'lock'){
    var bx = $('hkLockBox'); bx.hidden = !bx.hidden; if(bx.hidden) return;
    var on = !!lkGet();
    bx.innerHTML = '<div style="padding:10px 6px">' + (on
      ? '<p class="hint" style="margin:0 0 8px">ロックは、オンです。アプリを開いたときと、1分以上はなれて戻ったときに、パスコードを聞きます。</p><input type="password" inputmode="numeric" id="hkLk0" aria-label="いまのパスコード" placeholder="いまのパスコード" style="width:100%"><button type="button" id="hkLkOff" style="width:100%; margin-top:8px">ロックをオフにする</button>'
      : '<p class="hint" style="margin:0 0 8px">4〜8けたの数字を決めてください。見学メモなどの画面を、他の人に見られないようにします。</p><input type="password" inputmode="numeric" id="hkLk1" aria-label="パスコード" placeholder="パスコード(4〜8けた)" style="width:100%"><input type="password" inputmode="numeric" id="hkLk2" aria-label="もう一度" placeholder="もう一度" style="width:100%; margin-top:8px"><button type="button" class="primary" id="hkLkOn" style="width:100%; margin-top:8px">ロックをオンにする</button><p class="hint" style="margin-top:8px"><b>忘れると、記録を消さないと開けません。</b>これは画面を隠す鍵で、データを暗号にするものではありません。</p>')
      + '</div>';
  }
  else window.open(k + '.html', '_blank', 'noopener');
});
viewS.addEventListener('click', function(e){
  var id = e.target.id, m = $('hkSm');
  if(id === 'hkLkOn'){
    var a = $('hkLk1').value, b = $('hkLk2').value;
    if(!/^[0-9]{4,8}$/.test(a)){ m.textContent = '数字を4〜8けたで入れてください。'; return; }
    if(a !== b){ m.textContent = '2回の数字が合いません。'; return; }
    var salt = lkSalt(); lkHash(salt, a).then(function(h){ lsSet(LK_KEY, {salt: salt, hash: h}); m.textContent = 'ロックをオンにしました。'; renderSet(); });
  } else if(id === 'hkLkOff'){
    var o = lkGet(); if(!o) return;
    lkHash(o.salt, $('hkLk0').value).then(function(h){ if(h === o.hash){ try{ localStorage.removeItem(LK_KEY); }catch(e){} m.textContent = 'ロックをオフにしました。'; renderSet(); } else m.textContent = 'パスコードが合いません。'; });
  }
});

/* ===== 購入の確認サーバーとのやりとり(API_URLが入っているときだけ) ===== */
if(API_URL){
  var q = location.search.match(/[?&]paid=(cs_[A-Za-z0-9_]+)/);
  if(q){
    fetch(API_URL + '/claim?session=' + encodeURIComponent(q[1])).then(function(r){ return r.json(); }).then(function(j){
      if(!j.token) throw 0;
      return fetch(API_URL + '/status?token=' + j.token).then(function(r){ return r.json(); }).then(function(st){ lsSet(UL_KEY, {until: st.until, tok: j.token}); });
    }).then(function(){ try{ sessionStorage.setItem('hk-show-paid', '1'); }catch(e){} location.replace(location.pathname); })
    .catch(function(){ history.replaceState(null, '', location.pathname); alert_('購入の確認ができませんでした。時間をおいて、もう一度開いてください。それでもだめなときは、設定のお問い合わせへ。'); });
  } else if(unlockTok()){
    fetch(API_URL + '/status?token=' + unlockTok()).then(function(r){ return r.json(); }).then(function(st){
      if(st && st.until !== undefined){
        var was = PREMIUM, o = lsGet(UL_KEY, {}); o.until = st.active ? st.until : (st.until || o.until);
        lsSet(UL_KEY, o);
        if(!TRIAL && was !== unlockActive()){ location.reload(); }
      }
    }).catch(function(){});
  }
  try{ if(sessionStorage.getItem('hk-show-paid') === '1'){ sessionStorage.removeItem('hk-show-paid'); setTimeout(showPaid, 50); } }catch(e){}
}
function alert_(t){ var b = document.createElement('div'); b.className = 'hkb on'; b.innerHTML = '<span class="t">' + esc(t) + '</span>'; tabs.parentNode.insertBefore(b, tabs); }

/* ===== 園を探す: 園の画像(自分の写真 / イラスト / 地図) ===== */
var photoLookup; /* 見学の写真を探す関数(有料の機能の中で入る) */
var FIMG = '<svg viewBox="0 0 72 56" width="72" height="56" aria-hidden="true"><rect width="72" height="56" rx="12" fill="#e6f4f1"/><circle cx="58" cy="12" r="6" fill="#ffd36b"/><path d="M10 28L36 9l26 19z" fill="#ff8a7a"/><rect x="14" y="28" width="44" height="20" rx="2" fill="#fff6e6"/><rect x="31" y="34" width="10" height="14" rx="2" fill="#2a9d8f"/><rect x="18" y="32" width="8" height="8" rx="1" fill="#bfe3f5"/><rect x="46" y="32" width="8" height="8" rx="1" fill="#bfe3f5"/><circle cx="36" cy="22" r="3" fill="#fff"/></svg>';
function decorateFind(){
  var cards = document.querySelectorAll('#fList .fcard:not([data-img])');
  Array.prototype.forEach.call(cards, function(c){
    c.setAttribute('data-img', '1');
    var nm = (c.querySelector('.fn') || {}).textContent || '', ar = (c.querySelector('.area') || {}).textContent || '';
    var strip = document.createElement('div'); strip.className = 'fimg';
    var q = encodeURIComponent(nm + ' 保育園 世田谷区');
    strip.innerHTML = '<span class="fpic">' + FIMG + '</span><span class="ftx"><small class="fcap">イラスト(見学の写真があると、ここに出ます)</small><a href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">🗺️ 地図・写真を見る(タップ)</a></span>';
    var fs = c.querySelector('.fs'); c.insertBefore(strip, fs);
    if(photoLookup) photoLookup(ar + '|' + nm).then(function(d){
      if(d){ strip.querySelector('.fpic').innerHTML = '<img src="' + d + '" alt="見学の写真" style="width:72px; height:56px; object-fit:cover; border-radius:12px; display:block">'; strip.querySelector('.fcap').textContent = '見学で撮った写真'; }
    });
  });
}
(function(){
  var fl = $('fList'); if(!fl) return;
  new MutationObserver(function(){ decorateFind(); }).observe(fl, {childList: true});
  decorateFind();
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function(b){ b.addEventListener('click', function(){ setTimeout(function(){ Array.prototype.forEach.call(fl.querySelectorAll('.fcard[data-img]'), function(c){ var im = c.querySelector('.fimg'); if(im) im.remove(); c.removeAttribute('data-img'); }); decorateFind(); }, 80); }); });
})();

/* ===== 預け先を探す(病児・病後児保育 / 認可外保育施設) ===== */
var AZ = window.AZUKE || null, IC = window.ICHIJI || null;
var tbAz = document.createElement('button');
tbAz.type = 'button'; tbAz.id = 'tabAzuke'; tbAz.className = 'hero'; tbAz.setAttribute('role', 'tab'); tbAz.setAttribute('aria-selected', 'false');
tbAz.style.gridColumn = 'span 6';
tbAz.innerHTML = '<span class="ti">🍼</span><span>預け先を探す<small style="display:block; font-size:11px; font-weight:500; line-height:1.2">(病児・一時・認可外)</small></span>';
tabs.insertBefore(tbAz, $('tabAbout'));
$('tabAbout').style.gridColumn = 'span 3'; tbS.style.gridColumn = 'span 3';
var viewAz = document.createElement('div'); viewAz.id = 'viewAzuke'; viewAz.hidden = true;
view.parentNode.insertBefore(viewAz, view);
var azMode = 'byoji', azShown = 20, azF = {q: '', cat: '', night: false, all24: false, sort: 'name'}, azB = {area: '', sat: false}, azI = {area: '', cat: ''};
function endMin(h){ if(/^0:00〜0:00$/.test(h)) return 1440; var m = h.match(/〜(翌)?(\d{1,2}):(\d{2})/); if(!m) return 0; var e = (+m[2]) * 60 + (+m[3]); if(m[1]) e += 1440; return e; }
function mapA(name, addr){ return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('世田谷区' + addr + ' ' + name); }
function telA(t){ return '<a href="tel:' + esc(t.replace(/[^0-9]/g, '')) + '">' + esc(t) + '</a>'; }
function azCard(o){
  return '<article class="azc"><div class="azn">' + esc(o.name) + '</div>' + (o.chip ? '<div style="margin:4px 0 6px"><span class="area" style="font-size:12px; padding:1px 9px">' + esc(o.chip) + '</span></div>' : '')
    + '<div class="azl">' + o.lines.map(function(l){ return '<div>' + l + '</div>'; }).join('') + '</div>'
    + '<div style="margin-top:8px"><a class="btnlike" href="' + mapA(o.name, o.addr) + '" target="_blank" rel="noopener" style="margin:0; padding:5px 14px">🗺️ 地図を見る</a></div></article>';
}

var GEO_KEY = 'hoikatsu-geo-v1', azGeo = lsGet(GEO_KEY, {}), azO = null, azAddrText = '', azSt = '', azBusy = false;
var ADDRS = window.SHISUU_ADDR ? window.SHISUU_ADDR.rows : [], addrMap = {};
ADDRS.forEach(function(r){ addrMap[r[0] + '|' + r[1]] = r; });
function azStSet(t){ azSt = t; Array.prototype.forEach.call(document.querySelectorAll('.azst'), function(e){ e.textContent = t; }); }
function azHav(a, b){ var R = 6371, rad = Math.PI / 180, dl = (b[0] - a[0]) * rad, dn = (b[1] - a[1]) * rad, x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
function azDist(addr){ var g = azGeo[addr]; return (azO && g) ? azHav(azO.p, g) : null; }
function azByDist(a, b){ return (a.dist === null ? 1e9 : a.dist) - (b.dist === null ? 1e9 : b.dist); }
function azFmt(d){ var t = d < 0.1 ? '100m以内' : d < 1 ? '約' + Math.round(d * 10) * 100 + 'm' : '約' + d.toFixed(1) + 'km'; return '直線で' + t + '(徒歩の目安 約' + Math.max(1, Math.round(d * 1.25 * 1000 / 80)) + '分)'; }
function azDLine(d){ if(d === null || d === undefined) return azO ? ['📏 位置を調べられませんでした'] : []; return ['📏 <b>' + azFmt(d) + '</b>']; }
function azNearBox(){
  return '<div class="aznear" style="margin-top:10px"><div style="display:flex; gap:6px"><input class="azaddr" type="search" placeholder="住所(例: 桜新町1-1-1)" value="' + esc(azAddrText) + '" autocomplete="street-address" style="flex:1; min-width:0; min-height:44px"><button type="button" class="primary" data-aznear="go" style="min-height:44px; padding:0 12px; font-size:14px; white-space:nowrap; border-radius:14px">近い順</button></div>'
    + '<div style="display:flex; gap:6px; margin-top:6px"><button type="button" data-aznear="gps" style="flex:1; min-height:40px; padding:0 8px; font-size:14px; white-space:nowrap; border-radius:14px">📍 いまいる場所から</button>' + (azO ? '<button type="button" data-aznear="off" style="min-height:40px; padding:0 12px; font-size:14px; white-space:nowrap; border-radius:14px">解除</button>' : '') + '</div>'
    + '<div class="hint azst" role="status" style="margin:6px 0 0">' + esc(azSt || (azO ? '' : '住所を入れると、近い順に並びます。')) + '</div>'
    + '<div class="hint" style="font-size:11.5px; margin:4px 0 0">入力した住所は、場所を調べるために、国土地理院の地図検索に送られます。保存はしません。距離は、直線の目安です。</div></div>';
}
function azNorm(t){
  t = t.trim().replace(/[０-９]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/[−－‐―]/g, '-').replace(/\s+/g, '');
  if(!/[区市]/.test(t)) t = '世田谷区' + t;
  if(t.indexOf('東京都') !== 0) t = '東京都' + t;
  return t;
}
function gsi(q){
  return fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q)).then(function(r){ if(!r.ok) throw new Error('x'); return r.json(); }).then(function(a){
    var f = a && a[0]; if(!f || !f.geometry || !f.geometry.coordinates) return null; var c = f.geometry.coordinates; return [c[1], c[0]];
  });
}
function azAllAddrs(){
  var list = [];
  if(AZ){ AZ.byoji.rows.forEach(function(r){ list.push(r[3]); }); AZ.ninkagai.rows.forEach(function(r){ list.push(r[3]); }); }
  ADDRS.forEach(function(r){ list.push(r[2]); });
  if(IC) IC.rows.forEach(function(r){ list.push(r[3]); });
  return list;
}
function azGeoAll(done){
  var list = [], seen = {};
  azAllAddrs().forEach(function(a){ if(a && !seen[a] && azGeo[a] === undefined){ seen[a] = 1; list.push(a); } });
  var total = list.length, i = 0, fin = 0, errs = 0, stop = false;
  if(!total){ done(true); return; }
  function next(){
    if(stop) return;
    if(i >= total){ if(fin >= total){ lsSet(GEO_KEY, azGeo); done(true); } return; }
    var a = list[i++];
    gsi('東京都世田谷区' + a.split(/\s+/)[0]).then(function(g){ azGeo[a] = g || 0; }, function(){ errs++; if(errs >= 4 && !stop){ stop = true; lsSet(GEO_KEY, azGeo); done(false); } })
      .then(function(){ fin++; if(!stop){ azStSet('施設の場所を調べています…(' + fin + '/' + total + ')。1回だけで、次からは早くなります。'); next(); } });
  }
  for(var k = 0; k < 5; k++) next();
}
/* 認可保育園(園を探す)から使う */
window.HKNEAR = {
  tel: function(f){ var r = addrMap[f[0] + '|' + f[1]]; return r && r[3] ? r[3] : ''; },
  dist: function(f){ var r = addrMap[f[0] + '|' + f[1]]; return r ? azDist(r[2]) : null; },
  line: function(f){ var d = window.HKNEAR.dist(f), r = addrMap[f[0] + '|' + f[1]]; if(!azO) return r ? '<div class="n" style="margin:4px 0 0; font-size:13px">📍 ' + esc(r[2]) + '</div>' : ''; return '<div class="n" style="margin:4px 0 0; font-size:13px">' + (r ? '📍 ' + esc(r[2]) + ' ・ ' : '') + (d === null ? '📏 位置を調べられませんでした' : '📏 <b>' + azFmt(d) + '</b>') + '</div>'; }
};
var fnBox = null;
function fnRender(){ if(fnBox) fnBox.innerHTML = azNearBox(); }
(function(){
  var intro = $('fIntro'); if(!intro) return;
  fnBox = document.createElement('div'); fnBox.id = 'hkFnear'; intro.parentNode.insertBefore(fnBox, intro.nextSibling);
  fnRender();
  var opt = $('fSort').querySelector('option[value="near"]');
})();
function azRefreshAll(){
  fnRender();
  if(!viewAz.hidden) renderAz();
  var o = $('fSort') && $('fSort').querySelector('option[value="near"]'); if(o) o.textContent = azO ? '近い順' : '近い順(住所を入れてください)';
  if(HK.renderFind) HK.renderFind();
}
function azApply(label, p){
  azO = {label: label, p: p}; azF.sort = 'near'; azShown = 20; if(HK.setSort) HK.setSort('near');
  azStSet('施設の場所を調べています…');
  azGeoAll(function(ok){
    azBusy = false;
    azSt = ok ? '「' + label + '」から近い順に並べています。' : '場所を調べられませんでした。電波のよいところで、もう一度どうぞ。';
    azRefreshAll();
  });
}
function azNearInput(e){ if(e.target.classList && e.target.classList.contains('azaddr')){ azAddrText = e.target.value; Array.prototype.forEach.call(document.querySelectorAll('.azaddr'), function(x){ if(x !== e.target) x.value = azAddrText; }); } }
function azNearClick(e){
  var b = e.target.closest ? e.target.closest('[data-aznear]') : null; if(!b || azBusy) return;
  var k = b.getAttribute('data-aznear'), box = b.closest('.aznear');
  if(k === 'off'){ azO = null; azSt = ''; if(azF.sort === 'near') azF.sort = 'name'; if(HK.setSort) HK.setSort('r2asc'); azRefreshAll(); }
  else if(k === 'go'){
    var t = ((box.querySelector('.azaddr') || {}).value || '').trim(); azAddrText = t;
    if(!t){ azStSet('住所を入れてください。'); return; }
    azBusy = true; azStSet('住所を調べています…');
    gsi(azNorm(t)).then(function(g){
      if(!g){ azBusy = false; azStSet('この住所が見つかりませんでした。町名と番地(例: 桜新町1-1-1)で入れてみてください。'); return; }
      azApply(t, g);
    }).catch(function(){ azBusy = false; azStSet('通信できませんでした。電波のよいところで、もう一度どうぞ。'); });
  }
  else if(k === 'gps'){
    if(!navigator.geolocation){ azStSet('このスマホでは、現在地を使えません。住所を入れてください。'); return; }
    azBusy = true; azStSet('現在地を調べています…(許可の画面が出たら「許可」を押してください)');
    navigator.geolocation.getCurrentPosition(function(pos){ azApply('いまいる場所', [pos.coords.latitude, pos.coords.longitude]); }, function(){ azBusy = false; azStSet('現在地を取れませんでした。住所を入れてください。'); }, {timeout: 12000, maximumAge: 60000});
  }
}
viewAz.addEventListener('input', azNearInput); viewAz.addEventListener('click', azNearClick);
if(fnBox){ fnBox.addEventListener('input', azNearInput); fnBox.addEventListener('click', azNearClick); }
function renderAz(){
  if(!AZ){ viewAz.innerHTML = '<section class="panel"><h2>🍼 預け先を探す</h2><p class="hint">データを読み込めませんでした。</p></section>'; return; }
  var h = '<section class="panel"><h2>🍼 預け先を探す</h2><p class="hint" style="margin:0 0 8px">認可保育園とは別に、病児・病後児保育、一時預かり、認可外保育施設を探せます。区の公表資料をもとにしています。</p>'
    + '<div style="display:flex; gap:6px"><button type="button" data-azm="byoji" class="' + (azMode === 'byoji' ? 'primary' : '') + '" style="flex:1; min-height:40px; padding:0 8px; font-size:14px; white-space:nowrap; border-radius:14px">🤒 病児・病後児</button><button type="button" data-azm="ichiji" class="' + (azMode === 'ichiji' ? 'primary' : '') + '" style="flex:1; min-height:40px; padding:0 8px; font-size:14px; white-space:nowrap; border-radius:14px">🧸 一時預かり</button><button type="button" data-azm="ninkagai" class="' + (azMode === 'ninkagai' ? 'primary' : '') + '" style="flex:1; min-height:40px; padding:0 8px; font-size:14px; white-space:nowrap; border-radius:14px">🏠 認可外</button></div>' + azNearBox() + '</section>';
  if(azMode === 'byoji'){
    var d = AZ.byoji, rows = d.rows.map(function(r){ return {name: r[0], kind: r[1], area: r[2], addr: r[3], tel: r[4], cap: r[5], hours: r[6], pay: r[7]}; })
      .filter(function(r){ return (!azB.area || r.area === azB.area) && (!azB.sat || r.hours.indexOf('土') >= 0); });
    rows.forEach(function(r){ r.dist = azDist(r.addr); });
    if(azO) rows.sort(azByDist);
    h += '<section class="panel"><h2>病児・病後児保育(' + rows.length + '施設)</h2>'
      + '<div class="hint" style="margin:0 0 8px"><b>使える人</b>: 世田谷区に住んでいて、保育認定(2号・3号)を受けて、区の指定の保育施設に通っている、生後5か月から就学前のお子さん。<br><b>料金</b>: 1人1日2,000円(生活保護世帯などは免除。申請が必要)。</div>'
      + '<details class="faq"><summary>使い方の流れ(区の案内から)</summary><p>① 区(保育課)に、利用の登録をします(電子申請か、郵送・持参)。② 7けたの登録番号が届きます(予約に必要。卒園まで有効)。③ 前日か当日に、施設に予約します(満員のときはキャンセル待ち)。④ 初日の前日か当日に、施設が指定する病院で受診します。⑤ 利用票などを出して、入室します。原則、18時までにお迎えです。同じ病気で続けて使えるのは、原則7日間までです。</p></details>'
      + '<details class="faq"><summary>使えないとき・持ち物</summary><p>新型コロナ、麻しん(はしか)、結核のとき、点滴などの処置が必要な重い症状のとき、1歳を過ぎてMR(麻しん風しん)ワクチンを受けていないときは、使えません。持ち物は、乳幼児医療証、母子健康手帳、お薬手帳、処方薬(1回分ずつ記名)、着替え3組以上、紙おむつ7枚以上など。すべてに名前を書きます。くわしくは、区の案内で確認してください。</p></details>'
      + '<div style="display:flex; gap:8px; margin:10px 0"><select id="hkAzArea" aria-label="地域" style="flex:1"><option value="">全地域</option>' + ['世田谷', '北沢', '玉川', '砧', '烏山'].map(function(a){ return '<option' + (azB.area === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select><label style="display:flex; align-items:center; gap:6px; flex:1; font-size:14px"><input type="checkbox" id="hkAzSat"' + (azB.sat ? ' checked' : '') + ' style="width:22px; height:22px">土曜もやっている</label></div>';
    rows.forEach(function(r){ h += azCard({name: r.name, chip: r.area + ' / ' + r.kind, addr: r.addr, lines: [].concat(azDLine(r.dist), ['📍 ' + esc(r.addr), '📞 ' + telA(r.tel), '👶 定員 ' + esc(r.cap) + '名(1日)', '🕗 ' + esc(r.hours), '💴 支払い: ' + esc(r.pay)])}); });
    if(!rows.length) h += '<p class="hint">条件に合う施設はありません。</p>';
    h += '<p class="hint">出典: <a href="' + d.url + '" target="_blank" rel="noopener">' + esc(d.src) + '</a>(確認日 ' + esc(d.checked) + ')。時間や定員は変わることがあります。電話で確認してください。区の登録制度の対象は、区の資料にある施設です。</p></section>';
  } else if(azMode === 'ichiji'){
    var ic = IC, irows = ic ? ic.rows.map(function(r){ return {area: r[0], name: r[1], cat: r[2], addr: r[3], tel: r[4], age: r[5], note: r[6], dist: azDist(r[3])}; }) : [];
    irows = irows.filter(function(r){ return (!azI.area || r.area === azI.area) && (!azI.cat || r.cat === azI.cat); });
    if(azO) irows.sort(azByDist);
    h += '<section class="panel"><h2>一時預かり(' + irows.length + '施設)</h2>'
      + '<div class="hint" style="margin:0 0 8px"><b>一時預かりとは</b>: 保育園などに通っていないお子さんを、数時間〜1日、預けられる制度です。用事、通院、リフレッシュなどに使えます。<br><b>使い方</b>: どの施設も、空きがあるときだけ使えます。予約と空きの確認は、施設へ電話します。</div>'
      + '<div style="display:flex; gap:8px; margin:10px 0"><select id="hkIcArea" aria-label="地域" style="flex:1"><option value="">全地域</option>' + ['世田谷', '北沢', '玉川', '砧', '烏山'].map(function(a){ return '<option' + (azI.area === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select><select id="hkIcCat" aria-label="種類" style="flex:1"><option value="">全部の種類</option>' + ['私立保育園・こども園', '一時保育専用施設', '認証保育所', '企業主導型保育', '保育室'].map(function(c){ return '<option' + (azI.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>';
    irows.forEach(function(r){ h += azCard({name: r.name, chip: r.area + ' / ' + r.cat, addr: r.addr, lines: [].concat(azDLine(r.dist), ['📍 ' + esc(r.addr), '📞 ' + telA(r.tel), '👶 対象 ' + esc(r.age), 'ℹ️ ' + esc(r.note)])}); });
    if(!irows.length) h += '<p class="hint">条件に合う施設はありません。</p>';
    h += '<p class="hint">区立保育園の一時保育は、定員に空きのある園だけで実施され、この一覧には入れていません。<a href="https://www.city.setagaya.lg.jp/02243/1540.html" target="_blank" rel="noopener">区のページ</a>で確認するか、お住まいの地域の総合支所(子ども家庭支援課)に問い合わせてください。休止中と区が書いている施設は、入れていません。</p>'
      + '<p class="hint">出典: ' + (ic ? ic.urls.map(function(u){ return '<a href="' + u[1] + '" target="_blank" rel="noopener">' + esc(u[0]) + '</a>'; }).join(' / ') : '') + '(区の公表資料、確認日 ' + (ic ? esc(ic.checked) : '') + ')。料金や定員、休止は変わることがあります。電話で確認してください。</p></section>';
  } else {
    var n = AZ.ninkagai, all = n.rows.map(function(r){ return {no: r[0], name: r[1], cat: r[2], addr: r[3], tel: r[4], cap: r[5], hours: r[6], op: r[7], end: endMin(r[6]), dist: azDist(r[3])}; });
    var q = azF.q.trim().toLowerCase();
    var rows2 = all.filter(function(r){
      return (!azF.cat || r.cat === azF.cat) && (!azF.night || r.end >= 1200) && (!azF.all24 || r.end >= 1440)
        && (!q || (r.name + ' ' + r.addr + ' ' + r.op).toLowerCase().indexOf(q) >= 0);
    });
    if(azF.sort === 'cap') rows2.sort(function(a, b){ return (parseInt(b.cap, 10) || 0) - (parseInt(a.cap, 10) || 0); });
    else if(azF.sort === 'near' && azO) rows2.sort(azByDist);
    else if(azF.sort === 'late') rows2.sort(function(a, b){ return b.end - a.end; });
    else rows2.sort(function(a, b){ return a.no - b.no; });
    h += '<section class="panel"><h2>認可外保育施設(' + rows2.length + '/' + all.length + '件)</h2>'
      + '<p class="hint" style="margin:0 0 8px">区に届け出ている認可外保育施設です。区は、ベビーホテル、企業主導型などに分けています。認可保育園と違い、区を通さず、施設と直接、契約します。利用するときの注意や、施設ごとの立入調査の結果は、区のページで見られます。</p>'
      + '<input id="hkAzQ" type="search" placeholder="名前・町名で探す(例: 経堂、インター)" value="' + esc(azF.q) + '" style="width:100%">'
      + '<div style="display:flex; gap:8px; margin:8px 0"><select id="hkAzCat" aria-label="分類" style="flex:1"><option value="">全部の分類</option>' + ['ベビーホテル', '企業主導型', 'その他', 'ほか'].map(function(c){ return '<option value="' + c + '"' + (azF.cat === c ? ' selected' : '') + '>' + (c === 'ほか' ? 'ほか(院内・事業所内など)' : c) + '</option>'; }).join('') + '</select><select id="hkAzSort" aria-label="並び順" style="flex:1"><option value="name"' + (azF.sort === 'name' ? ' selected' : '') + '>区の一覧の順</option><option value="cap"' + (azF.sort === 'cap' ? ' selected' : '') + '>定員が多い順</option><option value="near"' + (azF.sort === 'near' ? ' selected' : '') + '>' + (azO ? '近い順' : '近い順(住所を入れてください)') + '</option><option value="late"' + (azF.sort === 'late' ? ' selected' : '') + '>遅くまでの順</option></select></div>'
      + '<div style="display:flex; gap:14px; flex-wrap:wrap; font-size:14px; margin-bottom:8px"><label style="display:flex; align-items:center; gap:6px"><input type="checkbox" id="hkAzNight"' + (azF.night ? ' checked' : '') + ' style="width:22px; height:22px">20時以降まで</label><label style="display:flex; align-items:center; gap:6px"><input type="checkbox" id="hkAzAll"' + (azF.all24 ? ' checked' : '') + ' style="width:22px; height:22px">24時間・夜通し</label></div>';
    rows2.slice(0, azShown).forEach(function(r){
      var lines = azDLine(r.dist).concat(['📍 ' + esc(r.addr), '📞 ' + telA(r.tel), '👶 定員 ' + esc(r.cap) + (/^\d/.test(r.cap) ? '名' : ''), '🕗 ' + esc(r.hours), '🏢 ' + esc(r.op)]);
      if(r.name.indexOf('病児') >= 0) lines.push('ℹ️ 区の「病児・病後児保育」(登録制)とは別の、認可外の施設です。');
      h += azCard({name: r.name, chip: r.cat === 'ほか' ? '区の一覧で確認' : r.cat, addr: r.addr, lines: lines});
    });
    if(!rows2.length) h += '<p class="hint">条件に合う施設はありません。</p>';
    if(rows2.length > azShown) h += '<button type="button" id="hkAzMore" style="width:100%; margin-top:8px">さらに表示する</button>';
    h += '<p class="hint">出典: <a href="' + n.url + '" target="_blank" rel="noopener">' + esc(n.src) + '</a>(確認日 ' + esc(n.checked) + ')。一覧に載っていることは、おすすめや品質の保証ではありません。見学して、区のページの立入調査の結果なども見てください。 <a href="https://www.city.setagaya.lg.jp/01044/15853.html" target="_blank" rel="noopener">立入調査の結果(区)</a> / <a href="https://www.city.setagaya.lg.jp/02243/10744.html" target="_blank" rel="noopener">ここdeサーチ(区)</a></p></section>';
  }
  viewAz.innerHTML = h;
  var q1 = $('hkAzQ'); if(q1 && document.activeElement !== q1 && azKeep) { q1.focus(); q1.setSelectionRange(q1.value.length, q1.value.length); }
}
var azKeep = false;
function showAz(){
  ['viewIndex', 'viewVisit', 'viewAbout'].forEach(function(id){ $(id).hidden = true; });
  view.hidden = true; viewD.hidden = true; viewP.hidden = true; viewS.hidden = true; viewAz.hidden = false;
  TABIDS.forEach(function(id){ $(id).setAttribute('aria-selected', 'false'); }); [tbD, tbP, tbS].forEach(function(b){ b.setAttribute('aria-selected', 'false'); });
  tbAz.setAttribute('aria-selected', 'true');
  document.querySelector('.bar').hidden = true;
  azKeep = false; renderAz(); window.scrollTo(0, 0);
}
tbAz.addEventListener('click', showAz);
Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(b){ if(b !== tbAz) b.addEventListener('click', function(){ viewAz.hidden = true; tbAz.setAttribute('aria-selected', 'false'); }); });
viewAz.addEventListener('click', function(e){
  var t = e.target, m = t.getAttribute && t.getAttribute('data-azm');
  if(m){ azMode = m; azShown = 20; azKeep = false; renderAz(); }
  else if(t.id === 'hkAzMore'){ azShown += 20; var y = window.scrollY; renderAz(); window.scrollTo(0, y); }
});
viewAz.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'hkAzArea'){ azB.area = t.value; renderAz(); }
  else if(t.id === 'hkIcArea'){ azI.area = t.value; renderAz(); }
  else if(t.id === 'hkIcCat'){ azI.cat = t.value; renderAz(); }
  else if(t.id === 'hkAzSat'){ azB.sat = t.checked; renderAz(); }
  else if(t.id === 'hkAzCat'){ azF.cat = t.value; azShown = 20; renderAz(); }
  else if(t.id === 'hkAzSort'){ azF.sort = t.value; renderAz(); }
  else if(t.id === 'hkAzNight'){ azF.night = t.checked; azShown = 20; renderAz(); }
  else if(t.id === 'hkAzAll'){ azF.all24 = t.checked; azShown = 20; renderAz(); }
});
var azTimer = null;
viewAz.addEventListener('input', function(e){
  if(e.target.id === 'hkAzQ'){ azF.q = e.target.value; azShown = 20; clearTimeout(azTimer); azTimer = setTimeout(function(){ azKeep = true; renderAz(); azKeep = false; }, 250); }
});

/* ===== 夫婦の同期(部屋のコードで、2人の見学メモなどを自動でそろえる) ===== */
var SY_KEY = 'hoikatsu-sync-v1';
var sy = lsGet(SY_KEY, {code: '', last: 0, off: 0, snap: {}});
function sySave(){ lsSet(SY_KEY, sy); }
var syDefD = JSON.stringify({a: 'work', b: 'work', opts: {}, done: {}, way: 'mail'});
function syLocal(){
  var m = {};
  vis().filter(function(v){ return !v.ex; }).forEach(function(v){ m['v:' + v.id] = v; });
  Object.keys(qd.a || {}).forEach(function(id){ m['qa:' + id] = qd.a[id]; });
  (qd.custom || []).forEach(function(c){ m['qc:' + c.id] = c; });
  Object.keys(sched.done || {}).forEach(function(k){ m['sd:' + k] = sched.done[k]; });
  (sched.custom || []).forEach(function(c){ m['sc:' + c.id] = c; });
  if(JSON.stringify(wish) !== '[]' || sy.snap.w) m.w = wish;
  if(JSON.stringify(dd) !== syDefD || sy.snap.d) m.d = dd;
  return m;
}
function syCopy(t, done){ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function(){ done(true); }, function(){ done(false); }); else done(false); }
function syNow(){ return Date.now() + (sy.off || 0); }
function syOut(local){
  var out = {}, now = syNow();
  Object.keys(local).forEach(function(k){
    var h = JSON.stringify(local[k]), sn = sy.snap[k];
    out[k] = {t: (sn && !sn.x && sn.h === h) ? sn.t : now, d: local[k]};
  });
  Object.keys(sy.snap).forEach(function(k){
    if(out[k]) return;
    var sn = sy.snap[k];
    out[k] = sn.x ? {t: sn.t, x: 1} : {t: now, x: 1};
  });
  return out;
}
function syUpsert(arr, o){ for(var i = 0; i < arr.length; i++) if(arr[i].id === o.id){ arr[i] = o; return; } arr.push(o); }
function syApply(items, out){
  var changed = false, list = vis().filter(function(v){ return !v.ex; }), vch = false;
  Object.keys(items).forEach(function(k){
    var it = items[k], mine = out[k];
    if(mine && it.t <= mine.t) return;
    changed = true;
    var i = k.indexOf(':'), ty = i < 0 ? k : k.slice(0, i), id = i < 0 ? '' : k.slice(i + 1);
    if(ty === 'v'){ vch = true; list = list.filter(function(v){ return String(v.id) !== id; }); if(!it.x) list.push(it.d); }
    else if(ty === 'qa'){ if(it.x) delete qd.a[id]; else qd.a[id] = it.d; }
    else if(ty === 'qc'){ qd.custom = (qd.custom || []).filter(function(c){ return String(c.id) !== id; }); if(!it.x) qd.custom.push(it.d); }
    else if(ty === 'sd'){ if(it.x) delete sched.done[id]; else sched.done[id] = it.d; }
    else if(ty === 'sc'){ sched.custom = (sched.custom || []).filter(function(c){ return String(c.id) !== id; }); if(!it.x) sched.custom.push(it.d); }
    else if(ty === 'w'){ if(!it.x) wish = it.d; }
    else if(ty === 'd'){ if(!it.x) dd = it.d; }
  });
  if(changed){ if(vch) HK.setVisits(list); lsSet(Q_KEY, qd); lsSet(S_KEY, sched); lsSet(W_KEY, wish); lsSet(D_KEY, dd); }
  return changed;
}
var syBusy = false, syMsg = '';
function syRender(){
  var b = $('hkSy'); if(!b) return;
  if(!API_URL){ b.innerHTML = '<p class="hint" style="margin:0">夫婦の自動同期は、準備中です。いまは、下の「1回だけ送る」を使ってください。</p>'; return; }
  var h = '';
  if(!sy.code){
    h = '<p class="hint" style="margin:0 0 8px">2人のスマホで、見学メモ・質問・希望園・書類・予定のチェックが、自動でそろいます。片方の「部屋」を作って、もう片方がコードで参加します。<br><b>保存について</b>: 同期をつけると、これらの内容が運営者のサーバーに、暗号なしで置かれます(部屋のコードを知る人だけが読み書きできます)。写真は同期されません。最後に使ってから180日で消えます。</p>'
      + '<button type="button" class="primary" data-sy="new" style="width:100%; margin-bottom:8px">夫婦の同期を始める(部屋を作る)</button>'
      + '<label class="field" for="hkSyIn">相手から、部屋のコードを受け取ったとき</label><input id="hkSyIn" placeholder="12文字のコード" autocomplete="off" autocapitalize="characters" style="width:100%"><button type="button" data-sy="join" style="width:100%; margin-top:8px">この部屋に参加する</button>';
  } else {
    var c = sy.code.replace(/(.{4})/g, '$1 ').trim();
    h = '<p style="margin:0 0 6px"><b>✅ 同期中</b> <span class="hint">' + (sy.last ? '最後の同期: ' + new Date(sy.last).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : 'これから同期します') + '</span></p>'
      + '<div class="hint" style="margin:0 0 8px">部屋のコード(あいことば。他の人には教えないでください)<br><span style="font-size:18px; font-weight:700; letter-spacing:.08em; user-select:all">' + esc(c) + '</span></div>'
      + '<button type="button" class="primary" data-sy="send" style="width:100%; margin-bottom:8px">LINEなどで相手に送る(タップで参加)</button>'
      + '<button type="button" data-sy="now" style="width:100%; margin-bottom:8px">今すぐ同期する</button>'
      + '<button type="button" data-sy="stop" style="width:100%; margin-bottom:8px">このスマホの同期をやめる</button>'
      + '<button type="button" data-sy="del" style="width:100%">サーバーの記録を消す(2人とも同期が止まります)</button>';
  }
  h += '<p class="hint" role="status" id="hkSyM" style="margin:8px 0 0">' + esc(syMsg) + '</p>';
  b.innerHTML = h;
}
function syMsgSet(t){ syMsg = t; var m = $('hkSyM'); if(m) m.textContent = t; }
function syCall(path, body){
  return fetch(API_URL + path, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)})
    .then(function(r){ return r.json().then(function(j){ return {st: r.status, j: j}; }); });
}
function syRun(manual){
  if(!API_URL || !sy.code || syBusy) return Promise.resolve();
  syBusy = true;
  var out = syOut(syLocal());
  return syCall('/room/sync', {code: sy.code, items: out}).then(function(a){
    if(a.st === 404){ sy.code = ''; sy.snap = {}; sySave(); syMsg = 'この部屋は、もうありません。新しく作るか、コードで参加してください。'; syRender(); return; }
    if(a.st !== 200 || !a.j.items) throw new Error('x');
    if(a.j.now) sy.off = a.j.now - Date.now();
    var ch = syApply(a.j.items, out);
    var snap = {};
    Object.keys(a.j.items).forEach(function(k){ var it = a.j.items[k]; snap[k] = it.x ? {t: it.t, x: 1} : {t: it.t, h: JSON.stringify(it.d)}; });
    sy.snap = snap; sy.last = Date.now(); sySave();
    if(ch){
      syMsg = '相手の更新を取り込みました。';
      var ae = document.activeElement;
      if(!(ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))){ var sel = tabs.querySelector('[aria-selected="true"]'); if(sel) sel.click(); }
    } else if(manual) syMsg = '同期しました。';
    syRender();
  }).catch(function(e){ if(manual) syMsgSet('通信できませんでした。あとでもう一度、試してください。'); })
    .then(function(){ syBusy = false; });
}
function syJoin(code, manual){
  code = String(code || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
  if(!/^[A-HJ-NP-Z2-9]{12}$/.test(code)){ syMsgSet('コードは、12文字です。もう一度、確かめてください。'); return; }
  sy = {code: code, last: 0, off: 0, snap: {}}; sySave(); syMsg = '参加しました。見学メモなどを、まぜています…'; syRender();
  syRun(true).then(function(){ if(sy.code) { syMsg = '参加しました。2人のメモが、そろいました。'; syRender(); } });
}
(function(){
  var box = $('hkSh'); if(!box) return;
  var old = document.createElement('details'); old.className = 'faq';
  old.innerHTML = '<summary>同期を使わず、1回だけ送る</summary>';
  while(box.firstChild) old.appendChild(box.firstChild);
  var sd = document.createElement('div'); sd.id = 'hkSy';
  box.appendChild(sd); box.appendChild(old);
  var sm = $('hkD5').querySelector('summary'); if(sm) sm.textContent = '👪 夫婦で同期する';
  syRender();
  sd.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('[data-sy]') : null; if(!b) return;
    var k = b.getAttribute('data-sy');
    if(k === 'new'){
      syMsgSet('部屋を作っています…');
      syCall('/room/new', {}).then(function(a){ if(!a.j.code) throw new Error('x'); sy = {code: a.j.code, last: 0, off: 0, snap: {}}; sySave(); syMsg = '部屋ができました。下のボタンで、相手にコードを送ってください。'; syRender(); return syRun(false); })
        .catch(function(){ syMsgSet('部屋を作れませんでした。あとでもう一度、試してください。'); });
    }
    else if(k === 'join') syJoin($('hkSyIn').value, true);
    else if(k === 'now') syRun(true);
    else if(k === 'send'){
      var url = SHARE_BASE + '#room=' + sy.code, text = '保活アプリの「夫婦で同期」に招待します。このリンクをタップして、参加を押してください。(部屋のコード: ' + sy.code + ')';
      if(navigator.share) navigator.share({title: '保活アプリ 夫婦で同期', text: text, url: url}).catch(function(){});
      else syCopy(text + '\n' + url, function(ok){ syMsgSet(ok ? 'リンクをコピーしました。LINEなどに貼り付けて送ってください。' : 'コピーできませんでした。'); });
    }
    else if(k === 'stop'){ if(confirm('このスマホの同期をやめますか?(メモは消えません。相手の分も、そのままです)')){ sy = {code: '', last: 0, off: 0, snap: {}}; sySave(); syMsg = '同期をやめました。'; syRender(); } }
    else if(k === 'del'){
      if(confirm('サーバーの記録を消します。2人とも、同期が止まります。(それぞれのスマホの中のメモは、消えません)')){
        syCall('/room/delete', {code: sy.code}).then(function(){ sy = {code: '', last: 0, off: 0, snap: {}}; sySave(); syMsg = 'サーバーの記録を消しました。'; syRender(); }).catch(function(){ syMsgSet('消せませんでした。通信を確かめてください。'); });
      }
    }
  });
  /* 自動で同期する: 開いたとき、20秒ごと、変更の少しあと */
  var syT = null;
  function later(){ if(!sy.code) return; clearTimeout(syT); syT = setTimeout(function(){ syRun(false); }, 4000); }
  ['input', 'change', 'click'].forEach(function(ev){ document.addEventListener(ev, function(e){ if(e.target && e.target.closest && e.target.closest('#hkSy')) return; later(); }, true); });
  setInterval(function(){ if(!document.hidden) syRun(false); }, 20000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) syRun(false); });
  if(sy.code) syRun(false);
  /* 招待リンク */
  var m = location.hash.match(/^#room=([A-Za-z2-9]{12})$/);
  if(m && API_URL && !sy.code){
    var bn = document.createElement('div'); bn.className = 'hkb on'; bn.style.flexWrap = 'wrap';
    bn.innerHTML = '<span class="t">👪 夫婦の同期に招待されました。参加すると、2人の見学メモなどが自動でそろいます(内容は運営者のサーバーに置かれます。写真は同期されません)。</span><button type="button" class="primary" id="hkRoY">参加する</button><button type="button" id="hkRoN">やめる</button>';
    tabs.parentNode.insertBefore(bn, tabs);
    function clr(){ history.replaceState(null, '', location.pathname + location.search); }
    $('hkRoY').addEventListener('click', function(){ clr(); bn.remove(); syJoin(m[1], true); });
    $('hkRoN').addEventListener('click', function(){ clr(); bn.remove(); });
  }
})();

/* ===== タブを押したとき、その画面のタイトルが、画面の一番上にくるようにする ===== */
(function(){
  var skip = {tabFind: 1, tabCmp: 1, tabVisit: 1}; /* この3つは、もとから、それぞれの場所へ動く */
  function top(){
    var ids = ['viewIndex', 'viewAbout', 'viewVisit', 'viewSched', 'viewDocs', 'viewPaid', 'viewSet', 'viewAzuke'];
    for(var i = 0; i < ids.length; i++){
      var el = document.getElementById(ids[i]);
      if(el && !el.hidden){
        var t = el.querySelector('.panel, section, h2') || el;
        window.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + window.pageYOffset - 10));
        return;
      }
    }
  }
  Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(b){
    if(skip[b.id]) return;
    b.addEventListener('click', function(){ setTimeout(top, 30); });
  });
})();

/* ===== 説明文は「。」のあとで改行 ===== */
(function(){
  var SEL = '.hint, .notice, .ev .n, .dbx, #dSummary, #notices li, .azc .azl';
  var busy = false;
  function fix(root){
    if(busy || !root || root.nodeType !== 1) return;
    busy = true;
    try{
      var list = root.matches && root.matches(SEL) ? [root] : [];
      list = list.concat([].slice.call(root.querySelectorAll(SEL)));
      list.forEach(function(el){
        var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, arr = [];
        while((n = w.nextNode())) arr.push(n);
        arr.forEach(function(t){
          var p = t.parentNode; if(!p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|A|BUTTON)$/.test(p.nodeName)) return;
          var s = t.nodeValue; if(s.indexOf('。') < 0 || /^\s*。?\s*$/.test(s)) return;
          var parts = s.split(/(?<=。)(?=[^\s。」)）])/);
          if(parts.length < 2) return;
          var fr = document.createDocumentFragment();
          parts.forEach(function(x, i){ if(i) fr.appendChild(document.createElement('br')); fr.appendChild(document.createTextNode(x)); });
          p.replaceChild(fr, t);
        });
      });
    }catch(e){}
    busy = false;
  }
  fix(document.body);
  new MutationObserver(function(ms){
    ms.forEach(function(m){ [].slice.call(m.addedNodes).forEach(function(n){ if(n.nodeType === 1) fix(n); else if(n.parentNode && n.parentNode.nodeType === 1) fix(n.parentNode); }); });
  }).observe(document.body, {childList: true, subtree: true, characterData: false});
})();

/* ===== 端末の「戻る」で、1つ前に開いていたタブ・位置に戻る ===== */
(function(){
  var nav = document.querySelector('.tabs'); if(!nav || !window.history || !history.pushState || !window.MutationObserver) return;
  var cur = 'tabIndex', lastY = 0, popping = false;
  function selId(){ var b = nav.querySelector('button[role=tab][aria-selected=true]'); return b ? b.id : null; }
  window.addEventListener('scroll', function(){ if(!popping) lastY = window.pageYOffset; }, {passive: true});
  try{ history.replaceState({hk: 1, tab: 'tabIndex', y: 0}, '', location.href); }catch(_){ return; }
  new MutationObserver(function(){
    if(popping) return;
    var id = selId(); if(!id || id === cur) return;
    try{
      history.replaceState({hk: 1, tab: cur, y: lastY}, '', location.href);
      history.pushState({hk: 1, tab: id, y: 0}, '', location.href);
    }catch(_){ }
    cur = id; lastY = 0;
  }).observe(nav, {attributes: true, attributeFilter: ['aria-selected'], subtree: true});
  window.addEventListener('popstate', function(e){
    var st = e.state; if(!st || !st.hk) st = {tab: 'tabIndex', y: 0};
    var t = document.getElementById(st.tab); if(!t) return;
    popping = true;
    if(selId() !== st.tab) t.click();
    cur = st.tab;
    setTimeout(function(){ window.scrollTo(0, st.y || 0); lastY = st.y || 0; popping = false; }, 60);
  });
})();

/* ===== タブを「無料」と「有料(王冠)」に分ける ===== */
(function(){
  var nav = document.querySelector('.tabs'); if(!nav || nav.querySelector('.tgl')) return;
  function mk(cls, html){ var d = document.createElement('div'); d.className = 'tgl ' + cls; d.innerHTML = html; d.setAttribute('aria-hidden', 'true'); nav.appendChild(d); }
  mk('fr', '無料で使えます');
  mk('pd', CR + ' 有料プランの機能');
})();

/* ===== 有料タブに「見学メモ プラス」を追加／園を比べるに注記 ===== */
(function(){
  var nav = document.querySelector('.tabs'); if(!nav || document.getElementById('tabPlus')) return;
  var b = document.createElement('button'); b.type = 'button'; b.id = 'tabPlus'; b.className = 'hero';
  b.innerHTML = '<span class="ti">📷</span><span style="text-align:left"><span style="display:inline-flex; align-items:center; gap:3px; white-space:nowrap!important">' + CR + '<span>見学メモ プラス</span></span><small style="display:block; font-size:10px; font-weight:500; line-height:1.2; white-space:nowrap!important; letter-spacing:-0.03em; padding-left:13px">園を比較・PDF・同期</small></span>';
  nav.appendChild(b);
  b.addEventListener('click', function(){
    document.getElementById('tabVisit').click();
    setTimeout(function(){ var t = document.getElementById('hkPlus'); if(t) t.scrollIntoView(); }, 150);
  });
  var c = document.getElementById('tabCmp');
  if(c){ var sp = c.querySelectorAll('span')[1]; if(sp){ sp.insertAdjacentHTML('afterend', '<small style="display:inline-flex; align-items:center; gap:2px; font-size:10px; font-weight:500; line-height:1.2; white-space:nowrap">(' + CR + '2園から有料)</small>'); } }
})();

/* ===== 有料タブに「園を比べる(2園から)」「各園の点数比較」を追加 ===== */
(function(){
  var nav = document.querySelector('.tabs'); if(!nav || document.getElementById('tabCmp3')) return;
  function mk(id, ico, t1, t2, go){
    var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'hero';
    b.innerHTML = '<span class="ti">' + ico + '</span><span style="text-align:left"><span style="display:inline-flex; align-items:center; gap:3px; white-space:nowrap!important">' + CR + '<span>' + t1 + '</span></span><small style="display:block; font-size:10px; font-weight:500; line-height:1.2; white-space:nowrap!important; letter-spacing:-0.03em; padding-left:13px">' + t2 + '</small></span>';
    nav.appendChild(b); b.addEventListener('click', go);
  }
  mk('tabCmp3', '⚖️', '園を比べる', '(2園から有料)', function(){ document.getElementById('tabCmp').click(); window.scrollTo(0, 0); });
  mk('tabWish', '🏁', '園を並べる', '第10希望まで', function(){ document.getElementById('tabVisit').click(); setTimeout(function(){ var d = document.getElementById('hkD6'); if(d){ d.open = true; d.scrollIntoView(); } }, 150); });
  mk('tabDist', '📊', '各園の点数比較', '自分の点数での入りやすさ', function(){ document.getElementById('tabFind').click(); window.scrollTo(0, 0); });
  mk('tabAdv', '📈', '点数アップ', 'アドバイス', function(){ document.getElementById('tabIndex').click(); setTimeout(function(){ var t = document.getElementById('advPanel'); if(t) t.scrollIntoView(); }, 150); });
  mk('tabEase', '🎯', '合格しやすさ', '(園を並べる)', function(){ document.getElementById('tabVisit').click(); setTimeout(function(){ var d = document.getElementById('hkD6'); if(d){ d.open = true; d.scrollIntoView(); } }, 150); });
  mk('tabAlert', '🔔', '空きアラート', '園の空き状況が<br>変更されたらお知らせ', function(){ document.getElementById('tabVisit').click(); setTimeout(function(){ var d = document.getElementById('hkD7'); if(d){ d.open = true; d.scrollIntoView(); } }, 150); });
  var pd = document.getElementById('tabPaid'); if(pd) nav.appendChild(pd);
})();

/* ===== 園を比べるのタイトルの「(2園から有料)」に王冠 ===== */
(function(){
  var t = document.getElementById('cmpPaidTag'); if(!t) return;
  t.style.display = 'inline-flex'; t.style.alignItems = 'center'; t.style.gap = '2px'; t.style.verticalAlign = 'middle';
  t.innerHTML = '(' + CR + '<span>2園から有料</span>)';
  var sv = t.querySelector('svg'); if(sv){ sv.setAttribute('width', '13'); sv.setAttribute('height', '13'); sv.style.verticalAlign = 'middle'; }
})();

/* ===== 「昨年入園した子の点数」は有料(無料版では鍵つきカードにする) ===== */
(function(){
  var dp = document.getElementById('distPanel'); if(!dp) return;
  var h2 = dp.querySelector('h2'); if(h2 && !h2.querySelector('svg.cr')) h2.insertAdjacentHTML('afterbegin', CR + ' ');
  if(PREMIUM) return;
  Array.prototype.forEach.call(dp.children, function(c){ if(c !== h2) c.hidden = true; });
  var box = document.createElement('div'); box.innerHTML = buyHtml();
  dp.appendChild(box);
})();

/* ===== 結果の画面: 無料版のお試し表示、友達に教えるボタン、出典 ===== */
(function(){
  var s3 = document.getElementById('s3'), dp = document.getElementById('distPanel'); if(!s3 || !dp) return;
  /* 友達に教える */
  var sh = document.createElement('button'); sh.type = 'button'; sh.className = 'shbtn'; sh.textContent = '💌 ママ友・パパ友にも教える';
  sh.addEventListener('click', function(){
    var txt = '保活アプリ(世田谷区の保育園の申込みを手伝うアプリ)。点数が計算できて、昨年の倍率も見られます。';
    if(navigator.share) navigator.share({title: '保活アプリ', text: txt, url: APP_URL}).catch(function(){});
    else copy(txt + '\n' + APP_URL, function(ok){ sh.textContent = ok ? 'アドレスをコピーしました。LINEなどに貼ってください' : APP_URL; });
  });
  s3.insertBefore(sh, dp);
  /* 出典(結果の画面) */
  var src = document.createElement('p'); src.className = 'srcl rs'; src.textContent = '✔ 世田谷区の令和8年4月の公表資料をもとにしています';
  dp.appendChild(src);
  if(PREMIUM) return;
  /* 無料版: 自分の区分だけ見せて、残りはぼかす */
  var box = document.createElement('div'); box.className = 'teaser'; box.hidden = true;
  box.innerHTML = '<p class="tm"></p><div class="blur"></div><p class="lk">🔒 続きは有料版で見られます</p>';
  dp.insertBefore(box, dp.querySelector('h2').nextSibling);
  var ds = document.getElementById('dSummary'), db = document.getElementById('dBars');
  function upd(){
    var t = (ds.textContent || '').split('。')[0];
    if(!t){ box.hidden = true; return; }
    box.querySelector('.tm').textContent = 'あなたの' + t.replace(/^予想点数/, '予想点数') + '。昨年の入園者の中での位置と、希望園ごとの入りやすさは、有料版で見られます。';
    box.querySelector('.blur').innerHTML = '<ul class="dist">' + db.innerHTML + '</ul>';
    box.hidden = false;
  }
  new MutationObserver(upd).observe(db, {childList: true, subtree: true});
  new MutationObserver(upd).observe(ds, {childList: true, subtree: true, characterData: true});
  upd();
})();

/* ===== 「このアプリでできること」の見出しにアクセント ===== */
(function(){
  var h = document.querySelector('.feat .fh2'); if(!h || h.querySelector('.ac')) return;
  h.innerHTML = '<span class="ac">✨</span><span>このアプリでできること</span><span class="ac">✨</span>';
})();
/* ===== 「点数アップのアドバイス」は有料 ===== */
(function(){
  var ap = document.getElementById('advPanel'); if(!ap) return;
  var h2 = ap.querySelector('h2'); if(h2 && !h2.querySelector('svg.cr')) h2.insertAdjacentHTML('afterbegin', CR + ' ');
  if(PREMIUM) return;
  var body = document.getElementById('advBody'); if(body) body.hidden = true;
  var box = document.createElement('div'); box.innerHTML = '<p class="hint" style="margin:0 0 4px">あなたの入力から、まだ使っていない加点や、点数が届きにくいときの別の預け先を提案します。</p>' + buyHtml();
  ap.appendChild(box);
})();
/* ===== 空きが変わったらお知らせ(アプリを開いたとき・メールなし) ===== */
(function(){
  var NOW = window.SHISUU_NOW; var box = document.getElementById('hkWatch'); if(!box || !NOW) return;
  var K = 'hoikatsu-nowsnap-v1', snap = lsGet(K, null) || {};
  var nm = {}; NOW.rows.forEach(function(r){ nm[r[0] + '|' + r[1]] = r[2]; });
  function watched(){
    var out = [], seen = {};
    (HK.getVisits() || []).forEach(function(v){ if(v.ex || !v.fac || seen[v.fac] || !nm[v.fac]) return; seen[v.fac] = 1; out.push(v); });
    return out;
  }
  function compute(){
    var ch = [];
    watched().forEach(function(v){
      var cur = nm[v.fac], old = snap.d && snap.d[v.fac]; if(!old){ if(!snap.d) snap.d = {}; snap.d[v.fac] = cur; lsSet(K, snap); return; }
      var cls = HK.cls(), a = old[cls], b = cur[cls];
      if(a !== b && !(a == null && b == null)) ch.push({v: v, a: a, b: b, c: cls});
    });
    return ch;
  }
  function save(){ var d = {}; watched().forEach(function(v){ d[v.fac] = nm[v.fac]; }); snap = {on: NOW.checkedOn, d: d}; lsSet(K, snap); }
  function fmt(x){ return x == null ? '―' : x + '人'; }
  var changes = [];
  function render(){
    var ws = watched(), h = '';
    h += '<p class="hint" style="margin:0 0 8px"><b>空きが変わると、ここに出ます</b><br>① トップの上に「🔔空きが変わった園があります」と出ます。<br>② この画面に「◯◯園(1歳児): 0人 → 2人」と出ます。<br>メールや通知は送りません。アプリを開いたときに出ます。</p>';
    if(!ws.length) h += '<p class="hint">見学メモに園を入れると、ここで空きの変化を見られます。</p>';
    else if(!snap.d || !Object.keys(snap.d).length) h += '<p class="hint">いまの空きを記録しました。次に区の空き表が更新されたとき、変わった園をお知らせします。</p>';
    if(changes.length) h += '<ul class="advl">' + changes.map(function(c){ return '<li><b>' + esc(c.v.name) + '</b>(' + c.c + '歳児): ' + fmt(c.a) + ' → <b>' + fmt(c.b) + '</b>' + (c.a == null ? ' 空き表に載りました' : c.b == null ? ' 空き表から消えました' : c.b > c.a ? ' 空きが増えました' : ' 空きが減りました') + '</li>'; }).join('') + '</ul><button type="button" class="mini" id="hkWok" style="margin-top:6px">確認した</button>';
    else if(ws.length && snap.d && Object.keys(snap.d).length) h += '<p class="hint">前に見たときから、変わった園はありません(空き表の確認日 ' + esc(NOW.checkedOn) + ')。</p>';
    h += '<p style="margin:10px 0 4px"><b>カレンダーで思い出す</b></p><p class="hint" style="margin:0 0 6px">毎月1日と15日に「空きを確認」の予定を入れます。区の空き表は月ごとに更新されます。</p><button type="button" id="hkWcal" style="width:100%">📅 カレンダーに入れる(毎月1日・15日)</button>';
    box.innerHTML = h;
  }
  function ics(){
    var d = new Date(), y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), st = y + m + '01';
    var L = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//hoikatsu-app//JP'];
    [['1','1'],['15','15']].forEach(function(x, i){
      L.push('BEGIN:VEVENT','UID:vac' + i + '-' + Date.now() + '@hoikatsu-app','DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),
        'DTSTART;VALUE=DATE:' + y + m + ('0' + x[0]).slice(-2),'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + x[1] + ';COUNT=8','SUMMARY:【保活】保育園の空きを確認',
        'DESCRIPTION:保活アプリを開いて、希望園の空きが変わっていないか見ます。','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:保育園の空きを確認','TRIGGER:PT0S','END:VALARM','END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var a = document.createElement('a'), u = URL.createObjectURL(new Blob([L.join('\r\n')], {type: 'text/calendar'}));
    a.href = u; a.download = 'hoikatsu-vacancy.ics'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); }, 1500);
  }
  box.addEventListener('click', function(e){
    var t = e.target;
    if(t.id === 'hkWok'){ save(); changes = []; render(); hideTop(); }
    if(t.id === 'hkWcal') ics();
  });
  var top = null;
  function hideTop(){ if(top) top.hidden = true; }
  function init(){
    changes = compute();
    if(!snap.d) save();
    render();
    if(!PREMIUM){ var d7 = document.getElementById('hkD7'); if(d7) d7.querySelector('div').innerHTML = '<p class="hint" style="margin:0">この機能は、有料版です。</p>' + buyHtml(); return; }
    if(changes.length){
      top = document.createElement('button'); top.type = 'button'; top.className = 'wtop';
      top.textContent = '🔔 空きが変わった園があります(' + changes.length + '園) ›';
      top.onclick = function(){ var d = document.getElementById('hkD7'); document.getElementById('tabVisit').click(); setTimeout(function(){ if(d){ d.open = true; d.scrollIntoView(); } }, 150); };
      var tabsEl = document.querySelector('.tabs'); if(tabsEl) tabsEl.parentNode.insertBefore(top, tabsEl);
    }
  }
  setTimeout(init, 400);
})();
/* ===== 見学メモの入力欄に「声で入力」ボタン ===== */
(function(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, cur = null;
  ['v-good', 'v-bad', 'v-ask', 'v-memo', 'v-rmemo'].forEach(function(id){
    var ta = document.getElementById(id); if(!ta || ta.parentNode.querySelector('.vmic[data-for="' + id + '"]')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vmic'; b.setAttribute('data-for', id);
    b.innerHTML = '🎤 声で入力する';
    var msg = document.createElement('span'); msg.className = 'vmsg'; msg.setAttribute('role', 'status');
    var nt = document.createElement('span'); nt.className = 'vnote'; nt.textContent = '抱っこしたままでも、声でメモできます。';
    ta.insertAdjacentElement('afterend', msg); ta.insertAdjacentElement('afterend', nt); ta.insertAdjacentElement('afterend', b);
    function stop(){ if(cur){ try{ cur.rec.stop(); }catch(e){} } }
    b.addEventListener('click', function(){
      if(!SR){ msg.textContent = 'このブラウザは、声の入力に対応していません。スマホのキーボードにあるマイク(🎤)を使ってください。'; return; }
      if(cur && cur.btn === b){ stop(); return; }
      stop();
      var rec = new SR(), base = ta.value, fin = '';
      rec.lang = 'ja-JP'; rec.interimResults = true; rec.continuous = true;
      cur = {rec: rec, btn: b};
      b.classList.add('on'); b.innerHTML = '⏹ 止める(聞いています…)'; msg.textContent = '';
      rec.onresult = function(e){
        var tmp = '';
        for(var i = e.resultIndex; i < e.results.length; i++){ if(e.results[i].isFinal) fin += e.results[i][0].transcript; else tmp += e.results[i][0].transcript; }
        ta.value = base + (base && !/\n$/.test(base) ? '\n' : '') + fin + tmp;
        ta.dispatchEvent(new Event('input', {bubbles: true}));
      };
      rec.onerror = function(e){ msg.textContent = (e.error === 'not-allowed' || e.error === 'service-not-allowed') ? 'マイクが許可されていません。ブラウザの設定でマイクを許可してください。' : '聞き取れませんでした。もう一度、押してください。'; };
      rec.onend = function(){ b.classList.remove('on'); b.innerHTML = '🎤 声で入力する'; if(cur && cur.btn === b) cur = null; ta.dispatchEvent(new Event('change', {bubbles: true})); };
      try{ rec.start(); }catch(e){ msg.textContent = '始められませんでした。もう一度、押してください。'; b.classList.remove('on'); b.innerHTML = '🎤 声で入力する'; cur = null; }
    });
  });
})();
/* ===== 見学した園のカードの中に、写真を入れる(見学メモ プラスの写真と同じ場所に保存) ===== */
(function(){
  var list = document.getElementById('vList'); if(!list) return;
  var dbp = null;
  function db(){
    if(dbp) return dbp;
    dbp = new Promise(function(res, rej){
      try{ var r = indexedDB.open('hoikatsu-photos', 1); r.onupgradeneeded = function(){ r.result.createObjectStore('p', {keyPath: 'k'}); }; r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); }; }catch(e){ rej(e); }
    });
    return dbp;
  }
  function tx(mode, fn){ return db().then(function(d){ return new Promise(function(res, rej){ var t = d.transaction('p', mode), o = fn(t.objectStore('p')); t.oncomplete = function(){ res(o ? o.result : undefined); }; t.onerror = function(){ rej(t.error); }; }); }); }
  function getAll(){ return tx('readonly', function(s){ return s.getAll(); }).then(function(a){ return a || []; }, function(){ return []; }); }
  function shrink(file, cb){
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function(){ var k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', 0.72)); };
    img.onerror = function(){ URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }
  function esc2(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var busy = false;
  function paint(th, id, ps){
    var d = th.querySelector('.vph'); if(!d){ d = document.createElement('div'); d.className = 'vph'; th.appendChild(d); }
    if(!PREMIUM){ d.innerHTML = '<button type="button" class="mini vphb" data-id="' + id + '">📷 写真(有料)</button><span class="vphm"></span>'; return; }
    d.innerHTML = '<label class="mini vphb vphl">📷 写真を入れる' + (ps.length ? '(' + ps.length + '枚)' : '') + '<input type="file" accept="image/*" multiple class="vphf" data-id="' + id + '" hidden></label>'
      + ps.map(function(p){ return '<figure class="vphg" data-k="' + esc2(p.k) + '"><img src="' + p.d + '" alt="見学の写真"><button type="button" class="vphx" aria-label="写真を削除">✕</button></figure>'; }).join('') + '<span class="vphm"></span>';
  }
  function decorate(){
    if(busy) return; busy = true;
    var ths = [];
    Array.prototype.forEach.call(list.querySelectorAll('[data-act="edit"]'), function(b){ var th = b.closest('th'); if(th && !th.querySelector('.vph')) ths.push({th: th, id: b.getAttribute('data-id')}); });
    if(!ths.length){ busy = false; return; }
    getAll().then(function(all){
      ths.forEach(function(n){ if(n.th.querySelector('.vph')) return; paint(n.th, n.id, all.filter(function(p){ return p.v === n.id; }).sort(function(a, b){ return a.t - b.t; })); });
      busy = false;
    });
  }
  function refresh(th, id){
    getAll().then(function(all){
      paint(th, id, all.filter(function(p){ return p.v === id; }).sort(function(a, b){ return a.t - b.t; }));
      var s = document.getElementById('hkSel'); if(s && s.value === id) s.dispatchEvent(new Event('change', {bubbles: true}));
    });
  }
  list.addEventListener('change', function(e){
    var t = e.target; if(!t.classList || !t.classList.contains('vphf')) return;
    var id = t.getAttribute('data-id'), th = t.closest('th'), fs = Array.prototype.slice.call(t.files || []), left = fs.length;
    if(!left) return;
    var m = th.querySelector('.vphm'); if(m) m.textContent = ' 保存しています…';
    var done = function(){ if(--left === 0) refresh(th, id); };
    fs.forEach(function(f, i){ shrink(f, function(d){ if(!d){ done(); return; } tx('readwrite', function(s){ return s.put({k: id + ':' + Date.now() + ':' + i, v: id, t: Date.now() + i, d: d}); }).then(done, done); }); });
  });
  list.addEventListener('click', function(e){
    var x = e.target.closest('.vphx'), im = e.target.closest('.vphg img'), b = e.target.closest('.vphb');
    var th = e.target.closest('th'); if(!th) return;
    var ed = th.querySelector('[data-act="edit"]'); var id = ed && ed.getAttribute('data-id');
    if(x){ var k = x.closest('.vphg').getAttribute('data-k'); tx('readwrite', function(s){ return s.delete(k); }).then(function(){ refresh(th, id); }, function(){ refresh(th, id); }); return; }
    if(im){ im.closest('.vphg').classList.toggle('big'); return; }
    if(b && !PREMIUM){ th.querySelector('.vphm').textContent = ' 写真は、有料版で使えます。'; }
  });
  new MutationObserver(function(){ setTimeout(decorate, 50); }).observe(list, {childList: true});
  setTimeout(decorate, 500);
})();
/* ===== 「メモあり」をタップすると、保存した内容を全部見られる(気づき・○△？・質問の答え) ===== */
(function(){
  var list = document.getElementById('vList'); if(!list) return;
  function qa(id){
    var d = lsGet('hoikatsu-q-v1', {custom: [], a: {}}), a = (d.a && d.a[id]) || {}, out = [];
    QUESTIONS.concat((d.custom || []).map(function(c){ return c.t; })).forEach(function(t, i){
      var r = a['q' + i] || ((d.custom || [])[i - QUESTIONS.length] && a[(d.custom[i - QUESTIONS.length]).id]) || null;
      if(r && (r.d || r.n)) out.push('<li>✔ ' + esc(t) + (r.n ? ': <b>' + esc(r.n) + '</b>' : '') + '</li>');
      else out.push('<li class="qno">☐ ' + esc(t) + ' <i class="none">未</i></li>');
    });
    return out;
  }
  function fill(){
    var vs = HK.getVisits();
    Array.prototype.forEach.call(list.querySelectorAll('[data-act="edit"]'), function(b){
      var th = b.closest('th'), id = b.getAttribute('data-id'); if(!th || th.getAttribute('data-full') === '1') return;
      var v = vs.filter(function(x){ return x.id === id; })[0]; if(!v) return;
      var s = v.st || {}, marks = HK.items.map(function(it){ var k = HK.status[s[it.id]] ? s[it.id] : 'q'; return '<li' + (k === 'q' ? ' class="qno"' : '') + '>' + HK.status[k].s + ' ' + esc(it.l) + '</li>'; });
      var q = qa(id), has = v.good || v.bad || v.ask || v.memo || marks.some(function(m){ return m.indexOf('qno') < 0; }) || q.some(function(m){ return m.indexOf('qno') < 0; });
      var det = th.querySelector('.vmemo');
      if(!has){ th.setAttribute('data-full', '1'); return; }
      if(!det){
        det = document.createElement('details'); det.className = 'vmemo';
        function fld(t, x){ return '<p><b>' + t + '</b>' + (x ? esc(x) : '<i class="none">未記入</i>') + '</p>'; }
        det.innerHTML = '<summary>📝 メモあり<span>▼ 見る</span></summary>' + fld('👍 良かったところ', v.good) + fld('⚠ 気になったところ', v.bad) + fld('❓ 次に聞くこと', v.ask) + fld('📝 そのほかのメモ', v.memo);
        var vb = th.querySelector('.vb'); th.insertBefore(det, vb);
      }
      var extra = '';
      if(marks.length) extra += '<p><b>✅ 確認した項目(○よい △ふつう ✕いまいち)</b></p><ul class="vml">' + marks.join('') + '</ul>';
      extra += '<p><b>❓ 質問リスト</b></p>' + (q.length ? '<ul class="vml">' + q.join('') + '</ul>' : '<p><i class="none">未記入</i></p>');
      var g = HK.grade(v), sm = det.querySelector('summary');
      if(sm) sm.insertAdjacentHTML('afterend', '<p class="vtot"><b>総評</b>' + HK.gbadge(v) + '<span>○' + g.c.g + ' △' + g.c.w + ' ✕' + g.c.b + '</span></p>');
      det.insertAdjacentHTML('beforeend', extra);
      th.setAttribute('data-full', '1');
    });
  }
  new MutationObserver(function(){ setTimeout(fill, 60); }).observe(list, {childList: true});
  setTimeout(fill, 600);
})();
})();

#!/usr/bin/env python3
"""アプリのHTMLを書き換える「直す用」ファイル。GitHub Actionsの「アプリを直す」から動かす。
書き換え前の文字が見つからなければ、何も書かずに止まる(すでに直し済みの項目は飛ばす)。"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent
APP = next((p for p in sorted(ROOT.glob('*.html')) if '/*NOW-START*/' in p.read_text(encoding='utf-8')), None)
if APP is None: raise SystemExit('アプリのHTMLファイルが見つかりません')
t = APP.read_text(encoding='utf-8')
HERO = r'''<svg class="hero" viewBox="0 0 360 150" role="img" aria-label="保育園と子どもたちのイラスト">
<rect width="360" height="150" rx="18" fill="#dff1fb"/>
<circle cx="322" cy="28" r="15" fill="#ffd36b"/>
<g fill="#fff"><ellipse cx="58" cy="26" rx="22" ry="8.5"/><ellipse cx="76" cy="21" rx="13" ry="8"/><ellipse cx="246" cy="18" rx="18" ry="7"/><ellipse cx="258" cy="14" rx="10" ry="6"/></g>
<path d="M0 118q180-14 360 0v32H0z" fill="#bfe6d9"/>
<path d="M0 134q180-10 360 0v16H0z" fill="#a8dcc8"/>
<g><rect x="30" y="82" width="9" height="38" rx="3" fill="#c98f5b"/><circle cx="34" cy="70" r="21" fill="#7ccf9b"/><circle cx="21" cy="84" r="13" fill="#6fc48f"/><circle cx="48" cy="82" r="12" fill="#6fc48f"/><circle cx="34" cy="64" r="3" fill="#ff7b6b"/><circle cx="26" cy="76" r="2.6" fill="#ff7b6b"/><circle cx="43" cy="75" r="2.6" fill="#ffd36b"/></g>
<rect x="112" y="66" width="136" height="52" rx="7" fill="#fff3d6"/>
<path d="M100 70L180 26l80 44z" fill="#ff7b6b"/>
<path d="M104 70L180 29l76 41" stroke="#ff9a8c" stroke-width="3" fill="none" stroke-linecap="round"/>
<rect x="178.5" y="8" width="3" height="20" fill="#0f8a7a"/><path d="M181.5 8l16 5-16 5z" fill="#ffd36b"/>
<circle cx="180" cy="46" r="9" fill="#fff"/><path d="M180 52c-5-3.4-6.5-5-6.5-7.2a3.2 3.2 0 0 1 6.5-1 3.2 3.2 0 0 1 6.5 1c0 2.2-1.5 3.8-6.5 7.2z" fill="#ff7b6b"/>
<rect x="146" y="70" width="68" height="15" rx="7.5" fill="#fff" stroke="#0f8a7a" stroke-width="1.6"/>
<text x="180" y="81.2" text-anchor="middle" font-size="10" font-weight="700" fill="#0f8a7a" font-family="'Zen Maru Gothic','Hiragino Maru Gothic ProN','Yu Gothic',sans-serif">ほいくえん</text>
<rect x="167" y="90" width="26" height="28" rx="13" fill="#0f8a7a"/><rect x="171" y="94" width="18" height="12" rx="6" fill="#bfe6d9"/><circle cx="188" cy="108" r="1.6" fill="#ffd36b"/>
<g><rect x="123" y="88" width="28" height="22" rx="5" fill="#bfe6d9"/><path d="M137 88v22M123 99h28" stroke="#fff" stroke-width="2"/><rect x="209" y="88" width="28" height="22" rx="5" fill="#bfe6d9"/><path d="M223 88v22M209 99h28" stroke="#fff" stroke-width="2"/></g>
<rect x="120" y="108" width="34" height="5" rx="2.5" fill="#7ccf9b"/><rect x="206" y="108" width="34" height="5" rx="2.5" fill="#7ccf9b"/>
<g><rect x="286" y="84" width="20" height="4" rx="2" fill="#ff7b6b"/><path d="M289 88v30M303 88v30" stroke="#c98f5b" stroke-width="3" stroke-linecap="round"/><path d="M291 96h10M291 104h10M291 112h10" stroke="#c98f5b" stroke-width="2"/><path d="M305 86Q330 88 342 114" stroke="#ffd36b" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M292 84v-8h12v8" stroke="#ff7b6b" stroke-width="2" fill="none"/></g>
<g><path d="M96 74L88 96" stroke="#1f3340" stroke-width=".8" opacity=".6"/><ellipse cx="99" cy="64" rx="8.5" ry="10" fill="#ff7b6b"/><path d="M99 74l-2 3h4z" fill="#ff7b6b"/><ellipse cx="96" cy="60" rx="2" ry="3" fill="#fff" opacity=".6"/>
<path d="M80 119q-1-12 8-12t8 12z" fill="#ffd36b"/><circle cx="88" cy="99" r="8" fill="#ffd9b8"/><path d="M80 98q1-9 8-9t8 9q-5-4-8-4t-8 4z" fill="#8a5a3c"/><circle cx="85" cy="100" r="1.2" fill="#1f3340"/><circle cx="91" cy="100" r="1.2" fill="#1f3340"/><path d="M85.5 103q2.5 2 5 0" stroke="#1f3340" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="82.5" cy="102.5" r="1.6" fill="#ff9a8c" opacity=".7"/><circle cx="93.5" cy="102.5" r="1.6" fill="#ff9a8c" opacity=".7"/><path d="M95 110L93 96" stroke="#ffd9b8" stroke-width="3" stroke-linecap="round"/></g>
<g><rect x="257" y="108" width="7" height="12" rx="3" fill="#1f3340" opacity=".15"/><path d="M251 120q-1-13 9-13t9 13z" fill="#0f8a7a"/><circle cx="260" cy="98" r="8" fill="#ffd9b8"/><path d="M252 97q1-9 8-9t8 9q-4-3-8-3t-8 3z" fill="#1f3340"/><circle cx="257" cy="99" r="1.2" fill="#1f3340"/><circle cx="263" cy="99" r="1.2" fill="#1f3340"/><path d="M257.5 102q2.5 2 5 0" stroke="#1f3340" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="254.5" cy="101.5" r="1.6" fill="#ff9a8c" opacity=".7"/><circle cx="265.5" cy="101.5" r="1.6" fill="#ff9a8c" opacity=".7"/><path d="M252 110l-6-8M268 110l6-8" stroke="#ffd9b8" stroke-width="3" stroke-linecap="round"/></g>
<g><path d="M219 120q-1-8 6-8t6 8z" fill="#ff9a8c"/><circle cx="225" cy="107" r="6" fill="#ffd9b8"/><path d="M219 106q1-6 6-6t6 6q-3-2-6-2t-6 2z" fill="#8a5a3c"/><circle cx="223" cy="108" r="1" fill="#1f3340"/><circle cx="227" cy="108" r="1" fill="#1f3340"/><path d="M223.6 110.6q1.4 1.2 2.8 0" stroke="#1f3340" stroke-width=".8" fill="none" stroke-linecap="round"/></g>
<g><circle cx="12" cy="130" r="3" fill="#ff7b6b"/><circle cx="12" cy="130" r="1.2" fill="#ffd36b"/><path d="M12 133v8" stroke="#6fc48f" stroke-width="1.6"/><circle cx="152" cy="132" r="3" fill="#ffd36b"/><circle cx="152" cy="132" r="1.2" fill="#ff7b6b"/><path d="M152 135v8" stroke="#6fc48f" stroke-width="1.6"/><circle cx="350" cy="130" r="3" fill="#ff7b6b"/><circle cx="350" cy="130" r="1.2" fill="#ffd36b"/><path d="M350 133v8" stroke="#6fc48f" stroke-width="1.6"/><circle cx="300" cy="136" r="2.6" fill="#ffd36b"/><path d="M300 139v6" stroke="#6fc48f" stroke-width="1.6"/></g>
</svg>'''
CSS_OLD = r'''h2::before{content:""; width:10px; height:22px; border-radius:6px; background:var(--pop); flex:none}
'''
CSS_NEW = r'''h2::before{content:""; width:10px; height:22px; border-radius:6px; background:var(--pop); flex:none}
h2.hasicon::before{display:none}
.hi{width:40px; height:40px; flex:none; border-radius:14px; background:var(--accent-soft); display:grid; place-items:center}
.hi svg{width:30px; height:30px; display:block}
'''
JS_OLD = '''  buildItems();
  buildDist();
'''
JS_NEW = r'''  buildItems();
  buildDist();
  (function(){
    var ICONS = {
    '保護者': `<svg viewBox="0 0 32 32"><circle cx="12" cy="11" r="6" fill="#ffd9b8"/><path d="M2 29c0-7 4-11 10-11s10 4 10 11z" fill="#0f8a7a"/><circle cx="23.5" cy="17" r="4.5" fill="#ffd9b8"/><path d="M15.5 29c0-5 3-8 8-8s8 3 8 8z" fill="#ffd36b"/><circle cx="10" cy="11" r="1" fill="#1f3340"/><circle cx="14" cy="11" r="1" fill="#1f3340"/><circle cx="22" cy="17" r=".9" fill="#1f3340"/><circle cx="25" cy="17" r=".9" fill="#1f3340"/></svg>`,
    '世帯': `<svg viewBox="0 0 32 32"><path d="M3 15L16 4l13 11z" fill="#ff7b6b"/><rect x="6" y="15" width="20" height="13" rx="2" fill="#ffd36b"/><path d="M16 26c-4.5-3-6-4.8-6-6.8A3.2 3.2 0 0 1 16 18a3.2 3.2 0 0 1 6 1.2c0 2-1.5 3.8-6 6.8z" fill="#ff7b6b"/></svg>`,
    '予想指数': `<svg viewBox="0 0 32 32"><path d="M16 3l3.8 8 8.7 1.1-6.4 6 1.7 8.6L16 22.4 8.2 26.7l1.7-8.6-6.4-6 8.7-1.1z" fill="#ffd36b" stroke="#f0b429" stroke-width="1.2" stroke-linejoin="round"/><circle cx="13" cy="15" r="1.1" fill="#1f3340"/><circle cx="19" cy="15" r="1.1" fill="#1f3340"/><path d="M13.5 18.2q2.5 2 5 0" stroke="#1f3340" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`,
    '昨年入園': `<svg viewBox="0 0 32 32"><rect x="4" y="18" width="5" height="10" rx="2" fill="#bfe6d9"/><rect x="11" y="10" width="5" height="18" rx="2" fill="#0f8a7a"/><rect x="18" y="14" width="5" height="14" rx="2" fill="#bfe6d9"/><rect x="25" y="21" width="4" height="7" rx="2" fill="#bfe6d9"/><circle cx="13.5" cy="5.5" r="3.2" fill="#ff7b6b"/></svg>`,
    'このアプリ': `<svg viewBox="0 0 32 32"><path d="M16 3a8 8 0 0 0-4.5 14.6c.8.7 1.2 1.5 1.2 2.4h6.6c0-.9.4-1.7 1.2-2.4A8 8 0 0 0 16 3z" fill="#ffd36b"/><rect x="12.7" y="21.5" width="6.6" height="3" rx="1.5" fill="#bfe6d9"/><rect x="13.5" y="25.5" width="5" height="3" rx="1.5" fill="#0f8a7a"/><circle cx="13.4" cy="11" r="1" fill="#1f3340"/><circle cx="18.6" cy="11" r="1" fill="#1f3340"/><path d="M14 14q2 1.8 4 0" stroke="#1f3340" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>`,
    '見学メモ': `<svg viewBox="0 0 32 32"><rect x="5" y="4" width="18" height="24" rx="3" fill="#fff" stroke="#0f8a7a" stroke-width="2"/><path d="M9 11h10M9 16h10M9 21h6" stroke="#bfe6d9" stroke-width="2" stroke-linecap="round"/><g transform="rotate(30 25 19)"><rect x="22.5" y="8" width="5" height="16" rx="1.5" fill="#ffd36b"/><path d="M22.5 24h5l-2.5 5z" fill="#ffd9b8"/><rect x="22.5" y="8" width="5" height="3.5" rx="1.5" fill="#ff7b6b"/></g></svg>`,
    '見学の記録': `<svg viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="23" rx="3" fill="#fff" stroke="#0f8a7a" stroke-width="2"/><rect x="11" y="3" width="10" height="6" rx="2" fill="#0f8a7a"/><path d="M11 18l3.5 3.5L22 14" stroke="#ff7b6b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    '見学した園': `<svg viewBox="0 0 32 32"><path d="M3 16L16 7l13 9z" fill="#ff7b6b"/><rect x="6" y="16" width="20" height="12" rx="2" fill="#bfe6d9"/><rect x="13" y="20" width="6" height="8" rx="3" fill="#fff"/><rect x="15.3" y="1" width="1.4" height="7" fill="#0f8a7a"/><path d="M16.7 1.5l6 2-6 2z" fill="#ffd36b"/></svg>`,
    '園を比べる': `<svg viewBox="0 0 32 32"><rect x="15" y="6" width="2" height="19" fill="#0f8a7a"/><rect x="9" y="25" width="14" height="3" rx="1.5" fill="#0f8a7a"/><path d="M5 10h22" stroke="#0f8a7a" stroke-width="2" stroke-linecap="round"/><path d="M7.5 10l-4 8M7.5 10l4 8M24.5 10l-4 5M24.5 10l4 5" stroke="#0f8a7a" stroke-width="1"/><path d="M3 18a4.5 4.5 0 0 0 9 0z" fill="#ff7b6b"/><path d="M20 15a4.5 4.5 0 0 0 9 0z" fill="#ffd36b"/></svg>`,
    '園を探す': `<svg viewBox="0 0 32 32"><circle cx="13" cy="13" r="9" fill="#dff4ee" stroke="#0f8a7a" stroke-width="3"/><path d="M8 14l5-4.5 5 4.5z" fill="#ff7b6b"/><rect x="9.5" y="14" width="7" height="5" fill="#ffd36b"/><path d="M20 20l8 8" stroke="#0f8a7a" stroke-width="4" stroke-linecap="round"/></svg>`
    };
    var keys = Object.keys(ICONS);
    Array.prototype.forEach.call(document.querySelectorAll('h2'), function(h){
      var tx = h.textContent.replace(/^\s+/, '');
      for(var i = 0; i < keys.length; i++){
        if(tx.indexOf(keys[i]) === 0){
          var s = document.createElement('span'); s.className = 'hi'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[keys[i]];
          h.insertBefore(s, h.firstChild); h.classList.add('hasicon'); break;
        }
      }
    });
  })();
'''

new = t; done = 0
# 1. 上のイラストを、保育園のイラストにする
m = re.search(r'<svg class="hero" viewBox="0 0 360 1[0-9]{2}".*?</svg>', new, re.S)
if m is None: raise SystemExit('上のイラストが見つかりません')
if 'aria-label="保育園と子どもたちのイラスト"' in m.group(0): done += 1
else: new = new[:m.start()] + HERO + new[m.end():]
# 2. 各項目の見出しに、かわいいイラストをつける
for old, rep, name in [(CSS_OLD, CSS_NEW, '見出しの見た目'), (JS_OLD, JS_NEW, '見出しのイラスト')]:
    if rep in new: done += 1
    elif new.count(old) == 1: new = new.replace(old, rep)
    else: raise SystemExit('書き換え前の文字が見つかりません: ' + name)
if new != t: APP.write_text(new, encoding='utf-8')
print('%s を直しました(飛ばした項目 %d)' % (APP.name, done))

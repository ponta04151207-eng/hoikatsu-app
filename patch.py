#!/usr/bin/env python3
"""アプリのHTMLを書き換える「直す用」ファイル。GitHub Actionsの「アプリを直す」から1回だけ動かす。
書き換え前の文字が見つからなければ、何も書かずに止まる(すでに直し済みの場合は、その項目を飛ばす)。"""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent
APP = next((p for p in sorted(ROOT.glob('*.html')) if '/*NOW-START*/' in p.read_text(encoding='utf-8')), None)
if APP is None: raise SystemExit('アプリのHTMLファイルが見つかりません')
t = APP.read_text(encoding='utf-8')
EDITS = []  # (古い文字, 新しい文字, 個数)

EDITS.append(('指数シミュレーター・園ごと比較、見学メモ', '点数シミュレーター・園ごと比較、見学メモ', 2))

EDITS.append(('''.tabs{display:flex; gap:6px; margin:0 0 14px; background:var(--surface); border-radius:999px; padding:5px; box-shadow:var(--shadow)}
.tabs button{flex:1; min-height:48px; border:0; background:transparent; color:var(--muted); padding:0 4px; font-size:14px; white-space:nowrap}
.tabs button[aria-selected="true"]{background:var(--accent); color:var(--accent-fg); box-shadow:none}
''', '''.tabs{display:grid; grid-template-columns:repeat(12,1fr); gap:8px; margin:0 0 16px}
.tabs button{grid-column:span 3; min-height:64px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:6px 2px; border-radius:20px; border:2px solid var(--line); background:var(--surface); color:var(--fg); font-size:13px; line-height:1.25; box-shadow:var(--shadow)}
.tabs button.hero{grid-column:span 12; flex-direction:row; gap:10px; min-height:60px; font-size:17px}
.tabs button .ti{font-size:22px; line-height:1}
.tabs button.hero .ti{font-size:26px}
.tabs button[aria-selected="true"]{background:var(--accent); border-color:var(--accent); color:var(--accent-fg); box-shadow:0 4px 0 rgba(0,0,0,.12)}
''', 1))

EDITS.append(('''    <button type="button" role="tab" id="tabIndex" aria-selected="true">指数</button>
    <button type="button" role="tab" id="tabVisit" aria-selected="false">園・見学メモ</button>
    <button type="button" role="tab" id="tabAbout" aria-selected="false">できること</button>
''', '''    <button type="button" role="tab" class="hero" id="tabIndex" aria-selected="true"><span class="ti">🧮</span><span>点数シミュレーター</span></button>
    <button type="button" role="tab" id="tabFind" aria-selected="false"><span class="ti">🔍</span><span>園を探す</span></button>
    <button type="button" role="tab" id="tabCmp" aria-selected="false"><span class="ti">⚖️</span><span>園を比べる</span></button>
    <button type="button" role="tab" id="tabVisit" aria-selected="false"><span class="ti">📝</span><span>見学メモ</span></button>
    <button type="button" role="tab" id="tabAbout" aria-selected="false"><span class="ti">💡</span><span>できること</span></button>
''', 1))

EDITS.append(('''<div id="viewVisit" hidden>
    <section class="panel">
      <h2>見学メモ</h2>''', '''<div id="viewVisit" hidden>
    <section class="panel" id="secMemo">
      <h2>見学メモ</h2>''', 1))
EDITS.append(('''    <section class="panel">
      <h2>園を比べる</h2>''', '''    <section class="panel" id="secCmp">
      <h2>園を比べる</h2>''', 1))
EDITS.append(('<section class="panel" aria-labelledby="h-find">', '<section class="panel" id="secFind" aria-labelledby="h-find">', 1))

EDITS.append(('''  function tab(which){
    var v = which === 'visit';
    var ab = which === 'about';
    $('viewIndex').hidden = v || ab; $('viewVisit').hidden = !v; $('viewAbout').hidden = !ab;
    $('tabIndex').setAttribute('aria-selected', (!v && !ab) ? 'true' : 'false');
    $('tabVisit').setAttribute('aria-selected', v ? 'true' : 'false');
    $('tabAbout').setAttribute('aria-selected', ab ? 'true' : 'false');
    document.querySelector('.bar').hidden = ab;
    if(v){ renderVisit(); renderFind(); }
    window.scrollTo(0, 0);
  }
  $('tabIndex').addEventListener('click', function(){ tab('index'); });
  $('tabVisit').addEventListener('click', function(){ tab('visit'); });
''', '''  function tab(which, anchor){
    var v = which === 'visit';
    var ab = which === 'about';
    $('viewIndex').hidden = v || ab; $('viewVisit').hidden = !v; $('viewAbout').hidden = !ab;
    var sel = anchor === 'secCmp' ? 'tabCmp' : anchor === 'secFind' ? 'tabFind' : (v ? 'tabVisit' : ab ? 'tabAbout' : 'tabIndex');
    ['tabIndex', 'tabFind', 'tabCmp', 'tabVisit', 'tabAbout'].forEach(function(id){
      $(id).setAttribute('aria-selected', id === sel ? 'true' : 'false');
    });
    document.querySelector('.bar').hidden = ab;
    if(v){ renderVisit(); renderFind(); }
    var el = anchor ? $(anchor) : null;
    window.scrollTo(0, el ? Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 12) : 0);
  }
  $('tabIndex').addEventListener('click', function(){ tab('index'); });
  $('tabFind').addEventListener('click', function(){ tab('visit', 'secFind'); });
  $('tabCmp').addEventListener('click', function(){ tab('visit', 'secCmp'); });
  $('tabVisit').addEventListener('click', function(){ tab('visit', 'secMemo'); });
''', 1))

EDITS.append(('(「指数」タブの入力が反映されます)', '(「点数シミュレーター」タブの入力が反映されます)', 1))
EDITS.append(('style="width:100%; margin-top:16px">指数を計算する</button>', 'style="width:100%; margin-top:16px">点数を計算する</button>', 1))

new = t; done = []
for old, rep, n in EDITS:
    c = new.count(old)
    if c == 0 and rep in new: done.append(old[:20]); continue
    if c != n: raise SystemExit('書き換え前の文字が見つかりません(個数 %d、想定 %d): %s' % (c, n, old[:40]))
    new = new.replace(old, rep)
if new != t: APP.write_text(new, encoding='utf-8')
print('%s を直しました(飛ばした項目 %d)' % (APP.name, len(done)))

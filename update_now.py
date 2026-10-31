
#!/usr/bin/env python3
"""世田谷区「認可保育園(空き数)」5地域のページから現在の空き数を取得し、アプリのHTMLの NOW-START 〜 NOW-END の間を書き換える。

守り: 各地域で、全行の合計が表の「合計」行と一致しなければ、何も書かずに失敗する。
"""
import sys, re, json, unicodedata, datetime, urllib.request, pathlib
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent

def find_app():
    for p in sorted(ROOT.glob('*.html')):
        if '/*NOW-START*/' in p.read_text(encoding='utf-8'): return p
    raise SystemExit('アプリのHTMLファイルが見つかりません')
APP = find_app()
PAGES = {
    '世田谷': 'https://www.city.setagaya.lg.jp/01044/1583.html',
    '北沢':   'https://www.city.setagaya.lg.jp/01044/1584.html',
    '玉川':   'https://www.city.setagaya.lg.jp/01044/1585.html',
    '砧':     'https://www.city.setagaya.lg.jp/01044/5465.html',
    '烏山':   'https://www.city.setagaya.lg.jp/01044/1586.html',
}
EXPLICIT = {
    ('世田谷', 'インターナショナル三軒茶屋えほん保育園(私立)'): '三軒茶屋えほん',
    ('世田谷', 'モニカ三軒茶屋保育園(私立)'): 'モニカ三軒茶屋園',
    ('砧', '世田谷ベアーズ (私立認定こども園)'): '認定こども園世田谷ベアーズ',
    ('砧', 'らふ・くるー まむ いちご・ばなな・ぶどう (家庭的保育事業)'): 'らふ・くるー まむ',
}

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables = []; self.row = None; self.cell = None
    def handle_starttag(self, tag, a):
        if tag == 'table': self.tables.append([])
        elif tag == 'tr' and self.tables: self.row = []
        elif tag in ('td', 'th') and self.row is not None: self.cell = []
        elif tag == 'br' and self.cell is not None: self.cell.append(' ')
    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None and self.row is not None:
            self.row.append(re.sub(r'\s+', ' ', ''.join(self.cell)).strip()); self.cell = None
        elif tag == 'tr' and self.row is not None and self.tables:
            self.tables[-1].append(self.row); self.row = None
    def handle_data(self, d):
        if self.cell is not None: self.cell.append(d)

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (hoikatsu-app updater)'})
    return urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace')

def num(x):
    x = x.replace(',', '').strip()
    return None if x in ('-', '－', '―', '※', '') else int(x)

def parse(html, region):
    t = Tables(); t.feed(html)
    body = None
    for tb in t.tables:
        if any(len(r) >= 10 and '0歳' in r and '合計' in r for r in tb): body = tb; break
    if body is None: raise SystemExit('%s: 空き数の表が見つかりません(ページの形が変わった可能性)' % region)
    hi = next(i for i, r in enumerate(body) if '0歳' in r and '合計' in r)
    head = body[hi]; c0 = head.index('0歳'); ct = head.index('合計'); ce = head.index('延長') if '延長' in head else ct + 1
    rows, total = [], None
    for r in body[hi + 1:]:
        if not any(r): continue
        if len(r) >= len(head) and r[0] and r[0] != '合計':
            rows.append((r[0], [num(x) for x in r[c0:c0 + 6]], num(r[ct]) or 0, num(r[ce]) or 0))
        else:
            if len(r) == len(head): cells = r[c0:c0 + 8]
            else:
                cells = list(r)
                while cells and cells[-1] == '': cells.pop()
                cells = cells[-8:]
            tail = [num(x) for x in cells]
            if len(tail) == 8 and tail[6] is not None: total = tail
    if total is None: raise SystemExit('%s: 合計行が見つかりません' % region)
    s = [0] * 8
    for _, ages, tot, ext in rows:
        for i, v in enumerate(ages): s[i] += v or 0
        s[6] += tot; s[7] += ext
    t0 = [x or 0 for x in total]
    if s != t0: raise SystemExit('%s: 合計が合いません 行の合計=%s 表の合計=%s' % (region, s, t0))
    m_asof = re.search(r'この情報は(令和\d+年\d+月\d+日)入園可能予定数', html)
    m_upd = re.search(r'最終更新日[^0-9]*(\d{4})年(\d{1,2})月(\d{1,2})日', html)
    upd = '%s年%d月%d日' % (m_upd.group(1), int(m_upd.group(2)), int(m_upd.group(3))) if m_upd else ''
    return rows, (m_asof.group(1) if m_asof else None), upd

def parse_addr(html):
    """認可保育園の表から、園名・所在地・電話番号を取る。形が違うときは空を返す(空き数の更新は止めない)。"""
    t = Tables(); t.feed(html)
    for tb in t.tables:
        for i, r in enumerate(tb):
            if '所在地' in r and any('電話' in x for x in r):
                ai = r.index('所在地'); ti = next(j for j, x in enumerate(r) if '電話' in x)
                out = []
                for q in tb[i + 1:]:
                    if len(q) > max(ai, ti) and q[0] and q[0] != '合計' and q[ai]:
                        out.append((q[0], re.split(r'\s+', q[ai])[0], q[ti]))
                return out
    return []

def key(n):
    n = unicodedata.normalize('NFKC', n)
    n = re.sub(r'\(.*?\)|（.*?）', '', n)
    n = n.replace('★', '').replace(' ', '').replace('・', '').replace('保育園', '').replace('保育所', '').replace('小規模', '')
    n = re.sub(r'^(事業所|家庭的|こども園)', '', n).lower()
    return ''.join(chr(ord(c) + 96) if 'ぁ' <= c <= 'ゖ' else c for c in n)

def main():
    html_dir = pathlib.Path(sys.argv[sys.argv.index('--html-dir') + 1]) if '--html-dir' in sys.argv else None
    page = APP.read_text(encoding='utf-8')
    vb = re.search(r'/\*VAC-START\*/(.*?)/\*VAC-END\*/', page, re.S).group(1)
    names = {}
    for m in re.finditer(r'^\s*(\[".*\])[,]?$', vb, re.M):
        r = json.loads(m.group(1)); names.setdefault(r[0], {})[key(r[1])] = r[1]
    out, meta, warn, addr_rows = [], {}, [], []
    allnames = {}
    for m in re.finditer(r'^\s*(\[".*\])[,]?$', vb, re.M):
        r = json.loads(m.group(1)); allnames.setdefault(r[0], {}).setdefault(key(r[1]), []).append(r[1])
    for region, url in PAGES.items():
        html = (html_dir / (region + '.html')).read_text(encoding='utf-8') if html_dir else fetch(url)
        rows, asof, upd = parse(html, region)
        try:
            for nm0, ad, tel in parse_addr(html):
                if '送迎枠' in nm0 or '医療的ケア' in nm0: continue
                for nm1 in allnames.get(region, {}).get(key(EXPLICIT.get((region, nm0), nm0)), []):
                    if not any(x[0] == region and x[1] == nm1 for x in addr_rows): addr_rows.append([region, nm1, ad, tel])
        except Exception as ex:
            print('警告 所在地を取れませんでした:', region, ex)
        if not asof: raise SystemExit('%s: 対象日の記載が見つかりません' % region)
        meta[region] = {'asOf': asof, 'updated': upd, 'url': url}
        for name, ages, tot, ext in rows:
            if '送迎枠' in name or '医療的ケア' in name: continue
            nm = names.get(region, {}).get(key(EXPLICIT.get((region, name), name)))
            if not nm: warn.append('%s: 一覧と照合できない園 %s' % (region, name)); continue
            out.append([region, nm, ages])
        print('%s OK: %d行, %s入園分, 区の更新 %s' % (region, len(rows), asof, upd))
    for w in warn: print('警告', w)
    today = datetime.date.today()
    js = ("/* now.js */\nwindow.SHISUU_NOW = {\n  checkedOn: '%d年%d月%d日',\n  regions: %s,\n  rows: [\n" % (today.year, today.month, today.day, json.dumps(meta, ensure_ascii=False))
          + ",\n".join("    " + json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in out) + "\n  ]\n};")
    new = re.sub(r'/\*NOW-START\*/.*?/\*NOW-END\*/', lambda m: '/*NOW-START*/\n' + js + '\n/*NOW-END*/', page, count=1, flags=re.S)
    if addr_rows and '/*ADDR-START*/' in new:
        old = {}
        m0 = re.search(r'/\*ADDR-START\*/(.*?)/\*ADDR-END\*/', new, re.S)
        for r0 in re.findall(r'^\s*(\[".*\])[,]?$', m0.group(1), re.M): 
            r1 = json.loads(r0); old[(r1[0], r1[1])] = r1
        for r1 in addr_rows: old[(r1[0], r1[1])] = r1   # 取れた園は新しい値に、取れなかった園(新設の仮称など)は前の値を残す
        ajs = ("/* 世田谷区 認可保育園の所在地・電話番号。出典: 区の「認可保育園(空き数)」5地域のページ。update_now.py が毎月1日・15日に自動で作り直す。 */\nwindow.SHISUU_ADDR = {\n  checkedOn: '%d年%d月%d日',\n  rows: [\n" % (today.year, today.month, today.day)
               + ",\n".join("    " + json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in old.values()) + "\n  ]\n};")
        new = re.sub(r'/\*ADDR-START\*/.*?/\*ADDR-END\*/', lambda m: '/*ADDR-START*/\n' + ajs + '\n/*ADDR-END*/', new, count=1, flags=re.S)
        print('所在地を更新しました(%d園)' % len(old))
    APP.write_text(new, encoding='utf-8')
    print('%s の空き数を更新しました(%d園)' % (APP.name, len(out)))

if __name__ == '__main__': main()

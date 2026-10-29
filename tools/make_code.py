#!/usr/bin/env python3
"""購入コードを作ります。
使い方: python3 tools/make_code.py 有効期限 [個数]
  例: python3 tools/make_code.py 2026-11-30 1   (2026年11月30日まで使えるコードを1つ)
表示された「コード」を、購入した人に渡します。
表示された「features.jsに入れる行」を、features.js の CODE_HASHES の中に足します(コードそのものは入れない)。
毎月プランは、毎月、新しい期限のコードを作って渡します。"""
import sys, secrets, hashlib, re
if len(sys.argv) < 2 or not re.match(r'^\d{4}-\d{2}-\d{2}$', sys.argv[1]):
    sys.exit('使い方: python3 tools/make_code.py 2026-11-30 [個数]')
until = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
for _ in range(n):
    c = ''.join(secrets.choice(alpha) for _ in range(12))
    print('コード: %s-%s-%s   (%sまで)' % (c[:4], c[4:8], c[8:], until))
    print("features.jsに入れる行: ['%s', '%s']," % (hashlib.sha256(c.encode()).hexdigest(), until))

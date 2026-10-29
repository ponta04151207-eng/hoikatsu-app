#!/usr/bin/env python3
"""購入コードを作ります。  使い方: python3 tools/make_code.py [個数]
表示された「コード」を、Stripeの支払いリンクの「確認メッセージ」に書きます。
表示された「ハッシュ」を、features.js の CODE_HASHES に入れます(コードそのものは入れない)。"""
import sys, secrets, hashlib
alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
for _ in range(n):
    c = ''.join(secrets.choice(alpha) for _ in range(12))
    print('コード  : %s-%s-%s' % (c[:4], c[4:8], c[8:]))
    print('ハッシュ: %s' % hashlib.sha256(c.encode()).hexdigest())

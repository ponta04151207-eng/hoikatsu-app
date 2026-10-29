# 購入の確認サーバー(worker/)の置き方

スマホのブラウザだけで、できる手順です。Stripeのアカウントができてから、始めます。

## しくみ
Stripeで払う → Stripeがこのサーバーに知らせる → サーバーが「いつまで有効か」を記録 → アプリが、サーバーに聞いて、有料の機能を開く。
解約や、毎月の更新も、Stripeの知らせで、自動で反映されます。

## 手順
1. **Cloudflare**(cloudflare.com)で、無料のアカウントを作る。
2. 「Workers & Pages」→「作成」→「Worker」→ 名前を `hoikatsu-api` にして「デプロイ」。
3. 「コードを編集」を開き、`worker/index.js` の中身を、すべて貼り付けて、「デプロイ」。
4. 左の「KV」→「作成」→ 名前 `hoikatsu-subs`。Workerの「設定」→「バインディング」→「KV名前空間」→ 変数名 `SUBS` で、さっきのKVを選ぶ。
5. Workerの「設定」→「変数とシークレット」に、次を入れる。
   - `ALLOW_ORIGIN` = `https://ponta04151207-eng.github.io`(テキスト)
   - `APP_URL` = `https://ponta04151207-eng.github.io/hoikatsu-app/hoikatsu.html`(テキスト)
   - `STRIPE_SECRET_KEY` = Stripeの「制限付きのAPIキー」(**シークレット**。チャットには書かない)
   - `STRIPE_WEBHOOK_SECRET` = 次の手順で出る `whsec_…`(**シークレット**)
6. **Stripe**の「開発者」→「Webhook」→「エンドポイントを追加」。
   - URL: Workerのアドレス + `/webhook`(例: `https://hoikatsu-api.○○.workers.dev/webhook`)
   - イベント: `checkout.session.completed`、`customer.subscription.created`、`customer.subscription.updated`、`customer.subscription.deleted`
   - 出てきた「署名シークレット(whsec_…)」を、手順5の `STRIPE_WEBHOOK_SECRET` に入れる。
7. Stripeの「設定」→「請求」→「カスタマーポータル」を、有効にする(解約・支払い方法の変更に使います)。
8. Stripeの「支払いリンク」(毎月490円)を作る。「支払い後の動作」を「自分のサイトにリダイレクト」にして、URLは
   `https://ponta04151207-eng.github.io/hoikatsu-app/hoikatsu.html?paid={CHECKOUT_SESSION_ID}`
9. `features.js` の `API_URL` に、Workerのアドレス(`/webhook`なし)を、`PAYLINK_M` に、手順8のリンクを入れる。`TRIAL` を `false` にする。(ここはClaudeがやります)

## 確かめ方
Stripeを「テストモード」にして、テスト用のカード(4242 4242 4242 4242)で購入 → アプリに戻って、有料の機能が開き、「あなたの購入コード」が出れば、成功です。

## 使うAPI
- `POST /webhook` Stripeからの知らせ(署名を確認)
- `GET /claim?session=cs_…` 購入直後に、購入コードを1つ発行(同じsessionなら同じコード)
- `GET /status?token=…` 有効か、期限はいつか(更新の支払いが2日おくれても、すぐには閉じません)
- `GET /portal?token=…` 解約などの画面へのリンクを作る

/* 保活アプリ 購入の確認サーバー(Cloudflare Workers)
   - Stripeの「支払われました」の知らせ(webhook)を受けて、期限を記録する
   - アプリに「この購入コードは、いつまで有効か」を答える
   設定のしかたは worker/README.md を見てください。 */

const enc = new TextEncoder();
const GRACE_DAYS = 2; /* 更新の支払いが少し遅れても、すぐには閉じない */

function cors(env, extra) {
  return Object.assign({
    'access-control-allow-origin': env.ALLOW_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }, extra || {});
}
const json = (env, obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: cors(env) });

function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), x => ('0' + x.toString(16)).slice(-2)).join(''); }
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
/* Stripeの署名を確かめる(にせの知らせを受けないため) */
export async function verifyStripe(body, header, secret, nowSec) {
  if (!header || !secret) return false;
  const parts = {}; header.split(',').forEach(p => { const i = p.indexOf('='); if (i > 0) (parts[p.slice(0, i)] = parts[p.slice(0, i)] || []).push(p.slice(i + 1)); });
  const t = parts.t && parts.t[0]; if (!t || !parts.v1) return false;
  if (Math.abs((nowSec || Math.floor(Date.now() / 1000)) - Number(t)) > 300) return false;
  const want = await hmacHex(secret, t + '.' + body);
  return parts.v1.some(v => safeEq(v, want));
}
function newToken() {
  const a = new Uint8Array(20); crypto.getRandomValues(a); /* 256は32で割り切れるので、かたよりなし */
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let t = '';
  for (let i = 0; i < 20; i++) t += alpha[a[i] % 32];
  return t;
}
async function stripeGet(env, path) {
  const r = await fetch('https://api.stripe.com/v1/' + path, { headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } });
  return r.json();
}
async function stripePost(env, path, form) {
  const r = await fetch('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() });
  return r.json();
}
function periodEnd(sub) {
  if (sub.current_period_end) return sub.current_period_end;
  const it = sub.items && sub.items.data && sub.items.data[0];
  return it ? it.current_period_end : 0;
}
function dateOf(sec) { const d = new Date((sec + 9 * 3600) * 1000); return d.toISOString().slice(0, 10); } /* 日本の日付 */

async function onWebhook(req, env) {
  const body = await req.text();
  const ok = await verifyStripe(body, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json(env, { error: 'bad signature' }, 400);
  const ev = JSON.parse(body), o = ev.data && ev.data.object;
  if (!o) return json(env, { ok: true });
  if (ev.type === 'checkout.session.completed') {
    if (o.customer) await env.SUBS.put('cs:' + o.id, JSON.stringify({ customer: o.customer }), { expirationTtl: 60 * 60 * 24 * 30 });
  } else if (ev.type === 'customer.subscription.created' || ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.deleted') {
    const status = ev.type === 'customer.subscription.deleted' ? 'canceled' : o.status;
    await env.SUBS.put('sub:' + o.customer, JSON.stringify({ status, until: periodEnd(o), cancelAtPeriodEnd: !!o.cancel_at_period_end, updated: ev.created }));
  }
  return json(env, { ok: true });
}

async function onClaim(url, env) {
  const sid = url.searchParams.get('session') || '';
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sid)) return json(env, { error: 'bad session' }, 400);
  const done = await env.SUBS.get('claim:' + sid);
  if (done) return json(env, { token: done });
  let customer = null;
  const hit = await env.SUBS.get('cs:' + sid);
  if (hit) customer = JSON.parse(hit).customer;
  else if (env.STRIPE_SECRET_KEY) { const s = await stripeGet(env, 'checkout/sessions/' + sid); if (s && s.customer && (s.payment_status === 'paid' || s.status === 'complete')) customer = s.customer; }
  if (!customer) return json(env, { error: 'not found' }, 404);
  const token = newToken();
  await env.SUBS.put('tok:' + token, customer);
  await env.SUBS.put('claim:' + sid, token, { expirationTtl: 60 * 60 * 24 * 30 });
  return json(env, { token });
}

async function status(env, token) {
  if (!/^[A-Z2-9]{20}$/.test(token || '')) return null;
  const customer = await env.SUBS.get('tok:' + token); if (!customer) return null;
  const raw = await env.SUBS.get('sub:' + customer);
  const sub = raw ? JSON.parse(raw) : { status: 'none', until: 0 };
  const until = sub.until ? sub.until + GRACE_DAYS * 86400 : 0;
  const alive = ['active', 'trialing', 'past_due'].indexOf(sub.status) >= 0;
  const now = Math.floor(Date.now() / 1000);
  /* 解約ずみでも、払った期間の最後まで使える */
  const active = (alive || sub.status === 'canceled') && until > now;
  return { active, until: until ? dateOf(until) : null, status: sub.status, cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd, customer };
}
async function onStatus(url, env) {
  const s = await status(env, (url.searchParams.get('token') || '').toUpperCase().replace(/[\s-]/g, ''));
  if (!s) return json(env, { error: 'unknown' }, 404);
  return json(env, { active: s.active, until: s.until, status: s.status, cancelAtPeriodEnd: s.cancelAtPeriodEnd });
}
async function onPortal(url, env) {
  const s = await status(env, (url.searchParams.get('token') || '').toUpperCase().replace(/[\s-]/g, ''));
  if (!s) return json(env, { error: 'unknown' }, 404);
  const r = await stripePost(env, 'billing_portal/sessions', { customer: s.customer, return_url: env.APP_URL || 'https://ponta04151207-eng.github.io/hoikatsu-app/' });
  if (!r.url) return json(env, { error: 'portal' }, 502);
  return json(env, { url: r.url });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    try {
      if (url.pathname === '/webhook' && req.method === 'POST') return await onWebhook(req, env);
      if (url.pathname === '/claim') return await onClaim(url, env);
      if (url.pathname === '/status') return await onStatus(url, env);
      if (url.pathname === '/portal') return await onPortal(url, env);
      return json(env, { ok: true, name: 'hoikatsu-api' });
    } catch (e) { return json(env, { error: 'server' }, 500); }
  }
};

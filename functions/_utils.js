// ============================================
// 共享工具函数（供所有 API 路由引用）
// ============================================

export const SALT = 'szzx202409-salt';
export const DEFAULT_REPO = 'XSVICYYDS/szzx202409';
export const DEFAULT_BRANCH = 'main';

// JWT 签名（使用 Web Crypto API）
export async function signJWT(payload, secret) {
  const enc = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = header + '.' + payloadB64;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return data + '.' + sigB64;
}

// JWT 验证
export async function verifyJWT(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = h + '.' + p;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let sig;
  try {
    sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  } catch (e) { return null; }
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
  if (!valid) return null;
  let payload;
  try {
    payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) { return null; }
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

// 从请求中提取并验证 JWT
export async function authUser(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return await verifyJWT(auth.slice(7), env.JWT_SECRET);
}

// 密码哈希：SHA-256(salt + password)
export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(salt + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 响应工具
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
}

// 密钥读取（分段 Base64 拼接）
export async function getSecret(db, name) {
  const row = await db.prepare('SELECT part1,part2,part3 FROM secrets WHERE key_name=?').first(name);
  if (!row) return null;
  return (row.part1 ? atob(row.part1) : '') + (row.part2 ? atob(row.part2) : '') + (row.part3 ? atob(row.part3) : '');
}

function makeParts(value) {
  const len = value.length;
  const s1 = Math.ceil(len / 3), s2 = Math.ceil(len * 2 / 3);
  return [btoa(value.slice(0, s1)), btoa(value.slice(s1, s2)), btoa(value.slice(s2))];
}

export async function saveSecret(db, name, value) {
  const [p1, p2, p3] = makeParts(value);
  await db.prepare(
    'INSERT INTO secrets (key_name, part1, part2, part3, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ' +
    'ON CONFLICT(key_name) DO UPDATE SET part1=excluded.part1, part2=excluded.part2, part3=excluded.part3, updated_at=datetime(\'now\')'
  ).bind(name, p1, p2, p3).run();
}

// 解析请求体
export async function parseBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}
